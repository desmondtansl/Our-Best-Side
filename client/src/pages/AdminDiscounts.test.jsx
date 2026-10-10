import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminDiscounts from "./AdminDiscounts";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const welcome = {
  _id: "d1",
  name: "Welcome offer",
  code: "WELCOME10",
  percentOff: 10,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  active: true,
  state: "running",
  timesUsed: 3,
};
const flash = {
  _id: "d2",
  name: "Flash sale",
  code: "FLASH",
  percentOff: 25,
  startDate: "2026-11-11",
  active: true,
  state: "scheduled",
  timesUsed: 0,
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminDiscounts />
    </MemoryRouter>
  );

describe("AdminDiscounts", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [welcome, flash] } });
    window.scrollTo = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("lists promotions with code, discount, dates, status and uses", async () => {
    renderPage();
    const row = (await screen.findByText("Welcome offer")).closest("tr");
    expect(row).toHaveTextContent("WELCOME10");
    expect(row).toHaveTextContent("10% off");
    expect(row).toHaveTextContent("1 Oct 2026 – 31 Oct 2026");
    expect(row).toHaveTextContent("Running");
    expect(row).toHaveTextContent("3 orders");
    // Used promotions can't be deleted.
    expect(within(row).queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
    const flashRow = screen.getByText("Flash sale").closest("tr");
    expect(flashRow).toHaveTextContent("From 11 Nov 2026");
    expect(flashRow).toHaveTextContent("Scheduled");
  });

  it("creates a promotion with a name, code, percentage and dates", async () => {
    axios.post.mockResolvedValue({ data: { data: {} } });
    renderPage();
    await screen.findByText("Welcome offer");
    fireEvent.change(screen.getByLabelText("Name of the promotion"), { target: { value: "Year end" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "yearend " } });
    fireEvent.change(screen.getByLabelText("Discount (%)"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-12-01" } });
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: "2026-12-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      'Created "Year end". Shoppers can use YEAREND in their cart.'
    );
    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/promotions$/), {
      name: "Year end",
      code: "yearend",
      percentOff: 15,
      startDate: "2026-12-01",
      endDate: "2026-12-31",
      active: true,
    });
    expect(screen.getByLabelText("Name of the promotion")).toHaveValue("");
  });

  it("shows the server's message when a promotion can't be saved", async () => {
    axios.post.mockRejectedValue({ response: { data: { error: "Another promotion already uses that code" } } });
    renderPage();
    await screen.findByText("Welcome offer");
    fireEvent.change(screen.getByLabelText("Name of the promotion"), { target: { value: "Again" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "WELCOME10" } });
    fireEvent.change(screen.getByLabelText("Discount (%)"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-12-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Create promotion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already uses that code");
  });

  it("edits a promotion in the same form", async () => {
    axios.put.mockResolvedValue({ data: { data: {} } });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Welcome offer" }));
    expect(screen.getByRole("heading", { name: 'Edit "Welcome offer"' })).toBeInTheDocument();
    expect(screen.getByLabelText("Code")).toHaveValue("WELCOME10");
    expect(screen.getByText(/the 3 orders already placed keep their discount/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Discount (%)"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(axios.put).toHaveBeenCalled());
    expect(axios.put.mock.calls[0][0]).toMatch(/\/admin\/promotions\/d1$/);
    expect(axios.put.mock.calls[0][1]).toMatchObject({ percentOff: 12, code: "WELCOME10", active: true });
  });

  it("pauses, and deletes an unused promotion after confirming", async () => {
    axios.put.mockResolvedValue({ data: { data: {} } });
    axios.delete.mockResolvedValue({ data: { data: {} } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Pause Welcome offer" }));
    await waitFor(() => expect(axios.put.mock.calls[0][1]).toMatchObject({ active: false }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Flash sale" }));
    await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.stringMatching(/\/admin\/promotions\/d2$/)));
  });
});
