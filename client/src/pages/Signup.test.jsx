import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import axios from "axios";
import Signup from "./Signup";
import cartReducer from "../redux/cartRedux";
import { UserAuth } from "../context/Auth";

vi.mock("axios", () => ({
  default: { post: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const setUser = vi.fn();

const renderSignup = () => {
  UserAuth.mockReturnValue([{ data: null, loading: false }, setUser]);
  return render(
    <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/account" element={<div>Account page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const submit = () => {
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByText("Signup"));
};

describe("Signup", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("signs the new user in and opens their account", async () => {
    axios.post.mockResolvedValue({
      data: { data: { token: "new-token", user: { id: "u1", email: "new@example.com" } } },
    });
    renderSignup();
    submit();

    expect(await screen.findByText("Account page")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(setUser).toHaveBeenCalledWith({
      data: { id: "u1", email: "new@example.com", isAdmin: false },
      error: null,
      loading: false,
    });
  });

  it("shows the server's message when the email is taken", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: [{ msg: "Email already in use" }] } },
    });
    renderSignup();
    submit();
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Email already in use"));
  });

  it("says the server can't be reached instead of 'undefined'", async () => {
    axios.post.mockRejectedValue({ request: {}, message: "Network Error" });
    renderSignup();
    submit();
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith("Can't reach the server")
    );
  });
});
