import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link } from "react-router-dom";
import {
  Section,
  SectionTitle,
  Card,
  CardRow,
  Muted,
  Badge,
  ErrorText,
  Empty,
} from "./styles";
import {
  formatDate,
  formatMoney,
  orderNumber,
  errorMessage,
  STATUS_LABELS,
} from "../../utils/format";

const ItemList = styled.ul`
  margin: 0;
  padding-left: 18px;
`;

const formatAddress = (address) =>
  [address.name, address.line1, address.line2, address.city, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");

function OrderHistory() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/account/orders`
        );
        setOrders(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Could not load your orders"));
      }
    };
    fetchOrders();
  }, []);

  return (
    <Section>
      <SectionTitle>Order history</SectionTitle>
      {error && <ErrorText>{error}</ErrorText>}
      {!error && orders === null && <Muted>Loading orders…</Muted>}
      {orders?.length === 0 && (
        <Empty>
          You haven't placed any orders yet. <Link to="/">Start shopping</Link>
        </Empty>
      )}
      {orders?.map((order) => (
        <Card key={order._id} data-testid="order">
          <CardRow>
            <span>
              <b>Order #{orderNumber(order._id)}</b> · {formatDate(order.createdAt)}
            </span>
            <Badge status={order.status}>{STATUS_LABELS[order.status]}</Badge>
          </CardRow>
          <ItemList>
            {order.items.map((item, index) => (
              <li key={index}>
                {item.quantity} × {item.title}
                {[item.size, item.color].filter(Boolean).length > 0 &&
                  ` (${[item.size, item.color].filter(Boolean).join(", ")})`}{" "}
                — {formatMoney(item.price * item.quantity, order.currency)}
              </li>
            ))}
          </ItemList>
          <CardRow>
            <b>Total: {formatMoney(order.subtotal, order.currency)}</b>
            {order.paymentMethod?.last4 && (
              <Muted>
                Paid with {order.paymentMethod.brand?.toUpperCase()} ••••{" "}
                {order.paymentMethod.last4}
              </Muted>
            )}
          </CardRow>
          {order.shippingAddress?.line1 && (
            <Muted>Ship to: {formatAddress(order.shippingAddress)}</Muted>
          )}
        </Card>
      ))}
    </Section>
  );
}

export default OrderHistory;
