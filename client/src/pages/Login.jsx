import { useState } from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import axios from "axios";

const Container = styled.div`
  overflow: hidden;
  height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  display: flex;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/auth/login`,
        {
          email,
          password,
        }
      );
      console.log(response);
    } catch (error) {
      console.log(error.message);
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
