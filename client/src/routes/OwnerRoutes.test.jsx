import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoutes from "./ProtectedRoutes";
import OwnerRoutes from "./OwnerRoutes";
import { UserAuth } from "../context/Auth";

vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderAt = (data) => {
  UserAuth.mockReturnValue([{ data, error: null, loading: false }, vi.fn()]);
  return render(
    <MemoryRouter initialEntries={["/admin/users"]}>
      <Routes>
        <Route path="/" element={<div>Home page</div>} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route element={<OwnerRoutes />}>
            <Route path="/admin/users" element={<div>Manage Admins</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe("OwnerRoutes", () => {
  it("shows owner pages to the owner", () => {
    renderAt({ email: "owner@example.com", isAdmin: true, isOwner: true, twoFactorEnabled: true });
    expect(screen.getByText("Manage Admins")).toBeInTheDocument();
  });

  it("sends other admins back to the dashboard", () => {
    renderAt({ email: "staff@example.com", isAdmin: true, isOwner: false, twoFactorEnabled: true });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Manage Admins")).not.toBeInTheDocument();
  });

  it("sends shoppers home", () => {
    renderAt({ email: "shopper@example.com", isAdmin: false, isOwner: false });
    expect(screen.getByText("Home page")).toBeInTheDocument();
  });
});
