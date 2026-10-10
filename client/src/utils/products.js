// Product images are served through the API, which redirects to a short-lived
// signed S3 link, so the bucket doesn't have to be public.
// VITE_IMAGE_BASE_URL can point straight at a public image host instead.
export const productImageUrl = (key) => {
  if (!key) return undefined;
  const direct = import.meta.env.VITE_IMAGE_BASE_URL;
  return direct
    ? `${direct}/${key}`
    : `${import.meta.env.VITE_BASE_URL}/products/image/${encodeURIComponent(key)}`;
};

// Sizes/colours as a clean list. Older products may store "S, M" as a single
// entry, so split on commas (never on spaces, to keep "US 8" intact).
export const toOptions = (list) => [
  ...new Set(
    (Array.isArray(list) ? list : [list])
      .flatMap((value) => String(value ?? "").split(","))
      .map((value) => value.trim())
      .filter(Boolean)
  ),
];

// Link for a product page, based on its category.
export const productPath = (product) =>
  `/${product.category?.includes("Ladies") ? "ladies" : "men"}/${product._id}`;

// Every photo's key, main photo first. Products from before multiple photos
// were supported only have `image`.
export const productPhotos = (product) =>
  product?.images?.length ? product.images : [product?.image].filter(Boolean);

// True when stock is tracked per size (product.sizeStock).
export const tracksSizeStock = (product) => product?.sizeStock?.length > 0;

// Stock for one size, or undefined when stock isn't tracked per size.
// A size missing from sizeStock counts as sold out.
export const sizeStockFor = (product, size) => {
  if (!tracksSizeStock(product)) return undefined;
  return product.sizeStock.find((entry) => entry.size === size)?.inStock ?? 0;
};
