import styled from "styled-components";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import axios from "axios";
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
  align-items: center;
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
    <Container>
      <Navbar />
      <Container2>
        {data.length &&
          data?.map((product) => (
            <Container3 key={product?._id}>
              <NavLink to={`/men/${product?._id}`}>
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

export default MenProducts;
