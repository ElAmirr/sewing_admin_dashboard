import React, { createContext, useContext, useState, useCallback } from "react";
import { api } from "../api/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = sessionStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    const login = useCallback(async (username, password) => {
        try {
            const res = await api.post("/auth/login", { username, password });
            const userData = res.data;
            setUser(userData);
            sessionStorage.setItem("user", JSON.stringify(userData));
            return userData;
        } catch (err) {
            throw new Error(err.response?.data?.error || "Login failed");
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        sessionStorage.removeItem("user");
    }, []);

    const isSuperAdmin = user?.role === "super_admin";

    return (
        <AuthContext.Provider value={{ user, login, logout, isSuperAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
