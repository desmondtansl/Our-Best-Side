import { featuredProducts } from "../assets/featuredProductsPhotos";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
`;

function FeaturedProducts() {
  return (
    <Container>
      {featuredProducts.map((id, img) => {
        <img src={img} key={id} />;
      })}
    </Container>
  );
}

export default FeaturedProducts;
