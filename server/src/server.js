import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app.js";

dotenv.config();

// A safety net: an error no route caught is logged, and the server keeps
// running instead of shutting down (which would take the shop offline until
// Render restarted it).
process.on("unhandledRejection", (error) => {
  console.error("Unhandled error:", error?.stack || error);
});
// Query filters only use fields the models define; anything else is dropped.
mongoose.set("strictQuery", true);

const MONGO_URI = process.env.MONGO_URI;

const main = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to mongoDB");

  const PORT = process.env.PORT || 8000;
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Now listening to port ${PORT}`);
  });
};

main().catch((error) => {
  console.log({ error });
  throw new Error(error);
});
