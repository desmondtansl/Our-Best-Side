import styled from "styled-components";

const Container = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  font-size: 50px;
  font-weight: 700;
  padding: 40px 0px 0px 0px;
`;

export default function FeaturedProductsHeader() {
  return <Container>Featured Products</Container>;
}
