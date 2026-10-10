import express from "express";
import mongoose from "mongoose";
import Product, { PRODUCT_STATUSES } from "../models/Product.js";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { parseList, parseSizeStock, totalStock } from "../productFields.js";
import { escapeRegex } from "../shopQuery.js";

const router = express.Router();

router.use(checkAuth, requireAdmin);

export const PAGE_SIZE = 50;
const MAX_STOCK_CHANGES = 200;

const badRequest = (res, error) => res.status(400).json({ data: "", error });
const notFound = (res) => res.status(404).json({ data: "", error: "Product not found" });

// Products from before statuses existed have none; they count as live.
const statusFilter = (status) =>
  status === "live" ? { status: { $nin: ["draft", "archived"] } } : { status };

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  title: { title: 1, _id: 1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  "stock-asc": { inStock: 1, _id: 1 },
};

// LIST PRODUCTS FOR ADMINS
// Query: status (live, draft or archived; default live), q (words in the
// name), sort (newest, title, price-asc, price-desc, stock-asc), page.
// `counts` gives the number of products with each status.

router.get("/", async (req, res) => {
  try {
    const status = req.query.status || "live";
    if (!PRODUCT_STATUSES.includes(status)) return badRequest(res, "Invalid status");
    const sort = SORTS[req.query.sort || "newest"];
    if (!sort) return badRequest(res, "Invalid sort");

    const filter = statusFilter(status);
    const words = String(req.query.q || "").trim().split(/\s+/).filter(Boolean).slice(0, 10);
    if (words.length) {
      filter.$and = words.map((word) => ({
        title: { $regex: `\\b${escapeRegex(word)}`, $options: "i" },
      }));
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const [products, ...counts] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE + 1),
      ...PRODUCT_STATUSES.map((s) => Product.countDocuments(statusFilter(s))),
    ]);
    return res.status(200).json({
      data: products.slice(0, PAGE_SIZE),
      hasMore: products.length > PAGE_SIZE,
      counts: Object.fromEntries(PRODUCT_STATUSES.map((s, i) => [s, counts[i]])),
      error: "",
    });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

// ONE PRODUCT, whatever its status (for the edit page)

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const product = await Product.findById(req.params.id);
    if (!product) return notFound(res);
    return res.status(200).json({ data: product, error: "" });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

// PUBLISH, ARCHIVE OR RESTORE
// Body: { status: "live" | "draft" | "archived" }. Archived products leave
// the shop but stay in the database, so past orders still link to them.

router.patch("/:id/status", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const { status } = req.body || {};
    if (!PRODUCT_STATUSES.includes(status)) {
      return badRequest(res, `Status must be one of: ${PRODUCT_STATUSES.join(", ")}`);
    }
    // An archived product stops being featured on the homepage.
    const update = status === "archived" ? { status, featured: false } : { status };
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!product) return notFound(res);
    return res.status(200).json({ data: product, error: "" });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

// UPDATE STOCK FOR MANY PRODUCTS AT ONCE
// Body: { changes: [{ id, updatedAt, inStock }] } for stock tracked per
// product, or { id, updatedAt, sizeStock: { S: 3, M: 0 } } per size.
// `updatedAt` is the product's as loaded: a product that changed since (e.g.
// an order came in) isn't overwritten, and is listed in `conflicts` so the
// admin can reload and check it. Each product is saved on its own.

router.put("/stock", async (req, res) => {
  try {
    const changes = req.body?.changes;
    if (!Array.isArray(changes) || changes.length === 0) {
      return badRequest(res, "There are no stock changes to save");
    }
    if (changes.length > MAX_STOCK_CHANGES) {
      return badRequest(res, `At most ${MAX_STOCK_CHANGES} products can be saved at once`);
    }

    // Check everything first, so a mistake in one row saves nothing.
    const planned = [];
    for (const change of changes) {
      if (!mongoose.isValidObjectId(change?.id)) return badRequest(res, "Unknown product");
      const product = await Product.findById(change.id);
      if (!product) return badRequest(res, "Unknown product");
      const update = {};
      if (product.sizeStock?.length) {
        const { sizeStock, error } = parseSizeStock(change.sizeStock ?? {}, parseList(product.size));
        if (error) return badRequest(res, `${product.title}: ${error}`);
        update.sizeStock = sizeStock;
        update.inStock = totalStock(sizeStock);
      } else {
        const inStock = Number(change.inStock);
        if (change.inStock === "" || !Number.isInteger(inStock) || inStock < 0) {
          return badRequest(res, `${product.title}: stock must be a whole number of 0 or more`);
        }
        update.inStock = inStock;
      }
      planned.push({ product, update, updatedAt: change.updatedAt });
    }

    const saved = [];
    const conflicts = [];
    for (const { product, update, updatedAt } of planned) {
      const filter = { _id: product._id };
      if (updatedAt) filter.updatedAt = new Date(updatedAt);
      const result = await Product.findOneAndUpdate(filter, { $set: update }, { new: true });
      if (result) saved.push(result);
      else conflicts.push({ id: product.id, title: product.title });
    }
    return res.status(200).json({ data: { saved, conflicts }, error: "" });
  } catch (error) {
    return badRequest(res, error.message);
  }
});

export default router;
