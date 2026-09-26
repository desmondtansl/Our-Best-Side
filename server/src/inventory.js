import Product from "./models/Product.js";

// Total quantity per product across cart lines (the same product can appear
// once per size/colour).
export const quantitiesByProduct = (items) => {
  const totals = new Map();
  for (const item of items) {
    const id = String(item.product ?? item.productId);
    totals.set(id, (totals.get(id) || 0) + item.quantity);
  }
  return totals;
};

// Message for the first product that doesn't have enough stock, or null.
// Products without a stock number are treated as unlimited.
export const findStockProblem = (items, productsById) => {
  for (const [id, quantity] of quantitiesByProduct(items)) {
    const product = productsById.get(id);
    if (typeof product?.inStock !== "number") continue;
    if (product.inStock <= 0) return `${product.title} is out of stock`;
    if (quantity > product.inStock) {
      return `Only ${product.inStock} left of ${product.title}`;
    }
  }
  return null;
};

// Takes an order's items out of stock (direction -1, when payment succeeds)
// or puts them back (+1, when an order is cancelled). Stock never goes below
// 0; overselling is logged so the owner can follow up.
export const adjustStock = async (items, direction) => {
  for (const [id, quantity] of quantitiesByProduct(items)) {
    const change = direction * quantity;
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
};
