import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { UserView } from "../../shared/contracts";
import { api, jsonBody } from "../lib/api";
import { queryClient } from "../lib/query";

interface AuthValue {
  user: UserView | null;
  loading: boolean;
  error: Error | null;
  login: (input: { email: string; password: string }) => Promise<UserView>;
  signup: (input: { email: string; password: string; name: string; handle: string }) => Promise<UserView>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: UserView }>("/auth/me"),
    retry: false,
  });
  const loginMutation = useMutation({ mutationFn: (input: { email: string; password: string }) => api<{ user: UserView }>("/auth/login", { method: "POST", ...jsonBody(input) }) });
  const signupMutation = useMutation({ mutationFn: (input: { email: string; password: string; name: string; handle: string }) => api<{ user: UserView }>("/auth/signup", { method: "POST", ...jsonBody(input) }) });

  const user = me.data?.user || loginMutation.data?.user || signupMutation.data?.user || null;
  useEffect(() => {
    const theme = user?.theme || "system";
    const resolved = theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.motion = user?.reduceMotion ? "reduced" : "full";
  }, [user?.theme, user?.reduceMotion]);

  const setAuthenticated = async (next: UserView) => {
    queryClient.setQueryData(["me"], { user: next });
    await queryClient.invalidateQueries();
    return next;
  };
  return <AuthContext.Provider value={{
    user,
    loading: me.isLoading,
    error: me.error as Error | null,
    login: async (input) => setAuthenticated((await loginMutation.mutateAsync(input)).user),
    signup: async (input) => setAuthenticated((await signupMutation.mutateAsync(input)).user),
    logout: async () => { await api("/auth/logout", { method: "POST" }); queryClient.clear(); location.assign("/"); },
    refresh: async () => { await queryClient.invalidateQueries({ queryKey: ["me"] }); },
  }}>{children}</AuthContext.Provider>;
}

// This hook intentionally shares the provider module so the context stays private.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
