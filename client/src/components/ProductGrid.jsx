import styled from "styled-components";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import axios from "axios";
import { useEffect, useState } from "react";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { productImageUrl, productPath } from "../utils/products";
import { readFilters, activeFilterCount, shopApiUrl, withoutFilters } from "../utils/shop";
import useDocumentTitle from "../hooks/useDocumentTitle";
import ShopFilters from "./ShopFilters.jsx";
import WasPrice from "./WasPrice";

// Product listing shared by /men, /ladies and the search results page
// (no category). Filters and sort come from the page address.

const Container = styled.div``;

// Smaller top padding than the sides, so the filter bar sits just under the
// navbar. Cards line up from the left, so a filtered row of 1 or 2 products
// doesn't spread to the edges. Tablets show 3 products per row, phones 2.
const Container2 = styled.div`
  display: flex;
  flex-wrap: wrap;
  height: 100%;
  justify-content: flex-start;
  column-gap: 4.5%;
  padding: 40px 200px 200px;
  opacity: ${(props) => (props.updating ? 0.6 : 1)};
  transition: opacity 0.15s;

  @media (max-width: 1024px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0px, 1fr));
    column-gap: 16px;
    row-gap: 28px;
    padding: 24px 24px 48px;
  }

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0px, 1fr));
    column-gap: 12px;
    row-gap: 24px;
    padding: 16px 16px 40px;
  }
`;

const Heading = styled.h1`
  grid-column: 1 / -1;
  width: 100%;
  margin: 0px 0px 20px;
  font-size: 30px;
  font-weight: 300;

  @media (max-width: 600px) {
    margin: 0px;
    font-size: 24px;
  }
`;

const Container3 = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 30%;
  padding: 10px;
  justify-content: center;

  @media (max-width: 1024px) {
    width: auto;
    padding: 0px;
    justify-content: flex-start;
  }
`;

// On tablets and phones photos fill the card in a 3:4 shape.
const ImageCard = styled.img`
  display: flex;
  width: 80%;
  cursor: pointer;

  @media (max-width: 1024px) {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
  }
`;

// Name and price side by side on computers, stacked on tablets and phones.
const InfoContainer = styled.div`
  display: flex;

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 2px;
    padding-top: 8px;
  }
`;

const Text = styled.p`
  align-items: center;
  padding: 5px;
  justify-content: center;
  display: flex;
  font-weight: 500;
  font-size: 16px;

  @media (max-width: 1024px) {
    padding: 0px;
    justify-content: flex-start;
    font-size: 14px;
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
    padding: 0px;
    justify-content: flex-start;
    font-size: 14px;
  }
`;

const Message = styled.p`
  grid-column: 1 / -1;
  width: 100%;
  font-size: 20px;
  font-weight: 300;

  a,
  button {
    font-size: 16px;
    margin-left: 6px;
  }
`;

const TextButton = styled.button`
  padding: 0px;
  border: none;
  background: none;
  font-family: inherit;
  text-decoration: underline;
  cursor: pointer;
`;

const CATEGORY_TITLES = { men: "Men", ladies: "Ladies" };

function ProductGrid({ category }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const isSearch = !category;
  const heading = isSearch
    ? filters.q
      ? `Results for "${filters.q}"`
      : "All products"
    : CATEGORY_TITLES[category];
  useDocumentTitle(isSearch && filters.q ? `Search: ${filters.q}` : heading);

  const [products, setProducts] = useState(null);
  const [facets, setFacets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const apiUrl = shopApiUrl(searchParams, { category });

  // A different category starts from a clean slate; filter changes keep the
  // current products on screen (dimmed) until the new ones arrive.
  useEffect(() => {
    setProducts(null);
    setFacets(null);
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const fetchProducts = async () => {
      try {
        const { data: response } = await axios.get(apiUrl);
        if (cancelled) return;
        setProducts(Array.isArray(response?.data) ? response.data : []);
        setFacets(response?.facets || null);
      } catch (err) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const filtered = activeFilterCount(filters) > 0;

  return (
    <Container>
      <Navbar />
      <Container2 updating={loading && products !== null}>
        {isSearch && <Heading>{heading}</Heading>}
        <ShopFilters
          facets={facets}
          count={products?.length}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
        {error && <Message>We couldn't load products. Please try again.</Message>}
        {!error && products === null && <Message>Loading products…</Message>}
        {!error && products?.length === 0 && (
          <Message>
            {filtered ? (
              <>
                No products match these filters.
                <TextButton
                  type="button"
                  onClick={() => setSearchParams(withoutFilters(searchParams))}
                >
                  Clear filters
                </TextButton>
              </>
            ) : isSearch && filters.q ? (
              <>
                No results for "{filters.q}". Try another word, or browse
                <Link to="/men">Men</Link> or <Link to="/ladies">Ladies</Link>.
              </>
            ) : (
              "No products here yet. Check back soon!"
            )}
          </Message>
        )}
        {!error &&
          products?.map((product) => (
            <Container3 key={product._id} data-testid="product-card">
              <NavLink to={isSearch ? productPath(product) : `/${category}/${product._id}`}>
                <ImageCard src={productImageUrl(product.image)} alt={product.title} />
              </NavLink>
              <InfoContainer>
                <Text> {product.title}</Text>
                <Price>
                  $ {product.price}
                  <WasPrice product={product} />
                </Price>
              </InfoContainer>
            </Container3>
          ))}
      </Container2>
      <Footer />
    </Container>
  );
}

export default ProductGrid;
