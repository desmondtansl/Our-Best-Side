import styled from "styled-components";
import SendIcon from "@mui/icons-material/Send";

const Container = styled.div`
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const Title = styled.h1`
  font-size: 60px;
  margin-bottom: 20px;
`;

const InputContainer = styled.div`
  width: 50%;
  height: 40px;
  display: flex;
  justify-content: space-between;
  border: 1px solid lightgray;
`;

const Input = styled.input`
  border: none;
  flex: 7;
  padding-left: 20px;
  font-style: italic;
`;

const Button = styled.button`
  flex: 1;
  border: none;
  cursor: pointer;
`;

function Newsletter() {
  return (
    <Container>
      <Title>Subscribe to get latest updates!</Title>
      <InputContainer>
        <Input placeholder="e.g. example@example.com" />
        <Button>
          <SendIcon />
        </Button>
      </InputContainer>
    </Container>
  );
}

export default Newsletter;
