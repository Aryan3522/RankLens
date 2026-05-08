import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch, setAuthTokenGetter } from "@/api/custom-fetch";
import { useToast } from "./use-toast";

type User = {
  id: number;
  email: string;
  name: string | null;
};

type AuthResponse = {
  user: User;
  token: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Register token getter globally
setAuthTokenGetter(() => localStorage.getItem("ranklens_token"));

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: () => customFetch<User | null>("/api/auth/me").catch(() => null),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: any) => customFetch<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (resp: AuthResponse) => {
      localStorage.setItem("ranklens_token", resp.token);
      queryClient.setQueryData(["/api/auth/me"], resp.user);
      toast({ title: "Welcome back!" });
    },
    onError: (err: any) => {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => customFetch<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (resp: AuthResponse) => {
      localStorage.setItem("ranklens_token", resp.token);
      queryClient.setQueryData(["/api/auth/me"], resp.user);
      toast({ title: "Account created!" });
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => customFetch("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      localStorage.removeItem("ranklens_token");
      queryClient.setQueryData(["/api/auth/me"], null);
      toast({ title: "Logged out" });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login: async (data) => { await loginMutation.mutateAsync(data); },
        register: async (data) => { await registerMutation.mutateAsync(data); },
        logout: async () => { await logoutMutation.mutateAsync(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
