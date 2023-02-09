import { useState } from "react";
import styled from "styled-components";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { carouselPhotos } from "../assets/carouselPhotos.js";
import { Link as NavLink } from "react-router-dom";

const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  position: relative;
  overflow: hidden;

  @media (max-width: 1280px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 1024px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 820px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 768px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 414px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 375px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 360px) {
    height: auto;
    width: auto;
  }

  @media (max-width: 280px) {
    height: auto;
    width: auto;
  }
`;

const Arrow = styled.div`
  width: 50px;
  height: 50px;
  background-color: #fff7f7;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${(props) => props.direction === "left" && "10px"};
  right: ${(props) => props.direction === "right" && "10px"};
  margin: auto;
  cursor: pointer;
  opacity: 0.5;
  z-index: 2;

  @media (max-width: 1024px) {
    width: 45px;
    height: 45px;
  }

  @media (max-width: 820px) {
    width: 45px;
    height: 45px;
  }

  @media (max-width: 768px) {
    width: 45px;
    height: 45px;
  }

  @media (max-width: 414px) {
    width: 40px;
    height: 40px;
  }

  @media (max-width: 375px) {
    width: 40px;
    height: 40px;
  }

  @media (max-width: 360px) {
    width: 40px;
    height: 40px;
  }

  @media (max-width: 280px) {
    width: 36px;
    height: 36px;
  }
`;

const Wrapper = styled.div`
  height: 100%;
  display: flex;
  transition: all 2s ease;
  transform: translateX(${(props) => props.slideIndex * -100}vw);

  @media (max-width: 1280px) {
    height: auto;
  }

  @media (max-width: 1024px) {
    height: auto;
  }

  @media (max-width: 820px) {
    height: auto;
  }

  @media (max-width: 768px) {
    height: auto;
  }

  @media (max-width: 414px) {
    height: auto;
  }

  @media (max-width: 375px) {
    height: auto;
  }

  @media (max-width: 360px) {
    height: auto;
  }

  @media (max-width: 280px) {
    height: auto;
  }
`;

const Slide = styled.div`
  display: flex;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-color: #${(props) => props.bg};

  @media (max-width: 1280px) {
    height: auto;
    background-color: white;
  }

  @media (max-width: 1024px) {
    height: auto;
  }

  @media (max-width: 820px) {
    height: auto;
  }

  @media (max-width: 768px) {
    height: auto;
  }

  @media (max-width: 414px) {
    height: auto;
  }

  @media (max-width: 375px) {
    height: auto;
  }

  @media (max-width: 360px) {
    height: auto;
  }

  @media (max-width: 280px) {
    height: auto;
  }
`;

const ImageContainer = styled.div`
  flex: 1;
  height: 100%;

  @media (max-width: 1280px) {
    height: 90%;
  }

  @media (max-width: 1024px) {
    height: auto;
    display: none;
  }

  @media (max-width: 820px) {
    height: auto;
    display: none;
  }

  @media (max-width: 768px) {
    height: auto;
    display: none;
  }

  @media (max-width: 414px) {
    height: auto;
    display: none;
  }

  @media (max-width: 375px) {
    height: auto;
    display: none;
  }

  @media (max-width: 360px) {
    height: auto;
    display: none;
  }

  @media (max-width: 280px) {
    height: auto;
    display: none;
  }
`;

const Title = styled.h1`
  font-size: 70px;

  @media (max-width: 1280px) {
    font-size: 55px;
  }

  @media (max-width: 1024px) {
    font-size: 45px;
  }

  @media (max-width: 820px) {
    font-size: 45px;
  }

  @media (max-width: 768px) {
    font-size: 40px;
  }

  @media (max-width: 414px) {
    font-size: 40px;
  }

  @media (max-width: 375px) {
    font-size: 40px;
  }

  @media (max-width: 360px) {
    font-size: 40px;
  }

  @media (max-width: 280px) {
    font-size: 36px;
  }
`;

const Description = styled.p`
  margin: 50px 0px;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 2px;

  @media (max-width: 1280px) {
    font-size: 18px;
  }

  @media (max-width: 1024px) {
    font-size: 18px;
  }

  @media (max-width: 820px) {
    font-size: 18px;
  }

  @media (max-width: 768px) {
    font-size: 18px;
  }

  @media (max-width: 414px) {
    font-size: 15px;
  }

  @media (max-width: 375px) {
    font-size: 15px;
  }

  @media (max-width: 360px) {
    font-size: 15px;
  }

  @media (max-width: 280px) {
    font-size: 14px;
  }
`;

const Button = styled.button`
  padding: 10px;
  font-size: 20px;
  background-color: transparent;
  cursor: pointer;

  @media (max-width: 1280px) {
    font-size: 18px;
  }

  @media (max-width: 820px) {
    font-size: 17px;
  }

  @media (max-width: 768px) {
    font-size: 16px;
  }

  @media (max-width: 414px) {
    font-size: 15px;
  }

  @media (max-width: 375px) {
    font-size: 15px;
  }

  @media (max-width: 360px) {
    font-size: 15px;
  }

  @media (max-width: 280px) {
    font-size: 13px;
  }
`;

const Image = styled.img`
  height: 90%;

  @media (max-width: 1280px) {
    height: 85%;
  }

  @media (max-width: 1024px) {
    height: 60%;
  }

  @media (max-width: 820px) {
    height: 60%;
  }

  @media (max-width: 768px) {
    height: 60%;
  }

  @media (max-width: 414px) {
    height: 50%;
  }

  @media (max-width: 375px) {
    height: 50%;
  }

  @media (max-width: 360px) {
    height: 50%;
  }

  @media (max-width: 280px) {
    height: 50%;
  }
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 50px;

  @media (max-width: 1024px) {
    padding: 35px;
    font-size: 14px;
  }

  @media (max-width: 820px) {
    padding: 30px;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    padding: 30px;
    font-size: 14px;
  }

  @media (max-width: 414px) {
    padding: 20px;
    font-size: 12px;
  }

  @media (max-width: 375px) {
    padding: 20px;
    font-size: 12px;
  }

  @media (max-width: 360px) {
    padding: 20px;
    font-size: 12px;
  }

  @media (max-width: 280px) {
    padding: 20px;
    font-size: 12px;
  }
`;

function Carousel() {
  const [slideIndex, setSlideIndex] = useState(0);
  const handleClick = (direction) => {
    if (direction === "left") {
      setSlideIndex(slideIndex > 0 ? slideIndex - 1 : 2);
    } else setSlideIndex(slideIndex < 2 ? slideIndex + 1 : 0);
  };

  return (
    <Container>
      <Arrow direction="left" onClick={() => handleClick("left")}>
        <KeyboardArrowLeftIcon />
      </Arrow>
      <Wrapper slideIndex={slideIndex}>
        {carouselPhotos.map((item) => (
          <Slide bg={item.bg} key={item.id}>
            <ImageContainer>
              <Image src={item.img} />
            </ImageContainer>
            <InfoContainer>
              <Title>{item.title}</Title>
              <Description>{item.description}</Description>
              <Button>
                <NavLink to={item.link} style={{ textDecoration: "none" }}>
                  SHOP NOW
                </NavLink>
              </Button>
            </InfoContainer>
          </Slide>
        ))}
      </Wrapper>
      <Arrow direction="right" onClick={() => handleClick("right")}>
        <KeyboardArrowRightIcon />
      </Arrow>
    </Container>
  );
}

export default Carousel;
