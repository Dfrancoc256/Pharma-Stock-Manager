import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AuthUser = {
  email: string;
  nombre: string;
  rol: string; // "ADMIN" | "VENDEDOR" | etc.
};

async function fetchUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    queryClient.setQueryData(["/api/auth/user"], null);
    window.location.href = "/login";
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    rol: user?.rol ?? null,
    isAdmin: user?.rol?.toUpperCase() === "ADMIN",
    nombre: user?.nombre ?? "",
  };
}
