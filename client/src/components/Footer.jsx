import styled from "styled-components";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";

const Container = styled.div`
  height: 60px;
`;

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;

  @media (max-width: 414px) {
    width: auto;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 375px) {
    width: auto;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 360px) {
    width: auto;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 280px) {
    width: auto;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0px 20px;

  @media (max-width: 414px) {
    width: auto;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-around;
  }

  @media (max-width: 375px) {
    width: auto;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-around;
  }

  @media (max-width: 280px) {
    width: auto;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-around;
  }
`;

const SocialMediaContainer = styled.div`
  display: flex;
`;

const SocialMediaIcons = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
`;

const Center = styled.div`
  flex: 1;
  padding: 20px;
  text-align: center;

  @media (max-width: 280px) {
    flex: 1;
    text-align: center;
  }
`;

const Logo = styled.h1`
  font-weight: bold;
`;

const Right = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 820px) {
    width: auto;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    width: auto;
    justify-content: flex-end;
  }

  @media (max-width: 540px) {
    width: auto;
    justify-content: flex-end;
  }

  @media (max-width: 414px) {
    width: auto;
    justify-content: space-around;
  }

  @media (max-width: 375px) {
    width: auto;
    justify-content: space-around;
  }

  @media (max-width: 360px) {
    width: auto;
    justify-content: space-around;
  }

  @media (max-width: 280px) {
    width: auto;
    justify-content: space-around;
  }
`;

const PaymentIcon = styled.img`
  width: 40%;

  @media (max-width: 820px) {
    width: 60%;
  }

  @media (max-width: 768px) {
    width: 60%;
  }

  @media (max-width: 540px) {
    width: 60%;
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

function Footer() {
  return (
    <Container>
      <Wrapper>
        <Left>
          <SocialMediaContainer>
            <SocialMediaIcons>
              <FacebookIcon />
            </SocialMediaIcons>
            <SocialMediaIcons>
              <InstagramIcon />
            </SocialMediaIcons>
          </SocialMediaContainer>
        </Left>
        <Center>
          <Logo>Our Best Side</Logo>
        </Center>
        <Right>
          <PaymentIcon src="https://i.ibb.co/Qfvn4z6/payment.png" />
        </Right>
      </Wrapper>
    </Container>
  );
}

export default Footer;
