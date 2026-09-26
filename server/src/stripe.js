import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

// Shared client so every route (and the tests) use the same instance.
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

export const isStripeConfigured = () => Boolean(process.env.STRIPE_PRIVATE_KEY);

// Customers shouldn't see Stripe's internal messages (they can mention API
// keys and account settings). Log the details for the site owner and return a
// plain message instead.
export const paymentErrorResponse = (res, error, action) => {
  console.error(`Stripe error while trying to ${action}:`, error?.message);
  return res.status(502).json({
    data: "",
    error: "We couldn't reach our payment provider. Please try again in a moment.",
  });
};

export const paymentsNotConfigured = (res) => {
  console.error("STRIPE_PRIVATE_KEY is not set; payments are disabled.");
  return res.status(503).json({
    data: "",
    error: "Payments aren't set up yet. Please try again later.",
  });
};

// Returns the user's Stripe Customer id, creating the customer on first use.
export const ensureStripeCustomer = async (user) => {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
};

export default stripe;
