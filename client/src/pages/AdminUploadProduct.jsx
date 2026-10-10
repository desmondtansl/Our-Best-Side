import axios from "axios";
import styled from "styled-components";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import BackToDashboard from "../components/BackToDashboard";
import { errorMessage } from "../utils/format";
import { productPath, toOptions } from "../utils/products";
import PhotoManager from "../components/admin/PhotoManager";
import SizeStockInputs, { sizeStockPayload } from "../components/admin/SizeStockInputs";
import useDocumentTitle from "../hooks/useDocumentTitle";

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

const Hint = styled.p`
  font-size: 13px;
  font-weight: 300;
`;

const StockHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

const StatusMessage = styled.p`
  font-size: 14px;
  color: ${(props) => (props.error ? "red" : "teal")};
`;

function AdminUploadProduct() {
  useDocumentTitle("Upload Product");
  const formRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  // { type: "success", product } or { type: "error", text }
  const [status, setStatus] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [sizeText, setSizeText] = useState("");
  const [sizeStock, setSizeStock] = useState({});
  const sizes = toOptions(sizeText);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (photos.length === 0) {
      setStatus({ type: "error", text: "Add at least one photo" });
      return;
    }
    setUploading(true);

    const form = formRef.current;
    const formData = new FormData(form);
    photos.forEach((photo) => formData.append("images", photo.file));
    const stock = sizeStockPayload(sizes, sizeStock);
    if (stock) formData.append("sizeStock", stock);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/products/upload`,
        formData
      );
      // Start the next product with an empty form.
      form.reset();
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
      setSizeText("");
      setSizeStock({});
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
          <PhotoManager items={photos} onChange={setPhotos} />
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
            value={sizeText}
            onChange={(e) => setSizeText(e.target.value)}
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
          <ProductPricesHeader as="label" htmlFor="compareAtPrice">
            "Was" price (optional)
          </ProductPricesHeader>
          <Input
            name="compareAtPrice"
            id="compareAtPrice"
            inputMode="decimal"
            placeholder="only for a sale: the old price, shown crossed out"
          />
          <StockHeader>Stock per Size</StockHeader>
          {sizes.length > 0 ? (
            <SizeStockInputs
              sizes={sizes}
              values={sizeStock}
              onChange={setSizeStock}
              required
            />
          ) : (
            <Hint>Enter the sizes above to add the stock for each size.</Hint>
          )}
          <FeaturedLabel>
            <input type="checkbox" name="featured" value="true" />
            Featured on homepage
          </FeaturedLabel>
          <FeaturedLabel>
            <input type="checkbox" name="status" value="draft" />
            Save as a draft (only admins see it until it&apos;s published)
          </FeaturedLabel>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Product"}
          </Button>
          {status?.type === "success" && (
            <StatusMessage role="status">
              {status.product.status === "draft" ? (
                <>
                  "{status.product.title}" was saved as a draft.{" "}
                  <Link to={`/search/${status.product._id}`}>Edit or publish it</Link>
                </>
              ) : (
                <>
                  "{status.product.title}" was uploaded.{" "}
                  <Link to={productPath(status.product)}>View product</Link>
                </>
              )}
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
