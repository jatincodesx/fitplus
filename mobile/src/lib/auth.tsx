import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { MobileSessionPayload, MobileSessionUser } from "@fitplus/contracts";
import { mobileApi } from "@/lib/api";

const TOKEN_KEY = "fitplus.mobile.token";

type AuthContextValue = {
  isBootstrapping: boolean;
  token: string | null;
  user: MobileSessionUser | null;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (input: { email: string; password: string }) => Promise<MobileSessionPayload>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<MobileSessionPayload>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<MobileSessionUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(session: MobileSessionPayload) {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  return session;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MobileSessionUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setAuthError(null);
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (!storedToken) {
          return;
        }

        const session = await mobileApi.getSession(storedToken);
        if (!session?.user) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          return;
        }

        if (cancelled) {
          return;
        }

        setToken(storedToken);
        setUser(session.user);
      } catch (error) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);

        if (!cancelled) {
          setToken(null);
          setUser(null);
          setAuthError(error instanceof Error ? error.message : "Could not restore the mobile session.");
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    isBootstrapping,
    token,
    user,
    authError,
    clearAuthError() {
      setAuthError(null);
    },
    async signIn(input) {
      try {
        setAuthError(null);
        const session = await persistSession(await mobileApi.signIn(input));
        setToken(session.token);
        setUser(session.user);
        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not sign in.";
        setAuthError(message);
        throw error;
      }
    },
    async signUp(input) {
      try {
        setAuthError(null);
        const session = await persistSession(await mobileApi.signUp(input));
        setToken(session.token);
        setUser(session.user);
        return session;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not sign up.";
        setAuthError(message);
        throw error;
      }
    },
    async signOut() {
      setAuthError(null);
      if (token) {
        try {
          await mobileApi.signOut(token);
        } catch {
          // Ignore remote sign-out failures and clear the device session anyway.
        }
      }

      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setUser(null);
    },
    updateUser(updates) {
      setUser((current) => (current ? { ...current, ...updates } : current));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
