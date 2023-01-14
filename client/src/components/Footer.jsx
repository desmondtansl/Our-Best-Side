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
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0px 20px;
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
`;

const PaymentIcon = styled.img`
  width: 40%;
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
          <Logo>PLACEHOLDER</Logo>
        </Center>
        <Right>
          <PaymentIcon src="https://i.ibb.co/Qfvn4z6/payment.png" />
        </Right>
      </Wrapper>
    </Container>
  );
}

export default Footer;
