// Store policies shown to customers. PLACEHOLDERS: replace with your real
// delivery and returns terms before going live.
export const DELIVERY = {
  // Shown next to "Add to Cart" on product pages.
  headline: "Free delivery in Singapore",
  detail: "Arrives in 3–5 working days.",
  // Shown as the "Shipping" line in the cart's Order Summary.
  cartLabel: "Free",
};

export const RETURNS = {
  headline: "Free returns within 14 days",
  detail: "Items must be unworn, with tags attached.",
};

// Minutes shoppers have to pay on Stripe's checkout page, shown under the
// cart's Checkout button. The same as CHECKOUT_MINUTES in
// server/src/routes/checkout.js (which adds a minute's margin for Stripe).
export const CHECKOUT_MINUTES = 30;

// Product pages show "Only N left" when stock is at or below this number.
export const LOW_STOCK_THRESHOLD = 3;
