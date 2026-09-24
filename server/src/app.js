import express from "express";
import cors from "cors";
import productsRoutes from "./routes/products.js";
import authRoutes from "./routes/auth.js";
import checkoutRoutes from "./routes/checkout.js";

export const createApp = () => {
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
  return app;
};
