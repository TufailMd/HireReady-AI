import { useState } from "react";
import { AuthContext } from "./auth.context";

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(true);

    return (
        <AuthContext.Provider
            value={{ user, setUser, loading, setLoading, initializing, setInitializing }}
        >
            {children}
        </AuthContext.Provider>
    );
};