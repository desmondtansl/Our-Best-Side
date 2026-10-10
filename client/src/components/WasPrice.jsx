import styled from "styled-components";

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  font-size: 0.85em;
  font-weight: 400;
  vertical-align: middle;
`;

const Was = styled.del`
  color: gray;
`;

const Badge = styled.span`
  padding: 1px 8px;
  border-radius: 10px;
  border: 1px solid red;
  color: red;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const isOnSale = (product) =>
  Number(product?.compareAtPrice) > Number(product?.price);

// Shown after a product's price while it's on sale: the "was" price crossed
// out and a Sale badge. Nothing when it isn't on sale.
function WasPrice({ product }) {
  if (!isOnSale(product)) return null;
  return (
    <Wrapper>
      <Was aria-label={`was $${product.compareAtPrice}`}>${product.compareAtPrice}</Was>
      <Badge>Sale</Badge>
    </Wrapper>
  );
}

export default WasPrice;
