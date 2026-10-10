import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
} from "./helpers.js";

describe("login attempt limits", () => {
  let app;

  // Each "address" is a different visitor (Render passes it in X-Forwarded-For).
  const login = (email, password, ip = "203.0.113.1") =>
    request(app)
      .post("/auth/login")
      .set("X-Forwarded-For", ip)
      .send({ email, password });

  before(async () => {
    await setupDatabase();
    app = await createApp();
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    await createUser({ email: "owner@example.com", password: "right-password" });
  });

  it("blocks an address after 5 wrong passwords for an account, before checking the password", async () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal((await login("owner@example.com", "wrong-password")).status, 401);
    }
    const blocked = await login("owner@example.com", "right-password");
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error[0].message, /Too many login attempts/);
    const wait = Number(blocked.headers["retry-after"]);
    assert.ok(wait > 0 && wait <= 15 * 60, String(wait));
  });

  it("doesn't lock the owner out from their own device", async () => {
    for (let i = 0; i < 5; i += 1) await login("owner@example.com", "wrong", "198.51.100.9");
    const ownDevice = await login("owner@example.com", "right-password", "203.0.113.50");
    assert.equal(ownDevice.status, 200);
  });

  it("a correct password clears the count for that device", async () => {
    for (let i = 0; i < 4; i += 1) await login("owner@example.com", "wrong");
    assert.equal((await login("owner@example.com", "right-password")).status, 200);
    for (let i = 0; i < 4; i += 1) {
      assert.equal((await login("owner@example.com", "wrong")).status, 401);
    }
  });

  it("pauses an account after 20 wrong passwords from many addresses", async () => {
    for (let i = 0; i < 20; i += 1) {
      assert.equal((await login("owner@example.com", "wrong", `198.51.100.${i}`)).status, 401);
    }
    assert.equal((await login("owner@example.com", "wrong", "198.51.100.200")).status, 429);
  });

  it("pauses an address after 30 attempts on any accounts", async () => {
    for (let i = 0; i < 30; i += 1) {
      assert.equal((await login(`person${i}@example.com`, "guess")).status, 401);
    }
    assert.equal((await login("someone-else@example.com", "guess")).status, 429);
    // Other visitors are unaffected.
    assert.equal((await login("owner@example.com", "right-password", "203.0.113.77")).status, 200);
  });

  it("answers the same way whether or not the account exists", async () => {
    const unknown = await login("nobody@example.com", "whatever");
    const wrong = await login("owner@example.com", "whatever");
    assert.equal(unknown.status, 401);
    assert.deepEqual(unknown.body, wrong.body);
    for (let i = 0; i < 4; i += 1) await login("nobody@example.com", "whatever");
    const blocked = await login("nobody@example.com", "whatever");
    assert.equal(blocked.status, 429);
  });

  it("treats the email as text, in any case", async () => {
    const injection = await login({ $ne: null }, "right-password");
    assert.equal(injection.status, 401);
    assert.equal((await login(" Owner@Example.com ", "right-password")).status, 200);
  });
});
