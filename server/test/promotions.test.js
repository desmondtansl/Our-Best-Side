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

const DAY = 24 * 60 * 60 * 1000;
// A Singapore date (YYYY-MM-DD) `days` from today.
const sgDate = (days) =>
  new Date(Date.now() + 8 * 60 * 60 * 1000 + days * DAY).toISOString().slice(0, 10);

describe("discount codes", () => {
  let app;
  let fake;
  let Product;
  let Order;
  let Promotion;
  let adminToken;
  let tee;

  const admin = {
    get: (path) => request(app).get(path).set("Authorization", `Bearer ${adminToken}`),
    post: (path, body) =>
      request(app).post(path).set("Authorization", `Bearer ${adminToken}`).send(body),
    put: (path, body) =>
      request(app).put(path).set("Authorization", `Bearer ${adminToken}`).send(body),
    delete: (path) => request(app).delete(path).set("Authorization", `Bearer ${adminToken}`),
  };

  const promo = (fields = {}) => ({
    name: "Welcome offer",
    code: "welcome10",
    percentOff: 10,
    startDate: sgDate(0),
    endDate: sgDate(7),
    ...fields,
  });

  const checkCode = (code) => request(app).post("/checkout/discount").send({ code });

  const checkout = (body) => request(app).post("/checkout/create-checkout-session").send(body);

  const pay = (sessionId, extra = {}) => {
    const { payload, signature } = fake.signedWebhook({
      id: "evt",
      type: "checkout.session.completed",
      data: { object: { id: sessionId, mode: "payment", payment_status: "paid", ...extra } },
    });
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
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ default: Order } = await import("../src/models/Order.js"));
    ({ default: Promotion } = await import("../src/models/Promotion.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    await createUser({ email: "admin@example.com", isAdmin: true });
    await createUser({ email: "shopper@example.com" });
    adminToken = tokenFor("admin@example.com");
    tee = await Product.create({ title: "Tee", category: ["Men"], price: 33.33, inStock: 10 });
  });

  describe("managing promotions", () => {
    it("creates, lists and edits a promotion, admins only", async () => {
      const created = await admin.post("/admin/promotions", promo());
      assert.equal(created.status, 201);
      assert.equal(created.body.data.code, "WELCOME10");
      assert.equal(created.body.data.state, "running");

      const list = await admin.get("/admin/promotions");
      assert.deepEqual(list.body.data.map((p) => p.name), ["Welcome offer"]);

      const edited = await admin.put(`/admin/promotions/${created.body.data._id}`, promo({ name: "Hello", active: false }));
      assert.equal(edited.body.data.name, "Hello");
      assert.equal(edited.body.data.state, "paused");

      const shopper = await request(app)
        .get("/admin/promotions")
        .set("Authorization", `Bearer ${tokenFor("shopper@example.com")}`);
      assert.equal(shopper.status, 403);
    });

    it("refuses bad details and duplicate codes", async () => {
      const cases = [
        promo({ name: "" }),
        promo({ code: "no spaces" }),
        promo({ code: "AB" }),
        promo({ percentOff: 0 }),
        promo({ percentOff: 91 }),
        promo({ percentOff: 12.5 }),
        promo({ startDate: "" }),
        promo({ startDate: "2026-02-30" }),
        promo({ startDate: sgDate(5), endDate: sgDate(1) }),
      ];
      for (const body of cases) {
        assert.equal((await admin.post("/admin/promotions", body)).status, 400, JSON.stringify(body));
      }
      await admin.post("/admin/promotions", promo());
      const duplicate = await admin.post("/admin/promotions", promo({ name: "Again" }));
      assert.equal(duplicate.status, 400);
      assert.match(duplicate.body.error, /already uses that code/);
    });

    it("shows scheduled and ended promotions, and runs with no end date", async () => {
      await admin.post("/admin/promotions", promo({ code: "SOON", startDate: sgDate(2), endDate: "" }));
      await admin.post("/admin/promotions", promo({ code: "PAST", startDate: sgDate(-9), endDate: sgDate(-2) }));
      await admin.post("/admin/promotions", promo({ code: "OPEN", startDate: sgDate(-1), endDate: "" }));
      const states = Object.fromEntries(
        (await admin.get("/admin/promotions")).body.data.map((p) => [p.code, p.state])
      );
      assert.deepEqual(states, { SOON: "scheduled", PAST: "ended", OPEN: "running" });
    });

    it("deletes unused promotions only", async () => {
      const unused = (await admin.post("/admin/promotions", promo())).body.data;
      assert.equal((await admin.delete(`/admin/promotions/${unused._id}`)).status, 200);
      const used = (await admin.post("/admin/promotions", promo({ code: "USED" }))).body.data;
      await Promotion.updateOne({ _id: used._id }, { timesUsed: 1 });
      const refused = await admin.delete(`/admin/promotions/${used._id}`);
      assert.equal(refused.status, 400);
      assert.match(refused.body.error, /Pause it instead/);
    });
  });

  describe("using a code", () => {
    it("checks a code in the cart, in any case", async () => {
      await admin.post("/admin/promotions", promo());
      const ok = await checkCode(" Welcome10 ");
      assert.equal(ok.status, 200);
      assert.deepEqual(ok.body.data, { code: "WELCOME10", name: "Welcome offer", percentOff: 10 });
    });

    it("explains unknown, paused and expired codes, without revealing scheduled ones", async () => {
      await admin.post("/admin/promotions", promo({ code: "PAUSED", active: false }));
      await admin.post("/admin/promotions", promo({ code: "SOON", startDate: sgDate(1) }));
      await admin.post("/admin/promotions", promo({ code: "PAST", startDate: sgDate(-5), endDate: sgDate(-1) }));
      const message = async (code) => (await checkCode(code)).body.error;
      assert.equal(await message("NOPE"), "That discount code isn't valid");
      assert.equal(await message("PAUSED"), "That discount code isn't valid");
      // Not yet started reads as not valid, so it can't be discovered early.
      assert.equal(await message("SOON"), "That discount code isn't valid");
      assert.equal(await message("PAST"), "That discount code has expired");
      assert.equal(await message(""), "Enter a discount code");
      assert.equal(await message({ $ne: null }), "That discount code isn't valid");
    });

    it("works on the last day until midnight", async () => {
      await admin.post("/admin/promotions", promo({ startDate: sgDate(-3), endDate: sgDate(0) }));
      assert.equal((await checkCode("WELCOME10")).status, 200);
    });

    it("applies the discount at checkout through a Stripe coupon, created once", async () => {
      await admin.post("/admin/promotions", promo());
      const first = await checkout({ items: [{ productId: tee.id, quantity: 3 }], discountCode: "welcome10" });
      assert.equal(first.status, 200, JSON.stringify(first.body));
      await checkout({ items: [{ productId: tee.id, quantity: 1 }], discountCode: "WELCOME10" });

      assert.equal(fake.calls["coupons.create"].length, 1);
      const coupon = fake.calls["coupons.create"][0];
      assert.equal(coupon.percent_off, 10);
      assert.equal(coupon.duration, "once");
      const [params] = fake.calls["sessions.create"];
      assert.deepEqual(params.discounts, [{ coupon: "coupon_test_1" }]);
      // With a code, the Stripe page closes after an hour, so the code can't be
      // used long after it ends.
      const minutesOpen = (params.expires_at - Date.now() / 1000) / 60;
      assert.ok(minutesOpen > 58 && minutesOpen <= 60, String(minutesOpen));
      // Line items stay at full price; Stripe takes the discount off.
      assert.equal(params.line_items[0].price_data.unit_amount, 3333);

      const order = await Order.findOne({ stripeSessionId: "cs_test_1" });
      assert.equal(order.itemsTotal, 99.99);
      assert.equal(order.discount.code, "WELCOME10");
      assert.equal(order.discount.amount, 10);
      assert.equal(order.subtotal, 89.99);
    });

    it("refuses checkout if the code stopped working since it was entered", async () => {
      const created = (await admin.post("/admin/promotions", promo())).body.data;
      await admin.put(`/admin/promotions/${created._id}`, promo({ active: false }));
      const res = await checkout({ items: [{ productId: tee.id, quantity: 1 }], discountCode: "WELCOME10" });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "That discount code isn't valid");
      assert.equal(await Order.countDocuments(), 0);
    });

    it("records Stripe's exact totals and counts the use once payment is confirmed", async () => {
      await admin.post("/admin/promotions", promo());
      await checkout({ items: [{ productId: tee.id, quantity: 3 }], discountCode: "WELCOME10" });
      const paid = { amount_total: 8999, total_details: { amount_discount: 1000 } };
      await pay("cs_test_1", paid);
      await pay("cs_test_1", paid); // Stripe can send it twice

      const order = await Order.findOne({ stripeSessionId: "cs_test_1" });
      assert.equal(order.status, "paid");
      assert.equal(order.subtotal, 89.99);
      assert.equal(order.discount.amount, 10);
      assert.equal((await Promotion.findOne({ code: "WELCOME10" })).timesUsed, 1);
    });

    it("makes a new Stripe coupon after the percentage changes", async () => {
      const created = (await admin.post("/admin/promotions", promo())).body.data;
      await checkout({ items: [{ productId: tee.id, quantity: 1 }], discountCode: "WELCOME10" });
      await admin.put(`/admin/promotions/${created._id}`, promo({ percentOff: 20 }));
      await checkout({ items: [{ productId: tee.id, quantity: 1 }], discountCode: "WELCOME10" });
      assert.deepEqual(fake.calls["coupons.create"].map((c) => c.percent_off), [10, 20]);
    });
  });

  describe("homepage banners", () => {
    const banners = async () => (await request(app).get("/promotions/banners")).body.data;

    it("announces running promotions, newest first, in the standard or custom wording", async () => {
      await admin.post("/admin/promotions", promo({ code: "WELCOME10" }));
      await admin.post(
        "/admin/promotions",
        promo({ code: "XMAS20", percentOff: 20, bannerText: " Use promo code XMAS20 for the festive season! " })
      );
      assert.deepEqual(await banners(), [
        { code: "XMAS20", percentOff: 20, endDate: sgDate(7), text: "Use promo code XMAS20 for the festive season!" },
        { code: "WELCOME10", percentOff: 10, endDate: sgDate(7), text: "Use promo code WELCOME10 for 10% off!" },
      ]);
    });

    it("leaves out promotions that are scheduled, ended, paused or have the banner turned off", async () => {
      await admin.post("/admin/promotions", promo({ code: "SOON", startDate: sgDate(2) }));
      await admin.post("/admin/promotions", promo({ code: "PAST", startDate: sgDate(-9), endDate: sgDate(-2) }));
      await admin.post("/admin/promotions", promo({ code: "PAUSED", active: false }));
      await admin.post("/admin/promotions", promo({ code: "QUIET", showBanner: false }));
      await admin.post("/admin/promotions", promo({ code: "OPEN", endDate: "" }));
      const shown = await banners();
      assert.deepEqual(shown.map((b) => b.code), ["OPEN"]);
      assert.equal(shown[0].endDate, null);
    });

    it("shows at most 3, and never more than shoppers need", async () => {
      for (const code of ["AAA", "BBB", "CCC", "DDD"]) {
        await admin.post("/admin/promotions", promo({ code }));
      }
      const shown = await banners();
      assert.equal(shown.length, 3);
      assert.deepEqual(Object.keys(shown[0]).sort(), ["code", "endDate", "percentOff", "text"]);
    });

    it("limits the banner message to 140 characters", async () => {
      const res = await admin.post("/admin/promotions", promo({ bannerText: "x".repeat(141) }));
      assert.equal(res.status, 400);
      assert.match(res.body.error, /at most 140 characters/);
    });
  });
});
