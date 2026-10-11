import mongoose from "mongoose";

const { Schema } = mongoose;

// What admins did in the admin pages, newest kept for a year: who, what and
// when. Only the owner can read it (Manage Admins → Admin activity).
const adminActivitySchema = new Schema(
  {
    by: { type: String, required: true },
    // e.g. "order.refund", "product.status", "promotion.create"
    action: { type: String, required: true },
    // A readable description, e.g. "Refunded $20.00 on order #ABCD1234".
    summary: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: { expires: 365 * 24 * 60 * 60 } },
  },
  { versionKey: false }
);

export default mongoose.model("adminActivity", adminActivitySchema);
