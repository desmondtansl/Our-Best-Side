// Fills in the addresses in public/_headers when the site is built, so the
// Content-Security-Policy names the shop's own API and photo bucket instead
// of every site on Render or AWS.

// The shop's S3 bucket (see render.yaml), where product photo links lead.
export const DEFAULT_IMAGE_ORIGIN = "https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com";

// "https://api.example.com/some/path" -> "https://api.example.com".
const originOf = (url, name) => {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch (error) {
    parsed = null;
  }
  if (!parsed || !["https:", "http:"].includes(parsed.protocol)) {
    throw new Error(`${name} must be a web address such as https://ourbestside-api.onrender.com`);
  }
  return parsed.origin;
};

export const fillHeaders = (text, { apiUrl, imageOrigin } = {}) => {
  const filled = text
    .replaceAll("%API_ORIGIN%", originOf(apiUrl, "VITE_BASE_URL"))
    .replaceAll("%IMAGE_ORIGIN%", originOf(imageOrigin || DEFAULT_IMAGE_ORIGIN, "VITE_IMAGE_ORIGIN"));
  // Only placeholders in the header lines matter; the comments mention them too.
  const unfilled = filled.split("\n").some((line) => !line.startsWith("#") && /%[A-Z_]+%/.test(line));
  if (unfilled) throw new Error("public/_headers has an address that wasn't filled in");
  return filled;
};
