import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useCurrentRegister, useOpenRegister, useCloseRegister } from "@/hooks/use-cash-registers";
import { useSales } from "@/hooks/use-sales";
import { useExpenses } from "@/hooks/use-expenses";
import { LockKeyhole, LockOpen, LineChart, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function CashRegisterPage() {
  const { data: register, isLoading } = useCurrentRegister();
  const openRegister = useOpenRegister();
  const closeRegister = useCloseRegister();
  
  const { data: sales = [] } = useSales();
  const { data: expenses = [] } = useExpenses();

  const [openVal, setOpenVal] = useState("");
  const [closeVal, setCloseVal] = useState("");

  const isOpen = register?.status === "open";

  // Calculate today's flow roughly based on all data (ideal: backend provides exact shift data)
  const todaySales = sales.filter(s => s.status === "paid").reduce((acc, s) => acc + parseFloat(s.total), 0);
  const todayExpenses = expenses.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const expected = register ? parseFloat(register.openingBalance) + todaySales - todayExpenses : 0;

  const handleOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openRegister.mutate(parseFloat(openVal), { onSuccess: () => setOpenVal("") });
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if(confirm(`Se cerrará la caja con un balance declarado de Bs. ${closeVal}. ¿Continuar?`)) {
      closeRegister.mutate(parseFloat(closeVal), { onSuccess: () => setCloseVal("") });
    }
  };

  if (isLoading) return <Layout><div className="p-8 text-center text-muted-foreground">Cargando estado de caja...</div></Layout>;

  return (
    <Layout>
      <PageHeader 
        title="Control de Caja" 
        description="Apertura, cierre y resumen de movimientos."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Status Panel */}
        <div className={`col-span-1 lg:col-span-2 glass-card rounded-3xl p-8 border-t-8 ${isOpen ? 'border-t-primary' : 'border-t-muted-foreground'}`}>
          <div className="flex items-center gap-4 mb-8">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white ${isOpen ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-muted-foreground shadow-lg shadow-black/10'}`}>
              {isOpen ? <LockOpen size={32} /> : <LockKeyhole size={32} />}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-foreground">{isOpen ? 'Caja Abierta' : 'Caja Cerrada'}</h2>
              <p className="text-muted-foreground text-lg">
                {isOpen && register?.date ? `Turno iniciado a las ${format(new Date(register.date), "HH:mm")}` : 'Inicie un turno para registrar ventas'}
              </p>
            </div>
          </div>

          {!isOpen ? (
            <div className="bg-accent/30 p-6 rounded-2xl border border-border mt-8">
              <h3 className="text-xl font-bold mb-4">Abrir Nuevo Turno</h3>
              <form onSubmit={handleOpen} className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-2">Monto de Apertura (Bs.)</label>
                  <input required type="number" step="0.01" className="input-field text-xl" value={openVal} onChange={e => setOpenVal(e.target.value)} />
                </div>
                <button type="submit" disabled={openRegister.isPending} className="interactive-btn px-8 py-3 h-[52px] rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/25">
                  Abrir Caja
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-2"><LineChart size={18}/> Apertura</div>
                <div className="text-2xl font-black">Bs. {register.openingBalance}</div>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100 shadow-sm text-green-800">
                <div className="flex items-center gap-2 mb-2 opacity-80"><TrendingUp size={18}/> Ventas Pagadas</div>
                <div className="text-2xl font-black">+ Bs. {todaySales.toFixed(2)}</div>
              </div>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm text-red-800">
                <div className="flex items-center gap-2 mb-2 opacity-80"><TrendingDown size={18}/> Gastos</div>
                <div className="text-2xl font-black">- Bs. {todayExpenses.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Action / Expected Panel */}
        {isOpen && (
          <div className="glass-card rounded-3xl p-8 bg-gradient-to-br from-gray-900 to-black text-white shadow-2xl flex flex-col">
            <h3 className="text-xl font-bold text-gray-400 mb-6">Arqueo Actual</h3>
            
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-sm font-medium text-gray-400 mb-2">Debería haber en caja:</p>
              <p className="text-5xl font-black text-primary mb-12">Bs. {expected.toFixed(2)}</p>

              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-400">Declarar monto final para cierre:</p>
                <form onSubmit={handleClose} className="space-y-4">
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    placeholder="Monto físico real" 
                    className="w-full px-4 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary text-xl font-bold text-center" 
                    value={closeVal} 
                    onChange={e => setCloseVal(e.target.value)} 
                  />
                  <button type="submit" disabled={closeRegister.isPending} className="w-full interactive-btn py-4 rounded-xl bg-white text-black font-extrabold flex items-center justify-center gap-2">
                    <CheckCircle2 /> Cerrar Caja Definitivamente
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
