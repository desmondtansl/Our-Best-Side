import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartRedux";

// The cart is saved in the browser so it survives refreshes, closed tabs and
// return visits. Prices are always re-checked by the server at checkout.
export const CART_STORAGE_KEY = "ourbestside-cart-v1";

export const loadCart = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    if (!saved || !Array.isArray(saved.products)) return undefined;
    const products = saved.products.filter(
      (p) => p && p._id && Number.isInteger(p.quantity) && p.quantity > 0
    );
    const cents = products.reduce(
      (sum, p) => sum + Math.round((Number(p.price) || 0) * 100) * p.quantity,
      0
    );
    return { products, quantity: products.length, totalPrice: cents / 100 };
  } catch (error) {
    return undefined; // private mode, blocked storage or corrupt data
  }
};

export const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    // Storage full or blocked: the cart still works for this visit.
  }
};

export const createStore = () => {
  const cart = loadCart();
  const store = configureStore({
    reducer: {
      cart: cartReducer,
    },
    preloadedState: cart ? { cart } : undefined,
  });
  let lastCart = store.getState().cart;
  store.subscribe(() => {
    const { cart: current } = store.getState();
    if (current !== lastCart) {
      lastCart = current;
      saveCart(current);
    }
  });
  return store;
};

export default createStore();
