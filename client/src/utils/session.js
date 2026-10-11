import axios from "axios";

// The user details the site keeps after logging in (from the API's user
// summary).
export const userFrom = (user) => ({
  id: user.id,
  email: user.email,
  isAdmin: Boolean(user.isAdmin),
  isOwner: Boolean(user.isOwner),
  twoFactorEnabled: Boolean(user.twoFactorEnabled),
});

// Saves a login token (after logging in, or a new one after changing the
// password or two-step login) and sends it with every request.
export const startSession = (token) => {
  localStorage.setItem("token", token);
  axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Logs this device out. The server is told too, so the token stops working
// there as well; the browser forgets it either way.
export const endSession = () => {
  let token = null;
  try {
    token = localStorage.getItem("token");
    localStorage.removeItem("token");
  } catch (error) {
    // Storage unavailable: nothing saved to forget.
  }
  delete axios.defaults.headers.common["Authorization"];
  if (token) {
    axios
      .post(`${import.meta.env.VITE_BASE_URL}/auth/logout`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => {});
  }
};
