import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

  describe("You may also like", () => {
    const jacket = { _id: "j1", title: "Black Leather Jacket", price: 300, image: "jacket-key", category: ["Men"] };
    const dress = { _id: "d1", title: "Ladies Blue Dress", price: 80, image: "dress-key", category: ["Ladies"] };

    // `related` returns the promise for the suggestions request.
    const respond = (related) =>
      axios.get.mockImplementation((url) =>
        url.endsWith("/related") ? related() : Promise.resolve({ data: { data: loafers } })
      );

    it("shows similar products linking to their own pages", async () => {
      respond(() => Promise.resolve({ data: { data: [jacket, dress] } }));
      renderPage();
      const section = await screen.findByRole("region", { name: "You may also like" });
      const cards = within(section).getAllByTestId("related-product");
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveAttribute("href", "/men/j1");
      expect(cards[0]).toHaveTextContent("Black Leather Jacket$300");
      expect(cards[1]).toHaveAttribute("href", "/ladies/d1");
      expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/products\/p1\/related$/));
    });

    it("stays hidden when there's nothing to suggest", async () => {
      respond(() => Promise.resolve({ data: { data: [] } }));
      renderPage();
      await screen.findByText("Suede Loafers");
      await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
      expect(screen.queryByText("You may also like")).not.toBeInTheDocument();
    });

    it("stays hidden when loading suggestions fails", async () => {
      respond(() => Promise.reject(new Error("Network Error")));
      renderPage();
      await screen.findByText("Suede Loafers");
      await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
      expect(screen.queryByText("You may also like")).not.toBeInTheDocument();
    });
  });

  describe("photos and stock per size", () => {
    const shirt = {
      ...loafers,
      title: "Linen Shirt",
      category: ["Men"],
      image: "front",
      images: ["front", "back"],
      size: ["S", "M", "L"],
      color: ["White"],
      inStock: 4,
      sizeStock: [
        { size: "S", inStock: 0 },
        { size: "M", inStock: 2 },
        { size: "L", inStock: 2 },
      ],
    };

    const respondWith = (product) =>
      axios.get.mockImplementation((url) =>
        Promise.resolve({ data: { data: url.endsWith("/related") ? [] : product } })
      );

    it("shows every photo in the gallery", async () => {
      respondWith(shirt);
      renderPage();
      await screen.findByText("Linen Shirt");
      expect(screen.getAllByRole("button", { name: /Show photo/ })).toHaveLength(2);
    });

    it("marks sold-out sizes and starts on the first size in stock", async () => {
      respondWith(shirt);
      renderPage();
      await screen.findByText("Linen Shirt");
      const options = [...screen.getByLabelText("Size").options];
      expect(options.map((o) => [o.textContent, o.disabled])).toEqual([
        ["S (sold out)", true],
        ["M", false],
        ["L", false],
      ]);
      expect(screen.getByLabelText("Size")).toHaveValue("M");
      expect(screen.getByText("Only 2 left in size M")).toBeInTheDocument();
    });

    it("limits the quantity to the chosen size's stock and keeps it in the cart", async () => {
      respondWith(shirt);
      const store = renderPage();
      await screen.findByText("Linen Shirt");
      for (let i = 0; i < 4; i++) fireEvent.click(screen.getByLabelText("Increase quantity"));
      expect(screen.getByText("2")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Add to Cart"));
      expect(store.getState().cart.products[0]).toMatchObject({ size: "M", quantity: 2, inStock: 2 });
    });

    it("shows Out of Stock when every size has sold out", async () => {
      respondWith({
        ...shirt,
        inStock: 0,
        sizeStock: shirt.sizeStock.map((s) => ({ ...s, inStock: 0 })),
      });
      renderPage();
      expect(await screen.findByText("Out of Stock")).toBeDisabled();
    });

    it("offers a size guide for the product", async () => {
      respondWith(shirt);
      renderPage();
      await screen.findByText("Linen Shirt");
      fireEvent.click(screen.getByRole("button", { name: "Size guide" }));
      expect(screen.getByRole("dialog", { name: "Size guide" })).toHaveTextContent("Men's clothing");
    });
  });
});
