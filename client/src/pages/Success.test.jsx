import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import Success from "./Success";
import cartReducer, { addProduct } from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderSuccess = (path) => {
  const store = configureStore({ reducer: { cart: cartReducer } });
  store.dispatch(addProduct({ _id: "p1", title: "Tee", price: 50, quantity: 1 }));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Success />
      </MemoryRouter>
    </Provider>
  );
  return store;
};

describe("Success page", () => {
  beforeEach(() => {
    UserAuth.mockReturnValue([{ data: { email: "sam@example.com" }, loading: false }, vi.fn()]);
  });
  afterEach(() => vi.clearAllMocks());

  it("empties the cart", () => {
    const store = renderSuccess("/success");
    expect(store.getState().cart.products).toEqual([]);
    expect(store.getState().cart.quantity).toBe(0);
  });

  it("shows the order confirmed by the webhook", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          id: "64b0000000000000abcd1234",
          status: "paid",
          currency: "sgd",
          subtotal: 100,
          items: [{ title: "Long Sleeve Tee", size: "M", price: 50, quantity: 2 }],
        },
      },
    });
    renderSuccess("/success?session_id=cs_test_123");

    expect(await screen.findByText("Order #ABCD1234")).toBeInTheDocument();
    expect(screen.getByText(/Paid/)).toBeInTheDocument();
    expect(screen.getByText(/2 × Long Sleeve Tee \(M\)/)).toBeInTheDocument();
    expect(screen.getByText("your account")).toBeInTheDocument();
    expect(axios.get.mock.calls[0][0]).toMatch(/\/checkout\/order\/cs_test_123$/);
  });

  it("polls while the payment is still being confirmed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const base = { id: "64b0000000000000abcd1234", currency: "sgd", subtotal: 50, items: [] };
      axios.get
        .mockResolvedValueOnce({ data: { data: { ...base, status: "pending" } } })
        .mockResolvedValueOnce({ data: { data: { ...base, status: "paid" } } });
      renderSuccess("/success?session_id=cs_test_123");

      expect(await screen.findByText(/Confirming payment/)).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(2000));
      await waitFor(() => expect(screen.getByText(/Paid/)).toBeInTheDocument());
      expect(axios.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
