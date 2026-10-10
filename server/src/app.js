import express from "express";
import cors from "cors";
import productsRoutes from "./routes/products.js";
import authRoutes from "./routes/auth.js";
import checkoutRoutes from "./routes/checkout.js";
import accountRoutes from "./routes/account.js";
import adminOrdersRoutes from "./routes/adminOrders.js";
import adminStatsRoutes from "./routes/adminStats.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import adminProductsRoutes from "./routes/adminProducts.js";
import adminPromotionsRoutes from "./routes/adminPromotions.js";
import promotionsRoutes from "./routes/promotions.js";
import { stripeWebhook } from "./routes/webhook.js";

export const createApp = () => {
  const app = express();
  // Render sits in front of the server: trust its one proxy hop, so req.ip is
  // the visitor's address (used by the login limits), not Render's.
  app.set("trust proxy", 1);
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
  app.use("/admin/stats", adminStatsRoutes);
  app.use("/admin/users", adminUsersRoutes);
  app.use("/admin/products", adminProductsRoutes);
  app.use("/admin/promotions", adminPromotionsRoutes);
  app.use("/promotions", promotionsRoutes);
  return app;
};
