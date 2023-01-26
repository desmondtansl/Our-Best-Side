import React from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
`;

const Container = styled.div`
  max-height: 90vh;
  align-items: center;
`;

const Wrapper = styled.div`
  display: flex;
  overflow-y: auto;
  justify-content: center;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 600;
  padding: 20px;
`;

const Description = styled.p`
  font-size: 24px;
  font-weight: 400;
  padding: 20px;
`;

const SpareContainer = styled.div``;

function Success() {
  return (
    <MainContainer>
      <Navbar />
      <Container>
        <Wrapper>
          <Title>Thank you for your purchase!</Title>
          <Description>
            A separate email with shipping information will be sent to you when
            we have shipped the items out.
          </Description>
        </Wrapper>
      </Container>
      <SpareContainer></SpareContainer>
      <Footer />
    </MainContainer>
  );
}

export default Success;
