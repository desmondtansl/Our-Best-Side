import { useState } from "react";
import AdminDialog, {
  DialogTitle,
  CannotBeUndone,
  DialogList,
  DialogButtons,
  BackButton,
  DangerButton,
  DialogError,
} from "./AdminDialog";
import { formatMoney, orderNumber } from "../../utils/format";

// Confirms a refund through Stripe. `onConfirm()` returns a promise; if it
// fails, the pop-up stays open with Stripe's message.
function RefundDialog({ order, amount, onConfirm, onClose }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const money = formatMoney(amount, order.currency);
  const card = order.paymentMethod?.last4
    ? `the ${order.paymentMethod.brand?.toUpperCase() || "card"} ending ${order.paymentMethod.last4}`
    : "the card the customer paid with";

  return (
    <AdminDialog alert titleId="refund-title" describedBy="refund-warning" onClose={onClose}>
      {({ close }) => (
        <>
          <DialogTitle id="refund-title">
            Refund {money} for order #{orderNumber(order._id)}?
          </DialogTitle>
          <CannotBeUndone id="refund-warning" />
          <DialogList>
            <li>
              Stripe sends {money} back to {card}. It usually reaches the customer in 5–10
              working days.
            </li>
            <li>
              The order&apos;s status doesn&apos;t change. If it won&apos;t be sent, cancel it as
              well.
            </li>
          </DialogList>
          {error && <DialogError role="alert">{error}</DialogError>}
          <DialogButtons>
            <BackButton type="button" data-autofocus onClick={close}>
              No, go back
            </BackButton>
            <DangerButton
              type="button"
              disabled={saving}
              onClick={async () => {
                setError("");
                setSaving(true);
                try {
                  await onConfirm();
                  close();
                } catch (err) {
                  setError(err.message);
                  setSaving(false);
                }
              }}
            >
              {saving ? "Refunding…" : `Yes, refund ${money}`}
            </DangerButton>
          </DialogButtons>
        </>
      )}
    </AdminDialog>
  );
}

export default RefundDialog;
