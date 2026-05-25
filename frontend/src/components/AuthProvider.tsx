"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  goal: string;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  experienceLevel?: string | null;
  subscriptionTier?: string | null;
};

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; goal: string }) => Promise<void>;
  onboard: (payload: { age: number; weightKg: number; heightCm: number; experienceLevel: string; goal: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
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
  onboard: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEY);

    if (!token) {
      setReady(true);
      return;
    }

    apiFetch<{ user: User }>(`/api/auth/me?token=${encodeURIComponent(token)}`)
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      })
      .finally(() => {
        setReady(true);
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

  async function onboard(payload: { age: number; weightKg: number; heightCm: number; experienceLevel: string; goal: string }) {
    try {
      const token = window.localStorage.getItem(STORAGE_KEY);
      if (!token) throw new Error("Unauthorized");

      const response = await apiFetch<{ user: User }>("/api/auth/onboard", {
        method: "PATCH",
        body: JSON.stringify({ token, ...payload }),
      });

      setUser(response.user);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error("Unable to save your onboarding details.");
    }
  }

  function logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  async function refreshUser() {
    const token = window.localStorage.getItem(STORAGE_KEY);
    if (!token) return;
    try {
      const response = await apiFetch<{ user: User }>(`/api/auth/me?token=${encodeURIComponent(token)}`);
      setUser(response.user);
    } catch (e) {
      console.error("Refresh user failed", e);
    }
  }

  return <AuthContext.Provider value={{ user, ready, login, signup, onboard, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
