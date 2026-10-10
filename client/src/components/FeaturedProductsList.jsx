import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";
import FeaturedProductsHeader from "./FeaturedProductsHeader.jsx";
import { productImageUrl, productPath } from "../utils/products";

// Computers: 4 per row. Tablets: 3 per row; phones: 2 per row, matching the
// product listings.
const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  overflow: hidden;
  align-items: center;
  height: 900px;
  margin-top: 30px;

  @media (max-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0px, 1fr));
    column-gap: 16px;
    row-gap: 28px;
    height: auto;
    margin: 0px;
    padding: 24px 24px 16px;
  }

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0px, 1fr));
    column-gap: 12px;
    row-gap: 24px;
    padding: 16px 16px 8px;
  }
`;

const ProductContainer = styled.div`
  height: 45%;
  width: 25%;
  justify-content: center;
  display: flex;

  @media (max-width: 1024px) {
    display: block;
    width: auto;
    height: auto;
  }
`;

// Products marked "Featured on homepage" in the admin dashboard.
function FeaturedProducts() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/products/featured`
        );
        setItems(
          response.data.data.map((product) => ({
            id: product._id,
            img: productImageUrl(product.image),
            text: product.title,
            price: `$${product.price}`,
            product,
            page: productPath(product),
          }))
        );
      } catch (error) {
        console.log(error.message);
      }
    };
    fetchFeatured();
  }, []);

  // Hide the whole section (header included) until there is something to show.
  if (items.length === 0) return null;

  return (
    <>
      <FeaturedProductsHeader />
      <Container>
        {items.map((item) => (
          <ProductContainer item={item} key={item.id}>
            <SingleFeaturedProduct item={item} />
          </ProductContainer>
        ))}
      </Container>
    </>
  );
}

export default FeaturedProducts;
