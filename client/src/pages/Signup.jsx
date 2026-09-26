import { useState } from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "../context/Auth";
import { errorMessage } from "../utils/format";
import useDocumentTitle from "../hooks/useDocumentTitle";

const Container = styled.div`
  overflow: hidden;
  height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  display: flex;

  @media (max-width: 1024px) {
    height: 90vh;
  }

  @media (max-width: 280px) {
    height: auto;
  }
`;

const Wrapper = styled.div`
  width: 100vw;
  height: auto;
  align-items: center;
  display: flex;
  flex-direction: column;
  margin-top: 0;
`;

const Title = styled.h1`
  display: flex;
  font-size: 30px;
  font-weight: 400;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 15%;

  @media (max-width: 1024px) {
    width: auto;
  }

  @media (max-width: 820px) {
    width: auto;
  }

  @media (max-width: 414px) {
    width: auto;
  }

  @media (max-width: 375px) {
    width: auto;
  }

  @media (max-width: 360px) {
    width: auto;
  }

  @media (max-width: 280px) {
    width: auto;
  }
`;

const Input = styled.input`
  flex: 1;
  min-width: 40%;
  margin: 10px 0px;
  padding: 10px;
`;

const Button = styled.button`
  width: auto;
  border: none;
  padding: 15px 20px;
  cursor: pointer;
  margin-bottom: 10px;
  font-size: 14px;
  display: inline-block;
  align-items: center;
  background-color: #e1d7c6;
`;

const SpareContainer = styled.div``;

function Login() {
  useDocumentTitle("Sign Up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = UserAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/signup`,
        {
          email,
          password,
        }
      );
      // Sign the new user straight in and take them to their account.
      const { token, user: newUser } = response.data.data;
      localStorage.setItem("token", token);
      setUser({
        data: { id: newUser.id, email: newUser.email, isAdmin: false },
        error: null,
        loading: false,
      });
      navigate("/account");
    } catch (error) {
      console.log(error);
      const message = errorMessage(error, "Sign up failed");
      setError(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Sign Up</Title>
        <Form onSubmit={handleSubmit}>
          <Input
            placeholder="Email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            required
            placeholder="Password"
            type="password"
            minlength="8"
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button>Signup</Button>
        </Form>
      </Wrapper>
      <SpareContainer></SpareContainer>
      <Footer />
    </Container>
  );
}

export default Login;
