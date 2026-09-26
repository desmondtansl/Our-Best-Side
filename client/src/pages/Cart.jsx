import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  changeQuantity,
  maxQuantity,
  removeProduct,
  resetCart,
} from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";
import { errorMessage, formatMoney } from "../utils/format";
import { redirectTo } from "../utils/redirect";
import { productImageUrl } from "../utils/products";

// Full-height column so the footer sits at the bottom even when the cart is short.
const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Wrapper = styled.div`
  flex: 1;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 12px;
  }
`;

const Title = styled.h1`
  font-weight: 300;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;

  @media (max-width: 768px) {
    padding: 10px 0px;
  }
`;

const TopButton = styled.button`
  padding: 10px;
  cursor: pointer;
`;

const Bottom = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 30px;
  padding: 0px 20px;

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0px;
  }
`;

const Info = styled.div`
  flex: 2;
  width: 100%;
`;

// One cart line: photo | details | quantity | price, vertically centred.
const Product = styled.div`
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) auto 110px;
  align-items: center;
  column-gap: 24px;
  padding: 20px 0px;
  border-bottom: 0.5px solid lightgray;

  &:first-child {
    padding-top: 0px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 100px minmax(0, 1fr) auto;
    grid-template-areas:
      "image details details"
      "image qty price";
    column-gap: 14px;
    row-gap: 10px;
  }
`;

const Image = styled.img`
  width: 140px;
  height: 175px;
  object-fit: cover;

  @media (max-width: 768px) {
    grid-area: image;
    width: 100px;
    height: 125px;
    align-self: start;
  }
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  @media (max-width: 768px) {
    grid-area: details;
  }
`;

const ProductTitle = styled.span`
  font-size: 18px;
  font-weight: 500;
`;

const ProductAttribute = styled.span`
  font-size: 14px;
  font-weight: 300;

  b {
    font-weight: 500;
  }
`;

const UnitPrice = styled.span`
  font-size: 14px;
  font-weight: 300;
`;

// Same style as the red "Delete" links on the account page.
const RemoveButton = styled.button`
  align-self: flex-start;
  margin-top: 4px;
  padding: 0px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: red;
  text-decoration: underline;
`;

const QtyControl = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  @media (max-width: 768px) {
    grid-area: qty;
  }
`;

const QtyButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0px;
  border: none;
  background: none;
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.3;
  }
`;

// Same look as the quantity box on the product page.
const Amount = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid teal;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const LinePrice = styled.div`
  font-size: 22px;
  font-weight: 200;
  text-align: right;

  @media (max-width: 768px) {
    grid-area: price;
    font-size: 18px;
  }
`;

const Empty = styled.div`
  padding: 20px 0px;
  font-size: 18px;
  font-weight: 300;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Summary = styled.div`
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  border: 0.5px solid lightgray;
  border-radius: 10px;
  padding: 20px;
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
`;

const SummaryTitle = styled.h1`
  font-weight: 200;
`;

const SummaryItemText = styled.span`
  flex: 1;
`;

const SummaryItemPrice = styled.span`
  flex: 1;
  text-align: right;
`;

const SummaryButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: black;
  color: white;
  cursor: pointer;
  font-weight: 600;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

const SummaryButton2 = styled.button`
  width: 100%;
  padding: 10px;
  background-color: red;
  color: black;
  cursor: pointer;
  font-weight: 600;
  margin-top: 10px;
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

  const updateQuantity = (index, delta) => {
    setCheckoutError("");
    dispatch(changeQuantity({ index, delta }));
  };

  const removeItem = (index) => {
    setCheckoutError("");
    dispatch(removeProduct({ index }));
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
            {cart.products.length === 0 && (
              <Empty>
                <span>Your cart is empty.</span>
                <Link to="/">Start shopping</Link>
              </Empty>
            )}
            {cart.products.map((product, index) => (
              <Product
                key={`${product?._id}-${product?.size}-${product?.color}-${index}`}
                data-testid="cart-item"
              >
                <Image src={productImageUrl(product.image)} alt={product.title} />
                <Details>
                  <ProductTitle>{product.title}</ProductTitle>
                  {product.color && (
                    <ProductAttribute>
                      <b>Color:</b> {product.color}
                    </ProductAttribute>
                  )}
                  {product.size && (
                    <ProductAttribute>
                      <b>Size:</b> {product.size}
                    </ProductAttribute>
                  )}
                  <UnitPrice>{formatMoney(product.price)} each</UnitPrice>
                  <RemoveButton
                    type="button"
                    aria-label={`Remove ${product.title} from cart`}
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </RemoveButton>
                </Details>
                <QtyControl>
                  <QtyButton
                    type="button"
                    aria-label={`Decrease quantity of ${product.title}`}
                    disabled={product.quantity <= 1}
                    onClick={() => updateQuantity(index, -1)}
                  >
                    <RemoveIcon />
                  </QtyButton>
                  <Amount aria-label={`Quantity of ${product.title}`}>
                    {product.quantity}
                  </Amount>
                  <QtyButton
                    type="button"
                    aria-label={`Increase quantity of ${product.title}`}
                    disabled={product.quantity >= maxQuantity(product)}
                    onClick={() => updateQuantity(index, 1)}
                  >
                    <AddIcon />
                  </QtyButton>
                </QtyControl>
                <LinePrice>{formatMoney(product.price * product.quantity)}</LinePrice>
              </Product>
            ))}
          </Info>
          <Summary>
            <SummaryTitle>Order Summary</SummaryTitle>
            <SummaryItem>
              <SummaryItemText>Subtotal</SummaryItemText>
              <SummaryItemPrice>{formatMoney(cart.totalPrice)}</SummaryItemPrice>
            </SummaryItem>
            <SummaryItem>
              <SummaryItemText>Shipping</SummaryItemText>
              <SummaryItemPrice>Free</SummaryItemPrice>
            </SummaryItem>
            <SummaryItem type="total">
              <SummaryItemText>Total</SummaryItemText>
              <SummaryItemPrice data-testid="cart-total">
                {formatMoney(cart.totalPrice)}
              </SummaryItemPrice>
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
            {cart.products.length > 0 && (
              <SummaryButton2 onClick={() => dispatch(resetCart())}>
                Reset Cart
              </SummaryButton2>
            )}
          </Summary>
        </Bottom>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default Cart;
