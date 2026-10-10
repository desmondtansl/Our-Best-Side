import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminOrders from "./AdminOrders";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const order = {
  _id: "64b0000000000000abcd1234",
  createdAt: "2026-09-20T10:00:00.000Z",
  email: "guest@example.com",
  status: "paid",
  currency: "sgd",
  subtotal: 250,
  items: [{ title: "Suede Loafers", size: "US 9", price: 250, quantity: 1 }],
  shippingAddress: { name: "Guest", line1: "10 Bayfront Ave", city: "Singapore", country: "SG" },
};

const renderPage = (url = "/admin/orders") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminOrders />
    </MemoryRouter>
  );

describe("AdminOrders", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [order] } });
  });
  afterEach(() => vi.clearAllMocks());

  it("lists orders including guest orders", async () => {
    renderPage();
    expect(await screen.findByText("#ABCD1234")).toBeInTheDocument();
    expect(screen.getByText(/guest@example.com \(guest\)/)).toBeInTheDocument();
    expect(screen.getByText(/10 Bayfront Ave/)).toBeInTheDocument();
  });

  it("updates an order's status", async () => {
    axios.patch.mockResolvedValue({ data: { data: { ...order, status: "shipped" } } });
    renderPage();
    const select = await screen.findByLabelText("Status for order ABCD1234");
    fireEvent.change(select, { target: { value: "shipped" } });

    await waitFor(() => expect(select).toHaveValue("shipped"));
    const [url, body] = axios.patch.mock.calls[0];
    expect(url).toMatch(/\/admin\/orders\/64b0000000000000abcd1234$/);
    expect(body).toEqual({ status: "shipped" });
  });

  it("filters by status", async () => {
    renderPage();
    await screen.findByText("#ABCD1234");
    fireEvent.change(screen.getByLabelText(/Show/), { target: { value: "delivered" } });
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/orders$/), {
        params: { status: "delivered" },
      })
    );
  });

  it("opens filtered to orders waiting to ship from the dashboard's link", async () => {
    renderPage("/admin/orders?status=paid,processing");
    await screen.findByText("#ABCD1234");
    expect(screen.getByLabelText(/Show/)).toHaveValue("paid,processing");
    expect(screen.getByRole("option", { name: "Waiting to ship" }).selected).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/orders$/), {
      params: { status: "paid,processing" },
    });
  });
});
