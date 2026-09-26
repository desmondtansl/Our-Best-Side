import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import BackToDashboard from "../components/BackToDashboard";
import {
  formatDate,
  formatMoney,
  orderNumber,
  errorMessage,
  STATUS_LABELS,
} from "../utils/format";

const Container = styled.div`
  padding: 20px;
  font-size: 14px;
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
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 0.5px solid lightgray;
    vertical-align: top;
  }
`;

const Select = styled.select`
  padding: 6px;
`;

const ErrorText = styled.p`
  color: red;
`;

// Statuses an admin can set; "pending" is managed by checkout itself.
const ADMIN_STATUSES = ["paid", "processing", "shipped", "delivered", "cancelled"];

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/orders`;

function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setError("");
      try {
        const response = await axios.get(API(), {
          params: filter ? { status: filter } : {},
        });
        setOrders(response.data.data);
      } catch (err) {
        setError(errorMessage(err, "Could not load orders"));
      }
    };
    fetchOrders();
  }, [filter]);

  const handleStatusChange = async (order, status) => {
    setError("");
    setSavingId(order._id);
    try {
      const response = await axios.patch(`${API()}/${order._id}`, { status });
      setOrders((current) =>
        current.map((o) => (o._id === order._id ? response.data.data : o))
      );
    } catch (err) {
      setError(errorMessage(err, "Could not update the order"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Orders</Title>
        <BackToDashboard />
      </Header>
      <label>
        Show:{" "}
        <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All orders</option>
          {ADMIN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </label>
      {error && <ErrorText>{error}</ErrorText>}
      {orders === null && !error && <p>Loading orders…</p>}
      {orders?.length === 0 && <p>No orders found.</p>}
      {orders?.length > 0 && (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Ship to</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>#{orderNumber(order._id)}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>
                    {order.email || "—"}
                    {!order.user && " (guest)"}
                  </td>
                  <td>
                    {order.items.map((item, index) => (
                      <div key={index}>
                        {item.quantity} × {item.title}
                        {item.size && ` (${item.size})`}
                      </div>
                    ))}
                  </td>
                  <td>{formatMoney(order.subtotal, order.currency)}</td>
                  <td>
                    {order.shippingAddress?.line1
                      ? [
                          order.shippingAddress.name,
                          order.shippingAddress.line1,
                          order.shippingAddress.line2,
                          order.shippingAddress.city,
                          order.shippingAddress.postalCode,
                          order.shippingAddress.country,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : "—"}
                  </td>
                  <td>
                    <Select
                      aria-label={`Status for order ${orderNumber(order._id)}`}
                      value={order.status}
                      disabled={savingId === order._id}
                      onChange={(e) => handleStatusChange(order, e.target.value)}
                    >
                      {ADMIN_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
    </Container>
  );
}

export default AdminOrders;
