import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import AdminOrderDetail from "./AdminOrderDetail";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const ID = "64b0000000000000abcd1234";

const order = {
  _id: ID,
  createdAt: "2026-10-09T02:00:00.000Z",
  email: "jane@example.com",
  user: "u1",
  status: "paid",
  currency: "sgd",
  subtotal: 100,
  refundedTotal: 0,
  refundable: 100,
  refunds: [],
  notes: "",
  stripePaymentIntentId: "pi_1",
  stripeUrl: "https://dashboard.stripe.com/test/payments/pi_1",
  paymentMethod: { brand: "visa", last4: "4242" },
  items: [
    { product: "p1", title: "Linen Shirt", size: "M", color: "White", price: 40, quantity: 2 },
    { product: "p2", title: "Cap", price: 20, quantity: 1 },
  ],
  shippingAddress: { name: "Jane Tan", line1: "10 Bayfront Ave", city: "Singapore", postalCode: "018956", country: "SG" },
  statusHistory: [{ status: "paid", at: "2026-10-09T02:01:00.000Z" }],
};

const renderPage = (data = order) => {
  axios.get.mockResolvedValue({ data: { data: data } });
  render(
    <MemoryRouter initialEntries={[`/admin/orders/${ID}`]}>
      <Routes>
        <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
      </Routes>
    </MemoryRouter>
  );
};

const section = (name) => screen.getByRole("heading", { name }).closest("section");

describe("AdminOrderDetail", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows everything about the order", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: /Order #ABCD1234/ })).toBeInTheDocument();
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/admin/orders/${ID}$`)));

    const items = section("Items");
    expect(within(items).getByRole("link", { name: "Linen Shirt" })).toHaveAttribute("href", "/search/p1");
    expect(items).toHaveTextContent("M / White");
    expect(items).toHaveTextContent("$80.00");
    expect(items).toHaveTextContent("Total paid$100.00");

    const customer = section("Customer");
    expect(customer).toHaveTextContent("jane@example.com · has an account");
    expect(customer).toHaveTextContent("Jane Tan");
    expect(customer).toHaveTextContent("10 Bayfront Ave, Singapore, 018956, SG");

    const payment = section("Payment and refunds");
    expect(payment).toHaveTextContent("Paid with VISA •••• 4242");
    expect(within(payment).getByRole("link", { name: "Open this payment in Stripe ↗" })).toHaveAttribute(
      "href",
      order.stripeUrl
    );

    const status = section("Status");
    expect(status).toHaveTextContent("Placed");
    expect(status).toHaveTextContent("Paid");
    expect(status).toHaveTextContent("confirmed by Stripe");
  });

  it("says when the order can't be found", async () => {
    axios.get.mockRejectedValue({ response: { data: { error: "Order not found" } } });
    render(
      <MemoryRouter initialEntries={[`/admin/orders/${ID}`]}>
        <Routes>
          <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Order not found");
    expect(screen.getByRole("link", { name: "← All orders" })).toHaveAttribute("href", "/admin/orders");
  });

  it("changes the status and adds it to the history", async () => {
    axios.patch.mockResolvedValue({
      data: {
        data: {
          ...order,
          status: "processing",
          statusHistory: [...order.statusHistory, { status: "processing", at: "2026-10-10T02:00:00.000Z", by: "admin@example.com" }],
        },
      },
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Status for order ABCD1234"), {
      target: { value: "processing" },
    });
    await waitFor(() => expect(section("Status")).toHaveTextContent("admin@example.com"));
  });

  describe("refunds", () => {
    it("refunds part of the order after confirming, with a warning it can't be undone", async () => {
      axios.post.mockResolvedValue({
        data: {
          data: {
            ...order,
            refundedTotal: 25.5,
            refundable: 74.5,
            refunds: [{ stripeRefundId: "re_1", amount: 25.5, at: "2026-10-10T03:00:00.000Z", by: "admin@example.com" }],
          },
        },
      });
      renderPage();
      const amount = await screen.findByLabelText("Amount to refund");
      expect(amount).toHaveValue(100);
      fireEvent.change(amount, { target: { value: "25.50" } });
      fireEvent.click(screen.getByRole("button", { name: "Refund…" }));

      const dialog = screen.getByRole("alertdialog", { name: "Refund $25.50 for order #ABCD1234?" });
      expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");
      expect(dialog).toHaveTextContent("the VISA ending 4242");
      expect(within(dialog).getByRole("button", { name: "No, go back" })).toHaveFocus();
      expect(axios.post).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole("button", { name: "Yes, refund $25.50" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/refund$/), { amount: 25.5 });
      expect(screen.getByRole("status")).toHaveTextContent("$25.50 has been refunded in total");

      const payment = section("Payment and refunds");
      expect(payment).toHaveTextContent("Refunded $25.50");
      expect(payment).toHaveTextContent("admin@example.com");
      expect(screen.getByLabelText("Amount to refund")).toHaveValue(74.5);
      expect(section("Items")).toHaveTextContent("Kept$74.50");
    });

    it("refuses amounts above what's left, without asking Stripe", async () => {
      renderPage();
      fireEvent.change(await screen.findByLabelText("Amount to refund"), { target: { value: "150" } });
      fireEvent.click(screen.getByRole("button", { name: "Refund…" }));
      expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount between $0.01 and $100.00");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("keeps the pop-up open with Stripe's message when the refund fails", async () => {
      axios.post.mockRejectedValue({
        response: { data: { error: "Stripe didn't make the refund: charge disputed" } },
      });
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Refund…" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes, refund $100.00" }));
      expect(await within(screen.getByRole("alertdialog")).findByRole("alert")).toHaveTextContent(
        "charge disputed"
      );
    });

    it("says so when there's nothing left to refund, or no Stripe payment", async () => {
      renderPage({ ...order, refundable: 0, refundedTotal: 100 });
      expect(await screen.findByText("This order has been refunded in full.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Amount to refund")).not.toBeInTheDocument();
    });
  });

  it("adds tracking details after shipping", async () => {
    axios.put.mockResolvedValue({
      data: { data: { ...order, tracking: { courier: "SingPost", number: "RR1", url: "https://track.example.com/RR1" } } },
    });
    renderPage();
    const tracking = await screen.findByRole("heading", { name: "Tracking" });
    const panel = tracking.closest("section");
    expect(panel).toHaveTextContent("No tracking details yet.");
    fireEvent.click(within(panel).getByRole("button", { name: "Add tracking" }));
    fireEvent.change(within(panel).getByLabelText(/Courier/), { target: { value: "SingPost" } });
    fireEvent.change(within(panel).getByLabelText(/Tracking number/), { target: { value: "RR1" } });
    fireEvent.change(within(panel).getByLabelText(/Tracking link/), {
      target: { value: "https://track.example.com/RR1" },
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Save tracking" }));

    expect(await within(panel).findByText("Tracking number: RR1")).toBeInTheDocument();
    expect(axios.put).toHaveBeenCalledWith(expect.stringMatching(/\/tracking$/), {
      courier: "SingPost",
      number: "RR1",
      url: "https://track.example.com/RR1",
    });
    expect(within(panel).getByRole("link", { name: "Track the parcel ↗" })).toHaveAttribute(
      "href",
      "https://track.example.com/RR1"
    );
  });

  it("saves internal notes", async () => {
    axios.put.mockResolvedValue({ data: { data: { ...order, notes: "Gift wrap" } } });
    renderPage();
    const notes = await screen.findByRole("textbox", { name: "Notes for this order" });
    const save = screen.getByRole("button", { name: "Save notes" });
    expect(save).toBeDisabled();
    fireEvent.change(notes, { target: { value: "Gift wrap" } });
    fireEvent.click(save);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(axios.put).toHaveBeenCalledWith(expect.stringMatching(/\/notes$/), { notes: "Gift wrap" });
  });
});
