import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import OrderStatusControl, {
  ADMIN_STATUSES,
  ORDERS_API,
} from "../components/admin/OrderStatusControl";
import CancelNotice from "../components/admin/CancelNotice";
import { Button } from "../components/account/styles";
import {
  formatDate,
  formatMoney,
  orderNumber,
  errorMessage,
  STATUS_LABELS,
} from "../utils/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

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

const Filters = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin: 10px 0px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 600;
  }

  input,
  select {
    padding: 6px;
    font-weight: 400;
  }
`;

const SearchLabel = styled.label`
  flex: 1 1 220px;
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

const OrderLink = styled(Link)`
  font-weight: 700;
  white-space: nowrap;
`;

const SmallStripeLink = styled.a`
  display: block;
  margin-top: 6px;
  font-size: 13px;
  white-space: nowrap;
`;

const ErrorText = styled.p`
  color: red;
`;

const More = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0px;
`;

// "Waiting to ship" covers two statuses; the dashboard links here with it.
const TO_SHIP = "paid,processing";

// The filters live in the address (?status=…&q=…&from=…&to=…), so the
// dashboard can link to a filtered list and Back returns to the previous one.
const FILTER_KEYS = ["status", "q", "from", "to"];

const formatAddress = (address) =>
  address?.line1
    ? [address.name, address.line1, address.line2, address.city, address.postalCode, address.country]
        .filter(Boolean)
        .join(", ")
    : "—";

function AdminOrders() {
  useDocumentTitle("Orders");
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || ""]));
  const filterKey = FILTER_KEYS.map((key) => filters[key]).join("|");
  // What's typed in the search box, applied when the form is submitted.
  const [query, setQuery] = useState(filters.q);
  const [orders, setOrders] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  // What happened to the order just cancelled (a refund reminder).
  const [cancelOutcome, setCancelOutcome] = useState(null);

  const setFilters = (changes) => {
    const next = { ...filters, ...changes };
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  };

  const fetchPage = (pageNumber) => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    if (pageNumber > 1) params.page = pageNumber;
    return axios.get(ORDERS_API(), { params });
  };

  useEffect(() => {
    setQuery(filters.q);
    const fetchOrders = async () => {
      setError("");
      try {
        const response = await fetchPage(1);
        setOrders(response.data.data);
        setHasMore(Boolean(response.data.hasMore));
        setPage(1);
      } catch (err) {
        setError(errorMessage(err, "Could not load orders"));
      }
    };
    fetchOrders();
  }, [filterKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await fetchPage(page + 1);
      // Orders placed since the first page can shift the list; skip repeats.
      setOrders((current) => {
        const seen = new Set(current.map((o) => o._id));
        return [...current, ...response.data.data.filter((o) => !seen.has(o._id))];
      });
      setHasMore(Boolean(response.data.hasMore));
      setPage(page + 1);
    } catch (err) {
      setError(errorMessage(err, "Could not load more orders"));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUpdated = (updated, outcome) => {
    setOrders((current) => current.map((o) => (o._id === updated._id ? updated : o)));
    if (outcome?.cancelled) setCancelOutcome({ order: updated, ...outcome });
  };

  const filtered = FILTER_KEYS.some((key) => filters[key]);

  return (
    <Container>
      <Header>
        <Title>Orders</Title>
        <BackToDashboard />
      </Header>
      <Filters
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ q: query.trim() });
        }}
      >
        <SearchLabel>
          Order number or email
          <input
            type="search"
            value={query}
            placeholder="e.g. ABCD1234 or jane@"
            onChange={(e) => setQuery(e.target.value)}
          />
        </SearchLabel>
        <Button type="submit">Search</Button>
        <label>
          Show
          <select value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">All orders</option>
            <option value={TO_SHIP}>Waiting to ship</option>
            {ADMIN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => setFilters({ from: e.target.value })}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setFilters({ to: e.target.value })}
          />
        </label>
        {filtered && (
          <Button
            type="button"
            onClick={() => {
              setQuery("");
              setSearchParams({});
            }}
          >
            Clear filters
          </Button>
        )}
      </Filters>
      {error && <ErrorText>{error}</ErrorText>}
      {cancelOutcome && (
        <CancelNotice outcome={cancelOutcome} onDismiss={() => setCancelOutcome(null)} />
      )}
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
                  <td>
                    <OrderLink to={`/admin/orders/${order._id}`}>
                      #{orderNumber(order._id)}
                    </OrderLink>
                  </td>
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
                  <td>
                    {formatMoney(order.subtotal, order.currency)}
                    {order.refundedTotal > 0 && (
                      <div>
                        Refunded {formatMoney(order.refundedTotal, order.currency)}
                      </div>
                    )}
                  </td>
                  <td>{formatAddress(order.shippingAddress)}</td>
                  <td>
                    <OrderStatusControl
                      order={order}
                      onUpdated={handleUpdated}
                      onError={setError}
                    />
                    {order.status === "cancelled" && (
                      <SmallStripeLink
                        href={order.stripeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Payment for order ${orderNumber(order._id)} in Stripe`}
                      >
                        Payment in Stripe ↗
                      </SmallStripeLink>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      )}
      {hasMore && (
        <More>
          <Button type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more orders"}
          </Button>
        </More>
      )}
    </Container>
  );
}

export default AdminOrders;
