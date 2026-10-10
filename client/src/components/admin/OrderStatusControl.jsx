import { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import CancelOrderDialog from "./CancelOrderDialog";
import ShipOrderDialog from "./ShipOrderDialog";
import { Badge } from "../account/styles";
import { orderNumber, errorMessage, STATUS_LABELS } from "../../utils/format";
import { newRequestId } from "../../utils/requestId";

const Select = styled.select`
  padding: 6px;
`;

// Statuses an admin can set; "pending" is managed by checkout itself.
export const ADMIN_STATUSES = ["paid", "processing", "shipped", "delivered", "cancelled"];

export const ORDERS_API = () => `${import.meta.env.VITE_BASE_URL}/admin/orders`;

// An order's status, as a dropdown (or a fixed label once cancelled, since
// cancelling is final). Used in the order list and on an order's page.
// - Cancelled asks for confirmation first, and can refund at the same time.
// - Shipped asks for the courier and tracking number.
// - Anything else changes straight away.
// Calls onUpdated(order, outcome) with the saved order; outcome is set for a
// cancel: { cancelled: true, refundTried, refundError }. Errors go to onError.
function OrderStatusControl({ order, onUpdated, onError }) {
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);

  const patch = async (body) =>
    (await axios.patch(`${ORDERS_API()}/${order._id}`, body)).data.data;

  const change = async (status) => {
    onError("");
    setSaving(true);
    try {
      onUpdated(await patch({ status }));
    } catch (err) {
      onError(errorMessage(err, "Could not update the order"));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (current, { refund }) => {
    onError("");
    setSaving(true);
    let updated;
    try {
      updated = await patch({ status: "cancelled" });
    } catch (err) {
      onError(errorMessage(err, "Could not cancel the order"));
      setSaving(false);
      return;
    }
    let refundError = "";
    if (refund && updated.refundable > 0) {
      try {
        const response = await axios.post(`${ORDERS_API()}/${order._id}/refund`, {
          amount: updated.refundable,
          requestId: newRequestId(),
        });
        updated = response.data.data;
      } catch (err) {
        refundError = errorMessage(err, "The refund didn't go through");
      }
    }
    setSaving(false);
    onUpdated(updated, { cancelled: true, refundTried: refund, refundError });
  };

  // Errors are shown inside the shipping pop-up, which stays open.
  const ship = async (tracking) => {
    try {
      onUpdated(await patch({ status: "shipped", tracking }));
    } catch (err) {
      throw new Error(errorMessage(err, "Could not mark the order as shipped"));
    }
  };

  if (order.status === "cancelled") {
    return <Badge status="cancelled">{STATUS_LABELS.cancelled}</Badge>;
  }

  return (
    <>
      <Select
        aria-label={`Status for order ${orderNumber(order._id)}`}
        value={order.status}
        disabled={saving}
        onChange={(e) => {
          const status = e.target.value;
          if (status === "cancelled") setDialog("cancel");
          else if (status === "shipped") setDialog("ship");
          else change(status);
        }}
      >
        {ADMIN_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      {dialog === "cancel" && (
        <CancelOrderDialog order={order} onConfirm={cancel} onClose={() => setDialog(null)} />
      )}
      {dialog === "ship" && (
        <ShipOrderDialog order={order} onConfirm={ship} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

export default OrderStatusControl;
