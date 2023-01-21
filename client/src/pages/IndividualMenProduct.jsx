import axios from "axios";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { addProduct } from "../redux/cartRedux";
import { useDispatch } from "react-redux";

const Container = styled.div``;

const Wrapper = styled.div`
  padding: 20px;
  display: flex;
`;

const ImageContainer = styled.div`
  flex: 1;
`;

const Image = styled.img`
  width: 100%;
  height: 90vh;
  object-fit: cover;
`;

const InfoContainer = styled.div`
  flex: 1;
  padding: 0px 50px;
`;

const Title = styled.h1`
  font-weight: 200;
`;

const Description = styled.p`
  margin: 20px 0px;
`;

const Price = styled.span`
  font-weight: 100;
  font-size: 40px;
`;

const FilterContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 50%;
  margin: 20px 0px;
`;

const Filter = styled.div`
  display: flex;
  align-items: center;
`;

const FilterTitle = styled.span`
  font-size: 20px;
  font-weight: 200;
`;

const FilterColor = styled.button`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 0px 5px;
  cursor: pointer;
`;

const FilterSize = styled.select`
  margin-left: 10px;
  padding: 5px;
  width: 50px;
`;

const FilterSizeOption = styled.option``;

const QtyContainer = styled.div`
  display: flex;
  align-items: center;
  width: 50%;
  justify-content: space-between;
`;

const QtyToggleContainer = styled.div`
  display: flex;
  align-items: center;
  font-weight: 700;
  cursor: pointer;
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
`;

function IndividualMenProduct() {
  const [data, setData] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const { params } = useParams();
  const dispatch = useDispatch();

  const fetchIndividualMenProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/men/${params}`
    );
    console.log(response.data);
    setData(response.data);
  };
  console.log(data);
  const handleQty = (type) => {
    if (type === "decrease") {
      quantity > 1 && setQuantity(quantity - 1);
    } else {
      setQuantity(quantity + 1);
    }
  };

  const sizeSelect = () => {
    const select = document.getElementById("size");
    const selectedIndex = select.selectedIndex;
    const optionValue = select.options[selectedIndex].value;
    setSize(optionValue);
    console.log(size);
  };

  const handleClick = () => {
    sizeSelect();
    dispatch(addProduct({ ...data.data, quantity, color, size }));
  };
  console.log(size);

  useEffect(() => {
    fetchIndividualMenProduct();
  }, []);
  console.log(data?.data?.size.toString().split(","));

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
              <FilterTitle>Color</FilterTitle>
              <FilterColor
                value={data?.data?.color}
                onClick={(e) => setColor(e.target.value)}
              >
                {data?.data?.color}
              </FilterColor>
            </Filter>
            <Filter>
              <FilterTitle>Size</FilterTitle>
              <FilterSize id="size" name="size">
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
