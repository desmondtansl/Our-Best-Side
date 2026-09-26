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

const address = (overrides = {}) => ({
  label: "Home",
  fullName: "Sam Tan",
  line1: "1 Orchard Road",
  city: "Singapore",
  postalCode: "238800",
  country: "sg",
  ...overrides,
});

describe("account routes", () => {
  let app;
  let Order;
  let User;
  let fake;
  let user;
  let token;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Order } = await import("../src/models/Order.js"));
    ({ default: User } = await import("../src/models/User.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    user = await createUser({ email: "shopper@example.com" });
    token = tokenFor(user.email);
  });

  const api = (method, path) =>
    request(app)[method](`/account${path}`).set("Authorization", `Bearer ${token}`);

  it("requires a logged-in user", async () => {
    for (const path of ["", "/addresses", "/orders", "/payment-methods"]) {
      assert.equal((await request(app).get(`/account${path}`)).status, 403, path);
    }
  });

  it("returns the account overview without the password", async () => {
    const res = await api("get", "");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, "shopper@example.com");
    assert.deepEqual(res.body.data.addresses, []);
    assert.equal(res.body.data.password, undefined);
  });

  describe("addresses", () => {
    it("adds an address, upper-cases the country and makes the first one default", async () => {
      const res = await api("post", "/addresses").send(address());
      assert.equal(res.status, 201);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].country, "SG");
      assert.equal(res.body.data[0].isDefault, true);
    });

    it("validates required fields and the country code", async () => {
      const missing = await api("post", "/addresses").send(address({ line1: "" }));
      assert.equal(missing.status, 400);
      assert.match(missing.body.error[0].msg, /Address line 1/);

      const badCountry = await api("post", "/addresses").send(
        address({ country: "Singapore" })
      );
      assert.equal(badCountry.status, 400);
      assert.equal((await User.findById(user.id)).addresses.length, 0);
    });

    it("ignores unknown fields", async () => {
      const res = await api("post", "/addresses").send(
        address({ isAdmin: true, _id: "hacked" })
      );
      assert.equal(res.status, 201);
      assert.equal((await User.findById(user.id)).isAdmin, false);
      assert.notEqual(res.body.data[0]._id, "hacked");
    });

    it("keeps exactly one default address", async () => {
      await api("post", "/addresses").send(address({ label: "Home" }));
      const res = await api("post", "/addresses").send(
        address({ label: "Office", isDefault: true })
      );
      const defaults = res.body.data.filter((a) => a.isDefault).map((a) => a.label);
      assert.deepEqual(defaults, ["Office"]);

      const home = res.body.data.find((a) => a.label === "Home");
      const updated = await api("put", `/addresses/${home._id}`).send({ isDefault: true });
      assert.deepEqual(
        updated.body.data.filter((a) => a.isDefault).map((a) => a.label),
        ["Home"]
      );
    });

    it("updates only the fields sent", async () => {
      const created = await api("post", "/addresses").send(address());
      const id = created.body.data[0]._id;
      const res = await api("put", `/addresses/${id}`).send({ line2: "#05-01" });
      assert.equal(res.status, 200);
      assert.equal(res.body.data[0].line2, "#05-01");
      assert.equal(res.body.data[0].line1, "1 Orchard Road");
    });

    it("moves the default when the default address is deleted", async () => {
      await api("post", "/addresses").send(address({ label: "Home" }));
      const created = await api("post", "/addresses").send(address({ label: "Office" }));
      const home = created.body.data.find((a) => a.label === "Home");

      const res = await api("delete", `/addresses/${home._id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].label, "Office");
      assert.equal(res.body.data[0].isDefault, true);
    });

    it("returns 404 for addresses that do not exist", async () => {
      const id = "64b000000000000000000000";
      assert.equal((await api("put", `/addresses/${id}`).send({ city: "X" })).status, 404);
      assert.equal((await api("delete", `/addresses/${id}`)).status, 404);
    });

    it("limits the number of saved addresses", async () => {
      for (let i = 0; i < 10; i++) {
        assert.equal((await api("post", "/addresses").send(address())).status, 201);
      }
      assert.equal((await api("post", "/addresses").send(address())).status, 400);
    });
  });

  describe("orders", () => {
    it("lists only this user's non-pending orders, newest first", async () => {
      const other = await createUser({ email: "other@example.com" });
      const base = { subtotal: 10, currency: "sgd", items: [{ price: 10, quantity: 1 }] };
      await Order.create({ ...base, user: user._id, status: "paid", createdAt: new Date("2026-01-01") });
      await Order.create({ ...base, user: user._id, status: "shipped", createdAt: new Date("2026-02-01") });
      await Order.create({ ...base, user: user._id, status: "pending" });
      await Order.create({ ...base, user: other._id, status: "paid" });
      await Order.create({ ...base, status: "paid", email: "shopper@example.com" });

      const res = await api("get", "/orders");
      assert.equal(res.status, 200);
      assert.deepEqual(
        res.body.data.map((o) => o.status),
        ["shipped", "paid"]
      );
    });
  });

  describe("payment methods", () => {
    const card = (id, customer) => ({
      id,
      customer,
      card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
    });

    it("returns an empty list when the user has no Stripe customer", async () => {
      const res = await api("get", "/payment-methods");
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, []);
      assert.equal(fake.calls["paymentMethods.list"], undefined);
    });

    it("lists the customer's saved cards without raw card data", async () => {
      await User.updateOne({ _id: user.id }, { stripeCustomerId: "cus_mine" });
      fake.state.paymentMethods = [card("pm_1", "cus_mine"), card("pm_2", "cus_other")];

      const res = await api("get", "/payment-methods");
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, [
        { id: "pm_1", brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 },
      ]);
    });

    it("only removes cards that belong to the user", async () => {
      await User.updateOne({ _id: user.id }, { stripeCustomerId: "cus_mine" });
      fake.state.paymentMethods = [card("pm_1", "cus_mine"), card("pm_2", "cus_other")];

      assert.equal((await api("delete", "/payment-methods/pm_2")).status, 404);
      assert.equal((await api("delete", "/payment-methods/pm_missing")).status, 404);
      assert.equal(fake.calls["paymentMethods.detach"], undefined);

      const res = await api("delete", "/payment-methods/pm_1");
      assert.equal(res.status, 200);
      assert.deepEqual(fake.calls["paymentMethods.detach"], ["pm_1"]);
    });

    it("starts a Stripe setup session for adding a card", async () => {
      const res = await api("post", "/payment-methods/setup-session");
      assert.equal(res.status, 200);
      assert.match(res.body.data, /^https:\/\/checkout\.stripe\.com\//);

      const [params] = fake.calls["sessions.create"];
      assert.equal(params.mode, "setup");
      assert.equal(params.customer, "cus_test_1");
      assert.equal(params.success_url, "https://shop.example.com/account?tab=payments");
      assert.equal((await User.findById(user.id)).stripeCustomerId, "cus_test_1");
    });
  });
});
