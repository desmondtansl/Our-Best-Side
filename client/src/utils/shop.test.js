import {
  readFilters,
  activeFilterCount,
  withParam,
  withoutFilters,
  shopApiUrl,
  searchPath,
} from "./shop";

describe("shop address helpers", () => {
  const params = new URLSearchParams("q=tee&size=S&size=M&color=Black&min=10&sort=price-asc&page=2");

  it("reads filters and counts the ones in use", () => {
    const filters = readFilters(params);
    expect(filters).toEqual({
      q: "tee",
      sizes: ["S", "M"],
      colors: ["Black"],
      min: "10",
      max: "",
      sort: "price-asc",
    });
    expect(activeFilterCount(filters)).toBe(4);
    expect(readFilters(new URLSearchParams()).sort).toBe("newest");
  });

  it("sets, replaces and removes params without changing the original", () => {
    expect(withParam(params, "size", ["L"]).getAll("size")).toEqual(["L"]);
    expect(withParam(params, "min", "").has("min")).toBe(false);
    expect(withParam(params, "max", "99").get("max")).toBe("99");
    expect(params.getAll("size")).toEqual(["S", "M"]);
    expect(withoutFilters(params).toString()).toBe("q=tee&sort=price-asc&page=2");
  });

  it("builds the API address from the shop's own params only", () => {
    const url = new URL(shopApiUrl(params, { category: "men", limit: 5 }), "http://localhost");
    expect(url.pathname).toMatch(/\/products\/shop$/);
    expect(url.searchParams.get("category")).toBe("men");
    expect(url.searchParams.getAll("size")).toEqual(["S", "M"]);
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("builds a results page address", () => {
    expect(searchPath("  black & white ")).toBe("/results?q=black+%26+white");
  });
});
