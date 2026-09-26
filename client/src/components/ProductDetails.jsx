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
import { productImageUrl, toOptions } from "../utils/products";

// Product page shared by /men/:params and /ladies/:params.

const Container = styled.div`
  @media (max-width: 1024px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 0px 10px;
  }
  @media (max-width: 414px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 375px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 360px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 280px) {
    width: 100%;
    padding: 0px 10px;
  }
`;

const Wrapper = styled.div`
  padding: 20px;
  display: flex;

  @media (max-width: 1024px) {
    padding: 10px;
  }

  @media (max-width: 768px) {
    padding: 10px;
  }

  @media (max-width: 414px) {
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

const ImageContainer = styled.div`
  flex: 1;

  @media (max-width: 1024px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 414px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 375px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 360px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 280px) {
    width: 100%;
    height: 50vh;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 90vh;
  object-fit: cover;

  @media (max-width: 1024px) {
    height: 50vh;
  }

  @media (max-width: 820px) {
    height: 50vh;
  }

  @media (max-width: 768px) {
    height: 50vh;
  }

  @media (max-width: 414px) {
    height: 50vh;
  }

  @media (max-width: 375px) {
    height: 50vh;
  }

  @media (max-width: 360px) {
    height: 50vh;
  }

  @media (max-width: 280px) {
    height: 50vh;
  }
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;

  @media (max-width: 768px) {
    padding: 0px 10px;
  }

  @media (max-width: 414px) {
    padding: 0px 10px;
  }

  @media (max-width: 375px) {
    padding: 0px 10px;
  }

  @media (max-width: 360px) {
    padding: 0px 10px;
  }

  @media (max-width: 280px) {
    padding: 0px 10px;
  }
`;

const Title = styled.h1`
  font-weight: 200;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 26px;
    font-weight: 300;
  }

  @media (max-width: 414px) {
    font-size: 20px;
  }

  @media (max-width: 375px) {
    font-size: 20px;
  }

  @media (max-width: 360px) {
    font-size: 20px;
  }

  @media (max-width: 280px) {
    font-size: 20px;
  }
`;

const Description = styled.p`
  margin: 20px 0px;
  font-size: 20px;

  @media (max-width: 768px) {
    font-size: 16px;
    margin: 10px 0px;
    font-weight: 350;
  }

  @media (max-width: 414px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 375px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 360px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 280px) {
    font-size: 14px;
    margin: 10px 0px;
  }
`;

const Price = styled.span`
  font-weight: 100;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 24px;
    font-weight: 200;
  }

  @media (max-width: 414px) {
    font-size: 20px;
  }

  @media (max-width: 375px) {
    font-size: 20px;
  }

  @media (max-width: 360px) {
    font-size: 20px;
  }

  @media (max-width: 280px) {
    font-size: 20px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 50%;
  margin: 20px 0px;

  @media (max-width: 1024px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 820px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 414px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 375px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 360px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 280px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
`;

const FilterTitle = styled.span`
  font-size: 20px;
  font-weight: 200;

  @media (max-width: 414px) {
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

  @media (max-width: 375px) {
    margin-bottom: 10px;
  }

  @media (max-width: 360px) {
    margin-bottom: 10px;
  }

  @media (max-width: 280px) {
    margin-bottom: 10px;
  }
`;

const FilterSize = styled.select`
  margin-left: 10px;
  padding: 5px;
  width: 70px;

  @media (max-width: 414px) {
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

const FilterSizeOption = styled.option``;

const QtyContainer = styled.div`
  display: flex;
  align-items: center;
  width: 50%;
  justify-content: space-between;

  @media (max-width: 414px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 375px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 280px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const QtyToggleContainer = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 414px) {
    margin-bottom: 10px;
  }

  @media (max-width: 375px) {
    margin-bottom: 10px;
  }

  @media (max-width: 280px) {
    margin-bottom: 10px;
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

  @media (max-width: 820px) {
    margin: 5px 0px;
  }

  @media (max-width: 414px) {
    margin: 5px 0px;
  }

  @media (max-width: 375px) {
    margin: 5px 0px;
  }

  @media (max-width: 280px) {
    margin: 5px 0px;
  }
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

  @media (max-width: 820px) {
    margin: 5px;
    padding: 10px;
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
        // Pre-select the first option so the cart never gets a blank size or colour.
        setSize(toOptions(loaded.size)[0] || "");
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
  const outOfStock = product?.inStock === 0;
  const maxQuantity = product?.inStock > 0 ? product.inStock : Infinity;

  const handleQty = (type) => {
    setAdded(false);
    if (type === "decrease") {
      quantity > 1 && setQuantity(quantity - 1);
    } else if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleClick = () => {
    dispatch(addProduct({ ...product, quantity, color, size }));
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
          <Image src={productImageUrl(product.image)} alt={product.title} />
        </ImageContainer>
        <InfoContainer>
          <Title>{product.title}</Title>
          <Description>{product.description}</Description>
          <Price>${product.price}</Price>
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
                  onChange={(e) => {
                    setSize(e.target.value);
                    setAdded(false);
                  }}
                >
                  {sizes.map((element) => (
                    <FilterSizeOption value={element} key={element}>
                      {element}
                    </FilterSizeOption>
                  ))}
                </FilterSize>
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
        </InfoContainer>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default ProductDetails;
