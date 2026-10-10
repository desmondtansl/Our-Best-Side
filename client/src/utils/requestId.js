// A one-time id for a request that must not happen twice (e.g. a refund):
// the server passes it to Stripe, which acts on each id once.
export const newRequestId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
