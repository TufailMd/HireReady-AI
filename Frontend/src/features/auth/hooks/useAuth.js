import { useContext, useEffect } from "react";
import { AuthContext } from "../context/auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user, setUser, loading, setLoading, initializing, setInitializing } = context;

  // Login
  const handleLogin = async ({ email, password }) => {
    setLoading(true);

    try {
      const data = await login({ email, password });
      setUser(data.user);
      return data;
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register
  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);

    try {
      const data = await register({
        username,
        email,
        password,
      });

      setUser(data.user);
      return data;
    } catch (err) {
      console.error("Registration failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    setLoading(true);

    try {
      await logout();
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get logged-in user
  useEffect(() => {
    const getAndSetUser = async () => {
      try {
        const data = await getMe();
        setUser(data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setUser(null);
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    getAndSetUser();
  }, [setUser, setLoading, setInitializing]);

  return {
    user,
    loading,
    initializing,
    handleRegister,
    handleLogin,
    handleLogout,
  };
};
