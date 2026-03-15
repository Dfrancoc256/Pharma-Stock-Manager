import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Search, Sparkles, Clock, Loader2, AlertCircle, Package,
  TrendingUp, TrendingDown, Minus, ChevronRight, Info, ShoppingCart, Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Producto = {
  id: string; nombre: string; detalle?: string;
  categoria?: string; precioUnidad?: number; stock?: number;
  relevancia?: string; razon?: string;
};

type BuscarResult = { resultados: Producto[]; sugerencia?: string };
type RecomendarResult = { complementarios: Producto[]; alternativos: Producto[]; nota?: string };
type DuracionResult = {
  diasEstimados: number; semanas: number; nivel: string;
  mensaje: string; recomendacion: string; alertas: string[];
  margenUtilidad?: string; puntoPedido?: number;
  producto: { id: string; nombre: string; stockActual: number; precioUnidad: number; precioCompra: number };
};

function NivelBadge({ nivel }: { nivel: string }) {
  const map: Record<string, { label: string; color: string }> = {
    critico: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200" },
    bajo:    { label: "Bajo",    color: "bg-orange-100 text-orange-700 border-orange-200" },
    ok:      { label: "Normal",  color: "bg-green-100 text-green-700 border-green-200" },
    alto:    { label: "Alto",    color: "bg-blue-100 text-blue-700 border-blue-200" },
  };
  const n = map[nivel?.toLowerCase()] || map.ok;
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${n.color}`}>{n.label}</span>;
}

function NivelIcon({ nivel }: { nivel: string }) {
  if (nivel === "critico") return <TrendingDown className="text-red-500" size={20} />;
  if (nivel === "bajo")    return <TrendingDown className="text-orange-500" size={20} />;
  if (nivel === "alto")    return <TrendingUp className="text-blue-500" size={20} />;
  return <Minus className="text-green-500" size={20} />;
}

function ProductoCard({ p, extra }: { p: Producto; extra?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-border/40 hover:border-primary/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Package size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground leading-tight">{p.nombre}</p>
        {p.detalle && <p className="text-xs text-muted-foreground">{p.detalle}</p>}
        {p.categoria && <Badge variant="secondary" className="mt-1 text-xs h-5">{p.categoria}</Badge>}
        {(p.relevancia || p.razon || extra) && (
          <p className="text-xs text-primary mt-1.5 italic">{p.relevancia || p.razon || extra}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {p.precioUnidad != null && p.precioUnidad > 0 && (
          <p className="text-sm font-bold text-foreground">Q{p.precioUnidad.toFixed(2)}</p>
        )}
        {p.stock != null && (
          <p className="text-xs text-muted-foreground">{p.stock} uds</p>
        )}
      </div>
    </div>
  );
}

export default function AsistenteIAPage() {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [duracionId, setDuracionId] = useState("");
  const [buscarResult, setBuscarResult] = useState<BuscarResult | null>(null);
  const [recomenResult, setRecomenResult] = useState<RecomendarResult | null>(null);
  const [durResult, setDurResult] = useState<DuracionResult | null>(null);
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingDur, setLoadingDur] = useState(false);
  const [errorBuscar, setErrorBuscar] = useState("");
  const [errorRec, setErrorRec] = useState("");
  const [errorDur, setErrorDur] = useState("");

  // Stock para selector de duración
  const { data: stockData } = useQuery<any[]>({
    queryKey: ["/api/sheets/stock"],
    staleTime: 60000,
  });

  const stockConStock = (stockData || [])
    .filter((p: any) => p.ID && p.Nombre && parseInt(p.Stock) > 0)
    .slice(0, 100);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!busqueda.trim()) return;
    setBusquedaActiva(busqueda.trim());
    setLoadingBuscar(true);
    setErrorBuscar("");
    setBuscarResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/buscar", { query: busqueda.trim() });
      const data = await res.json();
      setBuscarResult(data);
    } catch {
      setErrorBuscar("No se pudo conectar con el asistente IA.");
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function handleRecomendar(p: Producto) {
    setProductoSeleccionado(p);
    setLoadingRec(true);
    setErrorRec("");
    setRecomenResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/recomendar", { productoId: p.id, nombre: p.nombre });
      const data = await res.json();
      setRecomenResult(data);
    } catch {
      setErrorRec("Error obteniendo recomendaciones.");
    } finally {
      setLoadingRec(false);
    }
  }

  async function handleDuracion(e: React.FormEvent) {
    e.preventDefault();
    if (!duracionId) return;
    setLoadingDur(true);
    setErrorDur("");
    setDurResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/duracion", { productoId: duracionId });
      const data = await res.json();
      setDurResult(data);
    } catch {
      setErrorDur("Error analizando duración de stock.");
    } finally {
      setLoadingDur(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Asistente IA</h1>
            <p className="text-muted-foreground text-sm">Búsqueda inteligente, recomendaciones y análisis de stock</p>
          </div>
        </div>

        <Tabs defaultValue="buscar" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="buscar" className="gap-2">
              <Search size={15} /> Búsqueda IA
            </TabsTrigger>
            <TabsTrigger value="recomendar" className="gap-2">
              <Star size={15} /> Recomendaciones
            </TabsTrigger>
            <TabsTrigger value="duracion" className="gap-2">
              <Clock size={15} /> Duración Stock
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB: BÚSQUEDA ============ */}
          <TabsContent value="buscar" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search size={18} className="text-primary" /> Búsqueda por síntoma o nombre
                </CardTitle>
                <CardDescription>
                  Escribe un síntoma (ej: "dolor de cabeza y fiebre") o nombre parcial del medicamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBuscar} className="flex gap-2">
                  <Input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="ej: infección, gripe, dolor de estómago, paracetamol..."
                    className="flex-1"
                    data-testid="input-busqueda-ia"
                  />
                  <Button type="submit" disabled={loadingBuscar || !busqueda.trim()} data-testid="button-buscar-ia">
                    {loadingBuscar ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {loadingBuscar ? "Buscando..." : "Buscar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {errorBuscar && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription>{errorBuscar}</AlertDescription>
              </Alert>
            )}

            {buscarResult && (
              <div className="space-y-3">
                {buscarResult.sugerencia && (
                  <Alert className="border-primary/30 bg-primary/5">
                    <Info size={16} className="text-primary" />
                    <AlertDescription className="text-sm">{buscarResult.sugerencia}</AlertDescription>
                  </Alert>
                )}
                <p className="text-sm font-semibold text-muted-foreground">
                  {buscarResult.resultados?.length || 0} resultado(s) para "{busquedaActiva}"
                </p>
                <div className="grid gap-2">
                  {buscarResult.resultados?.map((p, i) => (
                    <div key={p.id || i} className="relative">
                      <ProductoCard p={p} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute right-2 top-2 text-xs text-primary hover:bg-primary/10 h-7"
                        onClick={() => handleRecomendar(p)}
                        data-testid={`button-recomendar-${p.id}`}
                      >
                        <ChevronRight size={13} /> Ver recomendaciones
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============ TAB: RECOMENDACIONES ============ */}
          <TabsContent value="recomendar" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star size={18} className="text-amber-500" /> Recomendaciones IA
                </CardTitle>
                <CardDescription>
                  Selecciona un producto de la búsqueda o escribe el nombre para ver complementos y alternativas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {productoSeleccionado ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <Package size={16} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{productoSeleccionado.nombre}</p>
                      {productoSeleccionado.detalle && <p className="text-xs text-muted-foreground">{productoSeleccionado.detalle}</p>}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setProductoSeleccionado(null); setRecomenResult(null); }}>
                      Cambiar
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del producto..."
                      id="rec-nombre"
                      className="flex-1"
                      data-testid="input-recomendar-nombre"
                    />
                    <Button
                      onClick={() => {
                        const val = (document.getElementById("rec-nombre") as HTMLInputElement)?.value;
                        if (val) handleRecomendar({ id: "", nombre: val });
                      }}
                      disabled={loadingRec}
                    >
                      {loadingRec ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Recomendar
                    </Button>
                  </div>
                )}

                {productoSeleccionado && !recomenResult && !loadingRec && (
                  <Button onClick={() => handleRecomendar(productoSeleccionado)} className="w-full" data-testid="button-obtener-recomendaciones">
                    <Sparkles size={16} className="mr-2" /> Obtener recomendaciones
                  </Button>
                )}

                {loadingRec && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                    <Loader2 size={16} className="animate-spin" /> Analizando complementos y alternativas...
                  </div>
                )}
              </CardContent>
            </Card>

            {errorRec && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription>{errorRec}</AlertDescription>
              </Alert>
            )}

            {recomenResult && (
              <div className="space-y-4">
                {recomenResult.nota && (
                  <Alert className="border-amber-300/50 bg-amber-50">
                    <Info size={16} className="text-amber-600" />
                    <AlertDescription className="text-sm text-amber-800">{recomenResult.nota}</AlertDescription>
                  </Alert>
                )}

                {recomenResult.complementarios?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingCart size={15} className="text-green-600" />
                      Productos complementarios
                    </p>
                    <div className="grid gap-2">
                      {recomenResult.complementarios.map((p, i) => (
                        <ProductoCard key={p.id || i} p={p} />
                      ))}
                    </div>
                  </div>
                )}

                {recomenResult.alternativos?.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp size={15} className="text-blue-600" />
                        Alternativas disponibles
                      </p>
                      <div className="grid gap-2">
                        {recomenResult.alternativos.map((p, i) => (
                          <ProductoCard key={p.id || i} p={p} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* ============ TAB: DURACIÓN STOCK ============ */}
          <TabsContent value="duracion" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock size={18} className="text-blue-500" /> Estimación de duración de stock
                </CardTitle>
                <CardDescription>
                  Selecciona un producto para que la IA estime cuánto durará el inventario actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDuracion} className="flex gap-2">
                  <select
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={duracionId}
                    onChange={e => { setDuracionId(e.target.value); setDurResult(null); }}
                    data-testid="select-producto-duracion"
                  >
                    <option value="">Selecciona un producto...</option>
                    {stockConStock.map((p: any) => (
                      <option key={p.ID} value={p.ID}>
                        {p.Nombre} {p.Detalle || ""} — Stock: {p.Stock} uds
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={loadingDur || !duracionId} data-testid="button-analizar-duracion">
                    {loadingDur ? <Loader2 size={16} className="animate-spin" /> : <Clock size={16} />}
                    {loadingDur ? "Analizando..." : "Analizar"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {errorDur && (
              <Alert variant="destructive">
                <AlertCircle size={16} />
                <AlertDescription>{errorDur}</AlertDescription>
              </Alert>
            )}

            {durResult && (
              <div className="space-y-4">
                {/* Tarjeta principal */}
                <Card className={`border-2 ${
                  durResult.nivel === "critico" ? "border-red-200 bg-red-50/50" :
                  durResult.nivel === "bajo"    ? "border-orange-200 bg-orange-50/50" :
                  durResult.nivel === "alto"    ? "border-blue-200 bg-blue-50/50" :
                  "border-green-200 bg-green-50/50"
                }`}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <NivelIcon nivel={durResult.nivel} />
                        <div>
                          <p className="font-bold text-lg">{durResult.producto.nombre}</p>
                          <p className="text-sm text-muted-foreground">{durResult.producto.stockActual} unidades en stock</p>
                        </div>
                      </div>
                      <NivelBadge nivel={durResult.nivel} />
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{durResult.diasEstimados}</p>
                        <p className="text-xs text-muted-foreground">días estimados</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{durResult.semanas}</p>
                        <p className="text-xs text-muted-foreground">semanas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{durResult.puntoPedido || "—"}</p>
                        <p className="text-xs text-muted-foreground">punto de pedido</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-2">
                      <p className="text-sm text-foreground">{durResult.mensaje}</p>
                      <p className="text-sm font-medium text-primary">{durResult.recomendacion}</p>
                    </div>

                    {durResult.alertas?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {durResult.alertas.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg p-2">
                            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                            {a}
                          </div>
                        ))}
                      </div>
                    )}

                    {durResult.margenUtilidad && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <TrendingUp size={13} />
                        Margen de utilidad estimado: <span className="font-semibold text-foreground">{durResult.margenUtilidad}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Precios */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Información del producto</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Precio compra</p>
                        <p className="font-bold">Q{durResult.producto.precioCompra.toFixed(2)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground">Precio venta</p>
                        <p className="font-bold text-green-700">Q{durResult.producto.precioUnidad.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
