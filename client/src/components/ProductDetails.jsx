import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import Footer from "./Footer";
import Navbar from "./Navbar";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { addProduct } from "../redux/cartRedux";
import { useDispatch } from "react-redux";
import {
  toOptions,
  productPhotos,
  tracksSizeStock,
  sizeStockFor,
} from "../utils/products";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import { DELIVERY, RETURNS, LOW_STOCK_THRESHOLD } from "../config/store";
import useDocumentTitle from "../hooks/useDocumentTitle";
import RelatedProducts from "./RelatedProducts";
import ProductGallery from "./ProductGallery";
import SizeGuide from "./SizeGuide";
import WasPrice from "./WasPrice";

// Product page shared by /men/:params and /ladies/:params.

const Container = styled.div``;

// Photo and details side by side; stacked on phones.
const Wrapper = styled.div`
  padding: 20px;
  display: flex;

  @media (max-width: 1024px) {
    padding: 10px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0px;
  }
`;

const ImageContainer = styled.div`
  flex: 1;
  min-width: 0px;

  @media (max-width: 768px) {
    flex: none;
  }
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;

  @media (max-width: 1024px) {
    padding: 0px 20px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px 8px;
  }
`;

const Title = styled.h1`
  font-weight: 200;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 26px;
    font-weight: 300;
  }
`;

const Description = styled.p`
  margin: 20px 0px;
  font-size: 20px;

  @media (max-width: 768px) {
    margin: 8px 0px 12px;
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
  }
`;

const Price = styled.span`
  font-weight: 100;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 24px;
    font-weight: 300;
  }
`;

// Colour and size side by side; stacked on phones.
const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 40px;
  margin: 20px 0px;

  @media (max-width: 1024px) {
    width: 100%;
    flex-wrap: wrap;
    gap: 10px;
    margin: 10px 0px;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin: 16px 0px;
  }
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
`;

const FilterTitle = styled.span`
  font-size: 20px;
  font-weight: 200;

  @media (max-width: 768px) {
    font-size: 16px;
    font-weight: 400;
  }
`;

const FilterColor = styled.button`
  justify-content: center;
  align-items: center;
  min-width: 50px;
  margin-left: 10px;
  padding: 5px;
  border: 2px solid teal;
  background: ${(props) => (props.selected ? "#f8f4f4" : "white")};
  font-weight: ${(props) => (props.selected ? 600 : 400)};
  cursor: pointer;
  &:hover {
    background-color: #f8f4f4;
  }

  @media (max-width: 768px) {
    min-height: 40px;
    padding: 6px 12px;
    font-size: 14px;
  }
`;

const FilterSize = styled.select`
  margin-left: 10px;
  padding: 5px;
  width: 70px;

  @media (max-width: 768px) {
    width: auto;
    min-width: 120px;
    min-height: 40px;
    padding: 6px 8px;
  }
`;

const FilterSizeOption = styled.option``;

// On phones the quantity sits beside a full-width Add to Cart button.
const QtyContainer = styled.div`
  display: flex;
  align-items: center;
  width: 50%;
  justify-content: space-between;

  @media (max-width: 1024px) {
    width: 100%;
    justify-content: flex-start;
    gap: 20px;
  }
`;

// Larger − and + on phones, so they're easy to tap.
const QtyToggleContainer = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 768px) {
    svg {
      width: 36px;
      height: 36px;
      padding: 6px;
      box-sizing: border-box;
    }
  }
`;

const Amount = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid teal;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 5px;
`;

const Button = styled.button`
  padding: 15px;
  border: 2px solid teal;
  cursor: pointer;
  background-color: white;
  font-weight: 500;

  &:hover {
    background-color: #f8f4f4;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  @media (max-width: 1024px) {
    flex: 1;
    max-width: 360px;
    padding: 14px;
    font-size: 16px;
  }
`;

const ColorOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`;

const Message = styled.div`
  min-height: 50vh;
  padding: 40px 20px;
  font-size: 20px;
  font-weight: 300;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LowStock = styled.p`
  margin: 10px 0px 0px;
  font-size: 15px;
  color: red;
`;

// Delivery and returns summary shown under "Add to Cart".
const Policies = styled.div`
  margin-top: 24px;
  padding-top: 16px;
  border-top: 0.5px solid lightgray;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 480px;
`;

const Policy = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 14px;
  font-weight: 300;

  b {
    font-weight: 500;
  }
`;

const Notice = styled.p`
  margin: 10px 0px;
  font-size: 16px;
  color: ${(props) => (props.error ? "red" : "teal")};
`;

const CATEGORY_LINK_TEXT = {
  men: "Browse Men's products",
  ladies: "Browse Ladies' products",
};

function ProductDetails({ category }) {
  const { params } = useParams();
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notFound | error
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setProduct(null);
    setQuantity(1);
    setAdded(false);
    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/products/${category}/${params}`
        );
        if (cancelled) return;
        const loaded = response.data.data;
        setProduct(loaded);
        // Pre-select the first option so the cart never gets a blank size or
        // colour (the first size in stock, when stock is tracked per size).
        const options = toOptions(loaded.size);
        setSize(options.find((option) => sizeStockFor(loaded, option) !== 0) || options[0] || "");
        setColor(toOptions(loaded.color)[0] || "");
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus(error?.response?.status === 404 ? "notFound" : "error");
      }
    };
    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [category, params]);

  const sizes = toOptions(product?.size);
  const colors = toOptions(product?.color);
  useDocumentTitle(
    product?.title || (status === "notFound" ? "Product not found" : undefined),
    product?.description
  );

  // Stock for the chosen size when tracked per size, otherwise for the whole
  // product (undefined: not tracked, so unlimited).
  const perSize = tracksSizeStock(product);
  const stock = perSize ? sizeStockFor(product, size) : product?.inStock;
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  const maxQuantity = stock > 0 ? stock : Infinity;

  const handleQty = (type) => {
    setAdded(false);
    if (type === "decrease") {
      quantity > 1 && setQuantity(quantity - 1);
    } else if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const chooseSize = (option) => {
    setSize(option);
    setAdded(false);
    const available = perSize ? sizeStockFor(product, option) : undefined;
    if (available > 0) setQuantity((current) => Math.min(current, available));
  };

  // The cart line keeps the chosen size's stock, so the cart's + stops there.
  const handleClick = () => {
    dispatch(addProduct({ ...product, quantity, color, size, inStock: stock }));
    setAdded(true);
  };

  if (status !== "ready") {
    return (
      <Container>
        <Navbar />
        <Message role="status">
          {status === "loading" && "Loading product…"}
          {status === "notFound" && (
            <>
              <span>Sorry, we couldn't find this product.</span>
              <Link to={`/${category}`}>{CATEGORY_LINK_TEXT[category]}</Link>
            </>
          )}
          {status === "error" && "We couldn't load this product. Please try again."}
        </Message>
        <Footer />
      </Container>
    );
  }

  return (
    <Container>
      <Navbar />
      <Wrapper>
        <ImageContainer>
          <ProductGallery photos={productPhotos(product)} title={product.title} />
        </ImageContainer>
        <InfoContainer>
          <Title>{product.title}</Title>
          <Description>{product.description}</Description>
          <Price>
            ${product.price}
            <WasPrice product={product} />
          </Price>
          {lowStock && (
            <LowStock>
              Only {stock} left{perSize ? ` in size ${size}` : ""}
            </LowStock>
          )}
          <FilterContainer>
            {colors.length > 0 && (
              <Filter>
                <FilterTitle>Color: </FilterTitle>
                <ColorOptions>
                  {colors.map((option) => (
                    <FilterColor
                      key={option}
                      type="button"
                      selected={option === color}
                      aria-pressed={option === color}
                      onClick={() => {
                        setColor(option);
                        setAdded(false);
                      }}
                    >
                      {option}
                    </FilterColor>
                  ))}
                </ColorOptions>
              </Filter>
            )}
            {sizes.length > 0 && (
              <Filter>
                <FilterTitle>Size</FilterTitle>
                <FilterSize
                  id="size"
                  name="size"
                  aria-label="Size"
                  value={size}
                  onChange={(e) => chooseSize(e.target.value)}
                >
                  {sizes.map((element) => {
                    const soldOut = sizeStockFor(product, element) === 0;
                    return (
                      <FilterSizeOption value={element} key={element} disabled={soldOut}>
                        {soldOut ? `${element} (sold out)` : element}
                      </FilterSizeOption>
                    );
                  })}
                </FilterSize>
                <SizeGuide product={product} sizes={sizes} selectedSize={size} />
              </Filter>
            )}
          </FilterContainer>
          <QtyContainer>
            <QtyToggleContainer>
              <RemoveIcon
                aria-label="Decrease quantity"
                onClick={() => handleQty("decrease")}
              />
              <Amount>{quantity}</Amount>
              <AddIcon
                aria-label="Increase quantity"
                onClick={() => handleQty("increase")}
              />
            </QtyToggleContainer>
            <Button onClick={handleClick} disabled={outOfStock}>
              {outOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
          </QtyContainer>
          {added && (
            <Notice role="status">
              Added to cart. <Link to="/cart">View cart</Link>
            </Notice>
          )}
          <Policies>
            <Policy>
              <LocalShippingOutlinedIcon fontSize="small" />
              <span>
                <b>{DELIVERY.headline}.</b> {DELIVERY.detail}
              </span>
            </Policy>
            <Policy>
              <AssignmentReturnOutlinedIcon fontSize="small" />
              <span>
                <b>{RETURNS.headline}.</b> {RETURNS.detail}
              </span>
            </Policy>
          </Policies>
        </InfoContainer>
      </Wrapper>
      <RelatedProducts productId={product._id} />
      <Footer />
    </Container>
  );
}

export default ProductDetails;
