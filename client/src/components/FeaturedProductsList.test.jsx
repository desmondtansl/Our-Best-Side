import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import FeaturedProductsList from "./FeaturedProductsList";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));

const renderList = () =>
  render(
    <MemoryRouter>
      <FeaturedProductsList />
    </MemoryRouter>
  );

describe("FeaturedProductsList", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows featured products from the database with in-site links", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          { _id: "m1", title: "Suede Loafers", price: 250, image: "k1", category: ["Men"] },
          { _id: "l1", title: "Ladies Blue Dress", price: 80, image: "k2", category: ["Ladies"] },
        ],
      },
    });
    renderList();

    expect(await screen.findByText("Featured Products")).toBeInTheDocument();
    expect(screen.getByText("$250")).toBeInTheDocument();
    expect(screen.getByAltText("Suede Loafers").closest("a")).toHaveAttribute("href", "/men/m1");
    expect(screen.getByAltText("Ladies Blue Dress").closest("a")).toHaveAttribute(
      "href",
      "/ladies/l1"
    );
    expect(axios.get.mock.calls[0][0]).toMatch(/\/products\/featured$/);
  });

  it("renders nothing, not even the header, when no products are featured", async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });
    const { container } = renderList();
    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
