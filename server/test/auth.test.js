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

describe("auth routes", () => {
  let app;

  before(async () => {
    await setupDatabase();
    app = await createApp();
  });

  after(teardownDatabase);

  beforeEach(clearDatabase);

  it("signs up and logs in a user", async () => {
    const signup = await request(app)
      .post("/auth/signup")
      .send({ email: "new@example.com", password: "password123" });
    assert.equal(signup.status, 200);
    assert.ok(signup.body.data.token);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "new@example.com", password: "password123" });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.email, "new@example.com");
    assert.equal(login.body.data.user.isAdmin, false);
  });

  it("rejects a wrong password", async () => {
    await createUser({ email: "user@example.com" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "wrongpassword" });
    assert.equal(res.status, 401);
  });

  it("GET /auth/user returns isAdmin true for an admin", async () => {
    const admin = await createUser({ email: "admin@example.com", isAdmin: true });
    const res = await request(app)
      .get("/auth/user")
      .set("Authorization", `Bearer ${tokenFor(admin.email)}`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.user, {
      id: admin.id,
      email: "admin@example.com",
      isAdmin: true,
      isOwner: false,
    });
  });

  it("treats an owner as an admin, at login and in GET /auth/user", async () => {
    // Set in the database with isOwner only, without isAdmin.
    const owner = await createUser({ email: "owner@example.com", isOwner: true });
    const login = await request(app)
      .post("/auth/login")
      .send({ email: "owner@example.com", password: "password123" });
    assert.equal(login.body.data.user.isAdmin, true);
    assert.equal(login.body.data.user.isOwner, true);

    const res = await request(app)
      .get("/auth/user")
      .set("Authorization", `Bearer ${tokenFor(owner.email)}`);
    assert.equal(res.body.data.user.isAdmin, true);
    assert.equal(res.body.data.user.isOwner, true);

    // And can use admin-only routes.
    const orders = await request(app)
      .get("/admin/orders")
      .set("Authorization", `Bearer ${tokenFor(owner.email)}`);
    assert.equal(orders.status, 200);
  });

  it("GET /auth/user returns isAdmin false for a normal user", async () => {
    const user = await createUser({ email: "user@example.com" });
    const res = await request(app)
      .get("/auth/user")
      .set("Authorization", `Bearer ${tokenFor(user.email)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.isAdmin, false);
    assert.equal(res.body.data.user.id, user.id);
  });

  it("GET /auth/user rejects a missing token", async () => {
    const res = await request(app).get("/auth/user");
    assert.equal(res.status, 403);
  });
});
