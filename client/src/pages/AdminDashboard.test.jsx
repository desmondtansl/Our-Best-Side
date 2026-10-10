import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import { UserAuth } from "../context/Auth";

vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderDashboard = () => {
  const setUser = vi.fn();
  UserAuth.mockReturnValue([{ data: { email: "a@b.com", isAdmin: true }, loading: false }, setUser]);
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/" element={<p>Homepage</p>} />
      </Routes>
    </MemoryRouter>
  );
  return { setUser };
};

describe("AdminDashboard", () => {
  afterEach(() => localStorage.clear());

  it("links to the admin pages in black, like the site's header", () => {
    renderDashboard();
    const links = [
      ["Upload New Products", "/upload"],
      ["Search and Edit Products", "/search"],
      ["Manage Orders", "/admin/orders"],
      ["Logout", "/"],
    ];
    for (const [name, href] of links) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
      expect(getComputedStyle(screen.getByText(name)).color).toBe("rgb(0, 0, 0)");
    }
  });

  it("logs out when the Logout link is followed, also from the keyboard", () => {
    localStorage.setItem("token", "t");
    const { setUser } = renderDashboard();
    // Pressing Enter on a link clicks the link itself, not the text inside.
    fireEvent.click(screen.getByRole("link", { name: "Logout" }));
    expect(setUser).toHaveBeenCalledWith({ data: null, loading: false, error: null });
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
  });
});
