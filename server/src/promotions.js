import stripe from "./stripe.js";
import Promotion, { promotionState, MAX_PERCENT_OFF } from "./models/Promotion.js";
import { DAY, parseShopDate } from "./shopTime.js";

export const MAX_BANNER_TEXT = 140;

const CODE_PATTERN = /^[A-Z0-9_-]{3,30}$/;

export const normaliseCode = (code) => String(code || "").trim().toUpperCase();

// Checks a promotion from the admin form. Returns { fields } or { error }.
export const parsePromotion = (body) => {
  const name = String(body?.name || "").trim();
  const code = normaliseCode(body?.code);
  const percentOff = Number(body?.percentOff);
  const startDate = String(body?.startDate || "");
  const endDate = String(body?.endDate || "");
  if (!name) return { error: "Enter a name for the promotion" };
  if (name.length > 80) return { error: "The name can be at most 80 characters" };
  const bannerText = String(body?.bannerText ?? "").trim();
  if (bannerText.length > MAX_BANNER_TEXT) {
    return { error: `The banner message can be at most ${MAX_BANNER_TEXT} characters` };
  }
  if (!CODE_PATTERN.test(code)) {
    return { error: "The code must be 3–30 letters, numbers, - or _, with no spaces" };
  }
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > MAX_PERCENT_OFF) {
    return { error: `The discount must be a whole number from 1 to ${MAX_PERCENT_OFF}%` };
  }
  const startsAt = parseShopDate(startDate);
  if (!startsAt) return { error: "Choose a start date" };
  let endsAt;
  if (endDate) {
    const lastDay = parseShopDate(endDate);
    if (!lastDay) return { error: "The end date isn't a real date" };
    if (lastDay < startsAt) return { error: "The end date can't be before the start date" };
    // Runs until the end of the last day.
    endsAt = new Date(lastDay.getTime() + DAY);
  }
  return {
    fields: {
      name,
      code,
      percentOff,
      startDate,
      endDate: endDate || undefined,
      startsAt,
      endsAt,
      active: body?.active === undefined ? true : Boolean(body.active),
      showBanner: body?.showBanner === undefined ? true : Boolean(body.showBanner),
      bannerText,
    },
  };
};

// The promotion for a code a shopper entered, if it can be used now.
// Returns { promotion } or { error } with a message for the shopper.
export const findUsablePromotion = async (rawCode) => {
  const code = normaliseCode(rawCode);
  if (!code) return { error: "Enter a discount code" };
  const promotion = CODE_PATTERN.test(code) ? await Promotion.findOne({ code }) : null;
  const state = promotion && promotionState(promotion);
  // Scheduled codes read as not valid, so trying codes can't reveal a
  // promotion before it starts.
  if (!promotion || state === "paused" || state === "scheduled") {
    return { error: "That discount code isn't valid" };
  }
  if (state === "ended") return { error: "That discount code has expired" };
  return { promotion };
};

// The Stripe coupon that applies the promotion at checkout, created on
// first use (and again if the percentage changed).
export const stripeCouponFor = async (promotion) => {
  if (promotion.stripeCouponId) return promotion.stripeCouponId;
  const coupon = await stripe.coupons.create({
    percent_off: promotion.percentOff,
    duration: "once",
    name: `${promotion.name} (${promotion.code})`.slice(0, 40),
    metadata: { promotionId: String(promotion._id), code: promotion.code },
  });
  await Promotion.updateOne({ _id: promotion._id }, { $set: { stripeCouponId: coupon.id } });
  return coupon.id;
};

// The discount on `amount` (in the currency), rounded to the cent as Stripe
// does.
export const discountOn = (amount, percentOff) =>
  Math.round(Math.round(amount * 100) * percentOff / 100) / 100;
