import { createSlice } from "@reduxjs/toolkit";

// Recalculates the total in cents so repeated edits don't drift (0.1 + 0.2).
const recalculateTotal = (state) => {
  const cents = state.products.reduce(
    (sum, product) => sum + Math.round(product.price * 100) * product.quantity,
    0
  );
  state.totalPrice = cents / 100;
};

// Highest quantity allowed for a cart line: its stock when known.
export const maxQuantity = (product) =>
  product?.inStock > 0 ? product.inStock : Infinity;

const cartSlice = createSlice({
  name: "cart",
  initialState: {
    products: [],
    quantity: 0,
    totalPrice: 0,
  },
  reducers: {
    addProduct: (state, action) => {
      state.quantity += 1;
      state.products.push(action.payload);
      recalculateTotal(state);
    },
    // payload: { index, delta } where delta is +1 or -1. Stays between 1 and
    // the product's stock.
    changeQuantity: (state, action) => {
      const { index, delta } = action.payload;
      const product = state.products[index];
      if (!product) return;
      const next = product.quantity + delta;
      if (next < 1 || next > maxQuantity(product)) return;
      product.quantity = next;
      recalculateTotal(state);
    },
    // payload: { index } of the cart line to delete.
    removeProduct: (state, action) => {
      const { index } = action.payload;
      if (!state.products[index]) return;
      state.products.splice(index, 1);
      state.quantity = state.products.length;
      recalculateTotal(state);
    },
    resetCart: (state) => {
      state.products = [];
      state.quantity = 0;
      state.totalPrice = 0;
    },
  },
});
export const { addProduct, changeQuantity, removeProduct, resetCart } =
  cartSlice.actions;
export default cartSlice.reducer;
