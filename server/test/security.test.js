import { describe, it, before, after, beforeEach, afterEach, mock } from "node:test";
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

describe("security hardening", () => {
  let app;
  let User;
  let Product;
  let fake;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: User } = await import("../src/models/User.js"));
    ({ default: Product } = await import("../src/models/Product.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
  });

  const signup = (body, ip = "203.0.113.10") =>
    request(app).post("/auth/signup").set("X-Forwarded-For", ip).send(body).timeout(3000);

  describe("sign-up can't crash the server", () => {
    it("refuses lists, objects and numbers instead of passing them to the database", async () => {
      const cases = [
        { email: ["x@example.com"], password: "linen-shirt-2026" },
        { email: { $gt: "" }, password: "linen-shirt-2026" },
        { email: "y@example.com", password: ["linen-shirt-2026", "b"] },
        { email: "z@example.com", password: 1234567890123 },
        { email: "z@example.com", password: { length: 20 } },
        {},
      ];
      for (const body of cases) {
        const res = await signup(body);
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.ok(Array.isArray(res.body.error));
      }
      assert.equal(await User.countDocuments(), 0);
    });

    it("answers every one of several sign-ups for the same email at once", async () => {
      const results = await Promise.all(
        Array.from({ length: 4 }, () => signup({ email: "race@example.com", password: "linen-shirt-2026" }))
      );
      const statuses = results.map((r) => r.status).sort();
      assert.deepEqual(statuses, [200, 400, 400, 400]);
      for (const res of results.filter((r) => r.status === 400)) {
        assert.equal(res.body.error[0].msg, "Email already in use");
      }
      assert.equal(await User.countDocuments({ email: "race@example.com" }), 1);
    });

    it("stores emails in lower case and finds them in any case", async () => {
      assert.equal((await signup({ email: " Sam@Example.com ", password: "linen-shirt-2026" })).status, 200);
      const again = await signup({ email: "sam@example.COM", password: "linen-shirt-2026" });
      assert.equal(again.body.error[0].msg, "Email already in use");
    });
  });

  describe("password rules", () => {
    it("refuses short, too long, common and email-like passwords", async () => {
      const message = async (email, password) => (await signup({ email, password })).body.error?.[0]?.msg;
      assert.match(await message("a@example.com", "short"), /at least 8/);
      assert.match(await message("a@example.com", "é".repeat(37)), /at most 72/); // 74 bytes
      assert.match(await message("a@example.com", "Password123"), /too common/);
      assert.match(await message("jane.tan@example.com", "Jane.Tan"), /can't be your email/);
      assert.match(await message("jane.tan@example.com", "jane.tan@example.com"), /can't be your email/);
      assert.equal(await User.countDocuments(), 0);
      assert.equal((await signup({ email: "a@example.com", password: "é".repeat(36) })).status, 200);
    });
  });

  describe("rate limits", () => {
    it("allows 10 sign-ups an hour from one address", async () => {
      for (let i = 0; i < 10; i += 1) {
        assert.equal((await signup({ email: `p${i}@example.com`, password: "linen-shirt-2026" })).status, 200);
      }
      const blocked = await signup({ email: "p10@example.com", password: "linen-shirt-2026" });
      assert.equal(blocked.status, 429);
      assert.match(blocked.body.error[0].msg, /Too many sign-ups/);
      assert.ok(Number(blocked.headers["retry-after"]) > 0);
      // Another address isn't affected.
      assert.equal((await signup({ email: "q@example.com", password: "linen-shirt-2026" }, "198.51.100.7")).status, 200);
    });

    it("allows 30 checkout attempts per 15 minutes from one address", async () => {
      const tee = await Product.create({ title: "Tee", category: ["Men"], price: 20 });
      const checkout = () =>
        request(app)
          .post("/checkout/create-checkout-session")
          .set("X-Forwarded-For", "203.0.113.20")
          .send({ items: [{ productId: tee.id, quantity: 1 }] });
      for (let i = 0; i < 30; i += 1) assert.equal((await checkout()).status, 200);
      const blocked = await checkout();
      assert.equal(blocked.status, 429);
      assert.match(blocked.body.error, /Too many checkout attempts/);
    });

    it("allows 20 discount code checks per 15 minutes from one address", async () => {
      const check = (code) =>
        request(app).post("/checkout/discount").set("X-Forwarded-For", "203.0.113.30").send({ code });
      for (let i = 0; i < 20; i += 1) assert.equal((await check(`GUESS${i}`)).status, 400);
      const blocked = await check("STAFF50");
      assert.equal(blocked.status, 429);
      assert.match(blocked.body.error, /Too many codes tried/);
    });
  });

  describe("login lock-outs and trusted devices", () => {
    const login = (password, ip, deviceId) =>
      request(app)
        .post("/auth/login")
        .set("X-Forwarded-For", ip)
        .send({ email: "owner@example.com", password, ...(deviceId && { deviceId }) });

    beforeEach(() => createUser({ email: "owner@example.com", password: "right-password" }));

    it("lets a device that logged in before through the account-wide limit", async () => {
      const laptop = "laptop-0123456789abcdef";
      assert.equal((await login("right-password", "203.0.113.5", laptop)).status, 200);
      // Someone else types wrong passwords from 20 addresses.
      for (let i = 0; i < 20; i += 1) await login("wrong", `198.51.100.${i}`);

      assert.equal((await login("right-password", "203.0.113.6", laptop)).status, 200);
      // A device that never logged in is still blocked, as is a made-up id.
      assert.equal((await login("right-password", "203.0.113.7", "stranger-0123456789abc")).status, 429);
      assert.equal((await login("right-password", "203.0.113.8")).status, 429);
    });

    it("still applies the per-address limits to trusted devices", async () => {
      const laptop = "laptop-0123456789abcdef";
      await login("right-password", "203.0.113.5", laptop);
      for (let i = 0; i < 5; i += 1) await login("wrong", "203.0.113.5", laptop);
      assert.equal((await login("right-password", "203.0.113.5", laptop)).status, 429);
    });
  });

  describe("log out of all devices", () => {
    it("makes every earlier token stop working", async () => {
      await createUser({ email: "sam@example.com", password: "right-password" });
      const first = (await request(app).post("/auth/login").send({ email: "sam@example.com", password: "right-password" })).body.data.token;
      const second = (await request(app).post("/auth/login").send({ email: "sam@example.com", password: "right-password" })).body.data.token;
      const me = (token) => request(app).get("/auth/user").set("Authorization", `Bearer ${token}`);
      assert.equal((await me(first)).status, 200);

      const out = await request(app).post("/auth/logout-all").set("Authorization", `Bearer ${second}`);
      assert.equal(out.status, 200);
      assert.equal((await me(first)).status, 403);
      assert.equal((await me(second)).status, 403);
      // Account pages refuse them too, and checkout treats them as a guest.
      assert.equal((await request(app).get("/account/orders").set("Authorization", `Bearer ${first}`)).status, 403);

      const fresh = (await request(app).post("/auth/login").send({ email: "sam@example.com", password: "right-password" })).body.data.token;
      assert.equal((await me(fresh)).status, 200);
    });

    it("refuses tokens for accounts that no longer exist, and badly formed headers", async () => {
      const token = tokenFor("gone@example.com");
      assert.equal((await request(app).get("/auth/user").set("Authorization", `Bearer ${token}`)).status, 403);
      for (const header of ["Bearer", "Bearer ", "Basic abc", "token-without-bearer"]) {
        assert.equal((await request(app).get("/auth/user").set("Authorization", header)).status, 403, header);
      }
    });
  });

  describe("error responses never show internals", () => {
    it("answers malformed and oversized requests in JSON, without stack traces", async () => {
      const bad = await request(app).post("/auth/login").set("Content-Type", "application/json").send('{"email": ');
      assert.equal(bad.status, 400);
      assert.deepEqual(bad.body, { data: "", error: "The request isn't valid JSON" });

      const big = await request(app)
        .post("/auth/login")
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ email: "a@b.co", password: "x".repeat(200000) }));
      assert.equal(big.status, 413);
      assert.doesNotMatch(big.text, /at |node_modules|\/src\//);

      const missing = await request(app).get("/no-such-page");
      assert.equal(missing.status, 404);
      assert.deepEqual(missing.body, { data: "", error: "Not found" });
    });

    it("gives a plain message when something unexpected fails", async () => {
      await createUser({ email: "admin@example.com", isAdmin: true });
      const { default: Order } = await import("../src/models/Order.js");
      const find = mock.method(Order, "find", () => {
        throw new Error("MongoServerError: connection to 10.0.0.5:27017 closed");
      });
      const errors = mock.method(console, "error", () => {});
      try {
        const res = await request(app).get("/admin/orders").set("Authorization", `Bearer ${tokenFor("admin@example.com")}`);
        assert.equal(res.status, 500);
        assert.deepEqual(res.body, { data: "", error: "Something went wrong. Please try again." });
        assert.ok(errors.mock.calls.length > 0, "the details are logged on the server");
      } finally {
        find.mock.restore();
        errors.mock.restore();
      }
    });
  });

  describe("headers", () => {
    it("sends security headers and doesn't name the server software", async () => {
      const res = await request(app).get("/products/featured");
      assert.equal(res.headers["x-powered-by"], undefined);
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.equal(res.headers["x-frame-options"], "DENY");
      assert.equal(res.headers["referrer-policy"], "no-referrer");
      assert.match(res.headers["content-security-policy"], /frame-ancestors 'none'/);
    });

    describe("in production", () => {
      let prodApp;
      const saved = {};
      beforeEach(async () => {
        for (const key of ["NODE_ENV", "BASE_URL", "ALLOWED_ORIGINS"]) saved[key] = process.env[key];
        process.env.NODE_ENV = "production";
        process.env.BASE_URL = "https://ourbestside.netlify.app";
        delete process.env.ALLOWED_ORIGINS;
        const { createApp: create } = await import("../src/app.js");
        prodApp = create();
      });
      afterEach(() => {
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      });

      it("only lets the shop's own website call the API from a browser", async () => {
        const own = await request(prodApp).get("/products/featured").set("Origin", "https://ourbestside.netlify.app");
        assert.equal(own.headers["access-control-allow-origin"], "https://ourbestside.netlify.app");
        const other = await request(prodApp).get("/products/featured").set("Origin", "https://evil.example.com");
        assert.equal(other.headers["access-control-allow-origin"], undefined);
        assert.match(own.headers["strict-transport-security"], /max-age=31536000/);
      });
    });
  });

  describe("connection check", () => {
    it("shows the owner the address the server sees, owner only", async () => {
      await createUser({ email: "owner@example.com", isOwner: true });
      await createUser({ email: "staff@example.com", isAdmin: true });
      const res = await request(app)
        .get("/admin/users/connection")
        .set("Authorization", `Bearer ${tokenFor("owner@example.com")}`)
        .set("X-Forwarded-For", "203.0.113.99");
      assert.equal(res.status, 200);
      assert.equal(res.body.data.ip, "203.0.113.99");
      assert.equal(res.body.data.trustProxyHops, 1);
      const staff = await request(app)
        .get("/admin/users/connection")
        .set("Authorization", `Bearer ${tokenFor("staff@example.com")}`);
      assert.equal(staff.status, 403);
    });

    it("can't be fooled by a made-up forwarded address in front of the real one", async () => {
      await createUser({ email: "owner@example.com", isOwner: true });
      const res = await request(app)
        .get("/admin/users/connection")
        .set("Authorization", `Bearer ${tokenFor("owner@example.com")}`)
        .set("X-Forwarded-For", "1.2.3.4, 203.0.113.99");
      // Only the last hop (added by Render's proxy) is trusted.
      assert.equal(res.body.data.ip, "203.0.113.99");
    });
  });

  describe("odd input gets a clear answer, not a server error", () => {
    it("checkout with a saved-address id that isn't an id", async () => {
      await createUser({ email: "sam@example.com" });
      const tee = await Product.create({ title: "Tee", category: ["Men"], price: 20 });
      for (const addressId of [{ $ne: null }, "not-an-id", ["a"]]) {
        const res = await request(app)
          .post("/checkout/create-checkout-session")
          .set("Authorization", `Bearer ${tokenFor("sam@example.com")}`)
          .send({ items: [{ productId: tee.id, quantity: 1 }], addressId });
        assert.equal(res.status, 400, JSON.stringify(addressId));
        assert.equal(res.body.error, "Address not found");
      }
    });

    it("bulk stock with a timestamp that isn't a date is treated as changed", async () => {
      await createUser({ email: "admin@example.com", isAdmin: true });
      const tee = await Product.create({ title: "Tee", category: ["Men"], price: 20, inStock: 3 });
      const res = await request(app)
        .put("/admin/products/stock")
        .set("Authorization", `Bearer ${tokenFor("admin@example.com")}`)
        .send({ changes: [{ id: tee.id, updatedAt: "yesterday", inStock: 9 }] });
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.conflicts, [{ id: tee.id, title: "Tee" }]);
      assert.equal((await Product.findById(tee.id)).inStock, 3);
    });

    it("product fields have sensible length limits", async () => {
      await createUser({ email: "admin@example.com", isAdmin: true });
      const tee = await Product.create({ title: "Tee", category: ["Men"], price: 20 });
      const edit = (field, value) =>
        request(app)
          .put(`/products/${tee.id}`)
          .set("Authorization", `Bearer ${tokenFor("admin@example.com")}`)
          .field(field, value);
      assert.match((await edit("title", "x".repeat(151))).body.error, /at most 150/);
      assert.match((await edit("description", "x".repeat(5001))).body.error, /at most 5000/);
      assert.match((await edit("size", "x".repeat(51))).body.error, /each up to 50/);
      assert.equal((await Product.findById(tee.id)).title, "Tee");
    });
  });
});
