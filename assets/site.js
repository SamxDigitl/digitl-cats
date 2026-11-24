/* Digitl Cats sandbox: layout, cart, consent banner and all dataLayer pushes.
   Ecommerce and GA4 recommended events follow the GA4 structure (ecommerce object, reset with ecommerce: null).
   Custom events follow the Digitl standard: event "custom_event", event_name, nested object named like the event,
   reset of the nested object before every push. */
(function () {
  var C = window.DC_CONFIG, CAT = window.DC_CATALOG, SC = window.DC_SCENARIO;
  var dl = window.dataLayer = window.dataLayer || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return '€' + n.toFixed(2).replace('.', ','); };
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var byId = function (id) { return CAT.filter(function (p) { return p.id === id; })[0]; };
  var pageType = document.body.dataset.pageType || 'other';

  // ---------------------------------------------------------------- dataLayer helpers
  function item(p, extra) {
    var it = {
      item_id: p.id, item_name: p.name, item_brand: C.SITE_NAME,
      item_category: p.category, item_category2: p.category2, item_variant: p.variant,
      price: SC === 'price_as_string' ? p.price.toFixed(2).replace('.', ',') : p.price,
      quantity: 1
    };
    for (var k in extra || {}) it[k] = extra[k];
    return it;
  }
  function ecom(eventName, ecommerce) {
    if (SC !== 'no_ecommerce_reset') dl.push({ ecommerce: null });
    if (SC === 'missing_currency' && eventName === 'add_to_cart') delete ecommerce.currency;
    dl.push({ event: eventName, ecommerce: ecommerce });
  }
  function custom(name, params) {
    if (SC !== 'stale_custom_params') { var reset = {}; reset[name] = null; dl.push(reset); }
    var o = { event: 'custom_event', event_name: name }; o[name] = params; dl.push(o);
  }
  window.DC_DL = { ecom: ecom, custom: custom, item: item };

  // ---------------------------------------------------------------- cart
  function getCart() { try { return JSON.parse(localStorage.getItem('dc_cart') || '[]'); } catch (e) { return []; } }
  function setCart(c) { localStorage.setItem('dc_cart', JSON.stringify(c)); renderCount(); }
  function cartItems() { return getCart().map(function (l) { var p = byId(l.id); return p ? { p: p, q: l.q } : null; }).filter(Boolean); }
  function cartValue(lines) { return r2((lines || cartItems()).reduce(function (s, l) { return s + l.p.price * l.q; }, 0)); }
  function addToCart(id, q, listCtx) {
    var c = getCart(), l = c.filter(function (x) { return x.id === id; })[0];
    if (l) l.q += q; else c.push({ id: id, q: q });
    setCart(c);
    var p = byId(id), it = item(p, listCtx || {}); it.quantity = q;
    ecom('add_to_cart', { currency: C.CURRENCY, value: r2(p.price * q), items: [it] });
    toast(p.name + ' added to cart');
  }
  function addToWishlist(id, listCtx) {
    var p = byId(id), w = JSON.parse(localStorage.getItem('dc_wishlist') || '[]');
    if (w.indexOf(id) === -1) { w.push(id); localStorage.setItem('dc_wishlist', JSON.stringify(w)); }
    ecom('add_to_wishlist', { currency: C.CURRENCY, value: p.price, items: [item(p, listCtx || {})] });
    toast(p.name + ' saved to wishlist');
  }
  function renderCount() { var n = getCart().reduce(function (s, l) { return s + l.q; }, 0); $$('.cart-count').forEach(function (e) { e.textContent = n; }); }

  // ---------------------------------------------------------------- layout
  var nav = [['index.html', 'Home'], ['shop.html', 'Shop'], ['about.html', 'About'], ['faq.html', 'FAQ'], ['contact.html', 'Contact'], ['account.html', 'Account']];
  var header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML =
    (SC && window.DC_DEBUG ? '<div class="scenario-bar">Test scenario active: <b>' + SC + '</b> &middot; <a href="?scenario=off">turn off</a></div>' : '') +
    '<div class="wrap header-row"><a class="logo" href="index.html" data-nav="logo">🐱 <span>Digitl Cats</span></a>' +
    '<nav class="main-nav">' + nav.map(function (n) { return '<a href="' + n[0] + '" data-nav="main_menu">' + n[1] + '</a>'; }).join('') + '</nav>' +
    '<form class="search" action="search.html"><input name="q" type="search" placeholder="Search cat things" aria-label="Search"></form>' +
    '<a class="cart-link" href="cart.html" data-nav="header_cart">🛒 <span class="cart-count">0</span></a></div>';
  document.body.insertBefore(header, document.body.firstChild);
  var footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = '<div class="wrap footer-row"><div><b>Digitl Cats</b><br><small>A made-up shop for testing tracking. Nothing here is for sale and no orders are processed.</small></div>' +
    '<form class="newsletter" id="newsletter"><label for="nl">Newsletter</label><div><input id="nl" type="email" placeholder="you@example.com" required><button>Sign up</button></div></form>' +
    '<div><a href="scenarios.html" data-nav="footer">Test scenarios</a><br><a href="#" id="cookie-settings">Cookie settings</a></div></div>';
  document.body.appendChild(footer);
  var t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t);
  function toast(msg) { t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, 1800); }
  renderCount();

  $$('[data-nav]').forEach(function (a) {
    a.addEventListener('click', function () {
      custom('navigation', { navigation_type: a.dataset.nav, click_element: a.textContent.trim() || null });
    });
  });
  $('#newsletter').addEventListener('submit', function (e) {
    e.preventDefault();
    custom('newsletter_signup', { newsletter_location: 'footer', newsletter_type: 'weekly_cat_news' });
    e.target.reset(); toast('Thanks! (No email is stored or sent.)');
  });

  // ---------------------------------------------------------------- consent banner
  function saveConsent(a, m) {
    localStorage.setItem('dc_consent', JSON.stringify({ analytics: a, marketing: m, ts: Date.now() }));
    var g = function (b) { return b ? 'granted' : 'denied'; };
    window.gtag('consent', 'update', { analytics_storage: g(a), ad_storage: g(m), ad_user_data: g(m), ad_personalization: g(m) });
    dl.push({ event: 'consent_update', consent_state: { analytics: a, marketing: m } });
    banner.hidden = true;
  }
  var banner = document.createElement('div');
  banner.className = 'consent'; banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = '<div class="consent-box"><b>Cookies at Digitl Cats</b><p>We use cookies for analytics and marketing. This is a test site: data only goes to Digitl test accounts.</p>' +
    '<label><input type="checkbox" checked disabled> Necessary</label> <label><input type="checkbox" id="c-an"> Analytics</label> <label><input type="checkbox" id="c-mk"> Marketing</label>' +
    '<div class="consent-actions"><button id="c-reject" class="ghost">Reject all</button><button id="c-save" class="ghost">Save choice</button><button id="c-accept">Accept all</button></div></div>';
  document.body.appendChild(banner);
  banner.hidden = !!localStorage.getItem('dc_consent');
  $('#c-accept').onclick = function () { saveConsent(true, true); };
  $('#c-reject').onclick = function () { saveConsent(false, false); };
  $('#c-save').onclick = function () { saveConsent($('#c-an').checked, $('#c-mk').checked); };
  $('#cookie-settings').onclick = function (e) { e.preventDefault(); banner.hidden = false; };

  // ---------------------------------------------------------------- product cards
  function card(p, i, listId, listName) {
    return '<article class="card"><a href="product.html?id=' + p.id + '" class="card-link" data-id="' + p.id + '" data-index="' + i + '" data-list-id="' + listId + '" data-list-name="' + listName + '">' +
      '<div class="thumb" style="background:' + p.color + '">' + p.emoji + '</div><h3>' + p.name + '</h3></a>' +
      '<div class="card-foot"><span class="price">' + money(p.price) + '</span><span><button class="ghost wish" title="Save to wishlist" data-id="' + p.id + '" data-index="' + i + '" data-list-id="' + listId + '" data-list-name="' + listName + '">♡</button> <button class="add" data-id="' + p.id + '" data-index="' + i + '" data-list-id="' + listId + '" data-list-name="' + listName + '">Add</button></span></div></article>';
  }
  function renderList(el, products, listId, listName) {
    el.innerHTML = products.map(function (p, i) { return card(p, i, listId, listName); }).join('');
    ecom('view_item_list', { item_list_id: listId, item_list_name: listName,
      items: products.map(function (p, i) { return item(p, { index: i, item_list_id: listId, item_list_name: listName }); }) });
    $$('.card-link', el).forEach(function (a) {
      a.addEventListener('click', function () {
        var p = byId(a.dataset.id), ctx = { index: +a.dataset.index, item_list_id: a.dataset.listId, item_list_name: a.dataset.listName };
        sessionStorage.setItem('dc_list_ctx', JSON.stringify(ctx));
        ecom('select_item', { item_list_id: ctx.item_list_id, item_list_name: ctx.item_list_name, items: [item(p, ctx)] });
      });
    });
    $$('.wish', el).forEach(function (b) {
      b.addEventListener('click', function () {
        addToWishlist(b.dataset.id, { index: +b.dataset.index, item_list_id: b.dataset.listId, item_list_name: b.dataset.listName });
      });
    });
    $$('.add', el).forEach(function (b) {
      b.addEventListener('click', function () {
        addToCart(b.dataset.id, 1, { index: +b.dataset.index, item_list_id: b.dataset.listId, item_list_name: b.dataset.listName });
      });
    });
  }

  // ---------------------------------------------------------------- pages
  var pages = {
    home: function () {
      var v = localStorage.getItem('dc_exp_home_hero');
      if (!v) { v = Math.random() < 0.5 ? 'A' : 'B'; localStorage.setItem('dc_exp_home_hero', v); }
      if (v === 'B') { $('#hero-title').textContent = 'Purr-fect deals for curious cats.'; }
      custom('experiment_view', { experiment_id: 'home_hero_2026', variant_id: v });
      renderList($('#featured'), [CAT[0], CAT[3], CAT[6], CAT[7]], 'home_featured', 'Home featured');
      $$('[data-promo]').forEach(function (b) {
        var promo = { promotion_id: b.dataset.promo, promotion_name: b.dataset.promoName, creative_slot: 'home_hero' };
        ecom('view_promotion', { items: [{ item_id: 'DC-TOY-002', item_name: 'Laser Mouse Chaser', promotion_id: promo.promotion_id, promotion_name: promo.promotion_name, creative_slot: promo.creative_slot }] });
        b.addEventListener('click', function () { ecom('select_promotion', { items: [{ item_id: 'DC-TOY-002', item_name: 'Laser Mouse Chaser', promotion_id: promo.promotion_id, promotion_name: promo.promotion_name, creative_slot: promo.creative_slot }] }); });
      });
    },
    category: function () {
      var cat = new URLSearchParams(location.search).get('category');
      var list = cat ? CAT.filter(function (p) { return p.category === cat; }) : CAT;
      $('#list-title').textContent = cat ? cat : 'All products';
      $$('.filters a').forEach(function (a) { if ((a.dataset.cat || '') === (cat || '')) a.classList.add('active'); });
      var listId = cat ? 'category_' + cat.toLowerCase() : 'all_products', listName = cat ? 'Category ' + cat : 'All products';
      $$('.filters a').forEach(function (a) {
        a.addEventListener('click', function () { custom('product_filter', { filter_type: 'category', filter_value: a.dataset.cat || 'all' }); });
      });
      function apply(changed) {
        var sort = $('#sort').value, max = +$('#price-max').value, out = list.slice();
        if (max) out = out.filter(function (p) { return p.price <= max; });
        if (sort === 'price_asc') out.sort(function (a, b) { return a.price - b.price; });
        if (sort === 'price_desc') out.sort(function (a, b) { return b.price - a.price; });
        if (sort === 'name') out.sort(function (a, b) { return a.name.localeCompare(b.name); });
        if (changed === 'sort') custom('product_sort', { sort_option: sort });
        if (changed === 'price') custom('product_filter', { filter_type: 'price_max', filter_value: max ? String(max) : 'any' });
        renderList($('#products'), out, listId, listName);
      }
      $('#sort').onchange = function () { apply('sort'); };
      $('#price-max').onchange = function () { apply('price'); };
      apply(null);
    },
    search: function () {
      var q = (new URLSearchParams(location.search).get('q') || '').trim();
      $('.search input').value = q;
      var res = CAT.filter(function (p) { return (p.name + ' ' + p.category + ' ' + p.category2).toLowerCase().indexOf(q.toLowerCase()) > -1; });
      $('#search-title').textContent = 'Results for "' + q + '" (' + res.length + ')';
      dl.push({ event: 'search', search_term: q, search_results: res.length });
      if (res.length) renderList($('#products'), res, 'search_results', 'Search results');
      else { $('#products').innerHTML = '<p>No cat things found. Try "toy" or "food".</p>'; custom('search_zero_results', { search_term: q }); }
    },
    product: function () {
      var p = byId(new URLSearchParams(location.search).get('id')) || CAT[0];
      var ctx = {}; try { ctx = JSON.parse(sessionStorage.getItem('dc_list_ctx') || '{}'); } catch (e) {}
      document.title = p.name + ' | Digitl Cats';
      $('#pdp').innerHTML = '<div class="thumb big" style="background:' + p.color + '">' + p.emoji + '</div><div><p class="crumb"><a href="shop.html?category=' + p.category + '">' + p.category + '</a> / ' + p.category2 + '</p><h1>' + p.name + '</h1><p>' + p.desc + '</p><p class="variant">Variant: ' + p.variant + '</p><p class="price big">' + money(p.price) + '</p>' +
        '<div class="qty"><label for="q">Qty</label> <input id="q" type="number" min="1" max="9" value="1"> <button id="pdp-add">Add to cart</button> <button id="pdp-wish" class="ghost">♡ Wishlist</button></div></div>';
      ecom('view_item', { currency: C.CURRENCY, value: p.price, items: [item(p, ctx)] });
      $('#pdp-add').onclick = function () { addToCart(p.id, Math.max(1, +$('#q').value || 1), ctx); };
      $('#pdp-wish').onclick = function () { addToWishlist(p.id, ctx); };
      renderList($('#related'), CAT.filter(function (x) { return x.category === p.category && x.id !== p.id; }), 'related_products', 'Related products');
    },
    cart: function () {
      function draw() {
        var lines = cartItems();
        if (!lines.length) { $('#cart').innerHTML = '<p>Your cart is empty. <a href="shop.html">Go shopping</a></p>'; $('#to-checkout').hidden = true; return; }
        $('#cart').innerHTML = '<table class="lines"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th></th></tr></thead><tbody>' +
          lines.map(function (l) { return '<tr><td>' + l.p.emoji + ' ' + l.p.name + '</td><td>' + l.q + '</td><td>' + money(l.p.price * l.q) + '</td><td><button class="ghost rm" data-id="' + l.p.id + '">Remove</button></td></tr>'; }).join('') +
          '</tbody></table><p class="total">Subtotal: <b>' + money(cartValue(lines)) + '</b></p>';
        $$('.rm').forEach(function (b) {
          b.onclick = function () {
            var c = getCart(), l = c.filter(function (x) { return x.id === b.dataset.id; })[0], p = byId(b.dataset.id), it = item(p); it.quantity = l.q;
            setCart(c.filter(function (x) { return x.id !== b.dataset.id; }));
            ecom('remove_from_cart', { currency: C.CURRENCY, value: r2(p.price * l.q), items: [it] });
            draw();
          };
        });
      }
      draw();
      var lines = cartItems();
      ecom('view_cart', { currency: C.CURRENCY, value: cartValue(lines), items: lines.map(function (l) { var it = item(l.p); it.quantity = l.q; return it; }) });
    },
    checkout: function () {
      var lines = cartItems();
      if (!lines.length) { location.href = 'cart.html'; return; }
      var items = lines.map(function (l) { var it = item(l.p); it.quantity = l.q; return it; });
      var sub = cartValue(lines);
      $('#summary').innerHTML = lines.map(function (l) { return '<div class="sum-line"><span>' + l.q + ' x ' + l.p.name + '</span><span>' + money(l.p.price * l.q) + '</span></div>'; }).join('') + '<div class="sum-line total"><span>Subtotal</span><span>' + money(sub) + '</span></div>';
      ecom('begin_checkout', { currency: C.CURRENCY, value: sub, items: items });
      var form = $('#checkout-form');
      $('#step-shipping').onclick = function () {
        var tier = form.shipping.value;
        ecom('add_shipping_info', { currency: C.CURRENCY, value: sub, shipping_tier: tier, items: items });
        $('#pay').hidden = false; this.disabled = true;
      };
      form.onsubmit = function (e) {
        e.preventDefault();
        var tier = form.shipping.value, pay = form.payment.value, coupon = (form.coupon.value || '').trim().toUpperCase();
        ecom('add_payment_info', { currency: C.CURRENCY, value: sub, payment_type: pay, coupon: coupon || undefined, items: items });
        var disc = window.DC_COUPONS[coupon] ? r2(sub * window.DC_COUPONS[coupon]) : 0;
        var ship = window.DC_SHIPPING[tier].cost, value = r2(sub - disc), tax = r2(value - value / 1.19);
        var order = { id: 'DC-' + Date.now().toString(36).toUpperCase(), value: value, tax: tax, shipping: ship, coupon: disc ? coupon : '', pay: pay, tier: tier, lines: getCart(), disc: disc };
        sessionStorage.setItem('dc_last_order', JSON.stringify(order));
        localStorage.removeItem('dc_cart');
        location.href = 'thank-you.html';
      };
    },
    purchase: function () {
      var o; try { o = JSON.parse(sessionStorage.getItem('dc_last_order') || 'null'); } catch (e) {}
      if (!o) { $('#order').innerHTML = '<p>No recent order found. <a href="shop.html">Back to the shop</a></p>'; return; }
      $('#order').innerHTML = '<p>Order <b>' + o.id + '</b> confirmed (test order, nothing will be shipped).</p><p>Total: <b>' + money(o.value + o.shipping) + '</b> incl. shipping</p>';
      var sent = JSON.parse(localStorage.getItem('dc_sent_orders') || '[]');
      if (sent.indexOf(o.id) > -1 && SC !== 'duplicate_purchase') return; // dedupe on reload
      var items = o.lines.map(function (l) { var p = byId(l.id), it = item(p); it.quantity = l.q; if (o.disc) it.coupon = o.coupon; return it; });
      var e = { currency: C.CURRENCY, value: o.value, tax: o.tax, shipping: o.shipping, items: items };
      if (SC !== 'missing_transaction_id') e.transaction_id = o.id;
      if (o.coupon) e.coupon = o.coupon;
      ecom('purchase', e);
      sent.push(o.id); localStorage.setItem('dc_sent_orders', JSON.stringify(sent.slice(-50)));
    },
    faq: function () {
      $$('details.faq').forEach(function (d) {
        d.addEventListener('toggle', function () {
          custom('faq_interaction', { faq_question: d.querySelector('summary').textContent.trim(), faq_action: d.open ? 'open' : 'close' });
        });
      });
    },
    contact: function () {
      var f = $('#contact-form'), started = false;
      f.addEventListener('input', function () {
        if (started) return; started = true;
        custom('form_interaction', { form_name: 'contact', form_step: 'start' });
      });
      f.onsubmit = function (e) {
        e.preventDefault();
        // no personal data in the dataLayer: only the topic
        dl.push({ event: 'generate_lead', lead_source: 'contact_form', form_topic: f.topic.value });
        custom('form_interaction', { form_name: 'contact', form_step: 'submit' });
        f.hidden = true; $('#contact-done').hidden = false;
      };
    },
    account: function () {
      var logged = localStorage.getItem('dc_login') === '1';
      $('#acc-out').hidden = logged; $('#acc-in').hidden = !logged;
      $('#login-form').onsubmit = function (e) {
        e.preventDefault();
        localStorage.setItem('dc_login', '1');
        dl.push({ event: 'login', method: 'email' });
        $('#acc-out').hidden = true; $('#acc-in').hidden = false;
      };
      $('#signup-form').onsubmit = function (e) {
        e.preventDefault();
        localStorage.setItem('dc_login', '1');
        var consent = {}; try { consent = JSON.parse(localStorage.getItem('dc_consent') || '{}'); } catch (x) {}
        if (SC === 'pii_in_datalayer') {
          // planted mistake: email sent as a plain event parameter
          dl.push({ event: 'sign_up', method: 'email', user_email: 'test.cat@example.com' });
        } else {
          // Enhanced Conversions: user_data only with marketing consent, never as an event parameter
          if (consent.marketing) { dl.push({ user_data: null }); dl.push({ user_data: { email: 'test.cat@example.com' } }); }
          dl.push({ event: 'sign_up', method: 'email' });
        }
        $('#acc-out').hidden = true; $('#acc-in').hidden = false;
      };
      $('#logout').onclick = function () { localStorage.removeItem('dc_login'); dl.push({ event: 'logout' }); location.reload(); };
    },
    scenarios: function () {
      $('#current-scenario').textContent = SC || 'none (clean setup)';
    }
  };
  (pages[pageType] || function () {})();
})();
