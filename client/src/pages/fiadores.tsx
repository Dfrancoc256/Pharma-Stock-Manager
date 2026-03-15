import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users, CreditCard } from "lucide-react";

interface Fiador {
  Fiador_ID: string; Nombre: string; Telefono: string; Direccion: string; Saldo_actual: string;
}

export default function FiadoresPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selected, setSelected] = useState<Fiador | null>(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [monto, setMonto] = useState('');

  const { data: fiadores = [], isLoading } = useQuery<Fiador[]>({
    queryKey: ['/api/sheets/fiadores'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/fiadores', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando fiadores');
      return res.json();
    },
  });

  const createFiador = useMutation({
    mutationFn: async (body: { nombre: string; telefono: string; direccion: string }) => {
      const res = await fetch('/api/sheets/fiadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error creando fiador');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      setIsAddOpen(false);
      setNombre(''); setTelefono(''); setDireccion('');
    }
  });

  const pagarFiador = useMutation({
    mutationFn: async ({ id, monto }: { id: string; monto: string }) => {
      const res = await fetch(`/api/sheets/fiadores/${id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monto }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al registrar pago');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      setIsPayOpen(false);
      setMonto('');
      setSelected(null);
    }
  });

  return (
    <Layout>
      <PageHeader
        title="Fiadores"
        description="Gestiona clientes al fiado y sus saldos pendientes desde Google Sheets."
        action={
          <button onClick={() => setIsAddOpen(true)} className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25">
            <Plus size={20} /> Nuevo Fiador
          </button>
        }
      />

      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
              <th className="p-4 font-semibold">ID</th>
              <th className="p-4 font-semibold">Nombre</th>
              <th className="p-4 font-semibold">Teléfono</th>
              <th className="p-4 font-semibold">Dirección</th>
              <th className="p-4 font-semibold text-right">Saldo</th>
              <th className="p-4 font-semibold w-24">Acción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando desde Google Sheets...</td></tr>
            ) : fiadores.filter(f => f.Fiador_ID).length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-muted-foreground"><Users className="mx-auto mb-3 opacity-20" size={48} />No hay fiadores registrados</td></tr>
            ) : (
              fiadores.filter(f => f.Fiador_ID).map(f => (
                <tr key={f.Fiador_ID} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors">
                  <td className="p-4 font-mono text-xs text-muted-foreground">{f.Fiador_ID}</td>
                  <td className="p-4 font-bold text-foreground">{f.Nombre}</td>
                  <td className="p-4 text-muted-foreground">{f.Telefono || '—'}</td>
                  <td className="p-4 text-muted-foreground text-sm">{f.Direccion || '—'}</td>
                  <td className="p-4 text-right">
                    <span className={`font-extrabold text-lg ${parseFloat(f.Saldo_actual || '0') > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      Q {parseFloat(f.Saldo_actual || '0').toFixed(2)}
                    </span>
                  </td>
                  <td className="p-4">
                    {parseFloat(f.Saldo_actual || '0') > 0 && (
                      <button
                        onClick={() => { setSelected(f); setIsPayOpen(true); }}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold interactive-btn flex items-center gap-1"
                      >
                        <CreditCard size={14} /> Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nuevo Fiador */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Nuevo Fiador</h2>
            <form onSubmit={e => { e.preventDefault(); createFiador.mutate({ nombre, telefono, direccion }); }} className="space-y-4">
              <div><label className="block text-sm font-semibold mb-1">Nombre *</label><input required className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
              <div><label className="block text-sm font-semibold mb-1">Teléfono</label><input className="input-field" value={telefono} onChange={e => setTelefono(e.target.value)} /></div>
              <div><label className="block text-sm font-semibold mb-1">Dirección</label><input className="input-field" value={direccion} onChange={e => setDireccion(e.target.value)} /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={createFiador.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20">
                  {createFiador.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pagar */}
      {isPayOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">Registrar Pago</h2>
            <p className="text-muted-foreground mb-1">{selected.Nombre}</p>
            <p className="text-red-500 font-bold mb-6">Saldo actual: Q {parseFloat(selected.Saldo_actual || '0').toFixed(2)}</p>
            <form onSubmit={e => { e.preventDefault(); pagarFiador.mutate({ id: selected.Fiador_ID, monto }); }} className="space-y-4">
              <div><label className="block text-sm font-semibold mb-1">Monto a pagar (Q)</label>
                <input required type="number" step="0.01" min="0" max={selected.Saldo_actual} className="input-field text-xl font-bold text-primary" value={monto} onChange={e => setMonto(e.target.value)} /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPayOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={pagarFiador.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20">
                  {pagarFiador.isPending ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
