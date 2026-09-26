// Full-page navigation to an external URL (e.g. Stripe Checkout).
// Kept in its own module so tests can replace it.
export const redirectTo = (url) => window.location.assign(url);
