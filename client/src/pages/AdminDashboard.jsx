import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { UserAuth } from "../context/Auth";
import { endSession } from "../utils/session";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { navLink } from "../styles/links";
import { Badge, Button, ErrorText, Muted } from "../components/account/styles";
import { formatDate, formatMoney, orderNumber, errorMessage, STATUS_LABELS } from "../utils/format";

const Container = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 600;
`;

const Menu = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// Black, underlined under a mouse pointer, like the desktop header.
const MenuItem = styled(Link)`
  ${navLink}
  font-size: 16px;
  font-weight: 500;
  padding: 10px 16px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  background-color: #f8f4f4;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 12px;
`;

const Tile = styled.div`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  background-color: #f8f4f4;
`;

const TileLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const BigNumber = styled.div`
  font-size: 28px;
  font-weight: 600;
  margin: 4px 0;
`;

const Panels = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr));
  gap: 16px;
`;

const Panel = styled.section`
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 15px;
  line-height: 1.5;
  /* Panels that need action get a teal edge. */
  border-left: ${(props) => (props.$highlight ? "4px solid teal" : "0.5px solid lightgray")};
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 8px 0;
    border-bottom: 0.5px solid lightgray;
  }

  li:last-child {
    border-bottom: none;
  }
`;

const Stock = styled.span`
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: ${(props) => (props.$soldOut ? "red" : "black")};
`;

const Empty = styled.p`
  font-weight: 300;
  margin: 0;
`;

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/stats`;

// The dashboard links to Manage Orders filtered to these.
export const TO_SHIP_LINK = "/admin/orders?status=paid,processing";

// Low stock rows shown before "and N more".
const LOW_STOCK_SHOWN = 10;

const DAY = 24 * 60 * 60 * 1000;

const placedAgo = (date) => {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

const PERIODS = [
  ["today", "Today"],
  ["week", "Last 7 days"],
  ["month", "Last 30 days"],
];

function SalesTiles({ sales, currency }) {
  return (
    <Tiles>
      {PERIODS.map(([period, label]) => {
        const { revenue, orders, average } = sales[period];
        return (
          <Tile key={period} aria-label={`Sales ${label.toLowerCase()}`}>
            <TileLabel>{label}</TileLabel>
            <BigNumber>{formatMoney(revenue, currency)}</BigNumber>
            <Muted>
              {orders} {orders === 1 ? "order" : "orders"}
              {orders > 0 && ` · average ${formatMoney(average, currency)}`}
            </Muted>
          </Tile>
        );
      })}
    </Tiles>
  );
}

function ToShip({ toShip }) {
  return (
    <Panel $highlight={toShip.count > 0} aria-labelledby="to-ship-title">
      <SectionTitle id="to-ship-title">Waiting to ship</SectionTitle>
      <BigNumber>{toShip.count}</BigNumber>
      {toShip.count > 0 ? (
        <>
          <Muted>
            Paid or processing. The oldest was placed {placedAgo(toShip.oldest)}.
          </Muted>
          <Link to={TO_SHIP_LINK}>View orders waiting to ship</Link>
        </>
      ) : (
        <Empty>Nothing is waiting to ship.</Empty>
      )}
    </Panel>
  );
}

function LowStock({ lowStock }) {
  const { items, threshold } = lowStock;
  const shown = items.slice(0, LOW_STOCK_SHOWN);
  return (
    <Panel $highlight={items.length > 0} aria-labelledby="low-stock-title">
      <SectionTitle id="low-stock-title">Low stock</SectionTitle>
      <Muted>Products and sizes with {threshold} or fewer left.</Muted>
      {items.length === 0 ? (
        <Empty>Nothing is running low.</Empty>
      ) : (
        <List>
          {shown.map((item) => (
            <li key={`${item.productId}-${item.size || ""}`}>
              <span>
                <Link to={`/search/${item.productId}`}>{item.title}</Link>
                {item.size && <Muted>, size {item.size}</Muted>}
              </span>
              <Stock $soldOut={item.inStock <= 0}>
                {item.inStock <= 0 ? "Sold out" : `${item.inStock} left`}
              </Stock>
            </li>
          ))}
        </List>
      )}
      {items.length > shown.length && <Muted>and {items.length - shown.length} more</Muted>}
    </Panel>
  );
}

function BestSellers({ bestSellers, currency }) {
  return (
    <Panel aria-labelledby="best-sellers-title">
      <SectionTitle id="best-sellers-title">Best sellers</SectionTitle>
      <Muted>Units sold in the last 30 days.</Muted>
      {bestSellers.length === 0 ? (
        <Empty>No sales in the last 30 days yet.</Empty>
      ) : (
        <List>
          {bestSellers.map((product, index) => (
            <li key={product.productId || product.title}>
              <span>
                {index + 1}.{" "}
                {product.productId ? (
                  <Link to={`/search/${product.productId}`}>{product.title}</Link>
                ) : (
                  product.title
                )}
              </span>
              <Muted>
                {product.units} sold · {formatMoney(product.revenue, currency)}
              </Muted>
            </li>
          ))}
        </List>
      )}
    </Panel>
  );
}

function RecentOrders({ orders }) {
  return (
    <Panel aria-labelledby="recent-orders-title">
      <SectionTitle id="recent-orders-title">Recent orders</SectionTitle>
      {orders.length === 0 ? (
        <Empty>No orders yet.</Empty>
      ) : (
        <List>
          {orders.map((order) => (
            <li key={order._id}>
              <span>
                <Link to={`/admin/orders/${order._id}`}>#{orderNumber(order._id)}</Link>{" "}
                <Muted>{formatDate(order.createdAt)}</Muted>
                <br />
                <Muted>
                  {order.email || "—"}
                  {!order.user && " (guest)"}
                </Muted>
              </span>
              <span>
                {formatMoney(order.subtotal, order.currency)}{" "}
                <Badge status={order.status}>{STATUS_LABELS[order.status]}</Badge>
              </span>
            </li>
          ))}
        </List>
      )}
      <Link to="/admin/orders">All orders</Link>
    </Panel>
  );
}

function AdminDashboard() {
  useDocumentTitle("Admin Dashboard");
  const [user, setUser] = UserAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(API());
      setStats(response.data.data);
    } catch (err) {
      setError(errorMessage(err, "Could not load the shop summary"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Runs as the Logout link opens the homepage (clicked or Enter pressed).
  const logOut = () => {
    endSession();
    setUser({ data: null, loading: false, error: null });
  };

  return (
    <Container>
      <Header>
        <div>
          <Title>Admin Dashboard</Title>
          <Muted>{user.data?.email}</Muted>
        </div>
        <Button type="button" onClick={fetchStats} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </Header>
      <Menu aria-label="Admin pages">
        <MenuItem to="/upload">Upload New Products</MenuItem>
        <MenuItem to="/search">Products</MenuItem>
        <MenuItem to="/admin/stock">Edit Stock</MenuItem>
        <MenuItem to="/admin/orders">Manage Orders</MenuItem>
        <MenuItem to="/admin/discounts">Discounts</MenuItem>
        {user.data?.isOwner && <MenuItem to="/admin/users">Manage Admins</MenuItem>}
        <MenuItem to="/" onClick={logOut}>
          Logout
        </MenuItem>
      </Menu>
      {error && <ErrorText>{error}</ErrorText>}
      {!stats && loading && <Empty>Loading the shop summary…</Empty>}
      {stats && (
        <>
          <SalesTiles sales={stats.sales} currency={stats.currency} />
          <Panels>
            <ToShip toShip={stats.toShip} />
            <LowStock lowStock={stats.lowStock} />
            <BestSellers bestSellers={stats.bestSellers} currency={stats.currency} />
            <RecentOrders orders={stats.recentOrders} />
          </Panels>
        </>
      )}
    </Container>
  );
}

export default AdminDashboard;
