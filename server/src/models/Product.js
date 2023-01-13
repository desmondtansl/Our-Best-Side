import mongoose from "mongoose";

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: Array, required: true },
    size: { type: Array, required: true },
    color: { type: Array, required: true },
    price: { type: Number, required: true },
    inStock: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("product", productSchema);
