import styled from "styled-components";

const Container = styled.div`
  /* flex: 1; */
  /* padding: 5px; */
  height: 350px;
  width: 25%;
  display: flex;
  align-items: center;
  justify-content: center;
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
