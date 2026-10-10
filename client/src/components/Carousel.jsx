import { useState } from "react";
import styled from "styled-components";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { carouselPhotos } from "../assets/carouselPhotos.js";
import { Link as NavLink } from "react-router-dom";
import { buttonLink } from "../styles/links";

// Banner height on computers: 85% of the screen, between 480px and 860px.
const BANNER_HEIGHT = "max(480px, min(85vh, 860px))";

// Photo shape (width / height) assumed until the photo has loaded: portrait.
const DEFAULT_RATIO = 2 / 3;

// On phones and tablets the photo spans the screen above the text. Its
// height follows its shape, trimming very tall portrait photos to 4:5, and is
// at most 65% of the screen height.
const MOBILE_MIN_RATIO = 4 / 5;
const mobilePhotoHeight = (ratio) =>
  `min(calc(100vw / ${Math.max(ratio, MOBILE_MIN_RATIO)}), 65vh)`;

// Headings and descriptions longer than this get a smaller text size.
const LONG_TITLE = 22;
const LONG_DESCRIPTION = 90;

// The slides set the carousel's height (see Slide).
const Container = styled.div`
  width: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
`;

// On phones and tablets the arrows sit halfway down the photo.
const Arrow = styled.button`
  width: 50px;
  height: 50px;
  padding: 0px;
  border: none;
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
    width: 44px;
    height: 44px;
    top: calc(${(props) => mobilePhotoHeight(props.ratio)} / 2 - 22px);
    bottom: auto;
    margin: 0px;
    opacity: 0.85;
  }
`;

const Wrapper = styled.div`
  display: flex;
  transition: all 2s ease;
  transform: translateX(${(props) => props.slideIndex * -100}vw);
`;

// On computers each slide is a banner: the photo fills the left part and the
// text sits right beside it, so there's no gap between them. The banner grows
// taller if the text needs more room, rather than cutting it off.
// On phones and tablets the photo sits on top with the text below it.
const Slide = styled.div`
  display: flex;
  align-items: stretch;
  width: 100vw;
  min-height: ${BANNER_HEIGHT};
  background-color: ${(props) => (props.bg ? `#${props.bg}` : "white")};

  @media (max-width: 1024px) {
    flex-direction: column;
    min-height: 0px;
  }
`;

// The photo column follows the photo's shape: portrait photos get 45% of the
// width (48% on smaller computers), landscape photos up to 60%, so they're
// trimmed as little as possible.
const ImageContainer = styled.div`
  position: relative;
  flex: 0 0 auto;
  width: clamp(45%, calc(${BANNER_HEIGHT} * ${(props) => props.ratio}), 60%);
  overflow: hidden;

  @media (max-width: 1280px) {
    width: clamp(48%, calc(${BANNER_HEIGHT} * ${(props) => props.ratio}), 60%);
  }

  @media (max-width: 1024px) {
    width: 100%;
    height: ${(props) => mobilePhotoHeight(props.ratio)};
  }
`;

// Sized to the text column (cqi = 1% of its width), so headings fit next to
// both narrow and wide photos. Long headings use a smaller size.
const Title = styled.h1`
  font-size: ${(props) => (props.long ? "44px" : "55px")};
  font-size: ${(props) =>
    props.long ? "clamp(30px, 8cqi, 56px)" : "clamp(36px, 11cqi, 70px)"};
  overflow-wrap: break-word;

  @media (max-width: 1024px) {
    font-size: ${(props) => (props.long ? "28px" : "36px")};
  }

  @media (max-width: 600px) {
    font-size: ${(props) => (props.long ? "24px" : "30px")};
  }
`;

const Description = styled.p`
  max-width: 36em;
  margin: ${(props) => (props.long ? "30px 0px" : "50px 0px")};
  font-size: ${(props) => (props.long ? "17px" : "20px")};
  font-weight: 500;
  letter-spacing: ${(props) => (props.long ? "1px" : "2px")};
  line-height: 1.5;

  @media (max-width: 1280px) {
    font-size: ${(props) => (props.long ? "16px" : "18px")};
  }

  @media (max-width: 1024px) {
    margin: 12px 0px 20px;
    font-size: ${(props) => (props.long ? "15px" : "16px")};
    letter-spacing: 1px;
  }
`;

// "SHOP NOW": the site's button link (see styles/links.js).
const Button = styled(NavLink)`
  ${buttonLink}
  font-size: 20px;

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

// Fills its column, trimming the edges as needed. By default the upper part
// of the photo (where faces usually are) stays in view; a slide can set
// imagePosition (e.g. "center", "left top") to keep a different part.
// Positioned absolutely so the photo's own size never makes the slide taller:
// the slide's height comes from the banner height and the text.
const Image = styled.img`
  position: absolute;
  inset: 0px;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: ${(props) => props.position || "center 30%"};
`;

const InfoContainer = styled.div`
  flex: 1;
  min-width: 0px;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 50px 80px 50px 60px;

  @media (max-width: 1280px) {
    padding: 40px 70px 40px 50px;
  }

  @media (max-width: 1024px) {
    padding: 24px 24px 28px;
  }

  @media (max-width: 600px) {
    padding: 20px 16px 24px;
  }
`;

function Carousel() {
  const slides = carouselPhotos;
  const [slideIndex, setSlideIndex] = useState(0);
  // Each photo's shape (width / height), measured once it loads.
  const [ratios, setRatios] = useState({});

  // Works for any number of slides, wrapping round at either end.
  const handleClick = (direction) => {
    const step = direction === "left" ? -1 : 1;
    setSlideIndex(
      (current) => (current + step + slides.length) % slides.length,
    );
  };

  const handleImageLoad = (id) => (event) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth && naturalHeight) {
      setRatios((current) => ({
        ...current,
        [id]: naturalWidth / naturalHeight,
      }));
    }
  };

  const showArrows = slides.length > 1;
  const currentRatio = ratios[slides[slideIndex]?.id] || DEFAULT_RATIO;

  return (
    <Container>
      {showArrows && (
        <Arrow
          type="button"
          direction="left"
          ratio={currentRatio}
          aria-label="Previous slide"
          onClick={() => handleClick("left")}
        >
          <KeyboardArrowLeftIcon />
        </Arrow>
      )}
      <Wrapper slideIndex={slideIndex}>
        {slides.map((item) => (
          <Slide bg={item.bg} key={item.id}>
            <ImageContainer ratio={ratios[item.id] || DEFAULT_RATIO}>
              <Image
                src={item.img}
                alt={item.alt}
                position={item.imagePosition}
                onLoad={handleImageLoad(item.id)}
              />
            </ImageContainer>
            <InfoContainer>
              <Title long={item.title.length > LONG_TITLE}>{item.title}</Title>
              <Description long={item.description.length > LONG_DESCRIPTION}>
                {item.description}
              </Description>
              <Button to={item.link}>SHOP NOW</Button>
            </InfoContainer>
          </Slide>
        ))}
      </Wrapper>
      {showArrows && (
        <Arrow
          type="button"
          direction="right"
          ratio={currentRatio}
          aria-label="Next slide"
          onClick={() => handleClick("right")}
        >
          <KeyboardArrowRightIcon />
        </Arrow>
      )}
    </Container>
  );
}

export default Carousel;
