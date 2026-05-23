"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  goal: string;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; goal: string }) => Promise<void>;
  logout: () => void;
};

type AuthResponse = {
  sessionToken: string;
  user: User;
};

const STORAGE_KEY = "nextyra-session-token";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEY);

    if (!token) {
      return;
    }

    apiFetch<{ user: User }>(`/api/auth/me?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      });
  }, []);

  async function authenticate(path: "/api/auth/login" | "/api/auth/signup", body: object) {
    const response = await apiFetch<AuthResponse>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    window.localStorage.setItem(STORAGE_KEY, response.sessionToken);
    setUser(response.user);
  }

  async function login(email: string, password: string) {
    try {
      await authenticate("/api/auth/login", { email, password });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new Error("Unable to sign in right now.");
    }
  }

  async function signup(payload: { name: string; email: string; password: string; goal: string }) {
    try {
      await authenticate("/api/auth/signup", payload);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new Error("Unable to create your account right now.");
    }
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, ready, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
