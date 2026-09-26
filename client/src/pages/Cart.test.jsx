import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import Cart from "./Cart";
import cartReducer, { addProduct } from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";
import { redirectTo } from "../utils/redirect";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));
vi.mock("../utils/redirect", () => ({ redirectTo: vi.fn() }));

const loafers = {
  _id: "product-1",
  title: "Suede Loafers",
  description: "Brown suede loafers",
  image: "loafers-key",
  price: 250,
};

const renderCart = (user, overrides = {}) => {
  UserAuth.mockReturnValue([
    { data: user, loading: false, error: null },
    vi.fn(),
  ]);
  const store = configureStore({ reducer: { cart: cartReducer } });
  store.dispatch(
    addProduct({ ...loafers, quantity: 2, size: "US 9", color: "Brown", ...overrides })
  );
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    </Provider>
  );
};

describe("Cart items", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows each line's details, unit price and line total", () => {
    renderCart(null);
    const item = screen.getByTestId("cart-item");
    expect(within(item).getByText("Suede Loafers")).toBeInTheDocument();
    expect(item).toHaveTextContent("Color: Brown");
    expect(item).toHaveTextContent("Size: US 9");
    expect(item).toHaveTextContent("$250.00 each");
    expect(item).toHaveTextContent("$500.00");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$500.00");
  });

  it("changes the quantity with + and - and updates the totals", () => {
    renderCart(null);
    const qty = screen.getByLabelText("Quantity of Suede Loafers");
    const plus = screen.getByLabelText("Increase quantity of Suede Loafers");
    const minus = screen.getByLabelText("Decrease quantity of Suede Loafers");

    fireEvent.click(plus);
    expect(qty).toHaveTextContent("3");
    expect(screen.getByTestId("cart-item")).toHaveTextContent("$750.00");
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$750.00");

    fireEvent.click(minus);
    fireEvent.click(minus);
    expect(qty).toHaveTextContent("1");
    expect(minus).toBeDisabled();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$250.00");
  });

  it("stops at the available stock", () => {
    renderCart(null, { inStock: 3 });
    const plus = screen.getByLabelText("Increase quantity of Suede Loafers");
    fireEvent.click(plus);
    expect(plus).toBeDisabled();
    fireEvent.click(plus);
    expect(screen.getByLabelText("Quantity of Suede Loafers")).toHaveTextContent("3");
  });

  it("sends the edited quantity to checkout", async () => {
    axios.post.mockResolvedValue({ data: { data: "https://checkout.stripe.com/pay" } });
    renderCart(null);
    fireEvent.click(screen.getByLabelText("Increase quantity of Suede Loafers"));
    fireEvent.click(screen.getByText("Checkout Now"));
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].items[0].quantity).toBe(3);
  });

  it("removes an item and updates the totals and badge count", () => {
    UserAuth.mockReturnValue([{ data: null, loading: false, error: null }, vi.fn()]);
    const store = configureStore({ reducer: { cart: cartReducer } });
    store.dispatch(addProduct({ ...loafers, quantity: 1, size: "US 9" }));
    store.dispatch(
      addProduct({ _id: "p2", title: "Blue Dress", price: 80, quantity: 2, image: "d" })
    );
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getAllByTestId("cart-item")).toHaveLength(2);
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$410.00");

    fireEvent.click(screen.getByLabelText("Remove Suede Loafers from cart"));

    expect(screen.getAllByTestId("cart-item")).toHaveLength(1);
    expect(screen.queryByText("Suede Loafers")).not.toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$160.00");
    expect(store.getState().cart.quantity).toBe(1);

    fireEvent.click(screen.getByLabelText("Remove Blue Dress from cart"));
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$0.00");
  });

  it("shows an empty state", () => {
    UserAuth.mockReturnValue([{ data: null, loading: false, error: null }, vi.fn()]);
    render(
      <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByText("Checkout Now")).toBeDisabled();
    expect(screen.queryByText("Reset Cart")).not.toBeInTheDocument();
  });
});

describe("Cart checkout", () => {
  afterEach(() => vi.clearAllMocks());

  it("sends product ids and choices, never prices, for guests", async () => {
    axios.post.mockResolvedValue({ data: { data: "https://checkout.stripe.com/pay" } });
    renderCart(null);

    expect(screen.getByText(/to use saved addresses/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Checkout Now"));

    await waitFor(() =>
      expect(redirectTo).toHaveBeenCalledWith("https://checkout.stripe.com/pay")
    );
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/checkout\/create-checkout-session$/);
    expect(body).toEqual({
      items: [{ productId: "product-1", quantity: 2, size: "US 9", color: "Brown" }],
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("lets logged-in users ship to their default saved address", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { _id: "addr-1", label: "Home", fullName: "Sam", line1: "1 Orchard Rd", city: "Singapore", postalCode: "238800", isDefault: false },
          { _id: "addr-2", label: "Office", fullName: "Sam", line1: "10 Anson Rd", city: "Singapore", postalCode: "079903", isDefault: true },
        ],
      },
    });
    axios.post.mockResolvedValue({ data: { data: "https://checkout.stripe.com/pay" } });
    renderCart({ email: "sam@example.com" });

    const select = await screen.findByLabelText("Ship to");
    await waitFor(() => expect(select).toHaveValue("addr-2"));
    fireEvent.change(select, { target: { value: "addr-1" } });
    fireEvent.click(screen.getByText("Checkout Now"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(axios.post.mock.calls[0][1].addressId).toBe("addr-1");
  });

  it("shows the server's error instead of failing silently", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: "Some items in your cart are no longer available" } },
    });
    renderCart(null);
    fireEvent.click(screen.getByText("Checkout Now"));

    expect(
      await screen.findByText("Some items in your cart are no longer available")
    ).toBeInTheDocument();
    expect(redirectTo).not.toHaveBeenCalled();
    expect(screen.getByText("Checkout Now")).not.toBeDisabled();
  });
});
