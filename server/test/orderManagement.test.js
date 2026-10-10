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

describe("order management (detail, search, tracking, notes, refunds)", () => {
  let app;
  let Order;
  let fake;
  let adminToken;

  const base = {
    subtotal: 100,
    currency: "sgd",
    status: "paid",
    items: [{ title: "Tee", price: 50, quantity: 2 }],
  };

  const admin = {
    get: (path) => request(app).get(path).set("Authorization", `Bearer ${adminToken}`),
    patch: (path, body) =>
      request(app).patch(path).set("Authorization", `Bearer ${adminToken}`).send(body),
    put: (path, body) =>
      request(app).put(path).set("Authorization", `Bearer ${adminToken}`).send(body),
    post: (path, body) =>
      request(app).post(path).set("Authorization", `Bearer ${adminToken}`).send(body),
  };

  // A refund request, each with its own id unless one is given.
  let requestCount = 0;
  const refund = (order, amount, requestId = `test-request-${(requestCount += 1)}`) =>
    admin.post(`/admin/orders/${order.id}/refund`, { amount, requestId });

  const number = (order) => String(order._id).slice(-8).toUpperCase();

  // Sets createdAt directly (Mongoose would overwrite it).
  const placedAt = (order, iso) =>
    Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: new Date(iso) } });

  const webhook = (event) => {
    const { payload, signature } = fake.signedWebhook(event);
    return request(app)
      .post("/checkout/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", signature)
      .send(payload);
  };

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Order } = await import("../src/models/Order.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    await createUser({ email: "admin@example.com", isAdmin: true });
    await createUser({ email: "shopper@example.com" });
    adminToken = tokenFor("admin@example.com");
  });

  describe("finding orders", () => {
    it("searches by order number, with or without # and in any case, or by email", async () => {
      const jane = await Order.create({ ...base, email: "jane.tan@example.com" });
      await Order.create({ ...base, email: "lee@example.com" });

      for (const q of [number(jane), `#${number(jane)}`, number(jane).toLowerCase()]) {
        const res = await admin.get(`/admin/orders?q=${encodeURIComponent(q)}`);
        assert.deepEqual(res.body.data.map((o) => o._id), [jane.id], q);
      }
      const byEmail = await admin.get("/admin/orders?q=JANE.TAN");
      assert.deepEqual(byEmail.body.data.map((o) => o._id), [jane.id]);
      // Regex characters are searched for literally.
      const odd = await admin.get(`/admin/orders?q=${encodeURIComponent(".*")}`);
      assert.deepEqual(odd.body.data, []);
    });

    it("filters by Singapore dates, including both ends", async () => {
      const early = await Order.create({ ...base, email: "early@example.com" });
      const inside = await Order.create({ ...base, email: "inside@example.com" });
      const late = await Order.create({ ...base, email: "late@example.com" });
      await placedAt(early, "2026-09-30T15:59:00Z"); // 30 Sep, 23:59 Singapore time
      await placedAt(inside, "2026-10-02T15:30:00Z"); // 2 Oct, 23:30 Singapore time
      await placedAt(late, "2026-10-02T16:00:00Z"); // 3 Oct, 00:00 Singapore time

      const res = await admin.get("/admin/orders?from=2026-10-01&to=2026-10-02");
      assert.deepEqual(res.body.data.map((o) => o.email), ["inside@example.com"]);

      assert.equal((await admin.get("/admin/orders?from=2026-02-30")).status, 400);
      assert.equal((await admin.get("/admin/orders?to=yesterday")).status, 400);
    });

    it("pages through orders 50 at a time", async () => {
      await Order.insertMany(
        Array.from({ length: 55 }, (_, i) => ({ ...base, email: `c${i}@example.com` }))
      );
      const first = await admin.get("/admin/orders");
      assert.equal(first.body.data.length, 50);
      assert.equal(first.body.hasMore, true);
      const second = await admin.get("/admin/orders?page=2");
      assert.equal(second.body.data.length, 5);
      assert.equal(second.body.hasMore, false);
      const ids = new Set([...first.body.data, ...second.body.data].map((o) => o._id));
      assert.equal(ids.size, 55);
    });
  });

  describe("order detail", () => {
    it("returns one order with its Stripe link and refundable amount, admins only", async () => {
      const order = await Order.create({ ...base, stripePaymentIntentId: "pi_1" });
      const res = await admin.get(`/admin/orders/${order.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.stripeUrl, "https://dashboard.stripe.com/test/payments/pi_1");
      assert.equal(res.body.data.refundable, 100);

      const shopper = await request(app)
        .get(`/admin/orders/${order.id}`)
        .set("Authorization", `Bearer ${tokenFor("shopper@example.com")}`);
      assert.equal(shopper.status, 403);
    });

    it("hides unpaid checkouts and unknown ids", async () => {
      const pending = await Order.create({ ...base, status: "pending" });
      assert.equal((await admin.get(`/admin/orders/${pending.id}`)).status, 404);
      assert.equal((await admin.get("/admin/orders/not-an-id")).status, 404);
    });

    it("has nothing to refund when no Stripe payment is saved", async () => {
      const order = await Order.create(base);
      assert.equal((await admin.get(`/admin/orders/${order.id}`)).body.data.refundable, 0);
    });
  });

  describe("status history", () => {
    it("records payment, then each change with the admin who made it", async () => {
      const order = await Order.create({
        ...base,
        status: "pending",
        stripeSessionId: "cs_test_hist",
      });
      await webhook({
        id: "evt_paid",
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_test_hist", mode: "payment", payment_status: "paid", payment_intent: "pi_h" },
        },
      });
      await admin.patch(`/admin/orders/${order.id}`, { status: "processing" });
      await admin.patch(`/admin/orders/${order.id}`, { status: "processing" }); // no change
      await admin.patch(`/admin/orders/${order.id}`, { status: "shipped" });

      const { statusHistory } = (await admin.get(`/admin/orders/${order.id}`)).body.data;
      assert.deepEqual(
        statusHistory.map(({ status, by }) => ({ status, by })),
        [
          { status: "paid", by: undefined },
          { status: "processing", by: "admin@example.com" },
          { status: "shipped", by: "admin@example.com" },
        ]
      );
      assert.ok(statusHistory.every((entry) => !Number.isNaN(Date.parse(entry.at))));
    });
  });

  describe("tracking", () => {
    it("saves tracking details when an order is marked shipped", async () => {
      const order = await Order.create(base);
      const res = await admin.patch(`/admin/orders/${order.id}`, {
        status: "shipped",
        tracking: { courier: " Ninja Van ", number: "NV123", url: "https://track.example.com/NV123" },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.tracking, {
        courier: "Ninja Van",
        number: "NV123",
        url: "https://track.example.com/NV123",
      });
    });

    it("can be shipped without tracking, and tracking added or corrected later", async () => {
      const order = await Order.create(base);
      await admin.patch(`/admin/orders/${order.id}`, { status: "shipped" });
      const added = await admin.put(`/admin/orders/${order.id}/tracking`, {
        courier: "SingPost",
        number: "RR1",
        url: "",
      });
      assert.equal(added.status, 200);
      assert.deepEqual(added.body.data.tracking, { courier: "SingPost", number: "RR1", url: "" });
    });

    it("only accepts web links, so a link can't run code when clicked", async () => {
      const order = await Order.create(base);
      for (const url of ["javascript:alert(1)", "ftp://x.com", "not a link"]) {
        const shipped = await admin.patch(`/admin/orders/${order.id}`, {
          status: "shipped",
          tracking: { courier: "X", number: "1", url },
        });
        assert.equal(shipped.status, 400, url);
        const put = await admin.put(`/admin/orders/${order.id}/tracking`, { url });
        assert.equal(put.status, 400, url);
      }
      assert.equal((await Order.findById(order.id)).status, "paid");
      const long = await admin.put(`/admin/orders/${order.id}/tracking`, { number: "1".repeat(101) });
      assert.equal(long.status, 400);
    });
  });

  describe("notes", () => {
    it("saves internal notes, up to 2000 characters", async () => {
      const order = await Order.create(base);
      const res = await admin.put(`/admin/orders/${order.id}/notes`, { notes: "Gift wrap please" });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.notes, "Gift wrap please");
      const long = await admin.put(`/admin/orders/${order.id}/notes`, { notes: "x".repeat(2001) });
      assert.equal(long.status, 400);
      assert.equal((await Order.findById(order.id)).notes, "Gift wrap please");
    });

    it("never shows customers the notes or who changed what, but does show tracking and refunds", async () => {
      const shopper = await createUser({ email: "buyer@example.com" });
      const order = await Order.create({
        ...base,
        user: shopper._id,
        notes: "Difficult customer",
        statusHistory: [{ status: "paid", at: new Date(), by: "admin@example.com" }],
        refunds: [{ stripeRefundId: "re_1", amount: 10, at: new Date(), by: "admin@example.com" }],
        refundedTotal: 10,
        tracking: { courier: "SingPost", number: "RR1", url: "https://track.example.com" },
      });
      const res = await request(app)
        .get("/account/orders")
        .set("Authorization", `Bearer ${tokenFor("buyer@example.com")}`);
      const [mine] = res.body.data;
      assert.equal(mine._id, order.id);
      assert.equal(mine.notes, undefined);
      assert.equal(mine.statusHistory, undefined);
      assert.equal(mine.refunds, undefined);
      assert.equal(mine.refundedTotal, 10);
      assert.equal(mine.tracking.number, "RR1");
      assert.doesNotMatch(JSON.stringify(res.body), /admin@example\.com|Difficult/);
    });
  });

  describe("refunds", () => {
    const paidOrder = () => Order.create({ ...base, stripePaymentIntentId: "pi_r" });

    it("refunds part, then the rest, in cents, recording who did it", async () => {
      const order = await paidOrder();
      const first = await refund(order, 12.34);
      assert.equal(first.status, 200);
      assert.equal(first.body.data.refundedTotal, 12.34);
      assert.equal(first.body.data.refundable, 87.66);
      const [params, options] = fake.calls["refunds.create"][0];
      assert.deepEqual(
        { pi: params.payment_intent, amount: params.amount, by: params.metadata.by },
        { pi: "pi_r", amount: 1234, by: "admin@example.com" }
      );
      assert.ok(options.idempotencyKey);

      const rest = await refund(order, 87.66);
      assert.equal(rest.status, 200);
      assert.equal(rest.body.data.refundable, 0);
      assert.deepEqual(
        rest.body.data.refunds.map(({ amount, by }) => ({ amount, by })),
        [
          { amount: 12.34, by: "admin@example.com" },
          { amount: 87.66, by: "admin@example.com" },
        ]
      );
      // Refunding doesn't change the status.
      assert.equal(rest.body.data.status, "paid");

      const more = await refund(order, 0.01);
      assert.equal(more.status, 400);
      assert.match(more.body.error, /already been refunded in full/);
    });

    it("refuses amounts that are zero, negative, too precise or more than is left", async () => {
      const order = await paidOrder();
      for (const amount of [0, -5, "abc", undefined, 1.005, 100.01]) {
        const res = await refund(order, amount);
        assert.equal(res.status, 400, String(amount));
      }
      assert.equal(fake.calls["refunds.create"], undefined);
    });

    it("can't refund an order without a saved Stripe payment", async () => {
      const order = await Order.create(base);
      const res = await refund(order, 10);
      assert.equal(res.status, 400);
      assert.match(res.body.error, /Refund it in the Stripe Dashboard/);
    });

    it("shows Stripe's reason when Stripe refuses, and records nothing", async () => {
      const order = await paidOrder();
      fake.state.refundError = "Charge ch_1 has been charged back";
      const res = await refund(order, 10);
      assert.equal(res.status, 502);
      assert.match(res.body.error, /charged back/);
      assert.equal((await Order.findById(order.id)).refundedTotal, 0);
    });

    it("makes one refund however often the same request arrives, at once or later", async () => {
      const order = await paidOrder();
      const results = await Promise.all([
        refund(order, 30, "same-request-1"),
        refund(order, 30, "same-request-1"),
      ]);
      assert.deepEqual(results.map((r) => r.status), [200, 200]);
      // A repeat arriving after the first was recorded (e.g. a retry).
      assert.equal((await refund(order, 30, "same-request-1")).status, 200);
      assert.equal(fake.state.refunds.length, 1);
      const saved = await Order.findById(order.id);
      assert.equal(saved.refundedTotal, 30);
      assert.equal(saved.refunds.length, 1);

      // A new confirmation is a new refund.
      await refund(order, 30, "same-request-2");
      assert.equal((await Order.findById(order.id)).refundedTotal, 60);
    });

    it("refuses a refund request without its id", async () => {
      const order = await paidOrder();
      for (const requestId of [undefined, "", "short", "has spaces in it", { $ne: 1 }]) {
        const res = await admin.post(`/admin/orders/${order.id}/refund`, { amount: 10, requestId });
        assert.equal(res.status, 400, String(requestId));
      }
      assert.equal(fake.calls["refunds.create"], undefined);
    });

    it("records refunds made in the Stripe Dashboard, once, from the webhook", async () => {
      const order = await paidOrder();
      // One refund from the admin pages, one made in Stripe.
      await refund(order, 20);
      fake.state.refunds.push({
        id: "re_dashboard",
        payment_intent: "pi_r",
        amount: 1500,
        status: "succeeded",
        created: Math.floor(Date.now() / 1000),
        metadata: {},
      });
      // And one that failed, which isn't counted.
      fake.state.refunds.push({ id: "re_failed", payment_intent: "pi_r", amount: 999, status: "failed" });
      const event = {
        id: "evt_refund",
        type: "charge.refunded",
        data: { object: { id: "ch_1", object: "charge", payment_intent: "pi_r" } },
      };
      assert.equal((await webhook(event)).status, 200);
      assert.equal((await webhook(event)).status, 200); // Stripe can send it twice

      const saved = await Order.findById(order.id);
      assert.equal(saved.refundedTotal, 35);
      assert.deepEqual(
        saved.refunds.map(({ stripeRefundId, by }) => ({ stripeRefundId, by })),
        [
          { stripeRefundId: "re_test_1", by: "admin@example.com" },
          { stripeRefundId: "re_dashboard", by: undefined },
        ]
      );
    });

    it("takes refunds off the dashboard's revenue", async () => {
      const order = await paidOrder();
      await refund(order, 40);
      const stats = await admin.get("/admin/stats");
      assert.deepEqual(stats.body.data.sales.today, { revenue: 60, orders: 1, average: 60 });
    });
  });
});
