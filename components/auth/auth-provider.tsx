"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { isApiConfigured, refreshAccessToken, setAccessToken } from "@/lib/api/client";
import * as authApi from "@/lib/api/auth";
import type { ApiUser } from "@/lib/api/auth";

export type AccountType = "seeker" | "lister" | "admin";
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
/**
 * "server" when NEXT_PUBLIC_API_URL is set and the NestJS backend owns the
 * account; "device" when it is not, where no accounts exist at all.
 */
export type AuthMode = "server" | "device";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  accountType: AccountType;
  isAgent: boolean;
  phoneVerified: boolean;
  idVerified: boolean;
  avatarUrl?: string;
  agencyName?: string;
  /** Server mode only: whether the address has been confirmed. Always false on device. */
  emailVerified?: boolean;
  /** Server mode only. */
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  mode: AuthMode;
  signOut: () => void;
  updateProfile: (patch: Partial<AuthUser>) => void;
  /** Server mode: real credentials. Throws ApiError on failure. */
  signInWithPassword: (email: string, password: string) => Promise<AuthUser>;
  signUpWithPassword: (input: { email: string; password: string; firstName: string; lastName: string; address: string; accountType: AccountType }) => Promise<{ user: AuthUser; verificationEmailSent: boolean }>;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Maps the API shape onto the view model the UI already uses. */
function fromApiUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: `${user.firstName} ${user.lastName}`.trim() || user.email.split("@")[0],
    accountType: user.role === "SEEKER" ? "seeker" : user.role === "ADMIN" ? "admin" : "lister",
    isAgent: user.isAgent,
    phoneVerified: user.phoneVerified,
    idVerified: Boolean(user.verificationDocs?.length && user.verificationDocs.every((document) => document.status === "VERIFIED")),
    avatarUrl: user.avatarUrl ?? undefined,
    emailVerified: Boolean(user.emailVerifiedAt),
    isAdmin: user.role === "ADMIN",
  };
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  // Derived from a build-time environment variable, so it never changes while the
  // app is running and can be read directly wherever it is needed.
  const mode: AuthMode = isApiConfigured() ? "server" : "device";

  useEffect(() => {
    let cancelled = false;

    if (isApiConfigured()) {
      // The access token lives in memory only, so a reload restores the session
      // from the HttpOnly refresh cookie rather than from storage.
      void (async () => {
        try {
          const token = await refreshAccessToken();
          if (!token) throw new Error("no session");
          const current = await authApi.me();
          if (cancelled) return;
          setUser(fromApiUser(current));
          setStatus("authenticated");
        } catch {
          if (cancelled) return;
          setAccessToken(null);
          setUser(null);
          setStatus("unauthenticated");
        }
      })();
    } else {
      // Without an API there are no accounts at all, so the session can only be
      // signed out. This is honest: never a locally invented session.
      queueMicrotask(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });
    }

    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    setStatus(nextUser ? "authenticated" : "unauthenticated");
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const nextUser = fromApiUser(await authApi.login(email.trim().toLowerCase(), password));
    persist(nextUser);
    return nextUser;
  }, [persist]);

  const signUpWithPassword = useCallback(async (input: { email: string; password: string; firstName: string; lastName: string; address: string; accountType: AccountType }) => {
    const result = await authApi.register({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      address: input.address.trim(),
      role: input.accountType === "seeker" ? "SEEKER" : "LISTER",
    });
    const nextUser = fromApiUser(result.user);
    persist(nextUser);
    return { user: nextUser, verificationEmailSent: result.verificationEmailSent };
  }, [persist]);

  const signOut = useCallback(() => {
    if (isApiConfigured()) {
      // Clear locally first so the UI never looks signed in while the call is in flight.
      persist(null);
      void authApi.logout().catch(() => setAccessToken(null));
      return;
    }
    persist(null);
  }, [persist]);

  const refreshUser = useCallback(async () => {
    if (!isApiConfigured()) return user;
    try {
      const nextUser = fromApiUser(await authApi.me());
      persist(nextUser);
      return nextUser;
    } catch {
      persist(null);
      return null;
    }
  }, [persist, user]);

  const updateProfile = useCallback((patch: Partial<AuthUser>) => {
    if (!user) return;
    persist({ ...user, ...patch });
  }, [persist, user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    mode,
    signOut,
    updateProfile,
    signInWithPassword,
    signUpWithPassword,
    refreshUser,
  }), [user, status, mode, signOut, updateProfile, signInWithPassword, signUpWithPassword, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export { AuthProvider, useAuth };
