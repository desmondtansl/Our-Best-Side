import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import productsRoutes from "./routes/products.js";
import authRoutes from "./routes/auth.js";
import checkoutRoutes from "./routes/checkout.js";

dotenv.config();
mongoose.set("strictQuery", false);

const MONGO_URI = process.env.MONGO_URI;

const main = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to mongoDB");

  const PORT = process.env.PORT || 8000;
  const app = express();
  app.use(express.json());
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    })
  );
  app.use("/products", productsRoutes);
  app.use("/auth", authRoutes);
  app.use("/checkout", checkoutRoutes);

  app.listen(PORT, () => {
    console.log(`Now listening to port ${PORT}`);
  });
};

main().catch((error) => {
  console.log({ error });
  throw new Error(error);
});
