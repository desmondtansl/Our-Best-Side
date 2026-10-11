import stripe from "../stripe.js";
import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import { adjustStock } from "../inventory.js";
import { syncRefundsFromStripe } from "../refunds.js";

const toShippingAddress = (shipping) => {
  if (!shipping?.address) return undefined;
  const { address } = shipping;
  return {
    name: shipping.name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country,
  };
};

// Note added to an order whose items sold out while it was being paid for.
export const OVERSOLD_NOTE =
  "Stock ran out while this order was being paid for: check the stock before shipping, or refund the items that can't be sent.";

const markOrderPaid = async (session) => {
  // Claimed in one step: only one of several deliveries of the same event
  // (Stripe retries, or sends it twice at once) finds the order still
  // pending, so stock and promotion counts change exactly once.
  const order = await Order.findOneAndUpdate(
    { stripeSessionId: session.id, status: "pending" },
    { $set: { status: "paid" }, $push: { statusHistory: { status: "paid", at: new Date() } } },
    { new: true }
  );
  // Unknown sessions and events Stripe re-delivers.
  if (!order) return;

  // Newer Stripe API versions move shipping_details under collected_information.
  const shipping =
    session.shipping_details || session.collected_information?.shipping_details;
  order.shippingAddress = toShippingAddress(shipping);
  order.email = order.email || session.customer_details?.email;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (paymentIntentId) {
    order.stripePaymentIntentId = paymentIntentId;
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      const card = paymentIntent.payment_method?.card;
      if (card) order.paymentMethod = { brand: card.brand, last4: card.last4 };
    } catch (error) {
      // Card details are nice to have; the order is still paid without them.
      console.log("Could not load payment method:", error.message);
    }
  }

  // Stripe's own totals, so a discount is exactly what the customer paid.
  if (Number.isInteger(session.amount_total)) {
    order.subtotal = session.amount_total / 100;
    if (order.discount?.code && Number.isInteger(session.total_details?.amount_discount)) {
      order.discount.amount = session.total_details.amount_discount / 100;
    }
  }

  await order.save();
  if (order.discount?.promotion) {
    await Promotion.updateOne({ _id: order.discount.promotion }, { $inc: { timesUsed: 1 } });
  }
  const oversold = await adjustStock(order.items, -1);
  if (oversold) {
    await Order.updateOne(
      { _id: order._id },
      [{ $set: { notes: { $trim: { input: { $concat: [OVERSOLD_NOTE, "\n\n", { $ifNull: ["$notes", ""] }] } } } } }]
    );
  }
};

// POST /checkout/webhook
// Must receive the raw request body so the Stripe signature can be verified.
export const stripeWebhook = async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ data: "", error: "Webhook not configured" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.header("stripe-signature"),
      secret
    );
  } catch (error) {
    return res.status(400).json({ data: "", error: "Invalid signature" });
  }

  try {
    const session = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (session.mode === "payment" && session.payment_status === "paid") {
          await markOrderPaid(session);
        }
        break;
      case "charge.refunded": {
        // A refund made in the Stripe Dashboard (or from the admin pages,
        // which is already recorded and is skipped).
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        await syncRefundsFromStripe(paymentIntentId);
        break;
      }
      case "checkout.session.expired":
        // Abandoned checkout: drop the placeholder order.
        await Order.deleteOne({ stripeSessionId: session.id, status: "pending" });
        break;
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry the event later.
    console.error("Webhook handler failed:", error?.stack || error?.message);
    return res.status(500).json({ data: "", error: "Webhook handler failed" });
  }
};
