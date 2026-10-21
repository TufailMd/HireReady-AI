import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  const { user, setUser, loading, setLoading } = context;

  const handleLogin = async ({ email, password }) => {
    setLoading(true);

    try {
      const data = await login({ email, password });

      if (!data?.user) {
        throw new Error("Login response does not contain a user");
      }

      setUser(data.user);
      return true;
    } catch (err) {
      console.error("Login failed:", err.response?.data || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);

    try {
      const data = await register({ username, email, password });

      if (!data?.user) {
        throw new Error("Registration response does not contain a user");
      }

      setUser(data.user);
      return true;
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      await logout();
      setUser(null);
      return true;
    } catch (err) {
      console.error("Logout failed:", err.response?.data || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};
