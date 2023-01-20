import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;
  display: flex;
`;

const ImageContainer = styled.div`
  flex: 1;
`;

const Image = styled.img`
  width: 100%;
  height: 90vh;
  object-fit: cover;
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;
`;

const Title = styled.h1`
  font-weight: 200;
`;

const Description = styled.p`
  margin: 20px 0px;
`;

const Price = styled.span`
  font-weight: 100;
  font-size: 40px;
`;

function IndividualMenProduct() {
  const [data, setData] = useState("");
  const { params } = useParams();

  const fetchIndividualMenProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/men/${params}`
    );
    console.log(response.data);
    setData(response.data);
  };

  useEffect(() => {
    fetchIndividualMenProduct();
  }, []);

  return (
    <Container>
      <Navbar />
      <Wrapper>
        <ImageContainer>
          <Image
            src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${data?.data?.image}`}
          />
        </ImageContainer>
        <InfoContainer>
          <Title>{data?.data?.title}</Title>
          <Description>{data?.data?.description}</Description>
          <Price>${data?.data?.price}</Price>
        </InfoContainer>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default IndividualMenProduct;
