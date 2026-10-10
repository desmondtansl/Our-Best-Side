import express from "express";
import Promotion, { bannerTextFor } from "../models/Promotion.js";

const router = express.Router();

// At most this many banners show at once (newest first).
const MAX_BANNERS = 3;

// HOMEPAGE BANNERS: promotions running now with their banner turned on.
// Public, since the point is to tell shoppers the code.

router.get("/banners", async (req, res) => {
  try {
    const now = new Date();
    const promotions = await Promotion.find({
      active: true,
      showBanner: { $ne: false },
      startsAt: { $lte: now },
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_BANNERS);
    // Browsers may reuse the answer for a minute.
    res.set("Cache-Control", "public, max-age=60");
    return res.status(200).json({
      data: promotions.map((promotion) => ({
        code: promotion.code,
        percentOff: promotion.percentOff,
        endDate: promotion.endDate || null,
        text: bannerTextFor(promotion),
      })),
      error: "",
    });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

export default router;
