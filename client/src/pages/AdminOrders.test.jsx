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
      expect(screen.getByRole("cell", { name: "Cancelled" })).toBeInTheDocument();
    });

    it("never asks again when choosing other statuses", async () => {
      axios.patch.mockResolvedValue({ data: { data: { ...order, status: "shipped" } } });
      renderPage();
      fireEvent.change(await screen.findByLabelText("Status for order ABCD1234"), {
        target: { value: "shipped" },
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
    expect(screen.getByRole("cell", { name: "Cancelled" })).toBeInTheDocument();
  });
});
