import mongoose from "mongoose";

const { Schema } = mongoose;

const cartSchema = new Schema(
  {
    userId: { type: String, required: true },
    products: [
      {
        productId: { type: String },
        quantity: { type: Number, default: 1 },
        price: { type: Number },
      },
    ],
  },
  { timestamps: true }
);
export default mongoose.model("cart", cartSchema);
