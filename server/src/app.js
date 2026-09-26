import express from "express";
import cors from "cors";
import productsRoutes from "./routes/products.js";
import authRoutes from "./routes/auth.js";
import checkoutRoutes from "./routes/checkout.js";
import accountRoutes from "./routes/account.js";
import adminOrdersRoutes from "./routes/adminOrders.js";
import { stripeWebhook } from "./routes/webhook.js";

export const createApp = () => {
  const app = express();
  // Registered before express.json(): Stripe signs the raw request body.
  app.post(
    "/checkout/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook
  );
  app.use(express.json());
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "x-access-token"],
    })
  );
  app.use("/products", productsRoutes);
  app.use("/auth", authRoutes);
  app.use("/checkout", checkoutRoutes);
  app.use("/account", accountRoutes);
  app.use("/admin/orders", adminOrdersRoutes);
  return app;
};
