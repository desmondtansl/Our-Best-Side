import styled from "styled-components";
import { Link } from "react-router-dom";

const MasterContainer = styled.div`
  height: 100%;
  display: flex;
  flex-wrap: wrap;

  @media (max-width: 1024px) {
    display: block;
    height: auto;
  }
`;

const Container = styled.div`
  flex-direction: column;
  height: 100%;

  @media (max-width: 1024px) {
    height: auto;
  }
`;

// On tablets and phones the name and price are black, like the product
// listings.
const StyledLink = styled(Link)`
  height: 100%;

  @media (max-width: 1024px) {
    display: block;
    height: auto;
    color: black;
  }
`;

// On tablets and phones photos fill the card in a 3:4 shape.
const Image = styled.img`
  height: 90%;

  @media (max-width: 1024px) {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
`;

const InfoContainer = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;

  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 8px 0px 0px;
  }
`;

const Text = styled.p`
  font-size: 16px;

  @media (max-width: 1024px) {
    font-size: 14px;
    font-weight: 500;
  }
`;

const Price = styled.p`
  font-size: 16px;

  @media (max-width: 1024px) {
    font-size: 14px;
    font-weight: 500;
  }
`;

function SingleFeaturedProduct({ item }) {
  return (
    <MasterContainer>
      <Container>
        <StyledLink to={item.page} style={{ textDecoration: "none" }}>
          <Image src={item.img} alt={item.text} />
          <InfoContainer>
            <Text>{item.text}</Text>
            <Price>{item.price}</Price>
          </InfoContainer>
        </StyledLink>
      </Container>
    </MasterContainer>
  );
}

export default SingleFeaturedProduct;
