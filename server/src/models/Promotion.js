import mongoose from "mongoose";

const { Schema } = mongoose;

export const MAX_PERCENT_OFF = 90;

// A discount code shoppers enter in the cart, e.g. "WELCOME10" for 10% off.
// It works from the start of `startDate` to the end of `endDate` (Singapore
// time; no end date means it runs until paused). The Stripe coupon that
// applies the discount at checkout is created the first time it's used.
const promotionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    percentOff: { type: Number, required: true, min: 1, max: MAX_PERCENT_OFF },
    // As entered ("YYYY-MM-DD"), and as the moments they start and end.
    startDate: { type: String, required: true },
    endDate: { type: String },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    // While running, the promotion is announced in a banner on the homepage
    // (unless turned off). Empty text means the standard wording.
    showBanner: { type: Boolean, default: true },
    bannerText: { type: String, trim: true, default: "" },
    // Paused promotions can't be used, whatever their dates.
    active: { type: Boolean, default: true },
    stripeCouponId: { type: String },
    // Paid orders that used the code.
    timesUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// "paused", "scheduled", "running" or "ended".
export const promotionState = (promotion, now = new Date()) => {
  if (!promotion.active) return "paused";
  if (now < promotion.startsAt) return "scheduled";
  if (promotion.endsAt && now >= promotion.endsAt) return "ended";
  return "running";
};

// The homepage banner's wording.
export const bannerTextFor = (promotion) =>
  promotion.bannerText || `Use promo code ${promotion.code} for ${promotion.percentOff}% off!`;

export default mongoose.model("promotion", promotionSchema);
