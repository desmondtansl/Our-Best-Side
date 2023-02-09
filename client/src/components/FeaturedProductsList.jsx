import { featuredProducts } from "../assets/featuredProductsPhotos.js";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";

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

function FeaturedProducts() {
  return (
    <Container>
      {featuredProducts.map((item) => (
        <ProductContainer item={item} key={item.id}>
          <SingleFeaturedProduct item={item} />
        </ProductContainer>
      ))}
    </Container>
  );
}

export default FeaturedProducts;
