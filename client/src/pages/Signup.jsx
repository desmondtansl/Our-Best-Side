import { useState } from "react";
import styled from "styled-components";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Container = styled.div`
  overflow: hidden;
`;

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  padding: 20px;
  align-items: center;
  justify-content: center;
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
`;

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleClick = (e) => {
    e.preventDefault();
  };
  return (
    <Container>
      <Navbar />
      <Wrapper>
        <Title>Sign Up</Title>
        <Form>
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
          <Button onClick={handleClick}>Signup</Button>
        </Form>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default Login;
