import styled from "styled-components";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Link } from "react-router-dom";

const Container = styled.div`
  height: 60px;
`;

const Wrapper = styled.div`
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const Center = styled.div`
  text-align: center;
  flex: 1;
`;

const Right = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const Logo = styled.h1`
  font-weight: bold;
`;

const MenuItems = styled.div`
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-left: 25px;
  padding: 10px 30px;
`;

function Navbar() {
  return (
    <Container>
      <Wrapper>
        <Left>
          <MenuItems>Home</MenuItems>
          <Link to="/men" style={{ textDecoration: "none" }}>
            <MenuItems>Men</MenuItems>
          </Link>
          <MenuItems>Ladies</MenuItems>
        </Left>
        <Center>
          <Logo>PLACEHOLDER</Logo>
        </Center>
        <Right>
          <MenuItems>Login/Register</MenuItems>
          <MenuItems>
            <ShoppingCartOutlinedIcon />
          </MenuItems>
        </Right>
      </Wrapper>
    </Container>
  );
}
export default Navbar;
