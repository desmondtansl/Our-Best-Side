import express from "express";
import mongoose from "mongoose";
import stripe, {
  ensureStripeCustomer,
  isStripeConfigured,
  paymentErrorResponse,
  paymentsNotConfigured,
} from "../stripe.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { findStockProblem } from "../inventory.js";
import { signedImageUrl, isValidImageKey } from "../s3.js";

const router = express.Router();

const MAX_ITEMS = 50;
const MAX_QUANTITY = 99;

const getCurrency = () => (process.env.CURRENCY || "sgd").toLowerCase();

const getShippingCountries = () =>
  (process.env.SHIPPING_COUNTRIES || "SG")
    .split(",")
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean);

const toCents = (amount) => Math.round(amount * 100);

const badRequest = (res, message) =>
  res.status(400).json({ data: "", error: message });

// Validates the cart sent by the client. Only product ids, quantities and the
// chosen size/colour are trusted; prices always come from the database.
const parseCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Your cart is empty" };
  }
  if (items.length > MAX_ITEMS) {
    return { error: "Too many items in cart" };
  }
  const parsed = [];
  for (const item of items) {
    const quantity = Number(item?.quantity);
    if (!mongoose.isValidObjectId(item?.productId)) {
      return { error: "Invalid product in cart" };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { error: "Invalid quantity in cart" };
    }
    parsed.push({
      productId: String(item.productId),
      quantity,
      size: item.size ? String(item.size).slice(0, 50) : "",
      color: item.color ? String(item.color).slice(0, 50) : "",
    });
  }
  return { items: parsed };
};

const toStripeShipping = (address) => ({
  name: address.fullName,
  phone: address.phone || undefined,
  address: {
    line1: address.line1,
    line2: address.line2 || undefined,
    city: address.city,
    state: address.state || undefined,
    postal_code: address.postalCode,
    country: address.country,
  },
});

// CREATE A STRIPE CHECKOUT SESSION FOR THE CART

router.post("/create-checkout-session", optionalAuth, async (req, res) => {
  if (!isStripeConfigured()) return paymentsNotConfigured(res);
  let order;
  try {
    const { items, error } = parseCartItems(req.body?.items);
    if (error) return badRequest(res, error);

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((p) => [p.id, p]));

    const orderItems = [];
    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product || !(product.price > 0)) {
        return badRequest(res, "Some items in your cart are no longer available");
      }
      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.image,
        size: item.size,
        color: item.color,
        price: product.price,
        quantity: item.quantity,
      });
    }

    const stockProblem = findStockProblem(orderItems, productsById);
    if (stockProblem) return badRequest(res, stockProblem);

    const user = req.user ? await User.findOne({ email: req.user }) : null;

    let savedAddress;
    if (req.body?.addressId) {
      savedAddress = user?.addresses.id(req.body.addressId);
      if (!savedAddress) return badRequest(res, "Address not found");
    }

    const currency = getCurrency();
    const subtotal =
      orderItems.reduce((sum, item) => sum + toCents(item.price) * item.quantity, 0) /
      100;

    order = await Order.create({
      user: user?._id,
      email: user?.email,
      items: orderItems,
      subtotal,
      currency,
    });

    // Stripe shows product photos on its checkout page; a checkout session
    // lasts up to 24 hours, so sign the links for that long.
    const images = await Promise.all(
      orderItems.map((item) =>
        isValidImageKey(item.image) ? signedImageUrl(item.image, 24 * 60 * 60) : undefined
      )
    );

    const sessionParams = {
      mode: "payment",
      line_items: orderItems.map((item, index) => {
        const details = [
          item.size && `Size: ${item.size}`,
          item.color && `Color: ${item.color}`,
        ].filter(Boolean);
        const image = images[index];
        return {
          quantity: item.quantity,
          price_data: {
            currency,
            unit_amount: toCents(item.price),
            product_data: {
              name: item.title || "Product",
              ...(details.length && { description: details.join(", ") }),
              ...(image && { images: [image] }),
            },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: getShippingCountries() },
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cart`,
    };

    if (user) {
      const customerId = await ensureStripeCustomer(user);
      sessionParams.customer = customerId;
      // Keeps the customer's shipping details in sync with what they enter.
      sessionParams.customer_update = { shipping: "auto" };
      // Shows a "save this card" option; saved cards appear on the account page.
      sessionParams.saved_payment_method_options = { payment_method_save: "enabled" };
      if (savedAddress) {
        // Checkout pre-fills the shipping form from the customer's shipping details.
        await stripe.customers.update(customerId, {
          shipping: toStripeShipping(savedAddress),
        });
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    order.stripeSessionId = session.id;
    await order.save();

    return res.status(200).json({
      data: session.url,
      error: "",
    });
  } catch (error) {
    if (order && !order.stripeSessionId) {
      await Order.deleteOne({ _id: order._id }).catch(() => {});
    }
    if (error?.type?.startsWith("Stripe")) {
      return paymentErrorResponse(res, error, "start checkout");
    }
    console.error("Checkout failed:", error.message);
    return res.status(500).json({
      data: "",
      error: "Checkout failed. Please try again.",
    });
  }
});

// ORDER SUMMARY FOR THE SUCCESS PAGE
// The session id is only known to whoever completed checkout, so this works
// for guests too.

router.get("/order/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
      return res.status(404).json({ data: "", error: "Order not found" });
    }
    const order = await Order.findOne({ stripeSessionId: sessionId });
    if (!order) {
      return res.status(404).json({ data: "", error: "Order not found" });
    }
    return res.status(200).json({
      data: {
        id: order.id,
        status: order.status,
        email: order.email,
        items: order.items,
        subtotal: order.subtotal,
        currency: order.currency,
        createdAt: order.createdAt,
      },
      error: "",
    });
  } catch (error) {
    return res.status(400).json({ data: "", error: error.message });
  }
});

export default router;
