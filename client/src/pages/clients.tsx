import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useClients, useCreateClient, usePayDebt } from "@/hooks/use-clients";
import { Plus, Users as UsersIcon, HandCoins } from "lucide-react";

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const payDebt = usePayDebt();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [paymentClient, setPaymentClient] = useState<{id: number, name: string, debt: string} | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate({ name, phone, debt: "0" }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setName(""); setPhone("");
      }
    });
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if(!paymentClient) return;
    payDebt.mutate({ id: paymentClient.id, amount: parseFloat(paymentAmount) }, {
      onSuccess: () => {
        setPaymentClient(null);
        setPaymentAmount("");
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Clientes y Fiados" 
        description="Gestión de deudores y cartera de clientes."
        action={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <Plus size={20} /> Nuevo Cliente
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-muted-foreground">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground glass-card rounded-3xl"><UsersIcon className="mx-auto mb-3 opacity-20" size={48} />No hay clientes registrados</div>
        ) : (
          clients.map(c => (
            <div key={c.id} className="glass-card rounded-3xl p-6 border-t-4 border-t-primary relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <h3 className="text-xl font-bold text-foreground">{c.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{c.phone || "Sin teléfono"}</p>
              
              <div className="bg-accent/50 rounded-2xl p-4 mb-4 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-1">Deuda Pendiente</p>
                <p className={`text-3xl font-extrabold ${parseFloat(c.debt) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Bs. {c.debt}
                </p>
              </div>

              {parseFloat(c.debt) > 0 && (
                <button 
                  onClick={() => setPaymentClient({id: c.id, name: c.name, debt: c.debt})}
                  className="w-full interactive-btn py-3 rounded-xl bg-gradient-to-r from-orange-400 to-red-400 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                >
                  <HandCoins size={18} /> Pagar Deuda
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Client Dialog */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Nuevo Cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre Completo</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Teléfono</label>
                <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={createClient.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 interactive-btn shadow-lg shadow-primary/20">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {paymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">Registrar Pago</h2>
            <p className="text-muted-foreground mb-6">Cliente: <strong className="text-foreground">{paymentClient.name}</strong></p>
            
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 flex justify-between">
                  <span>Monto a pagar (Bs.)</span>
                  <span className="text-primary cursor-pointer" onClick={() => setPaymentAmount(paymentClient.debt)}>Máx: {paymentClient.debt}</span>
                </label>
                <input required type="number" step="0.01" max={paymentClient.debt} className="input-field text-2xl font-bold text-center" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setPaymentClient(null)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={payDebt.isPending} className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-lg shadow-red-500/20 interactive-btn">
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
