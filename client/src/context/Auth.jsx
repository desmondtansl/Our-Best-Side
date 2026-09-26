import React, { createContext, useState, useEffect, useContext } from "react";
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
          data: {
            id: response.data.user.id,
            email: response.data.user.email,
            isAdmin: response.data.user.isAdmin,
          },
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.log(error.message);
      console.log(error.response.data.error);
      return setUser({
        data: null,
        error: error.response.data.error,
        loading: false,
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
export const UserAuth = () => {
  return useContext(UserContext);
};
