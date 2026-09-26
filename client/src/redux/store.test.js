import { createStore, loadCart, CART_STORAGE_KEY } from "./store";
import { addProduct, resetCart } from "./cartRedux";

const shirt = { _id: "p1", title: "Linen Shirt", price: 0.1, quantity: 3 };

describe("saved cart", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves the cart after every change and restores it in a new store", () => {
    const store = createStore();
    store.dispatch(addProduct(shirt));
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).products).toHaveLength(1);

    const reloaded = createStore();
    expect(reloaded.getState().cart).toMatchObject({
      quantity: 1,
      totalPrice: 0.3,
      products: [{ _id: "p1", quantity: 3 }],
    });

    reloaded.dispatch(resetCart());
    expect(createStore().getState().cart.products).toEqual([]);
  });

  it("starts empty when nothing is saved or the saved data is corrupt", () => {
    expect(loadCart()).toBeUndefined();
    localStorage.setItem(CART_STORAGE_KEY, "{not json");
    expect(loadCart()).toBeUndefined();
    expect(createStore().getState().cart.products).toEqual([]);
  });

  it("drops invalid lines and recomputes the total instead of trusting it", () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        products: [shirt, { title: "no id", quantity: 1 }, { ...shirt, _id: "p2", quantity: 0 }],
        quantity: 3,
        totalPrice: 9999,
      })
    );
    expect(loadCart()).toEqual({ products: [shirt], quantity: 1, totalPrice: 0.3 });
  });

  it("keeps working when storage is blocked", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const store = createStore();
    expect(() => store.dispatch(addProduct(shirt))).not.toThrow();
    expect(store.getState().cart.quantity).toBe(1);
    spy.mockRestore();
  });
});
