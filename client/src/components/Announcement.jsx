import styled from "styled-components";

const Container = styled.div`
  height: 30px;
  background-color: teal;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  padding: 0px;

  @media (min-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 414px) {
    font-size: 14px;
  }

  @media (max-width: 375px) {
    font-size: 12px;
  }

  @media (max-width: 360px) {
    font-size: 12px;
  }

  @media (max-width: 280px) {
    font-size: 10px;
  }
`;

function Annoucement() {
  return (
    <Container>
      Place your orders by 18th Jan'23 to receive it in time for CNY!
    </Container>
  );
}
export default Annoucement;
