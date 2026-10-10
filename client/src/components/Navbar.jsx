import styled from "styled-components";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import React from "react";
import { UserAuth } from "../context/Auth";
import { Badge } from "@mui/material";
import SearchBar from "./SearchBar.jsx";
import MobileNav from "./MobileNav.jsx";
import useMediaQuery from "../hooks/useMediaQuery";
import { TABLET_QUERY } from "../config/breakpoints";

// Site header. Phones and tablets get the compact MobileNav; this desktop
// header is used on wider screens.

// min-height (not height) so the header grows when the search box wraps
// under the links, instead of overlapping the page.
const Container = styled.div`
  min-height: 60px;
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

// When the search box and links don't fit on one line (e.g. an admin's
// extra links), the search box wraps to the line below them.
const Right = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap-reverse;
  align-items: center;
  justify-content: flex-end;
`;

// Account/login links and the cart stay together on one line.
const Links = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const LogoLink = styled(Link)`
  color: inherit;
  text-decoration: none;
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
  const [user, setUser] = UserAuth();
  const navigate = useNavigate();
  const isTablet = useMediaQuery(TABLET_QUERY);

  const handleLogout = () => {
    setUser({ data: null, loading: false, error: null });
    localStorage.removeItem("token");
    navigate("/");
  };

  if (isTablet) {
    return (
      <MobileNav user={user.data} quantity={quantity} onLogout={handleLogout} />
    );
  }

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
          <LogoLink to="/">
            <Logo>Our Best Side</Logo>
          </LogoLink>
        </Center>
        <Right>
          <SearchBar />
          <Links>
            {user.data ? (
              <>
                <NavLink to="/account" style={{ textDecoration: "none" }}>
                  <MenuItems>Account</MenuItems>
                </NavLink>
                <NavLink to="/" style={{ textDecoration: "none" }}>
                  <MenuItems onClick={handleLogout}>Logout</MenuItems>
                </NavLink>
              </>
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
          </Links>
        </Right>
      </Wrapper>
    </Container>
  );
}
export default Navbar;
