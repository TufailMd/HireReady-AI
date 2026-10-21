import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  const { user, setUser, loading, setLoading, error, setError } = context;

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const data = await login({ email, password });

      if (!data?.user) {
        throw new Error("Login response does not contain a user");
      }

      setUser(data.user);
      return true;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Login failed";
      setError(message);
      console.error("Login failed:", message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);
    setError(null);

    try {
      const data = await register({ username, email, password });

      if (!data?.user) {
        throw new Error("Registration response does not contain a user");
      }

      setUser(data.user);
      return true;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Registration failed";
      setError(message);
      console.error("Registration failed:", message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError(null);

    try {
      await logout();
      setUser(null);
      return true;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Logout failed";
      setError(message);
      console.error("Logout failed:", message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};
