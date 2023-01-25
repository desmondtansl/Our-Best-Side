import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

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
  }

  const fetchUser = async () => {
    const { data: response } = await axios.get(
      `${import.meta.env.VITE_BASE_URL}/auth/user`
    );
    if (response.data && response.data.user) {
      setUser({
        data: {
          email: response.data.user.email,
        },
        loading: false,
        error: null,
      });
    } else if (response.data && response.data.errors.length) {
      setUser({
        data: null,
        loading: false,
        error: response.errors[0].message,
      });
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
export { UserContext };
