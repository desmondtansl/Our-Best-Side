// A random id this browser keeps and sends with each login. A browser that
// has logged in to an account before isn't blocked by that account's
// login limit, so someone else typing wrong passwords can't lock the owner
// out of their own device.
const KEY = "deviceId";

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;

export const deviceId = () => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = randomId();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch (error) {
    // Private browsing: this login just won't be remembered.
    return undefined;
  }
};
