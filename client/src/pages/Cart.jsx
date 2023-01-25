import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import Stripe from "stripe";

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;
`;

const Title = styled.h1`
  font-weight: 300;
  text-align: center;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
`;

const TopButton = styled.button`
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  border: ${(props) => props.type === "filled" && "none"};
  background-color: ${(props) =>
    props.type === "filled" ? "black" : "transparent"};
  color: ${(props) => props.type === "filled" && "white"};
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Info = styled.div`
  flex: 2;
`;

const Product = styled.div`
  display: flex;
  justify-content: space-between;
`;

const ProductDetails = styled.div`
  display: flex;
  justify-content: space-between;
  flex: 2;
`;

const Details = styled.div`
  display: flex;
  padding: 20px;
  flex-direction: column;
  justify-content: space-around;
`;

const Image = styled.img`
  width: 400px;
`;

const ProductTitle = styled.span``;

const ProductColor = styled.span``;

const ProductSize = styled.span``;

const PriceDetails = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const ProductQtyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const ProductQty = styled.div`
  font-size: 24px;
  margin: 5px;
`;

const ProductPrice = styled.div`
  font-size: 24px;
  font-weight: 200;
`;

const Hr = styled.hr`
  background-color: red;
  border: none;
  height: 1px;
`;

const Summary = styled.div`
  flex: 1;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
  height: 50vh;
`;

const SummaryItem = styled.div`
  margin: 30px 0px;
  display: flex;
  justify-content: space-between;
  font-weight: ${(props) => props.type === "total" && "500"};
  font-size: ${(props) => props.type === "total" && "24px"};
`;

const SummaryTitle = styled.h1`
  font-weight: 200;
`;

const SummaryItemText = styled.span`
  flex: 1;
`;

const SummaryItemPrice = styled.span`
  flex: 1;
`;

const SummaryButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: black;
  color: white;
  cursor: pointer;
  font-weight: 600;
`;

function Cart() {
  const [combinedData, setCombinedData] = useState([]);
  const [body, setBody] = useState();
  const cart = useSelector((state) => state.cart);
  console.log(cart);

  const fetchIndividualCombinedProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/combined`
    );
    setCombinedData(response);
  };

  let quantity = [];
  const handleClick = async () => {
    try {
      const productId = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/checkout/get-product-info`
      );

      const results = (description) => {
        const productInfo = productId.data.data.filter(
          (item) => item.description === description
        );
        return productInfo;
      };

      for (let i = 0; i < cart.products.length; i++) {
        let bodyTransform = results(cart.products[i].description);
        setBody(bodyTransform);
        quantity.push(bodyTransform);
        quantity[i][0].quantity = cart.products[i].quantity;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/checkout/create-checkout-session`,
        quantity
      );
      window.location.assign(response.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchIndividualCombinedProduct();
  }, []);
  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Your Cart</Title>
        <Top>
          <Link to="/">
            <TopButton>Continue Shopping</TopButton>
          </Link>
        </Top>
        <Bottom>
          <Info>
            {cart.products.map((product) => (
              <Product key={product?.id}>
                <ProductDetails>
                  <Image
                    src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${product.image}`}
                  />
                  <Details>
                    <ProductTitle>
                      <b>Product: </b>
                      {product?.title}
                    </ProductTitle>
                    <ProductColor>
                      <b>Color: </b>
                      {product?.color}
                    </ProductColor>
                    <ProductSize>
                      <b>Size: </b>
                      {product?.size}
                    </ProductSize>
                  </Details>
                </ProductDetails>
                <PriceDetails>
                  <ProductQtyContainer>
                    {/* <RemoveIcon /> */}
                    <ProductQty>
                      <b>Qty: </b>
                      {product?.quantity}
                    </ProductQty>
                    {/* <AddIcon /> */}
                  </ProductQtyContainer>
                  <ProductPrice>
                    <b>Price: </b> $ {product?.price * product?.quantity}
                  </ProductPrice>
                </PriceDetails>
              </Product>
            ))}
          </Info>
          <Hr />
          <Summary>
            <SummaryTitle>Order Summary</SummaryTitle>
            <SummaryItem>
              <SummaryItemText>Subtotal</SummaryItemText>
              <SummaryItemPrice>$ {cart.totalPrice}</SummaryItemPrice>
            </SummaryItem>
            <SummaryItem>
              <SummaryItemText>Shipping</SummaryItemText>
              <SummaryItemPrice>Free</SummaryItemPrice>
            </SummaryItem>
            <SummaryItem type="total">
              <SummaryItemText>Total</SummaryItemText>
              <SummaryItemPrice>$ {cart.totalPrice}</SummaryItemPrice>
            </SummaryItem>
            <SummaryButton onClick={handleClick}>Checkout Now</SummaryButton>
          </Summary>
        </Bottom>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default Cart;
