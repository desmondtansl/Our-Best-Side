// Normalises product form input. Admin forms send sizes/colours as text such
// as "S, M, L" or "US 8, US 9", or as repeated form fields.

export const CATEGORIES = ["Men", "Ladies"];

const CATEGORY_ALIASES = {
  men: "Men",
  mens: "Men",
  ladies: "Ladies",
  lady: "Ladies",
  women: "Ladies",
  womens: "Ladies",
};

// "S, M ,L" / ["S", " M"] / "S" -> ["S", "M", "L"]; splits on commas only so
// values like "US 8" stay intact. Empty entries and duplicates are dropped.
export const parseList = (value) => {
  const raw = Array.isArray(value) ? value : [value];
  const items = raw
    .flatMap((entry) => String(entry ?? "").split(","))
    .map((entry) => entry.trim())
    .filter(Boolean);
  return [...new Set(items)];
};

export const parseCategories = (value) => [
  ...new Set(
    parseList(value).map(
      (category) =>
        CATEGORY_ALIASES[category.toLowerCase().replace(/[^a-z]/g, "")] || category
    )
  ),
];

export const parseBoolean = (value) =>
  value === true || ["true", "on", "1", "yes"].includes(String(value).toLowerCase());

// Returns { fields } with normalised values for the keys present in `body`,
// or { error } when a value is invalid.
export const parseProductFields = (body, { requireAll = false } = {}) => {
  const fields = {};
  const has = (key) => body[key] !== undefined;

  for (const key of ["title", "description"]) {
    if (has(key)) fields[key] = String(body[key]).trim();
  }
  if (has("category")) fields.category = parseCategories(body.category);
  if (has("size")) fields.size = parseList(body.size);
  if (has("color")) fields.color = parseList(body.color);
  if (has("featured")) fields.featured = parseBoolean(body.featured);

  if (has("price")) {
    const price = Number(String(body.price).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(price) || price <= 0) {
      return { error: "Price must be a number greater than 0" };
    }
    fields.price = Math.round(price * 100) / 100;
  }
  if (has("inStock")) {
    const inStock = Number(body.inStock);
    if (!Number.isInteger(inStock) || inStock < 0) {
      return { error: "Inventory quantity must be a whole number" };
    }
    fields.inStock = inStock;
  }

  if (requireAll) {
    if (!fields.title) return { error: "Title is required" };
    if (fields.price === undefined) return { error: "Price is required" };
    if (!fields.category?.length) return { error: "Category is required" };
  }
  if (fields.category && !fields.category.some((c) => CATEGORIES.includes(c))) {
    return { error: `Category must include ${CATEGORIES.join(" or ")}` };
  }
  if (has("title") && !fields.title) return { error: "Title is required" };

  return { fields };
};
