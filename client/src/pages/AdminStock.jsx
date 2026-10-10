import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import { Button } from "../components/account/styles";
import { errorMessage } from "../utils/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  padding: 20px;
  font-size: 14px;
  padding-bottom: 90px;
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

const Intro = styled.p`
  font-weight: 300;
  max-width: 700px;
`;

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
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

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Item = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 10px 0px;
  border-bottom: 0.5px solid lightgray;
  background-color: ${(props) => (props.$changed ? "#f8f4f4" : "transparent")};
`;

const Boxes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Box = styled.label`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;

  input {
    width: 64px;
    padding: 6px;
    border: 1px solid ${(props) => (props.$changed ? "teal" : "lightgray")};
    border-radius: 6px;
  }
`;

// Stays at the bottom of the screen, so Save is always in reach.
const SaveBar = styled.div`
  position: fixed;
  left: 0px;
  right: 0px;
  bottom: 0px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 20px;
  background-color: white;
  border-top: 0.5px solid lightgray;
  box-shadow: 0px -4px 12px rgba(0, 0, 0, 0.06);
`;

const Message = styled.p`
  margin: 0px;
  color: ${(props) => (props.$error ? "red" : "teal")};
  font-weight: 600;
`;

const API = () => `${import.meta.env.VITE_BASE_URL}/admin/products`;
const MAX_PAGES = 10;

// The stock boxes' starting values: { S: "3" } per size, or { "": "5" }.
const initialValues = (product) =>
  product.sizeStock?.length
    ? Object.fromEntries(product.sizeStock.map((entry) => [entry.size, String(entry.inStock)]))
    : { "": product.inStock === undefined || product.inStock === null ? "" : String(product.inStock) };

// Stock for many products on one screen, e.g. after a delivery or a stock
// count. Only the products that were changed are saved.
function AdminStock() {
  useDocumentTitle("Edit Stock");
  const [status, setStatus] = useState("live");
  const [filter, setFilter] = useState("");
  const [products, setProducts] = useState(null);
  // Edited values by product id: { [id]: { S: "4" } }.
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setMessage(null);
    try {
      const all = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await axios.get(API(), {
          params: { status, sort: "title", ...(page > 1 && { page }) },
        });
        all.push(...response.data.data);
        if (!response.data.hasMore) break;
      }
      setProducts(all);
      setEdits({});
    } catch (err) {
      setMessage({ error: true, text: errorMessage(err, "Could not load products") });
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const valueOf = (product, key) => edits[product._id]?.[key] ?? initialValues(product)[key];

  const isChanged = (product) =>
    Object.entries(edits[product._id] || {}).some(
      ([key, value]) => value !== initialValues(product)[key]
    );

  const changed = (products || []).filter(isChanged);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const changes = changed.map((product) => {
        const values = { ...initialValues(product), ...edits[product._id] };
        return product.sizeStock?.length
          ? { id: product._id, updatedAt: product.updatedAt, sizeStock: values }
          : { id: product._id, updatedAt: product.updatedAt, inStock: values[""] };
      });
      const response = await axios.put(`${API()}/stock`, { changes });
      const { saved, conflicts } = response.data.data;
      await load();
      setMessage(
        conflicts.length
          ? {
              error: true,
              text: `Saved ${saved.length}. Not saved, because they changed while you were editing (an order may have come in): ${conflicts
                .map((c) => c.title)
                .join(", ")}. Their current stock is shown now; check them and save again.`,
            }
          : { text: `Saved stock for ${saved.length} ${saved.length === 1 ? "product" : "products"}.` }
      );
    } catch (err) {
      setMessage({ error: true, text: errorMessage(err, "Could not save the stock") });
    } finally {
      setSaving(false);
    }
  };

  const shown = (products || []).filter((product) =>
    product.title?.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <Container>
      <Header>
        <Title>Edit Stock</Title>
        <div>
          <Link to="/search">← All products</Link> <BackToDashboard />
        </div>
      </Header>
      <Intro>
        Change the numbers, then press <b>Save</b>. Only the products you change are saved.
      </Intro>
      <Filters>
        <label>
          Show
          <select
            value={status}
            onChange={(e) => {
              if (changed.length && !window.confirm("Discard your unsaved changes?")) return;
              setStatus(e.target.value);
            }}
          >
            <option value="live">Live products</option>
            <option value="draft">Drafts</option>
          </select>
        </label>
        <label>
          Find a product
          <input type="search" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
      </Filters>
      {products === null && !message && <p>Loading products…</p>}
      {products?.length === 0 && <p>No products here.</p>}
      <List>
        {shown.map((product) => {
          const keys = Object.keys(initialValues(product));
          return (
            <Item key={product._id} $changed={isChanged(product)} data-testid="stock-row">
              <Link to={`/search/${product._id}`}>{product.title}</Link>
              <Boxes>
                {keys.map((key) => {
                  const value = valueOf(product, key);
                  return (
                    <Box key={key} $changed={value !== initialValues(product)[key]}>
                      {key || "Stock"}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        aria-label={key ? `${product.title}, size ${key}` : `${product.title} stock`}
                        value={value}
                        onChange={(e) => {
                          setMessage(null);
                          setEdits((current) => ({
                            ...current,
                            [product._id]: { ...current[product._id], [key]: e.target.value },
                          }));
                        }}
                      />
                    </Box>
                  );
                })}
              </Boxes>
            </Item>
          );
        })}
      </List>
      <SaveBar>
        {message ? (
          <Message role={message.error ? "alert" : "status"} $error={message.error}>
            {message.text}
          </Message>
        ) : (
          <span>
            {changed.length
              ? `${changed.length} ${changed.length === 1 ? "product" : "products"} changed`
              : "No changes yet"}
          </span>
        )}
        <Button primary type="button" disabled={!changed.length || saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </SaveBar>
    </Container>
  );
}

export default AdminStock;
