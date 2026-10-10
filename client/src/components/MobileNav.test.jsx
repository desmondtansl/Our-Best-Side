import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigationType } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import Navbar from "./Navbar";
import cartReducer, { addProduct } from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

// Pretend the screen is a phone (or not) for the header's media query.
const setPhone = (isPhone) => {
  window.matchMedia = vi.fn((query) => ({
    matches: isPhone && query === "(max-width: 1024px)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

function Location() {
  const location = useLocation();
  return (
    <>
      <div data-testid="location">{location.pathname + location.search}</div>
      <div data-testid="navigation">{useNavigationType()}</div>
    </>
  );
}

const renderHeader = ({ user = null, cartItems = 0, url = "/men" } = {}) => {
  const setUser = vi.fn();
  UserAuth.mockReturnValue([{ data: user, loading: false }, setUser]);
  const store = configureStore({ reducer: { cart: cartReducer } });
  for (let i = 0; i < cartItems; i++) {
    store.dispatch(addProduct({ _id: `p${i}`, title: "Tee", price: 10, quantity: 1 }));
  }
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="*" element={<Navbar />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </Provider>
  );
  return { setUser };
};

const location = () => screen.getByTestId("location").textContent;
// "PUSH" (a new history entry), "REPLACE", or "POP" (no navigation yet).
const navigation = () => screen.getByTestId("navigation").textContent;
const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

describe("header on phones and tablets", () => {
  const original = window.matchMedia;
  beforeEach(() => setPhone(true));
  afterEach(() => {
    window.matchMedia = original;
    localStorage.clear();
    document.body.style.overflow = "";
    vi.clearAllMocks();
  });

  it("is one bar with menu, search, logo, account and cart", () => {
    renderHeader({ cartItems: 2 });
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Our Best Side" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Cart, 2 items" })).toHaveAttribute("href", "/cart");
    // The desktop links aren't shown.
    expect(screen.queryByText("Ladies")).not.toBeInTheDocument();
  });

  it("opens a menu with the shop's pages, focus inside, and the page locked", () => {
    renderHeader({ cartItems: 1 });
    openMenu();
    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "true");
    expect(within(menu).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Home",
      "Men",
      "Ladies",
      "Log in",
      "Sign up",
      "Cart (1)",
    ]);
    expect(document.activeElement).toBe(within(menu).getByRole("button", { name: "Close menu" }));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes with Esc, the close button or a tap outside, returning focus", () => {
    renderHeader();
    const menuButton = screen.getByRole("button", { name: "Open menu" });

    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(menuButton);
    expect(document.body.style.overflow).toBe("");

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    openMenu();
    fireEvent.click(screen.getByTestId("menu-overlay"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab inside the open menu", () => {
    renderHeader();
    openMenu();
    const menu = screen.getByRole("dialog");
    const items = [...menu.querySelectorAll("a[href], button")];
    items[items.length - 1].focus();
    fireEvent.keyDown(menu, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(menu, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it("goes to the chosen page and closes the menu", () => {
    renderHeader();
    openMenu();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Ladies" }));
    expect(location()).toBe("/ladies");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows account, dashboard and logout for a logged-in admin", () => {
    localStorage.setItem("token", "t");
    const { setUser } = renderHeader({ user: { email: "a@b.com", isAdmin: true } });
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");

    openMenu();
    const menu = screen.getByRole("dialog");
    expect(within(menu).getByRole("link", { name: "My account" })).toHaveAttribute("href", "/account");
    expect(within(menu).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(within(menu).queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: "Logout" }));
    expect(setUser).toHaveBeenCalledWith({ data: null, loading: false, error: null });
    expect(localStorage.getItem("token")).toBeNull();
    expect(location()).toBe("/");
  });

  it("hides Dashboard from customers", () => {
    renderHeader({ user: { email: "c@d.com", isAdmin: false } });
    openMenu();
    expect(within(screen.getByRole("dialog")).queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  describe("the phone's Back button", () => {
    let pushState;
    let back;
    beforeEach(() => {
      pushState = vi.spyOn(window.history, "pushState");
      back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    });
    afterEach(() => {
      pushState.mockRestore();
      back.mockRestore();
    });

    it("closes the menu instead of leaving the page", () => {
      renderHeader();
      openMenu();
      expect(pushState).toHaveBeenCalledTimes(1);
      fireEvent.popState(window);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open menu" }));
      expect(document.body.style.overflow).toBe("");
      expect(location()).toBe("/men");
    });

    it("isn't needed after closing the menu with Esc, the close button or a tap outside", () => {
      renderHeader();
      openMenu();
      fireEvent.keyDown(document, { key: "Escape" });
      openMenu();
      fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
      openMenu();
      fireEvent.click(screen.getByTestId("menu-overlay"));
      // Each close removes the menu's history entry.
      expect(back).toHaveBeenCalledTimes(3);
      expect(location()).toBe("/men");
    });

    it("returns to the page the menu was opened on after following a link", () => {
      renderHeader();
      openMenu();
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Ladies" }));
      // The new page takes the menu's place in the history.
      expect(location()).toBe("/ladies");
      expect(navigation()).toBe("REPLACE");
      expect(back).not.toHaveBeenCalled();
    });

    it("just closes the menu for a link to the page already open", () => {
      renderHeader({ url: "/men" });
      openMenu();
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Men" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(navigation()).toBe("POP");
      expect(back).toHaveBeenCalledTimes(1);
    });

    it("returns to the page the menu was opened on after logging out", () => {
      localStorage.setItem("token", "t");
      renderHeader({ user: { email: "c@d.com", isAdmin: false } });
      openMenu();
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Logout" }));
      expect(location()).toBe("/");
      expect(navigation()).toBe("REPLACE");
      expect(back).not.toHaveBeenCalled();
    });
  });

  it("opens a full-width search box, ready to type", () => {
    renderHeader();
    const searchButton = screen.getByRole("button", { name: "Search" });
    fireEvent.click(searchButton);
    const box = screen.getByRole("combobox", { name: "Search products" });
    expect(document.activeElement).toBe(box);
    expect(screen.getByRole("button", { name: "Close search" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.change(box, { target: { value: "black jacket" } });
    fireEvent.submit(box);
    expect(location()).toBe("/results?q=black+jacket");
    // Opening the results page closes the search box.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("header on computers", () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  it("keeps the desktop links and search box", () => {
    setPhone(false);
    renderHeader();
    expect(screen.queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(screen.getByText("Ladies")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search products" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Our Best Side" })).toHaveAttribute("href", "/");
  });

  it("shows black links and a teal cart badge, like the mobile header", () => {
    setPhone(false);
    localStorage.setItem("token", "t");
    renderHeader({ user: { email: "a@b.com", isAdmin: true }, cartItems: 2 });
    for (const name of ["Men", "Ladies", "Account", "Logout", "Dashboard"]) {
      expect(getComputedStyle(screen.getByText(name)).color).toBe("rgb(0, 0, 0)");
    }
    const badge = screen.getByText("2");
    expect(getComputedStyle(badge).backgroundColor).toBe("rgb(0, 128, 128)");
    localStorage.clear();
  });

  it("logs out to the homepage, also from the keyboard", () => {
    setPhone(false);
    localStorage.setItem("token", "t");
    const { setUser } = renderHeader({ user: { email: "c@d.com", isAdmin: false } });
    // Pressing Enter on a link clicks the link itself, not the text inside.
    fireEvent.click(screen.getByText("Logout").closest("a"));
    expect(setUser).toHaveBeenCalledWith({ data: null, loading: false, error: null });
    expect(localStorage.getItem("token")).toBeNull();
    expect(location()).toBe("/");
    expect(navigation()).toBe("PUSH");
  });
});
