import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
} from "./helpers.js";

describe("admin order routes", () => {
  let app;
  let Order;
  let adminToken;
  let userToken;

  const base = { subtotal: 10, currency: "sgd", items: [{ price: 10, quantity: 1 }] };

  before(async () => {
    await setupDatabase();
    app = await createApp();
    ({ default: Order } = await import("../src/models/Order.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    await createUser({ email: "admin@example.com", isAdmin: true });
    await createUser({ email: "user@example.com" });
    adminToken = tokenFor("admin@example.com");
    userToken = tokenFor("user@example.com");
  });

  it("is admin-only", async () => {
    assert.equal((await request(app).get("/admin/orders")).status, 403);
    const res = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${userToken}`);
    assert.equal(res.status, 403);
  });

  it("lists non-pending orders by default and filters by status", async () => {
    await Order.create({ ...base, status: "paid" });
    await Order.create({ ...base, status: "shipped" });
    await Order.create({ ...base, status: "pending" });

    const all = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(all.status, 200);
    assert.deepEqual(all.body.data.map((o) => o.status).sort(), ["paid", "shipped"]);

    const shipped = await request(app)
      .get("/admin/orders?status=shipped")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.deepEqual(shipped.body.data.map((o) => o.status), ["shipped"]);

    const bad = await request(app)
      .get("/admin/orders?status=lost")
      .set("Authorization", `Bearer ${adminToken}`);
    assert.equal(bad.status, 400);
  });

  it("updates an order's status", async () => {
    const order = await Order.create({ ...base, status: "paid" });
    const res = await request(app)
      .patch(`/admin/orders/${order.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "shipped" });
    assert.equal(res.status, 200);
    assert.equal((await Order.findById(order.id)).status, "shipped");
  });

  it("rejects invalid statuses, pending orders and unknown ids", async () => {
    const paid = await Order.create({ ...base, status: "paid" });
    const pending = await Order.create({ ...base, status: "pending" });
    const patch = (id, status) =>
      request(app)
        .patch(`/admin/orders/${id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status });

    assert.equal((await patch(paid.id, "lost")).status, 400);
    assert.equal((await patch(paid.id, "pending")).status, 400);
    assert.equal((await patch(pending.id, "shipped")).status, 404);
    assert.equal((await patch(new mongoose.Types.ObjectId(), "shipped")).status, 404);
    assert.equal((await patch("not-an-id", "shipped")).status, 404);
    assert.equal((await Order.findById(paid.id)).status, "paid");
  });

  it("does not let non-admins change status", async () => {
    const order = await Order.create({ ...base, status: "paid" });
    const res = await request(app)
      .patch(`/admin/orders/${order.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "delivered" });
    assert.equal(res.status, 403);
    assert.equal((await Order.findById(order.id)).status, "paid");
  });
});
