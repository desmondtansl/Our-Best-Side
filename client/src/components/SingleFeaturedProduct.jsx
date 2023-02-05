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
`;

const StyledLink = styled(Link)`
  height: 100%;
`;

const Image = styled.img`
  height: 90%;
`;

const InfoContainer = styled.div`
  margin-top: 5px;
  margin-bottom: 5px;
  /* background-color: black; */
`;

const Text = styled.p`
  font-size: 16px;
`;

const Price = styled.p`
  font-size: 16px;
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
