import express from "express";
import { errorHandler, notFoundHandler } from "./errors.js";
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

// How many proxies sit in front of the server (TRUST_PROXY_HOPS, default 1
// for Render).
export const trustProxyHops = () => {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 1);
  return Number.isInteger(hops) && hops >= 0 ? hops : 1;
};

// The websites allowed to call the API from a browser: the shop (BASE_URL)
// and any listed in ALLOWED_ORIGINS (comma-separated). Outside production
// (local development and tests), any site may.
export const allowedOrigins = () => {
  if (process.env.NODE_ENV !== "production") return true;
  const origins = [process.env.BASE_URL, ...(process.env.ALLOWED_ORIGINS || "").split(",")]
    .map((origin) => String(origin || "").trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return origins.length ? origins : true;
};

// Headers for every API response: no sniffing content types, never shown
// inside another site's frame, no referrer, HTTPS only, and nothing to run.
const securityHeaders = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Opener-Policy": "same-origin",
  });
  if (process.env.NODE_ENV === "production") {
    res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};

export const createApp = () => {
  const app = express();
  // Don't announce the server software.
  app.disable("x-powered-by");
  // Render sits in front of the server: trust its proxy hop(s), so req.ip is
  // the visitor's address (used by the rate limits), not Render's. The owner
  // can check what the server sees on Manage Admins → Connection check.
  app.set("trust proxy", trustProxyHops());
  app.use(securityHeaders);
  // Registered before express.json(): Stripe signs the raw request body.
  app.post(
    "/checkout/webhook",
    express.raw({ type: "application/json" }),
    stripeWebhook
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(
    cors({
      origin: allowedOrigins(),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
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
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
