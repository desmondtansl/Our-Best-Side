import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import Account from "./Account";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";
import { redirectTo } from "../utils/redirect";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));
vi.mock("../utils/redirect", () => ({ redirectTo: vi.fn() }));

const homeAddress = {
  _id: "addr-1",
  label: "Home",
  fullName: "Sam Tan",
  line1: "1 Orchard Road",
  city: "Singapore",
  postalCode: "238800",
  country: "SG",
  isDefault: true,
};

const order = {
  _id: "64b0000000000000abcd1234",
  createdAt: "2026-09-20T10:00:00.000Z",
  status: "shipped",
  currency: "sgd",
  subtotal: 550,
  items: [
    { title: "Suede Loafers", size: "US 9", color: "Brown", price: 250, quantity: 2 },
    { title: "Long Sleeve Tee", price: 50, quantity: 1 },
  ],
  paymentMethod: { brand: "visa", last4: "4242" },
  shippingAddress: { name: "Sam Tan", line1: "1 Orchard Road", city: "Singapore", country: "SG" },
};

const routes = {
  "/account": { data: { email: "sam@example.com", addresses: [homeAddress] } },
  "/account/orders": { data: [order] },
  "/account/addresses": { data: [homeAddress] },
  "/account/payment-methods": {
    data: [{ id: "pm_1", brand: "visa", last4: "4242", expMonth: 4, expYear: 2031 }],
  },
};

const renderAccount = (path = "/account") =>
  render(
    <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/account" element={<Account />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe("Account page", () => {
  beforeEach(() => {
    UserAuth.mockReturnValue([
      { data: { email: "sam@example.com" }, loading: false, error: null },
      vi.fn(),
    ]);
    axios.get.mockImplementation(async (url) => {
      const path = url.replace(/^.*?(\/account)/, "$1");
      return { data: routes[path] };
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("shows order history with status, items and totals by default", async () => {
    renderAccount();
    const card = await screen.findByTestId("order");
    expect(within(card).getByText(/Order #ABCD1234/)).toBeInTheDocument();
    expect(within(card).getByText("Shipped")).toBeInTheDocument();
    expect(within(card).getByText(/2 × Suede Loafers \(US 9, Brown\)/)).toBeInTheDocument();
    expect(within(card).getByText(/Total: S?\$550\.00/)).toBeInTheDocument();
    expect(within(card).getByText(/VISA •••• 4242/)).toBeInTheDocument();
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
  });

  it("shows an empty state when there are no orders", async () => {
    routes["/account/orders"] = { data: [] };
    try {
      renderAccount();
      expect(await screen.findByText(/haven't placed any orders/)).toBeInTheDocument();
    } finally {
      routes["/account/orders"] = { data: [order] };
    }
  });

  it("lists saved addresses and adds a new one", async () => {
    axios.post.mockResolvedValue({
      data: {
        data: [
          homeAddress,
          { ...homeAddress, _id: "addr-2", label: "Office", isDefault: false },
        ],
      },
    });
    renderAccount("/account?tab=addresses");

    const saved = await screen.findByTestId("address");
    expect(within(saved).getByText("Home")).toBeInTheDocument();
    expect(within(saved).getByText("Default")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Add address"));
    const form = screen.getByRole("form", { name: "Address form" });
    const fill = (label, value) =>
      fireEvent.change(within(form).getByLabelText(label), { target: { value } });
    fill(/Label/, "Office");
    fill("Full name", "Sam Tan");
    fill("Address line 1", "10 Anson Road");
    fill("City", "Singapore");
    fill("Postal code", "079903");
    fill(/Country code/, "sg");
    fireEvent.submit(form);

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    const [url, payload] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/account\/addresses$/);
    expect(payload).toMatchObject({
      label: "Office",
      line1: "10 Anson Road",
      country: "SG",
      isDefault: false,
    });
    expect(await screen.findAllByTestId("address")).toHaveLength(2);
    expect(screen.queryByRole("form", { name: "Address form" })).not.toBeInTheDocument();
  });

  it("shows server validation errors on the address form", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: [{ msg: "Country must be a 2-letter code, e.g. SG" }] } },
    });
    renderAccount("/account?tab=addresses");
    await screen.findByTestId("address");
    fireEvent.click(screen.getByText("Add address"));
    fireEvent.submit(screen.getByRole("form", { name: "Address form" }));

    expect(
      await screen.findByText("Country must be a 2-letter code, e.g. SG")
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Address form" })).toBeInTheDocument();
  });

  it("lists saved cards, removes one and starts adding a card", async () => {
    axios.delete.mockResolvedValue({ data: { data: { id: "pm_1" } } });
    axios.post.mockResolvedValue({ data: { data: "https://checkout.stripe.com/setup" } });
    renderAccount("/account?tab=payments");

    const card = await screen.findByTestId("payment-method");
    expect(within(card).getByText("VISA")).toBeInTheDocument();
    expect(within(card).getByText(/4242/)).toBeInTheDocument();
    expect(within(card).getByText("Expires 04/2031")).toBeInTheDocument();

    fireEvent.click(within(card).getByText("Remove"));
    await waitFor(() =>
      expect(screen.queryByTestId("payment-method")).not.toBeInTheDocument()
    );
    expect(axios.delete.mock.calls[0][0]).toMatch(/\/account\/payment-methods\/pm_1$/);

    fireEvent.click(screen.getByText("Add a card"));
    await waitFor(() =>
      expect(redirectTo).toHaveBeenCalledWith("https://checkout.stripe.com/setup")
    );
    expect(axios.post.mock.calls[0][0]).toMatch(/\/payment-methods\/setup-session$/);
  });

  it("switches tabs", async () => {
    renderAccount();
    await screen.findByTestId("order");
    fireEvent.click(screen.getByRole("tab", { name: "Addresses" }));
    expect(await screen.findByTestId("address")).toBeInTheDocument();
    expect(screen.queryByTestId("order")).not.toBeInTheDocument();
  });
});
