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

const markOrderPaid = async (session) => {
  const order = await Order.findOne({ stripeSessionId: session.id });
  // Ignore unknown sessions and events Stripe re-delivers.
  if (!order || order.status !== "pending") return;

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

  order.status = "paid";
  order.statusHistory.push({ status: "paid", at: new Date() });
  await order.save();
  if (order.discount?.promotion) {
    await Promotion.updateOne({ _id: order.discount.promotion }, { $inc: { timesUsed: 1 } });
  }
  await adjustStock(order.items, -1);
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
