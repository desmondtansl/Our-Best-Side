import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
} from "./helpers.js";
import { parseList, parseCategories, parseProductFields } from "../src/productFields.js";

const s3Mock = mockClient(S3Client);

describe("parseProductFields", () => {
  it("splits lists on commas only, trimming and de-duplicating", () => {
    assert.deepEqual(parseList("US 8, US 9 ,US 8,, "), ["US 8", "US 9"]);
    assert.deepEqual(parseList(["S, M", " L "]), ["S", "M", "L"]);
    assert.deepEqual(parseList(""), []);
  });

  it("normalises category names", () => {
    assert.deepEqual(parseCategories("men"), ["Men"]);
    assert.deepEqual(parseCategories("Women, ladies"), ["Ladies"]);
  });

  it("validates price, stock and category", () => {
    assert.equal(parseProductFields({ price: "$1,250.50" }).fields.price, 1250.5);
    assert.match(parseProductFields({ price: "abc" }).error, /Price/);
    assert.match(parseProductFields({ price: "0" }).error, /Price/);
    assert.match(parseProductFields({ inStock: "2.5" }).error, /Inventory/);
    assert.match(parseProductFields({ category: "Kids" }).error, /Category/);
    assert.match(parseProductFields({ title: "  " }).error, /Title/);
    assert.match(parseProductFields({}, { requireAll: true }).error, /Title/);
  });
});

describe("product catalogue routes", () => {
  let app;
  let Product;
  let adminToken;

  const make = (overrides = {}) =>
    Product.create({
      title: "Tee",
      image: "key",
      category: ["Men"],
      size: ["S"],
      color: ["Black"],
      price: 60,
      ...overrides,
    });

  before(async () => {
    await setupDatabase();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    await createUser({ email: "admin@example.com", isAdmin: true });
    adminToken = tokenFor("admin@example.com");
  });

  describe("listings", () => {
    it("returns each category's products, newest first", async () => {
      await make({ title: "Old Men Tee", createdAt: new Date("2026-01-01") });
      await make({ title: "New Men Tee", createdAt: new Date("2026-02-01") });
      await make({ title: "Dress", category: ["Ladies"] });

      const men = await request(app).get("/products/men");
      assert.equal(men.status, 200);
      assert.deepEqual(men.body.map((p) => p.title), ["New Men Tee", "Old Men Tee"]);

      const ladies = await request(app).get("/products/ladies");
      assert.deepEqual(ladies.body.map((p) => p.title), ["Dress"]);
    });

    it("includes ladies products in /combined", async () => {
      await make({ title: "Tee" });
      await make({ title: "Dress", category: ["Ladies"] });
      const res = await request(app).get("/products/combined");
      assert.deepEqual(res.body.map((p) => p.title).sort(), ["Dress", "Tee"]);
    });

    it("keeps concurrent requests separate", async () => {
      await make({ title: "Tee" });
      await make({ title: "Dress", category: ["Ladies"] });
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          request(app).get(i % 2 ? "/products/ladies" : "/products/men")
        )
      );
      results.forEach((res, i) =>
        assert.deepEqual(res.body.map((p) => p.title), [i % 2 ? "Dress" : "Tee"])
      );
    });

    it("returns an empty list when there are no products", async () => {
      const res = await request(app).get("/products/men");
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, []);
    });
  });

  describe("GET /products/featured", () => {
    it("returns only featured products, at most 8", async () => {
      await make({ title: "Hidden" });
      for (let i = 0; i < 9; i++) await make({ title: `Featured ${i}`, featured: true });
      const res = await request(app).get("/products/featured");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 8);
      assert.ok(res.body.data.every((p) => p.featured));
    });
  });

  describe("single product", () => {
    it("returns the product for its own category", async () => {
      const tee = await make();
      const res = await request(app).get(`/products/men/${tee.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, "Tee");
    });

    it("returns 404 for unknown ids, bad ids and the wrong category", async () => {
      const tee = await make();
      const unknown = new mongoose.Types.ObjectId();
      for (const path of [
        `/products/men/${unknown}`,
        "/products/men/not-an-id",
        `/products/ladies/${tee.id}`,
        `/products/${unknown}`,
        "/products/not-an-id",
      ]) {
        const res = await request(app).get(path);
        assert.equal(res.status, 404, path);
        assert.equal(res.body.error, "Product not found");
      }
    });
  });

  describe("upload and edit", () => {
    const upload = () =>
      request(app)
        .post("/products/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("title", "  Suede Loafers ")
        .field("description", "Tan suede")
        .field("category", "men")
        .field("size", "US 8, US 9 , US 10")
        .field("color", "Tan, Brown")
        .field("price", "250")
        .field("inStock", "5")
        .field("featured", "true");

    it("saves sizes and colours as separate options", async () => {
      const res = await upload().attach("image", Buffer.from("img"), "a.png");
      assert.equal(res.status, 200);
      const saved = await Product.findById(res.body.data._id).lean();
      assert.equal(saved.title, "Suede Loafers");
      assert.deepEqual(saved.category, ["Men"]);
      assert.deepEqual(saved.size, ["US 8", "US 9", "US 10"]);
      assert.deepEqual(saved.color, ["Tan", "Brown"]);
      assert.equal(saved.featured, true);
    });

    it("requires an image and valid fields", async () => {
      const noImage = await upload();
      assert.equal(noImage.status, 400);
      assert.equal(noImage.body.error, "Product image is required");

      const badPrice = await upload()
        .field("price", "free")
        .attach("image", Buffer.from("img"), "a.png");
      assert.equal(badPrice.status, 400);
      assert.equal(await Product.countDocuments(), 0);
      assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 0);
    });

    it("parses lists and toggles featured when editing", async () => {
      const tee = await make();
      const res = await request(app)
        .put(`/products/${tee.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ size: "US 8, US 9", featured: true });
      assert.equal(res.status, 200);
      const saved = await Product.findById(tee.id).lean();
      assert.deepEqual(saved.size, ["US 8", "US 9"]);
      assert.equal(saved.featured, true);
      assert.deepEqual(saved.color, ["Black"]);

      await request(app)
        .put(`/products/${tee.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ featured: "false" });
      assert.equal((await Product.findById(tee.id)).featured, false);
    });

    it("rejects invalid edits", async () => {
      const tee = await make();
      const res = await request(app)
        .put(`/products/${tee.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: "-5" });
      assert.equal(res.status, 400);
      assert.equal((await Product.findById(tee.id)).price, 60);
    });
  });
});
