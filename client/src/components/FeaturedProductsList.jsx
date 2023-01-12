import { featuredProducts } from "../assets/featuredProductsPhotos";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  padding: 20px;
  flex-wrap: wrap;
  justify-content: space-between;
`;

function FeaturedProducts() {
  return (
    <Container>
      {featuredProducts.map((item) => {
        <img src={item.img} key={item.id} />;
      })}
    </Container>
  );
}

export default FeaturedProducts;
