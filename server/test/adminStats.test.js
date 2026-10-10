import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
} from "./helpers.js";

const DAY = 24 * 60 * 60 * 1000;

describe("periodStarts", () => {
  let periodStarts;

  before(async () => {
    ({ periodStarts } = await import("../src/routes/adminStats.js"));
  });

  it("starts today at midnight Singapore time, not UTC", () => {
    // 10 Oct 2026, 01:30 in Singapore is still 9 Oct in UTC.
    const starts = periodStarts(new Date("2026-10-09T17:30:00Z"));
    assert.equal(starts.today.toISOString(), "2026-10-09T16:00:00.000Z");
    // The 7 and 30 days include today.
    assert.equal(starts.week.toISOString(), "2026-10-03T16:00:00.000Z");
    assert.equal(starts.month.toISOString(), "2026-09-10T16:00:00.000Z");
  });

  it("keeps the same day until midnight Singapore time", () => {
    // 10 Oct 2026, 23:59 in Singapore.
    const starts = periodStarts(new Date("2026-10-10T15:59:00Z"));
    assert.equal(starts.today.toISOString(), "2026-10-09T16:00:00.000Z");
  });
});

describe("admin stats route", () => {
  let app;
  let Order;
  let Product;
  let adminToken;

  // Creates an order placed `daysAgo` days before now.
  const placeOrder = async ({ daysAgo = 0, status = "paid", items, ...rest }) => {
    const lines = items || [{ title: "Tee", price: 20, quantity: 1 }];
    const order = await Order.create({
      subtotal: lines.reduce((sum, item) => sum + item.price * item.quantity, 0),
      currency: "sgd",
      items: lines,
      status,
      ...rest,
    });
    // Mongoose sets createdAt itself; the driver call sets it directly.
    const createdAt = new Date(Date.now() - daysAgo * DAY);
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt } });
    return order;
  };

  const getStats = (token = adminToken) =>
    request(app).get("/admin/stats").set("Authorization", `Bearer ${token}`);

  before(async () => {
    await setupDatabase();
    app = await createApp();
    ({ default: Order } = await import("../src/models/Order.js"));
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    await createUser({ email: "admin@example.com", isAdmin: true });
    await createUser({ email: "user@example.com" });
    adminToken = tokenFor("admin@example.com");
  });

  it("is admin-only", async () => {
    assert.equal((await request(app).get("/admin/stats")).status, 403);
    assert.equal((await getStats(tokenFor("user@example.com"))).status, 403);
  });

  it("works for a shop with no orders or products", async () => {
    const res = await getStats();
    assert.equal(res.status, 200);
    const { sales, toShip, lowStock, bestSellers, recentOrders } = res.body.data;
    assert.deepEqual(sales.today, { revenue: 0, orders: 0, average: 0 });
    assert.deepEqual(toShip, { count: 0, oldest: null });
    assert.deepEqual(lowStock, { threshold: 3, items: [] });
    assert.deepEqual(bestSellers, []);
    assert.deepEqual(recentOrders, []);
  });

  it("totals sales for today, 7 and 30 days, leaving out unpaid and cancelled orders", async () => {
    await placeOrder({ items: [{ title: "Tee", price: 20, quantity: 2 }] }); // 40 today
    await placeOrder({ status: "delivered", items: [{ title: "Tee", price: 10.5, quantity: 1 }] });
    await placeOrder({ daysAgo: 3, status: "shipped", items: [{ title: "Tee", price: 30, quantity: 1 }] });
    await placeOrder({ daysAgo: 20, status: "processing", items: [{ title: "Tee", price: 100, quantity: 1 }] });
    // Not counted: too old, unpaid, cancelled.
    await placeOrder({ daysAgo: 40, items: [{ title: "Tee", price: 999, quantity: 1 }] });
    await placeOrder({ status: "pending", items: [{ title: "Tee", price: 999, quantity: 1 }] });
    await placeOrder({ status: "cancelled", items: [{ title: "Tee", price: 999, quantity: 1 }] });

    const { sales } = (await getStats()).body.data;
    assert.deepEqual(sales.today, { revenue: 50.5, orders: 2, average: 25.25 });
    assert.deepEqual(sales.week, { revenue: 80.5, orders: 3, average: 26.83 });
    assert.deepEqual(sales.month, { revenue: 180.5, orders: 4, average: 45.13 });
  });

  it("counts orders waiting to ship and finds the oldest", async () => {
    await placeOrder({ status: "paid" });
    const oldest = await placeOrder({ daysAgo: 2, status: "processing" });
    await placeOrder({ daysAgo: 5, status: "shipped" });
    await placeOrder({ daysAgo: 9, status: "pending" });

    const { toShip } = (await getStats()).body.data;
    assert.equal(toShip.count, 2);
    const stored = await Order.findById(oldest.id);
    assert.equal(toShip.oldest, stored.createdAt.toISOString());
  });

  it("lists low stock per size and per product, sold out first", async () => {
    const shirt = await Product.create({
      title: "Linen Shirt",
      sizeStock: [
        { size: "S", inStock: 10 },
        { size: "M", inStock: 1 },
        { size: "L", inStock: 0 },
      ],
      inStock: 11,
    });
    const cap = await Product.create({ title: "Cap", inStock: 3 });
    await Product.create({ title: "Belt", inStock: 4 }); // above the threshold
    await Product.create({ title: "Scarf" }); // stock not tracked
    await Product.create({ title: "Jacket", sizeStock: [{ size: "M", inStock: 8 }], inStock: 8 });

    const { lowStock } = (await getStats()).body.data;
    assert.equal(lowStock.threshold, 3);
    assert.deepEqual(lowStock.items, [
      { productId: shirt.id, title: "Linen Shirt", size: "L", inStock: 0 },
      { productId: shirt.id, title: "Linen Shirt", size: "M", inStock: 1 },
      { productId: cap.id, title: "Cap", inStock: 3 },
    ]);
  });

  it("ranks the top 5 products sold in the last 30 days", async () => {
    const ids = [];
    for (let i = 0; i < 7; i += 1) ids.push((await Product.create({ title: `P${i}` })).id);
    const line = (i, quantity, price = 10) => ({ product: ids[i], title: `P${i}`, price, quantity });

    await placeOrder({ items: [line(0, 1), line(1, 5)] });
    await placeOrder({ daysAgo: 10, items: [line(0, 3), line(2, 2, 50)] });
    await placeOrder({ items: [line(3, 2, 10), line(4, 1), line(5, 1, 99)] });
    // Not counted.
    await placeOrder({ status: "cancelled", items: [line(6, 50)] });
    await placeOrder({ daysAgo: 31, items: [line(6, 50)] });

    const { bestSellers } = (await getStats()).body.data;
    assert.deepEqual(bestSellers, [
      { productId: ids[1], title: "P1", units: 5, revenue: 50 },
      { productId: ids[0], title: "P0", units: 4, revenue: 40 },
      { productId: ids[2], title: "P2", units: 2, revenue: 100 },
      { productId: ids[3], title: "P3", units: 2, revenue: 20 },
      { productId: ids[5], title: "P5", units: 1, revenue: 99 },
    ]);
  });

  it("shows the 5 most recent orders, without unpaid ones", async () => {
    for (let i = 1; i <= 6; i += 1) {
      await placeOrder({ daysAgo: i, status: i === 2 ? "cancelled" : "paid", email: `c${i}@example.com` });
    }
    await placeOrder({ status: "pending", email: "unpaid@example.com" });

    const { recentOrders } = (await getStats()).body.data;
    assert.deepEqual(
      recentOrders.map((order) => order.email),
      ["c1@example.com", "c2@example.com", "c3@example.com", "c4@example.com", "c5@example.com"]
    );
    assert.equal(recentOrders[1].status, "cancelled");
    assert.equal(recentOrders[0].shippingAddress, undefined);
  });
});
