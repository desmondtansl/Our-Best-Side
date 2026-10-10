import express from "express";
import mongoose from "mongoose";
import Product, { MAX_PHOTOS, productPhotos, VISIBLE } from "../models/Product.js";
import multer from "multer";
import checkAuth from "../middleware/checkAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import { uploadImageToS3, signedImageUrl, isValidImageKey } from "../s3.js";
import { optimizePhoto, ImageError } from "../images.js";
import {
  parseProductFields,
  parseList,
  parseSizeStock,
  totalStock,
} from "../productFields.js";
import {
  parseShopQuery,
  baseFilter,
  shopFilter,
  buildFacets,
  rankRelated,
  escapeRegex,
  SORTS,
} from "../shopQuery.js";

const router = express.Router();

// Photos arrive as "images" (several) or, from older forms, "image" (one).
const MAX_UPLOAD_MB = 20;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: MAX_PHOTOS + 1 },
});
const photoFields = upload.fields([
  { name: "images", maxCount: MAX_PHOTOS },
  { name: "image", maxCount: 1 },
]);

const badRequest = (res, error) => res.status(400).json({ data: "", error });

// Too many or too large files get a clear message instead of a server error.
const receivePhotos = (req, res, next) =>
  photoFields(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      return badRequest(
        res,
        error.code === "LIMIT_FILE_SIZE"
          ? `Each photo must be under ${MAX_UPLOAD_MB} MB`
          : `A product can have at most ${MAX_PHOTOS} photos`
      );
    }
    return next(error);
  });

const uploadMiddleware = [checkAuth, requireAdmin, receivePhotos];

// Compresses every new photo first (so one unsupported file fails before
// anything is uploaded), then uploads them; returns their keys in order.
const storePhotos = async (files) => {
  const optimized = await Promise.all(files.map((file) => optimizePhoto(file.buffer)));
  return Promise.all(optimized.map((photo) => uploadImageToS3(photo)));
};

// The edit form's photo order, sent as JSON: existing photo keys to keep and
// "new:N" for the Nth new photo in "images", e.g. ["new:0", "key1", "key2"].
// Returns null when not sent, undefined when invalid.
const NEW_PHOTO = /^new:(\d+)$/;
const parsePhotoOrder = (raw) => {
  if (raw === undefined) return null;
  try {
    const list = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(list) || !list.every((entry) => typeof entry === "string")) {
      return undefined;
    }
    return [...new Set(list)];
  } catch (error) {
    return undefined;
  }
};

const FEATURED_LIMIT = 8;

const notFound = (res) =>
  res.status(404).json({ data: "", error: "Product not found" });

const serverError = (res, error) =>
  res.status(400).json({ data: "", error: error.message });

// Each request builds its own result, so concurrent visitors never share or
// overwrite each other's product lists. Shoppers only ever see live products
// (drafts and archived products are for admins: see adminProducts.js).
const listProducts = (filter) =>
  Product.find({ ...filter, ...VISIBLE }).sort({ createdAt: -1, _id: -1 });

const findProduct = async (id, category) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Product.findOne({ _id: id, ...(category && { category }), ...VISIBLE });
};

// The "was" price must be above the price, or there's no sale to show.
const saleError = (price, compareAtPrice) =>
  compareAtPrice != null && price != null && compareAtPrice <= price
    ? 'The "was" price must be higher than the price'
    : null;

// UPLOAD A NEW PRODUCT
// Photos: up to MAX_PHOTOS in "images" (the first is the main photo).
// Stock: "inStock" for the whole product, or "sizeStock" ({"S": 3, ...})
// for every size, in which case inStock becomes their total.

router.post("/upload", uploadMiddleware, async (req, res) => {
  try {
    const files = [...(req.files?.images || []), ...(req.files?.image || [])];
    if (files.length === 0) return badRequest(res, "Product image is required");
    if (files.length > MAX_PHOTOS) {
      return badRequest(res, `A product can have at most ${MAX_PHOTOS} photos`);
    }
    const { fields, error } = parseProductFields(req.body, { requireAll: true });
    if (error) return badRequest(res, error);
    const priceError = saleError(fields.price, fields.compareAtPrice);
    if (priceError) return badRequest(res, priceError);
    if (fields.compareAtPrice === null) delete fields.compareAtPrice;

    if (req.body.sizeStock !== undefined) {
      const { sizeStock, error: stockError } = parseSizeStock(
        req.body.sizeStock,
        fields.size || []
      );
      if (stockError) return badRequest(res, stockError);
      if (sizeStock.length) {
        fields.sizeStock = sizeStock;
        fields.inStock = totalStock(sizeStock);
      }
    }

    const photos = await storePhotos(files);
    const product = await Product.create({ ...fields, image: photos[0], images: photos });
    res.status(200).json({
      data: product,
      error: "",
    });
  } catch (error) {
    if (error instanceof ImageError) return badRequest(res, error.message);
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

// SHOP: SEARCH, FILTER AND SORT
// e.g. /products/shop?category=men&q=jacket&size=M&color=Black&min=50&max=200
// &sort=price-asc. `facets` lists the sizes, colours and price range on offer
// for the category/search, so the filter options don't vanish as they're used.
// With `limit` (search suggestions), facets are skipped.

router.get("/shop", async (req, res) => {
  try {
    const parsed = parseShopQuery(req.query);
    let query = Product.find({ ...shopFilter(parsed), ...VISIBLE }).sort(SORTS[parsed.sort]);
    if (parsed.limit) query = query.limit(parsed.limit);
    const products = await query;
    const facets = parsed.limit
      ? undefined
      : buildFacets(
          await Product.find({ ...baseFilter(parsed), ...VISIBLE }, "size color price").lean()
        );
    res.status(200).json({ data: products, facets, error: "" });
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
      ...VISIBLE,
    });
    res.status(200).json({
      data: fetchAllProducts,
      error: "",
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// "YOU MAY ALSO LIKE": other in-stock products from the same category,
// most similar first.

const RELATED_LIMIT = 4;
const RELATED_CANDIDATES = 40;

router.get("/:params/related", async (req, res) => {
  try {
    const product = await findProduct(req.params.params);
    if (!product) return notFound(res);
    const candidates = await listProducts({
      _id: { $ne: product._id },
      category: { $in: product.category },
      inStock: { $ne: 0 },
    }).limit(RELATED_CANDIDATES);
    res
      .status(200)
      .json({ data: rankRelated(product, candidates, RELATED_LIMIT), error: "" });
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
// Only the fields sent are changed. Photos:
// - "images": new photos.
// - "photoOrder": the photos to keep, in order (first = main photo), as
//   existing keys and "new:N" for the Nth new photo. New photos it doesn't
//   mention go at the end. When not sent, every existing photo is kept and
//   new photos are added after them.
// - "image" (older form): a new main photo replacing the current one.
// Old photos stay in S3, because past orders still show them.
// Stock per size ("sizeStock") works as on upload; sending it empty switches
// back to stock for the whole product. If the sizes change while stock is
// tracked per size, removed sizes are dropped and new ones start at 0.

router.put("/:params", uploadMiddleware, async (req, res) => {
  try {
    const { params } = req.params;
    if (!mongoose.isValidObjectId(params)) return notFound(res);
    const product = await Product.findById(params);
    if (!product) return notFound(res);

    const { fields: update, error } = parseProductFields(req.body);
    if (error) return badRequest(res, error);
    const priceError = saleError(
      update.price ?? product.price,
      update.compareAtPrice !== undefined ? update.compareAtPrice : product.compareAtPrice
    );
    if (priceError) return badRequest(res, priceError);

    // Photos
    const current = productPhotos(product);
    const newPhotos = req.files?.images || [];
    const newMain = req.files?.image?.[0];
    const order = parsePhotoOrder(req.body.photoOrder);
    if (order === undefined) return badRequest(res, "The photo order isn't valid");
    const isNewRef = (entry) => {
      const match = NEW_PHOTO.exec(entry);
      return Boolean(match) && Number(match[1]) < newPhotos.length;
    };
    if (order && order.some((entry) => !current.includes(entry) && !isNewRef(entry))) {
      return badRequest(res, "Only the product's own photos can be kept");
    }
    if (order || newPhotos.length || newMain) {
      let entries = order || current;
      // The older form's single photo replaces the main photo.
      if (newMain && !order) entries = entries.slice(1);
      const listed = new Set(entries.filter(isNewRef));
      const unlisted = newPhotos.map((_, i) => `new:${i}`).filter((ref) => !listed.has(ref));
      entries = [...(newMain ? [newMain] : []), ...entries, ...unlisted];
      if (entries.length === 0) return badRequest(res, "A product needs at least one photo");
      if (entries.length > MAX_PHOTOS) {
        return badRequest(res, `A product can have at most ${MAX_PHOTOS} photos`);
      }
      const uploaded = await storePhotos([...(newMain ? [newMain] : []), ...newPhotos]);
      const mainKey = newMain ? uploaded.shift() : null;
      const photos = entries.map((entry) => {
        if (entry === newMain) return mainKey;
        return isNewRef(entry) ? uploaded[Number(NEW_PHOTO.exec(entry)[1])] : entry;
      });
      update.images = photos;
      update.image = photos[0];
    }

    // Stock per size
    const sizes = update.size ?? parseList(product.size);
    if (req.body.sizeStock !== undefined) {
      const { sizeStock, error: stockError } = parseSizeStock(req.body.sizeStock, sizes);
      if (stockError) return badRequest(res, stockError);
      update.sizeStock = sizeStock;
    } else if (update.size && product.sizeStock?.length) {
      const bySize = new Map(product.sizeStock.map((entry) => [entry.size, entry.inStock]));
      update.sizeStock = sizes.map((size) => ({ size, inStock: bySize.get(size) ?? 0 }));
    }
    const sizeStock = update.sizeStock ?? product.sizeStock;
    if (sizeStock?.length) update.inStock = totalStock(sizeStock);

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
    if (error instanceof ImageError) return badRequest(res, error.message);
    return serverError(res, error);
  }
});
export default router;
