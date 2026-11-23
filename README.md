# Digitl Cats (tracking sandbox)

A made-up cat shop used by the Digitl Digital Analytics team to test GTM, GA4 and tracking skills.
Nothing is sold, shipped or charged. No personal data is collected.

- Clean GA4 ecommerce dataLayer: view_item_list, select_item, view_item, add_to_cart, remove_from_cart,
  view_cart, begin_checkout, add_shipping_info, add_payment_info, purchase, view_promotion, select_promotion
- GA4 recommended events: search, generate_lead
- Custom events in the Digitl standard (`event: "custom_event"`, `event_name`, nested object, reset before each push):
  navigation, faq_interaction, form_interaction, newsletter_signup
- Cookie banner with Google Consent Mode v2 (default denied, update on choice, `consent_update` event)
- Test scenarios with planted mistakes: see `scenarios.html` (`?scenario=<name>`, `?scenario=off`)

Configuration: `assets/config.js` (GTM container ID).
