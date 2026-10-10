import stripe from "./stripe.js";
import Order from "./models/Order.js";

const toCents = (amount) => Math.round(amount * 100);

// Stripe refunds that have gone through or are on their way. Failed and
// cancelled ones never reach the customer, so they aren't recorded.
const COUNTED = ["succeeded", "pending", "requires_action"];

// Adds a Stripe refund to its order, once. Refunds made from the admin pages
// and those Stripe reports through the webhook can arrive in either order,
// or both at once; matching on the refund id means each is counted once.
export const recordRefund = async (orderId, refund) => {
  if (!COUNTED.includes(refund.status)) return;
  const amount = refund.amount / 100;
  await Order.updateOne(
    { _id: orderId, "refunds.stripeRefundId": { $ne: refund.id } },
    {
      $push: {
        refunds: {
          stripeRefundId: refund.id,
          amount,
          at: new Date((refund.created || Date.now() / 1000) * 1000),
          by: refund.metadata?.by || undefined,
        },
      },
      $inc: { refundedTotal: amount },
    }
  );
};

// Refunds `amount` (in the order's currency) through Stripe and records it.
// The idempotency key makes a double-click send one refund, not two: both
// requests see the same order and send the same key, and Stripe returns the
// first refund for the second.
export const refundOrder = async (order, amount, by) => {
  const cents = toCents(amount);
  const refund = await stripe.refunds.create(
    {
      payment_intent: order.stripePaymentIntentId,
      amount: cents,
      metadata: { orderId: String(order._id), by },
    },
    { idempotencyKey: `refund:${order._id}:${order.refunds.length}:${cents}` }
  );
  await recordRefund(order._id, refund);
  return refund;
};

// Records refunds made in the Stripe Dashboard (Stripe sends charge.refunded).
export const syncRefundsFromStripe = async (paymentIntentId) => {
  if (!paymentIntentId) return;
  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId }, "_id");
  if (!order) return;
  const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
  for (const refund of refunds.data) {
    await recordRefund(order._id, refund);
  }
};
