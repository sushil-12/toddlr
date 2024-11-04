"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/app/store/authStore";

const DashboardLayout = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const initializeUser = useAuthStore((state) => state.initializeUser);
    const router = useRouter();

    useEffect(() => {
        initializeUser(); // Load user from localStorage
        if (!user) {
            router.push("/login"); // Redirect to login if not authenticated
        }
    }, [user, router, initializeUser]);

    // Ensure the component only renders after initialization
    if (!user) {
        return null; // Or a loading spinner
    }

    return <>{children}</>; // Only render if user is authenticated
};

export default DashboardLayout;
