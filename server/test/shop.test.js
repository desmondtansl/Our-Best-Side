import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { setupDatabase, teardownDatabase, clearDatabase, createApp } from "./helpers.js";
import { parseShopQuery, compareSizes, rankRelated } from "../src/shopQuery.js";

describe("parseShopQuery", () => {
  it("reads category, words, options, prices, sort and limit", () => {
    assert.deepEqual(
      parseShopQuery({
        category: "Ladies",
        q: "  black   jacket ",
        size: ["M", "US 8, US 9"],
        color: "Black",
        min: "50",
        max: "200",
        sort: "price-desc",
        limit: "500",
      }),
      {
        category: "Ladies",
        words: ["black", "jacket"],
        sizes: ["M", "US 8", "US 9"],
        colors: ["Black"],
        minPrice: 50,
        maxPrice: 200,
        sort: "price-desc",
        limit: 50,
      }
    );
  });

  it("ignores unknown or unsafe values", () => {
    const parsed = parseShopQuery({
      category: "kids",
      q: { $ne: "" },
      size: { $ne: "" },
      color: [{ $gt: "" }, "Red"],
      min: "-5",
      max: "abc",
      sort: "constructor",
      limit: "0",
    });
    assert.deepEqual(parsed, {
      category: undefined,
      words: [],
      sizes: [],
      colors: ["Red"],
      minPrice: undefined,
      maxPrice: undefined,
      sort: "newest",
      limit: undefined,
    });
  });

  it("orders sizes S, M, L, then numbers, then the rest", () => {
    assert.deepEqual(
      ["XL", "US 10", "One Size", "S", "US 8", "M", "28"].sort(compareSizes),
      ["S", "M", "XL", "US 8", "US 10", "28", "One Size"]
    );
  });

  it("ranks related products by shared title words, then colours", () => {
    const product = { title: "Suede Loafers", color: ["Tan"] };
    const candidates = [
      { title: "Linen Shirt", color: ["White"] },
      { title: "Tan Belt", color: ["Tan"] },
      { title: "Leather Loafers", color: ["Black"] },
      { title: "Chinos", color: ["Navy"] },
    ];
    assert.deepEqual(
      rankRelated(product, candidates, 3).map((p) => p.title),
      ["Leather Loafers", "Tan Belt", "Linen Shirt"]
    );
  });
});

describe("shop routes", () => {
  let app;
  let Product;

  const make = (overrides = {}) =>
    Product.create({
      title: "Tee",
      description: "",
      image: "key",
      category: ["Men"],
      size: ["S"],
      color: ["Black"],
      price: 60,
      ...overrides,
    });

  const titles = (res) => res.body.data.map((p) => p.title);

  before(async () => {
    await setupDatabase();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(clearDatabase);

  describe("GET /products/shop", () => {
    beforeEach(async () => {
      await make({
        title: "Black Leather Jacket",
        description: "Soft lambskin biker jacket",
        size: ["M", "L"],
        color: ["Black"],
        price: 250,
        createdAt: new Date("2026-01-01"),
      });
      await make({
        title: "Suede Loafers",
        description: "Tan suede loafers",
        size: ["US 8, US 9"], // older product: sizes stored in one entry
        color: ["Tan"],
        price: 180,
        createdAt: new Date("2026-02-01"),
      });
      await make({
        title: "White Casual Shirt",
        description: "Short-sleeve cotton shirt",
        size: ["S", "M"],
        color: ["White"],
        price: 80,
        createdAt: new Date("2026-03-01"),
      });
      await make({
        title: "Ladies Blue Dress",
        description: "Floral summer dress",
        category: ["Ladies"],
        size: ["S"],
        color: ["Blue"],
        price: 80,
        createdAt: new Date("2026-04-01"),
      });
    });

    it("lists a category newest first, with the filter options on offer", async () => {
      const res = await request(app).get("/products/shop?category=men");
      assert.equal(res.status, 200);
      assert.deepEqual(titles(res), [
        "White Casual Shirt",
        "Suede Loafers",
        "Black Leather Jacket",
      ]);
      assert.deepEqual(res.body.facets, {
        sizes: ["S", "M", "L", "US 8", "US 9"],
        colors: ["Black", "Tan", "White"],
        price: { min: 80, max: 250 },
      });
    });

    it("searches every word across title, description, colour and category", async () => {
      assert.deepEqual(titles(await request(app).get("/products/shop?q=black%20jacket")), [
        "Black Leather Jacket",
      ]);
      // "Tan" is only in the colour and description, "cotton" only in the description.
      assert.deepEqual(titles(await request(app).get("/products/shop?q=tan")), [
        "Suede Loafers",
      ]);
      assert.deepEqual(titles(await request(app).get("/products/shop?q=COTTON")), [
        "White Casual Shirt",
      ]);
      // Matches the start of words, so it works while typing.
      assert.deepEqual(titles(await request(app).get("/products/shop?q=loaf")), [
        "Suede Loafers",
      ]);
      assert.deepEqual(titles(await request(app).get("/products/shop?q=ladies%20dress")), [
        "Ladies Blue Dress",
      ]);
      assert.deepEqual(titles(await request(app).get("/products/shop?q=jacket%20dress")), []);
    });

    it("matches whole words from their start, not text inside other words", async () => {
      // "men" must not match "women" or "garment".
      await make({ title: "Garment Bag", description: "For women", category: ["Ladies"] });
      const res = await request(app).get("/products/shop?q=men");
      assert.equal(res.status, 200);
      assert.ok(!titles(res).includes("Garment Bag"));
    });

    it("treats regex characters in the search as plain text", async () => {
      for (const q of [".*", "(a+)+$", "[", "\\"]) {
        const res = await request(app).get(`/products/shop?q=${encodeURIComponent(q)}`);
        assert.equal(res.status, 200, q);
        assert.deepEqual(titles(res), [], q);
      }
    });

    it("filters by any of the chosen sizes, including older combined entries", async () => {
      const res = await request(app).get("/products/shop?category=men&size=L&size=us%209");
      assert.deepEqual(titles(res), ["Suede Loafers", "Black Leather Jacket"]);
      // "S" must not match "US 8".
      const small = await request(app).get("/products/shop?category=men&size=S");
      assert.deepEqual(titles(small), ["White Casual Shirt"]);
    });

    it("filters by colour and price, combining all filters", async () => {
      assert.deepEqual(
        titles(await request(app).get("/products/shop?color=white&color=Blue")),
        ["Ladies Blue Dress", "White Casual Shirt"]
      );
      assert.deepEqual(titles(await request(app).get("/products/shop?min=100&max=200")), [
        "Suede Loafers",
      ]);
      assert.deepEqual(
        titles(await request(app).get("/products/shop?category=men&size=M&max=100")),
        ["White Casual Shirt"]
      );
    });

    it("keeps offering every option while filters are applied", async () => {
      const res = await request(app).get("/products/shop?category=men&color=Tan");
      assert.deepEqual(titles(res), ["Suede Loafers"]);
      assert.deepEqual(res.body.facets.colors, ["Black", "Tan", "White"]);
    });

    it("sorts by price either way, and falls back to newest", async () => {
      const asc = await request(app).get("/products/shop?category=men&sort=price-asc");
      assert.deepEqual(asc.body.data.map((p) => p.price), [80, 180, 250]);
      const desc = await request(app).get("/products/shop?category=men&sort=price-desc");
      assert.deepEqual(desc.body.data.map((p) => p.price), [250, 180, 80]);
      const unknown = await request(app).get("/products/shop?category=men&sort=nope");
      assert.equal(titles(unknown)[0], "White Casual Shirt");
    });

    it("limits results for search suggestions and skips the filter options", async () => {
      const res = await request(app).get("/products/shop?q=s&limit=2");
      assert.equal(res.body.data.length, 2);
      assert.equal(res.body.facets, undefined);
    });

    it("can't be turned into a database operator from the URL", async () => {
      const res = await request(app).get("/products/shop?size[$ne]=x&category[$ne]=Men");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 4);
    });

    it("returns empty results and no price range when nothing matches", async () => {
      const res = await request(app).get("/products/shop?q=zzz");
      assert.deepEqual(res.body.data, []);
      assert.deepEqual(res.body.facets, { sizes: [], colors: [], price: null });
    });
  });

  describe("GET /products/:id/related", () => {
    it("suggests up to 4 in-stock products from the same category, most similar first", async () => {
      const loafers = await make({ title: "Suede Loafers", color: ["Tan"] });
      await make({ title: "Leather Loafers", color: ["Black"] });
      await make({ title: "Tan Belt", color: ["Tan"] });
      await make({ title: "Shirt One" });
      await make({ title: "Shirt Two" });
      await make({ title: "Sold Out Loafers", inStock: 0 });
      await make({ title: "Ladies Loafers", category: ["Ladies"] });

      const res = await request(app).get(`/products/${loafers._id}/related`);
      assert.equal(res.status, 200);
      const result = titles(res);
      assert.equal(result.length, 4);
      assert.deepEqual(result.slice(0, 2), ["Leather Loafers", "Tan Belt"]);
      assert.ok(!result.includes("Suede Loafers"), "never suggests itself");
      assert.ok(!result.includes("Sold Out Loafers"), "skips out-of-stock products");
      assert.ok(!result.includes("Ladies Loafers"), "stays in the category");
    });

    it("returns an empty list when there's nothing else, and 404 for unknown products", async () => {
      const only = await make({ title: "Only Tee" });
      const res = await request(app).get(`/products/${only._id}/related`);
      assert.deepEqual(res.body.data, []);

      assert.equal((await request(app).get("/products/not-an-id/related")).status, 404);
      assert.equal(
        (await request(app).get("/products/64b000000000000000000000/related")).status,
        404
      );
    });
  });
});
