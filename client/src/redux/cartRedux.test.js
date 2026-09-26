import cartReducer, {
  addProduct,
  changeQuantity,
  removeProduct,
  resetCart,
} from "./cartRedux";

const start = () =>
  [
    addProduct({ _id: "a", title: "Tee", price: 59, quantity: 3, inStock: 5 }),
    addProduct({ _id: "b", title: "Socks", price: 0.1, quantity: 1 }),
  ].reduce(cartReducer, undefined);

describe("cart reducer", () => {
  it("adds products and totals them", () => {
    const state = start();
    expect(state.quantity).toBe(2);
    expect(state.totalPrice).toBe(177.1);
  });

  it("changes a line's quantity and recalculates the total without float drift", () => {
    let state = start();
    state = cartReducer(state, changeQuantity({ index: 1, delta: 1 }));
    state = cartReducer(state, changeQuantity({ index: 1, delta: 1 }));
    expect(state.products[1].quantity).toBe(3);
    expect(state.totalPrice).toBe(177.3);

    state = cartReducer(state, changeQuantity({ index: 0, delta: -1 }));
    expect(state.products[0].quantity).toBe(2);
    expect(state.totalPrice).toBe(118.3);
  });

  it("never goes below 1 or above the stock", () => {
    let state = start();
    for (let i = 0; i < 5; i++) state = cartReducer(state, changeQuantity({ index: 0, delta: -1 }));
    expect(state.products[0].quantity).toBe(1);
    for (let i = 0; i < 10; i++) state = cartReducer(state, changeQuantity({ index: 0, delta: 1 }));
    expect(state.products[0].quantity).toBe(5);
  });

  it("removes a line and updates the count and total", () => {
    let state = cartReducer(start(), removeProduct({ index: 0 }));
    expect(state.products.map((p) => p._id)).toEqual(["b"]);
    expect(state.quantity).toBe(1);
    expect(state.totalPrice).toBe(0.1);

    state = cartReducer(state, removeProduct({ index: 0 }));
    expect(state).toEqual({ products: [], quantity: 0, totalPrice: 0 });
    expect(cartReducer(state, removeProduct({ index: 3 }))).toEqual(state);
  });

  it("ignores unknown lines and resets", () => {
    const state = cartReducer(start(), changeQuantity({ index: 9, delta: 1 }));
    expect(state.totalPrice).toBe(177.1);
    expect(cartReducer(state, resetCart())).toEqual({ products: [], quantity: 0, totalPrice: 0 });
  });
});
