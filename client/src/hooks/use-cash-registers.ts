import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCurrentRegister() {
  return useQuery({
    queryKey: [api.cashRegisters.current.path],
    queryFn: async () => {
      const res = await fetch(api.cashRegisters.current.path, { credentials: "include" });
      if (res.status === 404 || res.status === 204) return null;
      if (!res.ok) throw new Error("Failed to fetch current register");
      const data = await res.json();
      return data || null;
    },
  });
}

export function useOpenRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (openingBalance: number) => {
      const res = await fetch(api.cashRegisters.open.path, {
        method: api.cashRegisters.open.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: openingBalance.toString(), status: "open" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to open register");
      return api.cashRegisters.open.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.cashRegisters.current.path] }),
  });
}

export function useCloseRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (closingBalance: number) => {
      const res = await fetch(api.cashRegisters.close.path, {
        method: api.cashRegisters.close.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingBalance }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to close register");
      return api.cashRegisters.close.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.cashRegisters.current.path] }),
  });
}
