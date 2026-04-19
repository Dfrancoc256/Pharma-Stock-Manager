import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface SheetUsuario {
  Usuario: string;
  Pass?: string;
  Rol: string;
  Activo: string;
}

function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as any).data)) {
    return (value as any).data;
  }
  return [];
}

export function useUsers() {
  return useQuery<SheetUsuario[]>({
    queryKey: ["/api/sheets/usuarios"],
    queryFn: async () => {
      const res = await fetch("/api/sheets/usuarios", { credentials: "include" });
      if (!res.ok) throw new Error("Error cargando usuarios");

      const json = await res.json();
      return safeArray<SheetUsuario>(json);
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { usuario: string; pass: string; rol: string }) => {
      const res = await fetch("/api/sheets/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error creando usuario");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sheets/usuarios"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { usuario: string; pass?: string; rol?: string; activo?: string }) => {
      const { usuario, ...updates } = data;
      const res = await fetch(`/api/sheets/usuarios/${encodeURIComponent(usuario)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error actualizando usuario");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sheets/usuarios"] }),
  });
}