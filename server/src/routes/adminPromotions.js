import express from "express";
import mongoose from "mongoose";
import Promotion, { promotionState } from "../models/Promotion.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { parsePromotion } from "../promotions.js";

const router = express.Router();

router.use(checkAuth, requireAdmin);

const badRequest = (res, error) => res.status(400).json({ data: "", error });
const notFound = (res) => res.status(404).json({ data: "", error: "Promotion not found" });

const withState = (promotion) => ({ ...promotion.toJSON(), state: promotionState(promotion) });

const duplicateCode = (error) =>
  error?.code === 11000 ? "Another promotion already uses that code" : null;

// LIST PROMOTIONS, newest first

router.get("/", async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ createdAt: -1, _id: -1 });
    return res.status(200).json({ data: promotions.map(withState), error: "" });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

// CREATE
// Body: { name, code, percentOff, startDate, endDate?, active? }

router.post("/", async (req, res) => {
  try {
    const { fields, error } = parsePromotion(req.body);
    if (error) return badRequest(res, error);
    const promotion = await Promotion.create(fields);
    return res.status(201).json({ data: withState(promotion), error: "" });
  } catch (error) {
    return badRequest(res, duplicateCode(error) || error.message);
  }
});

// EDIT (same body as create). Changing the percentage makes a new Stripe
// coupon on next use; orders already placed keep the discount they had.

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const existing = await Promotion.findById(req.params.id);
    if (!existing) return notFound(res);
    const { fields, error } = parsePromotion(req.body);
    if (error) return badRequest(res, error);
    const update = { $set: fields };
    if (fields.percentOff !== existing.percentOff) update.$unset = { stripeCouponId: 1 };
    if (!fields.endDate) {
      delete fields.endDate;
      delete fields.endsAt;
      update.$unset = { ...update.$unset, endDate: 1, endsAt: 1 };
    }
    const promotion = await Promotion.findByIdAndUpdate(req.params.id, update, { new: true });
    return res.status(200).json({ data: withState(promotion), error: "" });
  } catch (error) {
    return badRequest(res, duplicateCode(error) || error.message);
  }
});

// DELETE, only if it was never used; used promotions can be paused instead,
// so past orders still make sense.

router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return notFound(res);
    if (promotion.timesUsed > 0) {
      return badRequest(res, "This promotion has been used, so it can't be deleted. Pause it instead.");
    }
    await Promotion.deleteOne({ _id: promotion._id });
    return res.status(200).json({ data: { id: promotion.id }, error: "" });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

export default router;
