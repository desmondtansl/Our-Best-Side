import { useEffect, useState } from "react";
import axios from "axios";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { productImageUrl, productPath } from "../utils/products";

// "You may also like": up to 4 similar in-stock products from the same
// category, under the product details. Hidden when there are none.

const Section = styled.section`
  padding: 30px 20px;
  border-top: 0.5px solid lightgray;

  @media (max-width: 768px) {
    padding: 20px 10px;
  }
`;

const Heading = styled.h2`
  margin: 0px 0px 20px;
  font-size: 24px;
  font-weight: 300;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: black;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 320px;
  object-fit: cover;

  @media (max-width: 768px) {
    height: 220px;
  }
`;

function RelatedProducts({ productId }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setProducts([]);
    const fetchRelated = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_BASE_URL}/products/${productId}/related`
        );
        const related = response.data?.data;
        if (!cancelled) setProducts(Array.isArray(related) ? related : []);
      } catch (error) {
        // Suggestions are optional: leave the section hidden.
      }
    };
    fetchRelated();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!products.length) return null;

  return (
    <Section aria-labelledby="related-heading">
      <Heading id="related-heading">You may also like</Heading>
      <Grid>
        {products.map((product) => (
          <Card key={product._id} to={productPath(product)} data-testid="related-product">
            <Image src={productImageUrl(product.image)} alt={product.title} />
            <span>{product.title}</span>
            <span>${product.price}</span>
          </Card>
        ))}
      </Grid>
    </Section>
  );
}

export default RelatedProducts;
