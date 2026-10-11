import express from "express";
import { logActivity, orderRef, money } from "../activity.js";
import { internalError } from "../errors.js";
import mongoose from "mongoose";
import Order, { ORDER_STATUSES, refundableAmount } from "../models/Order.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { adjustStock } from "../inventory.js";
import { stripePaymentUrl, isStripeConfigured } from "../stripe.js";
import { refundOrder } from "../refunds.js";
import { DAY, parseShopDate } from "../shopTime.js";

const router = express.Router();

// "pending" is only set by checkout itself, never by an admin.
const ADMIN_STATUSES = ORDER_STATUSES.filter((status) => status !== "pending");

// Orders per page in the list; "Load more" fetches the next page.
export const PAGE_SIZE = 50;

const MAX_NOTES = 2000;
const MAX_TRACKING_FIELD = 100;

router.use(checkAuth, requireAdmin);

// Each order also carries the link to its payment in the Stripe Dashboard
// and how much of it can still be refunded.
const forAdmin = (order) => ({
  ...order.toJSON(),
  stripeUrl: stripePaymentUrl(order.stripePaymentIntentId),
  refundable: order.stripePaymentIntentId ? refundableAmount(order) : 0,
});

const badRequest = (res, error) => res.status(400).json({ data: "", error });
const notFound = (res) => res.status(404).json({ data: "", error: "Order not found" });

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The search box matches the order number (the last characters of the id,
// as shown on the site, with or without "#") or part of the customer's email.
const searchFilter = (q) => {
  const text = String(q || "").trim().replace(/^#/, "").slice(0, 100);
  if (!text) return null;
  const conditions = [{ email: { $regex: escapeRegex(text), $options: "i" } }];
  if (/^[0-9a-f]{4,24}$/i.test(text)) {
    conditions.push({
      $expr: {
        $regexMatch: { input: { $toString: "$_id" }, regex: `${text}$`, options: "i" },
      },
    });
  }
  return { $or: conditions };
};

// Tracking details from the request, checked. Returns { tracking } or
// { error }. The link must be a web address, so it can't run code when
// clicked.
const parseTracking = (body) => {
  const courier = String(body?.courier || "").trim();
  const number = String(body?.number || "").trim();
  const url = String(body?.url || "").trim();
  if ([courier, number, url].some((value) => value.length > MAX_TRACKING_FIELD)) {
    return { error: `Tracking details can be at most ${MAX_TRACKING_FIELD} characters each` };
  }
  if (url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      parsed = null;
    }
    if (!parsed || !["http:", "https:"].includes(parsed.protocol)) {
      return { error: "The tracking link must start with https:// or http://" };
    }
  }
  return { tracking: { courier, number, url } };
};

// LIST ORDERS
// Query: status (one, or several separated by commas, e.g. "paid,processing"
// for orders waiting to ship), q (order number or email), from and to
// (YYYY-MM-DD, Singapore days, both included), page (1, 2, …).

router.get("/", async (req, res) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(",") : [];
    if (statuses.some((status) => !ORDER_STATUSES.includes(status))) {
      return badRequest(res, "Invalid status");
    }
    const filter = statuses.length
      ? { status: { $in: statuses } }
      : { status: { $ne: "pending" } };

    const search = searchFilter(req.query.q);
    if (search) Object.assign(filter, search);

    const from = req.query.from ? parseShopDate(req.query.from) : null;
    const to = req.query.to ? parseShopDate(req.query.to) : null;
    if ((req.query.from && !from) || (req.query.to && !to)) {
      return badRequest(res, "Dates must be in the form YYYY-MM-DD");
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      // "To" includes that whole day.
      if (to) filter.createdAt.$lt = new Date(to.getTime() + DAY);
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1);
    return res.status(200).json({
      data: orders.slice(0, PAGE_SIZE).map(forAdmin),
      hasMore: orders.length > PAGE_SIZE,
      error: "",
    });
  } catch (error) {
    return internalError(res, error);
  }
});

// ONE ORDER, for its detail page

router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) return notFound(res);
    const order = await Order.findOne({ _id: orderId, status: { $ne: "pending" } });
    if (!order) return notFound(res);
    return res.status(200).json({ data: forAdmin(order), error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

// UPDATE ORDER STATUS
// Body: { status }, plus optional { tracking: { courier, number, url } } when
// marking an order shipped.

router.patch("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body || {};
    if (!ADMIN_STATUSES.includes(status)) {
      return badRequest(res, `Status must be one of: ${ADMIN_STATUSES.join(", ")}`);
    }
    if (!mongoose.isValidObjectId(orderId)) return notFound(res);

    const update = { $set: { status } };
    if (status === "shipped" && req.body.tracking) {
      const { tracking, error } = parseTracking(req.body.tracking);
      if (error) return badRequest(res, error);
      update.$set.tracking = tracking;
    }

    // Cancelling is final: a cancelled order's status can't be changed
    // again. Matching only orders that aren't cancelled also means two
    // cancels at the same moment can't put the items back in stock twice.
    const previous = await Order.findOneAndUpdate(
      { _id: orderId, status: { $nin: ["pending", "cancelled"] } },
      update
    );
    if (!previous) {
      const existing = await Order.findOne({ _id: orderId, status: { $ne: "pending" } }, "status");
      if (existing?.status === "cancelled") {
        return badRequest(res, "This order has been cancelled. Cancelled orders can't be changed.");
      }
      return notFound(res);
    }
    if (previous.status !== status) {
      await Order.updateOne(
        { _id: orderId },
        { $push: { statusHistory: { status, at: new Date(), by: req.user } } }
      );
    }
    // Cancelling puts the items back in stock.
    if (status === "cancelled") {
      await adjustStock(previous.items, 1);
    }
    if (previous.status !== status) {
      await logActivity(req, "order.status", `Changed order ${orderRef(orderId)} from ${previous.status} to ${status}`);
    }
    const order = await Order.findById(orderId);
    return res.status(200).json({ data: forAdmin(order), error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

// TRACKING DETAILS, added or corrected after shipping
// Body: { courier, number, url }. All empty removes them.

router.put("/:orderId/tracking", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) return notFound(res);
    const { tracking, error } = parseTracking(req.body);
    if (error) return badRequest(res, error);
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $ne: "pending" } },
      { $set: { tracking } },
      { new: true }
    );
    if (!order) return notFound(res);
    await logActivity(req, "order.tracking", `Updated tracking on order ${orderRef(orderId)}`);
    return res.status(200).json({ data: forAdmin(order), error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

// INTERNAL NOTES (admins only; customers never see them)
// Body: { notes }

router.put("/:orderId/notes", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) return notFound(res);
    const notes = String(req.body?.notes ?? "");
    if (notes.length > MAX_NOTES) {
      return badRequest(res, `Notes can be at most ${MAX_NOTES} characters`);
    }
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $ne: "pending" } },
      { $set: { notes } },
      { new: true }
    );
    if (!order) return notFound(res);
    await logActivity(req, "order.notes", `Edited the notes on order ${orderRef(orderId)}`);
    return res.status(200).json({ data: forAdmin(order), error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

// REFUND through Stripe, in full or in part
// Body: { amount, requestId }: the amount in the order's currency, e.g.
// 25.5, and an id made once per confirmed refund, so repeats of the same
// request refund once. Refunding doesn't
// change the order's status; cancel it separately if it won't be sent.

router.post("/:orderId/refund", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) return notFound(res);
    const order = await Order.findOne({ _id: orderId, status: { $ne: "pending" } });
    if (!order) return notFound(res);
    if (!order.stripePaymentIntentId) {
      return badRequest(
        res,
        "This order has no Stripe payment saved, so it can't be refunded here. Refund it in the Stripe Dashboard."
      );
    }
    if (!isStripeConfigured()) {
      return res.status(503).json({ data: "", error: "Stripe isn't set up on the server" });
    }
    // One id per confirmed refund (see refundOrder).
    const requestId = String(req.body?.requestId || "");
    if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) {
      return badRequest(res, "The refund request is missing its id. Reload the page and try again.");
    }
    const amount = Number(req.body?.amount);
    const remaining = refundableAmount(order);
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest(res, "Enter an amount to refund");
    }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
      return badRequest(res, "Amounts can have at most 2 decimal places");
    }
    if (amount > remaining + 1e-9) {
      return badRequest(
        res,
        remaining > 0
          ? `At most ${remaining.toFixed(2)} can still be refunded`
          : "This order has already been refunded in full"
      );
    }
    try {
      await refundOrder(order, amount, req.user, requestId);
    } catch (error) {
      // Admins see Stripe's message (e.g. "Charge has already been refunded").
      console.error("Stripe refund failed:", error?.message);
      return res.status(502).json({
        data: "",
        error: `Stripe didn't make the refund: ${error?.message || "unknown error"}`,
      });
    }
    await logActivity(req, "order.refund", `Refunded ${money(amount, order.currency)} on order ${orderRef(orderId)}`);
    const updated = await Order.findById(orderId);
    return res.status(200).json({ data: forAdmin(updated), error: "" });
  } catch (error) {
    return internalError(res, error);
  }
});

export default router;
