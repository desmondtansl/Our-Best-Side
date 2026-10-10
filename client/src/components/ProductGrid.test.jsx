import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
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

const dress = { _id: "d1", title: "Ladies Blue Dress", price: 80, image: "dress-key", category: ["Ladies"] };
const jacket = { _id: "j1", title: "Black Leather Jacket", price: 250, image: "jacket-key", category: ["Men"] };

const facets = {
  sizes: ["S", "M", "L"],
  colors: ["Black", "White"],
  price: { min: 60, max: 250 },
};

const respond = (data, extra = { facets }) =>
  axios.get.mockResolvedValue({ data: { data, error: "", ...extra } });

function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const renderGrid = (category, url = category ? `/${category}` : "/results") => {
  UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
  return render(
    <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="*" element={<ProductGrid category={category} />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </Provider>
  );
};

// The shop API address of the latest request, as URLSearchParams.
const lastRequest = () => {
  const url = axios.get.mock.calls.at(-1)[0];
  expect(url).toMatch(/\/products\/shop\?/);
  return new URL(url, "http://localhost").searchParams;
};

const location = () => screen.getByTestId("location").textContent;

describe("ProductGrid", () => {
  afterEach(() => vi.clearAllMocks());

  it("lists a category's products linking to their pages, with a count", async () => {
    respond([dress]);
    renderGrid("ladies");
    expect(screen.getByText("Loading products…")).toBeInTheDocument();

    const card = await screen.findByTestId("product-card");
    expect(card).toHaveTextContent("Ladies Blue Dress");
    expect(card).toHaveTextContent("$ 80");
    expect(screen.getByAltText("Ladies Blue Dress").closest("a")).toHaveAttribute(
      "href",
      "/ladies/d1"
    );
    expect(screen.getByText("1 product")).toBeInTheDocument();
    expect(lastRequest().get("category")).toBe("ladies");
    expect(document.title).toBe("Ladies | Our Best Side");
  });

  it("shows an empty message without a stray 0", async () => {
    respond([]);
    renderGrid("men");
    const message = await screen.findByText(/No products here yet/);
    // (The navbar's cart badge has its own 0, so look only at the listing.)
    expect(within(message.parentElement).queryByText("0")).not.toBeInTheDocument();
  });

  it("shows an error when loading fails", async () => {
    axios.get.mockRejectedValue(new Error("Network Error"));
    renderGrid("men");
    expect(await screen.findByText(/couldn't load products/)).toBeInTheDocument();
  });

  it("filters by size and colour, keeping choices in the address", async () => {
    respond([jacket]);
    renderGrid("men");
    await screen.findByTestId("product-card");

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));
    const sizes = screen.getByRole("group", { name: "Size" });
    fireEvent.click(within(sizes).getByRole("button", { name: "M" }));

    await waitFor(() => expect(lastRequest().getAll("size")).toEqual(["M"]));
    expect(location()).toBe("/men?size=M");
    expect(within(sizes).getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(sizes).getByRole("button", { name: "L" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Colour" })).getByRole("button", { name: "Black" })
    );
    await waitFor(() => expect(location()).toBe("/men?size=M&size=L&color=Black"));
    expect(lastRequest().get("category")).toBe("men");
    expect(screen.getByRole("button", { name: "Filters (3)" })).toBeInTheDocument();

    // Clicking a chosen size again removes it.
    fireEvent.click(within(sizes).getByRole("button", { name: "M" }));
    await waitFor(() => expect(location()).toBe("/men?color=Black&size=L"));
  });

  it("applies a price range on Enter and clears all filters", async () => {
    respond([jacket]);
    renderGrid("men");
    await screen.findByTestId("product-card");
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const min = screen.getByLabelText("Minimum price");
    expect(min).toHaveAttribute("placeholder", "$60");
    fireEvent.change(min, { target: { value: "50" } });
    fireEvent.keyDown(min, { key: "Enter" });
    await waitFor(() => expect(location()).toBe("/men?min=50"));
    expect(lastRequest().get("min")).toBe("50");

    // Invalid prices are ignored rather than sent.
    const max = screen.getByLabelText("Maximum price");
    fireEvent.change(max, { target: { value: "-3" } });
    fireEvent.blur(max);
    expect(location()).toBe("/men?min=50");

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(location()).toBe("/men"));
    expect(screen.getByLabelText("Minimum price")).toHaveValue(null);
  });

  it("sorts by price, and drops the default sort from the address", async () => {
    respond([jacket]);
    renderGrid("men");
    await screen.findByTestId("product-card");

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price-asc" } });
    await waitFor(() => expect(lastRequest().get("sort")).toBe("price-asc"));
    expect(location()).toBe("/men?sort=price-asc");

    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "newest" } });
    await waitFor(() => expect(location()).toBe("/men"));
  });

  it("restores filters from a shared link, with the panel open", async () => {
    respond([jacket]);
    renderGrid("men", "/men?size=M&color=Black&sort=price-desc&utm_source=x");
    await screen.findByTestId("product-card");

    expect(screen.getByRole("button", { name: "Filters (2)" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Sort by")).toHaveValue("price-desc");
    const params = lastRequest();
    expect(params.get("size")).toBe("M");
    expect(params.get("color")).toBe("Black");
    expect(params.get("sort")).toBe("price-desc");
    expect(params.has("utm_source")).toBe(false); // only the shop's own params
  });

  it("offers to clear filters when nothing matches", async () => {
    respond([]);
    renderGrid("men", "/men?color=Pink");
    expect(await screen.findByText(/No products match these filters/)).toBeInTheDocument();
    // Pink is no longer offered, but stays visible so it can be switched off.
    expect(screen.getByRole("button", { name: "Pink" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(location()).toBe("/men"));
    expect(await screen.findByText(/No products here yet/)).toBeInTheDocument();
  });
});

describe("search results", () => {
  afterEach(() => vi.clearAllMocks());

  it("searches both categories and links each product to its own page", async () => {
    respond([jacket, dress]);
    renderGrid(undefined, "/results?q=black");

    expect(screen.getByRole("heading", { name: 'Results for "black"' })).toBeInTheDocument();
    const cards = await screen.findAllByTestId("product-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByAltText("Black Leather Jacket").closest("a")).toHaveAttribute("href", "/men/j1");
    expect(screen.getByAltText("Ladies Blue Dress").closest("a")).toHaveAttribute("href", "/ladies/d1");

    const params = lastRequest();
    expect(params.get("q")).toBe("black");
    expect(params.has("category")).toBe(false);
    expect(document.title).toBe("Search: black | Our Best Side");
  });

  it("suggests browsing when there are no results", async () => {
    respond([]);
    renderGrid(undefined, "/results?q=zzz");
    const message = await screen.findByText(/No results for "zzz"/);
    expect(within(message).getByRole("link", { name: "Men" })).toHaveAttribute("href", "/men");
    expect(within(message).getByRole("link", { name: "Ladies" })).toHaveAttribute("href", "/ladies");
  });

  it("shows every product when there's no search", async () => {
    respond([jacket, dress]);
    renderGrid(undefined, "/results");
    expect(screen.getByRole("heading", { name: "All products" })).toBeInTheDocument();
    expect(await screen.findAllByTestId("product-card")).toHaveLength(2);
  });
});
