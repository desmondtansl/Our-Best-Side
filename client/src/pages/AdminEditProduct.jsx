import { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams } from "react-router-dom";

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Wrapper = styled.div`
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-size: 40px;
  font-weight: 600;
  padding: 10px;
`;

const ImageContainer = styled.p`
  font-size: 14px;
  padding: 10px;
  font-weight: 600;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 15px;
`;

const Input = styled.input`
  margin: 10px 0px;
  padding: 5px;
  min-width: 30%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Button = styled.button`
  cursor: pointer;
  align-items: center;
  font-size: 14px;
  padding: 5px;
`;

const SuccessContainer = styled.div`
  font-size: 14px;
  padding: 5px;
`;

const TitleHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductDescHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductCategoryHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductSizesHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductColorsHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductPricesHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const ProductQtyHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

function AdminEditProduct() {
  const [data, setData] = useState({});
  const { params } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState([""]);
  const [size, setSize] = useState([""]);
  const [color, setColor] = useState([""]);
  const [price, setPrice] = useState(0);
  const [inStock, setInStock] = useState(0);
  const [editedProduct, setEditedProduct] = useState("");

  const fetchProduct = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/${params}`
    );
    setData(response.data);
  };

  useEffect(() => {
    fetchProduct();
  }, []);

  const categoryStringSplitter = (category) => {
    return category.toString().split(/[,\s]+/);
  };

  const categoryArray = categoryStringSplitter(category);

  const sizeStringSplitter = (size) => {
    return size.toString().split(/[,\s]+/);
  };

  const sizeArray = sizeStringSplitter(size);

  const colorStringSplitter = (color) => {
    return color.toString().split(/[,\s]+/);
  };

  const colorArray = colorStringSplitter(color);

  const editProduct = async () => {
    try {
      const newResponse = await axios.put(
        `${import.meta.env.VITE_BASE_URL}/products/${params}`,
        {
          title: title,
          description: description,
          image: image,
          category: categoryArray,
          size: sizeArray,
          color: colorArray,
          price: price,
          inStock: inStock,
        }
      );
      setEditedProduct("success");
      return editedProduct;
    } catch (error) {
      console.log(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    editProduct();
    alert("Product successfully edited");
  };

  return (
    <Container>
      <Wrapper>
        <Title>Product Edit Form</Title>
        <Form onSubmit={handleSubmit} id="form" encType="multipart/form-data">
          <TitleHeader>Edit Product Title</TitleHeader>
          <Input
            defaultValue={data?.data?.title}
            type="text"
            name="title"
            id="title"
            required
            placeholder="e.g. Nike SB Tee, Moncler Swim Shorts"
            onChange={(e) => setTitle(e.target.value)}
          />
          <ProductDescHeader>Edit Product Description</ProductDescHeader>
          <Input
            defaultValue={data?.data?.description}
            name="description"
            id="description"
            required
            onChange={(e) => setDescription(e.target.value)}
          />
          <ImageContainer>
            Upload Product Image
            <Input
              name="image"
              accept="image/*"
              id="image"
              type="file"
              required
              onChange={(e) => setImage(e.target.value)}
            />
          </ImageContainer>
          <ProductCategoryHeader>Edit Product Category</ProductCategoryHeader>
          <Input
            defaultValue={data?.data?.category}
            name="category"
            id="category"
            required
            placeholder="Men or Ladies"
            onChange={(e) => setCategory(e.target.value)}
          />
          <ProductSizesHeader>Edit Product Sizes</ProductSizesHeader>
          <Input
            defaultValue={data?.data?.size}
            name="size"
            id="size"
            required
            placeholder="separated by commas - e.g. S, M or US 6, US 7"
            onChange={(e) => setSize(e.target.value)}
          />
          <ProductColorsHeader>Edit Product Colors</ProductColorsHeader>
          <Input
            defaultValue={data?.data?.color}
            name="color"
            required
            id="color"
            placeholder="separated by commas - e.g. Black, Navy"
            onChange={(e) => setColor(e.target.value)}
          />
          <ProductPricesHeader>Edit Product Price</ProductPricesHeader>
          <Input
            defaultValue={data?.data?.price}
            name="price"
            id="price"
            required
            placeholder="enter ONLY numbers w/o $ sign - e.g. 30, 40"
            onChange={(e) => setPrice(e.target.value)}
          />
          <ProductQtyHeader>Edit Product Inventory Qty</ProductQtyHeader>
          <Input
            defaultValue={data?.data?.inStock}
            name="inStock"
            id="inStock"
            required
            placeholder="enter ONLY numbers"
            onChange={(e) => setInStock(e.target.value)}
          />
          <Button type="submit">Edit Product</Button>
          {/* {editedProduct && (
            <SuccessContainer>Product Successfully Edited</SuccessContainer>
          )} */}
        </Form>
      </Wrapper>
    </Container>
  );
}

export default AdminEditProduct;
