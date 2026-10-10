// Size guide shown on product pages ("Size guide" next to the size picker).
//
// ⚠️ PLACEHOLDER MEASUREMENTS: typical sizing, not this shop's garments.
// Replace them with your own measurements before going live. All values are
// body measurements in centimetres (except shoe sizes).

export const SIZE_CHARTS = {
  mens: {
    title: "Men's clothing",
    columns: ["Size", "Chest", "Waist"],
    rows: [
      ["XS", "84–89", "71–76"],
      ["S", "89–94", "76–81"],
      ["M", "97–102", "84–89"],
      ["L", "104–109", "91–97"],
      ["XL", "112–117", "99–104"],
      ["XXL", "119–124", "107–112"],
    ],
  },
  ladies: {
    title: "Ladies' clothing",
    columns: ["Size", "Bust", "Waist", "Hips"],
    rows: [
      ["XS", "80–83", "62–65", "86–89"],
      ["S", "84–87", "66–69", "90–93"],
      ["M", "88–92", "70–74", "94–98"],
      ["L", "93–97", "75–79", "99–103"],
      ["XL", "98–103", "80–85", "104–109"],
    ],
  },
  jeans: {
    title: "Jeans (waist size)",
    columns: ["Size", "Waist", "Hips"],
    rows: [
      ["24", "61", "86"],
      ["25", "64", "89"],
      ["26", "66", "91"],
      ["27", "69", "94"],
      ["28", "71", "97"],
      ["29", "74", "99"],
      ["30", "76", "102"],
      ["31", "79", "104"],
      ["32", "81", "107"],
    ],
  },
  shoes: {
    title: "Shoes",
    columns: ["US", "UK", "EU", "Foot length"],
    rows: [
      ["6", "5", "39", "24"],
      ["7", "6", "40", "25"],
      ["8", "7", "41", "26"],
      ["9", "8", "42.5", "27"],
      ["10", "9", "44", "28"],
      ["11", "10", "45", "29"],
      ["12", "11", "46", "30"],
    ],
  },
};

// Measuring tips shown under each chart.
const CHEST = "Chest / bust: around the fullest part, keeping the tape level.";
const WAIST = "Waist: around your natural waistline, the narrowest part.";
const HIPS = "Hips: around the fullest part, with your feet together.";
const BETWEEN = "Between sizes? Choose the larger size for a relaxed fit.";

export const HOW_TO_MEASURE = {
  mens: [CHEST, WAIST, BETWEEN],
  ladies: [CHEST, WAIST, HIPS, BETWEEN],
  jeans: [WAIST, HIPS, BETWEEN],
  shoes: [
    "Foot length: stand on a sheet of paper and measure from your heel to your longest toe.",
    "Between sizes? Choose the larger size.",
  ],
};

// Which chart suits a product, from its sizes: "US 9" → shoes, "28" → jeans,
// otherwise clothing for the product's category. null when it has no sizes.
export const pickSizeChart = (product, sizes) => {
  if (!sizes.length) return null;
  if (sizes.some((size) => /^US\s*\d/i.test(size))) return "shoes";
  if (sizes.every((size) => /^\d+$/.test(size))) return "jeans";
  return product?.category?.includes("Ladies") ? "ladies" : "mens";
};

// The chart row for a size ("US 9" matches the US column's "9").
export const chartRowFor = (size) => String(size).replace(/^US\s*/i, "").toUpperCase();
