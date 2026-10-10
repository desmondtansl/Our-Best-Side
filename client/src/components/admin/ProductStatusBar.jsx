import { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Button } from "../account/styles";
import { errorMessage } from "../../utils/format";
import { productPath } from "../../utils/products";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 10px 0px;
  padding: 12px 16px;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  background-color: #f8f4f4;
  font-size: 14px;
`;

export const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background-color: white;
  border: 1px solid
    ${(props) => (props.$status === "archived" ? "gray" : props.$status === "draft" ? "#c08a00" : "teal")};
  color: ${(props) => (props.$status === "archived" ? "gray" : "black")};
`;

export const STATUS_NAMES = { live: "Live", draft: "Draft", archived: "Archived" };

const DESCRIPTIONS = {
  live: "In the shop.",
  draft: "Only admins can see it.",
  archived: "Hidden from the shop. Past orders still show it.",
};

const ErrorText = styled.span`
  color: red;
`;

export const setProductStatus = async (product, status) =>
  (
    await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/products/${product._id}/status`, {
      status,
    })
  ).data.data;

// Archiving asks first; it's easy to undo (Restore), but takes the product
// out of the shop straight away.
export const confirmArchive = (product) =>
  window.confirm(
    `Archive "${product.title}"? It leaves the shop straight away, but past orders still show it. You can restore it at any time.`
  );

// A product's status, with Publish, Archive and Restore.
function ProductStatusBar({ product, onChanged }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const status = product.status || "live";

  const change = async (next) => {
    if (next === "archived" && !confirmArchive(product)) return;
    setError("");
    setSaving(true);
    try {
      onChanged(await setProductStatus(product, next));
    } catch (err) {
      setError(errorMessage(err, "Couldn't change the status"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Bar aria-label="Product status">
      <StatusBadge $status={status}>{STATUS_NAMES[status]}</StatusBadge>
      <span>{DESCRIPTIONS[status]}</span>
      {status === "live" && <Link to={productPath(product)}>View in shop</Link>}
      {status !== "live" && (
        <Button primary type="button" disabled={saving} onClick={() => change("live")}>
          {status === "draft" ? "Publish" : "Restore to the shop"}
        </Button>
      )}
      {status !== "archived" && (
        <Button type="button" disabled={saving} onClick={() => change("archived")}>
          Archive
        </Button>
      )}
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Bar>
  );
}

export default ProductStatusBar;
