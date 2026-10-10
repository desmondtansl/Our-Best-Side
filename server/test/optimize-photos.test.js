import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { setupDatabase, teardownDatabase, clearDatabase, testPhoto } from "./helpers.js";

const s3Mock = mockClient(S3Client);

// A large camera-style photo (about 5 MB).
const cameraPhoto = () => {
  const width = 3000;
  const height = 2000;
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 24;
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
};

describe("optimize-photos script", () => {
  let Product;
  let optimizeExistingPhotos;
  let bucket; // key -> Buffer
  const quiet = () => {};

  before(async () => {
    await setupDatabase();
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ optimizeExistingPhotos } = await import("../scripts/optimize-photos.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    bucket = new Map([
      ["big", await cameraPhoto()],
      ["small", await sharp(await testPhoto({ width: 800, height: 1000 })).jpeg().toBuffer()],
    ]);
    s3Mock.reset();
    s3Mock.on(GetObjectCommand).callsFake(({ Key }) => {
      if (!bucket.has(Key)) throw new Error("NoSuchKey");
      const body = bucket.get(Key);
      return { Body: { transformToByteArray: async () => new Uint8Array(body) } };
    });
    s3Mock.on(PutObjectCommand).callsFake(({ Key, Body }) => {
      bucket.set(Key, Body);
      return {};
    });
    await Product.create({ title: "Jacket", category: ["Men"], price: 1, image: "big" });
    await Product.create({
      title: "Shirt",
      category: ["Men"],
      price: 1,
      image: "small",
      images: ["small", "big", "missing"],
    });
  });

  const photosOf = async (title) => (await Product.findOne({ title })).images;

  it("compresses large photos once, points every product at them and keeps the originals", async () => {
    const summary = await optimizeExistingPhotos({ log: quiet });
    assert.equal(summary.optimized, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.failed, 1);
    assert.ok(summary.after < summary.before / 10);

    const puts = s3Mock.commandCalls(PutObjectCommand);
    assert.equal(puts.length, 1); // "big" is shared, so it's compressed once
    const newKey = puts[0].args[0].input.Key;

    const jacket = await Product.findOne({ title: "Jacket" });
    assert.deepEqual(jacket.images, [newKey]);
    assert.equal(jacket.image, newKey);
    assert.deepEqual(await photosOf("Shirt"), ["small", newKey, "missing"]);
    assert.ok(bucket.has("big"), "original kept for past orders");

    const meta = await sharp(bucket.get(newKey)).metadata();
    assert.equal(Math.max(meta.width, meta.height), 1600);
  });

  it("changes nothing in a dry run", async () => {
    const summary = await optimizeExistingPhotos({ dryRun: true, log: quiet });
    assert.equal(summary.optimized, 1);
    assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 0);
    assert.deepEqual(await photosOf("Shirt"), ["small", "big", "missing"]);
    assert.equal((await Product.findOne({ title: "Jacket" })).image, "big");
  });

  it("skips everything on a second run", async () => {
    await optimizeExistingPhotos({ log: quiet });
    const second = await optimizeExistingPhotos({ log: quiet });
    assert.equal(second.optimized, 0);
    assert.equal(second.skipped, 2);
    assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 1);
  });
});
