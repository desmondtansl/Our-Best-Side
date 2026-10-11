import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import Security from "./Security";
import { UserAuth } from "../../context/Auth";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}));
vi.mock("../../context/Auth", () => ({ UserAuth: vi.fn() }));

const renderAs = (data) => {
  const setUser = vi.fn();
  UserAuth.mockReturnValue([{ data, loading: false, error: null }, setUser]);
  render(<Security />);
  return setUser;
};

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { data: { enabled: false, recoveryCodesLeft: 0 } } });
  });

  it("changes the password and keeps this device logged in with the new token", async () => {
    const setUser = renderAs({ id: "u1", email: "sam@example.com", isAdmin: false });
    const updated = { id: "u1", email: "sam@example.com", isAdmin: false, isOwner: false, twoFactorEnabled: false };
    axios.post.mockResolvedValue({ data: { data: { token: "new-token", user: updated } } });
    fill("Current password", "old-password");
    fill("New password", "brand-new-pass");
    fill("New password again", "brand-new-pass");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/auth\/change-password$/), {
      currentPassword: "old-password",
      newPassword: "brand-new-pass",
    });
    expect(localStorage.getItem("token")).toBe("new-token");
    expect(setUser).toHaveBeenCalledWith({ data: updated, error: null, loading: false });
  });

  it("refuses new passwords that don't match, before asking the server", () => {
    renderAs({ id: "u1", email: "sam@example.com" });
    fill("Current password", "old-password");
    fill("New password", "brand-new-pass");
    fill("New password again", "brand-new-pas");
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("tells admins without two-step login that admin pages need it", () => {
    renderAs({ id: "a1", email: "admin@example.com", isAdmin: true, twoFactorEnabled: false });
    expect(screen.getByText(/Admin pages need two-step login/)).toBeInTheDocument();
  });

  it("sets up two-step login: QR code, first code, then the recovery codes", async () => {
    renderAs({ id: "u1", email: "sam@example.com", twoFactorEnabled: false });
    axios.post.mockImplementation(async (url) =>
      url.endsWith("/setup")
        ? { data: { data: { secret: "JBSWY3DPEHPK3PXP", otpauthUrl: "otpauth://totp/x", qrCode: "data:image/png;base64,AAA" } } }
        : {
            data: {
              data: {
                token: "new-token",
                user: { id: "u1", email: "sam@example.com", twoFactorEnabled: true },
                recoveryCodes: ["aaaa-bbbb-cccc", "dddd-eeee-ffff"],
              },
            },
          }
    );
    fill("Your password", "right-password");
    fireEvent.click(screen.getByRole("button", { name: "Set up two-step login" }));
    expect(await screen.findByAltText("QR code for your authenticator app")).toHaveAttribute("src", "data:image/png;base64,AAA");
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    fill("2. Enter the 6-digit code the app shows", "123456");
    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));
    const codes = await screen.findByLabelText("Recovery codes");
    expect(codes).toHaveTextContent("aaaa-bbbb-cccc");
    await waitFor(() => expect(localStorage.getItem("token")).toBe("new-token"));
  });
});
