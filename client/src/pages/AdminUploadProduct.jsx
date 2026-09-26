import axios from "axios";
import styled from "styled-components";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import { errorMessage } from "../utils/format";
import { productPath } from "../utils/products";

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

const FeaturedLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin: 14px 0px;
`;

const StatusMessage = styled.p`
  font-size: 14px;
  color: ${(props) => (props.error ? "red" : "teal")};
`;

const ProductQtyHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

function AdminUploadProduct() {
  const formRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  // { type: "success", product } or { type: "error", text }
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setUploading(true);

    const form = formRef.current;
    const formData = new FormData(form);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/products/upload`,
        formData
      );
      // Start the next product with an empty form.
      form.reset();
      setStatus({ type: "success", product: response.data.data });
    } catch (error) {
      setStatus({ type: "error", text: errorMessage(error, "Upload failed") });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container>
      <Wrapper>
        <BackToDashboard />
        <Title>Product Upload Form</Title>
        <Form
          ref={formRef}
          onSubmit={handleSubmit}
          encType="multipart/form-data"
          id="form"
          aria-label="Product upload form"
        >
          <TitleHeader>Enter Product Title</TitleHeader>
          <Input
            type="text"
            name="title"
            id="title"
            placeholder="e.g. Nike SB Tee, Moncler Swim Shorts"
            required
          />
          <ProductDescHeader>Enter Product Description</ProductDescHeader>
          <Input name="description" id="description" required />
          <ImageContainer>
            Upload Product Image
            <Input
              name="image"
              accept="image/*"
              id="image"
              type="file"
              required
            />
          </ImageContainer>
          <ProductCategoryHeader>Product Category</ProductCategoryHeader>
          <Input
            name="category"
            id="category"
            placeholder="Men or Ladies"
            required
          />
          <ProductSizesHeader>Product Sizes</ProductSizesHeader>
          <Input
            name="size"
            id="size"
            placeholder="separated by commas - e.g. S, M or US 6, US 7"
            required
          />
          <ProductColorsHeader>Product Colors</ProductColorsHeader>
          <Input
            name="color"
            id="color"
            placeholder="separated by commas - e.g. Black, Navy"
            required
          />
          <ProductPricesHeader>Product Prices</ProductPricesHeader>
          <Input
            name="price"
            id="price"
            placeholder="enter ONLY numbers w/o $ sign - e.g. 30, 40"
            required
          />
          <ProductQtyHeader>Product Inventory Qty</ProductQtyHeader>
          <Input
            name="inStock"
            id="inStock"
            placeholder="enter ONLY numbers"
            required
          />
          <FeaturedLabel>
            <input type="checkbox" name="featured" value="true" />
            Featured on homepage
          </FeaturedLabel>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Product"}
          </Button>
          {status?.type === "success" && (
            <StatusMessage role="status">
              "{status.product.title}" was uploaded.{" "}
              <Link to={productPath(status.product)}>View product</Link>
            </StatusMessage>
          )}
          {status?.type === "error" && (
            <StatusMessage role="alert" error>
              {status.text}
            </StatusMessage>
          )}
        </Form>
      </Wrapper>
    </Container>
  );
}

export default AdminUploadProduct;
