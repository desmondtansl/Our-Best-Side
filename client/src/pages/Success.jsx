import React from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Container = styled.div``;

const Wrapper = styled.div``;

function Success() {
  return (
    <Container>
      <Navbar />
      <Wrapper>Success</Wrapper>
      <Footer />
    </Container>
  );
}

export default Success;
