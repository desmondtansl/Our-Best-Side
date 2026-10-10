import styled from "styled-components";
import { formatMoney, orderNumber } from "../../utils/format";

const Notice = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0px;
  padding: 12px 16px;
  border: 2px solid ${(props) => (props.$done ? "teal" : "red")};
  border-radius: 10px;
  background-color: ${(props) => (props.$done ? "#f8f4f4" : "#fff0f0")};
  line-height: 1.5;
`;

const DismissButton = styled.button`
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 4px 8px;
  font-size: 18px;
  cursor: pointer;
`;

const StripeLink = styled.a`
  font-weight: 700;
`;

// Shown after an order is cancelled, until dismissed, so the refund isn't
// forgotten once the pop-up closes. `outcome` is what OrderStatusControl
// reported: { order, refundTried, refundError }.
function CancelNotice({ outcome, onDismiss }) {
  const { order, refundTried, refundError } = outcome;
  const number = `#${orderNumber(order._id)}`;
  const refunded = refundTried && !refundError;
  const fullyRefunded = order.refundedTotal > 0 && order.refundedTotal >= order.subtotal;
  // Nothing to remind about if it was already refunded in full before.
  if (!refundTried && fullyRefunded) return null;
  const toRefund = formatMoney(order.refundable > 0 ? order.refundable : order.subtotal, order.currency);
  const stripeLink = (
    <StripeLink href={order.stripeUrl} target="_blank" rel="noopener noreferrer">
      Open this payment in Stripe ↗
    </StripeLink>
  );

  return (
    <Notice role="status" $done={refunded}>
      <span>
        {refunded && (
          <>
            <strong>Order {number} is cancelled</strong> and{" "}
            {formatMoney(order.refundedTotal, order.currency)} has been refunded to the customer.
          </>
        )}
        {refundTried && refundError && (
          <>
            <strong>Order {number} is cancelled, but the refund didn&apos;t go through:</strong>{" "}
            {refundError.replace(/\.?$/, ".")} Refund {toRefund} from the order&apos;s page, or {stripeLink}
          </>
        )}
        {!refundTried && (
          <>
            <strong>Order {number} is cancelled.</strong> Don&apos;t forget to refund {toRefund} to
            the customer: {stripeLink}
          </>
        )}
      </span>
      <DismissButton type="button" aria-label="Dismiss refund reminder" onClick={onDismiss}>
        ✕
      </DismissButton>
    </Notice>
  );
}

export default CancelNotice;
