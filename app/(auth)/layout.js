"use client";

import { AuthProvider } from "@/app/context/AuthProvider"; // Import your AuthProvider
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/app/store/authStore";

const AuthLayout = ({ children }) => {
    const user = useAuthStore((state) => state.user); // Access user from Zustand store
    const router = useRouter();

    useEffect(() => {
        // If user is already authenticated, redirect to the dashboard
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

    return (
        <AuthProvider>
            <div className="flex items-center justify-center h-screen bg-[#F5FBFB]"> {/* Background color */}
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </AuthProvider>
    );
};

export default AuthLayout;
