import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link, useSearchParams } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import WasPrice from "../components/WasPrice";
import {
  StatusBadge,
  STATUS_NAMES,
  setProductStatus,
  confirmArchive,
} from "../components/admin/ProductStatusBar";
import { Button } from "../components/account/styles";
import { productImageUrl, productPath } from "../utils/products";
import { errorMessage } from "../utils/format";
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

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-weight: 600;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 0.5px solid lightgray;
  margin: 16px 0px 10px;
  overflow-x: auto;
`;

const Tab = styled.button`
  border: none;
  background: none;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 15px;
  white-space: nowrap;
  border-bottom: 2px solid ${(props) => (props.$active ? "teal" : "transparent")};
  font-weight: ${(props) => (props.$active ? 600 : 400)};
`;

const Filters = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 10px;

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

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 8px;
    border-bottom: 0.5px solid lightgray;
    vertical-align: middle;
  }
`;

const Thumb = styled.img`
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background-color: #f8f4f4;
`;

const Name = styled(Link)`
  font-weight: 600;
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const ErrorText = styled.p`
  color: red;
`;

const More = styled.div`
  display: flex;
  justify-content: center;
  margin: 16px 0px;
`;

const TABS = ["live", "draft", "archived"];
const TAB_LABELS = { live: "Live", draft: "Drafts", archived: "Archived" };

const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["title", "Name A–Z"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["stock-asc", "Stock: lowest first"],
];

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/products`;

// "S 3 · M 0" for stock per size, or the single number.
export const stockText = (product) => {
  if (product.sizeStock?.length) {
    return product.sizeStock.map((entry) => `${entry.size} ${entry.inStock}`).join(" · ");
  }
  return product.inStock ?? "Not tracked";
};

// Every product for admins: live, drafts and archived, with search and sort.
// The tab, search and sort are kept in the address.
function AdminProducts() {
  useDocumentTitle("Products");
  const [searchParams, setSearchParams] = useSearchParams();
  const status = TABS.includes(searchParams.get("status")) ? searchParams.get("status") : "live";
  const q = searchParams.get("q") || "";
  const sort = searchParams.get("sort") || "newest";
  const [query, setQuery] = useState(q);
  const [products, setProducts] = useState(null);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const setParams = (changes) => {
    const next = { status, q, sort, ...changes };
    setSearchParams(
      Object.fromEntries(
        Object.entries(next).filter(
          ([key, value]) => value && !(key === "status" && value === "live") && !(key === "sort" && value === "newest")
        )
      )
    );
  };

  const fetchPage = (pageNumber) =>
    axios.get(API(), {
      params: { status, ...(q && { q }), sort, ...(pageNumber > 1 && { page: pageNumber }) },
    });

  const load = async () => {
    setError("");
    try {
      const response = await fetchPage(1);
      setProducts(response.data.data);
      setCounts(response.data.counts);
      setHasMore(Boolean(response.data.hasMore));
      setPage(1);
    } catch (err) {
      setError(errorMessage(err, "Could not load products"));
    }
  };

  useEffect(() => {
    setQuery(q);
    load();
  }, [status, q, sort]);

  const loadMore = async () => {
    try {
      const response = await fetchPage(page + 1);
      setProducts((current) => {
        const seen = new Set(current.map((p) => p._id));
        return [...current, ...response.data.data.filter((p) => !seen.has(p._id))];
      });
      setHasMore(Boolean(response.data.hasMore));
      setPage(page + 1);
    } catch (err) {
      setError(errorMessage(err, "Could not load more products"));
    }
  };

  // Moves a product to another tab: it leaves this list.
  const changeStatus = async (product, next) => {
    if (next === "archived" && !confirmArchive(product)) return;
    setError("");
    setBusyId(product._id);
    try {
      await setProductStatus(product, next);
      setProducts((current) => current.filter((p) => p._id !== product._id));
      setCounts((current) => ({
        ...current,
        [status]: current[status] - 1,
        [next]: current[next] + 1,
      }));
    } catch (err) {
      setError(errorMessage(err, "Couldn't change the status"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Container>
      <Header>
        <Title>Products</Title>
        <Actions>
          <Link to="/upload">+ Upload a new product</Link>
          <Link to="/admin/stock">Edit stock</Link>
          <BackToDashboard />
        </Actions>
      </Header>
      <Tabs role="tablist">
        {TABS.map((tab) => (
          <Tab
            key={tab}
            role="tab"
            aria-selected={tab === status}
            $active={tab === status}
            onClick={() => setParams({ status: tab })}
          >
            {TAB_LABELS[tab]}
            {counts && ` (${counts[tab]})`}
          </Tab>
        ))}
      </Tabs>
      <Filters
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: query.trim() });
        }}
      >
        <label>
          Product name
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <Button type="submit">Search</Button>
        <label>
          Sort
          <select value={sort} onChange={(e) => setParams({ sort: e.target.value })}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </Filters>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {products === null && !error && <p>Loading products…</p>}
      {products?.length === 0 && (
        <p>
          {q
            ? `No ${TAB_LABELS[status].toLowerCase()} products match "${q}".`
            : status === "live"
            ? "No products in the shop yet."
            : `No ${TAB_LABELS[status].toLowerCase()} products.`}
        </p>
      )}
      {products?.length > 0 && (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <th aria-label="Photo" />
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const productStatus = product.status || "live";
                const busy = busyId === product._id;
                return (
                  <tr key={product._id}>
                    <td>
                      <Thumb src={productImageUrl(product.image)} alt="" loading="lazy" />
                    </td>
                    <td>
                      <Name to={`/search/${product._id}`}>{product.title}</Name>
                      <div>{product.category?.join(", ")}</div>
                    </td>
                    <td>
                      ${product.price}
                      <WasPrice product={product} />
                    </td>
                    <td>{stockText(product)}</td>
                    <td>
                      <StatusBadge $status={productStatus}>{STATUS_NAMES[productStatus]}</StatusBadge>
                      {product.featured && productStatus === "live" && <div>Featured</div>}
                    </td>
                    <td>
                      <Row>
                        <Link to={`/search/${product._id}`}>Edit</Link>
                        {productStatus === "live" && <Link to={productPath(product)}>View</Link>}
                        {productStatus !== "live" && (
                          <Button
                            primary
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(product, "live")}
                            aria-label={`${productStatus === "draft" ? "Publish" : "Restore"} ${product.title}`}
                          >
                            {productStatus === "draft" ? "Publish" : "Restore"}
                          </Button>
                        )}
                        {productStatus !== "archived" && (
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(product, "archived")}
                            aria-label={`Archive ${product.title}`}
                          >
                            Archive
                          </Button>
                        )}
                      </Row>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>
      )}
      {hasMore && (
        <More>
          <Button type="button" onClick={loadMore}>
            Load more products
          </Button>
        </More>
      )}
    </Container>
  );
}

export default AdminProducts;
