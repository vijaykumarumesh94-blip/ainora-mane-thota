// Ainora Mane Thota Fresh — Main Application Logic

// ==================== DATA LAYER ====================

const STORAGE_KEYS = {
  products: 'mff_products',
  orders: 'mff_orders',
  cart: 'mff_cart',
  adminAuth: 'mff_admin_auth'
};

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
  'bg-emerald-100',
  'bg-amber-100',
  'bg-lime-100',
  'bg-green-100',
  'bg-orange-100',
  'bg-red-100',
  'bg-teal-100',
  'bg-yellow-100',
  'bg-cyan-100',
  'bg-rose-100'
];

// Data access functions
function getProducts() {
  const stored = localStorage.getItem(STORAGE_KEYS.products);
  if (stored) return JSON.parse(stored);
  // Initialize with defaults
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
}

function getOrders() {
  const stored = localStorage.getItem(STORAGE_KEYS.orders);
  return stored ? JSON.parse(stored) : [];
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function getCart() {
  const stored = localStorage.getItem(STORAGE_KEYS.cart);
  return stored ? JSON.parse(stored) : {};
}

function saveCart(cart) {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
}

function getNextProductId() {
  const products = getProducts();
  const maxId = products.reduce((max, p) => Math.max(max, parseInt(p.id) || 0), 0);
  return String(maxId + 1);
}

// ==================== PRODUCT CATALOG (BUYER) ====================

function renderCatalog() {
  const products = getProducts().filter(p => p.available);
  const grid = document.getElementById('product-grid');
  const empty = document.getElementById('empty-catalog');
  const cart = getCart();

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
    const stockClass = p.stock === 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : 'available';
    const stockText = p.stock === 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? `Only ${p.stock} left!` : `${p.stock} available`;
    const stockPercent = p.maxStock > 0 ? Math.min(100, (p.stock / p.maxStock) * 100) : 0;
    const barColor = p.stock <= p.lowStockThreshold ? 'bg-orange-400' : 'bg-leaf';
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
              <p class="text-soil/40 text-xs">${p.kannada}</p>
            </div>
            <span class="stock-badge ${stockClass}">${stockText}</span>
          </div>
          <div class="stock-bar mb-2 mt-1">
            <div class="stock-bar-fill ${barColor}" style="width: ${stockPercent}%"></div>
          </div>
          <div class="flex items-end justify-between">
            <div>
              <div class="font-bold text-base md:text-lg">₹${p.price}<span class="text-soil/40 text-xs font-normal"> / ${p.unit}</span></div>
              <div class="text-soil/40 text-xs">Ready in ${p.deliveryDays}</div>
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
  const products = getProducts();
  const product = products.find(p => p.id === productId);
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
  const products = getProducts();
  const bar = document.getElementById('cart-bar');

  let count = 0;
  let total = 0;

  Object.keys(cart).forEach(id => {
    const product = products.find(p => p.id === id);
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
  const products = getProducts();
  const summary = document.getElementById('order-summary');

  let total = 0;
  let items = [];

  Object.keys(cart).forEach(id => {
    const product = products.find(p => p.id === id);
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

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('cust-date').min = today;
}

function closeOrderForm() {
  document.getElementById('order-modal').classList.add('hidden');
  document.getElementById('order-modal').classList.remove('flex');
}

function submitOrder(e) {
  e.preventDefault();

  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const date = document.getElementById('cust-date').value;
  const time = document.getElementById('cust-time').value;
  const notes = document.getElementById('cust-notes').value.trim();

  const cart = getCart();
  const products = getProducts();
  let items = [];
  let total = 0;

  Object.keys(cart).forEach(id => {
    const product = products.find(p => p.id === id);
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

  // Create order
  const order = {
    id: 'ORD-' + Date.now(),
    customerName: name,
    phone,
    address,
    deliveryDate: date,
    deliveryTime: time,
    notes,
    items,
    total,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  // Save order
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);

  // Decrement stock
  items.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - item.qty);
    }
  });
  saveProducts(products);

  // Build WhatsApp message
  const itemList = items.map(i => `  • ${i.name} × ${i.qty} (₹${i.subtotal})`).join('\n');
  const waMessage = `🌿 *New Order — Ainora Mane Thota*\n\n*${name}* (${phone})\n\n*Items:*\n${itemList}\n\n*Total: ₹${total}*\n\n*Delivery:* ${date} | ${time}\n*Address:* ${address}${notes ? '\n*Notes:* ' + notes : ''}`;
  const waUrl = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

  // Close order form, show success
  closeOrderForm();

  document.getElementById('success-name').textContent = name;
  document.getElementById('whatsapp-btn').href = waUrl;
  document.getElementById('success-modal').classList.remove('hidden');
  document.getElementById('success-modal').classList.add('flex');

  // Clear cart
  saveCart({});
  updateCartBar();
  renderCatalog();

  // Reset form
  document.getElementById('order-form').reset();
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
  const orders = getOrders();
  const today = new Date().toISOString().split('T')[0];

  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-total-revenue').textContent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  document.getElementById('stat-today-orders').textContent = orders.filter(o => o.createdAt && o.createdAt.startsWith(today)).length;
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
  const products = getProducts();
  const grid = document.getElementById('admin-stock-grid');

  grid.innerHTML = products.map(p => {
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
            <input type="number" value="${p.lowStockThreshold}" min="0" class="w-12 border border-soil/15 rounded px-2 py-1 text-xs bg-cream focus:outline-none focus:ring-1 focus:ring-leaf/50 threshold-input" data-id="${p.id}" />
          </div>
          <button onclick="saveSingleStock('${p.id}')" class="text-leaf hover:text-leaf-dark text-xs font-semibold">Save</button>
        </div>
      </div>
    `;
  }).join('');
}

function adjustStock(productId, delta) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  product.stock = Math.max(0, product.stock + delta);
  if (product.stock > product.maxStock) product.maxStock = product.stock;
  saveProducts(products);

  // Update the input
  const card = document.querySelector(`.admin-stock-card[data-product-id="${productId}"]`);
  if (card) {
    const input = card.querySelector('.stock-input');
    if (input) input.value = product.stock;
  }
}

function setStock(productId, value) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  product.stock = Math.max(0, parseInt(value) || 0);
  if (product.stock > product.maxStock) product.maxStock = product.stock;
  saveProducts(products);
}

function toggleAvailable(productId, el) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  product.available = !product.available;
  saveProducts(products);

  el.classList.toggle('active', product.available);
  const label = el.previousElementSibling;
  if (label) label.textContent = product.available ? 'Visible' : 'Hidden';
}

function saveAllStock() {
  const products = getProducts();

  // Read price and threshold inputs
  document.querySelectorAll('.price-input').forEach(input => {
    const product = products.find(p => p.id === input.dataset.id);
    if (product) product.price = Math.max(0, parseInt(input.value) || 0);
  });

  document.querySelectorAll('.threshold-input').forEach(input => {
    const product = products.find(p => p.id === input.dataset.id);
    if (product) product.lowStockThreshold = Math.max(0, parseInt(input.value) || 0);
  });

  saveProducts(products);
  showToast('Stock updated! Buyers can see the changes now');
}

function saveSingleStock(productId) {
  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const card = document.querySelector(`.admin-stock-card[data-product-id="${productId}"]`);
  if (card) {
    const priceInput = card.querySelector('.price-input');
    const thresholdInput = card.querySelector('.threshold-input');
    if (priceInput) product.price = Math.max(0, parseInt(priceInput.value) || 0);
    if (thresholdInput) product.lowStockThreshold = Math.max(0, parseInt(thresholdInput.value) || 0);
  }

  saveProducts(products);
  showToast(`${product.name} updated`);
}

// ==================== ADD PRODUCT ====================

function toggleAddProduct() {
  const form = document.getElementById('add-product-form');
  const arrow = document.getElementById('add-product-arrow');
  form.classList.toggle('hidden');
  arrow.style.transform = form.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

// Preview photo on select
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

  const id = getNextProductId();
  let photoUrl = null;

  // Handle photo upload (compress and store as data URL for local storage)
  if (photoFile) {
    try {
      photoUrl = await compressAndStoreImage(photoFile);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  const product = {
    id,
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
    createdAt: new Date().toISOString()
  };

  const products = getProducts();
  products.push(product);
  saveProducts(products);

  // Reset form
  document.getElementById('new-name').value = '';
  document.getElementById('new-kannada').value = '';
  document.getElementById('new-emoji').value = '';
  document.getElementById('new-price').value = '';
  document.getElementById('new-stock').value = '';
  document.getElementById('new-photo').value = '';
  document.getElementById('new-photo-preview').classList.add('hidden');

  renderStockCards();
  showToast(`${name} added to catalog`);
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
          if (w > h) {
            h = (h / w) * maxSize;
            w = maxSize;
          } else {
            w = (w / h) * maxSize;
            h = maxSize;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Compress to JPEG at 0.7 quality
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
  const products = getProducts();
  const product = products.find(p => p.id === productId);
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
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  product.name = document.getElementById('edit-name').value.trim() || product.name;
  product.kannada = document.getElementById('edit-kannada').value.trim() || product.kannada;
  product.emoji = document.getElementById('edit-emoji').value.trim() || product.emoji;
  product.unit = document.getElementById('edit-unit').value;
  product.price = parseInt(document.getElementById('edit-price').value) || product.price;
  product.deliveryDays = document.getElementById('edit-delivery').value;

  // Handle new photo
  const photoFile = document.getElementById('edit-photo').files[0];
  if (photoFile) {
    try {
      product.photoUrl = await compressAndStoreImage(photoFile);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  saveProducts(products);
  closeEditModal();
  renderStockCards();
  showToast(`${product.name} updated`);
}

function deleteProduct() {
  const id = document.getElementById('edit-id').value;
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

  const updated = products.filter(p => p.id !== id);
  saveProducts(updated);
  closeEditModal();
  renderStockCards();
  showToast(`${product.name} deleted`);
}

// ==================== ORDERS TABLE ====================

function renderOrders() {
  let orders = getOrders();
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
          <a href="https://wa.me/91${o.phone}" target="_blank" class="text-[#25D366] hover:text-[#128C7E] text-lg" title="Chat on WhatsApp">💬</a>
        </td>
      </tr>
    `;
  }).join('');

  updateStats();
}

function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    saveOrders(orders);
    renderOrders();
    showToast(`Order marked as ${status}`);
  }
}

// ==================== CSV EXPORT ====================

function exportCSV() {
  const orders = getOrders();
  if (orders.length === 0) {
    showToast('No orders to export');
    return;
  }

  const headers = ['Name', 'Phone', 'Address', 'Items', 'Total', 'Delivery Date', 'Delivery Time', 'Status', 'Order Date'];
  const rows = orders.map(o => {
    const items = o.items.map(i => `${i.name} x${i.qty}`).join('; ');
    return [
      o.customerName,
      o.phone,
      `"${o.address}"`,
      `"${items}"`,
      o.total,
      o.deliveryDate,
      o.deliveryTime,
      o.status,
      o.createdAt ? o.createdAt.split('T')[0] : ''
    ];
  });

  let csv = headers.join(',') + '\n';
  rows.forEach(r => {
    csv += r.join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `magadi-farm-orders-${new Date().toISOString().split('T')[0]}.csv`;
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
  // Check if admin was previously logged in
  if (localStorage.getItem(STORAGE_KEYS.adminAuth) === 'true') {
    document.getElementById('buyer-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    loadAdminDashboard();
  } else {
    renderCatalog();
    updateCartBar();
  }

  // Hash-based routing
  if (window.location.hash === '#admin') {
    showAdminLogin(new Event('click'));
  }
});
