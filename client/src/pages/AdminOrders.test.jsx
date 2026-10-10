import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminOrders from "./AdminOrders";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
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
  stripeUrl: "https://dashboard.stripe.com/test/payments/pi_123",
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
    axios.patch.mockResolvedValue({ data: { data: { ...order, status: "processing" } } });
    renderPage();
    const select = await screen.findByLabelText("Status for order ABCD1234");
    fireEvent.change(select, { target: { value: "processing" } });

    await waitFor(() => expect(select).toHaveValue("processing"));
    const [url, body] = axios.patch.mock.calls[0];
    expect(url).toMatch(/\/admin\/orders\/64b0000000000000abcd1234$/);
    expect(body).toEqual({ status: "processing" });
  });

  it("links each order to its own page", async () => {
    renderPage();
    expect(await screen.findByRole("link", { name: "#ABCD1234" })).toHaveAttribute(
      "href",
      "/admin/orders/64b0000000000000abcd1234"
    );
  });

  it("searches by order number or email, and filters by dates, keeping them in the address", async () => {
    renderPage();
    await screen.findByText("#ABCD1234");
    fireEvent.change(screen.getByLabelText("Order number or email"), {
      target: { value: " jane@ " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/orders$/), {
        params: { q: "jane@" },
      })
    );
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-05" } });
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/orders$/), {
        params: { q: "jane@", from: "2026-10-01", to: "2026-10-05" },
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/orders$/), {
        params: {},
      })
    );
    expect(screen.getByLabelText("Order number or email")).toHaveValue("");
  });

  it("loads more orders, 50 at a time", async () => {
    const second = { ...order, _id: "64b0000000000000abcd9999" };
    axios.get
      .mockResolvedValueOnce({ data: { data: [order], hasMore: true } })
      .mockResolvedValueOnce({ data: { data: [order, second], hasMore: false } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Load more orders" }));
    expect(await screen.findByText("#ABCD9999")).toBeInTheDocument();
    expect(axios.get).toHaveBeenLastCalledWith(expect.stringMatching(/\/admin\/orders$/), {
      params: { page: 2 },
    });
    // The repeated order isn't shown twice, and there's nothing more to load.
    expect(screen.getAllByText("#ABCD1234")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Load more orders" })).not.toBeInTheDocument();
  });

  describe("shipping", () => {
    it("asks for tracking details, then marks the order shipped", async () => {
      axios.patch.mockResolvedValue({
        data: { data: { ...order, status: "shipped", tracking: { courier: "Ninja Van", number: "NV1", url: "" } } },
      });
      renderPage();
      const select = await screen.findByLabelText("Status for order ABCD1234");
      fireEvent.change(select, { target: { value: "shipped" } });
      const dialog = screen.getByRole("dialog", { name: "Mark order #ABCD1234 as shipped" });
      expect(select).toHaveValue("paid");
      expect(axios.patch).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByLabelText(/Courier/), { target: { value: "Ninja Van" } });
      fireEvent.change(within(dialog).getByLabelText(/Tracking number/), { target: { value: "NV1" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Mark as shipped" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(axios.patch.mock.calls[0][1]).toEqual({
        status: "shipped",
        tracking: { courier: "Ninja Van", number: "NV1", url: "" },
      });
      expect(select).toHaveValue("shipped");
    });

    it("keeps the pop-up open with the server's message if it fails", async () => {
      axios.patch.mockRejectedValue({
        response: { data: { error: "The tracking link must start with https:// or http://" } },
      });
      renderPage();
      fireEvent.change(await screen.findByLabelText("Status for order ABCD1234"), {
        target: { value: "shipped" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Mark as shipped" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("must start with https://");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("goes back without changing anything", async () => {
      renderPage();
      fireEvent.change(await screen.findByLabelText("Status for order ABCD1234"), {
        target: { value: "shipped" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(axios.patch).not.toHaveBeenCalled();
    });
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

  describe("cancelling", () => {
    const chooseCancelled = async () => {
      renderPage();
      const select = await screen.findByLabelText("Status for order ABCD1234");
      fireEvent.change(select, { target: { value: "cancelled" } });
      return select;
    };

    it("asks first, with a warning that it cannot be undone, and changes nothing yet", async () => {
      const select = await chooseCancelled();
      const dialog = screen.getByRole("alertdialog", { name: "Cancel order #ABCD1234?" });
      expect(dialog).toHaveAccessibleDescription("This action cannot be undone.");
      const warning = screen.getByText("This action cannot be undone.").parentElement;
      expect(getComputedStyle(warning).color).toBe("rgb(255, 0, 0)");
      expect(getComputedStyle(warning).fontWeight).toBe("800");
      expect(dialog).toHaveTextContent("The customer is not refunded automatically");
      expect(dialog).toHaveTextContent("$250.00");
      expect(dialog).toHaveTextContent("The item in it goes back in stock straight away.");
      // A link to the payment in Stripe, opening in a new tab so the pop-up stays.
      const stripe = screen.getByRole("link", { name: "Open this payment in Stripe ↗" });
      expect(stripe).toHaveAttribute("href", "https://dashboard.stripe.com/test/payments/pi_123");
      expect(stripe).toHaveAttribute("target", "_blank");
      expect(stripe).toHaveAttribute("rel", "noopener noreferrer");
      // The safe choice has focus, and the order is untouched until confirmed.
      expect(screen.getByRole("button", { name: "No, keep order" })).toHaveFocus();
      expect(select).toHaveValue("paid");
      expect(axios.patch).not.toHaveBeenCalled();
    });

    it("keeps the order when the admin says no, presses Esc or taps outside", async () => {
      await chooseCancelled();
      fireEvent.click(screen.getByRole("button", { name: "No, keep order" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Status for order ABCD1234"), {
        target: { value: "cancelled" },
      });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Status for order ABCD1234"), {
        target: { value: "cancelled" },
      });
      const overlay = screen.getByRole("alertdialog").parentElement;
      fireEvent.click(overlay);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

      expect(axios.patch).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Status for order ABCD1234")).toHaveValue("paid");
    });

    it("cancels once confirmed, then shows Cancelled with no way to change it", async () => {
      axios.patch.mockResolvedValue({ data: { data: { ...order, status: "cancelled" } } });
      await chooseCancelled();
      fireEvent.click(screen.getByRole("button", { name: "Yes, cancel order" }));

      await waitFor(() =>
        expect(screen.queryByLabelText("Status for order ABCD1234")).not.toBeInTheDocument()
      );
      expect(axios.patch).toHaveBeenCalledTimes(1);
      expect(axios.patch.mock.calls[0][1]).toEqual({ status: "cancelled" });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(within(screen.getByRole("table")).getByText("Cancelled")).toBeInTheDocument();

      // A reminder to refund stays on the page, with the Stripe link, until dismissed.
      const reminder = screen.getByRole("status");
      expect(reminder).toHaveTextContent("Order #ABCD1234 is cancelled.");
      expect(reminder).toHaveTextContent("Don't forget to refund $250.00 to the customer");
      expect(
        within(reminder).getByRole("link", { name: "Open this payment in Stripe ↗" })
      ).toHaveAttribute("href", "https://dashboard.stripe.com/test/payments/pi_123");
      fireEvent.click(screen.getByRole("button", { name: "Dismiss refund reminder" }));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("doesn't show the refund reminder if cancelling fails", async () => {
      axios.patch.mockRejectedValue({ response: { data: { error: "Order not found" } } });
      await chooseCancelled();
      fireEvent.click(screen.getByRole("button", { name: "Yes, cancel order" }));
      expect(await screen.findByText("Order not found")).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    describe("with a Stripe payment that can be refunded", () => {
      const refundable = { ...order, stripePaymentIntentId: "pi_1", refundable: 250, refundedTotal: 0 };
      beforeEach(() => axios.get.mockResolvedValue({ data: { data: [refundable] } }));

      it("offers to refund at the same time, ticked by default", async () => {
        axios.patch.mockResolvedValue({ data: { data: { ...refundable, status: "cancelled" } } });
        axios.post.mockResolvedValue({
          data: { data: { ...refundable, status: "cancelled", refundable: 0, refundedTotal: 250 } },
        });
        await chooseCancelled();
        const box = screen.getByRole("checkbox", { name: /Also refund \$250.00 to the customer now/ });
        expect(box).toBeChecked();
        fireEvent.click(screen.getByRole("button", { name: "Yes, cancel and refund" }));

        const notice = await screen.findByRole("status");
        expect(notice).toHaveTextContent(
          "Order #ABCD1234 is cancelled and $250.00 has been refunded to the customer."
        );
        expect(axios.patch.mock.calls[0][1]).toEqual({ status: "cancelled" });
        const [url, body] = axios.post.mock.calls[0];
        expect(url).toMatch(/\/admin\/orders\/64b0000000000000abcd1234\/refund$/);
        expect(body).toEqual({ amount: 250, requestId: expect.any(String) });
      });

      it("cancels without refunding when unticked, and reminds to refund", async () => {
        axios.patch.mockResolvedValue({ data: { data: { ...refundable, status: "cancelled" } } });
        await chooseCancelled();
        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(screen.getByRole("button", { name: "Yes, cancel order" }));
        expect(await screen.findByRole("status")).toHaveTextContent(
          "Don't forget to refund $250.00 to the customer"
        );
        expect(axios.post).not.toHaveBeenCalled();
      });

      it("says so when the order is cancelled but the refund fails", async () => {
        axios.patch.mockResolvedValue({ data: { data: { ...refundable, status: "cancelled" } } });
        axios.post.mockRejectedValue({
          response: { data: { error: "Stripe didn't make the refund: card expired" } },
        });
        await chooseCancelled();
        fireEvent.click(screen.getByRole("button", { name: "Yes, cancel and refund" }));
        const notice = await screen.findByRole("status");
        expect(notice).toHaveTextContent("is cancelled, but the refund didn't go through");
        expect(notice).toHaveTextContent("card expired.");
      });
    });

    it("never asks again when choosing other statuses", async () => {
      axios.patch.mockResolvedValue({ data: { data: { ...order, status: "delivered" } } });
      renderPage();
      fireEvent.change(await screen.findByLabelText("Status for order ABCD1234"), {
        target: { value: "delivered" },
      });
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1));
    });
  });

  it("shows cancelled orders as Cancelled, without a dropdown", async () => {
    axios.get.mockResolvedValue({ data: { data: [{ ...order, status: "cancelled" }] } });
    renderPage();
    await screen.findByText("#ABCD1234");
    expect(screen.queryByLabelText("Status for order ABCD1234")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Cancelled")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Payment for order ABCD1234 in Stripe" })
    ).toHaveAttribute("href", "https://dashboard.stripe.com/test/payments/pi_123");
  });
});
