'use strict';

/* ============================================================
   AYRA B. PREMIUM LADIES SUITS — app.js v3
   Single-file application — eliminates all load-order bugs
   ============================================================ */

/* --- SECTION 1: DEFAULT DATA ------------------------------- */

var STORAGE_KEY = 'ayraB_storeData_v1';

function getDefaultData() {
  return {
    adminPw : 'ayra123',
    waPhone : '923317448054',
    waMsg   : "Hello! I'd like to place an order from Ayra B. Please share details.",
    socLinks: { insta: '', fb: '', tiktok: '', snap: '' },
    offerTxt: '',
    offerClr: '#18120E',
    categories: [],
    slides: [],
    products: [],
    allRevs: {},
    catImgs: {}
  };
}

/* --- SECTION 2: STORAGE ------------------------------------ */

function safeLS() {
  try { var t='__t__'; localStorage.setItem(t,'1'); localStorage.removeItem(t); return localStorage; }
  catch(e) { console.error('[AyraB] localStorage unavailable:', e); return null; }
}
var LS = safeLS();

function loadCart() {
  if (!LS) return [];
  try {
    var raw = LS.getItem('ayraB_cart_v1');
    var items = raw ? JSON.parse(raw) : [];
    // Normalize: ensure every item has a strict cartKey
    for (var i = 0; i < items.length; i++) {
      if (!items[i].cartKey) {
        items[i].cartKey = items[i].variant
          ? (items[i].id + '::' + items[i].variant)
          : items[i].id;
      }
    }
    return items;
  } catch(e) { console.error('[AyraB] Failed to load cart:', e); return []; }
}

function persistCart() {
  if (!LS) return;
  try {
    LS.setItem('ayraB_cart_v1', JSON.stringify(cart));
  } catch(e) { console.error('[AyraB] Failed to persist cart:', e); }
}

/* --- SECTION 3: GLOBAL STATE ------------------------------- */

var DATA        = getDefaultData();
var adminPw     = DATA.adminPw;
var waPhone     = DATA.waPhone;
var waMsg       = DATA.waMsg;
var socLinks    = DATA.socLinks;
var categories  = DATA.categories;
var slides      = DATA.slides;
var products    = DATA.products;
var allRevs     = DATA.allRevs;
var catImgs     = DATA.catImgs;
var cart        = loadCart();
var currentSlide= 0;
var slTimer     = null;
var editingProdId   = null;
var editingSlideIdx = null;
var tempImgs    = [];
var currentDetailId = null;
var deliveryCharge  = 200;
var promoDiscount   = 0;   // Rs. discount applied
var promoCode       = '';  // active promo code
// Valid promo codes: code -> percent off
var PROMOS = { 'AYRA10': 10, 'AYRA20': 20, 'WELCOME15': 15 };

/* --- SECTION 4: UI HELPERS --------------------------------- */

function notify(msg, type) {
  var n = document.getElementById('notif');
  if (!n) return;
  n.textContent = msg;
  n.className = 'show ' + (type || 'info');
  clearTimeout(n._t);
  n._t = setTimeout(function() { n.className = ''; }, 3800);
}

function starStr(r) {
  var s = '';
  for (var i = 0; i < 5; i++) s += i < Math.floor(r) ? '\u2605' : '\u2606';
  return s;
}

function priceNum(p) { return parseInt((p || '').replace(/[^0-9]/g, ''), 10) || 0; }

function showPage(id) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
  var t = document.getElementById(id);
  if (t) t.classList.add('active');
  window.scrollTo(0, 0);
}

function goHome()    { showPage('pgMain'); }
function goContact() { showPage('pgContact'); }

function sTo(id) {
  showPage('pgMain');
  setTimeout(function() {
    var el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  }, 60);
}

/* --- SECTION 5: MOBILE NAV --------------------------------- */

function openMobNav() {
  document.getElementById('mobOverlay').classList.add('open');
  document.getElementById('mobDrawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobNav() {
  document.getElementById('mobOverlay').classList.remove('open');
  document.getElementById('mobDrawer').classList.remove('open');
  document.body.style.overflow = '';
}

/* --- SECTION 6: CART --------------------------------------- */

function goCart() { showPage('pgCart'); updCartUI(); window.scrollTo(0,0); }

/* Legacy stubs — drawer removed */
function openCart()  { goCart(); }
function closeCart() { goHome(); }

function addToCart(id, variantLabel) {
  var p = null;
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) { p = products[i]; break; }
  }
  if (!p) return;
  variantLabel = variantLabel || '';
  var cartKey = variantLabel ? id + '::' + variantLabel : id;
  var ex = null;
  for (var j = 0; j < cart.length; j++) {
    if (cart[j].cartKey === cartKey) { ex = cart[j]; break; }
  }
  if (ex) { ex.qty++; } else {
    cart.push({ id: p.id, cartKey: cartKey, variant: variantLabel, name: p.name, price: p.price, img: (p.imgs && p.imgs.length > 0) ? p.imgs[0] : '', cat: p.cat, qty: 1 });
  }
  persistCart();
  updCartBadge();
  notify(p.name + (variantLabel ? ' (' + variantLabel + ')' : '') + ' added to cart!', 'ok');
}

function removeFromCart(cartKey) {
  var nc = [];
  for (var i = 0; i < cart.length; i++) { if (cart[i].cartKey !== cartKey) nc.push(cart[i]); }
  cart = nc;
  persistCart();
  updCartUI();
}

function changeQty(cartKey, delta) {
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].cartKey === cartKey) {
      cart[i].qty = Math.max(1, (cart[i].qty || 1) + delta);
      break;
    }
  }
  persistCart();
  updCartUI();
}

function updCartBadge() {
  var count = 0;
  for (var i = 0; i < cart.length; i++) count += cart[i].qty;
  var b = document.getElementById('cartBadge1');
  if (b) { b.textContent = count; b.style.display = count > 0 ? 'inline-flex' : 'none'; }
}

function updCartUI() {
  updCartBadge();
  var body   = document.getElementById('cartPgBody');
  var empty  = document.getElementById('cartEmptyState');
  var grid   = document.querySelector('.cart-pg-grid');
  var pgCount = document.getElementById('cartPgCount');
  if (!body) return;

  var totalItems = cart.reduce(function(s,c){ return s + c.qty; }, 0);
  if (pgCount) pgCount.textContent = totalItems + ' item' + (totalItems !== 1 ? 's' : '');

  if (cart.length === 0) {
    body.innerHTML = '';
    if (empty) empty.style.display = 'block';
    if (grid)  grid.style.display  = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (grid)  grid.style.display  = 'grid';

  body.innerHTML = cart.map(function(c) {
    var itemTotal = priceNum(c.price) * c.qty;
    var ck = c.cartKey.replace(/'/g, "\\'");
    var variantLine = c.variant ? '<div style="font-size:12px;color:var(--acc);margin-top:2px">' + c.variant + '</div>' : '';
    return '<div class="cp-item">' +
      '<img class="cp-item-img" src="' + (c.img || 'https://placehold.co/90x110/F5ECD9/B8935A?text=Suit') + '" alt="' + c.name + '" onerror="this.src=\'https://placehold.co/90x110/F5ECD9/B8935A?text=Suit\'">' +
      '<div class="cp-item-info">' +
        '<div class="cp-item-name">' + c.name + '</div>' +
        variantLine +
        '<div class="cp-item-cat">' + c.cat + ' Collection</div>' +
        '<div class="cp-item-price">Rs. ' + itemTotal.toLocaleString() + (c.qty > 1 ? ' <span style="font-size:12px;color:var(--mut);font-weight:500">(Rs. ' + priceNum(c.price).toLocaleString() + ' each)</span>' : '') + '</div>' +
      '</div>' +
      '<div class="cp-item-right">' +
        '<div class="qty-ctrl">' +
          '<button class="qty-btn" onclick="changeQty(\'' + ck + '\',-1)">−</button>' +
          '<div class="qty-num">' + c.qty + '</div>' +
          '<button class="qty-btn" onclick="changeQty(\'' + ck + '\',1)">+</button>' +
        '</div>' +
        '<button class="cp-remove" onclick="removeFromCart(\'' + ck + '\')">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>' +
          ' Remove' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  // Recalculate totals
  var subtotal = cart.reduce(function(s,c){ return s + priceNum(c.price)*c.qty; }, 0);
  var discount = Math.round(subtotal * promoDiscount / 100);
  var total    = subtotal - discount + deliveryCharge;

  var elSub = document.getElementById('cpSubtotal');
  var elDel = document.getElementById('cpDelivery');
  var elTot = document.getElementById('cpTotal');
  var elDr  = document.getElementById('cpDiscountRow');
  var elDis = document.getElementById('cpDiscount');

  if (elSub) elSub.textContent = 'Rs. ' + subtotal.toLocaleString();
  if (elDel) elDel.textContent = 'Rs. ' + deliveryCharge.toLocaleString();
  if (elTot) elTot.textContent = 'Rs. ' + total.toLocaleString();
  if (elDr)  elDr.style.display = discount > 0 ? 'flex' : 'none';
  if (elDis) elDis.textContent = '− Rs. ' + discount.toLocaleString();
}

function checkoutWA() {
  if (cart.length === 0) { notify('Your cart is empty!', 'err'); return; }
  var subtotal = cart.reduce(function(s,c){ return s + priceNum(c.price)*c.qty; }, 0);
  var discount = Math.round(subtotal * promoDiscount / 100);
  var total    = subtotal - discount + deliveryCharge;
  var notes    = (document.getElementById('orderNotes') || {}).value || '';

  var msg = '*New Order \u2014 Ayra B. Ladies Suits*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n*Order Details:*\n\n';
  cart.forEach(function(c, i) {
    var it = priceNum(c.price) * c.qty;
    msg += (i+1) + '. *' + c.name + '*\n   Category: ' + c.cat + ' Collection\n   Price: ' + c.price;
    if (c.variant) msg += '\n   Variant: ' + c.variant;
    if (c.qty > 1) msg += ' \u00D7 ' + c.qty + ' = Rs. ' + it.toLocaleString();
    msg += '\n\n';
  });
  msg += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
  msg += '*Subtotal: Rs. ' + subtotal.toLocaleString() + '*\n';
  if (discount > 0) msg += '*Discount (' + promoCode + ' - ' + promoDiscount + '% off): - Rs. ' + discount.toLocaleString() + '*\n';
  msg += '*Delivery Charges: Rs. ' + deliveryCharge.toLocaleString() + '*\n';
  msg += '*Total Payable: Rs. ' + total.toLocaleString() + '*\n';
  msg += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
  if (notes) msg += '\n*Order Notes:* ' + notes + '\n';
  msg += '\nPlease confirm and share delivery details.\n\nThank you for shopping at *Ayra B.*!';
  window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg), '_blank');
  cart = []; persistCart(); updCartUI();
}

function applyPromo() {
  var code = ((document.getElementById('promoInput') || {}).value || '').trim().toUpperCase();
  var msgEl = document.getElementById('promoMsg');
  if (!code) { if(msgEl){msgEl.textContent='Please enter a promo code.';msgEl.className='promo-msg err';} return; }
  if (PROMOS[code] !== undefined) {
    promoDiscount = PROMOS[code];
    promoCode = code;
    if(msgEl){msgEl.textContent='\u2713 ' + promoDiscount + '% discount applied!';msgEl.className='promo-msg ok';}
    updCartUI();
    notify(promoDiscount + '% discount applied!', 'ok');
  } else {
    promoDiscount = 0; promoCode = '';
    if(msgEl){msgEl.textContent='Invalid promo code. Try AYRA10 or AYRA20.';msgEl.className='promo-msg err';}
  }
}

function openWA(txt) {
  var msg = txt ? '*Inquiry \u2014 Ayra B.*\n\n*Topic:* ' + txt + '\n\nPlease share details.' : waMsg;
  window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg), '_blank');
}

function goSoc(p) {
  var url = socLinks[p];
  if (url) { window.open(url, '_blank'); }
  else { notify('Add ' + p + ' link in the Admin Panel.', 'info'); }
}

/* --- SECTION 7: SLIDER ------------------------------------- */

var WA_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';
var CART_SVG14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
var CART_SVG18 = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

function buildSlider() {
  var track = document.getElementById('slTrack');
  var dots  = document.getElementById('slDots');
  if (!track || !dots) return;
  track.innerHTML = ''; dots.innerHTML = '';

  slides.forEach(function(sl, i) {
    var div = document.createElement('div');
    div.className = 'sl-slide';
    div.innerHTML =
      '<img src="' + sl.img + '" alt="' + sl.title + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" onerror="this.style.opacity=0;this.parentElement.style.background=\'linear-gradient(135deg,#2D1B35,#5C2D5C)\'">' +
      '<div class="sl-grad"></div>' +
      '<div class="sl-content">' +
        '<span class="sl-tag">' + sl.tag + '</span>' +
        '<h1>' + sl.title + '</h1>' +
        '<p>' + sl.desc + '</p>' +
        '<div class="sl-btns">' +
          '<button class="sl-btn-primary" onclick="filterCat(\'' + sl.catKey + '\')">' + sl.btn + '</button>' +
          '<button class="sl-btn-ghost" onclick="openWA(\'\')">' + WA_SVG + ' WhatsApp Order</button>' +
        '</div>' +
      '</div>';
    track.appendChild(div);

    var d = document.createElement('button');
    d.className = 'sl-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', (function(idx) { return function() { goSlide(idx); }; })(i));
    dots.appendChild(d);
  });

  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function chSlide(dir) {
  currentSlide = (currentSlide + dir + slides.length) % slides.length;
  updSlide();
  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function goSlide(i) {
  currentSlide = i;
  updSlide();
  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function updSlide() {
  var track = document.getElementById('slTrack');
  if (track) track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
  var dots = document.querySelectorAll('.sl-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].className = 'sl-dot' + (i === currentSlide ? ' active' : '');
  }
}

/* --- SECTION 8: PRODUCTS ----------------------------------- */

function catKeyFor(name) {
  if (name === 'All Suits') return 'All';
  return name;
}

function renderProds(filter) {
  filter = filter || 'All';
  var g = document.getElementById('prodGrid');
  if (!g) return;
  g.innerHTML = '';
  var list = products.filter(function(p) { return filter === 'All' || p.cat === filter; });

  if (list.length === 0) {
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--mut);font-size:15px;">No products found in this category.</div>';
    return;
  }

  list.forEach(function(p) {
    var d = document.createElement('div');
    d.className = 'pcard';
    var imgSrc = (p.imgs && p.imgs.length > 0) ? p.imgs[0] : 'https://placehold.co/400x340/F5ECD9/B8935A?text=Suit';
    var isOutOfStock = (p.stock !== undefined && p.stock <= 0 && (!p.variants || p.variants.length === 0));
    d.innerHTML =
      '<div class="pcard-img">' +
        '<img src="' + imgSrc + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x340/F5ECD9/B8935A?text=Suit\'">' +
        '<span class="pcard-badge ' + (p.badge === 'sale' ? 'badge-sale' : 'badge-new') + '">' + (p.badge === 'sale' ? 'Sale' : 'New') + '</span>' +
        (isOutOfStock ? '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 20px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:1px">SOLD OUT</span>' : '') +
      '</div>' +
      '<div class="pcard-body">' +
        '<div class="pcard-name">' + p.name + '</div>' +
        '<div class="pcard-cat">' + p.cat + ' Collection</div>' +
        '<div class="pcard-stars"><span class="stars">' + starStr(p.rating) + '</span><span class="scount">' + p.rating + ' (' + p.reviews + ' reviews)</span></div>' +
        '<div class="pcard-prices"><span class="price-cur">' + p.price + '</span>' + (p.old ? '<span class="price-old">' + p.old + '</span>' : '') + '</div>' +
        '<div class="pcard-actions">' +
          (isOutOfStock
            ? '<button class="btn-add-cart" disabled style="opacity:0.5;cursor:not-allowed">Sold Out</button>'
            : '<button class="btn-add-cart" onclick="event.stopPropagation();addToCart(\'' + p.id + '\')">' + CART_SVG14 + ' Add to Cart</button>') +
          '<button class="btn-wish" aria-label="Wishlist">&#9825;</button>' +
        '</div>' +
      '</div>';
    d.addEventListener('click', (function(id) { return function() { openDetail(id); }; })(p.id));
    g.appendChild(d);
  });
}

function renderCats() {
  var g = document.getElementById('catGrid');
  if (!g) return;
  g.innerHTML = '';
  categories.forEach(function(c) {
    var key = catKeyFor(c.name);
    var img = catImgs[c.name] || 'https://placehold.co/300x280/F5ECD9/B8935A?text=Category';
    var d = document.createElement('div');
    d.className = 'cat-tile';
    d.innerHTML =
      '<img src="' + img + '" alt="' + c.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x280/F5ECD9/B8935A?text=Category\'">' +
      '<div class="cat-overlay"></div>' +
      '<div class="cat-info"><h3>' + c.name + '</h3><span>' + c.count + ' items</span></div>' +
      '<button class="cat-shop-btn" onclick="event.stopPropagation();filterCat(\'' + key + '\')">Shop Now</button>';
    d.addEventListener('click', (function(k) { return function() { filterCat(k); }; })(key));
    g.appendChild(d);
  });
}

function filterCat(key) {
  renderProds(key);
  showPage('pgMain');
  setTimeout(function() {
    var el = document.getElementById('prods');
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  }, 80);
}

function applyPromo() {
  var code = ((document.getElementById('promoInput') || {}).value || '').trim().toUpperCase();
  var msgEl = document.getElementById('promoMsg');
  if (!code) { if(msgEl){msgEl.textContent='Please enter a promo code.';msgEl.className='promo-msg err';} return; }
  if (PROMOS[code] !== undefined) {
    promoDiscount = PROMOS[code];
    promoCode = code;
    if(msgEl){msgEl.textContent='\u2713 ' + promoDiscount + '% discount applied!';msgEl.className='promo-msg ok';}
    updCartUI();
    notify(promoDiscount + '% discount applied!', 'ok');
  } else {
    promoDiscount = 0; promoCode = '';
    if(msgEl){msgEl.textContent='Invalid promo code. Try AYRA10 or AYRA20.';msgEl.className='promo-msg err';}
  }
}

function openWA(txt) {
  var msg = txt ? '*Inquiry \u2014 Ayra B.*\n\n*Topic:* ' + txt + '\n\nPlease share details.' : waMsg;
  window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg), '_blank');
}

function goSoc(p) {
  var url = socLinks[p];
  if (url) { window.open(url, '_blank'); }
  else { notify('Add ' + p + ' link in the Admin Panel.', 'info'); }
}

/* --- SECTION 7: SLIDER ------------------------------------- */

var WA_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>';
var CART_SVG14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
var CART_SVG18 = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';

function buildSlider() {
  var track = document.getElementById('slTrack');
  var dots  = document.getElementById('slDots');
  if (!track || !dots) return;
  track.innerHTML = ''; dots.innerHTML = '';

  slides.forEach(function(sl, i) {
    var div = document.createElement('div');
    div.className = 'sl-slide';
    div.innerHTML =
      '<img src="' + sl.img + '" alt="' + sl.title + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" onerror="this.style.opacity=0;this.parentElement.style.background=\'linear-gradient(135deg,#2D1B35,#5C2D5C)\'">' +
      '<div class="sl-grad"></div>' +
      '<div class="sl-content">' +
        '<span class="sl-tag">' + sl.tag + '</span>' +
        '<h1>' + sl.title + '</h1>' +
        '<p>' + sl.desc + '</p>' +
        '<div class="sl-btns">' +
          '<button class="sl-btn-primary" onclick="filterCat(\'' + sl.catKey + '\')">' + sl.btn + '</button>' +
          '<button class="sl-btn-ghost" onclick="openWA(\'\')">' + WA_SVG + ' WhatsApp Order</button>' +
        '</div>' +
      '</div>';
    track.appendChild(div);

    var d = document.createElement('button');
    d.className = 'sl-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    d.addEventListener('click', (function(idx) { return function() { goSlide(idx); }; })(i));
    dots.appendChild(d);
  });

  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function chSlide(dir) {
  currentSlide = (currentSlide + dir + slides.length) % slides.length;
  updSlide();
  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function goSlide(i) {
  currentSlide = i;
  updSlide();
  clearInterval(slTimer);
  slTimer = setInterval(function() { chSlide(1); }, 5000);
}

function updSlide() {
  var track = document.getElementById('slTrack');
  if (track) track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
  var dots = document.querySelectorAll('.sl-dot');
  for (var i = 0; i < dots.length; i++) {
    dots[i].className = 'sl-dot' + (i === currentSlide ? ' active' : '');
  }
}

/* --- SECTION 8: PRODUCTS ----------------------------------- */

function catKeyFor(name) {
  if (name === 'All Suits') return 'All';
  return name;
}

function renderProds(filter) {
  filter = filter || 'All';
  var g = document.getElementById('prodGrid');
  if (!g) return;
  g.innerHTML = '';
  var list = products.filter(function(p) { return filter === 'All' || p.cat === filter; });

  if (list.length === 0) {
    g.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--mut);font-size:15px;">No products found in this category.</div>';
    return;
  }

  list.forEach(function(p) {
    var d = document.createElement('div');
    d.className = 'pcard';
    var imgSrc = (p.imgs && p.imgs.length > 0) ? p.imgs[0] : 'https://placehold.co/400x340/F5ECD9/B8935A?text=Suit';
    var isOutOfStock = (p.stock !== undefined && p.stock <= 0 && (!p.variants || p.variants.length === 0));
    d.innerHTML =
      '<div class="pcard-img">' +
        '<img src="' + imgSrc + '" alt="' + p.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/400x340/F5ECD9/B8935A?text=Suit\'">' +
        '<span class="pcard-badge ' + (p.badge === 'sale' ? 'badge-sale' : 'badge-new') + '">' + (p.badge === 'sale' ? 'Sale' : 'New') + '</span>' +
        (isOutOfStock ? '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);color:#fff;padding:8px 20px;border-radius:4px;font-weight:700;font-size:14px;letter-spacing:1px">SOLD OUT</span>' : '') +
      '</div>' +
      '<div class="pcard-body">' +
        '<div class="pcard-name">' + p.name + '</div>' +
        '<div class="pcard-cat">' + p.cat + ' Collection</div>' +
        '<div class="pcard-stars"><span class="stars">' + starStr(p.rating) + '</span><span class="scount">' + p.rating + ' (' + p.reviews + ' reviews)</span></div>' +
        '<div class="pcard-prices"><span class="price-cur">' + p.price + '</span>' + (p.old ? '<span class="price-old">' + p.old + '</span>' : '') + '</div>' +
        '<div class="pcard-actions">' +
          (isOutOfStock
            ? '<button class="btn-add-cart" disabled style="opacity:0.5;cursor:not-allowed">Sold Out</button>'
            : '<button class="btn-add-cart" onclick="event.stopPropagation();addToCart(\'' + p.id + '\')">' + CART_SVG14 + ' Add to Cart</button>') +
          '<button class="btn-wish" aria-label="Wishlist">&#9825;</button>' +
        '</div>' +
      '</div>';
    d.addEventListener('click', (function(id) { return function() { openDetail(id); }; })(p.id));
    g.appendChild(d);
  });
}

function renderCats() {
  var g = document.getElementById('catGrid');
  if (!g) return;
  g.innerHTML = '';
  categories.forEach(function(c) {
    var key = catKeyFor(c.name);
    var img = catImgs[c.name] || 'https://placehold.co/300x280/F5ECD9/B8935A?text=Category';
    var d = document.createElement('div');
    d.className = 'cat-tile';
    d.innerHTML =
      '<img src="' + img + '" alt="' + c.name + '" loading="lazy" onerror="this.src=\'https://placehold.co/300x280/F5ECD9/B8935A?text=Category\'">' +
      '<div class="cat-overlay"></div>' +
      '<div class="cat-info"><h3>' + c.name + '</h3><span>' + c.count + ' items</span></div>' +
      '<button class="cat-shop-btn" onclick="event.stopPropagation();filterCat(\'' + key + '\')">Shop Now</button>';
    d.addEventListener('click', (function(k) { return function() { filterCat(k); }; })(key));
    g.appendChild(d);
  });
}

function filterCat(key) {
  renderProds(key);
  showPage('pgMain');
  setTimeout(function() {
    var el = document.getElementById('prods');
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  }, 80);
}

/* --- SECTION 9: PRODUCT DETAIL ----------------------------- */

function openDetail(id) {
  var p = null;
  for (var i = 0; i < products.length; i++) { if (products[i].id === id) { p = products[i]; break; } }
  if (!p) return;

  document.getElementById('detBread').innerHTML = p.name;
  document.getElementById('detName').innerHTML  = p.name;
  document.getElementById('detCat').innerHTML   = p.cat + ' Collection';

  var badge = document.getElementById('detBadge');
  badge.textContent = p.badge === 'new' ? 'New Arrival' : 'On Sale';
  badge.style.cssText = 'background:' + (p.badge === 'new' ? '#F5ECD9' : '#FEE2E2') + ';color:' + (p.badge === 'new' ? '#7A5C2E' : '#B91C1C');

  document.getElementById('detStars').textContent = starStr(p.rating);
  document.getElementById('detRc').textContent    = '(' + p.reviews + ' reviews)';
  document.getElementById('detPrice').innerHTML = p.price;
  document.getElementById('detOld').innerHTML   = p.old || '';
  document.getElementById('detDesc').innerHTML  = p.desc;

  var featsHtml = '';
  if (p.features && Array.isArray(p.features)) {
    p.features.forEach(function(f) { featsHtml += '<div class="det-feat"><div class="feat-dot"></div>' + f + '</div>'; });
  }
  document.getElementById('detFeats').innerHTML = featsHtml;

  var metaHtml = '';
  if (p.meta) {
    for (var k in p.meta) { if (p.meta.hasOwnProperty(k)) metaHtml += '<div class="dm"><span>' + k + '</span><strong>' + p.meta[k] + '</strong></div>'; }
  }
  document.getElementById('detMeta').innerHTML = metaHtml;

  var mi = document.getElementById('detMainImg');
  mi.src = p.imgs[0]; mi.style.opacity = '1';

  var thumbHtml = '';
  p.imgs.forEach(function(img, i) {
    thumbHtml += '<img class="thumb' + (i === 0 ? ' on' : '') + '" src="' + img + '" loading="lazy" alt="View ' + (i+1) + '" onerror="this.style.display=\'none\'">';
  });
  document.getElementById('thumbRow').innerHTML = thumbHtml;

  // Attach thumb click handlers
  var thumbs = document.querySelectorAll('.thumb');
  thumbs.forEach(function(th) {
    th.addEventListener('click', function() { selThumb(th, th.src); });
  });

  // --- Variant UI ---
  var varWrap = document.getElementById('detVariantsWrap');
  var varSel = document.getElementById('detVariantSel');
  if (p.variants && p.variants.length > 0) {
    varWrap.style.display = 'block';
    varSel.innerHTML = p.variants.map(function(v, i) {
      var label = '';
      if (v.size) label += 'Size: ' + v.size;
      if (v.color) label += (label ? ' / ' : '') + 'Color: ' + v.color;
      if (v.price) label += ' — ' + v.price;
      label += ' (Stock: ' + (v.stock || 0) + ')';
      return '<option value="' + i + '"' + (v.stock <= 0 ? ' disabled' : '') + '>' + label + '</option>';
    }).join('');
  } else {
    varWrap.style.display = 'none';
  }

  // --- Stock / Cart Button ---
  var detCartBtn = document.getElementById('detCartBtn');
  var isOOS = (p.stock !== undefined && p.stock <= 0 && (!p.variants || p.variants.length === 0));
  if (isOOS) {
    detCartBtn.disabled = true;
    detCartBtn.innerHTML = 'Sold Out';
    detCartBtn.style.opacity = '0.5';
    detCartBtn.style.cursor = 'not-allowed';
  } else {
    detCartBtn.disabled = false;
    detCartBtn.innerHTML = CART_SVG14 + ' Add to Cart';
    detCartBtn.style.opacity = '1';
    detCartBtn.style.cursor = 'pointer';
  }

  detCartBtn.onclick = function() {
    if (isOOS) return;
    var variantLabel = '';
    if (p.variants && p.variants.length > 0 && varSel) {
      var vi = parseInt(varSel.value, 10);
      var sv = p.variants[vi];
      if (sv && sv.stock <= 0) { notify('This variant is out of stock.', 'err'); return; }
      if (sv) {
        var parts = [];
        if (sv.size) parts.push(sv.size);
        if (sv.color) parts.push(sv.color);
        variantLabel = parts.join(' / ');
      }
    }
    addToCart(id, variantLabel);
  };
  document.getElementById('detWaBtn').onclick = function() {
    var variantInfo = '';
    if (p.variants && p.variants.length > 0 && varSel) {
      var vi = parseInt(varSel.value, 10);
      var sv = p.variants[vi];
      if (sv) {
        var parts = [];
        if (sv.size) parts.push('Size: ' + sv.size);
        if (sv.color) parts.push('Color: ' + sv.color);
        variantInfo = '\n*Variant:* ' + parts.join(', ');
      }
    }
    var msg = '*Order Inquiry \u2014 Ayra B.*\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n*Product:* ' + p.name + '\n*Category:* ' + p.cat + ' Collection\n*Price:* ' + p.price + (p.old ? ' (Was: ' + p.old + ')' : '') + variantInfo + '\n\nPlease confirm availability and share payment details.\n\nThank you!';
    window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msg), '_blank');
  };

  currentDetailId = id;
  fetchAndRenderReviews(id);

  var rel = products.filter(function(x) { return x.cat === p.cat && x.id !== id; }).slice(0, 4);
  document.getElementById('relGrid').innerHTML = rel.map(function(r) {
    var rImg = (r.imgs && r.imgs.length > 0) ? r.imgs[0] : 'https://placehold.co/400x340/F5ECD9/B8935A?text=Suit';
    return '<div class="pcard" onclick="openDetail(\'' + r.id + '\')">' +
      '<div class="pcard-img" style="height:200px"><img src="' + rImg + '" alt="' + r.name + '" loading="lazy" style="height:200px;object-fit:cover;object-position:top;width:100%">' +
      '<span class="pcard-badge ' + (r.badge === 'sale' ? 'badge-sale' : 'badge-new') + '">' + (r.badge === 'sale' ? 'Sale' : 'New') + '</span></div>' +
      '<div class="pcard-body"><div class="pcard-name" style="font-size:16px">' + r.name + '</div>' +
      '<div class="pcard-stars"><span class="stars">' + starStr(r.rating) + '</span></div>' +
      '<div class="pcard-prices"><span class="price-cur">' + r.price + '</span>' + (r.old ? '<span class="price-old">' + r.old + '</span>' : '') + '</div>' +
      '<div class="pcard-actions"><button class="btn-add-cart" onclick="event.stopPropagation();addToCart(\'' + r.id + '\')">' + CART_SVG14 + ' Add</button></div>' +
      '</div></div>';
  }).join('');

  showPage('pgDetail');
  window.scrollTo(0, 0);
}

function selThumb(el, src) {
  var mi = document.getElementById('detMainImg');
  mi.style.opacity = '.3';
  setTimeout(function() { mi.src = src; mi.style.opacity = '1'; }, 150);
  var thumbs = document.querySelectorAll('.thumb');
  for (var i = 0; i < thumbs.length; i++) thumbs[i].classList.remove('on');
  el.classList.add('on');
}

function updateVariantSelection() {
  if (!currentDetailId) return;
  var p = null;
  for (var i = 0; i < products.length; i++) { if (products[i].id === currentDetailId) { p = products[i]; break; } }
  if (!p || !p.variants || p.variants.length === 0) return;
  var sel = document.getElementById('detVariantSel');
  if (!sel) return;
  var vi = parseInt(sel.value, 10);
  var v = p.variants[vi];
  if (!v) return;
  // Update price if variant has its own price
  if (v.price) {
    document.getElementById('detPrice').textContent = v.price;
  }
  // Update cart button based on variant stock
  var btn = document.getElementById('detCartBtn');
  if (v.stock <= 0) {
    btn.disabled = true;
    btn.innerHTML = 'Sold Out';
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.disabled = false;
    btn.innerHTML = CART_SVG14 + ' Add to Cart';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  }
}

async function fetchAndRenderReviews(productId) {
  var listEl = document.getElementById('revList');
  if (!listEl) return;
  try {
    var res = await fetch('/api/reviews/' + productId).then(r => r.json());
    if (res.success && res.data.length > 0) {
      listEl.innerHTML = res.data.map(function(r) {
        var d = new Date(r.createdAt);
        var dateStr = d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
        return '<div class="rcard"><div class="rtop"><span class="rname">' + r.name + '</span><span class="rdate">' + dateStr + '</span></div><div class="rstars">' + starStr(r.rating) + '</div><div class="rtxt">' + r.text + '</div></div>';
      }).join('');
    } else {
      listEl.innerHTML = '<p style="color:var(--mut);font-size:14px;padding:1rem 0">No reviews yet. Be the first!</p>';
    }
  } catch(e) {
    listEl.innerHTML = '<p style="color:var(--mut);font-size:14px;padding:1rem 0">Could not load reviews.</p>';
  }
}

async function submitReview() {
  if (!currentDetailId) return;
  var name   = (document.getElementById('wrName')  || {}).value || '';
  var rating = (document.getElementById('wrRating') || {}).value || '';
  var text   = (document.getElementById('wrText')   || {}).value || '';

  if (!name.trim())  { notify('Please enter your name.', 'err'); return; }
  if (!text.trim())  { notify('Please write your review.', 'err'); return; }
  
  var btn = document.querySelector('.wr-btn');
  var oldTxt = 'Submit Review';
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    oldTxt = btn.textContent;
    btn.textContent = 'Submitting...';
  }

  try {
    var res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: currentDetailId, name: name.trim(), rating: Number(rating), text: text.trim() })
    }).then(r => r.json());

    if (res.success) {
      notify('Thank you for your review!', 'ok');
      document.getElementById('wrName').value = '';
      document.getElementById('wrText').value = '';
      document.getElementById('wrRating').value = '5';
      await fetchAndRenderReviews(currentDetailId);
      // Refresh product rating
      await fetchLiveStoreData();
      var p = products.find(x => x.id === currentDetailId);
      if (p) {
        document.getElementById('detStars').textContent = starStr(p.rating);
        document.getElementById('detRc').textContent = '(' + p.reviews + ' reviews)';
      }
    } else {
      notify(res.error || 'Failed to submit', 'err');
    }
  } catch(e) {
    notify('Network error. Try again.', 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = oldTxt;
    }
  }
}

/* --- SECTION 10: CONTACT FORM (WhatsApp) ------------------- */

function sendContactWA() {
  var nEl  = document.getElementById('cfName');
  var eEl  = document.getElementById('cfEmail');
  var phEl = document.getElementById('cfPhone');
  var sEl  = document.getElementById('cfSubject');
  var mEl  = document.getElementById('cfMsg');

  var name    = nEl  ? nEl.value.trim()  : '';
  var email   = eEl  ? eEl.value.trim()  : '';
  var phone   = phEl ? phEl.value.trim() : '';
  var subject = sEl  ? sEl.value.trim()  : '';
  var message = mEl  ? mEl.value.trim()  : '';

  // Validate
  if (!name)    { notify('Please enter your name.', 'err');     return; }
  if (!message) { notify('Please enter your message.', 'err'); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    notify('Please enter a valid email address.', 'err'); return;
  }
  if (phone && !/^(\+92|0)3\d{9}$/.test(phone.replace(/\s+/g, ''))) {
    notify('Please enter a valid Pakistani phone number (e.g. 03001234567).', 'err'); return;
  }

  // Build WhatsApp message
  var wa = '*Contact Message \u2014 Ayra B. Ladies Suits*\n';
  wa += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n';
  wa += '*From:* '    + name    + '\n';
  if (email)   wa += '*Email:* '   + email   + '\n';
  if (phone)   wa += '*Phone:* '   + phone   + '\n';
  if (subject) wa += '*Subject:* ' + subject + '\n';
  wa += '\n*Message:*\n' + message + '\n\n';
  wa += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
  wa += 'Sent from Ayra B. website';

  window.open('https://wa.me/' + waPhone + '?text=' + encodeURIComponent(wa), '_blank');

  // Reset form
  if (nEl)  nEl.value  = '';
  if (eEl)  eEl.value  = '';
  if (phEl) phEl.value = '';
  if (sEl)  sEl.value  = '';
  if (mEl)  mEl.value  = '';

  notify('Message opened in WhatsApp! We will reply soon.', 'ok');
}

/* --- SECTION 11: INIT -------------------------------------- */

async function fetchLiveStoreData() {
  try {
    const [pRes, cRes, sRes, setRes] = await Promise.all([
      fetch('/api/products').then(r => r.json()).catch(() => null),
      fetch('/api/categories').then(r => r.json()).catch(() => null),
      fetch('/api/slides').then(r => r.json()).catch(() => null),
      fetch('/api/settings').then(r => r.json()).catch(() => null)
    ]);

    if (pRes && pRes.success) products = pRes.data.map(p => { p.id = p._id || p.id; return p; });
    if (cRes && cRes.success) categories = cRes.data;
    if (sRes && sRes.success) slides = sRes.data;
    if (setRes && setRes.success && setRes.data) {
      var set = setRes.data;
      waPhone = set.waPhone !== undefined ? set.waPhone : waPhone;
      waMsg = set.waMsg !== undefined ? set.waMsg : waMsg;
      socLinks = set.socLinks || socLinks;
      DATA.offerTxt = set.offerTxt !== undefined ? set.offerTxt : DATA.offerTxt;
      DATA.offerClr = set.offerClr !== undefined ? set.offerClr : DATA.offerClr;
      if (set.catImgs) catImgs = set.catImgs;
      if (set.deliveryCharge !== undefined) deliveryCharge = set.deliveryCharge;
      // Website UI toggles (default to true if not set)
      DATA.showOfferBanner = set.showOfferBanner !== undefined ? set.showOfferBanner : true;
      DATA.autoPlaySlide   = set.autoPlaySlide   !== undefined ? set.autoPlaySlide   : true;
      DATA.showWishlist    = set.showWishlist    !== undefined ? set.showWishlist    : true;
      DATA.showStarRatings = set.showStarRatings !== undefined ? set.showStarRatings : true;
      DATA.showSoc         = set.showSoc         !== undefined ? set.showSoc         : true;
    }
  } catch (err) {
    console.warn('Failed to load live data, using fallback.', err);
  }
}

async function init() {
  await fetchLiveStoreData();

  buildSlider();
  renderProds();
  renderCats();
  updCartBadge();

  // Set phone numbers
  var ctaPhone = document.getElementById('ctaPhone');
  if (ctaPhone) ctaPhone.textContent = '+' + waPhone.replace(/^\+/, '');
  var fPhone = document.getElementById('fPhone');
  if (fPhone) fPhone.textContent = '+' + waPhone.replace(/^\+/, '');

  // Offer bar
  var offerEl = document.getElementById('offerTxt');
  var barEl = document.querySelector('.offer-bar');
  if (DATA.showOfferBanner === false) {
    if (barEl) barEl.style.display = 'none';
  } else {
    if (offerEl) offerEl.innerHTML = DATA.offerTxt;
    if (barEl && DATA.offerClr) barEl.style.background = DATA.offerClr;
  }

  // Enforce website UI toggles via CSS injection
  var toggleStyles = '';
  if (DATA.showWishlist === false) toggleStyles += '.btn-wish { display: none !important; } ';
  if (DATA.showStarRatings === false) toggleStyles += '.pcard-stars, .det-rating, .rstars { display: none !important; } ';
  if (DATA.showSoc === false) toggleStyles += '.f-soc { display: none !important; } ';
  if (toggleStyles) {
    var styleEl = document.createElement('style');
    styleEl.id = 'ayra-toggles';
    styleEl.textContent = toggleStyles;
    document.head.appendChild(styleEl);
  }

  // Overlay close handlers
  var mobOv = document.getElementById('mobOverlay');
  if (mobOv) mobOv.addEventListener('click', closeMobNav);
}

document.addEventListener('DOMContentLoaded', function() {
  if (window.__adminDashboard) return;
  init();
});
