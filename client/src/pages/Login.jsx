import { useState } from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserAuth } from "../context/Auth";

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

const InfoContainer = styled.div``;

const SpareContainer = styled.div``;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [user, setUser] = UserAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/login`,
        {
          email,
          password,
          isAdmin: true,
        }
      );

      localStorage.setItem("token", response.data.data.token);
      if (response.data) {
        setUser({
          data: {
            id: response.data.data.user.id,
            email: response.data.data.user.email,
            isAdmin: response.data.data.user.isAdmin,
          },
          error: null,
          loading: false,
        });
      }
      navigate("/");

      console.log(response);
    } catch (error) {
      setError(error.response.data.error[0].message);
      alert(error.response.data.error[0].message);
    }
  };
  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Welcome Back</Title>
        <Form onSubmit={handleSubmit}>
          <Input
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            required
            placeholder="Password"
            type="password"
            minlength="8"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button>Login</Button>
        </Form>
        <InfoContainer>
          Don't have an account?{" "}
          <Link to="/signup" style={{ textDecoration: "none" }}>
            Sign up here
          </Link>
        </InfoContainer>
      </Wrapper>
      <SpareContainer></SpareContainer>
      <Footer />
    </Container>
  );
}

export default Login;
