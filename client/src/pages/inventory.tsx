import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useProducts, useCreateProduct, useDeleteProduct } from "@/hooks/use-products";
import { Plus, Package, Edit2, Trash2, Search } from "lucide-react";

export default function InventoryPage() {
  const { data: products = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("0");
  const [barcode, setBarcode] = useState("");

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate({
      name,
      description: desc,
      price: parseFloat(price),
      cost: parseFloat(cost),
      stock: parseInt(stock, 10),
      barcode
    }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setName(""); setDesc(""); setPrice(""); setCost(""); setStock("0"); setBarcode("");
      }
    });
  };

  return (
    <Layout>
      <PageHeader 
        title="Inventario" 
        description="Gestiona los productos de tu farmacia."
        action={
          <button 
            onClick={() => setIsAddOpen(true)}
            className="interactive-btn px-6 py-3 rounded-xl bg-primary text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <Plus size={20} /> Añadir Producto
          </button>
        }
      />

      <div className="glass-card rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
        <div className="p-4 border-b border-border/50 bg-white/50 flex gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Buscar producto..."
              className="input-field pl-10 py-2.5 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-sm border-b border-border/50">
                <th className="p-4 font-semibold">Código</th>
                <th className="p-4 font-semibold">Producto</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Costo</th>
                <th className="p-4 font-semibold">Precio Venta</th>
                <th className="p-4 font-semibold w-24">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-muted-foreground"><Package className="mx-auto mb-3 opacity-20" size={48} />No se encontraron productos</td></tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-black/[0.02] transition-colors group">
                    <td className="p-4 font-mono text-xs text-muted-foreground">{p.barcode || '-'}</td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{p.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${p.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">Bs. {p.cost}</td>
                    <td className="p-4 font-extrabold text-primary">Bs. {p.price}</td>
                    <td className="p-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {
                        if(confirm('¿Eliminar producto?')) deleteProduct.mutate(p.id);
                      }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg interactive-btn">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Nuevo Producto</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Costo (Bs.)</label>
                  <input required type="number" step="0.01" className="input-field" value={cost} onChange={e => setCost(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Precio (Bs.)</label>
                  <input required type="number" step="0.01" className="input-field border-primary/50 bg-primary/5" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Stock Inicial</label>
                  <input required type="number" className="input-field" value={stock} onChange={e => setStock(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Código de Barras</label>
                  <input className="input-field" value={barcode} onChange={e => setBarcode(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Descripción</label>
                <textarea className="input-field resize-none h-24" value={desc} onChange={e => setDesc(e.target.value)}></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn">Cancelar</button>
                <button type="submit" disabled={createProduct.isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 interactive-btn shadow-lg shadow-primary/20">
                  {createProduct.isPending ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
