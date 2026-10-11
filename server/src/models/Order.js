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
    // The product photo's S3 key at the time of the order (indexed: the
    // image route checks a photo belongs to the shop).
    image: { type: String, index: true },
    size: { type: String },
    color: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// Each status change, oldest first. `by` is the admin's email, or empty for
// changes made by the site itself (e.g. Stripe confirming payment).
const statusChangeSchema = new Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true },
    by: { type: String },
  },
  { _id: false }
);

// A refund made through Stripe, from the admin pages or in Stripe itself.
const refundSchema = new Schema(
  {
    stripeRefundId: { type: String, required: true },
    amount: { type: Number, required: true },
    at: { type: Date, required: true },
    // The admin's email, or empty when the refund was made in Stripe.
    by: { type: String },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    // Empty for guest checkouts.
    user: { type: Schema.Types.ObjectId, ref: "user", index: true },
    email: { type: String, trim: true, lowercase: true },
    items: [orderItemSchema],
    // What the customer paid for the items: itemsTotal less any discount.
    subtotal: { type: Number, required: true },
    // The items at their prices, before a discount code. Empty on orders
    // from before discount codes, where it equals subtotal.
    itemsTotal: { type: Number },
    // The discount code used, if any. `amount` is what it took off.
    discount: {
      promotion: { type: Schema.Types.ObjectId, ref: "promotion" },
      code: { type: String },
      name: { type: String },
      percentOff: { type: Number },
      amount: { type: Number },
    },
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
    statusHistory: [statusChangeSchema],
    // Set when the order is shipped; the customer sees it in their account.
    tracking: {
      courier: { type: String, trim: true },
      number: { type: String, trim: true },
      url: { type: String, trim: true },
    },
    // Admins only: never shown to the customer.
    notes: { type: String, default: "" },
    refunds: [refundSchema],
    // Total of `refunds`, in the order's currency.
    refundedTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// What can still be refunded, in the order's currency.
export const refundableAmount = (order) =>
  Math.max(0, Math.round(((order.subtotal || 0) - (order.refundedTotal || 0)) * 100) / 100);

export default mongoose.model("order", orderSchema);
