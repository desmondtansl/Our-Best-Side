import mongoose from "mongoose";

const { Schema } = mongoose;

// "pending" orders are created when checkout starts and become "paid" once
// the Stripe webhook confirms payment. They are hidden from order history.
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "product" },
    title: { type: String },
    image: { type: String },
    size: { type: String },
    color: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    // Empty for guest checkouts.
    user: { type: Schema.Types.ObjectId, ref: "user", index: true },
    email: { type: String, trim: true, lowercase: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    currency: { type: String, required: true },
    shippingAddress: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    paymentMethod: {
      brand: String,
      last4: String,
    },
    stripeSessionId: { type: String, index: true, unique: true, sparse: true },
    stripePaymentIntentId: { type: String },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("order", orderSchema);
