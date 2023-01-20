import styled from "styled-components";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Badge } from "@mui/material";

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
  const quantity = useSelector((state) => state.cart.quantity);

  return (
    <Container>
      <Wrapper>
        <Left>
          <NavLink to="/" style={{ textDecoration: "none" }}>
            <MenuItems>Home</MenuItems>
          </NavLink>
          <NavLink to="/men" style={{ textDecoration: "none" }}>
            <MenuItems>Men</MenuItems>
          </NavLink>
          <NavLink to="/ladies" style={{ textDecoration: "none" }}>
            <MenuItems>Ladies</MenuItems>
          </NavLink>
        </Left>
        <Center>
          <Logo>PLACEHOLDER</Logo>
        </Center>
        <Right>
          <NavLink to="/login" style={{ textDecoration: "none" }}>
            <MenuItems>Login</MenuItems>
          </NavLink>
          <NavLink to="/cart" style={{ textDecoration: "none" }}>
            <MenuItems>
              <Badge badgeContent={quantity}>
                <ShoppingCartOutlinedIcon />
              </Badge>
            </MenuItems>
          </NavLink>
        </Right>
      </Wrapper>
    </Container>
  );
}
export default Navbar;
