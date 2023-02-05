import { featuredProducts } from "../assets/featuredProductsPhotos.js";
import styled from "styled-components";
import SingleFeaturedProduct from "./SingleFeaturedProduct.jsx";

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  overflow: hidden;
  /* width: 100%; */
  align-items: center;
  height: 900px;
  margin-top: 30px;
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
