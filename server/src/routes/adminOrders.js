import express from "express";
import mongoose from "mongoose";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { adjustStock } from "../inventory.js";
import { stripePaymentUrl } from "../stripe.js";

const router = express.Router();

// "pending" is only set by checkout itself, never by an admin.
const ADMIN_STATUSES = ORDER_STATUSES.filter((status) => status !== "pending");

router.use(checkAuth, requireAdmin);

// Each order also carries the link to its payment in the Stripe Dashboard.
const withStripeUrl = (order) => ({
  ...order.toJSON(),
  stripeUrl: stripePaymentUrl(order.stripePaymentIntentId),
});

// LIST ORDERS (optionally filtered by status, or several statuses separated
// by commas, e.g. "paid,processing" for orders waiting to ship)

router.get("/", async (req, res) => {
  try {
    const statuses = req.query.status ? String(req.query.status).split(",") : [];
    if (statuses.some((status) => !ORDER_STATUSES.includes(status))) {
      return res.status(400).json({ data: "", error: "Invalid status" });
    }
    const orders = await Order.find(
      statuses.length ? { status: { $in: statuses } } : { status: { $ne: "pending" } }
    )
      .sort({ createdAt: -1 })
      .limit(200);
    return res.status(200).json({ data: orders.map(withStripeUrl), error: "" });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

// UPDATE ORDER STATUS

router.patch("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body || {};
    if (!ADMIN_STATUSES.includes(status)) {
      return res.status(400).json({
        data: "",
        error: `Status must be one of: ${ADMIN_STATUSES.join(", ")}`,
      });
    }
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(404).json({ data: "", error: "Order not found" });
    }
    // Cancelling is final: a cancelled order's status can't be changed
    // again. Matching only orders that aren't cancelled also means two
    // cancels at the same moment can't put the items back in stock twice.
    const previous = await Order.findOneAndUpdate(
      { _id: orderId, status: { $nin: ["pending", "cancelled"] } },
      { $set: { status } }
    );
    if (!previous) {
      const existing = await Order.findOne({ _id: orderId, status: { $ne: "pending" } }, "status");
      if (existing?.status === "cancelled") {
        return res.status(400).json({
          data: "",
          error: "This order has been cancelled. Cancelled orders can't be changed.",
        });
      }
      return res.status(404).json({ data: "", error: "Order not found" });
    }
    // Cancelling puts the items back in stock.
    if (status === "cancelled") {
      await adjustStock(previous.items, 1);
    }
    const order = await Order.findById(orderId);
    return res.status(200).json({ data: withStripeUrl(order), error: "" });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

export default router;
