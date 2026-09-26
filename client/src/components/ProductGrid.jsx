import styled from "styled-components";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import axios from "axios";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { productImageUrl } from "../utils/products";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Product listing shared by /men and /ladies.

const Container = styled.div``;

const Container2 = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;
  justify-content: space-between;
  padding: 200px;

  @media (max-width: 912px) {
    padding: 50px;
  }

  @media (max-width: 820px) {
    padding: 50px;
  }

  @media (max-width: 768px) {
    padding: 50px;
  }

  @media (max-width: 414px) {
    padding: 50px;
  }

  @media (max-width: 375px) {
    padding: 50px;
  }

  @media (max-width: 360px) {
    padding: 50px;
  }

  @media (max-width: 280px) {
    padding: 50px;
  }
`;

const Container3 = styled.div`
  display: flex;
  flex-direction: column;
  width: 30%;
  padding: 10px;
  justify-content: center;

  @media (max-width: 912px) {
    width: 20%;
  }

  @media (max-width: 820px) {
    width: 40%;
  }

  @media (max-width: 768px) {
    width: 40%;
  }

  @media (max-width: 414px) {
    width: 80%;
  }

  @media (max-width: 375px) {
    width: 80%;
  }

  @media (max-width: 360px) {
    width: 80%;
  }

  @media (max-width: 280px) {
    width: 80%;
  }
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

  @media (max-width: 1024px) {
    font-size: 14px;
  }

  @media (max-width: 912px) {
    font-size: 13px;
  }

  @media (max-width: 820px) {
    font-size: 14px;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 414px) {
    font-size: 12px;
  }

  @media (max-width: 375px) {
    font-size: 12px;
  }

  @media (max-width: 360px) {
    font-size: 11px;
  }

  @media (max-width: 280px) {
    font-size: 10px;
  }
`;

const Price = styled.p`
  align-items: center;
  padding: 5px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 16px;

  @media (max-width: 1024px) {
    font-size: 14px;
  }

  @media (max-width: 912px) {
    font-size: 13px;
  }

  @media (max-width: 820px) {
    font-size: 14px;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }

  @media (max-width: 414px) {
    font-size: 12px;
  }

  @media (max-width: 375px) {
    font-size: 12px;
  }

  @media (max-width: 360px) {
    font-size: 11px;
  }

  @media (max-width: 280px) {
    font-size: 10px;
  }
`;

const Message = styled.p`
  width: 100%;
  font-size: 20px;
  font-weight: 300;
`;

function ProductGrid({ category }) {
  useDocumentTitle(category === "ladies" ? "Ladies" : "Men");
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProducts(null);
    setError(false);
    const fetchProducts = async () => {
      try {
        const { data: response } = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/products/${category}`
        );
        if (!cancelled) setProducts(Array.isArray(response) ? response : []);
      } catch (err) {
        if (!cancelled) setError(true);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <Container>
      <Navbar />
      <Container2>
        {error && <Message>We couldn't load products. Please try again.</Message>}
        {!error && products === null && <Message>Loading products…</Message>}
        {products?.length === 0 && (
          <Message>No products here yet. Check back soon!</Message>
        )}
        {products?.map((product) => (
          <Container3 key={product._id} data-testid="product-card">
            <NavLink to={`/${category}/${product._id}`}>
              <ImageCard src={productImageUrl(product.image)} alt={product.title} />
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

export default ProductGrid;
