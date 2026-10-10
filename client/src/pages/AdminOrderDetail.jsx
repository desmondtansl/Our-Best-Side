import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link, useParams } from "react-router-dom";
import OrderStatusControl, { ORDERS_API } from "../components/admin/OrderStatusControl";
import CancelNotice from "../components/admin/CancelNotice";
import RefundDialog from "../components/admin/RefundDialog";
import TrackingFields from "../components/admin/TrackingFields";
import { Badge, Button, ErrorText, Muted } from "../components/account/styles";
import {
  formatDateTime,
  formatMoney,
  orderNumber,
  errorMessage,
  STATUS_LABELS,
} from "../utils/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  font-size: 15px;
  line-height: 1.5;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 600;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 14px;
  font-weight: 600;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const Panel = styled.section`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`;

const Wide = styled(Panel)`
  grid-column: 1 / -1;
`;

const PanelTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const Items = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 8px 6px;
    border-bottom: 0.5px solid lightgray;
    vertical-align: top;
  }

  td:last-child,
  th:last-child {
    text-align: right;
    white-space: nowrap;
  }

  tfoot td {
    border-bottom: none;
    font-weight: 600;
  }
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 12px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Inline = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
  }

  input {
    padding: 10px;
    width: 140px;
    border: 0.5px solid lightgray;
    border-radius: 10px;
    font-weight: 400;
  }
`;

const Notes = styled.textarea`
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  padding: 10px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  font-family: inherit;
  font-size: 15px;
  resize: vertical;
`;

const Saved = styled.span`
  color: teal;
  font-size: 14px;
  font-weight: 600;
`;

const Notice = styled.p`
  margin: 12px 0px 0px;
  padding: 10px 16px;
  border: 2px solid teal;
  border-radius: 10px;
  background-color: #f8f4f4;
  font-weight: 600;
`;

const History = styled.ol`
  margin: 0;
  padding-left: 20px;
`;

const formatAddress = (address) =>
  [address.line1, address.line2, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");

const emptyTracking = { courier: "", number: "", url: "" };

// Tracking details: shown, and editable (to add them after shipping, or
// correct them).
function TrackingPanel({ order, onSaved }) {
  const [value, setValue] = useState({ ...emptyTracking, ...order.tracking });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { courier, number, url } = order.tracking || {};
  const hasTracking = Boolean(courier || number || url);

  if (!editing) {
    return (
      <>
        {hasTracking ? (
          <div>
            {courier && <div>Courier: {courier}</div>}
            {number && <div>Tracking number: {number}</div>}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer">
                Track the parcel ↗
              </a>
            )}
          </div>
        ) : (
          <Muted>No tracking details yet.</Muted>
        )}
        <div>
          <Button
            type="button"
            onClick={() => {
              setValue({ ...emptyTracking, ...order.tracking });
              setEditing(true);
            }}
          >
            {hasTracking ? "Edit tracking" : "Add tracking"}
          </Button>
        </div>
      </>
    );
  }

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setSaving(true);
        try {
          const response = await axios.put(`${ORDERS_API()}/${order._id}/tracking`, value);
          onSaved(response.data.data);
          setEditing(false);
        } catch (err) {
          setError(errorMessage(err, "Could not save the tracking details"));
        } finally {
          setSaving(false);
        }
      }}
    >
      <TrackingFields value={value} onChange={setValue} idPrefix="edit-tracking" />
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Inline>
        <Button primary type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save tracking"}
        </Button>
        <Button type="button" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </Inline>
    </Form>
  );
}

function NotesPanel({ order, onSaved }) {
  const [notes, setNotes] = useState(order.notes || "");
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const changed = notes !== (order.notes || "");

  return (
    <Form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setState("saving");
        try {
          const response = await axios.put(`${ORDERS_API()}/${order._id}/notes`, { notes });
          onSaved(response.data.data);
          setState("saved");
        } catch (err) {
          setError(errorMessage(err, "Could not save the notes"));
          setState("");
        }
      }}
    >
      <Notes
        aria-label="Notes for this order"
        value={notes}
        maxLength={2000}
        placeholder="e.g. Asked for gift wrap"
        onChange={(e) => {
          setNotes(e.target.value);
          setState("");
        }}
      />
      {error && <ErrorText role="alert">{error}</ErrorText>}
      <Inline>
        <Button primary type="submit" disabled={!changed || state === "saving"}>
          {state === "saving" ? "Saving…" : "Save notes"}
        </Button>
        {state === "saved" && !changed && <Saved role="status">Saved</Saved>}
      </Inline>
    </Form>
  );
}

function RefundPanel({ order, onRefunded }) {
  const [amount, setAmount] = useState(order.refundable ? order.refundable.toFixed(2) : "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const value = Number(amount);
  const valid =
    Number.isFinite(value) &&
    value > 0 &&
    value <= order.refundable &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

  useEffect(() => {
    setAmount(order.refundable ? order.refundable.toFixed(2) : "");
  }, [order.refundable]);

  return (
    <>
      {order.refunds?.length > 0 && (
        <div>
          {order.refunds.map((refund) => (
            <Row key={refund.stripeRefundId}>
              <span>Refunded {formatMoney(refund.amount, order.currency)}</span>
              <Muted>
                {formatDateTime(refund.at)} · {refund.by || "in Stripe"}
              </Muted>
            </Row>
          ))}
        </div>
      )}
      {order.refundable > 0 ? (
        <Form
          // The amount is checked here, with a clearer message than the
          // browser's own.
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!valid) {
              setError(
                `Enter an amount between ${formatMoney(0.01, order.currency)} and ${formatMoney(
                  order.refundable,
                  order.currency
                )}`
              );
              return;
            }
            setConfirming(true);
          }}
        >
          <Inline>
            <label>
              Amount to refund
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                max={order.refundable}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <Button type="submit">Refund…</Button>
          </Inline>
          <Muted>
            Up to {formatMoney(order.refundable, order.currency)} can be refunded. You&apos;ll be
            asked to confirm.
          </Muted>
          {error && <ErrorText role="alert">{error}</ErrorText>}
        </Form>
      ) : (
        <Muted>
          {order.refundedTotal > 0
            ? "This order has been refunded in full."
            : "This order has no Stripe payment saved, so it can only be refunded in the Stripe Dashboard."}
        </Muted>
      )}
      {confirming && (
        <RefundDialog
          order={order}
          amount={value}
          onClose={() => setConfirming(false)}
          onConfirm={async (requestId) => {
            try {
              const response = await axios.post(`${ORDERS_API()}/${order._id}/refund`, {
                amount: value,
                requestId,
              });
              onRefunded(response.data.data);
            } catch (err) {
              throw new Error(errorMessage(err, "The refund didn't go through"));
            }
          }}
        />
      )}
    </>
  );
}

function AdminOrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [cancelOutcome, setCancelOutcome] = useState(null);
  const [refundNotice, setRefundNotice] = useState("");
  useDocumentTitle(order ? `Order #${orderNumber(order._id)}` : "Order");

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${ORDERS_API()}/${orderId}`);
        setOrder(response.data.data);
      } catch (err) {
        setLoadError(errorMessage(err, "Could not load the order"));
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loadError) {
    return (
      <Container>
        <Links>
          <Link to="/admin/orders">← All orders</Link>
        </Links>
        <ErrorText role="alert">{loadError}</ErrorText>
      </Container>
    );
  }
  if (!order) {
    return (
      <Container>
        <Muted>Loading the order…</Muted>
      </Container>
    );
  }

  const net = order.subtotal - (order.refundedTotal || 0);
  const history = [
    { status: "placed", at: order.createdAt },
    ...(order.statusHistory || []),
  ];

  return (
    <Container>
      <Header>
        <Title>
          Order #{orderNumber(order._id)}
          <Badge status={order.status}>{STATUS_LABELS[order.status]}</Badge>
        </Title>
        <Links>
          <Link to="/admin/orders">← All orders</Link>
          <Link to="/dashboard">Dashboard</Link>
        </Links>
      </Header>
      <Muted>Placed {formatDateTime(order.createdAt)}</Muted>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {cancelOutcome && (
        <CancelNotice outcome={cancelOutcome} onDismiss={() => setCancelOutcome(null)} />
      )}
      {refundNotice && <Notice role="status">{refundNotice}</Notice>}

      <Grid>
        <Panel aria-labelledby="status-title">
          <PanelTitle id="status-title">Status</PanelTitle>
          <div>
            <OrderStatusControl
              order={order}
              onError={setError}
              onUpdated={(updated, outcome) => {
                setOrder(updated);
                if (outcome?.cancelled) setCancelOutcome({ order: updated, ...outcome });
              }}
            />
          </div>
          <PanelTitle as="h3" style={{ fontSize: 16 }}>
            History
          </PanelTitle>
          <History>
            {history.map((entry, index) => (
              <li key={index}>
                {entry.status === "placed" ? "Placed" : STATUS_LABELS[entry.status]}{" "}
                <Muted>
                  · {formatDateTime(entry.at)}
                  {entry.by
                    ? ` · ${entry.by}`
                    : entry.status === "paid"
                    ? " · confirmed by Stripe"
                    : ""}
                </Muted>
              </li>
            ))}
          </History>
          {!order.statusHistory?.length && (
            <Muted>Status changes made before order history was added weren&apos;t recorded.</Muted>
          )}
        </Panel>

        <Panel aria-labelledby="customer-title">
          <PanelTitle id="customer-title">Customer</PanelTitle>
          <div>
            {order.email || "No email"}
            <Muted> · {order.user ? "has an account" : "guest checkout"}</Muted>
          </div>
          <PanelTitle as="h3" style={{ fontSize: 16 }}>
            Ship to
          </PanelTitle>
          {order.shippingAddress?.line1 ? (
            <div>
              {order.shippingAddress.name && <div>{order.shippingAddress.name}</div>}
              {formatAddress(order.shippingAddress)}
            </div>
          ) : (
            <Muted>No address saved.</Muted>
          )}
        </Panel>

        <Wide aria-labelledby="items-title">
          <PanelTitle id="items-title">Items</PanelTitle>
          <div style={{ overflowX: "auto" }}>
            <Items>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Size / colour</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      {item.product ? (
                        <Link to={`/search/${item.product}`}>{item.title}</Link>
                      ) : (
                        item.title
                      )}
                    </td>
                    <td>{[item.size, item.color].filter(Boolean).join(" / ") || "—"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.price, order.currency)}</td>
                    <td>{formatMoney(item.price * item.quantity, order.currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {order.discount?.code && (
                  <>
                    <tr>
                      <td colSpan={4}>Items</td>
                      <td>{formatMoney(order.itemsTotal ?? order.subtotal + order.discount.amount, order.currency)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}>
                        Discount: {order.discount.code} ({order.discount.percentOff}% off, {order.discount.name})
                      </td>
                      <td>−{formatMoney(order.discount.amount, order.currency)}</td>
                    </tr>
                  </>
                )}
                <tr>
                  <td colSpan={4}>Total paid</td>
                  <td>{formatMoney(order.subtotal, order.currency)}</td>
                </tr>
                {order.refundedTotal > 0 && (
                  <>
                    <tr>
                      <td colSpan={4}>Refunded</td>
                      <td>−{formatMoney(order.refundedTotal, order.currency)}</td>
                    </tr>
                    <tr>
                      <td colSpan={4}>Kept</td>
                      <td>{formatMoney(net, order.currency)}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </Items>
          </div>
        </Wide>

        <Panel aria-labelledby="payment-title">
          <PanelTitle id="payment-title">Payment and refunds</PanelTitle>
          <div>
            {order.paymentMethod?.last4
              ? `Paid with ${order.paymentMethod.brand?.toUpperCase()} •••• ${order.paymentMethod.last4}`
              : "Paid through Stripe"}
            <br />
            <a href={order.stripeUrl} target="_blank" rel="noopener noreferrer">
              Open this payment in Stripe ↗
            </a>
          </div>
          <RefundPanel
            order={order}
            onRefunded={(updated) => {
              setOrder(updated);
              setRefundNotice(
                `Refunded. ${formatMoney(updated.refundedTotal, updated.currency)} has been refunded in total.`
              );
            }}
          />
        </Panel>

        <Panel aria-labelledby="tracking-title">
          <PanelTitle id="tracking-title">Tracking</PanelTitle>
          <Muted>The customer sees these details in their account.</Muted>
          <TrackingPanel order={order} onSaved={setOrder} />
        </Panel>

        <Wide aria-labelledby="notes-title">
          <PanelTitle id="notes-title">Internal notes</PanelTitle>
          <Muted>Only admins see these notes. Customers never do.</Muted>
          <NotesPanel order={order} onSaved={setOrder} />
        </Wide>
      </Grid>
    </Container>
  );
}

export default AdminOrderDetail;
