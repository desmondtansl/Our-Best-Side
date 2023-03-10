import mongoose from "mongoose";

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    title: { type: String },
    description: { type: String },
    image: { type: String },
    category: [{ type: String }],
    size: [{ type: String }],
    color: [{ type: String }],
    price: { type: Number },
    inStock: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("product", productSchema);
