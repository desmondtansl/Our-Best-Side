// Recreates the store's featured products in MongoDB, uploading their photos
// from client/public to S3.
//
//   npm run seed -w server              # create missing products
//   npm run seed -w server -- --dry-run # show what would happen, change nothing
//
// Needs MONGO_URI, BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID and
// AWS_ACCESS_KEY_SECRET (e.g. in server/.env). Safe to run more than once:
// products whose title already exists are skipped.
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../src/models/Product.js";
import { uploadImageToS3 } from "../src/s3.js";
import { SEED_PRODUCTS } from "./seed-data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_IMAGE_DIR = path.resolve(__dirname, "../../client/public");

const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const MIME_TYPES = {
  ".jfif": "image/jpeg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const seedProducts = async ({
  products = SEED_PRODUCTS,
  imageDir = DEFAULT_IMAGE_DIR,
  dryRun = false,
  log = console.log,
} = {}) => {
  const summary = { created: [], skipped: [] };

  // Featured products are listed newest first, so create them in reverse to
  // keep the homepage in the order of SEED_PRODUCTS.
  for (const item of [...products].reverse()) {
    const existing = await Product.findOne({
      title: { $regex: `^${escapeRegex(item.title)}$`, $options: "i" },
    });
    if (existing) {
      summary.skipped.push(item.title);
      log(`skip    ${item.title} (already exists)`);
      continue;
    }

    const file = path.join(imageDir, item.image);
    const buffer = await readFile(file); // fails early if a photo is missing
    if (dryRun) {
      summary.created.push(item.title);
      log(`create  ${item.title} (dry run, ${item.image})`);
      continue;
    }

    const mimetype =
      MIME_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const imageKey = await uploadImageToS3({ buffer, mimetype });
    await Product.create({ ...item, image: imageKey, featured: true });
    summary.created.push(item.title);
    log(`create  ${item.title}`);
  }

  log(
    `\n${dryRun ? "Would create" : "Created"} ${summary.created.length}, ` +
      `skipped ${summary.skipped.length}.`
  );
  return summary;
};

// Run only when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const dryRun = process.argv.includes("--dry-run");
  const required = ["MONGO_URI"].concat(
    dryRun ? [] : ["BUCKET_NAME", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_ACCESS_KEY_SECRET"]
  );
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await seedProducts({ dryRun });
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
