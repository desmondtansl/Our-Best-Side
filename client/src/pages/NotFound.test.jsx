import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import App from "../App";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(() => Promise.resolve({ data: { data: [] } })), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

describe("unknown addresses", () => {
  it("show a Page not found page with links back into the shop", () => {
    UserAuth.mockReturnValue([{ data: null, loading: false }, vi.fn()]);
    const store = configureStore({ reducer: { cart: cartReducer } });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/no-such-page"]}>
          <App />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Shop Men" })).toHaveAttribute("href", "/men");
    expect(screen.getByRole("link", { name: "Shop Ladies" })).toHaveAttribute("href", "/ladies");
    expect(document.title).toBe("Page not found | Our Best Side");
  });
});
