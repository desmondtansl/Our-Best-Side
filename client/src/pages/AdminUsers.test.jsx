import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminUsers from "./AdminUsers";
import { UserAuth } from "../context/Auth";

vi.mock("../context/Auth", () => ({ UserAuth: vi.fn() }));
vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}));

const owner = { _id: "u1", email: "owner@example.com", isOwner: true };
const staff = { _id: "u2", email: "staff@example.com", isOwner: false };
const shopper = { _id: "u3", email: "shopper@example.com", isOwner: false };

const renderPage = () => {
  UserAuth.mockReturnValue([
    { data: { email: "owner@example.com", isAdmin: true, isOwner: true }, loading: false },
    vi.fn(),
  ]);
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>
  );
};

describe("AdminUsers", () => {
  beforeEach(() => {
    axios.get.mockResolvedValue({ data: { data: { admins: [owner, staff], log: [] } } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks() || vi.clearAllMocks());

  it("lists admins, marking the owner and you, with no Remove for the owner", async () => {
    renderPage();
    const ownerRow = (await screen.findByText("owner@example.com")).closest("div");
    expect(ownerRow).toHaveTextContent("Owner");
    expect(ownerRow).toHaveTextContent("You");
    expect(screen.getAllByRole("button", { name: "Remove access" })).toHaveLength(1);
    expect(screen.getByText("No changes made from this page yet.")).toBeInTheDocument();
  });

  it("grants access after confirming, then shows the new list and the change", async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          admins: [owner, shopper, staff],
          log: [
            {
              _id: "l1",
              action: "grant",
              email: "shopper@example.com",
              by: "owner@example.com",
              createdAt: "2026-10-10T02:00:00.000Z",
            },
          ],
        },
      },
    });
    renderPage();
    await screen.findByText("staff@example.com");
    fireEvent.change(screen.getByLabelText("Email of the person to make an admin"), {
      target: { value: " Shopper@Example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/^Give shopper@example.com admin access\?/));
    expect(await screen.findByRole("status")).toHaveTextContent("shopper@example.com is now an admin.");
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toMatch(/\/admin\/users\/grant$/);
    expect(body).toEqual({ email: "shopper@example.com" });
    expect(
      screen.getByText("owner@example.com gave admin access to shopper@example.com")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email of the person to make an admin")).toHaveValue("");
  });

  it("does nothing if the confirmation is cancelled", async () => {
    window.confirm.mockReturnValue(false);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove access" }));
    expect(window.confirm).toHaveBeenCalledWith("Remove admin access from staff@example.com?");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("removes access after confirming", async () => {
    axios.post.mockResolvedValue({
      data: {
        data: {
          admins: [owner],
          log: [
            {
              _id: "l2",
              action: "revoke",
              email: "staff@example.com",
              by: "owner@example.com",
              createdAt: "2026-10-10T02:00:00.000Z",
            },
          ],
        },
      },
    });
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Remove access" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "staff@example.com is no longer an admin."
    );
    expect(axios.post.mock.calls[0][0]).toMatch(/\/admin\/users\/revoke$/);
    expect(axios.post.mock.calls[0][1]).toEqual({ email: "staff@example.com" });
    expect(
      screen.getByText("owner@example.com removed admin access from staff@example.com")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Remove access" })).not.toBeInTheDocument()
    );
  });

  it("shows the server's message, e.g. when the person hasn't signed up", async () => {
    axios.post.mockRejectedValue({
      response: { data: { error: "No account uses that email. Ask them to sign up on the site first." } },
    });
    renderPage();
    await screen.findByText("staff@example.com");
    fireEvent.change(screen.getByLabelText("Email of the person to make an admin"), {
      target: { value: "nobody@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/sign up on the site first/);
    expect(screen.getByLabelText("Email of the person to make an admin")).toHaveValue(
      "nobody@example.com"
    );
  });
});
