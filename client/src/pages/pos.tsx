import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import {
  Search, Plus, Minus, Trash2, ReceiptText, UserPlus,
  ShoppingCart, PackageSearch, Sparkles, X, Loader2, Info,
  Clock, AlertTriangle, CheckCircle, BookOpen, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface Producto {
  ID: string; Nombre: string; Detalle: string; Casa: string; Categoria: string;
  'Precio compra': string; 'Precio unidad': string; 'Precio blister': string;
  'Precio caja': string; Posicion: string; Stock: string; Drogueria: string;
  'Unidades blister': string; 'Unidades caja': string;
}

interface Fiador { Fiador_ID: string; Nombre: string; Saldo_actual: string; }

type TipoPrecio = 'unidad' | 'blister' | 'caja';
type CartItem = { producto: Producto; cantidad: number; tipoPrecio: TipoPrecio; };

type AIResultado = {
  id: string; nombre: string; detalle?: string;
  categoria?: string; precioUnidad?: number; stock?: number; relevancia?: string;
};

type ProductoInfo = {
  dosificacion: string;
  duracionTratamiento: string;
  indicaciones: string[];
  contraindicaciones: string[];
  recomendaciones: string[];
  consejo: string;
  requierReceta: boolean;
  producto: { id: string; nombre: string; detalle: string; categoria: string };
};

function getPrecio(p: Producto, tipo: TipoPrecio): number {
  if (tipo === 'blister') return parseFloat(p['Precio blister'] || '0');
  if (tipo === 'caja') return parseFloat(p['Precio caja'] || '0');
  return parseFloat(p['Precio unidad'] || '0');
}

// Panel de información de producto con dosificación IA
function ProductoInfoPanel({ producto, onClose, onAdd }: {
  producto: Producto; onClose: () => void; onAdd: () => void;
}) {
  const [info, setInfo] = useState<ProductoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tieneColumnaStock = producto.Stock !== undefined && producto.Stock !== '';
  const sinStock = tieneColumnaStock && (parseInt(producto.Stock) || 0) === 0;

  async function cargarInfo() {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest("POST", "/api/ai/info-producto", {
        id: producto.ID,
        nombre: producto.Nombre,
        detalle: producto.Detalle,
        categoria: producto.Categoria,
      });
      const data = await res.json();
      setInfo(data);
    } catch {
      setError('No se pudo cargar la información. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-cargar al abrir
  useEffect(() => { cargarInfo(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b bg-gradient-to-r from-violet-50 to-primary/5">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-muted-foreground">{producto.ID}</div>
            <h2 className="font-bold text-lg leading-tight">{producto.Nombre}</h2>
            {producto.Detalle && <p className="text-sm text-muted-foreground">{producto.Detalle}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-extrabold text-primary">Q {parseFloat(producto['Precio unidad'] || '0').toFixed(2)}</span>
              {tieneColumnaStock && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sinStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  {sinStock ? 'Sin stock' : `${producto.Stock} en stock`}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 flex-shrink-0" data-testid="button-cerrar-info">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 size={28} className="animate-spin text-violet-500" />
              <p className="text-sm">Consultando información farmacéutica...</p>
            </div>
          )}

          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
              <button onClick={cargarInfo} className="ml-auto text-red-600 underline text-xs">Reintentar</button>
            </div>
          )}

          {info && !loading && (
            <div className="p-5 space-y-4">
              
              {/* Dosificación - destacado */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-blue-600" />
                  <span className="font-bold text-sm text-blue-800">Dosificación</span>
                </div>
                <p className="text-blue-900 font-semibold text-sm">{info.dosificacion}</p>
                {info.duracionTratamiento && (
                  <p className="text-xs text-blue-600 mt-1">
                    Duración: {info.duracionTratamiento}
                  </p>
                )}
              </div>

              {/* Indicaciones */}
              {info.indicaciones?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={15} className="text-green-600" />
                    <span className="font-semibold text-sm">Para qué sirve</span>
                  </div>
                  <div className="space-y-1">
                    {info.indicaciones.map((ind, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                        {ind}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              {info.recomendaciones?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronRight size={15} className="text-primary" />
                    <span className="font-semibold text-sm">Recomendaciones</span>
                  </div>
                  <div className="space-y-1">
                    {info.recomendaciones.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                        <span className="text-primary font-bold flex-shrink-0">•</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contraindicaciones */}
              {info.contraindicaciones?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={15} className="text-orange-500" />
                    <span className="font-semibold text-sm text-orange-700">Precauciones</span>
                  </div>
                  <div className="space-y-1">
                    {info.contraindicaciones.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-orange-800 bg-orange-50 rounded-xl px-3 py-2">
                        <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Consejo */}
              {info.consejo && (
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-3 flex items-start gap-2">
                  <Sparkles size={15} className="text-violet-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-violet-800">{info.consejo}</p>
                </div>
              )}

              {/* Requiere receta */}
              {info.requierReceta && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={13} />
                  Este medicamento requiere receta médica
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - botón agregar */}
        <div className="p-4 border-t bg-white">
          <button
            onClick={() => { onAdd(); onClose(); }}
            disabled={sinStock}
            className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-primary to-teal-500 text-white shadow-lg shadow-primary/25 interactive-btn flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="button-agregar-desde-info"
          >
            <Plus size={20} /> {sinStock ? 'Sin stock disponible' : 'Agregar al carrito'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function POSPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [tipo, setTipo] = useState<'contado' | 'fiado'>('contado');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [fiadorId, setFiadorId] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [receiptData, setReceiptData] = useState<{ items: CartItem[]; total: number; fecha: string; paid?: number; change?: number; } | null>(null);

  // Producto info panel
  const [infoProducto, setInfoProducto] = useState<Producto | null>(null);

  // AI search panel
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAIQuery] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiResultados, setAIResultados] = useState<AIResultado[]>([]);
  const [aiSugerencia, setAISugerencia] = useState('');
  const [aiError, setAIError] = useState('');
  const aiInputRef = useRef<HTMLInputElement>(null);

  const { data: productos = [], isLoading } = useQuery<Producto[]>({
    queryKey: ['/api/sheets/stock'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/stock', { credentials: 'include' });
      if (!res.ok) throw new Error('Error cargando productos');
      return res.json();
    },
  });

  const { data: fiadores = [] } = useQuery<Fiador[]>({
    queryKey: ['/api/sheets/fiadores'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/fiadores', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createVenta = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch('/api/sheets/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Error al procesar venta');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sheets/fiadores'] });
      const total = cartTotal;
      setReceiptData({
        items: [...cart], total,
        fecha: format(new Date(), 'dd/MM/yyyy HH:mm'),
        paid: tipo === 'contado' ? parseFloat(amountPaid) : undefined,
        change: tipo === 'contado' ? parseFloat(amountPaid) - total : undefined,
      });
      setCart([]);
      setIsCheckoutOpen(false);
      setTipo('contado'); setFiadorId(''); setClienteNombre(''); setAmountPaid('');
      setTimeout(() => window.print(), 100);
    }
  });

  const filtered = productos.filter(p => p.ID && p.Nombre && (
    p.Nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.Detalle || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.Casa || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.Categoria || '').toLowerCase().includes(search.toLowerCase())
  ));

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + getPrecio(item.producto, item.tipoPrecio) * item.cantidad, 0), [cart]);

  const addToCart = (producto: Producto) => {
    setCart(prev => {
      const existing = prev.find(i => i.producto.ID === producto.ID && i.tipoPrecio === 'unidad');
      if (existing) return prev.map(i => i.producto.ID === producto.ID && i.tipoPrecio === 'unidad' ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { producto, cantidad: 1, tipoPrecio: 'unidad' }];
    });
  };

  const updateQty = (id: string, tipoPrecio: TipoPrecio, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.producto.ID === id && i.tipoPrecio === tipoPrecio) {
        const newQ = i.cantidad + delta;
        return newQ > 0 ? { ...i, cantidad: newQ } : i;
      }
      return i;
    }));
  };

  const updateTipoPrecio = (id: string, oldTipo: TipoPrecio, newTipo: TipoPrecio) => {
    setCart(prev => prev.map(i => (i.producto.ID === id && i.tipoPrecio === oldTipo) ? { ...i, tipoPrecio: newTipo } : i));
  };

  const removeFromCart = (id: string, tipoPrecio: TipoPrecio) => {
    setCart(prev => prev.filter(i => !(i.producto.ID === id && i.tipoPrecio === tipoPrecio)));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (tipo === 'fiado' && !fiadorId) { alert('Selecciona un fiador'); return; }
    if (tipo === 'contado' && (!amountPaid || parseFloat(amountPaid) < cartTotal)) { alert('Ingresa un monto válido'); return; }

    const fiadorSeleccionado = fiadores.find(f => f.Fiador_ID === fiadorId);
    createVenta.mutate({
      cliente: tipo === 'fiado' ? (fiadorSeleccionado?.Nombre || clienteNombre) : (clienteNombre || 'Contado'),
      tipo,
      fiadorId: tipo === 'fiado' ? fiadorId : '',
      metodoPago,
      total: cartTotal.toFixed(2),
      items: cart.map(i => ({
        productoId: i.producto.ID,
        nombre: i.producto.Nombre,
        tipoPrecio: i.tipoPrecio,
        cantidad: i.cantidad,
        precioUnitario: getPrecio(i.producto, i.tipoPrecio).toFixed(2),
        costoUnitario: i.producto['Precio compra'] || '0',
        subtotal: (getPrecio(i.producto, i.tipoPrecio) * i.cantidad).toFixed(2),
        utilidad: (getPrecio(i.producto, i.tipoPrecio) - parseFloat(i.producto['Precio compra'] || '0')).toFixed(2),
      }))
    });
  };

  async function handleAISearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAILoading(true);
    setAIError('');
    setAIResultados([]);
    setAISugerencia('');
    try {
      const res = await apiRequest("POST", "/api/ai/buscar", { query: aiQuery.trim() });
      const data = await res.json();
      setAIResultados(data.resultados || []);
      setAISugerencia(data.sugerencia || '');
    } catch {
      setAIError('No se pudo conectar con la IA. Intenta de nuevo.');
    } finally {
      setAILoading(false);
    }
  }

  function openAI() {
    setShowAI(true);
    setAIQuery('');
    setAIResultados([]);
    setAISugerencia('');
    setAIError('');
    setTimeout(() => aiInputRef.current?.focus(), 100);
  }

  return (
    <Layout>
      <div className="flex gap-6 h-[calc(100vh-4rem)]">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, detalle, casa, categoría..."
                className="input-field pl-10 pr-12"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-search-pos"
              />
              <button
                onClick={openAI}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
                title="Buscar por síntoma con IA"
                data-testid="button-buscar-ia-pos"
              >
                <Sparkles size={17} className={showAI ? 'text-violet-600' : ''} />
              </button>
            </div>
          </div>

          {/* AI Panel */}
          {showAI && (
            <div className="mb-4 bg-gradient-to-br from-violet-50 to-primary/5 border border-violet-200 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-600" />
                  <span className="font-semibold text-sm text-violet-700">Busca por síntoma o medicamento</span>
                </div>
                <button
                  onClick={() => { setShowAI(false); setAIResultados([]); setAISugerencia(''); setAIError(''); }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAISearch} className="flex gap-2 px-4 pb-3">
                <input
                  ref={aiInputRef}
                  value={aiQuery}
                  onChange={e => setAIQuery(e.target.value)}
                  placeholder='ej: "gripe y fiebre", "dolor de estómago", "paracetamol"...'
                  className="flex-1 h-10 rounded-xl border border-violet-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  data-testid="input-ai-query"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuery.trim()}
                  className="flex items-center gap-1.5 px-4 h-10 rounded-xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-50 interactive-btn"
                >
                  {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  {aiLoading ? 'Buscando...' : 'Buscar'}
                </button>
              </form>

              {aiError && (
                <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{aiError}</div>
              )}

              {aiSugerencia && (
                <div className="mx-4 mb-2 flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
                  <Info size={13} className="mt-0.5 flex-shrink-0" /> {aiSugerencia}
                </div>
              )}

              {aiResultados.length > 0 && (
                <div className="px-4 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{aiResultados.length} resultado(s) en tu inventario</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {aiResultados.map((r) => {
                      const realProd = productos.find(p => p.ID === r.id);
                      const tieneStock = realProd && realProd.Stock !== undefined && realProd.Stock !== '';
                      const stockVal = tieneStock ? (parseInt(realProd!.Stock) || 0) : null;
                      const sinStock = stockVal !== null && stockVal === 0;
                      return (
                        <div key={r.id} className={`p-3 rounded-xl border ${sinStock || !realProd ? 'bg-gray-50 border-border opacity-50' : 'bg-white border-violet-200'}`}>
                          <p className="font-bold text-xs leading-tight line-clamp-2">{r.nombre}</p>
                          {r.detalle && <p className="text-xs text-muted-foreground line-clamp-1">{r.detalle}</p>}
                          {r.relevancia && <p className="text-xs text-violet-600 mt-1 italic line-clamp-2">{r.relevancia}</p>}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-extrabold text-primary">
                              Q {realProd ? parseFloat(realProd['Precio unidad'] || '0').toFixed(2) : (r.precioUnidad || 0)}
                            </span>
                            {tieneStock && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-lg ${sinStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                {sinStock ? 'Sin stock' : `${stockVal}`}
                              </span>
                            )}
                          </div>
                          {!sinStock && realProd && (
                            <div className="flex gap-1 mt-2">
                              <button
                                onClick={() => addToCart(realProd)}
                                className="flex-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg py-1 interactive-btn"
                                data-testid={`button-ai-add-${r.id}`}
                              >
                                <Plus size={11} className="inline mr-0.5" /> Agregar
                              </button>
                              <button
                                onClick={() => setInfoProducto(realProd)}
                                className="px-2 text-xs font-semibold bg-violet-100 text-violet-700 rounded-lg py-1 interactive-btn"
                                data-testid={`button-ai-info-${r.id}`}
                              >
                                <Info size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Cargando desde Google Sheets...</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <PackageSearch size={64} className="opacity-20" />
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
                {filtered.map(p => {
                  const tieneStock = p.Stock !== undefined && p.Stock !== '';
                  const sinStock = tieneStock && (parseInt(p.Stock) || 0) === 0;
                  return (
                    <div
                      key={p.ID}
                      className={`relative group bg-white rounded-2xl border border-border/60 flex flex-col gap-1 overflow-hidden ${sinStock ? 'opacity-40' : 'hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10'}`}
                    >
                      {/* Área principal clickeable para agregar */}
                      <button
                        onClick={() => !sinStock && addToCart(p)}
                        disabled={sinStock}
                        className="text-left p-4 flex flex-col gap-1 flex-1 w-full disabled:cursor-not-allowed"
                        data-testid={`card-producto-${p.ID}`}
                      >
                        <div className="text-xs text-muted-foreground font-mono bg-accent/50 w-max px-2 py-0.5 rounded-md">{p.ID}</div>
                        <div className="font-bold text-foreground line-clamp-2 leading-tight text-sm group-hover:text-primary">{p.Nombre}</div>
                        {p.Detalle && <div className="text-xs text-muted-foreground line-clamp-1">{p.Detalle}</div>}
                        {p.Casa && <div className="text-xs text-muted-foreground">{p.Casa} · {p.Categoria}</div>}
                        <div className="mt-auto pt-2 flex items-center justify-between w-full">
                          <span className="text-lg font-extrabold text-primary">Q {parseFloat(p['Precio unidad'] || '0').toFixed(2)}</span>
                          {tieneStock && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${sinStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {p.Stock}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Botón info IA */}
                      <button
                        onClick={() => setInfoProducto(p)}
                        className="absolute top-2 right-2 p-1.5 rounded-xl bg-white/80 border border-border/40 text-muted-foreground hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        data-testid={`button-info-${p.ID}`}
                        title="Ver dosificación y recomendaciones"
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-80 glass-card rounded-3xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-border/50">
            <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart size={20} className="text-primary" />Carrito
              {cart.length > 0 && <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <ShoppingCart size={40} className="opacity-20" />
                <p className="text-sm">Selecciona productos</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={`${item.producto.ID}-${item.tipoPrecio}`} className="bg-white p-3 rounded-2xl border border-border shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{item.producto.Nombre}</p>
                      <p className="text-primary font-bold text-sm">Q {getPrecio(item.producto, item.tipoPrecio).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setInfoProducto(item.producto)}
                        className="p-1 text-violet-400 hover:bg-violet-50 hover:text-violet-600 rounded-lg"
                        title="Ver dosificación"
                        data-testid={`button-info-cart-${item.producto.ID}`}
                      >
                        <Info size={13} />
                      </button>
                      <button onClick={() => removeFromCart(item.producto.ID, item.tipoPrecio)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {(['unidad', 'blister', 'caja'] as TipoPrecio[]).map(t => {
                      const pr = getPrecio(item.producto, t);
                      if (t !== 'unidad' && pr === 0) return null;
                      return (
                        <button key={t} onClick={() => updateTipoPrecio(item.producto.ID, item.tipoPrecio, t)}
                          className={`text-xs px-2 py-0.5 rounded-lg font-medium interactive-btn border ${item.tipoPrecio === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
                      <button onClick={() => updateQty(item.producto.ID, item.tipoPrecio, -1)} className="p-1 hover:bg-white rounded-lg interactive-btn"><Minus size={14} /></button>
                      <span className="w-6 text-center font-bold text-sm">{item.cantidad}</span>
                      <button onClick={() => updateQty(item.producto.ID, item.tipoPrecio, 1)} className="p-1 hover:bg-white rounded-lg interactive-btn"><Plus size={14} /></button>
                    </div>
                    <span className="font-extrabold text-sm text-foreground">Q {(getPrecio(item.producto, item.tipoPrecio) * item.cantidad).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-5 bg-white border-t border-border/50">
            <div className="flex justify-between items-center mb-5">
              <span className="text-lg text-muted-foreground font-medium">Total</span>
              <span className="text-3xl font-extrabold text-foreground">Q {cartTotal.toFixed(2)}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full interactive-btn py-4 rounded-2xl bg-gradient-to-r from-primary to-teal-500 text-white font-bold text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-cobrar"
            >
              <ReceiptText size={20} /> Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Panel de info de producto (dosificación + recomendaciones) */}
      {infoProducto && (
        <ProductoInfoPanel
          producto={infoProducto}
          onClose={() => setInfoProducto(null)}
          onAdd={() => { addToCart(infoProducto); setInfoProducto(null); }}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Finalizar Venta</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-1">Total</label>
                <div className="text-4xl font-black text-primary">Q {cartTotal.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Tipo de Venta</label>
                <div className="flex gap-2">
                  {(['contado', 'fiado'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={`flex-1 py-2.5 rounded-xl font-bold border-2 interactive-btn ${tipo === t ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === 'contado' && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Método de Pago</label>
                  <div className="flex gap-2">
                    {(['efectivo', 'tarjeta', 'transferencia'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setMetodoPago(m)}
                        className={`flex-1 py-2 rounded-xl font-bold border-2 interactive-btn text-sm ${metodoPago === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tipo === 'contado' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Cliente (opcional)</label>
                    <input className="input-field" placeholder="Nombre del cliente" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Monto Recibido (Q)</label>
                    <input type="number" step="0.01" min={cartTotal} className="input-field text-xl font-bold text-primary" placeholder="0.00" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                  </div>
                  {amountPaid && parseFloat(amountPaid) >= cartTotal && (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="text-sm text-muted-foreground mb-1">Cambio a devolver</div>
                      <div className="text-3xl font-extrabold text-green-600">Q {(parseFloat(amountPaid) - cartTotal).toFixed(2)}</div>
                    </div>
                  )}
                </div>
              )}

              {tipo === 'fiado' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2 flex items-center gap-1"><UserPlus size={16} /> Seleccionar Fiador</label>
                    <select className="input-field" value={fiadorId} onChange={e => setFiadorId(e.target.value)}>
                      <option value="">-- Seleccionar fiador --</option>
                      {fiadores.filter(f => f.Fiador_ID).map(f => (
                        <option key={f.Fiador_ID} value={f.Fiador_ID}>{f.Nombre} (Saldo: Q {parseFloat(f.Saldo_actual || '0').toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsCheckoutOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground interactive-btn">Cancelar</button>
                <button onClick={handleCheckout} disabled={createVenta.isPending} className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-primary to-teal-500 text-white interactive-btn shadow-lg shadow-primary/25">
                  {createVenta.isPending ? 'Procesando...' : 'Confirmar Venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt */}
      {receiptData && (
        <div className="hidden print:block fixed inset-0 bg-white p-6 text-black text-sm font-mono" style={{ fontFamily: 'monospace' }}>
          <div className="text-center mb-4">
            <h1 className="text-xl font-black">FARMACIA WEB</h1>
            <p className="text-xs">{receiptData.fecha}</p>
            <div className="border-t border-b border-black my-2 py-1 text-center text-xs">— COMPROBANTE DE VENTA —</div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between font-bold mb-1 text-xs border-b border-black pb-1">
              <span className="w-1/2">Producto</span><span>Cant</span><span className="text-right">Total</span>
            </div>
            {receiptData.items.map((item, i) => (
              <div key={i} className="mb-1.5">
                <div className="font-bold">{item.producto.Nombre}</div>
                <div className="flex justify-between text-xs">
                  <span>{item.cantidad} x Q {getPrecio(item.producto, item.tipoPrecio).toFixed(2)} ({item.tipoPrecio})</span>
                  <span>Q {(getPrecio(item.producto, item.tipoPrecio) * item.cantidad).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-black pt-2">
            <div className="flex justify-between font-black text-base"><span>TOTAL:</span><span>Q {receiptData.total.toFixed(2)}</span></div>
            {receiptData.paid !== undefined && (
              <>
                <div className="flex justify-between text-sm font-bold mt-1"><span>Recibido:</span><span>Q {receiptData.paid.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-black mt-1 border-t border-black pt-1"><span>CAMBIO:</span><span>Q {(receiptData.change ?? 0).toFixed(2)}</span></div>
              </>
            )}
          </div>
          <p className="text-center mt-6 text-xs">¡Gracias por su preferencia!</p>
          <p className="text-center text-xs">Sin NIT — Consumidor Final</p>
        </div>
      )}
    </Layout>
  );
}
