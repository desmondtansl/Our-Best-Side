// Full-page navigation to Stripe's checkout pages (paying, or saving a
// card). Only Stripe's own HTTPS address is followed, so even a tampered
// answer from the server can't send shoppers to another site or run code.
const ALLOWED_HOSTS = ["checkout.stripe.com"];

export const isSafeRedirect = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_HOSTS.includes(parsed.hostname);
  } catch (error) {
    return false;
  }
};

// Kept in its own module so tests can replace it.
export const redirectTo = (url) => {
  if (!isSafeRedirect(url)) throw new Error("Unexpected payment page address");
  window.location.assign(url);
};
