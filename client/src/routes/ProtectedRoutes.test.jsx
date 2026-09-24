import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoutes from "./ProtectedRoutes";
import { UserAuth } from "../context/Auth";

vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderAt = (user) => {
  UserAuth.mockReturnValue([user, vi.fn()]);
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/" element={<div>Home page</div>} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<div>Admin page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe("ProtectedRoutes", () => {
  it("redirects logged-out visitors home without crashing", () => {
    renderAt({ data: null, error: null, loading: false });
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("redirects non-admin users home", () => {
    renderAt({
      data: { email: "user@example.com", isAdmin: false },
      error: null,
      loading: false,
    });
    expect(screen.getByText("Home page")).toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("shows the protected page to admins", () => {
    renderAt({
      data: { email: "admin@example.com", isAdmin: true },
      error: null,
      loading: false,
    });
    expect(screen.getByText("Admin page")).toBeInTheDocument();
  });

  it("shows a spinner while the user is loading", () => {
    renderAt({ data: null, error: null, loading: true });
    expect(screen.getByTestId("HourglassBottomIcon")).toBeInTheDocument();
    expect(screen.queryByText("Home page")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });
});
