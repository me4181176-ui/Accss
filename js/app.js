/**
 * LUMIÈRE & CO. - Main Application Logic
 * Dynamic E-Commerce Engine, Customizer, Cart Drawer & Multi-Currency System
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State Initialization ---
  const state = {
    lang: localStorage.getItem('lumiere_lang') || 'ar',
    currency: localStorage.getItem('lumiere_curr') || 'EGP',
    theme: localStorage.getItem('lumiere_theme') || 'dark',
    palette: localStorage.getItem('lumiere_palette') || 'nexor',
    cart: JSON.parse(localStorage.getItem('lumiere_cart')) || [],
    wishlist: JSON.parse(localStorage.getItem('lumiere_wishlist')) || [],
    category: 'all',
    gender: 'all',
    material: 'all',
    sortBy: 'featured',
    searchQuery: '',
    builder: { necklace: null, ring: null, bracelet: null }
  };

  // --- DOM Elements ---
  const htmlEl = document.documentElement;
  const langSelect = document.getElementById('langSelect');
  const currSelect = document.getElementById('currSelect');
  const paletteSelect = document.getElementById('paletteSelect');
  const themeToggle = document.getElementById('themeToggle');
  const productGrid = document.getElementById('productGrid');
  const categoryPills = document.getElementById('categoryPills');
  const genderFilter = document.getElementById('genderFilter');
  const materialFilter = document.getElementById('materialFilter');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('searchInput');
  const cartBtn = document.getElementById('cartBtn');
  const cartCount = document.getElementById('cartCount');
  const cartDrawer = document.getElementById('cartDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const cartClose = document.getElementById('cartClose');
  const cartItemsContainer = document.getElementById('cartItems');
  const cartSubtotalEl = document.getElementById('cartSubtotal');
  const cartShippingEl = document.getElementById('cartShipping');
  const cartTotalEl = document.getElementById('cartTotal');
  const shippingProgress = document.getElementById('shippingProgress');
  const shippingMsg = document.getElementById('shippingMsg');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContainer = document.getElementById('modalContainer');
  const toastContainer = document.getElementById('toastContainer');

  // --- Initial Setup ---
  init();

  function init() {
    applyTheme(state.theme);
    applyPalette(state.palette);
    applyLang(state.lang);
    applyCurrency(state.currency);
    renderCategoryPills();
    renderProducts();
    updateCartUI();
    initBuilder();
    bindEvents();
  }

  // --- Palette Handler ---
  function applyPalette(palette) {
    state.palette = palette;
    htmlEl.setAttribute('data-palette', palette);
    localStorage.setItem('lumiere_palette', palette);
    if (paletteSelect) paletteSelect.value = palette;
  }

  // --- Theme Handler ---
  function applyTheme(theme) {
    state.theme = theme;
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('lumiere_theme', theme);
    themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }

  // --- Language Handler ---
  function applyLang(lang) {
    state.lang = lang;
    htmlEl.setAttribute('lang', lang);
    htmlEl.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('lumiere_lang', lang);
    langSelect.value = lang;

    // Update i18n text
    const t = UI_TRANSLATIONS[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
          el.placeholder = t[key];
        } else {
          el.innerHTML = t[key];
        }
      }
    });

    renderCategoryPills();
    renderProducts();
    updateCartUI();
  }

  // --- Currency Handler ---
  function applyCurrency(curr) {
    state.currency = curr;
    localStorage.setItem('lumiere_curr', curr);
    currSelect.value = curr;
    renderProducts();
    updateCartUI();
    updateBuilderSummary();
  }

  function formatPrice(egpPrice) {
    const info = CURRENCIES[state.currency];
    const converted = (egpPrice * info.rate).toFixed(state.currency === 'USD' ? 2 : 0);
    return state.lang === 'ar' ? `${converted} ${info.symbol}` : `${info.symbol}${converted}`;
  }

  // --- Category Pills Renderer ---
  function renderCategoryPills() {
    categoryPills.innerHTML = CATEGORIES.map(cat => {
      const name = state.lang === 'ar' ? cat.name_ar : cat.name_en;
      const activeClass = state.category === cat.id ? 'active' : '';
      return `
        <button class="pill-btn ${activeClass}" data-cat="${cat.id}">
          <i class="fas ${cat.icon}"></i> ${name}
        </button>
      `;
    }).join('');
  }

  // --- Filter & Sort Products ---
  function getFilteredProducts() {
    return PRODUCTS.filter(p => {
      const matchCat = state.category === 'all' || p.category === state.category;
      const matchGender = state.gender === 'all' || p.gender === state.gender || p.gender === 'unisex';
      const matchMat = state.material === 'all' || p.material === state.material;
      const query = state.searchQuery.toLowerCase();
      const matchSearch = !query || 
        p.name_ar.toLowerCase().includes(query) || 
        p.name_en.toLowerCase().includes(query) ||
        p.description_ar.toLowerCase().includes(query);

      return matchCat && matchGender && matchMat && matchSearch;
    }).sort((a, b) => {
      if (state.sortBy === 'price-low') return a.price_egp - b.price_egp;
      if (state.sortBy === 'price-high') return b.price_egp - a.price_egp;
      if (state.sortBy === 'rating') return b.rating - a.rating;
      return (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0); // featured
    });
  }

  // --- Product Grid Renderer ---
  function renderProducts() {
    const products = getFilteredProducts();
    const t = UI_TRANSLATIONS[state.lang];

    if (products.length === 0) {
      productGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-search-minus" style="font-size: 3rem; color: var(--text-gold); margin-bottom: 1rem;"></i>
          <h3>${state.lang === 'ar' ? 'لا توجد منتجات تطابق بحثك' : 'No products match your search'}</h3>
          <p style="color: var(--text-muted);">${state.lang === 'ar' ? 'جرب تغيير فلاتر البحث أو الكلمات' : 'Try clearing your filters'}</p>
        </div>
      `;
      return;
    }

    productGrid.innerHTML = products.map(p => {
      const title = state.lang === 'ar' ? p.name_ar : p.name_en;
      const isWish = state.wishlist.includes(p.id);

      return `
        <div class="product-card" data-id="${p.id}">
          <div class="card-badge-container">
            ${p.is_bestseller ? `<span class="card-badge badge-gold">${t.bestseller}</span>` : ''}
            ${p.is_new ? `<span class="card-badge badge-emerald">${t.new_arrival}</span>` : ''}
          </div>
          
          <div class="card-image-wrap">
            <img src="${p.image}" alt="${title}" class="product-image" loading="lazy">
            <div class="card-quick-actions">
              <button class="icon-btn quick-view-btn" data-id="${p.id}" title="${t.quick_view}">
                <i class="fas fa-eye"></i>
              </button>
              <button class="icon-btn toggle-wish-btn ${isWish ? 'active' : ''}" data-id="${p.id}" title="Wishlist">
                <i class="${isWish ? 'fas' : 'far'} fa-heart" style="${isWish ? 'color: #E74C3C;' : ''}"></i>
              </button>
            </div>
          </div>

          <div class="card-content">
            <span class="product-category">${p.category.toUpperCase()} • ${p.gender.toUpperCase()}</span>
            <h3 class="product-title">${title}</h3>
            
            <div class="rating-stars">
              <i class="fas fa-star"></i> <span>${p.rating}</span>
              <span class="review-count">(${p.reviews_count})</span>
            </div>

            <div class="card-footer">
              <div class="price-box">
                <span class="price-current">${formatPrice(p.price_egp)}</span>
                ${p.original_price_egp ? `<span class="price-old">${formatPrice(p.original_price_egp)}</span>` : ''}
              </div>
              <button class="gold-btn add-cart-btn" data-id="${p.id}" style="padding: 0.55rem 1rem; font-size: 0.85rem;">
                <i class="fas fa-shopping-bag"></i> ${t.add_to_cart}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Quick View Modal Renderer ---
  function openQuickView(productId) {
    const p = PRODUCTS.find(item => item.id === productId);
    if (!p) return;

    const t = UI_TRANSLATIONS[state.lang];
    const title = state.lang === 'ar' ? p.name_ar : p.name_en;
    const desc = state.lang === 'ar' ? p.description_ar : p.description_en;
    const mat = state.lang === 'ar' ? p.material_ar : p.material_en;

    modalContainer.innerHTML = `
      <div class="modal-card">
        <button class="modal-close" id="modalCloseBtn"><i class="fas fa-times"></i></button>
        <div class="quickview-body">
          <div>
            <img src="${p.image}" alt="${title}" style="width: 100%; border-radius: var(--radius-md); border: 1px solid var(--glass-border);">
          </div>
          <div>
            <span class="product-category">${p.gender.toUpperCase()} • ${p.category}</span>
            <h2 style="font-size: 1.8rem; margin: 0.4rem 0;">${title}</h2>
            <div class="rating-stars" style="margin-bottom: 1rem;">
              <i class="fas fa-star"></i> <span>${p.rating}</span> (${p.reviews_count} ${state.lang === 'ar' ? 'تقييمات' : 'reviews'})
            </div>
            
            <div class="price-box" style="margin-bottom: 1.2rem;">
              <span class="price-current" style="font-size: 1.6rem;">${formatPrice(p.price_egp)}</span>
              ${p.original_price_egp ? `<span class="price-old" style="font-size: 1.1rem;">${formatPrice(p.original_price_egp)}</span>` : ''}
            </div>

            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${desc}</p>
            <p style="margin-bottom: 1.2rem;"><strong>${t.material_label}</strong> ${mat}</p>

            ${p.sizes ? `
              <div class="form-group">
                <label class="form-label">${t.size_label}</label>
                <select id="modalSizeSelect" class="form-input">
                  ${p.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>
            ` : ''}

            ${p.engraving_available ? `
              <div class="form-group">
                <label class="form-label">${t.engraving_label}</label>
                <input type="text" id="modalEngravingInput" class="form-input" placeholder="${t.engraving_placeholder}" maxlength="20">
              </div>
            ` : ''}

            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
              <button class="gold-btn" id="modalAddToCartBtn" style="flex-grow: 1; justify-content: center;">
                <i class="fas fa-shopping-bag"></i> ${t.add_to_cart}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');

    document.getElementById('modalCloseBtn').onclick = () => modalOverlay.classList.remove('active');
    document.getElementById('modalAddToCartBtn').onclick = () => {
      const selectedSize = document.getElementById('modalSizeSelect')?.value || '';
      const engravingText = document.getElementById('modalEngravingInput')?.value || '';
      addToCart(p.id, 1, selectedSize, engravingText);
      modalOverlay.classList.remove('active');
    };
  }

  // --- Cart Engine ---
  function addToCart(productId, qty = 1, size = '', engraving = '') {
    const p = PRODUCTS.find(item => item.id === productId);
    if (!p) return;

    const existingIndex = state.cart.findIndex(item => 
      item.id === productId && item.size === size && item.engraving === engraving
    );

    if (existingIndex > -1) {
      state.cart[existingIndex].qty += qty;
    } else {
      state.cart.push({
        id: p.id,
        price_egp: p.price_egp,
        qty: qty,
        size: size,
        engraving: engraving
      });
    }

    saveCart();
    updateCartUI();
    openCart();
    showToast(state.lang === 'ar' ? 'تمت إضافة القطعة للسلة بنجاح ✨' : 'Item added to your shopping bag! ✨');
  }

  function updateCartUI() {
    const totalItems = state.cart.reduce((sum, item) => sum + item.qty, 0);
    cartCount.textContent = totalItems;

    const t = UI_TRANSLATIONS[state.lang];

    if (state.cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <i class="fas fa-shopping-bag" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <p style="color: var(--text-muted);">${t.cart_empty}</p>
        </div>
      `;
      cartSubtotalEl.textContent = formatPrice(0);
      cartTotalEl.textContent = formatPrice(0);
      shippingProgress.style.width = '0%';
      shippingMsg.textContent = t.free_shipping_calc.replace('{amount}', formatPrice(3000));
      return;
    }

    let subtotalEgp = 0;

    cartItemsContainer.innerHTML = state.cart.map((item, index) => {
      const p = PRODUCTS.find(prod => prod.id === item.id);
      if (!p) return '';

      const itemSubtotal = p.price_egp * item.qty;
      subtotalEgp += itemSubtotal;
      const title = state.lang === 'ar' ? p.name_ar : p.name_en;

      return `
        <div class="cart-item">
          <img src="${p.image}" alt="${title}" class="cart-item-img">
          <div class="cart-item-info">
            <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">${title}</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem;">
              ${item.size ? `<span>المقاس: ${item.size}</span> ` : ''}
              ${item.engraving ? `<span style="color: var(--text-gold);">• نقش: ${item.engraving}</span>` : ''}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: var(--text-gold);">${formatPrice(itemSubtotal)}</span>
              <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-primary); padding: 0.2rem 0.6rem; border-radius: var(--radius-full);">
                <button onclick="changeQty(${index}, -1)" style="color: var(--text-main);">-</button>
                <span>${item.qty}</span>
                <button onclick="changeQty(${index}, 1)" style="color: var(--text-main);">+</button>
              </div>
            </div>
          </div>
          <button onclick="removeCartItem(${index})" style="color: var(--text-muted);"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
    }).join('');

    const freeThresholdEgp = 3000;
    const progress = Math.min(100, (subtotalEgp / freeThresholdEgp) * 100);
    shippingProgress.style.width = `${progress}%`;

    if (subtotalEgp >= freeThresholdEgp) {
      shippingMsg.textContent = t.free_shipping_unlocked;
      cartShippingEl.textContent = t.free;
    } else {
      const remaining = freeThresholdEgp - subtotalEgp;
      shippingMsg.textContent = t.free_shipping_calc.replace('{amount}', formatPrice(remaining));
      cartShippingEl.textContent = formatPrice(150);
    }

    const finalTotalEgp = subtotalEgp >= freeThresholdEgp ? subtotalEgp : subtotalEgp + 150;
    cartSubtotalEl.textContent = formatPrice(subtotalEgp);
    cartTotalEl.textContent = formatPrice(finalTotalEgp);
  }

  window.changeQty = (index, delta) => {
    state.cart[index].qty += delta;
    if (state.cart[index].qty <= 0) {
      state.cart.splice(index, 1);
    }
    saveCart();
    updateCartUI();
  };

  window.removeCartItem = (index) => {
    state.cart.splice(index, 1);
    saveCart();
    updateCartUI();
  };

  function saveCart() {
    localStorage.setItem('lumiere_cart', JSON.stringify(state.cart));
  }

  function openCart() {
    cartDrawer.classList.add('active');
    drawerOverlay.classList.add('active');
  }

  function closeCart() {
    cartDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
  }

  // --- Mix & Match Stack Builder Engine ---
  function initBuilder() {
    const necklaces = PRODUCTS.filter(p => p.category === 'necklaces');
    const rings = PRODUCTS.filter(p => p.category === 'rings');
    const bracelets = PRODUCTS.filter(p => p.category === 'bracelets');

    const builderNecklaceSelect = document.getElementById('builderNecklaceSelect');
    const builderRingSelect = document.getElementById('builderRingSelect');
    const builderBraceletSelect = document.getElementById('builderBraceletSelect');

    populateBuilderSelect(builderNecklaceSelect, necklaces);
    populateBuilderSelect(builderRingSelect, rings);
    populateBuilderSelect(builderBraceletSelect, bracelets);

    state.builder.necklace = necklaces[0] || null;
    state.builder.ring = rings[0] || null;
    state.builder.bracelet = bracelets[0] || null;

    updateBuilderSummary();

    builderNecklaceSelect?.addEventListener('change', (e) => {
      state.builder.necklace = PRODUCTS.find(p => p.id === e.target.value);
      updateBuilderSummary();
    });
    builderRingSelect?.addEventListener('change', (e) => {
      state.builder.ring = PRODUCTS.find(p => p.id === e.target.value);
      updateBuilderSummary();
    });
    builderBraceletSelect?.addEventListener('change', (e) => {
      state.builder.bracelet = PRODUCTS.find(p => p.id === e.target.value);
      updateBuilderSummary();
    });

    document.getElementById('builderAddAllBtn')?.addEventListener('click', () => {
      if (state.builder.necklace) addToCart(state.builder.necklace.id);
      if (state.builder.ring) addToCart(state.builder.ring.id);
      if (state.builder.bracelet) addToCart(state.builder.bracelet.id);
      showToast(state.lang === 'ar' ? 'تمت إضافة الطقم كاملاً للسلة بخصم 15%! 🎉' : 'Full customized set added to cart with 15% discount!');
    });
  }

  function populateBuilderSelect(selectEl, items) {
    if (!selectEl) return;
    selectEl.innerHTML = items.map(p => {
      const name = state.lang === 'ar' ? p.name_ar : p.name_en;
      return `<option value="${p.id}">${name} - ${formatPrice(p.price_egp)}</option>`;
    }).join('');
  }

  function updateBuilderSummary() {
    const imgNecklace = document.getElementById('previewImgNecklace');
    const imgRing = document.getElementById('previewImgRing');
    const imgBracelet = document.getElementById('previewImgBracelet');
    const totalPriceEl = document.getElementById('builderTotalPrice');

    if (imgNecklace && state.builder.necklace) imgNecklace.src = state.builder.necklace.image;
    if (imgRing && state.builder.ring) imgRing.src = state.builder.ring.image;
    if (imgBracelet && state.builder.bracelet) imgBracelet.src = state.builder.bracelet.image;

    const rawTotal = (state.builder.necklace?.price_egp || 0) + 
                     (state.builder.ring?.price_egp || 0) + 
                     (state.builder.bracelet?.price_egp || 0);

    const discountedTotal = Math.round(rawTotal * 0.85); // 15% off discount
    if (totalPriceEl) totalPriceEl.textContent = formatPrice(discountedTotal);
  }

  // --- Interactive Size Calculator Modal ---
  function openSizeGuideModal() {
    const isAr = state.lang === 'ar';
    modalContainer.innerHTML = `
      <div class="modal-card" style="padding: 2rem; max-width: 600px;">
        <button class="modal-close" id="modalCloseBtn"><i class="fas fa-times"></i></button>
        <h2 style="font-size: 1.8rem; margin-bottom: 1rem;" class="gold-text">
          ${isAr ? '📐 حاسبة ودليل المقاسات الذكي' : '📐 Smart Size Guide & Calculator'}
        </h2>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
          ${isAr ? 'قيسي محيط إصبعك أو معصمك بالمليمتر لمعرفة المقاس الدقيق فوراً:' : 'Measure your finger or wrist circumference in mm for accurate sizing:'}
        </p>

        <div class="form-group">
          <label class="form-label">${isAr ? 'نوع المقاس:' : 'Item Type:'}</label>
          <select id="calcType" class="form-input">
            <option value="ring">${isAr ? 'خاتم (Ring)' : 'Ring'}</option>
            <option value="bracelet">${isAr ? 'سوار (Bracelet)' : 'Bracelet'}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">${isAr ? 'محيط الأصبع/المعصم (مليمتر mm):' : 'Circumference (mm):'}</label>
          <input type="number" id="calcValue" class="form-input" placeholder="مثال: 52" value="52">
        </div>

        <button class="gold-btn" id="calcBtn" style="width: 100%; justify-content: center; margin-top: 1rem;">
          ${isAr ? 'احسبي المقاس المناسب' : 'Calculate Size'}
        </button>

        <div id="calcResult" style="margin-top: 1.5rem; text-align: center; padding: 1rem; background: var(--bg-primary); border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: none;">
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');
    document.getElementById('modalCloseBtn').onclick = () => modalOverlay.classList.remove('active');

    document.getElementById('calcBtn').onclick = () => {
      const type = document.getElementById('calcType').value;
      const mm = parseFloat(document.getElementById('calcValue').value);
      const resEl = document.getElementById('calcResult');
      resEl.style.display = 'block';

      if (isNaN(mm) || mm < 40 || mm > 250) {
        resEl.innerHTML = `<span style="color: var(--danger-color);">${isAr ? 'يرجى إدخال قيمة صحيحة بالمليمتر' : 'Please enter a valid measurement in mm'}</span>`;
        return;
      }

      if (type === 'ring') {
        let size = '6 US';
        if (mm < 50) size = '5 US (محيط 49-50mm)';
        else if (mm < 54) size = '6 US (محيط 51-53mm)';
        else if (mm < 57) size = '7 US (محيط 54-56mm)';
        else if (mm < 60) size = '8 US (محيط 57-59mm)';
        else size = '9 US فما فوق';

        resEl.innerHTML = `<h3 style="color: var(--text-gold);">${isAr ? 'مقاس الخاتم المقترح:' : 'Recommended Ring Size:'}</h3> <span style="font-size: 1.4rem; font-weight: 800;">${size}</span>`;
      } else {
        let bSize = '16 cm (ناعم)';
        if (mm > 180) bSize = '21 cm (رجالي واسع)';
        else if (mm > 160) bSize = '18 cm (قياسي)';

        resEl.innerHTML = `<h3 style="color: var(--text-gold);">${isAr ? 'مقاس السوار المقترح:' : 'Recommended Bracelet Size:'}</h3> <span style="font-size: 1.4rem; font-weight: 800;">${bSize}</span>`;
      }
    };
  }

  // --- Checkout Modal & Order Invoice Engine ---
  function openCheckoutModal() {
    if (state.cart.length === 0) return;
    const isAr = state.lang === 'ar';

    modalContainer.innerHTML = `
      <div class="modal-card" style="padding: 2rem; max-width: 650px;">
        <button class="modal-close" id="modalCloseBtn"><i class="fas fa-times"></i></button>
        <h2 style="font-size: 1.8rem; margin-bottom: 1rem;" class="gold-text">
          ${isAr ? '👑 إتمام طلب الشراء المباشر' : '👑 Complete Your Luxury Order'}
        </h2>

        <form id="checkoutForm">
          <div class="form-group">
            <label class="form-label">${isAr ? 'الاسم بالكامل:' : 'Full Name:'}</label>
            <input type="text" class="form-input" required placeholder="${isAr ? 'مثال: سارة محمد' : 'e.g. Sarah Connor'}">
          </div>

          <div class="form-group">
            <label class="form-label">${isAr ? 'رقم الهاتف / الواتساب:' : 'Phone Number / WhatsApp:'}</label>
            <input type="tel" class="form-input" required placeholder="010xxxxxxxx">
          </div>

          <div class="form-group">
            <label class="form-label">${isAr ? 'عنوان التوصيل بالتفصيل:' : 'Delivery Address:'}</label>
            <textarea class="form-input" rows="2" required placeholder="${isAr ? 'المحافظة، المدينة، اسم الشارع، رقم العمارة' : 'City, Street, Building Number'}"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">${isAr ? 'وسيلة الدفع الم فضلة:' : 'Payment Method:'}</label>
            <select class="form-input" id="paymentMethodSelect">
              <option value="cod">${isAr ? '💵 الدفع نقداً عند الاستلام (COD)' : '💵 Cash on Delivery (COD)'}</option>
              <option value="vodafone">${isAr ? '📱 فودافون كاش / اتصالات كاش' : '📱 Mobile Wallet (Vodafone Cash)'}</option>
              <option value="instapay">${isAr ? '⚡ إنستا باي InstaPay' : '⚡ InstaPay Direct Transfer'}</option>
              <option value="card">${isAr ? '💳 بطاقة ائتمانية (Visa / Mastercard)' : '💳 Credit / Debit Card'}</option>
            </select>
          </div>

          <button type="submit" class="gold-btn" style="width: 100%; justify-content: center; margin-top: 1.5rem; font-size: 1.1rem;">
            <i class="fas fa-check-circle"></i> ${isAr ? 'تأكيد وإصدار الفاتورة الملكية' : 'Confirm Order & Issue Invoice'}
          </button>
        </form>
      </div>
    `;

    modalOverlay.classList.add('active');
    document.getElementById('modalCloseBtn').onclick = () => modalOverlay.classList.remove('active');

    document.getElementById('checkoutForm').onsubmit = (e) => {
      e.preventDefault();
      const orderNum = 'LUM-' + Math.floor(100000 + Math.random() * 900000);
      
      // Render Invoice Confirmation Modal
      modalContainer.innerHTML = `
        <div class="modal-card" style="padding: 2.5rem; text-align: center; max-width: 550px;">
          <i class="fas fa-crown" style="font-size: 3.5rem; color: var(--gold-primary); margin-bottom: 1rem;"></i>
          <h2 class="gold-text" style="font-size: 2rem; margin-bottom: 0.5rem;">
            ${isAr ? 'تم تأكيد طلبك الملكي بنجاح!' : 'Order Confirmed Successfully!'}
          </h2>
          <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
            ${isAr ? `رقم الطلب الخاص بك: <strong>${orderNum}</strong>` : `Your Order Number: <strong>${orderNum}</strong>`}
          </p>

          <div style="background: var(--bg-primary); border: 1px solid var(--glass-border); padding: 1.2rem; border-radius: var(--radius-md); text-align: right; margin-bottom: 1.5rem;">
            <p style="margin-bottom: 0.4rem;"><strong>${isAr ? 'حالة الشحن:' : 'Status:'}</strong> <span style="color: var(--success-color);">${isAr ? 'جاري التجهيز والتغليف المخملي' : 'Preparing Velvet Box'}</span></p>
            <p style="margin-bottom: 0.4rem;"><strong>${isAr ? 'الوقت المتوقع للوصول:' : 'Estimated Delivery:'}</strong> ${isAr ? 'خلال 24-48 ساعة' : 'Within 24-48 Hours'}</p>
            <p><strong>${isAr ? 'كارت الإهداء:' : 'Gift Note:'}</strong> ${isAr ? 'مرفق مجاناً داخل الشحنة' : 'Included in Package'}</p>
          </div>

          <button class="gold-btn" id="finishOrderBtn" style="width: 100%; justify-content: center;">
            ${isAr ? 'العودة للتسوق' : 'Back to Shopping'}
          </button>
        </div>
      `;

      state.cart = [];
      saveCart();
      updateCartUI();

      document.getElementById('finishOrderBtn').onclick = () => {
        modalOverlay.classList.remove('active');
        closeCart();
      };
    };
  }

  // --- Toast Manager ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-gem" style="color: var(--gold-primary);"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // --- Event Listeners Binding ---
  function bindEvents() {
    langSelect?.addEventListener('change', (e) => applyLang(e.target.value));
    currSelect?.addEventListener('change', (e) => applyCurrency(e.target.value));
    paletteSelect?.addEventListener('change', (e) => applyPalette(e.target.value));
    themeToggle?.addEventListener('click', () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'));

    const heroVideo = document.getElementById('heroVideo');
    const videoSoundBtn = document.getElementById('videoSoundBtn');
    videoSoundBtn?.addEventListener('click', () => {
      if (heroVideo) {
        heroVideo.muted = !heroVideo.muted;
        videoSoundBtn.innerHTML = heroVideo.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
      }
    });

    categoryPills?.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (btn) {
        state.category = btn.getAttribute('data-cat');
        renderCategoryPills();
        renderProducts();
      }
    });

    genderFilter?.addEventListener('change', (e) => {
      state.gender = e.target.value;
      renderProducts();
    });

    materialFilter?.addEventListener('change', (e) => {
      state.material = e.target.value;
      renderProducts();
    });

    sortSelect?.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProducts();
    });

    searchInput?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderProducts();
    });

    cartBtn?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    drawerOverlay?.addEventListener('click', closeCart);

    document.getElementById('checkoutBtn')?.addEventListener('click', openCheckoutModal);
    document.getElementById('sizeGuideBtn')?.addEventListener('click', openSizeGuideModal);

    productGrid?.addEventListener('click', (e) => {
      const quickBtn = e.target.closest('.quick-view-btn');
      const addCartBtn = e.target.closest('.add-cart-btn');
      const wishBtn = e.target.closest('.toggle-wish-btn');

      if (quickBtn) {
        openQuickView(quickBtn.getAttribute('data-id'));
      } else if (addCartBtn) {
        addToCart(addCartBtn.getAttribute('data-id'));
      } else if (wishBtn) {
        const id = wishBtn.getAttribute('data-id');
        const index = state.wishlist.indexOf(id);
        if (index > -1) {
          state.wishlist.splice(index, 1);
          showToast(state.lang === 'ar' ? 'تمت الإزالة من قائمة الرغبات' : 'Removed from wishlist');
        } else {
          state.wishlist.push(id);
          showToast(state.lang === 'ar' ? 'تمت الإضافة لقائمة الرغبات ❤️' : 'Added to wishlist ❤️');
        }
        localStorage.setItem('lumiere_wishlist', JSON.stringify(state.wishlist));
        renderProducts();
      }
    });
  }
});
