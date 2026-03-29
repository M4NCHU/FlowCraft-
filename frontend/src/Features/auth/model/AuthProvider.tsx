// src/Features/auth/model/AuthProvider.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ApiError,
  setUnauthorizedHandler,
} from "../../../shared/api/httpClient";
import { authApi } from "../api/authApi";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  name: string;
  roles: string[];
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    status: "checking",
    user: null,
  });

  const setUnauthenticated = useCallback(() => {
    setState({
      status: "unauthenticated",
      user: null,
    });
  }, []);

  const refreshAuth = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: "checking",
    }));

    try {
      const data = await authApi.getMe();

      const claims = Array.isArray(data.claims) ? data.claims : [];

      const roles = claims
        .filter(
          (c) =>
            c.type === "role" ||
            c.type ===
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        )
        .map((c) => String(c.value));

      setState({
        status: "authenticated",
        user: {
          userId: String(data.userId ?? ""),
          name: String(data.name ?? ""),
          roles,
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setUnauthenticated();
        return;
      }

      setUnauthenticated();
    }
  }, [setUnauthenticated]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUnauthenticated();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [setUnauthenticated]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
