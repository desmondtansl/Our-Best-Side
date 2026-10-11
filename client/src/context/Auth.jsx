import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { userFrom } from "../utils/session";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    data: null,
    error: null,
    loading: true,
  });

  const token = localStorage.getItem("token");

  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    // After logout, stop sending the old token (e.g. at checkout).
    delete axios.defaults.headers.common["Authorization"];
  }

  const fetchUser = async () => {
    try {
      const { data: response } = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/auth/user`
      );
      if (response.data.user) {
        setUser({
          data: userFrom(response.data.user),
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      if (error?.response) {
        // The token is expired, or was logged out on all devices: forget it.
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["Authorization"];
        return setUser({ data: null, error: null, loading: false });
      }
      // The server can't be reached: keep the token for next time, and stop
      // waiting so pages don't stay on the loading icon.
      return setUser({ data: null, error: "Can't reach the server", loading: false });
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setUser({
        data: null,
        loading: false,
        error: null,
      });
    }
  }, []);

  return (
    <UserContext.Provider value={[user, setUser]}>
      {children}
    </UserContext.Provider>
  );
};
export const UserAuth = () => {
  return useContext(UserContext);
};
