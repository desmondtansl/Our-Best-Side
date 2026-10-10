import { useState } from "react";
import styled from "styled-components";
import AdminDialog, {
  DialogTitle,
  CannotBeUndone,
  DialogList,
  DialogNote,
  DialogButtons,
  BackButton,
  DangerButton,
} from "./AdminDialog";
import { formatMoney, orderNumber } from "../../utils/format";

const StripeLink = styled.a`
  display: inline-block;
  margin-top: 6px;
  font-weight: 700;
`;

const Checkbox = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-weight: 600;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    margin-top: 3px;
    flex-shrink: 0;
  }
`;

const Hint = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 14px;
  font-weight: 300;
`;

const itemsBackInStock = (order) => {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return count === 1
    ? "The item in it goes back in stock straight away."
    : `The ${count} items in it go back in stock straight away.`;
};

// Asks an admin to confirm before an order is cancelled, which is final.
// When the order can be refunded through Stripe, it offers to refund it at
// the same time (ticked by default). `onConfirm(order, { refund })` cancels;
// `onClose` hides it.
function CancelOrderDialog({ order, onConfirm, onClose }) {
  const refundable = order.refundable || 0;
  const [refundNow, setRefundNow] = useState(refundable > 0);
  const fullyRefunded = order.refundedTotal > 0 && order.refundedTotal >= order.subtotal;
  const amount = formatMoney(refundable, order.currency);

  return (
    <AdminDialog
      alert
      titleId="cancel-order-title"
      describedBy="cancel-order-warning"
      onClose={onClose}
    >
      {({ close }) => (
        <>
          <DialogTitle id="cancel-order-title">Cancel order #{orderNumber(order._id)}?</DialogTitle>
          <CannotBeUndone id="cancel-order-warning" />
          <DialogList>
            <li>
              Once cancelled, this order&apos;s status can never be changed again. If it was
              cancelled by mistake, the customer will need to order again.
            </li>
            <li>{itemsBackInStock(order)}</li>
          </DialogList>
          <DialogNote>
            {refundable > 0 && (
              <Checkbox>
                <input
                  type="checkbox"
                  checked={refundNow}
                  onChange={(e) => setRefundNow(e.target.checked)}
                />
                <span>
                  Also refund {amount} to the customer now, through Stripe
                  <Hint>Untick to refund later, from the order&apos;s page or in Stripe.</Hint>
                </span>
              </Checkbox>
            )}
            {refundable <= 0 && fullyRefunded && <>This order has already been refunded in full.</>}
            {refundable <= 0 && !fullyRefunded && (
              <>
                <strong>The customer is not refunded automatically.</strong> Refund{" "}
                {formatMoney(order.subtotal, order.currency)} in Stripe.
                <br />
                <StripeLink href={order.stripeUrl} target="_blank" rel="noopener noreferrer">
                  Open this payment in Stripe ↗
                </StripeLink>
              </>
            )}
          </DialogNote>
          <DialogButtons>
            <BackButton type="button" data-autofocus onClick={close}>
              No, keep order
            </BackButton>
            <DangerButton
              type="button"
              onClick={() => {
                close();
                onConfirm(order, { refund: refundable > 0 && refundNow });
              }}
            >
              {refundable > 0 && refundNow ? "Yes, cancel and refund" : "Yes, cancel order"}
            </DangerButton>
          </DialogButtons>
        </>
      )}
    </AdminDialog>
  );
}

export default CancelOrderDialog;
