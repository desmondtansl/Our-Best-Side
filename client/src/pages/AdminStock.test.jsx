import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminStock from "./AdminStock";

vi.mock("axios", () => ({
  default: { get: vi.fn(), put: vi.fn(), defaults: { headers: { common: {} } } },
}));

const shirt = {
  _id: "p1",
  title: "Linen Shirt",
  updatedAt: "2026-10-10T01:00:00.000Z",
  size: ["S", "M"],
  sizeStock: [{ size: "S", inStock: 3 }, { size: "M", inStock: 0 }],
};
const cap = { _id: "p2", title: "Cap", updatedAt: "2026-10-10T02:00:00.000Z", inStock: 5 };
const scarf = { _id: "p3", title: "Scarf", updatedAt: "2026-10-10T03:00:00.000Z", inStock: 1 };

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminStock />
    </MemoryRouter>
  );

describe("AdminStock", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [shirt, cap, scarf], hasMore: false } });
  });
  afterEach(() => vi.clearAllMocks());

  it("saves only the products that changed, per size or as a whole", async () => {
    axios.put.mockResolvedValue({ data: { data: { saved: [shirt, cap], conflicts: [] } } });
    renderPage();
    const m = await screen.findByLabelText("Linen Shirt, size M");
    expect(m).toHaveValue(0);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    fireEvent.change(m, { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Cap stock"), { target: { value: "9" } });
    expect(screen.getByText("2 products changed")).toBeInTheDocument();
    fireEvent.click(save);

    expect(await screen.findByRole("status")).toHaveTextContent("Saved stock for 2 products.");
    const [url, body] = axios.put.mock.calls[0];
    expect(url).toMatch(/\/admin\/products\/stock$/);
    expect(body).toEqual({
      changes: [
        { id: "p1", updatedAt: shirt.updatedAt, sizeStock: { S: "3", M: "6" } },
        { id: "p2", updatedAt: cap.updatedAt, inStock: "9" },
      ],
    });
  });

  it("explains products that changed while editing, and reloads them", async () => {
    axios.put.mockResolvedValue({
      data: { data: { saved: [], conflicts: [{ id: "p2", title: "Cap" }] } },
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Cap stock"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Not saved, because they changed while you were editing (an order may have come in): Cap."
    );
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it("finds products by name", async () => {
    renderPage();
    await screen.findByText("Cap");
    fireEvent.change(screen.getByLabelText("Find a product"), { target: { value: "lin" } });
    expect(screen.getAllByTestId("stock-row")).toHaveLength(1);
  });
});
