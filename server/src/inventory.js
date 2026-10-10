import Product from "./models/Product.js";

// Stock is tracked either for a product as a whole (inStock) or, when the
// product has sizeStock, for each size, with inStock kept as their total.

// The admin dashboard lists products (or sizes) at or below this number as
// low stock. The same number as LOW_STOCK_THRESHOLD in
// client/src/config/store.js, where product pages start showing "Only N left".
export const LOW_STOCK_THRESHOLD = 3;

const idOf = (item) => String(item.product ?? item.productId);

// Total quantity per product across cart lines (the same product can appear
// once per size/colour).
export const quantitiesByProduct = (items) => {
  const totals = new Map();
  for (const item of items) {
    const id = idOf(item);
    totals.set(id, (totals.get(id) || 0) + item.quantity);
  }
  return totals;
};

// Quantity per size of one product across cart lines.
const quantitiesBySize = (items, id) => {
  const totals = new Map();
  for (const item of items) {
    if (idOf(item) !== id) continue;
    const size = item.size || "";
    totals.set(size, (totals.get(size) || 0) + item.quantity);
  }
  return totals;
};

const tracksSizes = (product) => product?.sizeStock?.length > 0;

// Message for the first product (or size) that doesn't have enough stock, or
// null. Products without a stock number are treated as unlimited.
export const findStockProblem = (items, productsById) => {
  for (const [id, quantity] of quantitiesByProduct(items)) {
    const product = productsById.get(id);
    if (tracksSizes(product)) {
      for (const [size, wanted] of quantitiesBySize(items, id)) {
        const entry = product.sizeStock.find((s) => s.size === size);
        if (!entry) return `Please choose an available size for ${product.title}`;
        if (entry.inStock <= 0) return `${product.title} in size ${size} is out of stock`;
        if (wanted > entry.inStock) {
          return `Only ${entry.inStock} left of ${product.title} in size ${size}`;
        }
      }
      continue;
    }
    if (typeof product?.inStock !== "number") continue;
    if (product.inStock <= 0) return `${product.title} is out of stock`;
    if (quantity > product.inStock) {
      return `Only ${product.inStock} left of ${product.title}`;
    }
  }
  return null;
};

// Stock never goes below 0. If two shoppers bought the last item at the same
// moment, it's set to 0 and logged so the owner can follow up.
const clampSizeStock = async (id) => {
  const product = await Product.findById(id);
  if (!product) return;
  let oversold = false;
  for (const entry of product.sizeStock) {
    if (entry.inStock < 0) {
      entry.inStock = 0;
      oversold = true;
    }
  }
  if (!oversold) return;
  product.inStock = product.sizeStock.reduce((sum, entry) => sum + entry.inStock, 0);
  await product.save();
  console.warn(`Product ${id} sold more than was in stock; stock set to 0.`);
};

// Takes an order's items out of stock (direction -1, when payment succeeds)
// or puts them back (+1, when an order is cancelled).
export const adjustStock = async (items, direction) => {
  for (const [id] of quantitiesByProduct(items)) {
    const product = await Product.findById(id, "sizeStock");
    if (!product) continue;
    for (const [size, quantity] of quantitiesBySize(items, id)) {
      const change = direction * quantity;
      if (tracksSizes(product)) {
        // The size's count and the product total change together.
        const result = await Product.updateOne(
          { _id: id, "sizeStock.size": size },
          { $inc: { "sizeStock.$.inStock": change, inStock: change } }
        );
        if (!result.matchedCount) {
          console.warn(`Product ${id} no longer has size "${size}"; its stock wasn't changed.`);
        } else if (direction < 0) {
          await clampSizeStock(id);
        }
        continue;
      }
      // Stock for the whole product (only when it's tracked at all).
      const result = await Product.updateOne(
        { _id: id, inStock: { $type: "number" } },
        { $inc: { inStock: change } }
      );
      if (direction < 0 && result.modifiedCount) {
        const clamped = await Product.updateOne(
          { _id: id, inStock: { $lt: 0 } },
          { $set: { inStock: 0 } }
        );
        if (clamped.modifiedCount) {
          console.warn(`Product ${id} sold more than was in stock; stock set to 0.`);
        }
      }
    }
  }
};
