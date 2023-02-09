import styled from "styled-components";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import React from "react";
import { UserAuth } from "../context/Auth";
import { Badge } from "@mui/material";

const Container = styled.div`
  height: 60px;

  @media (max-width: 820px) {
    height: auto;
  }

  @media (max-width: 768px) {
    height: auto;
  }

  @media (max-width: 540px) {
    height: auto;
  }

  @media (max-width: 414px) {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 375px) {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 360px) {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 280px) {
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

const Wrapper = styled.div`
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 820px) {
    width: 100%;
    padding: 10px 1px;
    align-items: center;
  }

  @media (max-width: 768px) {
    width: 100%;
    padding: 10px;
    align-items: center;
  }

  @media (max-width: 540px) {
    width: 100%;
    padding: 10px;
    flex-direction: column;
  }

  @media (max-width: 414px) {
    width: 100%;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 375px) {
    width: 100%;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 360px) {
    width: 100%;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
  }

  @media (max-width: 280px) {
    width: 100%;
    padding: 10px;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }
`;

const Left = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  @media (max-width: 414px) {
    width: 100%;
    margin-bottom: 10px;
    justify-content: center;
    display: flex;
    justify-content: space-around;
  }

  @media (max-width: 375px) {
    width: 100%;
    margin-bottom: 10px;
    justify-content: center;
    display: flex;
    justify-content: space-around;
  }

  @media (max-width: 360px) {
    width: 100%;
    margin-bottom: 10px;
    justify-content: center;
    display: flex;
    justify-content: space-around;
  }

  @media (max-width: 280px) {
    width: 100%;
    margin-bottom: 10px;
    justify-content: center;
    display: flex;
    justify-content: space-around;
  }
`;

const Center = styled.div`
  text-align: center;
  flex: 1;

  @media (max-width: 768px) {
    flex: 1;
    text-align: center;
    font-size: 13px;
  }

  @media (max-width: 360px) {
    flex: 1;
    text-align: center;
  }

  @media (max-width: 280px) {
    flex: 1;
    text-align: center;
  }
`;

const Right = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 768px) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  @media (max-width: 414px) {
    width: 100%;
    margin-top: 10px;
    justify-content: space-around;
  }

  @media (max-width: 375px) {
    width: 100%;
    margin-top: 10px;
    justify-content: space-around;
  }

  @media (max-width: 360px) {
    width: 100%;
    margin-top: 10px;
    justify-content: space-around;
  }

  @media (max-width: 280px) {
    width: 100%;
    margin-top: 10px;
    justify-content: space-around;
  }
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

  @media (max-width: 360px) {
    margin: 10px 0px;
    padding: 10px 0px;
    width: 100%;
    text-align: center;
  }

  @media (max-width: 280px) {
    margin: 10px 0px;
    padding: 10px 0px;
    width: 100%;
    text-align: center;
  }
`;

function Navbar() {
  const quantity = useSelector((state) => state.cart.quantity);
  const [user, setUser] = UserAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser({ data: null, loading: false, error: null });
    localStorage.removeItem("token");
    navigate("/");
  };

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
          <Logo>Our Best Side</Logo>
        </Center>
        <Right>
          {user.data ? (
            <NavLink to="/" style={{ textDecoration: "none" }}>
              <MenuItems onClick={handleLogout}>Logout</MenuItems>
            </NavLink>
          ) : (
            <NavLink to="/login" style={{ textDecoration: "none" }}>
              <MenuItems>Login</MenuItems>
            </NavLink>
          )}
          {user.data && user.data.isAdmin && (
            <NavLink to="/dashboard" style={{ textDecoration: "none" }}>
              Dashboard
            </NavLink>
          )}
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
