import { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams } from "react-router-dom";
import BackToDashboard, { BackLink } from "../components/BackToDashboard";
import { toOptions, productPhotos } from "../utils/products";
import PhotoManager, { savedPhotoItems } from "../components/admin/PhotoManager";
import SizeStockInputs, { sizeStockPayload } from "../components/admin/SizeStockInputs";
import useDocumentTitle from "../hooks/useDocumentTitle";
import ProductStatusBar from "../components/admin/ProductStatusBar";
import { errorMessage } from "../utils/format";

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

const ProductQtyHeader = styled.p`
  font-size: 14px;
  font-weight: 600;
`;

function AdminEditProduct() {
  useDocumentTitle("Edit Product");
  const [data, setData] = useState({});
  const { params } = useParams();
  // Fields stay undefined until edited, so untouched fields are not sent
  // and keep their saved values.
  const [title, setTitle] = useState();
  const [description, setDescription] = useState();
  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState();
  const [size, setSize] = useState();
  const [color, setColor] = useState();
  const [price, setPrice] = useState();
  // The "was" price; an empty box ends the sale.
  const [compareAtPrice, setCompareAtPrice] = useState();
  const [inStock, setInStock] = useState();
  const [featured, setFeatured] = useState();
  // Stock per size, as typed: { S: "3", M: "0" }.
  const [sizeStock, setSizeStock] = useState({});
  const [editedProduct, setEditedProduct] = useState("");

  const fetchProduct = async () => {
    // The admin route loads drafts and archived products too.
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/admin/products/${params}`
    );
    setData(response.data);
    const product = response.data.data;
    setPhotos(savedPhotoItems(productPhotos(product)));
    setSizeStock(
      Object.fromEntries((product?.sizeStock || []).map((e) => [e.size, String(e.inStock)]))
    );
  };

  useEffect(() => {
    fetchProduct();
  }, []);

  // "US 8, US 9" -> ["US 8", "US 9"]: split on commas only.
  const stringSplitter = (value) => toOptions(value);

  // Show saved lists as editable text, e.g. ["S", "M"] -> "S, M".
  const listText = (value) => toOptions(value).join(", ");

  const sizes = toOptions(size ?? data?.data?.size);
  // Stock is per size when the product already tracks it that way, or once
  // any size's box is filled in (then every size needs a number).
  const tracksSizes = data?.data?.sizeStock?.length > 0;
  const perSize =
    tracksSizes || sizes.some((option) => (sizeStock[option] ?? "") !== "");

  const editProduct = async () => {
    const formData = new FormData();
    const fields = {
      title,
      description,
      price,
      compareAtPrice,
      inStock: perSize ? undefined : inStock,
      featured,
    };
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) formData.append(key, value);
    }
    const listFields = { category, size, color };
    for (const [key, value] of Object.entries(listFields)) {
      if (value !== undefined) {
        stringSplitter(value).forEach((item) => formData.append(key, item));
      }
    }
    // Photos are sent only when changed: their order (saved photos by key,
    // new ones as "new:N") and the new files.
    const newPhotos = photos.filter((photo) => photo.file);
    const order = photos.map((photo) =>
      photo.file ? `new:${newPhotos.indexOf(photo)}` : photo.key
    );
    if (newPhotos.length || order.join() !== productPhotos(data?.data).join()) {
      formData.append("photoOrder", JSON.stringify(order));
      newPhotos.forEach((photo) => formData.append("images", photo.file));
    }
    if (perSize) {
      const stock = sizeStockPayload(sizes, sizeStock);
      if (!stock) throw new Error("Enter the stock for every size");
      formData.append("sizeStock", stock);
    }

    await axios.put(
      `${import.meta.env.VITE_BASE_URL}/products/${params}`,
      formData
    );
    setEditedProduct("success");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (photos.length === 0) {
      alert("Add at least one photo");
      return;
    }
    try {
      await editProduct();
      alert("Product successfully edited");
    } catch (error) {
      console.log(error.message);
      alert(error.response ? errorMessage(error, "Failed to edit product") : "Failed to edit product");
    }
  };

  return (
    <Container>
      <Wrapper>
        <BackToDashboard />
        <BackLink to="/search">← All products</BackLink>
        <Title>Product Edit Form</Title>
        {data?.data && (
          <ProductStatusBar
            product={data.data}
            onChanged={(product) => setData({ ...data, data: product })}
          />
        )}
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
          <PhotoManager items={photos} onChange={setPhotos} />
          <ProductCategoryHeader>Edit Product Category</ProductCategoryHeader>
          <Input
            defaultValue={data?.data ? listText(data.data.category) : undefined}
            name="category"
            id="category"
            required
            placeholder="Men or Ladies"
            onChange={(e) => setCategory(e.target.value)}
          />
          <ProductSizesHeader>Edit Product Sizes</ProductSizesHeader>
          <Input
            defaultValue={data?.data ? listText(data.data.size) : undefined}
            name="size"
            id="size"
            required
            placeholder="separated by commas - e.g. S, M or US 6, US 7"
            onChange={(e) => setSize(e.target.value)}
          />
          <ProductColorsHeader>Edit Product Colors</ProductColorsHeader>
          <Input
            defaultValue={data?.data ? listText(data.data.color) : undefined}
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
          <ProductPricesHeader as="label" htmlFor="compareAtPrice">
            "Was" price (optional)
          </ProductPricesHeader>
          <Input
            defaultValue={data?.data?.compareAtPrice ?? ""}
            name="compareAtPrice"
            id="compareAtPrice"
            inputMode="decimal"
            placeholder="only for a sale: the old price, shown crossed out"
            onChange={(e) => setCompareAtPrice(e.target.value)}
          />
          <Hint>Empty this box to end the sale.</Hint>
          <ProductQtyHeader>Stock per Size</ProductQtyHeader>
          {data?.data && !tracksSizes && (
            <Hint>
              Stock is tracked for the whole product ({data.data.inStock ?? "not set"}). To
              track it per size, fill in every size; otherwise leave these empty.
            </Hint>
          )}
          <SizeStockInputs
            sizes={sizes}
            values={sizeStock}
            onChange={setSizeStock}
            required={perSize}
          />
          {!perSize && (
            <>
              <ProductQtyHeader>Edit Product Inventory Qty</ProductQtyHeader>
              <Input
                defaultValue={data?.data?.inStock}
                name="inStock"
                id="inStock"
                required
                placeholder="enter ONLY numbers"
                onChange={(e) => setInStock(e.target.value)}
              />
            </>
          )}
          <FeaturedLabel>
            <input
              type="checkbox"
              name="featured"
              checked={featured ?? Boolean(data?.data?.featured)}
              onChange={(e) => setFeatured(e.target.checked)}
            />
            Featured on homepage
          </FeaturedLabel>
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
