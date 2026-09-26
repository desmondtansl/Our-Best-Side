// Product images live in the S3 bucket, which serves them publicly.
export const IMAGE_BASE_URL =
  import.meta.env.VITE_IMAGE_BASE_URL ||
  "https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com";

export const productImageUrl = (key) => (key ? `${IMAGE_BASE_URL}/${key}` : undefined);

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
