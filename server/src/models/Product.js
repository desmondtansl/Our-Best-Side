import mongoose from "mongoose";

const { Schema } = mongoose;

export const MAX_PHOTOS = 8;

// Stock for one size, when stock is tracked per size.
const sizeStockSchema = new Schema(
  {
    size: { type: String, required: true },
    inStock: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    title: { type: String },
    description: { type: String },
    // The main photo's S3 key: always the first of `images`. Listings, the
    // cart, checkout and orders use it.
    image: { type: String },
    // Every photo's S3 key, main photo first (up to MAX_PHOTOS). Products
    // created before multiple photos were supported only have `image`.
    images: [{ type: String }],
    category: [{ type: String }],
    size: [{ type: String }],
    color: [{ type: String }],
    price: { type: Number },
    // Total stock. When sizeStock is used, this is the sum of every size and
    // is kept up to date automatically. Empty means stock isn't tracked.
    inStock: { type: Number },
    // Optional stock per size, e.g. [{ size: "M", inStock: 3 }]. Empty means
    // stock is tracked for the product as a whole (inStock).
    sizeStock: [sizeStockSchema],
    // Shown in the homepage "Featured Products" section.
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Every photo, main photo first (works for older one-photo products too).
export const productPhotos = (product) =>
  product?.images?.length ? [...product.images] : [product?.image].filter(Boolean);

export default mongoose.model("product", productSchema);
