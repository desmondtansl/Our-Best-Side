import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { LOW_STOCK_THRESHOLD } from "../inventory.js";

const router = express.Router();

router.use(checkAuth, requireAdmin);

// Orders that count as sales. Pending orders were never paid, and cancelled
// ones were called off.
export const SALE_STATUSES = ["paid", "processing", "shipped", "delivered"];

// Paid orders that haven't been sent yet.
export const TO_SHIP_STATUSES = ["paid", "processing"];

const DAY = 24 * 60 * 60 * 1000;
// The shop's days run midnight to midnight Singapore time (UTC+8, no
// daylight saving), not UTC.
const SHOP_UTC_OFFSET = 8 * 60 * 60 * 1000;

// When "today", "the last 7 days" and "the last 30 days" start. Each period
// includes today.
export const periodStarts = (now = new Date()) => {
  const shopTime = now.getTime() + SHOP_UTC_OFFSET;
  const today = Math.floor(shopTime / DAY) * DAY - SHOP_UTC_OFFSET;
  return {
    today: new Date(today),
    week: new Date(today - 6 * DAY),
    month: new Date(today - 29 * DAY),
  };
};

const round2 = (value) => Math.round(value * 100) / 100;

const salesSince = async (starts) => {
  const since = (start) => ({ $gte: ["$createdAt", start] });
  const group = { _id: null };
  for (const [period, start] of Object.entries(starts)) {
    group[`${period}Revenue`] = { $sum: { $cond: [since(start), "$subtotal", 0] } };
    group[`${period}Orders`] = { $sum: { $cond: [since(start), 1, 0] } };
  }
  const [totals = {}] = await Order.aggregate([
    { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: starts.month } } },
    { $group: group },
  ]);
  const sales = {};
  for (const period of Object.keys(starts)) {
    const revenue = round2(totals[`${period}Revenue`] || 0);
    const orders = totals[`${period}Orders`] || 0;
    sales[period] = { revenue, orders, average: orders ? round2(revenue / orders) : 0 };
  }
  return sales;
};

// Products, or single sizes, at or below the threshold, sold out first.
// Products whose stock isn't tracked are never listed.
const lowStock = async () => {
  const products = await Product.find(
    {
      $or: [
        { "sizeStock.0": { $exists: true }, "sizeStock.inStock": { $lte: LOW_STOCK_THRESHOLD } },
        { "sizeStock.0": { $exists: false }, inStock: { $type: "number", $lte: LOW_STOCK_THRESHOLD } },
      ],
    },
    "title inStock sizeStock"
  );
  const items = [];
  for (const product of products) {
    if (product.sizeStock.length) {
      for (const entry of product.sizeStock) {
        if (entry.inStock <= LOW_STOCK_THRESHOLD) {
          items.push({ productId: product.id, title: product.title, size: entry.size, inStock: entry.inStock });
        }
      }
    } else {
      items.push({ productId: product.id, title: product.title, inStock: product.inStock });
    }
  }
  return items.sort(
    (a, b) => a.inStock - b.inStock || String(a.title).localeCompare(String(b.title))
  );
};

// Top 5 products by units sold since `start`.
const bestSellers = async (start) => {
  const rows = await Order.aggregate([
    { $match: { status: { $in: SALE_STATUSES }, createdAt: { $gte: start } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: { $ifNull: ["$items.product", "$items.title"] },
        product: { $first: "$items.product" },
        title: { $first: "$items.title" },
        units: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { units: -1, revenue: -1 } },
    { $limit: 5 },
  ]);
  return rows.map((row) => ({
    productId: row.product ? String(row.product) : null,
    title: row.title,
    units: row.units,
    revenue: round2(row.revenue),
  }));
};

// SHOP SUMMARY FOR THE ADMIN DASHBOARD

router.get("/", async (req, res) => {
  try {
    const starts = periodStarts();
    const [sales, toShipCount, oldestToShip, lowStockItems, topProducts, recentOrders] =
      await Promise.all([
        salesSince(starts),
        Order.countDocuments({ status: { $in: TO_SHIP_STATUSES } }),
        Order.findOne({ status: { $in: TO_SHIP_STATUSES } }, "createdAt").sort({ createdAt: 1 }),
        lowStock(),
        bestSellers(starts.month),
        Order.find({ status: { $ne: "pending" } }, "email user subtotal currency status createdAt")
          .sort({ createdAt: -1 })
          .limit(5),
      ]);
    return res.status(200).json({
      data: {
        currency: (process.env.CURRENCY || "sgd").toLowerCase(),
        sales,
        toShip: { count: toShipCount, oldest: oldestToShip?.createdAt || null },
        lowStock: { threshold: LOW_STOCK_THRESHOLD, items: lowStockItems },
        bestSellers: topProducts,
        recentOrders,
      },
      error: "",
    });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

export default router;
