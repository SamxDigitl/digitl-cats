/* Loaded synchronously in <head> on every page, BEFORE GTM.
   1. Reads the active test scenario (?scenario=... or ?scenario=off)
   2. Sets Google Consent Mode v2 defaults from the stored choice
   3. Pushes the page context object
   4. Loads GTM */
(function () {
  var cfg = window.DC_CONFIG;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // ---- test scenarios (planted mistakes for evals) ----
  var params = new URLSearchParams(location.search);
  var s = params.get('scenario');
  try {
    if (s === 'off' || s === 'none') sessionStorage.removeItem('dc_scenario');
    else if (s) sessionStorage.setItem('dc_scenario', s);
    window.DC_SCENARIO = sessionStorage.getItem('dc_scenario') || null;
    // ?debug=1 shows the scenario bar in this tab (hidden by default so evals are blind)
    var dbg = params.get('debug');
    if (dbg === '1') sessionStorage.setItem('dc_debug', '1'); else if (dbg === '0') sessionStorage.removeItem('dc_debug');
    window.DC_DEBUG = sessionStorage.getItem('dc_debug') === '1';
  } catch (e) { window.DC_SCENARIO = s || null; }

  // ---- consent defaults ----
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem('dc_consent') || 'null'); } catch (e) {}
  var granted = function (b) { return b ? 'granted' : 'denied'; };
  if (window.DC_SCENARIO === 'consent_default_granted') {
    // planted mistake: everything granted before the user decides
    gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
  } else {
    gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
      wait_for_update: 500
    });
    if (stored) {
      gtag('consent', 'update', {
        analytics_storage: granted(stored.analytics),
        ad_storage: granted(stored.marketing), ad_user_data: granted(stored.marketing), ad_personalization: granted(stored.marketing)
      });
    }
  }

  // ---- page context (no event key: available to every tag on the page) ----
  var body = document.currentScript && document.currentScript.dataset;
  var loggedIn = false;
  try { loggedIn = localStorage.getItem('dc_login') === '1'; } catch (e) {}
  window.dataLayer.push({
    event: 'page_meta',
    page: {
      page_type: (body && body.pageType) || 'other',
      page_language: 'en',
      site_name: cfg.SITE_NAME,
      site_environment: cfg.ENV,
      // coded so the dataLayer does not reveal the planted mistake (codes s1 to s8 in scenario list order)
      test_scenario: window.DC_SCENARIO ? ({missing_transaction_id:'s1',duplicate_purchase:'s2',price_as_string:'s3',missing_currency:'s4',no_ecommerce_reset:'s5',stale_custom_params:'s6',pii_in_datalayer:'s7',consent_default_granted:'s8'}[window.DC_SCENARIO] || 's0') : 'none',
      login_status: loggedIn ? 'logged_in' : 'logged_out'
    },
    consent_state: stored ? { analytics: !!stored.analytics, marketing: !!stored.marketing } : { analytics: false, marketing: false }
  });

  // ---- Google Tag Manager ----
  if (cfg.GTM_ID && cfg.GTM_ID.indexOf('XXXX') === -1) {
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : '';
      j.async = true; j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', cfg.GTM_ID);
  }
})();
