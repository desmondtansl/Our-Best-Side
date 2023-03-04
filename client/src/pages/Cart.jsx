import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { resetCart } from "../redux/cartRedux";

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;

  @media (max-width: 768px) {
    padding: 16px;
  }

  @media (max-width: 540px) {
    padding: 12px;
  }

  @media (max-width: 414px) {
    padding: 10px;
  }

  @media (max-width: 390px) {
    padding: 10px;
  }

  @media (max-width: 375px) {
    padding: 10px;
  }

  @media (max-width: 360px) {
    padding: 10px;
  }

  @media (max-width: 280px) {
    padding: 10px;
  }
`;

const Title = styled.h1`
  font-weight: 300;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 24px;
  }

  @media (max-width: 540px) {
    font-size: 18px;
  }

  @media (max-width: 414px) {
    font-size: 16px;
  }

  @media (max-width: 390px) {
    font-size: 16px;
  }

  @media (max-width: 375px) {
    font-size: 16px;
  }

  @media (max-width: 360px) {
    font-size: 16px;
  }

  @media (max-width: 280px) {
    font-size: 16px;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 540px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 414px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 390px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 375px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 360px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 280px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const TopButton = styled.button`
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  border: ${(props) => props.type === "filled" && "none"};
  background-color: ${(props) =>
    props.type === "filled" ? "black" : "transparent"};
  color: ${(props) => props.type === "filled" && "white"};

  @media (max-width: 768px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 540px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 414px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 390px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 375px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 360px) {
    width: 100%;
    margin-top: 10px;
  }

  @media (max-width: 280px) {
    width: 100%;
    margin-top: 10px;
  }
`;

const Bottom = styled.div`
  display: flex;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  @media (max-width: 540px) {
    flex-direction: column;
  }

  @media (max-width: 414px) {
    flex-direction: column;
  }

  @media (max-width: 390px) {
    flex-direction: column;
  }

  @media (max-width: 375px) {
    flex-direction: column;
  }

  @media (max-width: 360px) {
    flex-direction: column;
  }

  @media (max-width: 280px) {
    flex-direction: column;
  }
`;

const Info = styled.div`
  flex: 2;

  @media (max-width: 768px) {
    width: 100%;
  }

  @media (max-width: 540px) {
    width: 100%;
  }

  @media (max-width: 414px) {
    width: 100%;
  }

  @media (max-width: 390px) {
    width: 100%;
  }

  @media (max-width: 375px) {
    width: 100%;
  }

  @media (max-width: 360px) {
    width: 100%;
  }

  @media (max-width: 280px) {
    width: 100%;
  }
`;

const Product = styled.div`
  display: flex;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;
  }

  @media (max-width: 540px) {
    flex-direction: column;
  }

  @media (max-width: 414px) {
    flex-direction: column;
  }

  @media (max-width: 390px) {
    flex-direction: column;
  }

  @media (max-width: 375px) {
    flex-direction: column;
  }

  @media (max-width: 360px) {
    flex-direction: column;
  }

  @media (max-width: 280px) {
    flex-direction: column;
  }
`;

const ProductDetails = styled.div`
  display: flex;
  justify-content: start;
  flex: 2;
  margin: 20px;

  @media (max-width: 768px) {
    width: 100%;
    margin: 14px 0;
  }

  @media (max-width: 540px) {
    width: 100%;
    margin: 10px 0;
  }

  @media (max-width: 414px) {
    width: 100%;
    margin: 10px 0;
  }

  @media (max-width: 390px) {
    width: 100%;
    margin: 10px 0;
  }

  @media (max-width: 375px) {
    width: 100%;
    margin: 10px 0;
  }

  @media (max-width: 360px) {
    width: 100%;
    margin: 10px 0;
  }

  @media (max-width: 280px) {
    width: 100%;
    margin: 10px 0;
  }
`;

const Details = styled.div`
  display: flex;
  padding: 20px;
  flex-direction: column;
  justify-content: space-around;

  @media (max-width: 768px) {
    padding: 14px;
  }

  @media (max-width: 540px) {
    padding: 12px;
  }

  @media (max-width: 414px) {
    padding: 10px;
  }

  @media (max-width: 390px) {
    padding: 10px;
  }

  @media (max-width: 375px) {
    padding: 10px;
  }

  @media (max-width: 360px) {
    padding: 10px;
  }

  @media (max-width: 280px) {
    padding: 10px;
  }
`;

const Image = styled.img`
  width: 400px;

  @media (max-width: 768px) {
    width: 320px;
  }

  @media (max-width: 540px) {
    width: 250px;
  }

  @media (max-width: 414px) {
    width: 200px;
  }

  @media (max-width: 390px) {
    width: 200px;
  }

  @media (max-width: 375px) {
    width: 200px;
  }

  @media (max-width: 360px) {
    width: 200px;
  }

  @media (max-width: 280px) {
    width: 200px;
  }
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
  margin-right: 150px;

  @media (max-width: 768px) {
    margin-right: 0;
  }

  @media (max-width: 540px) {
    margin-right: 0;
  }

  @media (max-width: 414px) {
    margin-right: 0;
  }

  @media (max-width: 390px) {
    margin-right: 0;
  }

  @media (max-width: 375px) {
    margin-right: 0;
  }

  @media (max-width: 360px) {
    margin-right: 0;
  }

  @media (max-width: 280px) {
    margin-right: 0;
  }
`;

const ProductQtyContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
`;

const ProductQty = styled.div`
  font-size: 24px;
  margin: 5px;

  @media (max-width: 768px) {
    font-size: 22px;
    margin: 3px;
  }

  @media (max-width: 540px) {
    font-size: 20px;
    margin: 2px;
  }

  @media (max-width: 414px) {
    font-size: 18px;
    margin: 2px;
  }

  @media (max-width: 390px) {
    font-size: 18px;
    margin: 2px;
  }

  @media (max-width: 375px) {
    font-size: 18px;
    margin: 2px;
  }

  @media (max-width: 360px) {
    font-size: 18px;
    margin: 2px;
  }

  @media (max-width: 280px) {
    font-size: 18px;
    margin: 2px;
  }
`;

const ProductPrice = styled.div`
  font-size: 24px;
  font-weight: 200;

  @media (max-width: 768px) {
    font-size: 22px;
  }

  @media (max-width: 540px) {
    font-size: 20px;
  }

  @media (max-width: 414px) {
    font-size: 18px;
  }

  @media (max-width: 390px) {
    font-size: 18px;
  }

  @media (max-width: 375px) {
    font-size: 18px;
  }

  @media (max-width: 360px) {
    font-size: 18px;
  }

  @media (max-width: 280px) {
    font-size: 18px;
  }
`;

const Hr = styled.hr`
  border: none;
  height: 1px;
`;

const Summary = styled.div`
  flex: 1;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
  height: 50vh;

  @media (max-width: 768px) {
    height: auto;
  }

  @media (max-width: 540px) {
    height: auto;
  }

  @media (max-width: 414px) {
    height: auto;
  }

  @media (max-width: 390px) {
    height: auto;
  }

  @media (max-width: 375px) {
    height: auto;
  }

  @media (max-width: 360px) {
    height: auto;
  }

  @media (max-width: 280px) {
    height: auto;
  }
`;

const SummaryItem = styled.div`
  margin: 30px 0px;
  display: flex;
  justify-content: space-between;
  font-weight: ${(props) => props.type === "total" && "500"};
  font-size: ${(props) => props.type === "total" && "24px"};

  @media (max-width: 768px) {
    font-size: ${(props) => props.type === "total" && "22px"};
  }

  @media (max-width: 540px) {
    font-size: ${(props) => props.type === "total" && "20px"};
  }

  @media (max-width: 414px) {
    font-size: ${(props) => props.type === "total" && "18px"};
  }

  @media (max-width: 390px) {
    font-size: ${(props) => props.type === "total" && "18px"};
  }

  @media (max-width: 375px) {
    font-size: ${(props) => props.type === "total" && "18px"};
  }

  @media (max-width: 360px) {
    font-size: ${(props) => props.type === "total" && "18px"};
  }

  @media (max-width: 280px) {
    font-size: ${(props) => props.type === "total" && "18px"};
  }
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

  @media (max-width: 768px) {
    font-size: 20px;
  }

  @media (max-width: 540px) {
    font-size: 18px;
  }

  @media (max-width: 414px) {
    font-size: 18px;
  }

  @media (max-width: 390px) {
    font-size: 18px;
  }

  @media (max-width: 375px) {
    font-size: 18px;
  }

  @media (max-width: 360px) {
    font-size: 18px;
  }

  @media (max-width: 280px) {
    font-size: 18px;
  }
`;

const SummaryButton2 = styled.button`
  width: 100%;
  padding: 10px;
  background-color: red;
  color: black;
  cursor: pointer;
  font-weight: 600;
  margin-top: 350px;

  @media (max-width: 768px) {
    font-size: 20px;
  }

  @media (max-width: 540px) {
    font-size: 18px;
  }

  @media (max-width: 414px) {
    font-size: 18px;
  }

  @media (max-width: 390px) {
    font-size: 18px;
  }

  @media (max-width: 375px) {
    font-size: 18px;
  }

  @media (max-width: 360px) {
    font-size: 18px;
  }

  @media (max-width: 280px) {
    font-size: 18px;
  }
`;

function Cart() {
  const [combinedData, setCombinedData] = useState([]);
  const [body, setBody] = useState();
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  console.log(cart);

  const fetchIndividualCombinedProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/combined`
    );
    setCombinedData(response);
  };

  const handleClick = async () => {
    try {
      const productId = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/checkout/get-product-info`
      );

      const results = (description) => {
        const productInfo = productId.data.data.find(
          (item) => item.description === description
        );
        return productInfo;
      };

      let checkoutCart = [];
      for (let i = 0; i < cart.products.length; i++) {
        checkoutCart.push({});
      }

      for (let i = 0; i < cart.products.length; i++) {
        checkoutCart[i].priceId = results(cart.products[i].description);
        checkoutCart[i].quantity = cart.products[i].quantity;
        checkoutCart[i].price = cart.products[i].price;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/checkout/create-checkout-session`,
        checkoutCart
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
                    <ProductQty>
                      <b>Qty: </b>
                      {product?.quantity}
                    </ProductQty>
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
            <SummaryButton2 onClick={() => dispatch(resetCart())}>
              Reset Cart
            </SummaryButton2>
          </Summary>
        </Bottom>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default Cart;
