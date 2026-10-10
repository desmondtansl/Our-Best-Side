import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
  stubStripe,
  testPhoto,
} from "./helpers.js";

const s3Mock = mockClient(S3Client);

describe("product statuses, admin product list, bulk stock and sale prices", () => {
  let app;
  let Product;
  let adminToken;

  const admin = {
    get: (path) => request(app).get(path).set("Authorization", `Bearer ${adminToken}`),
    patch: (path, body) =>
      request(app).patch(path).set("Authorization", `Bearer ${adminToken}`).send(body),
    put: (path, body) =>
      request(app).put(path).set("Authorization", `Bearer ${adminToken}`).send(body),
  };

  const make = (fields) =>
    Product.create({ category: ["Men"], price: 50, image: "a.jpg", ...fields });

  before(async () => {
    await setupDatabase();
    await stubStripe();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    await createUser({ email: "admin@example.com", isAdmin: true });
    await createUser({ email: "shopper@example.com" });
    adminToken = tokenFor("admin@example.com");
  });

  describe("drafts and archived products are hidden from shoppers", () => {
    let live;
    let old;
    let draft;
    let archived;

    beforeEach(async () => {
      live = await make({ title: "Live Tee", status: "live", featured: true });
      // Products from before statuses existed have no status: still live.
      old = await make({ title: "Old Tee", featured: true });
      await Product.collection.updateOne({ _id: old._id }, { $unset: { status: "" } });
      draft = await make({ title: "Draft Tee", status: "draft", featured: true });
      archived = await make({ title: "Archived Tee", status: "archived", featured: true });
    });

    const titles = (body) => (body.data || body).map((p) => p.title).sort();

    it("in listings, the shop, search, featured and related products", async () => {
      for (const path of ["/products/men", "/products/combined", "/products/featured", "/products/shop?category=men"]) {
        const res = await request(app).get(path);
        assert.deepEqual(titles(res.body), ["Live Tee", "Old Tee"], path);
      }
      assert.deepEqual(titles((await request(app).get("/products/search/Draft")).body), []);
      assert.deepEqual(titles((await request(app).get("/products/search/Live")).body), ["Live Tee"]);
      const related = await request(app).get(`/products/${live.id}/related`);
      assert.deepEqual(titles(related.body), ["Old Tee"]);
      const facets = await request(app).get("/products/shop?category=men");
      assert.ok(facets.body.facets);
    });

    it("on their own pages", async () => {
      for (const product of [draft, archived]) {
        assert.equal((await request(app).get(`/products/${product.id}`)).status, 404);
        assert.equal((await request(app).get(`/products/men/${product.id}`)).status, 404);
      }
      assert.equal((await request(app).get(`/products/men/${old.id}`)).status, 200);
    });

    it("at checkout, even from an old cart", async () => {
      const res = await request(app)
        .post("/checkout/create-checkout-session")
        .send({ items: [{ productId: archived.id, quantity: 1 }] });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Archived Tee is no longer available. Please remove it from your cart.");
    });
  });

  describe("admin product list", () => {
    it("lists by status with counts, searches and sorts, admins only", async () => {
      await make({ title: "Black Jacket", price: 200, status: "live" });
      await make({ title: "Blue Jacket", price: 100 });
      await make({ title: "Draft Jacket", status: "draft" });
      await make({ title: "Old Hat", status: "archived" });

      const live = await admin.get("/admin/products?sort=price-asc");
      assert.equal(live.status, 200);
      assert.deepEqual(live.body.data.map((p) => p.title), ["Blue Jacket", "Black Jacket"]);
      assert.deepEqual(live.body.counts, { live: 2, draft: 1, archived: 1 });

      const drafts = await admin.get("/admin/products?status=draft");
      assert.deepEqual(drafts.body.data.map((p) => p.title), ["Draft Jacket"]);
      const search = await admin.get("/admin/products?q=bla");
      assert.deepEqual(search.body.data.map((p) => p.title), ["Black Jacket"]);

      assert.equal((await admin.get("/admin/products?status=gone")).status, 400);
      assert.equal((await admin.get("/admin/products?sort=random")).status, 400);
      const shopper = await request(app)
        .get("/admin/products")
        .set("Authorization", `Bearer ${tokenFor("shopper@example.com")}`);
      assert.equal(shopper.status, 403);
    });

    it("pages 50 at a time", async () => {
      await Product.insertMany(
        Array.from({ length: 52 }, (_, i) => ({ title: `P${i}`, price: 10, category: ["Men"] }))
      );
      const first = await admin.get("/admin/products");
      assert.equal(first.body.data.length, 50);
      assert.equal(first.body.hasMore, true);
      const second = await admin.get("/admin/products?page=2");
      assert.equal(second.body.data.length, 2);
      assert.equal(second.body.hasMore, false);
    });

    it("loads any product for editing, whatever its status", async () => {
      const draft = await make({ title: "Draft", status: "draft" });
      const res = await admin.get(`/admin/products/${draft.id}`);
      assert.equal(res.body.data.title, "Draft");
    });
  });

  describe("publish, archive and restore", () => {
    it("changes the status; archiving also takes it off the homepage", async () => {
      const product = await make({ title: "Tee", status: "draft", featured: true });
      const published = await admin.patch(`/admin/products/${product.id}/status`, { status: "live" });
      assert.equal(published.body.data.status, "live");
      assert.equal(published.body.data.featured, true);

      const archived = await admin.patch(`/admin/products/${product.id}/status`, { status: "archived" });
      assert.equal(archived.body.data.status, "archived");
      assert.equal(archived.body.data.featured, false);

      const restored = await admin.patch(`/admin/products/${product.id}/status`, { status: "live" });
      assert.equal(restored.body.data.status, "live");
      assert.equal((await request(app).get(`/products/${product.id}`)).status, 200);

      assert.equal((await admin.patch(`/admin/products/${product.id}/status`, { status: "deleted" })).status, 400);
    });

    it("saves new products as drafts when asked", async () => {
      const res = await request(app)
        .post("/products/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .field("title", "New Coat")
        .field("price", "120")
        .field("category", "Men")
        .field("status", "draft")
        .attach("images", await testPhoto(), "coat.png");
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.status, "draft");
      assert.equal((await request(app).get(`/products/${res.body.data._id}`)).status, 404);
    });
  });

  describe("bulk stock", () => {
    it("saves stock for whole products and per size, keeping totals right", async () => {
      const tee = await make({ title: "Tee", inStock: 1 });
      const shirt = await make({
        title: "Shirt",
        size: ["S", "M"],
        sizeStock: [{ size: "S", inStock: 1 }, { size: "M", inStock: 1 }],
        inStock: 2,
      });
      const res = await admin.put("/admin/products/stock", {
        changes: [
          { id: tee.id, updatedAt: tee.updatedAt, inStock: 12 },
          { id: shirt.id, updatedAt: shirt.updatedAt, sizeStock: { S: 4, M: 5 } },
        ],
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.conflicts, []);
      assert.equal((await Product.findById(tee.id)).inStock, 12);
      const saved = await Product.findById(shirt.id);
      assert.equal(saved.inStock, 9);
      assert.deepEqual(saved.sizeStock.map((s) => s.inStock), [4, 5]);
    });

    it("saves nothing if any row is invalid", async () => {
      const tee = await make({ title: "Tee", inStock: 1 });
      const cap = await make({ title: "Cap", inStock: 1 });
      const res = await admin.put("/admin/products/stock", {
        changes: [
          { id: tee.id, inStock: 5 },
          { id: cap.id, inStock: -2 },
        ],
      });
      assert.equal(res.status, 400);
      assert.match(res.body.error, /^Cap:/);
      assert.equal((await Product.findById(tee.id)).inStock, 1);
    });

    it("doesn't overwrite a product that changed since the page was loaded", async () => {
      const tee = await make({ title: "Tee", inStock: 5 });
      const loadedAt = tee.updatedAt;
      // An order comes in meanwhile.
      await new Promise((resolve) => setTimeout(resolve, 5));
      await Product.updateOne({ _id: tee._id }, { $inc: { inStock: -1 } });
      const res = await admin.put("/admin/products/stock", {
        changes: [{ id: tee.id, updatedAt: loadedAt, inStock: 20 }],
      });
      assert.deepEqual(res.body.data.conflicts, [{ id: tee.id, title: "Tee" }]);
      assert.equal((await Product.findById(tee.id)).inStock, 4);
    });
  });

  describe("sale prices", () => {
    it("saves a was-price above the price, and ends the sale when emptied", async () => {
      const tee = await make({ title: "Tee", price: 40 });
      const edit = (fields) => {
        const req = request(app).put(`/products/${tee.id}`).set("Authorization", `Bearer ${adminToken}`);
        for (const [key, value] of Object.entries(fields)) req.field(key, value);
        return req;
      };
      const onSale = await edit({ compareAtPrice: "60" });
      assert.equal(onSale.status, 200);
      assert.equal(onSale.body.data.compareAtPrice, 60);

      const tooLow = await edit({ compareAtPrice: "30" });
      assert.equal(tooLow.status, 400);
      assert.match(tooLow.body.error, /must be higher than the price/);
      // Raising the price above the was-price is refused too.
      assert.equal((await edit({ price: "70" })).status, 400);

      const ended = await edit({ compareAtPrice: "" });
      assert.equal(ended.body.data.compareAtPrice, null);
    });

    it("checkout always charges the price, not the was-price", async () => {
      const fake = await stubStripe();
      fake.reset();
      const tee = await make({ title: "Tee", price: 40, compareAtPrice: 60 });
      await request(app)
        .post("/checkout/create-checkout-session")
        .send({ items: [{ productId: tee.id, quantity: 1 }] });
      const [params] = fake.calls["sessions.create"];
      assert.equal(params.line_items[0].price_data.unit_amount, 4000);
    });
  });
});
