import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useExpenses() {
  return useQuery({
    queryKey: [api.movements.list.path],
    queryFn: async () => {
      const res = await fetch(api.movements.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return api.movements.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { amount: number; description: string }) => {
      const res = await fetch(api.movements.create.path, {
        method: api.movements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, amount: data.amount.toString(), type: "out" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create expense");
      return api.movements.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.movements.list.path] }),
  });
}
