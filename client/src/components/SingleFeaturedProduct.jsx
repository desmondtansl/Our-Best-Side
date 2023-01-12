import styled from "styled-components";

const Container = styled.div`
  flex: 1;
  margin: 5px;
  min-width: 280px;
  height: 350px;
`;

const Image = styled.img`
  height: 75%;
`;

function SingleFeaturedProduct({ item }) {
  return (
    <Container>
      <Image src={item.img} />
    </Container>
  );
}

export default SingleFeaturedProduct;
