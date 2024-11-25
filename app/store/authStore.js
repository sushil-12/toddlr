import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      error: null, // Added error state

      login: async (email, password) => {
        try {
          const response = await fetch("http://localhost:3000/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            // Handle server errors
            const errorData = await response.json();
            set({ error: errorData.message || "Login failed" });
            return;
          }

          const loggedInUser = await response.json();
          set({ user: loggedInUser });
          localStorage.setItem("user", JSON.stringify(loggedInUser));
        } catch (error) {
          set({ error: error.message || "An error occurred during login" });
        }
      },

      logout: () => {
        set({ user: null, error: null });
        localStorage.removeItem("user");
      },

      initializeUser: () => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
          set({ user: storedUser });
        }
      },
    }),
    {
      name: "auth-storage",
      getStorage: () => localStorage,
    }
  )
);

export default useAuthStore;