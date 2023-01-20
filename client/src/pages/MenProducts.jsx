import styled from "styled-components";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import axios from "axios";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;
  justify-content: space-between;
  padding: 200px;
`;

const Container2 = styled.div`
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
  align-items: center;
  padding: 15px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 20px;
`;

const Price = styled.p`
  align-items: center;
  padding: 15px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 20px;
`;

function MenProducts() {
  const [data, setData] = useState([]);

  const fetchMenProducts = async () => {
    const { data: response } = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/men`
    );
    console.log(response);
    setData(response);
  };

  useEffect(() => {
    fetchMenProducts();
  }, []);

  return (
    <MainContainer>
      <Navbar />
      <Container>
        {data?.map((product) => (
          <Container2 key={product?._id}>
            <NavLink to={`/men/${product?._id}`}>
              <ImageCard
                src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${product.image}`}
              />
            </NavLink>
            <InfoContainer>
              <Text> {product.title}</Text>
              <Price>$ {product.price}</Price>
            </InfoContainer>
          </Container2>
        ))}
      </Container>
      <Footer />
    </MainContainer>
  );
}

export default MenProducts;
