import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import multer from "multer";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadImageToS3, signedImageUrl, isValidImageKey } from "../s3.js";
import { parseProductFields } from "../productFields.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const uploadMiddleware = [checkAuth, requireAdmin, upload.single("image")];

const FEATURED_LIMIT = 8;

const notFound = (res) =>
  res.status(404).json({ data: "", error: "Product not found" });

const serverError = (res, error) =>
  res.status(400).json({ data: "", error: error.message });

// Each request builds its own result, so concurrent visitors never share or
// overwrite each other's product lists.
const listProducts = (filter) => Product.find(filter).sort({ createdAt: -1, _id: -1 });

const findProduct = async (id, category) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Product.findOne(category ? { _id: id, category } : { _id: id });
};

// UPLOAD A NEW PRODUCT

router.post("/upload", uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ data: "", error: "Product image is required" });
    }
    const { fields, error } = parseProductFields(req.body, { requireAll: true });
    if (error) return res.status(400).json({ data: "", error });

    const imageName = await uploadImageToS3(req.file);
    const product = await Product.create({ ...fields, image: imageName });
    res.status(200).json({
      data: product,
      error: "",
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET ALL MEN PRODUCTS

router.get("/men", async (req, res) => {
  try {
    res.status(200).send(await listProducts({ category: "Men" }));
  } catch (error) {
    return serverError(res, error);
  }
});

// GET ALL LADIES PRODUCTS

router.get("/ladies", async (req, res) => {
  try {
    res.status(200).send(await listProducts({ category: "Ladies" }));
  } catch (error) {
    return serverError(res, error);
  }
});

// GET ALL PRODUCTS

router.get("/combined", async (req, res) => {
  try {
    res
      .status(200)
      .send(await listProducts({ category: { $in: ["Men", "Ladies"] } }));
  } catch (error) {
    return serverError(res, error);
  }
});

// GET PRODUCTS FEATURED ON THE HOMEPAGE

router.get("/featured", async (req, res) => {
  try {
    const products = await listProducts({ featured: true }).limit(FEATURED_LIMIT);
    res.status(200).json({ data: products, error: "" });
  } catch (error) {
    return serverError(res, error);
  }
});

// PRODUCT IMAGE
// Redirects to a short-lived signed S3 link, so the bucket can stay private.
// Browsers cache the redirect for a little less than the link's lifetime.

const IMAGE_LINK_SECONDS = 3600;

router.get("/image/:key", async (req, res) => {
  try {
    const { key } = req.params;
    if (!isValidImageKey(key)) {
      return res.status(404).json({ data: "", error: "Image not found" });
    }
    const url = await signedImageUrl(key, IMAGE_LINK_SECONDS);
    res.set("Cache-Control", `public, max-age=${IMAGE_LINK_SECONDS - 300}`);
    return res.redirect(302, url);
  } catch (error) {
    return serverError(res, error);
  }
});

// GET SPECIFIC MEN PRODUCT

router.get("/men/:params", async (req, res) => {
  try {
    const product = await findProduct(req.params.params, "Men");
    if (!product) return notFound(res);
    res.status(200).json({ data: product, error: "" });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET SPECIFIC LADIES PRODUCT

router.get("/ladies/:params", async (req, res) => {
  try {
    const product = await findProduct(req.params.params, "Ladies");
    if (!product) return notFound(res);
    res.status(200).json({ data: product, error: "" });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET SPECIFIC PRODUCT FROM SEARCH

router.get("/search/:params", async (req, res) => {
  try {
    const { params } = req.params;
    const fetchAllProducts = await Product.find({
      title: { $regex: "^" + escapeRegex(params), $options: "i" },
    });
    res.status(200).json({
      data: fetchAllProducts,
      error: "",
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET 1 PRODUCT

router.get("/:params", async (req, res) => {
  try {
    const product = await findProduct(req.params.params);
    if (!product) return notFound(res);
    res.status(200).json({ data: product, error: "" });
  } catch (error) {
    return serverError(res, error);
  }
});

// EDIT 1 PRODUCT

router.put("/:params", uploadMiddleware, async (req, res) => {
  try {
    const { params } = req.params;
    if (!mongoose.isValidObjectId(params)) return notFound(res);

    const { fields: update, error } = parseProductFields(req.body);
    if (error) return res.status(400).json({ data: "", error });
    if (req.file) {
      update.image = await uploadImageToS3(req.file);
    }

    const getEditedProduct = await Product.findByIdAndUpdate(
      params,
      {
        $set: update,
      },
      { new: true, runValidators: true }
    );
    if (!getEditedProduct) return notFound(res);

    res.status(200).json({
      data: getEditedProduct,
      error: "",
    });
  } catch (error) {
    return serverError(res, error);
  }
});
export default router;
