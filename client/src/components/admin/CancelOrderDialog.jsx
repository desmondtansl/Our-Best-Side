import { useRef } from "react";
import styled from "styled-components";
import useModal from "../../hooks/useModal";
import useCloseOnBack from "../../hooks/useCloseOnBack";
import { formatMoney, orderNumber } from "../../utils/format";

const Overlay = styled.div`
  position: fixed;
  inset: 0px;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.4);
`;

const Dialog = styled.div`
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px 24px 24px;
  border-radius: 10px;
  background: white;
  box-shadow: 0px 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 15px;
  line-height: 1.5;

  @media (max-width: 600px) {
    padding: 16px;
  }
`;

const Title = styled.h2`
  margin: 0px;
  font-size: 22px;
  font-weight: 500;
`;

// The warning that can't be missed: first thing under the title, in a red
// box, in large bold red text.
const Warning = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid red;
  border-radius: 10px;
  background-color: #fff0f0;
  color: red;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.3;
`;

const WarningIcon = styled.span`
  font-size: 28px;
  line-height: 1;
`;

const Details = styled.ul`
  margin: 0px;
  padding-left: 20px;
`;

// The refund reminder, with the link to the payment in Stripe.
const Refund = styled.div`
  padding: 12px 16px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  background-color: #f8f4f4;
`;

const StripeLink = styled.a`
  display: inline-block;
  margin-top: 6px;
  font-weight: 700;
`;

const Buttons = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
`;

const Button = styled.button`
  flex: 1 1 auto;
  border: none;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
`;

const KeepButton = styled(Button)`
  background-color: #e1d7c6;
  color: black;
`;

const CancelButton = styled(Button)`
  background-color: red;
  color: white;
`;

const itemsBackInStock = (order) => {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return count === 1
    ? "The item in it goes back in stock straight away."
    : `The ${count} items in it go back in stock straight away.`;
};

// Asks an admin to confirm before an order is cancelled, which is final.
// Shown while `order` is set; `onClose` hides it, `onConfirm` cancels.
function CancelOrderDialog({ order, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const open = Boolean(order);
  // The phone's Back button closes the pop-up, keeping the order as it is.
  const { close } = useCloseOnBack(open, (value) => {
    if (!value) onClose();
  });
  // "Keep order" has focus when the pop-up opens, so pressing Enter straight
  // away never cancels anything.
  const trapFocus = useModal(open, { onClose: close, containerRef: dialogRef });

  if (!order) return null;

  return (
    <Overlay
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <Dialog
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        aria-describedby="cancel-order-warning"
        onKeyDown={trapFocus}
      >
        <Title id="cancel-order-title">Cancel order #{orderNumber(order._id)}?</Title>
        <Warning id="cancel-order-warning">
          <WarningIcon aria-hidden="true">⚠</WarningIcon>
          <span>This action cannot be undone.</span>
        </Warning>
        <Details>
          <li>
            Once cancelled, this order&apos;s status can never be changed again. If it was
            cancelled by mistake, the customer will need to order again.
          </li>
          <li>{itemsBackInStock(order)}</li>
        </Details>
        <Refund>
          <strong>The customer is not refunded automatically.</strong> Refund{" "}
          {formatMoney(order.subtotal, order.currency)} in Stripe.
          <br />
          <StripeLink href={order.stripeUrl} target="_blank" rel="noopener noreferrer">
            Open this payment in Stripe ↗
          </StripeLink>
        </Refund>
        <Buttons>
          <KeepButton type="button" data-autofocus onClick={close}>
            No, keep order
          </KeepButton>
          <CancelButton
            type="button"
            onClick={() => {
              close();
              onConfirm(order);
            }}
          >
            Yes, cancel order
          </CancelButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

export default CancelOrderDialog;
