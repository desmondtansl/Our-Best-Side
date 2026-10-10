// Compresses product photos uploaded before photos were optimized on upload,
// so existing products load as fast as new ones.
//
//   npm run optimize-photos -w server              # compress and update products
//   npm run optimize-photos -w server -- --dry-run # report savings, change nothing
//
// Needs MONGO_URI, BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID and
// AWS_ACCESS_KEY_SECRET (e.g. in server/.env), with s3:GetObject and
// s3:PutObject on the bucket.
//
// Each photo is downloaded, compressed like a new upload and stored under a
// new key; the product is then pointed at the new key. The originals stay in
// the bucket (past orders still show them). Photos that are already small
// are skipped, so it's safe to run more than once.
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import sharp from "sharp";
import Product, { productPhotos } from "../src/models/Product.js";
import { downloadImageFromS3, uploadImageToS3, isValidImageKey } from "../src/s3.js";
import { optimizePhoto, MAX_PHOTO_SIZE } from "../src/images.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Photos at or under these are left alone (already optimized).
const ALREADY_SMALL_BYTES = 500 * 1024;

const megabytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const isAlreadyOptimized = async (buffer) => {
  if (buffer.length > ALREADY_SMALL_BYTES) return false;
  try {
    const { format, width, height } = await sharp(buffer).metadata();
    return format === "jpeg" && Math.max(width, height) <= MAX_PHOTO_SIZE;
  } catch (error) {
    return false;
  }
};

export const optimizeExistingPhotos = async ({ dryRun = false, log = console.log } = {}) => {
  const summary = { optimized: 0, skipped: 0, failed: 0, before: 0, after: 0 };
  // The same photo can be used by more than one product; compress it once.
  const replacements = new Map();

  for (const product of await Product.find()) {
    const photos = productPhotos(product);
    const updated = [];
    for (const key of photos) {
      if (replacements.has(key)) {
        updated.push(replacements.get(key));
        continue;
      }
      if (!isValidImageKey(key)) {
        updated.push(key);
        continue;
      }
      try {
        const original = await downloadImageFromS3(key);
        if (await isAlreadyOptimized(original)) {
          summary.skipped += 1;
          replacements.set(key, key);
          updated.push(key);
          continue;
        }
        const optimized = await optimizePhoto(original);
        summary.optimized += 1;
        summary.before += original.length;
        summary.after += optimized.buffer.length;
        log(
          `${dryRun ? "would compress" : "compress"} ${product.title}: ` +
            `${megabytes(original.length)} -> ${megabytes(optimized.buffer.length)}`
        );
        const newKey = dryRun ? key : await uploadImageToS3(optimized);
        replacements.set(key, newKey);
        updated.push(newKey);
      } catch (error) {
        summary.failed += 1;
        log(`failed   ${product.title} (${key}): ${error.message}`);
        updated.push(key);
      }
    }
    const changed = updated.some((key, index) => key !== photos[index]);
    if (changed && !dryRun) {
      await Product.updateOne({ _id: product._id }, { $set: { images: updated, image: updated[0] } });
    }
  }

  log(
    `\n${dryRun ? "Would compress" : "Compressed"} ${summary.optimized} photo(s): ` +
      `${megabytes(summary.before)} -> ${megabytes(summary.after)}. ` +
      `Skipped ${summary.skipped} already small, ${summary.failed} failed.`
  );
  return summary;
};

// Run only when executed directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  const dryRun = process.argv.includes("--dry-run");
  const required = ["MONGO_URI", "BUCKET_NAME", "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_ACCESS_KEY_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  mongoose.set("strictQuery", false);
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const summary = await optimizeExistingPhotos({ dryRun });
    process.exitCode = summary.failed ? 1 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
