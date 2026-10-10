import styled from "styled-components";
import SendIcon from "@mui/icons-material/Send";
import { useState } from "react";
import validator from "validator";

const Container = styled.div`
  height: 30vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  @media (max-width: 1024px) {
    height: auto;
    padding: 48px 16px;
    text-align: center;
  }
`;

const Title = styled.h1`
  font-size: 60px;
  margin-bottom: 20px;

  @media (max-width: 1024px) {
    font-size: 36px;
  }

  @media (max-width: 600px) {
    font-size: 24px;
    margin-bottom: 16px;
  }
`;

const InputContainer = styled.div`
  width: 30%;
  height: 40px;
  display: flex;
  justify-content: space-between;
  border: 1px solid lightgray;

  @media (max-width: 1024px) {
    width: 100%;
    max-width: 420px;
    height: 48px;
    border-radius: 10px;
    overflow: hidden;
  }
`;

const Input = styled.input`
  border: none;
  flex: 5;
  padding-left: 20px;
  font-style: italic;

  @media (max-width: 1024px) {
    min-width: 0px;
    padding-left: 12px;
  }
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
`;

const ErrorText = styled.p`
  font-size: 15px;
  color: red;
  font-style: italic;
  padding: 6px;
  text-align: left;
`;

function Newsletter() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleClick = () => {
    if (!validator.isEmail(email)) {
      setEmailError("Invalid email address");
    } else {
      setEmailError("");
      alert("Thank you for signing up!");
    }
  };

  return (
    <Container>
      <Title>Subscribe to get latest updates!</Title>
      <InputContainer>
        <Input
          type="email"
          placeholder="e.g. example@example.com"
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={handleClick}>
          <SendIcon />
        </Button>
      </InputContainer>
      {emailError && <ErrorText>{emailError}</ErrorText>}
    </Container>
  );
}

export default Newsletter;
