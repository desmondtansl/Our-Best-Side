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
    // The shop owner: an admin who can also grant and remove admin access.
    // Only set in the database (Atlas), never from the site.
    isOwner: {
      type: Boolean,
      default: false,
    },
    // Saved cards live in Stripe under this customer; we never store card data.
    stripeCustomerId: {
      type: String,
    },
    addresses: [addressSchema],
    // Raised by "Log out of all devices", a password change and turning
    // two-step login on or off: login tokens made before it stop working
    // (see tokens.js).
    tokenVersion: { type: Number, default: 0 },
    // Two-step login with an authenticator app (see totp.js). Required for
    // admins. `secret` is never sent to the browser after setup; `pending`
    // holds a new secret until the first code confirms it. `lastUsedStep`
    // stops a code being used twice. If the owner loses both the phone and
    // the recovery codes, set `twoFactor.enabled` to false in Atlas.
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String, select: false },
      pending: { type: String, select: false },
      lastUsedStep: { type: Number, select: false },
      recoveryCodes: { type: [String], select: false },
    },
  },
  { timestamps: true }
);
// An owner is always an admin, even if isAdmin wasn't also set.
export const isAdmin = (user) => Boolean(user?.isAdmin || user?.isOwner);

export const hasTwoFactor = (user) => Boolean(user?.twoFactor?.enabled);

export default mongoose.model("user", userSchema);
