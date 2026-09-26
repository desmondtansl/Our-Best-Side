import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import ProductDetails from "./ProductDetails";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const loafers = {
  _id: "p1",
  title: "Suede Loafers",
  description: "Tan suede loafers",
  image: "loafers-key",
  category: ["Men"],
  size: ["US 8", "US 9"],
  color: ["Tan", "Brown"],
  price: 250,
  inStock: 3,
};

const renderPage = (category = "men", id = "p1") => {
  UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
  const store = configureStore({ reducer: { cart: cartReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/${category}/${id}`]}>
        <Routes>
          <Route path="/:category/:params" element={<ProductDetails category={category} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return store;
};

describe("ProductDetails", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows a loading state, then the product with its image", async () => {
    axios.get.mockResolvedValue({ data: { data: loafers } });
    renderPage();
    expect(screen.getByText("Loading product…")).toBeInTheDocument();

    expect(await screen.findByText("Suede Loafers")).toBeInTheDocument();
    expect(screen.getByText("$250")).toBeInTheDocument();
    // Images go through the API, which redirects to a signed S3 link.
    expect(screen.getByAltText("Suede Loafers").getAttribute("src")).toMatch(
      /\/products\/image\/loafers-key$/
    );
    expect(axios.get.mock.calls[0][0]).toMatch(/\/products\/men\/p1$/);
  });

  it("pre-selects the first size and colour and adds the choice to the cart", async () => {
    axios.get.mockResolvedValue({ data: { data: loafers } });
    const store = renderPage();
    await screen.findByText("Suede Loafers");

    expect(screen.getByLabelText("Size")).toHaveValue("US 8");
    expect(screen.getByRole("button", { name: "Tan" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByLabelText("Size"), { target: { value: "US 9" } });
    fireEvent.click(screen.getByRole("button", { name: "Brown" }));
    expect(screen.getByRole("button", { name: "Brown" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByLabelText("Increase quantity"));
    fireEvent.click(screen.getByText("Add to Cart"));

    const [item] = store.getState().cart.products;
    expect(item).toMatchObject({ _id: "p1", size: "US 9", color: "Brown", quantity: 2 });
    expect(screen.getByText(/Added to cart/)).toBeInTheDocument();
  });

  it("keeps multi-word sizes intact, including old comma-joined data", async () => {
    axios.get.mockResolvedValue({
      data: { data: { ...loafers, size: ["US 7, US 8"], color: ["Black Floral"] } },
    });
    renderPage();
    await screen.findByText("Suede Loafers");
    const options = [...screen.getByLabelText("Size").options].map((o) => o.value);
    expect(options).toEqual(["US 7", "US 8"]);
    expect(screen.getByRole("button", { name: "Black Floral" })).toBeInTheDocument();
  });

  it("does not let quantity exceed the stock", async () => {
    axios.get.mockResolvedValue({ data: { data: { ...loafers, inStock: 2 } } });
    renderPage();
    await screen.findByText("Suede Loafers");
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByLabelText("Increase quantity"));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("disables adding out-of-stock products", async () => {
    axios.get.mockResolvedValue({ data: { data: { ...loafers, inStock: 0 } } });
    renderPage();
    expect(await screen.findByText("Out of Stock")).toBeDisabled();
  });

  it("warns when only a few are left, but not when stock is plentiful or untracked", async () => {
    axios.get.mockResolvedValue({ data: { data: loafers } });
    renderPage();
    expect(await screen.findByText("Only 3 left")).toBeInTheDocument();
  });

  it.each([[{ inStock: 20 }], [{ inStock: undefined }], [{ inStock: 0 }]])(
    "shows no low-stock warning for %o",
    async (overrides) => {
      axios.get.mockResolvedValue({ data: { data: { ...loafers, ...overrides } } });
      renderPage();
      await screen.findByText("Suede Loafers");
      expect(screen.queryByText(/left$/)).not.toBeInTheDocument();
    }
  );

  it("shows the delivery and returns policies", async () => {
    axios.get.mockResolvedValue({ data: { data: loafers } });
    renderPage();
    await screen.findByText("Suede Loafers");
    expect(screen.getByText(/Free delivery in Singapore/)).toBeInTheDocument();
    expect(screen.getByText(/Free returns within 14 days/)).toBeInTheDocument();
    expect(document.title).toBe("Suede Loafers | Our Best Side");
  });

  it("shows 'not found' with a link back to the category", async () => {
    axios.get.mockRejectedValue({ response: { status: 404 } });
    renderPage("ladies", "missing");
    expect(await screen.findByText(/couldn't find this product/)).toBeInTheDocument();
    expect(screen.getByText("Browse Ladies' products")).toHaveAttribute("href", "/ladies");
  });

  it("shows an error when the server can't be reached", async () => {
    axios.get.mockRejectedValue({ request: {} });
    renderPage();
    expect(await screen.findByText(/couldn't load this product/)).toBeInTheDocument();
  });
});
