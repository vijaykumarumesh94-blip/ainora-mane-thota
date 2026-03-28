// Ainora Mane Thota — Main Application Logic (Firebase Firestore)

// ==================== DEFAULT PRODUCTS ====================

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Coconut', kannada: 'Thenginakayi', emoji: '🥥', photoUrl: null, unit: 'piece', price: 40, stock: 10, maxStock: 10, lowStockThreshold: 5, deliveryDays: '2-3 days', available: true },
  { id: '2', name: 'Jackfruit', kannada: 'Halasina Hannu', emoji: '🍈', photoUrl: null, unit: 'piece', price: 300, stock: 5, maxStock: 5, lowStockThreshold: 2, deliveryDays: '2-3 days', available: true },
  { id: '3', name: 'Lemon Grass', kannada: 'Nimbe Hullu', emoji: '🌿', photoUrl: null, unit: 'bundle', price: 60, stock: 20, maxStock: 20, lowStockThreshold: 5, deliveryDays: '1-2 days', available: true },
  { id: '4', name: 'Curry Leaves (Karibevu)', kannada: 'Karibevu', emoji: '🍃', photoUrl: null, unit: 'bundle', price: 20, stock: 10, maxStock: 10, lowStockThreshold: 3, deliveryDays: '1-2 days', available: true },
  { id: '5', name: 'Coconut Oil', kannada: 'Thengi Enne', emoji: '🫙', photoUrl: null, unit: '250ml bottle', price: 150, stock: 3, maxStock: 10, lowStockThreshold: 3, deliveryDays: '3-5 days', available: true },
  { id: '6', name: 'Cherry Tomato', kannada: 'Tomato', emoji: '🍅', photoUrl: null, unit: '100g pack', price: 40, stock: 10, maxStock: 15, lowStockThreshold: 5, deliveryDays: '1-2 days', available: true },
  { id: '7', name: 'Malabar Spinach', kannada: 'Basale Soppu', emoji: '🥬', photoUrl: null, unit: 'bundle', price: 25, stock: 10, maxStock: 10, lowStockThreshold: 3, deliveryDays: '1-2 days', available: true }
];

const PRODUCT_COLORS = [
  'bg-emerald-100', 'bg-amber-100', 'bg-lime-100', 'bg-green-100',
  'bg-orange-100', 'bg-red-100', 'bg-teal-100', 'bg-yellow-100',
  'bg-cyan-100', 'bg-rose-100'
];

// ==================== STATE ====================

let productsCache = [];
let ordersCache = [];
let unsubscribeProducts = null;
let unsubscribeOrders = null;

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
    ordersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
  const products = productsCache.filter(p => p.available);
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

  grid.innerHTML = products.map((p, i) => {
    const colorClass = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
    const inCart = cart[p.id] || 0;
    const stockClass = p.stock === 0 ? 'out' : p.stock <= (p.lowStockThreshold || 5) ? 'low' : 'available';
    const stockText = p.stock === 0 ? 'Out of Stock' : p.stock <= (p.lowStockThreshold || 5) ? `Only ${p.stock} left!` : `${p.stock} available`;
    const maxStock = p.maxStock || p.stock || 1;
    const stockPercent = maxStock > 0 ? Math.min(100, (p.stock / maxStock) * 100) : 0;
    const barColor = p.stock <= (p.lowStockThreshold || 5) ? 'bg-orange-400' : 'bg-leaf';
    const disabled = p.stock === 0 ? 'disabled' : '';

    const imageBlock = p.photoUrl
      ? `<img src="${p.photoUrl}" alt="${p.name}" loading="lazy" />`
      : `<div class="emoji-fallback">${p.emoji}</div>`;

    return `
      <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm">
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
  } else {
    cart[productId] = newQty;
  }

  saveCart(cart);
  renderCatalog();
  updateCartBar();
}

function updateCartBar() {
  const cart = getCart();
  const bar = document.getElementById('cart-bar');

  let count = 0;
  let total = 0;

  Object.keys(cart).forEach(id => {
    const product = productsCache.find(p => p.id === id);
    if (product) {
      count += cart[id];
      total += cart[id] * product.price;
    }
  });

  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = total;

  if (count > 0) {
    bar.classList.add('cart-visible');
  } else {
    bar.classList.remove('cart-visible');
  }
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

  summary.innerHTML = items.map(item => `
    <div class="flex justify-between items-center text-sm">
      <span>${item.emoji} ${item.name} × ${item.qty}</span>
      <span class="font-semibold">₹${item.subtotal}</span>
    </div>
  `).join('');

  document.getElementById('order-total').textContent = total;
  document.getElementById('order-modal').classList.remove('hidden');
  document.getElementById('order-modal').classList.add('flex');

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('cust-date').min = today;
}

function closeOrderForm() {
  document.getElementById('order-modal').classList.add('hidden');
  document.getElementById('order-modal').classList.remove('flex');
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

  const order = {
    customerName: name,
    phone,
    address,
    deliveryDate: date,
    deliveryTime: time,
    notes,
    items,
    total,
    status: 'new',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Save order to Firestore
    await ordersRef.add(order);

    // Decrement stock atomically in Firestore
    const batch = db.batch();
    items.forEach(item => {
      const product = productsCache.find(p => p.id === item.productId);
      if (product) {
        batch.update(productsRef.doc(item.productId), {
          stock: Math.max(0, product.stock - item.qty),
          maxStock: product.maxStock || product.stock
        });
      }
    });
    await batch.commit();

    // Build WhatsApp message
    const itemList = items.map(i => `  • ${i.name} × ${i.qty} (₹${i.subtotal})`).join('\n');
    const waMessage = `🌿 *New Order — Ainora Mane Thota*\n\n*${name}* (${phone})\n\n*Items:*\n${itemList}\n\n*Total: ₹${total}*\n\n*Delivery:* ${date} | ${time}\n*Address:* ${address}${notes ? '\n*Notes:* ' + notes : ''}`;
    const waUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

    // Show success
    closeOrderForm();
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

  grid.innerHTML = productsCache.map(p => {
    const imageSrc = p.photoUrl || '';
    const photoDisplay = imageSrc
      ? `<img src="${imageSrc}" alt="${p.name}" class="w-full h-full object-cover" />`
      : `<span class="text-3xl">${p.emoji}</span>`;

    return `
      <div class="admin-stock-card" data-product-id="${p.id}">
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
          <button onclick="openEditModal('${p.id}')" class="text-soil/30 hover:text-soil text-sm p-1" title="Edit">✏️</button>
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
      img.onload = () => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
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
  const dateFrom = document.getElementById('filter-date-from')?.value;
  const dateTo = document.getElementById('filter-date-to')?.value;

  if (statusFilter !== 'all') {
    orders = orders.filter(o => o.status === statusFilter);
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

    return `
      <tr class="border-t border-soil/5">
        <td class="px-4 py-3">
          <div class="font-semibold">${o.customerName}</div>
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
          <a href="${getWhatsAppLink(o)}" target="_blank" class="text-[#25D366] hover:text-[#128C7E] text-lg" title="Chat on WhatsApp">💬</a>
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

// ==================== CSV EXPORT ====================

function exportCSV() {
  const orders = ordersCache;
  if (orders.length === 0) {
    showToast('No orders to export');
    return;
  }

  const headers = ['Name', 'Phone', 'Address', 'Items', 'Total', 'Delivery Date', 'Delivery Time', 'Status'];
  const rows = orders.map(o => {
    const items = o.items.map(i => `${i.name} x${i.qty}`).join('; ');
    return [
      o.customerName, o.phone, `"${o.address}"`, `"${items}"`,
      o.total, o.deliveryDate, o.deliveryTime, o.status
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

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
  // Start real-time listeners
  initRealtimeListeners();

  // Check if admin was previously logged in
  if (localStorage.getItem(STORAGE_KEYS.adminAuth) === 'true') {
    document.getElementById('buyer-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminDashboard();
  }

  if (window.location.hash === '#admin') {
    showAdminLogin(new Event('click'));
  }
});
