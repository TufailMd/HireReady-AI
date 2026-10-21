
import { createContext, useEffect, useState } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const initializeAuth = async () => {
            try {
                const data = await getMe();

                if (active) {
                    setUser(data?.user ?? null);
                }
            } catch (err) {
                if (active) {
                    setUser(null);
                }

                if (err.response?.status !== 401) {
                    console.error(
                        "Auth initialization failed:",
                        err.response?.data || err.message
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        return () => {
            active = false;
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, setUser, loading, setLoading }}
        >
            {children}
        </AuthContext.Provider>
    );
};
