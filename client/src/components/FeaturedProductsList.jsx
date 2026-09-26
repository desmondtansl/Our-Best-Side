import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";
import FeaturedProductsHeader from "./FeaturedProductsHeader.jsx";
import { productImageUrl, productPath } from "../utils/products";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  overflow: hidden;
  align-items: center;
  height: 900px;
  margin-top: 30px;

  @media (max-width: 820px) {
    display: flex;
    margin-top: 20px;
    margin: auto;
    align-items: flex-start;
    height: 100%;
    width: 100%;
    background-size: cover;
    margin: 20px 0px;
    row-gap: 20px;
  }

  @media (max-width: 768px) {
    display: flex;
    margin-top: 20px;
    margin: auto;
    align-items: flex-start;
    height: 100%;
    width: 100%;
    background-size: cover;
    margin: 20px 0px;
    row-gap: 20px;
  }

  @media (max-width: 414px) {
    display: flex;
    margin-top: 20px;
    margin: auto;
    align-items: flex-start;
    height: 100%;
    width: 100%;
    background-size: cover;
    margin: 20px 0px;
    row-gap: 20px;
    column-gap: 60px;
  }

  @media (max-width: 375px) {
    display: flex;
    margin-top: 20px;
    margin: auto;
    align-items: flex-start;
    height: 100%;
    width: 100%;
    background-size: cover;
    margin: 20px 0px;
    row-gap: 20px;
    column-gap: 60px;
  }

  @media (max-width: 360px) {
    display: flex;
    margin-top: 20px;
    margin: auto;
    align-items: flex-start;
    height: 100%;
    width: 100%;
    background-size: cover;
    margin: 20px 0px;
    row-gap: 20px;
    column-gap: 60px;
  }
`;

const ProductContainer = styled.div`
  height: 45%;
  width: 25%;
  justify-content: center;
  display: flex;
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
