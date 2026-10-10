import styled from "styled-components";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import visaLogo from "../assets/payment/visa.svg";
import mastercardLogo from "../assets/payment/mastercard.svg";
import amexLogo from "../assets/payment/amex.svg";
import paynowLogo from "../assets/payment/paynow.svg";

// min-height (not height) so the footer grows to fit its content instead of
// letting it spill below the page.
const Container = styled.div`
  min-height: 60px;
`;

// One row on computers; stacked and centred on tablets and phones.
const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-around;

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 12px;
    padding: 24px 16px 32px;
    border-top: 0.5px solid lightgray;
  }
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0px 20px;

  @media (max-width: 1024px) {
    justify-content: center;
    padding: 0px;
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

  @media (max-width: 1024px) {
    margin: 0px 8px;
    width: 44px;
    height: 44px;
  }
`;

const Center = styled.div`
  flex: 1;
  padding: 20px;
  text-align: center;

  @media (max-width: 1024px) {
    padding: 0px;
  }
`;

const Logo = styled.h1`
  font-weight: bold;

  @media (max-width: 1024px) {
    font-size: 28px;
  }

  @media (max-width: 600px) {
    font-size: 24px;
  }
`;

const Right = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 1024px) {
    padding: 0px;
    justify-content: center;
  }
`;

// Payment methods accepted at Stripe Checkout, shown with their official
// logos (hosted with the site; see assets/payment/LICENSE.md).
const Payments = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 0px 20px;
  font-size: 12px;

  @media (max-width: 1024px) {
    justify-content: center;
    padding: 0px;
  }
`;

const PaymentLogo = styled.img`
  display: block;
  width: 38px;
  height: 24px;
`;

const Secure = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 300;
`;

const ACCEPTED_PAYMENTS = [
  { name: "Visa", logo: visaLogo },
  { name: "Mastercard", logo: mastercardLogo },
  { name: "American Express", logo: amexLogo },
  { name: "PayNow", logo: paynowLogo },
];

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
            {ACCEPTED_PAYMENTS.map(({ name, logo }) => (
              <PaymentLogo key={name} src={logo} alt={name} title={name} />
            ))}
          </Payments>
        </Right>
      </Wrapper>
    </Container>
  );
}

export default Footer;
