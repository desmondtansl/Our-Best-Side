import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { setupDatabase, teardownDatabase, clearDatabase } from "./helpers.js";

const s3Mock = mockClient(S3Client);

describe("seed script", () => {
  let Product;
  let seedProducts;
  let SEED_PRODUCTS;
  const quiet = () => {};

  before(async () => {
    await setupDatabase();
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ seedProducts } = await import("../scripts/seed-products.js"));
    ({ SEED_PRODUCTS } = await import("../scripts/seed-data.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
  });

  it("creates every product as featured and uploads its photo", async () => {
    const summary = await seedProducts({ log: quiet });
    assert.equal(summary.created.length, SEED_PRODUCTS.length);

    const products = await Product.find().lean();
    assert.equal(products.length, SEED_PRODUCTS.length);
    assert.ok(products.every((p) => p.featured));

    const uploads = s3Mock.commandCalls(PutObjectCommand);
    assert.equal(uploads.length, SEED_PRODUCTS.length);
    assert.ok(uploads.every((c) => c.args[0].input.ContentType === "image/jpeg"));
    assert.ok(uploads.every((c) => c.args[0].input.Body.length > 0));

    const loafers = products.find((p) => p.title === "Suede Loafers");
    assert.deepEqual(loafers.size, ["US 7", "US 8", "US 9", "US 10", "US 11"]);
    assert.ok(uploads.some((c) => c.args[0].input.Key === loafers.image));
  });

  it("keeps the homepage in the order of the seed list", async () => {
    await seedProducts({ log: quiet });
    const featured = await Product.find({ featured: true }).sort({ createdAt: -1, _id: -1 });
    assert.deepEqual(
      featured.map((p) => p.title),
      SEED_PRODUCTS.map((p) => p.title)
    );
  });

  it("skips products that already exist", async () => {
    await Product.create({ title: "suede loafers", price: 1, category: ["Men"] });
    const first = await seedProducts({ log: quiet });
    assert.equal(first.skipped.length, 1);

    const second = await seedProducts({ log: quiet });
    assert.equal(second.created.length, 0);
    assert.equal(await Product.countDocuments(), SEED_PRODUCTS.length);
  });

  it("changes nothing in a dry run", async () => {
    const summary = await seedProducts({ dryRun: true, log: quiet });
    assert.equal(summary.created.length, SEED_PRODUCTS.length);
    assert.equal(await Product.countDocuments(), 0);
    assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 0);
  });

  it("fails before writing anything when a photo is missing", async () => {
    await assert.rejects(
      seedProducts({
        products: [{ ...SEED_PRODUCTS[0], image: "missing.jfif" }],
        log: quiet,
      }),
      /ENOENT/
    );
    assert.equal(await Product.countDocuments(), 0);
  });
});
