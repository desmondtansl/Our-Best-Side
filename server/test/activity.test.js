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
  stubStripe,
} from "./helpers.js";

describe("admin activity log", () => {
  let app;
  let Order;
  let Product;
  let fake;

  const as = (email) => {
    const auth = (req) => req.set("Authorization", `Bearer ${tokenFor(email)}`);
    return {
      get: (path) => auth(request(app).get(path)),
      post: (path, body) => auth(request(app).post(path)).send(body),
      put: (path, body) => auth(request(app).put(path)).send(body),
      patch: (path, body) => auth(request(app).patch(path)).send(body),
      delete: (path) => auth(request(app).delete(path)),
    };
  };
  const owner = () => as("owner@example.com");
  const staff = () => as("staff@example.com");

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Order } = await import("../src/models/Order.js"));
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    await createUser({ email: "owner@example.com", isOwner: true });
    await createUser({ email: "staff@example.com", isAdmin: true });
    await createUser({ email: "new@example.com" });
  });

  it("records who did what in orders, products, promotions and admin access", async () => {
    const order = await Order.create({
      subtotal: 100,
      currency: "sgd",
      status: "paid",
      stripePaymentIntentId: "pi_1",
      items: [{ title: "Tee", price: 50, quantity: 2 }],
    });
    const tee = await Product.create({ title: "Tee", category: ["Men"], price: 50, inStock: 3 });
    const ref = `#${String(order._id).slice(-8).toUpperCase()}`;

    await staff().patch(`/admin/orders/${order.id}`, { status: "processing" });
    await staff().put(`/admin/orders/${order.id}/notes`, { notes: "Gift wrap" });
    await staff().put(`/admin/orders/${order.id}/tracking`, { courier: "SingPost", number: "1" });
    await staff().post(`/admin/orders/${order.id}/refund`, { amount: 20, requestId: "activity-request-1" });
    await staff().patch(`/admin/products/${tee.id}/status`, { status: "archived" });
    await staff().put("/admin/products/stock", { changes: [{ id: tee.id, inStock: 9 }] });
    const promo = await staff().post("/admin/promotions", {
      name: "Staff deal",
      code: "STAFF90",
      percentOff: 90,
      startDate: "2026-10-01",
    });
    await staff().put(`/admin/promotions/${promo.body.data._id}`, {
      name: "Staff deal",
      code: "STAFF90",
      percentOff: 90,
      startDate: "2026-10-01",
      active: false,
    });
    await staff().delete(`/admin/promotions/${promo.body.data._id}`);
    await owner().post("/admin/users/grant", { email: "new@example.com" });

    const res = await owner().get("/admin/users/activity");
    assert.equal(res.status, 200);
    const lines = res.body.data.map((a) => `${a.by}: ${a.summary}`).reverse();
    assert.deepEqual(lines, [
      `staff@example.com: Changed order ${ref} from paid to processing`,
      `staff@example.com: Edited the notes on order ${ref}`,
      `staff@example.com: Updated tracking on order ${ref}`,
      `staff@example.com: Refunded $20.00 on order ${ref}`,
      'staff@example.com: Archived "Tee"',
      'staff@example.com: Updated stock for "Tee"',
      "staff@example.com: Created promotion STAFF90 (90% off)",
      "staff@example.com: Paused promotion STAFF90",
      "staff@example.com: Deleted promotion STAFF90",
      "owner@example.com: Gave admin access to new@example.com",
    ]);
  });

  it("doesn't record anything for requests that were refused", async () => {
    const order = await Order.create({ subtotal: 10, currency: "sgd", status: "cancelled", items: [{ price: 10, quantity: 1 }] });
    await staff().patch(`/admin/orders/${order.id}`, { status: "paid" });
    await staff().post(`/admin/orders/${order.id}/refund`, { amount: 5, requestId: "activity-request-2" });
    assert.deepEqual((await owner().get("/admin/users/activity")).body.data, []);
  });

  it("is for the owner only", async () => {
    assert.equal((await staff().get("/admin/users/activity")).status, 403);
    assert.equal((await request(app).get("/admin/users/activity")).status, 403);
  });
});
