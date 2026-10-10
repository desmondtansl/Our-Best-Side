import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import SearchBar from "./SearchBar";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));

const jacket = { _id: "j1", title: "Black Leather Jacket", price: 250, image: "jacket-key", category: ["Men"] };
const dress = { _id: "d1", title: "Ladies Blue Dress", price: 80, image: "dress-key", category: ["Ladies"] };

function Location() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const renderSearch = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="*" element={<SearchBar />} />
      </Routes>
      <Location />
    </MemoryRouter>
  );

const location = () => screen.getByTestId("location").textContent;
const input = () => screen.getByRole("combobox", { name: "Search products" });
const type = (value) => fireEvent.change(input(), { target: { value } });

describe("SearchBar", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: [jacket, dress], error: "" } });
  });
  afterEach(() => vi.clearAllMocks());

  it("suggests products after two characters, linking to their pages", async () => {
    renderSearch();
    type("b");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(axios.get).not.toHaveBeenCalled();

    type("bl");
    const list = await screen.findByRole("listbox", { name: "Search suggestions" });
    expect(input()).toHaveAttribute("aria-expanded", "true");
    const url = new URL(axios.get.mock.calls.at(-1)[0], "http://localhost");
    expect(url.pathname).toMatch(/\/products\/shop$/);
    expect(url.searchParams.get("q")).toBe("bl");
    expect(url.searchParams.get("limit")).toBe("5");

    const options = within(list).getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Black Leather Jacket$250");
    expect(within(options[0]).getByRole("link")).toHaveAttribute("href", "/men/j1");
    expect(within(options[1]).getByRole("link")).toHaveAttribute("href", "/ladies/d1");
    expect(options[2]).toHaveTextContent('See all results for "bl"');
  });

  it("waits for typing to pause before asking the server", async () => {
    renderSearch();
    type("bl");
    type("bla");
    type("blac");
    await screen.findByRole("listbox");
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it("opens the results page on Enter", async () => {
    renderSearch();
    type("  black jacket ");
    fireEvent.submit(input());
    expect(location()).toBe("/results?q=black+jacket");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does nothing for an empty search", () => {
    renderSearch("/men");
    type("   ");
    fireEvent.submit(input());
    expect(location()).toBe("/men");
  });

  it("moves through suggestions with the arrow keys and opens one with Enter", async () => {
    renderSearch();
    type("bl");
    await screen.findByRole("listbox");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(input()).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(location()).toBe("/ladies/d1");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("wraps around to 'See all results' with ArrowUp", async () => {
    renderSearch();
    type("bl");
    await screen.findByRole("listbox");
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    fireEvent.keyDown(input(), { key: "Enter" });
    expect(location()).toBe("/results?q=bl");
  });

  it("closes with Escape", async () => {
    renderSearch();
    type("bl");
    await screen.findByRole("listbox");
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    axios.get.mockResolvedValue({ data: { data: [], error: "" } });
    renderSearch();
    type("zz");
    expect(await screen.findByText("No matching products")).toBeInTheDocument();
  });

  it("shows the current search on the results page, without opening suggestions", async () => {
    renderSearch("/results?q=black%20jacket");
    expect(input()).toHaveValue("black jacket");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
