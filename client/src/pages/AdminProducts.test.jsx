import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminProducts from "./AdminProducts";

vi.mock("axios", () => ({
  default: { get: vi.fn(), patch: vi.fn(), defaults: { headers: { common: {} } } },
}));

const tee = {
  _id: "p1",
  title: "Linen Shirt",
  category: ["Men"],
  price: 60,
  compareAtPrice: 80,
  image: "a.jpg",
  status: "live",
  featured: true,
  size: ["S", "M"],
  sizeStock: [{ size: "S", inStock: 3 }, { size: "M", inStock: 0 }],
};
const draft = { _id: "p2", title: "New Coat", category: ["Ladies"], price: 200, inStock: 4, status: "draft" };
const counts = { live: 1, draft: 1, archived: 0 };

const renderPage = (url = "/search") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <AdminProducts />
    </MemoryRouter>
  );

describe("AdminProducts", () => {
  beforeEach(() => {
    axios.get.mockImplementation(async (url, { params }) => ({
      data: { data: params.status === "draft" ? [draft] : [tee], counts, hasMore: false },
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("lists live products with price, sale, stock per size and links", async () => {
    renderPage();
    const link = await screen.findByRole("link", { name: "Linen Shirt" });
    expect(link).toHaveAttribute("href", "/search/p1");
    const row = link.closest("tr");
    expect(row).toHaveTextContent("$60");
    expect(row).toHaveTextContent("Sale");
    expect(row).toHaveTextContent("S 3 · M 0");
    expect(row).toHaveTextContent("Featured");
    expect(within(row).getByRole("link", { name: "View" })).toHaveAttribute("href", "/men/p1");
    expect(screen.getByRole("tab", { name: "Live (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Drafts (1)" })).toBeInTheDocument();
  });

  it("switches tabs, searches and sorts through the address", async () => {
    renderPage();
    await screen.findByText("Linen Shirt");
    fireEvent.click(screen.getByRole("tab", { name: "Drafts (1)" }));
    expect(await screen.findByText("New Coat")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Product name"), { target: { value: "coat" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.any(String), {
        params: { status: "draft", q: "coat", sort: "newest" },
      })
    );
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "price-asc" } });
    await waitFor(() =>
      expect(axios.get).toHaveBeenLastCalledWith(expect.any(String), {
        params: { status: "draft", q: "coat", sort: "price-asc" },
      })
    );
  });

  it("publishes a draft, moving it out of the Drafts tab", async () => {
    axios.patch.mockResolvedValue({ data: { data: { ...draft, status: "live" } } });
    renderPage("/search?status=draft");
    fireEvent.click(await screen.findByRole("button", { name: "Publish New Coat" }));
    await waitFor(() => expect(screen.queryByText("New Coat")).not.toBeInTheDocument());
    expect(screen.getByRole("tab", { name: "Live (2)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Drafts (0)" })).toBeInTheDocument();
  });

  it("archives only after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    axios.patch.mockResolvedValue({ data: { data: { ...tee, status: "archived" } } });
    renderPage();
    const archive = await screen.findByRole("button", { name: "Archive Linen Shirt" });
    fireEvent.click(archive);
    expect(axios.patch).not.toHaveBeenCalled();
    fireEvent.click(archive);
    await waitFor(() => expect(screen.queryByText("Linen Shirt")).not.toBeInTheDocument());
    expect(axios.patch.mock.calls[0][1]).toEqual({ status: "archived" });
  });
});
