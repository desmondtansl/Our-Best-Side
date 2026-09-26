import express from "express";
import mongoose from "mongoose";
import Order, { ORDER_STATUSES } from "../models/Order.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

// "pending" is only set by checkout itself, never by an admin.
const ADMIN_STATUSES = ORDER_STATUSES.filter((status) => status !== "pending");

router.use(checkAuth, requireAdmin);

// LIST ORDERS (optionally filtered by status)

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ data: "", error: "Invalid status" });
    }
    const orders = await Order.find(
      status ? { status } : { status: { $ne: "pending" } }
    )
      .sort({ createdAt: -1 })
      .limit(200);
    return res.status(200).json({ data: orders, error: "" });
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
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $ne: "pending" } },
      { $set: { status } },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ data: "", error: "Order not found" });
    }
    return res.status(200).json({ data: order, error: "" });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

export default router;
