import { featuredProducts } from "../assets/featuredProductsPhotos.js";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";

const Container = styled.div`
  display: flex;
  padding: 20px;
  flex-wrap: wrap;
  justify-content: space-between;
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
