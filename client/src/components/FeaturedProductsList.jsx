import { featuredProducts } from "../assets/featuredProductsPhotos.js";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  overflow: hidden;
  width: 100%;
  align-items: center;
`;

function FeaturedProducts() {
  return (
    <Container>
      {featuredProducts.map((item) => (
        <SingleFeaturedProduct item={item} key={item.id} />
      ))}
    </Container>
  );
}

export default FeaturedProducts;
