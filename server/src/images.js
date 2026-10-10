import sharp from "sharp";

// Product photos are resized and compressed when they're uploaded, so phones
// download a fraction of the original (camera photos are often 1-7 MB).

// Longest side in pixels: sharp on large screens, small enough to load fast.
export const MAX_PHOTO_SIZE = 1600;
export const PHOTO_QUALITY = 80;

export class ImageError extends Error {}

// Returns a JPEG of at most MAX_PHOTO_SIZE pixels on its longest side.
// - The camera's rotation is applied, so photos never appear sideways.
// - Metadata (including any GPS location) is removed.
// - Transparent areas (e.g. in PNGs) become white.
// - Smaller photos are never enlarged.
export const optimizePhoto = async (buffer) => {
  try {
    const output = await sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({
        width: MAX_PHOTO_SIZE,
        height: MAX_PHOTO_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: PHOTO_QUALITY, mozjpeg: true })
      .toBuffer();
    return { buffer: output, mimetype: "image/jpeg" };
  } catch (error) {
    throw new ImageError(
      "That file isn't a supported photo. Please use a JPEG, PNG or WebP image."
    );
  }
};
