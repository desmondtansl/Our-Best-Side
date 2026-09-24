import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { UserProvider, UserAuth } from "./Auth";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

const ShowUser = () => {
  const [user] = UserAuth();
  return <pre data-testid="user">{JSON.stringify(user)}</pre>;
};

const renderedUser = () => JSON.parse(screen.getByTestId("user").textContent);

describe("UserProvider", () => {
  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("restores id and isAdmin from /auth/user when a token is stored", async () => {
    localStorage.setItem("token", "stored-token");
    axios.get.mockResolvedValue({
      data: {
        data: {
          user: { id: "user-1", email: "admin@example.com", isAdmin: true },
        },
      },
    });

    render(
      <UserProvider>
        <ShowUser />
      </UserProvider>
    );

    await waitFor(() => expect(renderedUser().loading).toBe(false));
    expect(renderedUser().data).toEqual({
      id: "user-1",
      email: "admin@example.com",
      isAdmin: true,
    });
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/user$/)
    );
  });

  it("finishes loading with no user when no token is stored", async () => {
    render(
      <UserProvider>
        <ShowUser />
      </UserProvider>
    );

    await waitFor(() => expect(renderedUser().loading).toBe(false));
    expect(renderedUser().data).toBeNull();
    expect(axios.get).not.toHaveBeenCalled();
  });
});
