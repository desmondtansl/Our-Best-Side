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

const s3Mock = mockClient(S3Client);

describe("product routes", () => {
  let app;
  let Product;
  let adminToken;
  let userToken;

  const createProduct = (overrides = {}) =>
    Product.create({
      title: "Suede Loafers",
      description: "Brown suede loafers",
      image: "existing-image-key",
      category: ["Men"],
      size: ["US 8", "US 9"],
      color: ["Brown"],
      price: 250,
      inStock: 10,
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
    await createUser({ email: "user@example.com" });
    adminToken = tokenFor("admin@example.com");
    userToken = tokenFor("user@example.com");
  });

  const uploadRequest = (token) => {
    const req = request(app).post("/products/upload");
    if (token) req.set("Authorization", `Bearer ${token}`);
    return req
      .field("title", "Black Leather Jacket")
      .field("description", "A jacket")
      .field("category", "Men")
      .field("size", "M")
      .field("color", "Black")
      .field("price", "300")
      .field("inStock", "5")
      .attach("image", Buffer.from("fake image"), {
        filename: "jacket.png",
        contentType: "image/png",
      });
  };

  describe("POST /products/upload", () => {
    it("rejects requests without a token", async () => {
      const res = await uploadRequest();
      assert.equal(res.status, 403);
      assert.equal(await Product.countDocuments(), 0);
    });

    it("rejects non-admin users", async () => {
      const res = await uploadRequest(userToken);
      assert.equal(res.status, 403);
      assert.equal(await Product.countDocuments(), 0);
      assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 0);
    });

    it("rejects a token for a user that no longer exists", async () => {
      const res = await uploadRequest(tokenFor("deleted@example.com"));
      assert.equal(res.status, 403);
    });

    it("allows admins and uploads the image to S3", async () => {
      const res = await uploadRequest(adminToken);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, "Black Leather Jacket");

      const calls = s3Mock.commandCalls(PutObjectCommand);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].args[0].input.Bucket, "test-bucket");
      assert.equal(calls[0].args[0].input.Key, res.body.data.image);
    });
  });

  describe("PUT /products/:id", () => {
    it("rejects requests without a token", async () => {
      const product = await createProduct();
      const res = await request(app)
        .put(`/products/${product.id}`)
        .send({ title: "Hacked" });
      assert.equal(res.status, 403);
      assert.equal((await Product.findById(product.id)).title, "Suede Loafers");
    });

    it("rejects non-admin users", async () => {
      const product = await createProduct();
      const res = await request(app)
        .put(`/products/${product.id}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ title: "Hacked" });
      assert.equal(res.status, 403);
      assert.equal((await Product.findById(product.id)).title, "Suede Loafers");
    });

    it("updates fields and keeps the existing image when none is sent", async () => {
      const product = await createProduct();
      const res = await request(app)
        .put(`/products/${product.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .field("title", "Suede Loafers v2")
        .field("price", "199")
        .field("size", "US 8")
        .field("size", "US 10");
      assert.equal(res.status, 200);

      const saved = await Product.findById(product.id);
      assert.equal(saved.title, "Suede Loafers v2");
      assert.equal(saved.price, 199);
      assert.deepEqual([...saved.size], ["US 8", "US 10"]);
      assert.equal(saved.image, "existing-image-key");
      assert.equal(s3Mock.commandCalls(PutObjectCommand).length, 0);
    });

    it("uploads a new image and stores its key when one is sent", async () => {
      const product = await createProduct();
      const res = await request(app)
        .put(`/products/${product.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .field("title", "Suede Loafers")
        .attach("image", Buffer.from("new image"), {
          filename: "new.png",
          contentType: "image/png",
        });
      assert.equal(res.status, 200);

      const calls = s3Mock.commandCalls(PutObjectCommand);
      assert.equal(calls.length, 1);
      const saved = await Product.findById(product.id);
      assert.notEqual(saved.image, "existing-image-key");
      assert.equal(saved.image, calls[0].args[0].input.Key);
    });

    it("ignores fields that are not editable", async () => {
      const product = await createProduct();
      const otherId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/products/${product.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          _id: otherId,
          createdAt: "2000-01-01T00:00:00.000Z",
          image: "attacker-chosen-key",
          isAdmin: true,
          title: "Renamed",
        });
      assert.equal(res.status, 200);

      const saved = await Product.findById(product.id).lean();
      assert.equal(saved.title, "Renamed");
      assert.equal(saved.image, "existing-image-key");
      assert.equal(saved.isAdmin, undefined);
      assert.deepEqual(saved.createdAt, product.createdAt);
      assert.equal(await Product.findById(otherId), null);
    });

    it("returns 404 for an unknown product", async () => {
      const res = await request(app)
        .put(`/products/${new mongoose.Types.ObjectId()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Nothing" });
      assert.equal(res.status, 404);
    });
  });

  describe("GET /products/search/:query", () => {
    beforeEach(async () => {
      await createProduct({ title: "Suede Loafers" });
      await createProduct({ title: "Long Sleeve Tee" });
      await createProduct({ title: "[Sale] Tee" });
    });

    it("matches titles by prefix, case-insensitively", async () => {
      const res = await request(app).get("/products/search/suede");
      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.data.map((p) => p.title),
        ["Suede Loafers"]
      );
    });

    it("treats regex metacharacters literally", async () => {
      const wildcard = await request(app).get(
        `/products/search/${encodeURIComponent(".*")}`
      );
      assert.equal(wildcard.status, 200);
      assert.deepEqual(wildcard.body.data, []);

      const bracket = await request(app).get(
        `/products/search/${encodeURIComponent("[")}`
      );
      assert.equal(bracket.status, 200);
      assert.deepEqual(
        bracket.body.data.map((p) => p.title),
        ["[Sale] Tee"]
      );
    });

    it("does not choke on catastrophic-backtracking patterns", async () => {
      const res = await request(app).get(
        `/products/search/${encodeURIComponent("(a+)+$")}`
      );
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, []);
    });
  });
});
