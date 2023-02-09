import styled from "styled-components";

const Container = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  font-size: 50px;
  font-weight: 700;
  padding: 40px 0px 0px 0px;

  @media (max-width: 393px) {
    font-size: 40px;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  @media (max-width: 375px) {
    font-size: 40px;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  @media (max-width: 360px) {
    font-size: 38px;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  @media (max-width: 280px) {
    font-size: 33px;
    justify-content: center;
    align-items: center;
    display: flex;
  }
`;

export default function FeaturedProductsHeader() {
  return <Container>Featured Products</Container>;
}
