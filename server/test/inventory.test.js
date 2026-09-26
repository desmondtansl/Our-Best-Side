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

describe("stock tracking", () => {
  let app;
  let Product;
  let Order;
  let fake;
  let tee;
  let adminToken;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ default: Order } = await import("../src/models/Order.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    tee = await Product.create({ title: "Tee", category: ["Men"], price: 50, inStock: 3 });
    await createUser({ email: "admin@example.com", isAdmin: true });
    adminToken = tokenFor("admin@example.com");
  });

  const checkout = (items) =>
    request(app).post("/checkout/create-checkout-session").send({ items });

  const pay = async (sessionId) => {
    const { payload, signature } = fake.signedWebhook({
      id: "evt",
      type: "checkout.session.completed",
      data: { object: { id: sessionId, mode: "payment", payment_status: "paid" } },
    });
    return request(app)
      .post("/checkout/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature)
      .send(payload);
  };

  const stock = async () => (await Product.findById(tee.id)).inStock;

  it("refuses to check out more than is in stock, counting all sizes together", async () => {
    const res = await checkout([
      { productId: tee.id, quantity: 2, size: "S" },
      { productId: tee.id, quantity: 2, size: "M" },
    ]);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Only 3 left of Tee");
    assert.equal(await Order.countDocuments(), 0);
  });

  it("refuses out-of-stock products", async () => {
    await Product.updateOne({ _id: tee.id }, { inStock: 0 });
    const res = await checkout([{ productId: tee.id, quantity: 1 }]);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "Tee is out of stock");
  });

  it("treats products without a stock number as unlimited", async () => {
    const hat = await Product.create({ title: "Hat", category: ["Men"], price: 20 });
    const res = await checkout([{ productId: hat.id, quantity: 50 }]);
    assert.equal(res.status, 200);
  });

  it("takes stock only once payment succeeds, and only once", async () => {
    await checkout([{ productId: tee.id, quantity: 2 }]);
    assert.equal(await stock(), 3, "not reserved before payment");

    const order = await Order.findOne();
    await pay(order.stripeSessionId);
    assert.equal(await stock(), 1);

    await pay(order.stripeSessionId); // Stripe re-delivers events
    assert.equal(await stock(), 1);
  });

  it("never goes below zero when two shoppers buy the last items", async () => {
    await checkout([{ productId: tee.id, quantity: 2 }]);
    await checkout([{ productId: tee.id, quantity: 2 }]);
    const [first, second] = await Order.find().sort({ createdAt: 1 });
    await pay(first.stripeSessionId);
    await pay(second.stripeSessionId);
    assert.equal(await stock(), 0);
  });

  it("returns stock when an admin cancels, and takes it again if un-cancelled", async () => {
    await checkout([{ productId: tee.id, quantity: 2 }]);
    const order = await Order.findOne();
    await pay(order.stripeSessionId);
    assert.equal(await stock(), 1);

    const setStatus = (status) =>
      request(app)
        .patch(`/admin/orders/${order.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status });

    assert.equal((await setStatus("cancelled")).status, 200);
    assert.equal(await stock(), 3);
    await setStatus("cancelled"); // no double restock
    assert.equal(await stock(), 3);
    await setStatus("processing");
    assert.equal(await stock(), 1);
    await setStatus("shipped"); // other changes leave stock alone
    assert.equal(await stock(), 1);
  });
});
