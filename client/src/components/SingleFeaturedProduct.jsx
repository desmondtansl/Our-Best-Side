import styled from "styled-components";
import { Link } from "react-router-dom";

const MasterContainer = styled.div`
  height: 100%;
  display: flex;
  flex-wrap: wrap;
`;

const Container = styled.div`
  flex-direction: column;
  height: 100%;

  @media (max-width: 360px) {
    width: 100%;
  }
`;

const StyledLink = styled(Link)`
  height: 100%;

  @media (max-width: 360px) {
    height: auto;
    width: 50%;
  }
`;

const Image = styled.img`
  height: 90%;

  @media (max-width: 820px) {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 414px) {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 375px) {
    width: 100%;
    height: 100%;
  }

  @media (max-width: 360px) {
    width: 100%;
    height: 100%;
  }
`;

const InfoContainer = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;

  @media only screen and (max-width: 360px) {
    width: 100%;
    text-align: center;
  }
`;

const Text = styled.p`
  font-size: 16px;

  @media only screen and (max-width: 360px) {
    font-size: 13px;
  }
`;

const Price = styled.p`
  font-size: 16px;

  @media only screen and (max-width: 360px) {
    font-size: 13px;
  }
`;

function SingleFeaturedProduct({ item }) {
  return (
    <MasterContainer>
      <Container>
        <StyledLink to={item.page} style={{ textDecoration: "none" }}>
          <Image src={item.img} />
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
