import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp, isProduction } from "./app.js";

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
  // Without BASE_URL, Stripe would send shoppers to a broken address and no
  // website could call the API, so don't start half-configured.
  if (isProduction() && !process.env.BASE_URL) {
    throw new Error("BASE_URL must be set in production (e.g. https://ourbestside.netlify.app)");
  }
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
