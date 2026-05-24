"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;

    if (!user && !PUBLIC_ROUTES.has(pathname)) {
      router.replace("/login");
      return;
    }

    if (user) {
      const isOnboarded = user.age !== null && user.age !== undefined;

      if (!isOnboarded && pathname !== "/onboard") {
        router.replace("/onboard");
        return;
      }

      if (isOnboarded && pathname === "/onboard") {
        router.replace("/dashboard");
        return;
      }

      if (PUBLIC_ROUTES.has(pathname)) {
        router.replace("/dashboard");
      }
    }
  }, [pathname, ready, router, user]);

  if (!ready) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">
          <div className="auth-loading-mark">NX</div>
          <p>Loading your training space...</p>
        </div>
      </div>
    );
  }

  if (!user && !PUBLIC_ROUTES.has(pathname)) {
    return null;
  }

  if (user) {
    const isOnboarded = user.age !== null && user.age !== undefined;
    if (!isOnboarded && pathname !== "/onboard") {
      return null;
    }
    if (isOnboarded && pathname === "/onboard") {
      return null;
    }
    if (PUBLIC_ROUTES.has(pathname)) {
      return null;
    }
  }

  return <>{children}</>;
}
