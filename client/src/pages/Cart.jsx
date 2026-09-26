import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { resetCart } from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";
import { errorMessage } from "../utils/format";
import { redirectTo } from "../utils/redirect";

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

const ShipTo = styled.div`
  margin: 20px 0px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
`;

const ShipToSelect = styled.select`
  padding: 8px;
  max-width: 100%;
`;

const CheckoutError = styled.p`
  color: red;
  font-size: 14px;
`;

const addressLabel = (address) =>
  [
    address.label,
    `${address.fullName}, ${address.line1}`,
    `${address.city} ${address.postalCode}`,
  ]
    .filter(Boolean)
    .join(" · ");

function Cart() {
  const dispatch = useDispatch();
  const cart = useSelector((state) => state.cart);
  const [user] = UserAuth();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    if (!user.data) {
      setAddresses([]);
      setAddressId("");
      return;
    }
    const fetchAddresses = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/account/addresses`
        );
        const saved = response.data.data;
        setAddresses(saved);
        setAddressId(saved.find((a) => a.isDefault)?._id || "");
      } catch (error) {
        console.log(error.message);
      }
    };
    fetchAddresses();
  }, [user.data]);

  const handleClick = async () => {
    setCheckoutError("");
    setCheckingOut(true);
    try {
      // Only ids and choices are sent; the server looks up current prices.
      const items = cart.products.map((product) => ({
        productId: product._id,
        quantity: product.quantity,
        size: product.size,
        color: product.color,
      }));
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/checkout/create-checkout-session`,
        { items, ...(addressId && { addressId }) }
      );
      redirectTo(response.data.data);
    } catch (err) {
      console.log(err);
      setCheckoutError(errorMessage(err, "Checkout failed, please try again"));
      setCheckingOut(false);
    }
  };
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
            {cart.products.map((product, index) => (
              <Product
                key={`${product?._id}-${product?.size}-${product?.color}-${index}`}
              >
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
            {user.data ? (
              <ShipTo>
                <label htmlFor="ship-to">Ship to</label>
                <ShipToSelect
                  id="ship-to"
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                >
                  <option value="">Enter address at checkout</option>
                  {addresses.map((address) => (
                    <option key={address._id} value={address._id}>
                      {addressLabel(address)}
                    </option>
                  ))}
                </ShipToSelect>
                <Link to="/account?tab=addresses">Manage addresses</Link>
              </ShipTo>
            ) : (
              <ShipTo>
                <span>
                  <Link to="/login">Log in</Link> to use saved addresses and
                  track your orders.
                </span>
              </ShipTo>
            )}
            {checkoutError && <CheckoutError>{checkoutError}</CheckoutError>}
            <SummaryButton
              onClick={handleClick}
              disabled={checkingOut || cart.products.length === 0}
            >
              {checkingOut ? "Redirecting to payment…" : "Checkout Now"}
            </SummaryButton>
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
