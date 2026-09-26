import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const renderCart = (user) => {
  UserAuth.mockReturnValue([
    { data: user, loading: false, error: null },
    vi.fn(),
  ]);
  const store = configureStore({ reducer: { cart: cartReducer } });
  store.dispatch(addProduct({ ...loafers, quantity: 2, size: "US 9", color: "Brown" }));
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Cart />
      </MemoryRouter>
    </Provider>
  );
};

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
