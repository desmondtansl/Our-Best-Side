import { describe, it, before, after, beforeEach, afterEach } from "node:test";
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
  TEST_TOTP_SECRET,
} from "./helpers.js";
import { codeAt, currentStep, matchingStep } from "../src/totp.js";

describe("account security", () => {
  let app;
  let fake;
  let User;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: User } = await import("../src/models/User.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
  });

  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const me = (token) => request(app).get("/auth/user").set(bearer(token));
  const login = (email, password, extra = {}) =>
    request(app).post("/auth/login").send({ email, password, ...extra });
  const code = (secret = TEST_TOTP_SECRET, offset = 0) => codeAt(secret, currentStep() + offset);

  describe("authenticator codes", () => {
    it("match the published test values", () => {
      // RFC 6238: secret "12345678901234567890", 59 seconds -> 94287082.
      const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
      assert.equal(codeAt(secret, 1), "287082");
      assert.equal(matchingStep(secret, "287082", -1, 59 * 1000), 1);
      // The step before and after are accepted; older ones and reused ones aren't.
      assert.equal(matchingStep(secret, codeAt(secret, 3), -1, 59 * 1000), null);
      assert.equal(matchingStep(secret, "287082", 1, 59 * 1000), null);
    });
  });

  describe("two-step login", () => {
    const setUp = async (email = "sam@example.com", password = "right-password") => {
      await createUser({ email, password });
      const token = (await login(email, password)).body.data.token;
      const setup = await request(app)
        .post("/account/two-factor/setup")
        .set(bearer(token))
        .send({ password });
      assert.equal(setup.status, 200);
      assert.match(setup.body.data.qrCode, /^data:image\/png;base64,/);
      assert.match(setup.body.data.otpauthUrl, /^otpauth:\/\/totp\//);
      const enable = await request(app)
        .post("/account/two-factor/enable")
        .set(bearer(token))
        .send({ code: code(setup.body.data.secret) });
      assert.equal(enable.status, 200);
      return { token, secret: setup.body.data.secret, enable };
    };

    it("is turned on with the password and a first code, and shows recovery codes once", async () => {
      const { token, enable } = await setUp();
      assert.equal(enable.body.data.recoveryCodes.length, 10);
      assert.equal(enable.body.data.user.twoFactorEnabled, true);
      // Other devices are logged out; this one carries on with the new token.
      assert.equal((await me(token)).status, 403);
      assert.equal((await me(enable.body.data.token)).status, 200);
      const stored = await User.findOne({ email: "sam@example.com" }).select("+twoFactor.recoveryCodes").lean();
      assert.ok(!stored.twoFactor.recoveryCodes.includes(enable.body.data.recoveryCodes[0]), "only hashes are stored");
    });

    it("needs the right password to start, and the right code to finish", async () => {
      await createUser({ email: "sam@example.com", password: "right-password" });
      const token = (await login("sam@example.com", "right-password")).body.data.token;
      const wrong = await request(app).post("/account/two-factor/setup").set(bearer(token)).send({ password: "nope" });
      assert.equal(wrong.status, 400);
      await request(app).post("/account/two-factor/setup").set(bearer(token)).send({ password: "right-password" });
      const badCode = await request(app).post("/account/two-factor/enable").set(bearer(token)).send({ code: "000000" });
      assert.equal(badCode.status, 400);
      assert.equal((await User.findOne({ email: "sam@example.com" })).twoFactor.enabled, false);
    });

    it("asks for a code after the password, and each code works once", async () => {
      const { secret } = await setUp();
      const first = await login("sam@example.com", "right-password");
      assert.equal(first.status, 200);
      assert.equal(first.body.data.token, undefined);
      assert.equal(first.body.data.twoFactorRequired, true);

      const wrong = await request(app).post("/auth/login/two-factor").send({ ticket: first.body.data.ticket, code: "123456" });
      assert.equal(wrong.status, 401);

      // The code used to turn it on can't be used again; the next one can.
      const reused = await request(app).post("/auth/login/two-factor").send({ ticket: first.body.data.ticket, code: code(secret) });
      assert.equal(reused.status, 401);
      const next = await request(app).post("/auth/login/two-factor").send({ ticket: first.body.data.ticket, code: code(secret, 1) });
      assert.equal(next.status, 200);
      assert.equal((await me(next.body.data.token)).status, 200);
    });

    it("accepts each recovery code once", async () => {
      const { enable } = await setUp();
      const [recovery] = enable.body.data.recoveryCodes;
      const ticket = (await login("sam@example.com", "right-password")).body.data.ticket;
      const used = await request(app).post("/auth/login/two-factor").send({ ticket, code: recovery.toUpperCase() });
      assert.equal(used.status, 200);
      assert.equal(used.body.data.recoveryCodesLeft, 9);
      const again = await request(app).post("/auth/login/two-factor").send({ ticket, code: recovery });
      assert.equal(again.status, 401);
    });

    it("keeps tickets and login tokens apart", async () => {
      await setUp();
      const ticket = (await login("sam@example.com", "right-password")).body.data.ticket;
      assert.equal((await me(ticket)).status, 403);
      const token = tokenFor("sam@example.com");
      const asTicket = await request(app).post("/auth/login/two-factor").send({ ticket: token, code: code() });
      assert.equal(asTicket.status, 401);
    });

    it("stops after 5 wrong codes, even with the password", async () => {
      await setUp();
      const ticket = (await login("sam@example.com", "right-password")).body.data.ticket;
      const tries = await Promise.all(
        Array.from({ length: 8 }, () => request(app).post("/auth/login/two-factor").send({ ticket, code: "000000" }))
      );
      assert.equal(tries.filter((res) => res.status === 401).length, 5);
      assert.equal(tries.filter((res) => res.status === 429).length, 3);
    });

    it("is turned off with the password and a code", async () => {
      const { secret, enable } = await setUp();
      const token = enable.body.data.token;
      const noCode = await request(app).post("/account/two-factor/disable").set(bearer(token)).send({ password: "right-password", code: "000000" });
      assert.equal(noCode.status, 400);
      const off = await request(app)
        .post("/account/two-factor/disable")
        .set(bearer(token))
        .send({ password: "right-password", code: code(secret, 1) });
      assert.equal(off.status, 200);
      assert.equal(off.body.data.user.twoFactorEnabled, false);
      assert.ok((await login("sam@example.com", "right-password")).body.data.token);
    });

    it("is required for admin and owner pages", async () => {
      await createUser({ email: "admin@example.com", isAdmin: true, twoFactor: false });
      await createUser({ email: "owner@example.com", isOwner: true, twoFactor: false });
      for (const [email, path] of [["admin@example.com", "/admin/orders"], ["owner@example.com", "/admin/users"]]) {
        const res = await request(app).get(path).set(bearer(tokenFor(email)));
        assert.equal(res.status, 403, path);
        assert.equal(res.body.code, "TWO_FACTOR_REQUIRED");
      }
      // Their own account pages still work, so they can turn it on.
      assert.equal((await request(app).get("/account/two-factor").set(bearer(tokenFor("admin@example.com")))).status, 200);
    });

    it("isn't held up by the account-wide limit, since a password alone doesn't get in", async () => {
      const { secret } = await setUp();
      for (let i = 0; i < 25; i += 1) {
        await request(app).post("/auth/login").set("X-Forwarded-For", `198.51.100.${i}`).send({ email: "sam@example.com", password: "wrong" });
      }
      const fromNewPhone = await request(app)
        .post("/auth/login")
        .set("X-Forwarded-For", "203.0.113.200")
        .send({ email: "sam@example.com", password: "right-password" });
      assert.equal(fromNewPhone.status, 200);
      const done = await request(app).post("/auth/login/two-factor").send({ ticket: fromNewPhone.body.data.ticket, code: code(secret, 1) });
      assert.equal(done.status, 200);
    });
  });

  describe("login limits", () => {
    it("count attempts sent all at once like attempts sent one by one", async () => {
      await createUser({ email: "victim@example.com", password: "right-password" });
      const results = await Promise.all(
        Array.from({ length: 25 }, () =>
          request(app).post("/auth/login").set("X-Forwarded-For", "203.0.113.1").send({ email: "victim@example.com", password: "wrong" })
        )
      );
      assert.equal(results.filter((res) => res.status === 401).length, 5);
      assert.equal(results.filter((res) => res.status === 429).length, 20);
    });

    it("let a device that logged in before past a busy shared address", async () => {
      await createUser({ email: "owner@example.com", password: "right-password" });
      const phone = "phone-0123456789abcdef";
      const shared = "100.64.0.1";
      const at = (email, password, deviceId) =>
        request(app).post("/auth/login").set("X-Forwarded-For", shared).send({ email, password, deviceId });
      assert.equal((await at("owner@example.com", "right-password", phone)).status, 200);
      // Someone else on the same mobile network tries 30 accounts.
      for (let i = 0; i < 30; i += 1) await at(`person${i}@example.com`, "guess");
      assert.equal((await at("someone@example.com", "guess")).status, 429);
      assert.equal((await at("owner@example.com", "right-password", phone)).status, 200);
    });
  });

  describe("change password", () => {
    beforeEach(() => createUser({ email: "sam@example.com", password: "old-password" }));

    it("needs the current password, and logs out every other device", async () => {
      const other = (await login("sam@example.com", "old-password")).body.data.token;
      const token = (await login("sam@example.com", "old-password")).body.data.token;
      const change = (body) => request(app).post("/auth/change-password").set(bearer(token)).send(body);

      assert.equal((await change({ currentPassword: "nope", newPassword: "brand-new-pass" })).status, 400);
      assert.match((await change({ currentPassword: "old-password", newPassword: "short" })).body.error, /at least 8/);
      assert.match((await change({ currentPassword: "old-password", newPassword: "old-password" })).body.error, /haven't been using/);

      const ok = await change({ currentPassword: "old-password", newPassword: "brand-new-pass" });
      assert.equal(ok.status, 200);
      assert.equal((await me(other)).status, 403);
      assert.equal((await me(ok.body.data.token)).status, 200);
      assert.equal((await login("sam@example.com", "old-password")).status, 401);
      assert.equal((await login("sam@example.com", "brand-new-pass")).status, 200);
    });

    it("allows only 5 password tries per 15 minutes", async () => {
      const token = (await login("sam@example.com", "old-password")).body.data.token;
      const tries = await Promise.all(
        Array.from({ length: 7 }, () =>
          request(app).post("/auth/change-password").set(bearer(token)).send({ currentPassword: "guess", newPassword: "brand-new-pass" })
        )
      );
      assert.equal(tries.filter((res) => res.status === 400).length, 5);
      assert.equal(tries.filter((res) => res.status === 429).length, 2);
    });
  });

  describe("log out", () => {
    it("ends this login on the server, and only this one", async () => {
      await createUser({ email: "sam@example.com", password: "right-password" });
      const laptop = (await login("sam@example.com", "right-password")).body.data.token;
      const phone = (await login("sam@example.com", "right-password")).body.data.token;
      const out = await request(app).post("/auth/logout").set(bearer(laptop));
      assert.equal(out.status, 200);
      assert.equal((await me(laptop)).status, 403);
      assert.equal((await me(phone)).status, 200);
      // Logging out without a valid token is harmless.
      assert.equal((await request(app).post("/auth/logout")).status, 200);
    });
  });

  describe("adding a card", () => {
    it("allows 5 Stripe card sessions an hour per account", async () => {
      await createUser({ email: "sam@example.com" });
      const results = [];
      for (let i = 0; i < 6; i += 1) {
        results.push(await request(app).post("/account/payment-methods/setup-session").set(bearer(tokenFor("sam@example.com"))));
      }
      assert.deepEqual(results.map((res) => res.status), [200, 200, 200, 200, 200, 429]);
      assert.equal(fake.calls["sessions.create"].length, 5);
    });
  });

  describe("payment confirmations", () => {
    it("handle the same Stripe event once, however many copies arrive at once", async () => {
      const { default: Product } = await import("../src/models/Product.js");
      const { default: Order } = await import("../src/models/Order.js");
      const { default: Promotion } = await import("../src/models/Promotion.js");
      const product = await Product.create({ title: "Tee", price: 10, category: ["Men"], inStock: 10 });
      const promotion = await Promotion.create({ name: "Sale", code: "SALE10", percentOff: 10, startDate: "2026-01-01", startsAt: new Date("2026-01-01") });
      await Order.create({
        items: [{ product: product._id, title: "Tee", price: 10, quantity: 2 }],
        subtotal: 18,
        currency: "sgd",
        stripeSessionId: "cs_test_twice",
        discount: { promotion: promotion._id, code: "SALE10", percentOff: 10, amount: 2 },
      });
      const event = {
        id: "evt_1",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_twice", object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: 1800, payment_intent: "pi_1" } },
      };
      const send = () => {
        const { payload, signature } = fake.signedWebhook(event);
        return request(app).post("/checkout/webhook").set("stripe-signature", signature).set("Content-Type", "application/json").send(payload);
      };
      const responses = await Promise.all([send(), send(), send()]);
      assert.deepEqual(responses.map((res) => res.status), [200, 200, 200]);
      assert.equal((await Product.findById(product._id)).inStock, 8);
      assert.equal((await Promotion.findById(promotion._id)).timesUsed, 1);
      const order = await Order.findOne({ stripeSessionId: "cs_test_twice" });
      assert.equal(order.status, "paid");
      assert.equal(order.statusHistory.length, 1);
      assert.equal(order.stripePaymentIntentId, "pi_1");
    });

    it("leave a note on an order whose items sold out while it was being paid for", async () => {
      const { default: Product } = await import("../src/models/Product.js");
      const { default: Order } = await import("../src/models/Order.js");
      const { OVERSOLD_NOTE } = await import("../src/routes/webhook.js");
      const product = await Product.create({ title: "Tee", price: 10, category: ["Men"], inStock: 1 });
      await Order.create({ items: [{ product: product._id, title: "Tee", price: 10, quantity: 2 }], subtotal: 20, currency: "sgd", stripeSessionId: "cs_test_over", notes: "Gift wrap" });
      const { payload, signature } = fake.signedWebhook({
        id: "evt_2",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test_over", mode: "payment", payment_status: "paid", amount_total: 2000 } },
      });
      await request(app).post("/checkout/webhook").set("stripe-signature", signature).set("Content-Type", "application/json").send(payload);
      const order = await Order.findOne({ stripeSessionId: "cs_test_over" });
      assert.equal(order.notes, `${OVERSOLD_NOTE}\n\nGift wrap`);
      assert.equal((await Product.findById(product._id)).inStock, 0);
    });
  });

  describe("connection check", () => {
    const check = (forwardedFor) =>
      request(app).get("/admin/users/connection").set(bearer(tokenFor("owner@example.com"))).set("X-Forwarded-For", forwardedFor);

    beforeEach(() => createUser({ email: "owner@example.com", isOwner: true }));

    it("says whether the proxy setting looks right", async () => {
      assert.equal((await check("203.0.113.9")).body.data.verdict, "ok");
      const tooLow = (await check("203.0.113.9, 10.0.0.7")).body.data;
      assert.equal(tooLow.verdict, "too-low");
      assert.equal(tooLow.suggestedHops, 2);
    });
  });

  describe("production settings", () => {
    const saved = {};
    beforeEach(() => {
      for (const key of ["NODE_ENV", "BASE_URL", "ALLOWED_ORIGINS", "RENDER", "PUBLIC_REQUESTS_PER_MINUTE"]) saved[key] = process.env[key];
    });
    afterEach(() => {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
    const freshApp = async () => (await import("../src/app.js")).createApp();

    it("lets no other website call the API when BASE_URL is missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.BASE_URL;
      delete process.env.ALLOWED_ORIGINS;
      const res = await request(await freshApp()).get("/products/featured").set("Origin", "https://evil.example.com");
      assert.equal(res.headers["access-control-allow-origin"], undefined);
    });

    it("counts Render as production even without NODE_ENV", async () => {
      delete process.env.NODE_ENV;
      process.env.RENDER = "true";
      process.env.BASE_URL = "https://ourbestside.netlify.app";
      const res = await request(await freshApp()).get("/products/featured").set("Origin", "https://evil.example.com");
      assert.equal(res.headers["access-control-allow-origin"], undefined);
      assert.match(res.headers["strict-transport-security"], /max-age/);
    });

    it("limits page views per address on public pages", async () => {
      process.env.PUBLIC_REQUESTS_PER_MINUTE = "3";
      const limited = await freshApp();
      const statuses = [];
      for (let i = 0; i < 4; i += 1) {
        statuses.push((await request(limited).get("/products/featured").set("X-Forwarded-For", "203.0.113.4")).status);
      }
      assert.deepEqual(statuses, [200, 200, 200, 429]);
      // Another visitor isn't affected.
      assert.equal((await request(limited).get("/products/featured").set("X-Forwarded-For", "203.0.113.5")).status, 200);
    });
  });
});
