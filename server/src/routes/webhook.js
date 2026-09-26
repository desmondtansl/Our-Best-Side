import stripe from "../stripe.js";
import Order from "../models/Order.js";

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

  order.status = "paid";
  await order.save();
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
    return res.status(400).json({ data: "", error: `Webhook error: ${error.message}` });
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
    console.log("Webhook handler failed:", error.message);
    return res.status(500).json({ data: "", error: error.message });
  }
};
