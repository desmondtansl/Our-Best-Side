import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import AdminDashboard from "./AdminDashboard";
import { UserAuth } from "../context/Auth";

vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));
vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));

const DAY = 24 * 60 * 60 * 1000;

const emptyStats = {
  currency: "sgd",
  sales: {
    today: { revenue: 0, orders: 0, average: 0 },
    week: { revenue: 0, orders: 0, average: 0 },
    month: { revenue: 0, orders: 0, average: 0 },
  },
  toShip: { count: 0, oldest: null },
  lowStock: { threshold: 3, items: [] },
  bestSellers: [],
  recentOrders: [],
};

const stats = {
  currency: "sgd",
  sales: {
    today: { revenue: 50.5, orders: 2, average: 25.25 },
    week: { revenue: 80.5, orders: 3, average: 26.83 },
    month: { revenue: 1180, orders: 1, average: 1180 },
  },
  toShip: { count: 2, oldest: new Date(Date.now() - 3 * DAY - 1000).toISOString() },
  lowStock: {
    threshold: 3,
    items: [
      { productId: "p1", title: "Linen Shirt", size: "L", inStock: 0 },
      { productId: "p2", title: "Cap", inStock: 2 },
    ],
  },
  bestSellers: [{ productId: "p3", title: "Suede Loafers", units: 5, revenue: 1250 }],
  recentOrders: [
    {
      _id: "64b0000000000000abcd1234",
      createdAt: "2026-09-20T10:00:00.000Z",
      email: "guest@example.com",
      status: "paid",
      currency: "sgd",
      subtotal: 250,
    },
  ],
};

const renderDashboard = ({ isOwner = false } = {}) => {
  const setUser = vi.fn();
  UserAuth.mockReturnValue([
    { data: { email: "a@b.com", isAdmin: true, isOwner }, loading: false },
    setUser,
  ]);
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/" element={<p>Homepage</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { setUser };
};

describe("AdminDashboard", () => {
  beforeEach(() => axios.get.mockResolvedValue({ data: { data: stats } }));
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("links to the admin pages in black, like the site's header", () => {
    renderDashboard();
    const links = [
      ["Upload New Products", "/upload"],
      ["Products", "/search"],
      ["Edit Stock", "/admin/stock"],
      ["Manage Orders", "/admin/orders"],
      ["Discounts", "/admin/discounts"],
      ["Logout", "/"],
    ];
    for (const [name, href] of links) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(getComputedStyle(link).color).toBe("rgb(0, 0, 0)");
    }
  });

  it("hides Manage Admins from other admins", () => {
    renderDashboard();
    expect(screen.queryByRole("link", { name: "Manage Admins" })).not.toBeInTheDocument();
  });

  it("shows Manage Admins to the owner", () => {
    renderDashboard({ isOwner: true });
    expect(screen.getByRole("link", { name: "Manage Admins" })).toHaveAttribute(
      "href",
      "/admin/users"
    );
  });

  it("logs out when the Logout link is followed, also from the keyboard", () => {
    localStorage.setItem("token", "t");
    const { setUser } = renderDashboard();
    // Pressing Enter on a link clicks the link itself, not the text inside.
    fireEvent.click(screen.getByRole("link", { name: "Logout" }));
    expect(setUser).toHaveBeenCalledWith({ data: null, loading: false, error: null });
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
  });

  it("shows sales for today, 7 and 30 days", async () => {
    renderDashboard();
    const today = await screen.findByLabelText("Sales today");
    expect(today).toHaveTextContent("$50.50");
    expect(today).toHaveTextContent("2 orders · average $25.25");
    expect(screen.getByLabelText("Sales last 30 days")).toHaveTextContent("1 order · average");
  });

  it("links orders waiting to ship to Manage Orders, filtered", async () => {
    renderDashboard();
    const panel = (await screen.findByText("Waiting to ship")).closest("section");
    expect(panel).toHaveTextContent("2");
    expect(panel).toHaveTextContent("The oldest was placed 3 days ago");
    expect(within(panel).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/orders?status=paid,processing"
    );
  });

  it("lists low stock and best sellers, linking to each product's edit page", async () => {
    renderDashboard();
    const lowStock = (await screen.findByText("Low stock")).closest("section");
    expect(lowStock).toHaveTextContent("3 or fewer left");
    expect(within(lowStock).getByRole("link", { name: "Linen Shirt" })).toHaveAttribute(
      "href",
      "/search/p1"
    );
    expect(lowStock).toHaveTextContent("size L");
    expect(within(lowStock).getByText("Sold out")).toBeInTheDocument();
    expect(within(lowStock).getByText("2 left")).toBeInTheDocument();

    const best = screen.getByText("Best sellers").closest("section");
    expect(within(best).getByRole("link", { name: "Suede Loafers" })).toHaveAttribute(
      "href",
      "/search/p3"
    );
    expect(best).toHaveTextContent("5 sold · $1,250.00");
  });

  it("shows recent orders", async () => {
    renderDashboard();
    const recent = (await screen.findByText("Recent orders")).closest("section");
    expect(within(recent).getByRole("link", { name: "#ABCD1234" })).toHaveAttribute(
      "href",
      "/admin/orders/64b0000000000000abcd1234"
    );
    expect(recent).toHaveTextContent("guest@example.com (guest)");
    expect(recent).toHaveTextContent("Paid");
  });

  it("has friendly messages for a new shop with no orders", async () => {
    axios.get.mockResolvedValue({ data: { data: emptyStats } });
    renderDashboard();
    expect(await screen.findByText("Nothing is waiting to ship.")).toBeInTheDocument();
    expect(screen.getByText("Nothing is running low.")).toBeInTheDocument();
    expect(screen.getByText("No sales in the last 30 days yet.")).toBeInTheDocument();
    expect(screen.getByText("No orders yet.")).toBeInTheDocument();
    expect(screen.getByLabelText("Sales today")).toHaveTextContent("0 orders");
  });

  it("shows an error, keeps the menu, and reloads on Refresh", async () => {
    axios.get.mockRejectedValueOnce({ response: { data: { error: "Database down" } } });
    renderDashboard();
    expect(await screen.findByText("Database down")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage Orders" })).toBeInTheDocument();

    const callsBefore = axios.get.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByLabelText("Sales today")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Database down")).not.toBeInTheDocument());
    expect(axios.get).toHaveBeenCalledTimes(callsBefore + 1);
  });
});
