// Search, filters and sort live in the page address (e.g.
// /men?size=M&color=Black&sort=price-asc), so a filtered page can be
// shared or bookmarked and the Back button undoes the last change.

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

const SHOP_KEYS = ["q", "size", "color", "min", "max", "sort"];

export const readFilters = (searchParams) => ({
  q: searchParams.get("q") || "",
  sizes: searchParams.getAll("size"),
  colors: searchParams.getAll("color"),
  min: searchParams.get("min") || "",
  max: searchParams.get("max") || "",
  sort: searchParams.get("sort") || "newest",
});

// Number of size/colour/price filters in use (search and sort don't count).
export const activeFilterCount = (filters) =>
  filters.sizes.length +
  filters.colors.length +
  (filters.min ? 1 : 0) +
  (filters.max ? 1 : 0);

// Copy of the address's search params with `key` set to `values`
// (a string, a list, or empty to remove it).
export const withParam = (searchParams, key, values) => {
  const next = new URLSearchParams(searchParams);
  next.delete(key);
  for (const value of [].concat(values ?? [])) {
    if (value !== "") next.append(key, value);
  }
  return next;
};

// Removes every size, colour and price filter, keeping search and sort.
export const withoutFilters = (searchParams) => {
  const next = new URLSearchParams(searchParams);
  ["size", "color", "min", "max"].forEach((key) => next.delete(key));
  return next;
};

// API address for the shop endpoint, passing on only the shop's own params.
export const shopApiUrl = (searchParams, { category, limit } = {}) => {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  for (const key of SHOP_KEYS) {
    for (const value of searchParams.getAll(key)) params.append(key, value);
  }
  if (limit) params.set("limit", String(limit));
  return `${import.meta.env.VITE_BASE_URL}/products/shop?${params}`;
};

// Address of the search results page for a search.
export const searchPath = (q) => `/results?${new URLSearchParams({ q: q.trim() })}`;
