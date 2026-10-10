import { useState } from "react";
import styled from "styled-components";
import AdminDialog, {
  DialogTitle,
  DialogButtons,
  BackButton,
  PrimaryButton,
  DialogError,
} from "./AdminDialog";
import TrackingFields from "./TrackingFields";
import { orderNumber } from "../../utils/format";

const Muted = styled.p`
  margin: 0px;
  font-size: 14px;
  font-weight: 300;
`;

// Asks for the courier and tracking number when an order is marked shipped.
// They're optional, and can be added later on the order's page.
// `onConfirm(tracking)` returns a promise; if it fails, the pop-up stays
// open with the message.
function ShipOrderDialog({ order, onConfirm, onClose }) {
  const [tracking, setTracking] = useState({
    courier: order.tracking?.courier || "",
    number: order.tracking?.number || "",
    url: order.tracking?.url || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <AdminDialog titleId="ship-order-title" onClose={onClose}>
      {({ close }) => (
        <form
          style={{ display: "contents" }}
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setSaving(true);
            try {
              await onConfirm(tracking);
              close();
            } catch (err) {
              setError(err.message);
              setSaving(false);
            }
          }}
        >
          <DialogTitle id="ship-order-title">
            Mark order #{orderNumber(order._id)} as shipped
          </DialogTitle>
          <Muted>
            The customer sees these tracking details in their account. Leave them empty if you
            don&apos;t have them yet: you can add them later on the order&apos;s page.
          </Muted>
          <TrackingFields value={tracking} onChange={setTracking} />
          {error && <DialogError role="alert">{error}</DialogError>}
          <DialogButtons>
            <BackButton type="button" onClick={close}>
              Back
            </BackButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving…" : "Mark as shipped"}
            </PrimaryButton>
          </DialogButtons>
        </form>
      )}
    </AdminDialog>
  );
}

export default ShipOrderDialog;
