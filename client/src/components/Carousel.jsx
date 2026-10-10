import { useState } from "react";
import styled from "styled-components";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { carouselPhotos } from "../assets/carouselPhotos.js";
import { Link as NavLink } from "react-router-dom";

// The slides set the carousel's height (see Slide).
const Container = styled.div`
  width: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
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
  display: flex;
  transition: all 2s ease;
  transform: translateX(${(props) => props.slideIndex * -100}vw);
`;

// On computers each slide is a fixed-height banner: the photo fills the left
// part and the text sits right beside it, so there's no gap between them.
// On tablets and phones (where the photo is hidden) the slide fits the text.
const Slide = styled.div`
  display: flex;
  align-items: stretch;
  width: 100vw;
  height: min(85vh, 860px);
  min-height: 480px;
  background-color: #${(props) => props.bg};

  @media (max-width: 1024px) {
    height: auto;
    min-height: 0px;
    align-items: center;
    background-color: white;
  }
`;

const ImageContainer = styled.div`
  flex: 0 0 45%;
  overflow: hidden;

  @media (max-width: 1280px) {
    flex-basis: 48%;
  }

  @media (max-width: 1024px) {
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

// Fills its column (trimming the sides as needed), keeping the upper part of
// the photo, where the faces are, in view.
const Image = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
`;

const InfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 50px 80px 50px 60px;

  @media (max-width: 1280px) {
    padding: 40px 70px 40px 50px;
  }

  @media (max-width: 1024px) {
    padding: 35px;
    font-size: 14px;
  }

  @media (max-width: 820px) {
    padding: 30px;
  }

  @media (max-width: 414px) {
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
              <Image src={item.img} alt={item.alt} />
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
