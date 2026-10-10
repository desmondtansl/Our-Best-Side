import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SearchBar from "./SearchBar.jsx";
import useModal from "../hooks/useModal";

// Header for phones and tablets: one slim bar that stays at the top of the
// screen, with a menu button (opens a slide-out menu), search, the logo, and
// account and cart icons.

const Header = styled.header`
  position: sticky;
  top: 0px;
  z-index: 100;
  background: white;
  border-bottom: 0.5px solid lightgray;
`;

// The logo takes the space between the two icon groups (which are the same
// width, so it stays centred) and the icons always fit, down to 280px wide.
const Bar = styled.div`
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0px 6px;

  @media (max-width: 320px) {
    padding: 0px 4px;
  }
`;

const Side = styled.div`
  flex: none;
  display: flex;
  align-items: center;
`;

// 44px: the minimum comfortable tap size on phones (40px on the very
// narrowest screens, e.g. a folded Galaxy Z Fold, so everything fits).
const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0px;
  border: none;
  background: none;
  color: black;
  cursor: pointer;

  @media (max-width: 320px) {
    width: 40px;
  }
`;

const IconLink = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  color: black;

  @media (max-width: 320px) {
    width: 40px;
  }
`;

// Shrinks a little on very narrow phones (20px down to 15px at 280px wide).
const Logo = styled(Link)`
  flex: 1;
  min-width: 0px;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  color: black;
  text-decoration: none;
  font-size: clamp(15px, 5.2vw, 20px);
  font-weight: bold;
  white-space: nowrap;
`;

const SearchRow = styled.div`
  padding: 0px 12px 12px;
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0px;
  z-index: 200;
  background: rgba(0, 0, 0, 0.4);
  animation: ${fadeIn} 0.2s ease;
`;

const Drawer = styled.nav`
  position: fixed;
  top: 0px;
  bottom: 0px;
  left: 0px;
  z-index: 201;
  width: min(320px, 85vw);
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 4px 0px 20px rgba(0, 0, 0, 0.15);
  overflow-y: auto;
  animation: ${slideIn} 0.25s ease;
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0px 6px 0px 20px;
  border-bottom: 0.5px solid lightgray;
  font-size: 20px;
  font-weight: bold;
`;

const MenuList = styled.ul`
  margin: 0px;
  padding: 8px 0px;
  list-style: none;

  & + & {
    border-top: 0.5px solid lightgray;
  }
`;

const menuItemStyles = `
  display: block;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: none;
  color: black;
  font-family: inherit;
  font-size: 18px;
  font-weight: 500;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background-color: #f8f4f4;
  }
`;

const MenuLink = styled(Link)`
  ${menuItemStyles}
`;

const MenuButton = styled.button`
  ${menuItemStyles}
`;

const SECTIONS = [
  { to: "/", label: "Home" },
  { to: "/men", label: "Men" },
  { to: "/ladies", label: "Ladies" },
];

function MobileNav({ user, quantity, onLogout }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const drawerRef = useRef(null);

  // Opening another page closes the menu and the search box.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // While the menu is open: focus moves into it (and back to the menu button
  // when it closes), Esc closes it, Tab stays inside and the page is locked.
  const trapFocus = useModal(menuOpen, {
    onClose: () => setMenuOpen(false),
    containerRef: drawerRef,
    returnFocusRef: menuButtonRef,
  });

  const close = () => setMenuOpen(false);

  return (
    <Header>
      <Bar>
        <Side>
          <IconButton
            ref={menuButtonRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <IconButton
            type="button"
            aria-label={searchOpen ? "Close search" : "Search"}
            aria-expanded={searchOpen}
            aria-controls="mobile-search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </IconButton>
        </Side>
        <Logo to="/">Our Best Side</Logo>
        <Side>
          <IconLink
            to={user ? "/account" : "/login"}
            aria-label={user ? "My account" : "Log in"}
          >
            <PersonOutlineIcon />
          </IconLink>
          <IconLink
            to="/cart"
            aria-label={`Cart, ${quantity} ${quantity === 1 ? "item" : "items"}`}
          >
            <Badge
              badgeContent={quantity}
              sx={{
                "& .MuiBadge-badge": {
                  backgroundColor: "teal",
                  color: "white",
                },
              }}
            >
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconLink>
        </Side>
      </Bar>
      {searchOpen && (
        <SearchRow id="mobile-search">
          <SearchBar fullWidth autoFocus />
        </SearchRow>
      )}
      {menuOpen && (
        <>
          <Overlay onClick={close} data-testid="menu-overlay" />
          <Drawer
            id="mobile-menu"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onKeyDown={trapFocus}
          >
            <DrawerHeader>
              Our Best Side
              <IconButton type="button" aria-label="Close menu" onClick={close}>
                <CloseIcon />
              </IconButton>
            </DrawerHeader>
            <MenuList>
              {SECTIONS.map(({ to, label }) => (
                <li key={to}>
                  <MenuLink to={to} onClick={close}>
                    {label}
                  </MenuLink>
                </li>
              ))}
            </MenuList>
            <MenuList>
              {user ? (
                <>
                  <li>
                    <MenuLink to="/account" onClick={close}>
                      My account
                    </MenuLink>
                  </li>
                  {user.isAdmin && (
                    <li>
                      <MenuLink to="/dashboard" onClick={close}>
                        Dashboard
                      </MenuLink>
                    </li>
                  )}
                  <li>
                    <MenuButton
                      type="button"
                      onClick={() => {
                        close();
                        onLogout();
                      }}
                    >
                      Logout
                    </MenuButton>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <MenuLink to="/login" onClick={close}>
                      Log in
                    </MenuLink>
                  </li>
                  <li>
                    <MenuLink to="/signup" onClick={close}>
                      Sign up
                    </MenuLink>
                  </li>
                </>
              )}
              <li>
                <MenuLink to="/cart" onClick={close}>
                  Cart{quantity > 0 ? ` (${quantity})` : ""}
                </MenuLink>
              </li>
            </MenuList>
          </Drawer>
        </>
      )}
    </Header>
  );
}

export default MobileNav;
