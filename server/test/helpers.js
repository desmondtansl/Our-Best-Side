import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";

// Set before any route module is imported, as they read env at load time.
process.env.JWT_SECRET = "test-secret";
process.env.BUCKET_NAME = "test-bucket";
process.env.AWS_REGION = "ap-southeast-1";
process.env.AWS_ACCESS_KEY_ID = "test";
process.env.AWS_ACCESS_KEY_SECRET = "test";
process.env.STRIPE_PRIVATE_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.BASE_URL = "https://shop.example.com";
delete process.env.CURRENCY;
delete process.env.SHIPPING_COUNTRIES;

// mongoose 6 ships MongoDB driver 4.x, which supports servers up to 6.0.
const MONGO_VERSION = process.env.MONGOMS_VERSION || "6.0.14";

let mongod;

export const setupDatabase = async () => {
  mongoose.set("strictQuery", false);
  mongod = await MongoMemoryServer.create({
    binary: { version: MONGO_VERSION },
  });
  await mongoose.connect(mongod.getUri());
};

export const teardownDatabase = async () => {
  await mongoose.disconnect();
  await mongod.stop();
};

export const clearDatabase = async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

export const createApp = async () => {
  const { createApp } = await import("../src/app.js");
  return createApp();
};

export const createUser = async ({ email, password = "password123", isAdmin = false }) => {
  const { default: User } = await import("../src/models/User.js");
  const user = await User.create({
    email,
    password: await bcrypt.hash(password, 10),
    isAdmin,
  });
  return user;
};

export const tokenFor = (email) =>
  JWT.sign({ email }, process.env.JWT_SECRET, { expiresIn: 3600 });

// Replaces the Stripe API calls the app makes with in-memory fakes, so no
// request ever leaves the test. `calls` records each call's arguments.
// Webhook signature checking is left real (it is local crypto).
export const stubStripe = async () => {
  const { default: stripe } = await import("../src/stripe.js");
  const calls = {};
  const state = { paymentMethods: [], sessionCount: 0, customerCount: 0 };
  const record = (name, args) => {
    (calls[name] ||= []).push(args);
  };

  stripe.checkout.sessions.create = async (params) => {
    record("sessions.create", params);
    state.sessionCount += 1;
    const id = `cs_test_${state.sessionCount}`;
    return { id, url: `https://checkout.stripe.com/c/pay/${id}` };
  };
  stripe.customers.create = async (params) => {
    record("customers.create", params);
    state.customerCount += 1;
    return { id: `cus_test_${state.customerCount}` };
  };
  stripe.customers.update = async (id, params) => {
    record("customers.update", [id, params]);
    return { id };
  };
  stripe.paymentMethods.list = async (params) => {
    record("paymentMethods.list", params);
    return {
      data: state.paymentMethods.filter((pm) => pm.customer === params.customer),
    };
  };
  stripe.paymentMethods.retrieve = async (id) => {
    record("paymentMethods.retrieve", id);
    const method = state.paymentMethods.find((pm) => pm.id === id);
    if (!method) throw new Error("No such PaymentMethod");
    return method;
  };
  stripe.paymentMethods.detach = async (id) => {
    record("paymentMethods.detach", id);
    state.paymentMethods = state.paymentMethods.filter((pm) => pm.id !== id);
    return { id };
  };
  stripe.paymentIntents.retrieve = async (id, params) => {
    record("paymentIntents.retrieve", [id, params]);
    return {
      id,
      payment_method: { card: { brand: "visa", last4: "4242" } },
    };
  };

  const reset = () => {
    for (const key of Object.keys(calls)) delete calls[key];
    state.paymentMethods = [];
    state.sessionCount = 0;
    state.customerCount = 0;
  };

  const signedWebhook = (event) => {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    return { payload, signature };
  };

  return { stripe, calls, state, reset, signedWebhook };
};
