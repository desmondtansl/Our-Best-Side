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
