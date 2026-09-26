import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import ProductGrid from "./ProductGrid";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderGrid = (category) => {
  UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
  return render(
    <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
      <MemoryRouter>
        <ProductGrid category={category} />
      </MemoryRouter>
    </Provider>
  );
};

describe("ProductGrid", () => {
  afterEach(() => vi.clearAllMocks());

  it("lists products linking to their pages", async () => {
    axios.get.mockResolvedValue({
      data: [{ _id: "d1", title: "Ladies Blue Dress", price: 80, image: "dress-key" }],
    });
    renderGrid("ladies");
    expect(screen.getByText("Loading products…")).toBeInTheDocument();

    const card = await screen.findByTestId("product-card");
    expect(card).toHaveTextContent("Ladies Blue Dress");
    expect(card).toHaveTextContent("$ 80");
    expect(screen.getByAltText("Ladies Blue Dress").closest("a")).toHaveAttribute(
      "href",
      "/ladies/d1"
    );
    expect(axios.get.mock.calls[0][0]).toMatch(/\/products\/ladies$/);
  });

  it("shows an empty message instead of a stray 0", async () => {
    axios.get.mockResolvedValue({ data: [] });
    renderGrid("men");
    const message = await screen.findByText(/No products here yet/);
    // The grid holds only the message (the old page rendered a literal "0").
    expect(message.parentElement.textContent).toBe(message.textContent);
  });

  it("shows an error when loading fails", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    renderGrid("men");
    expect(await screen.findByText(/couldn't load products/)).toBeInTheDocument();
  });
});
