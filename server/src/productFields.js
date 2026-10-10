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
  // The "was" price for a sale; empty ends the sale.
  if (has("compareAtPrice")) {
    const text = String(body.compareAtPrice).replace(/[$,\s]/g, "");
    if (text === "" || text === "null") {
      fields.compareAtPrice = null;
    } else {
      const was = Number(text);
      if (!Number.isFinite(was) || was <= 0) {
        return { error: "The \"was\" price must be a number greater than 0" };
      }
      fields.compareAtPrice = Math.round(was * 100) / 100;
    }
  }
  // New products can be saved as drafts; the status is changed afterwards
  // with Publish, Archive and Restore.
  if (has("status")) {
    const status = String(body.status);
    if (!["live", "draft"].includes(status)) return { error: "Status must be live or draft" };
    fields.status = status;
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

const MAX_SIZES = 50;
const INVALID_SIZE_STOCK = "Stock per size isn't valid";

// Stock per size from the admin forms, sent as JSON such as {"S": 3, "M": 0}.
// Every size must have a whole number of 0 or more. Returns { sizeStock }
// (in the order of `sizes`; an empty list turns per-size stock off) or
// { error }.
export const parseSizeStock = (raw, sizes) => {
  let values = raw;
  if (typeof raw === "string") {
    if (raw.trim() === "") return { sizeStock: [] };
    try {
      values = JSON.parse(raw);
    } catch (error) {
      return { error: INVALID_SIZE_STOCK };
    }
  }
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return { error: INVALID_SIZE_STOCK };
  }
  const given = Object.keys(values);
  if (given.length === 0) return { sizeStock: [] };
  if (given.length > MAX_SIZES) return { error: INVALID_SIZE_STOCK };

  const unknown = given.filter((size) => !sizes.includes(size));
  if (unknown.length) {
    return { error: `Stock was given for a size the product doesn't have: ${unknown.join(", ")}` };
  }
  const missing = sizes.filter((size) => !Object.hasOwn(values, size));
  if (missing.length) {
    return { error: `Enter the stock for every size (missing: ${missing.join(", ")})` };
  }
  const sizeStock = [];
  for (const size of sizes) {
    const value = values[size];
    const quantity = Number(value);
    if (value === "" || value === null || !Number.isInteger(quantity) || quantity < 0) {
      return { error: `Stock for size ${size} must be a whole number of 0 or more` };
    }
    sizeStock.push({ size, inStock: quantity });
  }
  return { sizeStock };
};

export const totalStock = (sizeStock) =>
  sizeStock.reduce((sum, entry) => sum + entry.inStock, 0);
