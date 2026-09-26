import styled from "styled-components";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Wrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: 300;
  margin: 0;
`;

const Text = styled.p`
  font-weight: 300;
  margin: 0;
`;

const Links = styled.div`
  display: flex;
  gap: 20px;
`;

// Shown for any address that doesn't match a page.
function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Page not found</Title>
        <Text>Sorry, we couldn't find the page you were looking for.</Text>
        <Links>
          <Link to="/">Home</Link>
          <Link to="/men">Shop Men</Link>
          <Link to="/ladies">Shop Ladies</Link>
        </Links>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default NotFound;
