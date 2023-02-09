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

  @media (max-width: 375px) {
    height: 20vh;
  }

  @media (max-width: 360px) {
    height: 20vh;
  }

  @media (max-width: 280px) {
    height: 20vh;
  }
`;

const Title = styled.h1`
  font-size: 60px;
  margin-bottom: 20px;

  @media (max-width: 820px) {
    font-size: 50px;
  }

  @media (max-width: 540px) {
    font-size: 36px;
  }

  @media (max-width: 414px) {
    font-size: 28px;
  }

  @media (max-width: 393px) {
    font-size: 26px;
  }

  @media (max-width: 390px) {
    font-size: 26px;
  }

  @media (max-width: 375px) {
    font-size: 26px;
  }

  @media (max-width: 360px) {
    font-size: 25px;
  }

  @media (max-width: 280px) {
    font-size: 18px;
  }
`;

const InputContainer = styled.div`
  width: 30%;
  height: 40px;
  display: flex;
  justify-content: space-between;
  border: 1px solid lightgray;

  @media (max-width: 820px) {
    width: 70%;
  }

  @media (max-width: 414px) {
    width: 70%;
  }

  @media (max-width: 390px) {
    width: 70%;
  }

  @media (max-width: 375px) {
    width: 70%;
  }

  @media (max-width: 360px) {
    width: 70%;
  }

  @media (max-width: 280px) {
    width: 70%;
  }
`;

const Input = styled.input`
  border: none;
  flex: 5;
  padding-left: 20px;
  font-style: italic;

  @media (max-width: 820px) {
    padding-left: 12px;
  }

  @media (max-width: 414px) {
    padding-left: 8px;
  }

  @media (max-width: 390px) {
    padding-left: 8px;
  }

  @media (max-width: 375px) {
    padding-left: 8px;
  }

  @media (max-width: 360px) {
    padding-left: 5px;
  }

  @media (max-width: 280px) {
    padding-left: 5px;
    font-size: 11px;
  }
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
`;

function Newsletter() {
  const [email, setEmail] = useState("");

  const handleClick = () => {
    if (!validator.isEmail(email)) {
      alert("Invalid email address");
    } else {
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
    </Container>
  );
}

export default Newsletter;
