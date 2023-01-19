import axios from "axios";
import { useState } from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";

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

const InfoContainer = styled.div`
  display: flex;
  padding: 5px;
`;

function AdminSearchProduct() {
  const [data, setData] = useState({});
  const [query, setQuery] = useState("");

  const fetchProducts = async () => {
    const response = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/products/search/${query}`
    );
    console.log(query);
    setData(response.data);
    console.log(response);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <Container>
      <Wrapper>
        <Title>Search Database</Title>
        <Form onSubmit={handleSubmit}>
          <TitleHeader>Search Products</TitleHeader>
          <Input
            name="search"
            placeholder="search by name or desc"
            required
            onChange={(e) => setQuery(e.target.value)}
          />
          {<InfoContainer data={data} />}
          <Button type="submit">Search</Button>
        </Form>
        <InfoContainer>
          <table>
            <thead>
              <tr>
                <th>product title</th>
                <th>product description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {data?.data?.map((product, index) => (
                  <td key={index}>
                    <NavLink to={`/search/${product?._id}`}>
                      {product.title}
                    </NavLink>
                  </td>
                ))}
                {data?.data?.map((product, index) => (
                  <td key={index}>
                    <NavLink to={`/search/${product?._id}`}>
                      {product.description}
                    </NavLink>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </InfoContainer>
      </Wrapper>
    </Container>
  );
}

export default AdminSearchProduct;
