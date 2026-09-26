import styled from "styled-components";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

// min-height (not height) so the footer grows to fit its content instead of
// letting it spill below the page.
const Container = styled.div`
  min-height: 60px;
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

// Cards accepted by Stripe Checkout, drawn as text badges so nothing is
// loaded from other websites.
const Payments = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 0px 20px;
  font-size: 12px;

  @media (max-width: 414px) {
    justify-content: center;
    padding: 0px;
  }
`;

const Badge = styled.span`
  border: 1px solid lightgray;
  border-radius: 4px;
  padding: 4px 8px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

const Secure = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 300;
`;

const ACCEPTED_CARDS = ["VISA", "Mastercard", "AMEX"];

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
          <Payments aria-label="Accepted payment methods">
            <Secure>
              <LockOutlinedIcon fontSize="inherit" /> Secure checkout
            </Secure>
            {ACCEPTED_CARDS.map((card) => (
              <Badge key={card}>{card}</Badge>
            ))}
          </Payments>
        </Right>
      </Wrapper>
    </Container>
  );
}

export default Footer;
