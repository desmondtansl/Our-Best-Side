import { render, screen, fireEvent } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Login from "./Login";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

describe("Login", () => {
  it("links to sign up with an ordinary underlined text link", () => {
    UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
    const store = configureStore({ reducer: { cart: cartReducer } });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );
    const link = screen.getByRole("link", { name: "Sign up here" });
    expect(link).toHaveAttribute("href", "/signup");
    // Nothing turns its underline off: links are black, so the underline is
    // what shows it's a link.
    expect(link.style.textDecoration).toBe("");
  });

  const renderLogin = () => {
    UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
    const store = configureStore({ reducer: { cart: cartReducer } });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
  };

  it("shows a wrong password on the page", async () => {
    axios.post.mockRejectedValue({
      response: { status: 401, data: { error: [{ message: "Invalid credentials" }] } },
    });
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
  });

  it("shows the message when there have been too many attempts", async () => {
    axios.post.mockRejectedValue({
      response: {
        status: 429,
        data: { error: [{ message: "Too many login attempts. Please wait a few minutes and try again." }] },
      },
    });
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many login attempts");
    expect(screen.getByRole("button", { name: "Login" })).not.toBeDisabled();
  });

  it("doesn't crash when the server can't be reached", async () => {
    axios.post.mockRejectedValue({ request: {}, message: "Network Error" });
    renderLogin();
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server");
  });
});
