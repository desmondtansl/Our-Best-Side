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

describe("admin access routes", () => {
  let app;
  let User;

  const as = (email) => ({
    get: (path) => request(app).get(path).set("Authorization", `Bearer ${tokenFor(email)}`),
    post: (path, body) =>
      request(app).post(path).set("Authorization", `Bearer ${tokenFor(email)}`).send(body),
  });
  const owner = () => as("owner@example.com");

  before(async () => {
    await setupDatabase();
    app = await createApp();
    ({ default: User } = await import("../src/models/User.js"));
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    await createUser({ email: "owner@example.com", isAdmin: true, isOwner: true });
    await createUser({ email: "staff@example.com", isAdmin: true });
    await createUser({ email: "shopper@example.com" });
  });

  it("is for the owner only, not other admins or shoppers", async () => {
    assert.equal((await request(app).get("/admin/users")).status, 403);
    for (const email of ["staff@example.com", "shopper@example.com"]) {
      assert.equal((await as(email).get("/admin/users")).status, 403);
      const grant = await as(email).post("/admin/users/grant", { email: "shopper@example.com" });
      assert.equal(grant.status, 403);
      const revoke = await as(email).post("/admin/users/revoke", { email: "staff@example.com" });
      assert.equal(revoke.status, 403);
    }
    assert.equal((await User.findOne({ email: "staff@example.com" })).isAdmin, true);
    assert.equal((await User.findOne({ email: "shopper@example.com" })).isAdmin, false);
  });

  it("lists admins, owner first, without passwords", async () => {
    const res = await owner().get("/admin/users");
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.admins.map(({ email, isOwner }) => ({ email, isOwner })),
      [
        { email: "owner@example.com", isOwner: true },
        { email: "staff@example.com", isOwner: false },
      ]
    );
    assert.equal(res.body.data.admins[0].password, undefined);
    assert.deepEqual(res.body.data.log, []);
  });

  it("grants admin access to an existing account and logs it", async () => {
    const res = await owner().post("/admin/users/grant", { email: "  Shopper@Example.com " });
    assert.equal(res.status, 200);
    assert.equal((await User.findOne({ email: "shopper@example.com" })).isAdmin, true);
    assert.ok(res.body.data.admins.some((a) => a.email === "shopper@example.com"));
    assert.equal(res.body.data.log.length, 1);
    assert.equal(res.body.data.log[0].action, "grant");
    assert.equal(res.body.data.log[0].email, "shopper@example.com");
    assert.equal(res.body.data.log[0].by, "owner@example.com");

    // The new admin can use admin pages straight away.
    assert.equal((await as("shopper@example.com").get("/admin/orders")).status, 200);
  });

  it("refuses to grant access to unknown emails or existing admins", async () => {
    const missing = await owner().post("/admin/users/grant", { email: "nobody@example.com" });
    assert.equal(missing.status, 404);
    assert.match(missing.body.error, /sign up/);
    const empty = await owner().post("/admin/users/grant", {});
    assert.equal(empty.status, 400);
    const already = await owner().post("/admin/users/grant", { email: "staff@example.com" });
    assert.equal(already.status, 400);
  });

  it("removes admin access, which takes effect straight away, and logs it", async () => {
    assert.equal((await as("staff@example.com").get("/admin/orders")).status, 200);

    const res = await owner().post("/admin/users/revoke", { email: "staff@example.com" });
    assert.equal(res.status, 200);
    assert.equal((await User.findOne({ email: "staff@example.com" })).isAdmin, false);
    assert.deepEqual(res.body.data.admins.map((a) => a.email), ["owner@example.com"]);
    assert.equal(res.body.data.log[0].action, "revoke");

    // The same login token is refused now, on every admin route.
    const staff = as("staff@example.com");
    assert.equal((await staff.get("/admin/orders")).status, 403);
    assert.equal((await staff.get("/admin/stats")).status, 403);
    const user = await staff.get("/auth/user");
    assert.equal(user.body.data.user.isAdmin, false);
  });

  it("never lets the owner remove their own access or another owner's", async () => {
    const self = await owner().post("/admin/users/revoke", { email: "owner@example.com" });
    assert.equal(self.status, 400);
    assert.match(self.body.error, /your own/);

    await createUser({ email: "partner@example.com", isOwner: true });
    const other = await owner().post("/admin/users/revoke", { email: "partner@example.com" });
    assert.equal(other.status, 400);

    const notAdmin = await owner().post("/admin/users/revoke", { email: "shopper@example.com" });
    assert.equal(notAdmin.status, 404);

    assert.equal((await User.findOne({ email: "owner@example.com" })).isOwner, true);
    assert.equal((await User.findOne({ email: "partner@example.com" })).isOwner, true);
  });

  it("keeps the last 10 changes, newest first", async () => {
    for (let i = 0; i < 6; i += 1) {
      await owner().post("/admin/users/grant", { email: "shopper@example.com" });
      await owner().post("/admin/users/revoke", { email: "shopper@example.com" });
    }
    const { log } = (await owner().get("/admin/users")).body.data;
    assert.equal(log.length, 10);
    assert.equal(log[0].action, "revoke");
    assert.equal(log[1].action, "grant");
  });
});
