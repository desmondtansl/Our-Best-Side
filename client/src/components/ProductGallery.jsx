import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { productImageUrl } from "../utils/products";

// Product photos: the main photo with thumbnails below. With more than one
// photo there are ‹ › buttons, a "2 / 4" counter, and swiping on phones.

const SWIPE_DISTANCE = 40;

const Main = styled.div`
  position: relative;
`;

// Sized like the product page's single photo; a little shorter on computers
// when thumbnails sit underneath.
const MainImage = styled.img`
  display: block;
  width: 100%;
  height: ${(props) => (props.withThumbs ? "calc(90vh - 88px)" : "90vh")};
  object-fit: cover;

  @media (max-width: 1024px) {
    height: 50vh;
  }

  @media (max-width: 768px) {
    height: auto;
    aspect-ratio: 4 / 5;
    max-height: 75vh;
  }
`;

const Arrow = styled.button`
  position: absolute;
  top: 50%;
  ${(props) => props.side}: 10px;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px;
  border: none;
  border-radius: 50%;
  background-color: #fff7f7;
  opacity: 0.85;
  cursor: pointer;
`;

const Counter = styled.span`
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 13px;
`;

const Thumbs = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;

  @media (max-width: 768px) {
    padding: 0px 16px;
  }
`;

const Thumb = styled.button`
  flex: none;
  width: 64px;
  height: 80px;
  padding: 0px;
  border: 2px solid ${(props) => (props.active ? "teal" : "transparent")};
  background: none;
  cursor: pointer;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

function ProductGallery({ photos, title }) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);
  const count = photos.length;
  const several = count > 1;

  // Another product's photos start from its main photo.
  const photoList = photos.join(",");
  useEffect(() => setIndex(0), [photoList]);

  const show = (next) => setIndex((next + count) % count);

  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < SWIPE_DISTANCE) return;
    show(distance < 0 ? index + 1 : index - 1);
  };

  if (count === 0) return null;
  const current = Math.min(index, count - 1);

  return (
    <div>
      <Main
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        onTouchEnd={handleTouchEnd}
      >
        <MainImage
          src={productImageUrl(photos[current])}
          alt={current === 0 ? title : `${title}, photo ${current + 1} of ${count}`}
          withThumbs={several}
        />
        {several && (
          <>
            <Arrow
              type="button"
              side="left"
              aria-label="Previous photo"
              onClick={() => show(current - 1)}
            >
              <KeyboardArrowLeftIcon />
            </Arrow>
            <Arrow
              type="button"
              side="right"
              aria-label="Next photo"
              onClick={() => show(current + 1)}
            >
              <KeyboardArrowRightIcon />
            </Arrow>
            <Counter aria-hidden="true">
              {current + 1} / {count}
            </Counter>
          </>
        )}
      </Main>
      {several && (
        <Thumbs>
          {photos.map((photo, i) => (
            <Thumb
              key={photo}
              type="button"
              active={i === current}
              aria-label={`Show photo ${i + 1} of ${count}`}
              aria-current={i === current ? "true" : undefined}
              onClick={() => setIndex(i)}
            >
              <img src={productImageUrl(photo)} alt="" />
            </Thumb>
          ))}
        </Thumbs>
      )}
    </div>
  );
}

export default ProductGallery;
