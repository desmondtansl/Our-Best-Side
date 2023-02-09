import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { addProduct } from "../redux/cartRedux";
import { useDispatch } from "react-redux";

const Container = styled.div`
  @media (max-width: 1024px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 0px 10px;
  }
  @media (max-width: 414px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 375px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 360px) {
    width: 100%;
    padding: 0px 10px;
  }

  @media (max-width: 280px) {
    width: 100%;
    padding: 0px 10px;
  }
`;

const Wrapper = styled.div`
  padding: 20px;
  display: flex;

  @media (max-width: 1024px) {
    padding: 10px;
  }

  @media (max-width: 768px) {
    padding: 10px;
  }

  @media (max-width: 414px) {
    padding: 10px;
  }

  @media (max-width: 375px) {
    padding: 10px;
  }

  @media (max-width: 360px) {
    padding: 10px;
  }

  @media (max-width: 280px) {
    padding: 10px;
  }
`;

const ImageContainer = styled.div`
  flex: 1;

  @media (max-width: 1024px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 414px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 375px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 360px) {
    width: 100%;
    height: 50vh;
  }

  @media (max-width: 280px) {
    width: 100%;
    height: 50vh;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 90vh;
  object-fit: cover;

  @media (max-width: 1024px) {
    height: 50vh;
  }

  @media (max-width: 820px) {
    height: 50vh;
  }

  @media (max-width: 768px) {
    height: 50vh;
  }

  @media (max-width: 414px) {
    height: 50vh;
  }

  @media (max-width: 375px) {
    height: 50vh;
  }

  @media (max-width: 360px) {
    height: 50vh;
  }

  @media (max-width: 280px) {
    height: 50vh;
  }
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;

  @media (max-width: 768px) {
    padding: 0px 10px;
  }

  @media (max-width: 414px) {
    padding: 0px 10px;
  }

  @media (max-width: 375px) {
    padding: 0px 10px;
  }

  @media (max-width: 360px) {
    padding: 0px 10px;
  }

  @media (max-width: 280px) {
    padding: 0px 10px;
  }
`;

const Title = styled.h1`
  font-weight: 200;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 26px;
    font-weight: 300;
  }

  @media (max-width: 414px) {
    font-size: 20px;
  }

  @media (max-width: 375px) {
    font-size: 20px;
  }

  @media (max-width: 360px) {
    font-size: 20px;
  }

  @media (max-width: 280px) {
    font-size: 20px;
  }
`;

const Description = styled.p`
  margin: 20px 0px;
  font-size: 20px;

  @media (max-width: 768px) {
    font-size: 16px;
    margin: 10px 0px;
    font-weight: 350;
  }

  @media (max-width: 414px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 375px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 360px) {
    font-size: 14px;
    margin: 10px 0px;
  }

  @media (max-width: 280px) {
    font-size: 14px;
    margin: 10px 0px;
  }
`;

const Price = styled.span`
  font-weight: 100;
  font-size: 40px;

  @media (max-width: 768px) {
    font-size: 24px;
    font-weight: 200;
  }

  @media (max-width: 414px) {
    font-size: 20px;
  }

  @media (max-width: 375px) {
    font-size: 20px;
  }

  @media (max-width: 360px) {
    font-size: 20px;
  }

  @media (max-width: 280px) {
    font-size: 20px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 50%;
  margin: 20px 0px;

  @media (max-width: 1024px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 820px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 768px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 414px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 375px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 360px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }

  @media (max-width: 280px) {
    width: 100%;
    flex-wrap: wrap;
    margin: 10px 0px;
  }
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
`;

const FilterTitle = styled.span`
  font-size: 20px;
  font-weight: 200;

  @media (max-width: 414px) {
    font-size: 16px;
  }

  @media (max-width: 375px) {
    font-size: 16px;
  }

  @media (max-width: 360px) {
    font-size: 16px;
  }

  @media (max-width: 280px) {
    font-size: 16px;
  }
`;

const FilterColor = styled.button`
  justify-content: center;
  align-items: center;
  width: 50px;
  margin-left: 10px;
  padding: 5px;
  border: 2px solid teal;
  background: white;
  cursor: pointer;
  &:hover {
    background-color: #f8f4f4;
  }

  @media (max-width: 375px) {
    margin-bottom: 10px;
  }

  @media (max-width: 360px) {
    margin-bottom: 10px;
  }

  @media (max-width: 280px) {
    margin-bottom: 10px;
  }
`;

const FilterSize = styled.select`
  margin-left: 10px;
  padding: 5px;
  width: 70px;

  @media (max-width: 414px) {
    width: 100%;
  }

  @media (max-width: 375px) {
    width: 100%;
  }

  @media (max-width: 360px) {
    width: 100%;
  }

  @media (max-width: 280px) {
    width: 100%;
  }
`;

const FilterSizeOption = styled.option``;

const QtyContainer = styled.div`
  display: flex;
  align-items: center;
  width: 50%;
  justify-content: space-between;

  @media (max-width: 414px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 375px) {
    flex-direction: column;
    align-items: flex-start;
  }

  @media (max-width: 280px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const QtyToggleContainer = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 414px) {
    margin-bottom: 10px;
  }

  @media (max-width: 375px) {
    margin-bottom: 10px;
  }

  @media (max-width: 280px) {
    margin-bottom: 10px;
  }
`;

const Amount = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid teal;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0px 5px;

  @media (max-width: 820px) {
    margin: 5px 0px;
  }

  @media (max-width: 414px) {
    margin: 5px 0px;
  }

  @media (max-width: 375px) {
    margin: 5px 0px;
  }

  @media (max-width: 280px) {
    margin: 5px 0px;
  }
`;

const Button = styled.button`
  padding: 15px;
  border: 2px solid teal;
  cursor: pointer;
  background-color: white;
  font-weight: 500;

  &:hover {
    background-color: #f8f4f4;
  }

  @media (max-width: 820px) {
    margin: 5px;
    padding: 10px;
  }
`;

function IndividualMenProduct() {
  const [data, setData] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("S");
  const { params } = useParams();
  const dispatch = useDispatch();

  const fetchIndividualMenProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/men/${params}`
    );
    setData(response.data);
  };

  const handleQty = (type) => {
    if (type === "decrease") {
      quantity > 1 && setQuantity(quantity - 1);
    } else {
      setQuantity(quantity + 1);
    }
  };

  const handleClick = () => {
    dispatch(addProduct({ ...data.data, quantity, color, size }));
  };

  useEffect(() => {
    fetchIndividualMenProduct();
  }, []);

  return (
    <Container>
      <Navbar />
      <Wrapper>
        <ImageContainer>
          <Image
            src={`https://desmondecommercesite.s3.ap-southeast-1.amazonaws.com/${data?.data?.image}`}
          />
        </ImageContainer>
        <InfoContainer>
          <Title>{data?.data?.title}</Title>
          <Description>{data?.data?.description}</Description>
          <Price>${data?.data?.price}</Price>
          <FilterContainer>
            <Filter>
              <FilterTitle>Color: </FilterTitle>
              <FilterColor
                value={data?.data?.color}
                onClick={(e) => setColor(e.target.value)}
              >
                {data?.data?.color}
              </FilterColor>
            </Filter>
            <Filter>
              <FilterTitle>Size</FilterTitle>
              <FilterSize
                id="size"
                name="size"
                onChange={(e) => setSize(e.target.value)}
              >
                {data?.data?.size
                  .toString()
                  .split(",")
                  .map((element) => (
                    <FilterSizeOption value={element} key={element}>
                      {element}
                    </FilterSizeOption>
                  ))}
              </FilterSize>
            </Filter>
          </FilterContainer>
          <QtyContainer>
            <QtyToggleContainer>
              <RemoveIcon onClick={() => handleQty("decrease")} />
              <Amount>{quantity}</Amount>
              <AddIcon onClick={() => handleQty("increase")} />
            </QtyToggleContainer>
            <Button onClick={handleClick}>Add to Cart</Button>
          </QtyContainer>
        </InfoContainer>
      </Wrapper>
      <Footer />
    </Container>
  );
}

export default IndividualMenProduct;
