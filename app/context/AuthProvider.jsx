"use client";

import { createContext, useContext, useEffect } from 'react';
import useAuthStore from "@/app/store/authStore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const user = useAuthStore((state) => state.user); // Get user state from store
    const initializeUser = useAuthStore((state) => state.initializeUser); // Get the initialize function

    useEffect(() => {
        // Initialize user only if it's not already set
        if (!user) {
            initializeUser();
        }
    }, [initializeUser, user]); // Add user to the dependencies

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    return useContext(AuthContext);
};
