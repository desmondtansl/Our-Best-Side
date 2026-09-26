import mongoose from "mongoose";

const { Schema } = mongoose;

const addressSchema = new Schema({
  label: { type: String, trim: true },
  fullName: { type: String, trim: true, required: true },
  line1: { type: String, trim: true, required: true },
  line2: { type: String, trim: true },
  city: { type: String, trim: true, required: true },
  state: { type: String, trim: true },
  postalCode: { type: String, trim: true, required: true },
  country: { type: String, trim: true, uppercase: true, required: true },
  phone: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
});

const userSchema = new Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      minLength: 8,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    // Saved cards live in Stripe under this customer; we never store card data.
    stripeCustomerId: {
      type: String,
    },
    addresses: [addressSchema],
  },
  { timestamps: true }
);
export default mongoose.model("user", userSchema);
