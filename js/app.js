// Ainora Mane Thota — Main Application Logic (Firebase Firestore)

// ==================== DEFAULT PRODUCTS ====================

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Coconut', kannada: 'Thenginakayi', emoji: '🥥', photoUrl: null, unit: 'piece', price: 40, stock: 10, maxStock: 10, lowStockThreshold: 5, deliveryDays: '2-3 days', available: true, sortOrder: 1, badge: '' },
  { id: '2', name: 'Jackfruit', kannada: 'Halasina Hannu', emoji: '🍈', photoUrl: null, unit: 'piece', price: 300, stock: 5, maxStock: 5, lowStockThreshold: 2, deliveryDays: '2-3 days', available: true, sortOrder: 2, badge: '' },
  { id: '3', name: 'Lemon Grass', kannada: 'Nimbe Hullu', emoji: '🌿', photoUrl: null, unit: 'bundle', price: 60, stock: 20, maxStock: 20, lowStockThreshold: 5, deliveryDays: '1-2 days', available: true, sortOrder: 3, badge: '' },
  { id: '4', name: 'Curry Leaves (Karibevu)', kannada: 'Karibevu', emoji: '🍃', photoUrl: null, unit: 'bundle', price: 20, stock: 10, maxStock: 10, lowStockThreshold: 3, deliveryDays: '1-2 days', available: true, sortOrder: 4, badge: '' },
  { id: '5', name: 'Coconut Oil', kannada: 'Thengi Enne', emoji: '🫙', photoUrl: null, unit: '250ml bottle', price: 150, stock: 3, maxStock: 10, lowStockThreshold: 3, deliveryDays: '3-5 days', available: true, sortOrder: 5, badge: '' },
  { id: '6', name: 'Cherry Tomato', kannada: 'Tomato', emoji: '🍅', photoUrl: null, unit: '100g pack', price: 40, stock: 10, maxStock: 15, lowStockThreshold: 5, deliveryDays: '1-2 days', available: true, sortOrder: 6, badge: '' },
  { id: '7', name: 'Malabar Spinach', kannada: 'Basale Soppu', emoji: '🥬', photoUrl: null, unit: 'bundle', price: 25, stock: 10, maxStock: 10, lowStockThreshold: 3, deliveryDays: '1-2 days', available: true, sortOrder: 7, badge: '' }
];

const PRODUCT_COLORS = [
  'bg-emerald-100', 'bg-amber-100', 'bg-lime-100', 'bg-green-100',
  'bg-orange-100', 'bg-red-100', 'bg-teal-100', 'bg-yellow-100',
  'bg-cyan-100', 'bg-rose-100'
];

const BADGE_OPTIONS = ['', 'Limited stock', 'New this week', 'Best seller', 'Seasonal', 'Sold out soon'];

function getBadgeClass(badge) {
  switch (badge) {
    case 'Limited stock': return 'badge-limited';
    case 'New this week': return 'badge-new';
    case 'Best seller': return 'badge-best';
    case 'Seasonal': return 'badge-seasonal';
    case 'Sold out soon': return 'badge-soldout';
    default: return 'badge-default';
  }
}

// ==================== STATE ====================

let productsCache = [];
let ordersCache = [];
let unsubscribeProducts = null;
let unsubscribeOrders = null;
let knownOrderCount = 0;
let notificationPermissionGranted = false;

// ==================== DATA LAYER — FIRESTORE ====================

const productsRef = db ? db.collection('products') : null;
const ordersRef = db ? db.collection('orders') : null;

function initRealtimeListeners() {
  if (!db) {
    console.warn('Firebase not available');
    return;
  }

  // Real-time products listener
  unsubscribeProducts = productsRef.orderBy('name').onSnapshot(async (snapshot) => {
    if (snapshot.empty) {
      // Seed default products on first load
      console.log('Seeding default products...');
      const batch = db.batch();
      DEFAULT_PRODUCTS.forEach(p => {
        batch.set(productsRef.doc(p.id), { ...p, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      });
      await batch.commit();
      return;
    }

    productsCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCatalog();
    updateCartBar();
    if (document.getElementById('admin-dashboard') && !document.getElementById('admin-dashboard').classList.contains('hidden')) {
      renderStockCards();
    }
  }, (error) => {
    console.error('Products listener error:', error);
  });

  // Real-time orders listener
  unsubscribeOrders = ordersRef.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
    const previousCount = ordersCache.length;
    ordersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Detect new order and trigger notification
    if (ordersCache.length > previousCount && previousCount > 0) {
      const newOrder = ordersCache[0];
      showPushNotification(newOrder);
    }

    if (document.getElementById('admin-dashboard') && !document.getElementById('admin-dashboard').classList.contains('hidden')) {
      renderOrders();
      updateStats();
    }
  }, (error) => {
    console.error('Orders listener error:', error);
  });
}

function getProducts() {
  return productsCache;
}

function getOrders() {
  return ordersCache;
}

// Cart stays in localStorage (per-device)
const STORAGE_KEYS = {
  cart: 'mff_cart',
  adminAuth: 'mff_admin_auth'
};

function getCart() {
  const stored = localStorage.getItem(STORAGE_KEYS.cart);
  return stored ? JSON.parse(stored) : {};
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

// ==================== PRODUCT CATALOG (BUYER) ====================

function renderCatalog() {
  const products = productsCache.filter(p => p.available).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('empty-catalog');
  const cart = getCart();

  if (!grid) return;

  if (products.length === 0) {
    grid.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  grid.classList.remove('hidden');
  empty.classList.add('hidden');

  products.filter(p => p.stock === 0).forEach(p => track('sold_out_product_seen', { product: p.name }));

  grid.innerHTML = products.map((p, i) => {
    const colorClass = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
    const inCart = cart[p.id] || 0;
    const stockClass = p.stock === 0 ? 'out' : p.stock <= (p.lowStockThreshold || 5) ? 'low' : 'available';
    const stockText = p.stock === 0 ? 'Sold Out' : p.stock <= (p.lowStockThreshold || 5) ? `Only ${p.stock} left!` : `${p.stock} available`;
    const maxStock = p.maxStock || p.stock || 1;
    const stockPercent = maxStock > 0 ? Math.min(100, (p.stock / maxStock) * 100) : 0;
    const barColor = p.stock <= (p.lowStockThreshold || 5) ? 'bg-orange-400' : 'bg-leaf';
    const disabled = p.stock === 0 ? 'disabled' : '';

    const imageBlock = p.photoUrl
      ? `<img src="${p.photoUrl}" alt="${p.name}" loading="lazy" />`
      : `<div class="emoji-fallback">${p.emoji}</div>`;

    return `
      <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm relative ${inCart > 0 ? 'in-cart' : ''}">
        ${p.badge ? `<div class="product-badge ${getBadgeClass(p.badge)}">${p.badge}</div>` : ''}
        <div class="product-image ${p.photoUrl ? '' : colorClass}">
          ${imageBlock}
        </div>
        <div class="p-3 md:p-4">
          <div class="flex items-start justify-between mb-1">
            <div>
              <h3 class="font-semibold text-sm md:text-base leading-tight">${p.name}</h3>
              <p class="text-soil/70 text-xs">${p.kannada}</p>
            </div>
            <span class="stock-badge ${stockClass}">${stockText}</span>
          </div>
          <div class="stock-bar mb-2 mt-1">
            <div class="stock-bar-fill ${barColor}" style="width: ${stockPercent}%"></div>
          </div>
          <div class="flex items-end justify-between">
            <div>
              <div class="font-bold text-base md:text-lg">₹${p.price}<span class="text-soil/70 text-xs font-normal"> / ${p.unit}</span></div>
              <div class="text-soil/70 text-xs">Ready in ${p.deliveryDays}</div>
            </div>
            <div class="qty-selector">
              <button onclick="updateCart('${p.id}', -1)" ${disabled}>−</button>
              <span class="qty-value">${inCart}</span>
              <button onclick="updateCart('${p.id}', 1)" ${disabled}>+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== CART MANAGEMENT ====================

function updateCart(productId, delta) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const cart = getCart();
  const current = cart[productId] || 0;
  const newQty = current + delta;

  if (newQty < 0) return;
  if (newQty > product.stock) {
    showToast('Not enough stock available');
    return;
  }

  if (newQty === 0) {
    delete cart[productId];
    track('product_removed_from_cart', { product: product.name, price: product.price });
  } else {
    cart[productId] = newQty;
    if (delta > 0) track('product_added_to_cart', { product: product.name, price: product.price, quantity: newQty });
  }

  saveCart(cart);
  renderCatalog();
  updateCartBar();
}

function updateCartBar() {
  const cart = getCart();
  const pill = document.getElementById('cart-pill');

  let count = 0;
  let itemsTotal = 0;
  const names = [];
  const lineItems = [];

  Object.keys(cart).forEach(id => {
    const product = productsCache.find(p => p.id === id);
    if (product) {
      const qty = cart[id];
      const subtotal = qty * product.price;
      count += qty;
      itemsTotal += subtotal;
      names.push(product.name.split(' ')[0]);
      lineItems.push({ product, qty, subtotal });
    }
  });

  const grandTotal = itemsTotal + (count > 0 ? CONFIG.deliveryFee : 0);

  // Update pill
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = grandTotal;
  const label = names.length <= 2 ? names.join(', ') : names.slice(0, 2).join(', ') + '…';
  document.getElementById('cart-pill-items').textContent = label;

  // Update drawer
  document.getElementById('cart-items-total').textContent = itemsTotal;
  document.getElementById('cart-delivery-fee').textContent = CONFIG.deliveryFee;
  document.getElementById('cart-grand-total').textContent = grandTotal;

  const drawerItems = document.getElementById('cart-drawer-items');
  if (drawerItems) {
    drawerItems.innerHTML = lineItems.map(({ product, qty, subtotal }) => `
      <div class="flex items-center gap-3 py-3 border-b border-soil/6">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-soil/5 overflow-hidden">
          ${product.photoUrl
            ? `<img src="${product.photoUrl}" class="w-full h-full object-cover" />`
            : `<span>${product.emoji}</span>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm text-soil truncate">${product.name}</div>
          <div class="text-xs text-soil/50">₹${product.price} / ${product.unit}</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="qty-selector ${qty > 0 ? 'in-cart-qty' : ''}">
            <button onclick="updateCart('${product.id}', -1)">−</button>
            <span class="qty-value">${qty}</span>
            <button onclick="updateCart('${product.id}', 1)">+</button>
          </div>
          <div class="text-sm font-bold text-soil w-12 text-right">₹${subtotal}</div>
        </div>
      </div>
    `).join('');
  }

  if (count > 0) {
    pill.classList.remove('hidden');
  } else {
    pill.classList.add('hidden');
    closeCartDrawer();
  }
}

function openCartDrawer() {
  document.getElementById('cart-drawer').classList.add('cart-drawer-open');
  document.getElementById('cart-overlay').classList.remove('hidden');
}

function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('cart-drawer-open');
  document.getElementById('cart-overlay').classList.add('hidden');
}

// ==================== ORDER FORM ====================

function showOrderForm() {
  const cart = getCart();
  const summary = document.getElementById('order-summary');

  let total = 0;
  let items = [];

  Object.keys(cart).forEach(id => {
    const product = productsCache.find(p => p.id === id);
    if (product && cart[id] > 0) {
      const subtotal = cart[id] * product.price;
      total += subtotal;
      items.push({ ...product, qty: cart[id], subtotal });
    }
  });

  if (items.length === 0) {
    showToast('Your cart is empty');
    return;
  }

  const grandTotal = total + CONFIG.deliveryFee;

  summary.innerHTML = items.map(item => `
    <div class="flex justify-between items-center text-sm">
      <span>${item.emoji} ${item.name} × ${item.qty}</span>
      <span class="font-semibold">₹${item.subtotal}</span>
    </div>
  `).join('') + `
    <div class="flex justify-between items-center text-sm text-soil/60 pt-1">
      <span>Delivery Fee</span>
      <span class="text-leaf font-semibold">₹${CONFIG.deliveryFee}</span>
    </div>
  `;

  document.getElementById('order-total').textContent = grandTotal;
  document.getElementById('order-modal').classList.remove('hidden');
  document.getElementById('order-modal').classList.add('flex');
  track('order_form_opened', { cart_total: total, item_count: items.length });

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('cust-date').min = today;
}

function closeOrderForm() {
  document.getElementById('order-modal').classList.add('hidden');
  document.getElementById('order-modal').classList.remove('flex');
  const cart = getCart();
  const itemCount = Object.keys(cart).length;
  if (itemCount > 0) track('order_form_abandoned', { item_count: itemCount });
}

async function submitOrder(e) {
  e.preventDefault();

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const date = document.getElementById('cust-date').value;
  const time = document.getElementById('cust-time').value;
  const notes = document.getElementById('cust-notes').value.trim();

  const cart = getCart();
  let items = [];
  let total = 0;

  Object.keys(cart).forEach(id => {
    const product = productsCache.find(p => p.id === id);
    if (product && cart[id] > 0) {
      const subtotal = cart[id] * product.price;
      total += subtotal;
      items.push({
        productId: id,
        name: product.name,
        qty: cart[id],
        price: product.price,
        subtotal
      });
    }
  });

  if (items.length === 0) return;

  const grandTotal = total + CONFIG.deliveryFee;

  const order = {
    customerName: name,
    phone,
    address,
    deliveryDate: date,
    deliveryTime: time,
    notes,
    items,
    itemsTotal: total,
    deliveryFee: CONFIG.deliveryFee,
    total: grandTotal,
    status: 'new',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Save order to Firestore
    await ordersRef.add(order);
    sendOrderEmail(order);

    // Decrement stock atomically in Firestore
    const batch = db.batch();
    const soldOutItems = [];
    items.forEach(item => {
      const product = productsCache.find(p => p.id === item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.qty);
        batch.update(productsRef.doc(item.productId), {
          stock: newStock,
          maxStock: product.maxStock || product.stock
        });
        if (newStock === 0) soldOutItems.push(item.name);
      }
    });
    await batch.commit();
    soldOutItems.forEach(name => showSoldOutNotification(name));

    // Build WhatsApp message
    const itemList = items.map(i => `  • ${i.name} × ${i.qty} (₹${i.subtotal})`).join('\n');
    const waMessage = `🌿 *New Order — Ainora Mane Thota*\n\n*${name}* (${phone})\n\n*Items:*\n${itemList}\n\n*Items Total: ₹${total}*\n*Delivery Fee: ₹${CONFIG.deliveryFee}*\n*Total: ₹${grandTotal}*\n\n*Delivery:* ${date} | ${time}\n*Address:* ${address}${notes ? '\n*Notes:* ' + notes : ''}`;
    const waUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

    track('order_submitted', {
      total,
      item_count: items.length,
      delivery_date: date,
      delivery_time: time,
      products: items.map(i => i.name)
    });

    // Show success
    closeOrderForm();
    lastOrderTotal = total;
    document.getElementById('success-name').textContent = name;
    document.getElementById('whatsapp-btn').href = waUrl;
    document.getElementById('success-modal').classList.remove('hidden');
    document.getElementById('success-modal').classList.add('flex');

    // Clear cart
    saveCart({});
    updateCartBar();
    document.getElementById('order-form').reset();

  } catch (err) {
    console.error('Order submission error:', err);
    showToast('Failed to place order. Please try again.');
  }
}

function closeSuccess() {
  document.getElementById('success-modal').classList.add('hidden');
  document.getElementById('success-modal').classList.remove('flex');
}

// ==================== PAYMENT ====================

let lastOrderTotal = 0;

function showPaymentModal() {
  const upiId = CONFIG.upiId;
  const payeeName = CONFIG.upiPayeeName;
  const amount = lastOrderTotal;
  const txnRef = 'AFT-' + Date.now();

  // UPI payment string
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Ainora Mane Thota Order')}&tr=${txnRef}`;

  // Set amount display
  document.getElementById('payment-amount').textContent = amount;
  document.getElementById('upi-id-display').textContent = upiId;

  // UPI app deep links
  document.getElementById('phonepe-link').href = `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Order`;
  document.getElementById('gpay-link').href = `tez://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Order`;
  document.getElementById('paytm-link').href = `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Order`;

  // QR code via goqr.me API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
  document.getElementById('qr-code').src = qrUrl;

  // Show modal
  document.getElementById('payment-modal').classList.remove('hidden');
  document.getElementById('payment-modal').classList.add('flex');
}

function closePaymentModal() {
  document.getElementById('payment-modal').classList.add('hidden');
  document.getElementById('payment-modal').classList.remove('flex');
}

function copyUpiId() {
  const upiId = CONFIG.upiId;
  navigator.clipboard.writeText(upiId).then(() => {
    const label = document.getElementById('copy-label');
    label.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!';
    label.classList.add('text-leaf');
    setTimeout(() => {
      label.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Tap to copy';
      label.classList.remove('text-leaf');
    }, 2000);
  });
}

// ==================== ADMIN ====================

function showAdminLogin(e) {
  e.preventDefault();
  document.getElementById('buyer-view').classList.add('hidden');
  document.getElementById('admin-view').classList.remove('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('admin-dashboard').classList.add('hidden');
  window.scrollTo(0, 0);
}

function showBuyerView(e) {
  if (e) e.preventDefault();
  document.getElementById('admin-view').classList.add('hidden');
  document.getElementById('buyer-view').classList.remove('hidden');
  renderCatalog();
  updateCartBar();
  window.scrollTo(0, 0);
}

function adminLogin(e) {
  e.preventDefault();
  const pw = document.getElementById('admin-password').value;
  if (pw === CONFIG.adminPassword) {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    localStorage.setItem(STORAGE_KEYS.adminAuth, 'true');
    loadAdminDashboard();
    requestNotificationPermission();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

function adminLogout() {
  localStorage.removeItem(STORAGE_KEYS.adminAuth);
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('admin-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

function loadAdminDashboard() {
  updateStats();
  renderStockCards();
  renderOrders();
}

// Stats
function updateStats() {
  const orders = ordersCache;
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-total-revenue').textContent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-paid-revenue').textContent = orders.filter(o => (o.paymentStatus || 'unpaid') === 'paid').reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-unpaid-revenue').textContent = orders.filter(o => (o.paymentStatus || 'unpaid') === 'unpaid').reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-today-orders').textContent = orders.filter(o => {
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d.toISOString().startsWith(today);
  }).length;
  document.getElementById('stat-pending-orders').textContent = orders.filter(o => o.status === 'new').length;
}

// Admin Tabs
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelector(`.admin-tab[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  if (tab === 'stock') renderStockCards();
  if (tab === 'orders') renderOrders();
}

// ==================== STOCK MANAGEMENT ====================

function renderStockCards() {
  const grid = document.getElementById('admin-stock-grid');
  if (!grid) return;

  const sorted = [...productsCache].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  grid.innerHTML = sorted.map((p, idx) => {
    const imageSrc = p.photoUrl || '';
    const photoDisplay = imageSrc
      ? `<img src="${imageSrc}" alt="${p.name}" class="w-full h-full object-cover" />`
      : `<span class="text-3xl">${p.emoji}</span>`;

    const badgeOptionsHtml = BADGE_OPTIONS.map(b =>
      `<option value="${b}" ${p.badge === b ? 'selected' : ''}>${b || 'No badge'}</option>`
    ).join('');

    return `
      <div class="admin-stock-card" data-product-id="${p.id}">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-1">
            <button onclick="moveProduct('${p.id}', -1)" class="text-soil/40 hover:text-soil text-sm px-1" title="Move up" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>▲</button>
            <button onclick="moveProduct('${p.id}', 1)" class="text-soil/40 hover:text-soil text-sm px-1" title="Move down" ${idx === sorted.length - 1 ? 'disabled style="opacity:0.3"' : ''}>▼</button>
          </div>
          <div class="flex items-center gap-2">
            <select onchange="setBadge('${p.id}', this.value)" class="text-xs border border-soil/15 rounded px-2 py-1 bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50">
              ${badgeOptionsHtml}
            </select>
            <button onclick="openEditModal('${p.id}')" class="text-soil/30 hover:text-soil text-sm p-1" title="Edit">✏️</button>
          </div>
        </div>
        <div class="flex items-start gap-3 mb-3">
          <div class="w-14 h-14 rounded-lg bg-cream flex items-center justify-center overflow-hidden flex-shrink-0">
            ${photoDisplay}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm truncate">${p.name}</div>
            <div class="text-soil/40 text-xs">${p.kannada}</div>
            <div class="flex items-center gap-2 mt-1">
              <span class="stock-display">${p.stock}</span>
              <span class="text-soil/40 text-xs">${p.unit}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <div class="stepper">
            <button onclick="adjustStock('${p.id}', -10)">−10</button>
            <button onclick="adjustStock('${p.id}', -1)">−</button>
            <input type="number" value="${p.stock}" min="0" onchange="setStock('${p.id}', this.value)" class="stock-input" />
            <button onclick="adjustStock('${p.id}', 1)">+</button>
            <button onclick="adjustStock('${p.id}', 10)">+10</button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-soil/40 text-xs">₹</span>
            <input type="number" value="${p.price}" min="0" class="w-16 border border-soil/15 rounded px-2 py-1 text-sm bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50 price-input" data-id="${p.id}" />
            <span class="text-soil/40 text-xs">/ ${p.unit}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-soil/40 text-xs">${p.available ? 'Visible' : 'Hidden'}</span>
            <div class="toggle-switch ${p.available ? 'active' : ''}" onclick="toggleAvailable('${p.id}', this)"></div>
          </div>
        </div>
        <div class="mt-2 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-soil/40 text-xs">Low stock alert:</span>
            <input type="number" value="${p.lowStockThreshold || 5}" min="0" class="w-12 border border-soil/15 rounded px-2 py-1 text-xs bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50 threshold-input" data-id="${p.id}" />
          </div>
          <button onclick="saveSingleStock('${p.id}')" class="text-leaf hover:text-leaf-dark text-xs font-semibold">Save</button>
        </div>
      </div>
    `;
  }).join('');
}

async function moveProduct(productId, direction) {
  const sorted = [...productsCache].sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  const currentIdx = sorted.findIndex(p => p.id === productId);
  const swapIdx = currentIdx + direction;

  if (swapIdx < 0 || swapIdx >= sorted.length) return;

  // Normalize all sortOrders to clean 1-based consecutive integers first,
  // then swap — prevents collisions from undefined/duplicate sortOrder values
  sorted.forEach((p, i) => { p.sortOrder = i + 1; });
  sorted[currentIdx].sortOrder = swapIdx + 1;
  sorted[swapIdx].sortOrder = currentIdx + 1;

  try {
    const batch = db.batch();
    sorted.forEach(p => batch.update(productsRef.doc(p.id), { sortOrder: p.sortOrder }));
    await batch.commit();
    renderStockCards();
  } catch (err) {
    console.error('Move error:', err);
    showToast('Failed to reorder');
  }
}

async function setBadge(productId, badge) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;
  product.badge = badge;
  try {
    await productsRef.doc(productId).update({ badge });
    showToast(badge ? `"${badge}" badge set` : 'Badge removed');
  } catch (err) {
    console.error('Badge error:', err);
    showToast('Failed to update badge');
  }
}

async function adjustStock(productId, delta) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const newStock = Math.max(0, product.stock + delta);
  const newMaxStock = Math.max(product.maxStock || 0, newStock);

  // Optimistic update
  product.stock = newStock;
  product.maxStock = newMaxStock;

  try {
    await productsRef.doc(productId).update({
      stock: newStock,
      maxStock: newMaxStock
    });
  } catch (err) {
    console.error('Stock update error:', err);
    showToast('Failed to update stock');
  }

  const card = document.querySelector(`.admin-stock-card[data-product-id="${productId}"]`);
  if (card) {
    const input = card.querySelector('.stock-input');
    if (input) input.value = newStock;
  }
}

async function setStock(productId, value) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const newStock = Math.max(0, parseInt(value) || 0);
  const newMaxStock = Math.max(product.maxStock || 0, newStock);

  product.stock = newStock;
  product.maxStock = newMaxStock;

  try {
    await productsRef.doc(productId).update({
      stock: newStock,
      maxStock: newMaxStock
    });
  } catch (err) {
    console.error('Stock update error:', err);
    showToast('Failed to update stock');
  }
}

async function toggleAvailable(productId, el) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const newVal = !product.available;
  product.available = newVal;

  try {
    await productsRef.doc(productId).update({ available: newVal });
    el.classList.toggle('active', newVal);
    const label = el.previousElementSibling;
    if (label) label.textContent = newVal ? 'Visible' : 'Hidden';
  } catch (err) {
    console.error('Toggle error:', err);
    showToast('Failed to update');
  }
}

async function saveAllStock() {
  try {
    const batch = db.batch();

    document.querySelectorAll('.price-input').forEach(input => {
      const product = productsCache.find(p => p.id === input.dataset.id);
      if (product) {
        const newPrice = Math.max(0, parseInt(input.value) || 0);
        product.price = newPrice;
        batch.update(productsRef.doc(input.dataset.id), { price: newPrice });
      }
    });

    document.querySelectorAll('.threshold-input').forEach(input => {
      const product = productsCache.find(p => p.id === input.dataset.id);
      if (product) {
        const newThreshold = Math.max(0, parseInt(input.value) || 5);
        product.lowStockThreshold = newThreshold;
        batch.update(productsRef.doc(input.dataset.id), { lowStockThreshold: newThreshold });
      }
    });

    await batch.commit();
    showToast('Stock updated! Buyers can see the changes now');
  } catch (err) {
    console.error('Save all error:', err);
    showToast('Failed to save changes');
  }
}

async function saveSingleStock(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  const card = document.querySelector(`.admin-stock-card[data-product-id="${productId}"]`);
  if (card) {
    const priceInput = card.querySelector('.price-input');
    const thresholdInput = card.querySelector('.threshold-input');
    if (priceInput) product.price = Math.max(0, parseInt(priceInput.value) || 0);
    if (thresholdInput) product.lowStockThreshold = Math.max(0, parseInt(thresholdInput.value) || 5);
  }

  try {
    await productsRef.doc(productId).update({
      price: product.price,
      lowStockThreshold: product.lowStockThreshold
    });
    showToast(`${product.name} updated`);
  } catch (err) {
    console.error('Save error:', err);
    showToast('Failed to save');
  }
}

// ==================== ADD PRODUCT ====================

function toggleAddProduct() {
  const form = document.getElementById('add-product-form');
  const arrow = document.getElementById('add-product-arrow');
  form.classList.toggle('hidden');
  arrow.style.transform = form.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

document.addEventListener('DOMContentLoaded', () => {
  const photoInput = document.getElementById('new-photo');
  if (photoInput) {
    photoInput.addEventListener('change', function () {
      const file = this.files[0];
      const preview = document.getElementById('new-photo-preview');
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.src = e.target.result;
          preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      } else {
        preview.classList.add('hidden');
      }
    });
  }
});

async function addProduct() {
  const name = document.getElementById('new-name').value.trim();
  const kannada = document.getElementById('new-kannada').value.trim();
  const emoji = document.getElementById('new-emoji').value.trim() || '🌾';
  const unit = document.getElementById('new-unit').value;
  const price = parseInt(document.getElementById('new-price').value) || 0;
  const stock = parseInt(document.getElementById('new-stock').value) || 0;
  const delivery = document.getElementById('new-delivery').value;
  const photoFile = document.getElementById('new-photo').files[0];

  if (!name || !price || stock < 0) {
    showToast('Please fill required fields');
    return;
  }

  let photoUrl = null;
  if (photoFile) {
    try {
      photoUrl = await compressAndStoreImage(photoFile);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  try {
    await productsRef.add({
      name,
      kannada: kannada || name,
      emoji,
      photoUrl,
      unit,
      price,
      stock,
      maxStock: stock,
      lowStockThreshold: 5,
      deliveryDays: delivery,
      available: true,
      sortOrder: Math.max(0, ...productsCache.map(p => p.sortOrder || 0)) + 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Reset form
    document.getElementById('new-name').value = '';
    document.getElementById('new-kannada').value = '';
    document.getElementById('new-emoji').value = '';
    document.getElementById('new-price').value = '';
    document.getElementById('new-stock').value = '';
    document.getElementById('new-photo').value = '';
    document.getElementById('new-photo-preview').classList.add('hidden');

    showToast(`${name} added to catalog`);
  } catch (err) {
    console.error('Add product error:', err);
    showToast('Failed to add product');
  }
}

function compressAndStoreImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(async (blob) => {
          try {
            const filename = `products/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            const ref = storage.ref().child(filename);
            await ref.put(blob);
            const url = await ref.getDownloadURL();
            resolve(url);
          } catch (err) {
            console.error('Firebase Storage upload failed:', err);
            // Fallback to base64 if Storage upload fails
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          }
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==================== EDIT PRODUCT ====================

function openEditModal(productId) {
  const product = productsCache.find(p => p.id === productId);
  if (!product) return;

  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.name;
  document.getElementById('edit-kannada').value = product.kannada;
  document.getElementById('edit-emoji').value = product.emoji;
  document.getElementById('edit-unit').value = product.unit;
  document.getElementById('edit-price').value = product.price;
  document.getElementById('edit-delivery').value = product.deliveryDays;

  const preview = document.getElementById('edit-photo-preview');
  if (product.photoUrl) {
    preview.src = product.photoUrl;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }

  document.getElementById('edit-photo').value = '';
  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-modal').classList.add('flex');
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  document.getElementById('edit-modal').classList.remove('flex');
}

async function saveEditProduct() {
  const id = document.getElementById('edit-id').value;
  const product = productsCache.find(p => p.id === id);
  if (!product) return;

  const updates = {
    name: document.getElementById('edit-name').value.trim() || product.name,
    kannada: document.getElementById('edit-kannada').value.trim() || product.kannada,
    emoji: document.getElementById('edit-emoji').value.trim() || product.emoji,
    unit: document.getElementById('edit-unit').value,
    price: parseInt(document.getElementById('edit-price').value) || product.price,
    deliveryDays: document.getElementById('edit-delivery').value
  };

  const photoFile = document.getElementById('edit-photo').files[0];
  if (photoFile) {
    try {
      updates.photoUrl = await compressAndStoreImage(photoFile);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  try {
    await productsRef.doc(id).update(updates);
    closeEditModal();
    showToast(`${updates.name} updated`);
  } catch (err) {
    console.error('Update product error:', err);
    showToast('Failed to update product');
  }
}

async function deleteProduct() {
  const id = document.getElementById('edit-id').value;
  const product = productsCache.find(p => p.id === id);
  if (!product) return;

  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  try {
    await productsRef.doc(id).delete();
    closeEditModal();
    showToast(`${product.name} deleted`);
  } catch (err) {
    console.error('Delete product error:', err);
    showToast('Failed to delete product');
  }
}

// ==================== CREATE MANUAL ORDER ====================

function showCreateOrderModal() {
  const form = document.getElementById('create-order-form');
  if (form) form.reset();

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('manual-date').value = today;

  renderManualProductsList();
  document.getElementById('manual-order-total').textContent = '0';
  document.getElementById('create-order-modal').classList.remove('hidden');
  document.getElementById('create-order-modal').classList.add('flex');
}

function closeCreateOrderModal() {
  document.getElementById('create-order-modal').classList.add('hidden');
  document.getElementById('create-order-modal').classList.remove('flex');
}

function renderManualProductsList() {
  const container = document.getElementById('manual-products-list');
  if (!container) return;

  const products = productsCache.filter(p => p.available && p.stock > 0).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  container.innerHTML = products.map(p => `
    <div class="flex items-center justify-between gap-3 py-1.5 border-b border-soil/5 last:border-0">
      <label class="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
        <input type="checkbox" class="manual-product-check w-4 h-4 accent-leaf rounded" data-id="${p.id}" onchange="updateManualOrderTotal()" />
        <span class="text-sm truncate">${p.emoji} ${p.name}</span>
      </label>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xs text-soil/50">₹${p.price}/${p.unit}</span>
        <input type="number" value="1" min="1" max="${p.stock}" class="manual-qty w-14 border border-soil/20 rounded px-2 py-1 text-xs text-center bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50" data-id="${p.id}" onchange="updateManualOrderTotal()" oninput="updateManualOrderTotal()" />
        <span class="text-xs text-soil/40">(${p.stock} avail)</span>
      </div>
    </div>
  `).join('');

  if (products.length === 0) {
    container.innerHTML = '<p class="text-soil/40 text-sm text-center py-4">No products with stock available</p>';
  }
}

function updateManualOrderTotal() {
  let itemsTotal = 0;
  document.querySelectorAll('.manual-product-check:checked').forEach(cb => {
    const id = cb.dataset.id;
    const product = productsCache.find(p => p.id === id);
    const qtyInput = document.querySelector(`.manual-qty[data-id="${id}"]`);
    if (product && qtyInput) {
      const qty = Math.max(1, parseInt(qtyInput.value) || 1);
      itemsTotal += qty * product.price;
    }
  });
  const includeDelivery = document.getElementById('manual-delivery-fee')?.checked;
  const total = itemsTotal + (includeDelivery ? CONFIG.deliveryFee : 0);
  document.getElementById('manual-order-total').textContent = total;
}

async function submitCreateOrder(e) {
  e.preventDefault();

  const name = document.getElementById('manual-name').value.trim();
  const phone = document.getElementById('manual-phone').value.trim();
  const address = document.getElementById('manual-address').value.trim();
  const date = document.getElementById('manual-date').value;
  const time = document.getElementById('manual-time').value;
  const source = document.getElementById('manual-source').value;
  const notes = document.getElementById('manual-notes').value.trim();

  // Collect selected products
  const items = [];
  let total = 0;
  document.querySelectorAll('.manual-product-check:checked').forEach(cb => {
    const id = cb.dataset.id;
    const product = productsCache.find(p => p.id === id);
    const qtyInput = document.querySelector(`.manual-qty[data-id="${id}"]`);
    if (product && qtyInput) {
      const qty = Math.max(1, parseInt(qtyInput.value) || 1);
      const subtotal = qty * product.price;
      total += subtotal;
      items.push({
        productId: id,
        name: product.name,
        qty,
        price: product.price,
        subtotal
      });
    }
  });

  if (items.length === 0) {
    showToast('Please select at least one product');
    return;
  }

  const includeDelivery = document.getElementById('manual-delivery-fee')?.checked;
  const deliveryFee = includeDelivery ? CONFIG.deliveryFee : 0;
  const grandTotal = total + deliveryFee;

  const order = {
    customerName: name,
    phone,
    address: address || '',
    deliveryDate: date,
    deliveryTime: time || '',
    notes: notes || '',
    source,
    items,
    itemsTotal: total,
    deliveryFee,
    total: grandTotal,
    status: 'confirmed',
    paymentStatus: 'unpaid',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await ordersRef.add(order);

    // Decrement stock
    const batch = db.batch();
    const soldOutItems = [];
    items.forEach(item => {
      const product = productsCache.find(p => p.id === item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.qty);
        batch.update(productsRef.doc(item.productId), {
          stock: newStock,
          maxStock: product.maxStock || product.stock
        });
        if (newStock === 0) soldOutItems.push(item.name);
      }
    });
    await batch.commit();
    soldOutItems.forEach(name => showSoldOutNotification(name));

    closeCreateOrderModal();
    showToast(`Order created for ${name}`);
  } catch (err) {
    console.error('Create order error:', err);
    showToast('Failed to create order');
  }
}

// ==================== PAYMENT STATUS ====================

async function togglePaymentStatus(orderId, currentStatus) {
  const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
  try {
    await ordersRef.doc(orderId).update({ paymentStatus: newStatus });
    showToast(`Payment marked as ${newStatus}`);
  } catch (err) {
    console.error('Payment toggle error:', err);
    showToast('Failed to update payment status');
  }
}

function getWhatsAppLink(order) {
  const phone = order.phone;
  const name = order.customerName;
  let message = '';

  if (order.status === 'confirmed') {
    message = `Hi ${name}!\n\nYour order from Ainora Mane Thota has been confirmed. We'll be sending your fresh produce package and delivery details shortly.\n\nThank you for choosing us!`;
  } else if (order.status === 'delivered') {
    message = `Hi ${name}!\n\nYour order from Ainora Mane Thota has been delivered. We hope you loved the fresh produce!\n\nCould you take 10 seconds to share your feedback? Just reply here — it helps us serve you better next time 🙏`;
  }

  if (message) {
    return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/91${phone}`;
}

// ==================== ORDERS TABLE ====================

function renderOrders() {
  let orders = [...ordersCache];
  const statusFilter = document.getElementById('filter-status')?.value || 'all';
  const paymentFilter = document.getElementById('filter-payment')?.value || 'all';
  const dateFrom = document.getElementById('filter-date-from')?.value;
  const dateTo = document.getElementById('filter-date-to')?.value;

  if (statusFilter !== 'all') {
    orders = orders.filter(o => o.status === statusFilter);
  }

  if (paymentFilter !== 'all') {
    orders = orders.filter(o => (o.paymentStatus || 'unpaid') === paymentFilter);
  }

  if (dateFrom) {
    orders = orders.filter(o => o.deliveryDate >= dateFrom);
  }

  if (dateTo) {
    orders = orders.filter(o => o.deliveryDate <= dateTo);
  }

  const tbody = document.getElementById('orders-table-body');
  const empty = document.getElementById('empty-orders');

  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  tbody.innerHTML = orders.map(o => {
    const itemsSummary = o.items.map(i => `${i.name}×${i.qty}`).join(', ');
    const statusClass = o.status || 'new';
    const paymentStatus = o.paymentStatus || 'unpaid';
    const isPaid = paymentStatus === 'paid';
    const sourceTag = o.source ? `<span class="inline-block bg-soil/10 text-soil/60 text-[10px] px-1.5 py-0.5 rounded ml-1">${o.source}</span>` : '';

    return `
      <tr class="border-t border-soil/5">
        <td class="px-4 py-3">
          <div class="font-semibold">${o.customerName}${sourceTag}</div>
          <div class="text-soil/40 text-xs">${o.phone}</div>
        </td>
        <td class="px-4 py-3 text-xs max-w-[200px] truncate" title="${itemsSummary}">${itemsSummary}</td>
        <td class="px-4 py-3 font-semibold">₹${o.total}</td>
        <td class="px-4 py-3 text-xs">
          <div>${o.deliveryDate}</div>
          <div class="text-soil/40">${o.deliveryTime}</div>
        </td>
        <td class="px-4 py-3 text-xs max-w-[150px] truncate" title="${o.address}">${o.address}</td>
        <td class="px-4 py-3">
          <select onchange="updateOrderStatus('${o.id}', this.value)" class="status-badge ${statusClass} border-0 bg-transparent cursor-pointer font-semibold" style="appearance: auto;">
            <option value="new" ${o.status === 'new' ? 'selected' : ''}>New</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
        <td class="px-4 py-3">
          <button onclick="togglePaymentStatus('${o.id}', '${paymentStatus}')" class="payment-toggle ${isPaid ? 'paid' : 'unpaid'}">
            <span class="payment-toggle-dot"></span>
            <span class="text-xs font-semibold">${isPaid ? 'Paid' : 'Unpaid'}</span>
          </button>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2">
            <a href="${getWhatsAppLink(o)}" target="_blank" class="text-[#25D366] hover:text-[#128C7E] text-lg" title="Chat on WhatsApp">💬</a>
            <button onclick="showEditOrderModal('${o.id}')" class="text-blue-400 hover:text-blue-600 text-lg" title="Edit order">✏️</button>
            <button onclick="deleteOrder('${o.id}')" class="text-red-400 hover:text-red-600 text-lg" title="Delete order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updateStats();
}

async function updateOrderStatus(orderId, status) {
  try {
    await ordersRef.doc(orderId).update({ status });
    showToast(`Order marked as ${status}`);
  } catch (err) {
    console.error('Status update error:', err);
    showToast('Failed to update status');
  }
}

async function deleteOrder(orderId) {
  const order = ordersCache.find(o => o.id === orderId);
  if (!order) return;

  if (!confirm(`Delete order from ${order.customerName}? This will restore stock for ordered items.`)) return;

  try {
    // Restore stock for each item in the order
    const batch = db.batch();
    order.items.forEach(item => {
      const product = productsCache.find(p => p.id === item.productId);
      if (product) {
        batch.update(productsRef.doc(item.productId), {
          stock: product.stock + item.qty
        });
        product.stock = product.stock + item.qty;
      }
    });

    // Delete the order
    batch.delete(ordersRef.doc(orderId));

    await batch.commit();
    showToast('Order deleted, stock restored');
  } catch (err) {
    console.error('Delete order error:', err);
    showToast('Failed to delete order');
  }
}

// ==================== EDIT ORDER ====================

function showEditOrderModal(orderId) {
  const order = ordersCache.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('edit-order-id').value = orderId;
  document.getElementById('edit-name').value = order.customerName || '';
  document.getElementById('edit-phone').value = order.phone || '';
  document.getElementById('edit-address').value = order.address || '';
  document.getElementById('edit-date').value = order.deliveryDate || '';
  document.getElementById('edit-notes').value = order.notes || '';

  const timeSelect = document.getElementById('edit-time');
  const knownSlots = ['Morning 8-11am', 'Afternoon 12-3pm', 'Evening 4-7pm'];
  timeSelect.value = knownSlots.includes(order.deliveryTime) ? order.deliveryTime : '';

  const sourceSelect = document.getElementById('edit-source');
  sourceSelect.value = order.source || 'website';

  // Pre-set delivery fee checkbox based on saved order (default true if not set)
  const editDeliveryCheck = document.getElementById('edit-delivery-fee');
  if (editDeliveryCheck) editDeliveryCheck.checked = order.deliveryFee !== 0;

  renderEditProductsList(order.items || []);

  document.getElementById('edit-order-modal').classList.remove('hidden');
  document.getElementById('edit-order-modal').classList.add('flex');
}

function closeEditOrderModal() {
  document.getElementById('edit-order-modal').classList.add('hidden');
  document.getElementById('edit-order-modal').classList.remove('flex');
}

function renderEditProductsList(existingItems) {
  const container = document.getElementById('edit-products-list');
  if (!container) return;

  const existingMap = {};
  existingItems.forEach(item => { existingMap[item.productId] = item; });

  const availableProducts = productsCache.filter(p => p.available).sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));
  const availableIds = new Set(availableProducts.map(p => p.id));

  // Also include products from existing items that are no longer available
  const extraProducts = existingItems
    .map(item => productsCache.find(p => p.id === item.productId))
    .filter(p => p && !availableIds.has(p.id));

  const allProducts = [...availableProducts, ...extraProducts];

  if (allProducts.length === 0) {
    container.innerHTML = '<p class="text-soil/40 text-sm text-center py-4">No products available</p>';
    return;
  }

  container.innerHTML = allProducts.map(p => {
    const existing = existingMap[p.id];
    const isChecked = !!existing;
    const qty = existing ? existing.qty : 1;
    // Effective max = current stock + already-ordered qty (since that qty is already deducted)
    const effectiveMax = (p.stock || 0) + (existing ? existing.qty : 0);

    return `
      <div class="flex items-center justify-between gap-3 py-1.5 border-b border-soil/5 last:border-0">
        <label class="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
          <input type="checkbox" class="edit-product-check w-4 h-4 accent-leaf rounded" data-id="${p.id}" ${isChecked ? 'checked' : ''} onchange="updateEditOrderTotal()" />
          <span class="text-sm truncate">${p.emoji} ${p.name}</span>
        </label>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-xs text-soil/50">₹${p.price}/${p.unit}</span>
          <input type="number" value="${qty}" min="1" max="${effectiveMax || 99}" class="edit-qty w-14 border border-soil/20 rounded px-2 py-1 text-xs text-center bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50" data-id="${p.id}" data-price="${p.price}" onchange="updateEditOrderTotal()" oninput="updateEditOrderTotal()" />
          <span class="text-xs text-soil/40">(${effectiveMax} avail)</span>
        </div>
      </div>
    `;
  }).join('');

  updateEditOrderTotal();
}

function updateEditOrderTotal() {
  let itemsTotal = 0;
  document.querySelectorAll('.edit-product-check:checked').forEach(cb => {
    const id = cb.dataset.id;
    const qtyInput = document.querySelector(`.edit-qty[data-id="${id}"]`);
    if (qtyInput) {
      const qty = Math.max(1, parseInt(qtyInput.value) || 1);
      const price = parseFloat(qtyInput.dataset.price || 0);
      itemsTotal += qty * price;
    }
  });
  const includeDelivery = document.getElementById('edit-delivery-fee')?.checked;
  const total = itemsTotal + (includeDelivery ? CONFIG.deliveryFee : 0);
  document.getElementById('edit-order-total').textContent = total;
}

async function submitEditOrder(e) {
  e.preventDefault();

  const orderId = document.getElementById('edit-order-id').value;
  const order = ordersCache.find(o => o.id === orderId);
  if (!order) return;

  const name = document.getElementById('edit-name').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const date = document.getElementById('edit-date').value;
  const time = document.getElementById('edit-time').value;
  const source = document.getElementById('edit-source').value;
  const notes = document.getElementById('edit-notes').value.trim();

  const newItems = [];
  let total = 0;
  document.querySelectorAll('.edit-product-check:checked').forEach(cb => {
    const id = cb.dataset.id;
    const product = productsCache.find(p => p.id === id);
    const qtyInput = document.querySelector(`.edit-qty[data-id="${id}"]`);
    if (product && qtyInput) {
      const qty = Math.max(1, parseInt(qtyInput.value) || 1);
      const subtotal = qty * product.price;
      total += subtotal;
      newItems.push({ productId: id, name: product.name, qty, price: product.price, subtotal });
    }
  });

  if (newItems.length === 0) {
    showToast('Please select at least one product');
    return;
  }

  try {
    const batch = db.batch();

    // Restore stock for old items first (update local cache too so new deductions are correct)
    (order.items || []).forEach(oldItem => {
      const product = productsCache.find(p => p.id === oldItem.productId);
      if (product) {
        const restoredStock = product.stock + oldItem.qty;
        batch.update(productsRef.doc(oldItem.productId), { stock: restoredStock });
        product.stock = restoredStock;
      }
    });

    // Deduct stock for new items
    newItems.forEach(newItem => {
      const product = productsCache.find(p => p.id === newItem.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - newItem.qty);
        batch.update(productsRef.doc(newItem.productId), { stock: newStock });
        product.stock = newStock;
      }
    });

    const includeDelivery = document.getElementById('edit-delivery-fee')?.checked;
    const deliveryFee = includeDelivery ? CONFIG.deliveryFee : 0;
    const grandTotal = total + deliveryFee;

    // Update the order document
    batch.update(ordersRef.doc(orderId), {
      customerName: name,
      phone,
      address,
      deliveryDate: date,
      deliveryTime: time,
      source,
      notes,
      items: newItems,
      itemsTotal: total,
      deliveryFee,
      total: grandTotal,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    closeEditOrderModal();
    showToast(`Order for ${name} updated`);
  } catch (err) {
    console.error('Edit order error:', err);
    showToast('Failed to update order');
  }
}

// ==================== CSV EXPORT ====================

function exportCSV() {
  const orders = ordersCache;
  if (orders.length === 0) {
    showToast('No orders to export');
    return;
  }

  const headers = ['Name', 'Phone', 'Address', 'Items', 'Total', 'Delivery Date', 'Delivery Time', 'Status', 'Payment', 'Source'];
  const rows = orders.map(o => {
    const items = o.items.map(i => `${i.name} x${i.qty}`).join('; ');
    return [
      o.customerName, o.phone, `"${o.address}"`, `"${items}"`,
      o.total, o.deliveryDate, o.deliveryTime, o.status, o.paymentStatus || 'unpaid', o.source || ''
    ];
  });

  let csv = headers.join(',') + '\n';
  rows.forEach(r => { csv += r.join(',') + '\n'; });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ainora-mane-thota-orders-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Orders exported as CSV');
}

// ==================== TOAST ====================

function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==================== PUSH NOTIFICATIONS ====================

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    notificationPermissionGranted = true;
    registerFCMToken();
    return;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      notificationPermissionGranted = true;
      registerFCMToken();
    }
  }
}

async function registerFCMToken() {
  if (!messaging) return;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await messaging.getToken({
      vapidKey: 'BEwQcGz9aPjrcycsyZ3Ptr6fn7aH2c4ZgTVzay1oDDqzD0zChbS04w9QwB2fFx4Bkq-Gad2gGuIIqme6L2RkmJ4',
      serviceWorkerRegistration: registration
    });
    console.log('FCM Token:', token);
  } catch (err) {
    console.error('FCM token error:', err);
  }
}

function showPushNotification(order) {
  const itemsSummary = order.items.map(i => `${i.name} x${i.qty}`).join(', ');
  const title = `New Order - ₹${order.total}`;
  const body = `${order.customerName} (${order.phone})\n${itemsSummary}`;

  // Browser notification (works when tab is open or in background)
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🌿</text></svg>',
      tag: 'new-order-' + order.id,
      requireInteraction: true
    });

    notification.onclick = function () {
      window.focus();
      notification.close();
    };
  }

  // Play a subtle notification sound
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

async function sendOrderEmail(order) {
  try {
    await fetch('/.netlify/functions/send-order-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
  } catch (err) {
    console.error('Email send failed:', err);
  }
}

function showSoldOutNotification(productName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`🚨 ${productName} is Sold Out`, {
      body: `Stock has hit zero. Time to replenish ${productName}!`,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">🚨</text></svg>',
      tag: 'sold-out-' + productName,
      requireInteraction: true
    });
    notification.onclick = function () {
      window.focus();
      notification.close();
    };
  }
}

// ==================== INIT ====================

// ==================== ANALYTICS ====================

function track(event, props) {
  try {
    if (window.mixpanel) mixpanel.track(event, props || {});
  } catch (e) {}
}

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
  track('page_viewed');

  // Track WhatsApp button click on success screen
  document.getElementById('whatsapp-btn').addEventListener('click', () => {
    track('whatsapp_opened', { order_total: lastOrderTotal });
  });

  // Start real-time listeners
  initRealtimeListeners();

  // Check if admin was previously logged in
  if (localStorage.getItem(STORAGE_KEYS.adminAuth) === 'true') {
    document.getElementById('buyer-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminDashboard();
    requestNotificationPermission();
  }

  if (window.location.hash === '#admin') {
    showAdminLogin(new Event('click'));
  }
});
