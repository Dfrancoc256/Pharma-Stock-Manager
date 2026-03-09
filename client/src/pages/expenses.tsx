import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useExpenses, useCreateExpense } from "@/hooks/use-expenses";
import { Plus, Receipt } from "lucide-react";
import { format } from "date-fns";

export default function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const createExpense = useCreateExpense();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createExpense.mutate({ description, amount: parseFloat(amount) }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setDescription(""); setAmount("");
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Gastos Diarios" 
        description="Registra retiros de caja para compras, pagos, etc."
        action={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="interactive-btn px-6 py-3 rounded-xl bg-destructive text-white font-bold flex items-center gap-2 shadow-lg shadow-destructive/25"
          >
            <Plus size={20} /> Registrar Gasto
          </button>
        }
      />

      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">Descripción</th>
              <th className="p-4 font-semibold text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={3} className="p-12 text-center text-muted-foreground"><Receipt className="mx-auto mb-3 opacity-20" size={48} />No hay gastos registrados</td></tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">{exp.createdAt ? format(new Date(exp.createdAt), "dd/MM/yyyy HH:mm") : "-"}</td>
                  <td className="p-4 font-medium text-foreground">{exp.description}</td>
                  <td className="p-4 font-extrabold text-destructive text-right">Bs. {exp.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6 text-destructive">Nuevo Gasto</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Monto (Bs.)</label>
                <input required type="number" step="0.01" className="input-field text-2xl font-bold text-destructive border-destructive/30 focus:border-destructive focus:ring-destructive/10" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Descripción / Motivo</label>
                <textarea required className="input-field resize-none h-24" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={createExpense.isPending} className="flex-1 py-3 rounded-xl font-bold bg-destructive text-white hover:bg-destructive/90 interactive-btn shadow-lg shadow-destructive/20">
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
