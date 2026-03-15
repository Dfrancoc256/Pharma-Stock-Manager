import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Package, Trash2, Search, Edit2 } from "lucide-react";

interface Producto {
  ID: string; Nombre: string; Detalle: string; Casa: string; Categoria: string;
  'Precio compra': string; 'Precio unidad': string; 'Precio blister': string;
  'Precio caja': string; Posicion: string; Stock: string; Drogueria: string;
  'Unidades blister': string; 'Unidades caja': string;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editProd, setEditProd] = useState<Producto | null>(null);

  const [nombre, setNombre] = useState('');
  const [detalle, setDetalle] = useState('');
  const [casa, setCasa] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precioCompra, setPrecioCompra] = useState('');
  const [precioUnidad, setPrecioUnidad] = useState('');
  const [precioBlister, setPrecioBlister] = useState('');
  const [precioCaja, setPrecioCaja] = useState('');
  const [posicion, setPosicion] = useState('');
  const [drogueria, setDrogueria] = useState('');
  const [stock, setStock] = useState('0');
  const [unidadesBlister, setUnidadesBlister] = useState('');
  const [unidadesCaja, setUnidadesCaja] = useState('');

  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['/api/sheets/stock'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/stock', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando inventario');
      return res.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/sheets/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error creando producto');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/stock'] });
      resetForm(); setIsAddOpen(false);
    }
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const res = await fetch(`/api/sheets/stock/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error actualizando producto');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/stock'] });
      resetForm(); setEditProd(null);
    }
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sheets/stock/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Error eliminando producto');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/sheets/stock'] })
  });

  const resetForm = () => {
    setNombre(''); setDetalle(''); setCasa(''); setCategoria('');
    setPrecioCompra(''); setPrecioUnidad(''); setPrecioBlister(''); setPrecioCaja('');
    setPosicion(''); setDrogueria(''); setStock('0');
    setUnidadesBlister(''); setUnidadesCaja('');
  };

  const openEdit = (p: Producto) => {
    setEditProd(p);
    setNombre(p.Nombre); setDetalle(p.Detalle); setCasa(p.Casa); setCategoria(p.Categoria);
    setPrecioCompra(p['Precio compra']); setPrecioUnidad(p['Precio unidad']);
    setPrecioBlister(p['Precio blister']); setPrecioCaja(p['Precio caja']);
    setPosicion(p.Posicion); setDrogueria(p.Drogueria); setStock(p.Stock);
    setUnidadesBlister(p['Unidades blister']); setUnidadesCaja(p['Unidades caja']);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = { nombre, detalle, casa, categoria, precioCompra, precioUnidad, precioBlister, precioCaja, posicion, drogueria, stock, unidadesBlister, unidadesCaja };
    if (editProd) {
      updateMut.mutate({ id: editProd.ID, ...body });
    } else {
      createMut.mutate(body);
    }
  };

  const filtered = productos.filter(p => p.ID && (
    (p.Nombre || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.Casa || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.Categoria || '').toLowerCase().includes(search.toLowerCase())
  ));

  const isOpen = isAddOpen || !!editProd;
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Layout>
      <PageHeader
        title="Inventario (Stock)"
        description="Productos sincronizados en tiempo real con Google Sheets."
        action={
          <button onClick={() => { resetForm(); setIsAddOpen(true); }} className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25">
            <Plus size={20} /> Añadir Producto
          </button>
        }
      />

      <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border/50 bg-white/50 flex gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input type="text" placeholder="Buscar por nombre, casa, categoría..." className="input-field pl-10 py-2.5 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs border-b border-border/50">
                <th className="p-3 font-semibold">ID</th>
                <th className="p-3 font-semibold">Nombre</th>
                <th className="p-3 font-semibold">Casa</th>
                <th className="p-3 font-semibold">Categoría</th>
                <th className="p-3 font-semibold">Posición</th>
                <th className="p-3 font-semibold text-center">Stock</th>
                <th className="p-3 font-semibold text-right">P. Compra</th>
                <th className="p-3 font-semibold text-right">P. Unidad</th>
                <th className="p-3 font-semibold text-right">P. Blister</th>
                <th className="p-3 font-semibold text-right">P. Caja</th>
                <th className="p-3 font-semibold w-20">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Cargando desde Google Sheets...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="p-12 text-center text-muted-foreground"><Package className="mx-auto mb-3 opacity-20" size={48} />No se encontraron productos</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.ID} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors group text-sm">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{p.ID}</td>
                    <td className="p-3">
                      <div className="font-bold text-foreground">{p.Nombre}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.Detalle}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{p.Casa || '—'}</td>
                    <td className="p-3 text-muted-foreground">{p.Categoria || '—'}</td>
                    <td className="p-3 text-muted-foreground">{p.Posicion || '—'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${(parseInt(p.Stock) || 0) < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.Stock || 0}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">Q {parseFloat(p['Precio compra'] || '0').toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-primary">Q {parseFloat(p['Precio unidad'] || '0').toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">{p['Precio blister'] ? `Q ${parseFloat(p['Precio blister']).toFixed(2)}` : '—'}</td>
                    <td className="p-3 text-right text-muted-foreground">{p['Precio caja'] ? `Q ${parseFloat(p['Precio caja']).toFixed(2)}` : '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg interactive-btn"><Edit2 size={14} /></button>
                        <button onClick={() => { if (confirm('¿Eliminar?')) deleteMut.mutate(p.ID); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg interactive-btn"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-2xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editProd ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-sm font-semibold mb-1">Nombre *</label><input required className="input-field" value={nombre} onChange={e => setNombre(e.target.value)} /></div>
                <div className="col-span-2"><label className="block text-sm font-semibold mb-1">Detalle</label><input className="input-field" value={detalle} onChange={e => setDetalle(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Casa</label><input className="input-field" value={casa} onChange={e => setCasa(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Categoría</label><input className="input-field" value={categoria} onChange={e => setCategoria(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Precio Compra (Q) *</label><input required type="number" step="0.01" className="input-field" value={precioCompra} onChange={e => setPrecioCompra(e.target.value)} placeholder="0.00" /></div>
                <div><label className="block text-sm font-semibold mb-1">Precio Unidad (Q) *</label><input required type="number" step="0.01" className="input-field border-primary/50 bg-primary/5" value={precioUnidad} onChange={e => setPrecioUnidad(e.target.value)} placeholder="0.00" /></div>
                <div><label className="block text-sm font-semibold mb-1">Precio Blister (Q)</label><input type="number" step="0.01" className="input-field" value={precioBlister} onChange={e => setPrecioBlister(e.target.value)} placeholder="0.00" /></div>
                <div><label className="block text-sm font-semibold mb-1">Precio Caja (Q)</label><input type="number" step="0.01" className="input-field" value={precioCaja} onChange={e => setPrecioCaja(e.target.value)} placeholder="0.00" /></div>
                <div><label className="block text-sm font-semibold mb-1">Stock</label><input type="number" className="input-field" value={stock} onChange={e => setStock(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Posición</label><input className="input-field" value={posicion} onChange={e => setPosicion(e.target.value)} placeholder="Ej: A1" /></div>
                <div><label className="block text-sm font-semibold mb-1">Droguería</label><input className="input-field" value={drogueria} onChange={e => setDrogueria(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Unidades Blister</label><input type="number" className="input-field" value={unidadesBlister} onChange={e => setUnidadesBlister(e.target.value)} /></div>
                <div><label className="block text-sm font-semibold mb-1">Unidades Caja</label><input type="number" className="input-field" value={unidadesCaja} onChange={e => setUnidadesCaja(e.target.value)} /></div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { resetForm(); setIsAddOpen(false); setEditProd(null); }} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button type="submit" disabled={isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white interactive-btn shadow-lg shadow-primary/20">
                  {isPending ? 'Guardando en Sheets...' : (editProd ? 'Actualizar' : 'Guardar Producto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
