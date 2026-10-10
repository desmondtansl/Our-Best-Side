import { render, screen } from "@testing-library/react";
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
});
