import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

// Shared client so every route (and the tests) use the same instance.
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

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
