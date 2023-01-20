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
  /* width: 100vw; */
  height: 100%;
  justify-content: space-between;
  padding: 200px;
  /* background-color: lightblue; */
`;

const Container2 = styled.div`
  display: flex;
  flex-direction: column;
  width: 30%;
  /* background-color: red; */
  padding: 10px;
  justify-content: center;
`;

const ImageCard = styled.img`
  display: flex;
  /* height: 100%; */
  width: 80%;
  /* padding: 40px; */
  cursor: pointer;
  /* overflow: hidden;
  height: 100%; */
  background-color: black;
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
  // console.log(data);

  useEffect(() => {
    fetchMenProducts();
  }, []);

  return (
    <MainContainer>
      <Navbar />
      <Container>
        {/* <Navbar /> */}
        {data?.map((product) => (
          <Container2>
            <NavLink to={`/men/${product?._id}`}>
              <ImageCard
                key={product.id}
                src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${product.image}`}
              />
            </NavLink>
            <InfoContainer>
              <Text>{product.title}</Text>
              <Price>$ {product.price}</Price>
            </InfoContainer>
          </Container2>
        ))}
        {/* <Footer /> */}
      </Container>
      <Footer />
    </MainContainer>
  );
}

export default MenProducts;
