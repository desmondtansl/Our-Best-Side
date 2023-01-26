import styled from "styled-components";
import axios from "axios";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const Container = styled.div``;

const Container2 = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;
  justify-content: space-between;
  padding: 200px;
`;

const Container3 = styled.div`
  display: flex;
  flex-direction: column;
  width: 30%;
  padding: 10px;
  justify-content: center;
`;

const ImageCard = styled.img`
  display: flex;
  width: 80%;
  cursor: pointer;
`;

const InfoContainer = styled.div`
  display: flex;
`;

const Text = styled.p`
  align-items: left;
  padding: 5px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 16px;
`;

const Price = styled.p`
  align-items: center;
  padding: 5px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 16px;
`;

function LadiesProducts() {
  const [data, setData] = useState([]);

  const fetchLadiesProducts = async () => {
    const { data: response } = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/ladies`
    );
    console.log(response);
    setData(response);
  };

  useEffect(() => {
    fetchLadiesProducts();
  }, []);

  return (
    <Container>
      <Navbar />
      <Container2>
        {data?.map((product) => (
          <Container3 key={product?._id}>
            <NavLink to={`/ladies/${product?._id}`}>
              <ImageCard
                src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${product.image}`}
              />
            </NavLink>
            <InfoContainer>
              <Text> {product.title}</Text>
              <Price>$ {product.price}</Price>
            </InfoContainer>
          </Container3>
        ))}
      </Container2>
      <Footer />
    </Container>
  );
}

export default LadiesProducts;
