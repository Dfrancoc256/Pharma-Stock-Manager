import { useState, useMemo } from "react";
import { useProducts } from "@/hooks/use-products";
import { useClients } from "@/hooks/use-clients";
import { useCreateSale } from "@/hooks/use-sales";
import { Layout } from "@/components/Layout";
import { Search, Plus, Minus, Trash2, ReceiptText, UserPlus, CreditCard, ShoppingCart, PackageSearch } from "lucide-react";
import { type Product } from "@shared/schema";
import { format } from "date-fns";

type CartItem = {
  product: Product;
  quantity: number;
};

export default function POSPage() {
  const { data: products = [], isLoading } = useProducts();
  const { data: clients = [] } = useClients();
  const createSale = useCreateSale();
  
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [status, setStatus] = useState<"paid" | "credit">("paid");
  const [clientId, setClientId] = useState<number | "">("");
  
  const [receiptData, setReceiptData] = useState<{items: CartItem[], total: number, date: Date} | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.includes(search))
  );

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (parseFloat(item.product.price) * item.quantity), 0);
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (status === "credit" && !clientId) {
      alert("Seleccione un cliente para la venta al fiado");
      return;
    }

    createSale.mutate({
      sale: {
        total: cartTotal.toString(),
        status,
        clientId: status === "credit" ? Number(clientId) : null,
      },
      items: cart.map(i => ({
        saleId: 0, 
        productId: i.product.id,
        quantity: i.quantity,
        price: i.product.price,
      }))
    }, {
      onSuccess: () => {
        setReceiptData({
          items: [...cart],
          total: cartTotal,
          date: new Date()
        });
        setCart([]);
        setIsCheckoutOpen(false);
        setStatus("paid");
        setClientId("");
        
        // Wait for state to update, then print
        setTimeout(() => window.print(), 100);
      }
    });
  };

  return (
    <Layout>
      <div className="flex gap-6 h-[calc(100vh-4rem)]">
        
        {/* Left Side: Products */}
        <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden border-border/40">
          <div className="p-6 border-b border-border/50 bg-white/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <input
                autoFocus
                type="text"
                placeholder="Buscar por nombre o código de barras..."
                className="input-field pl-12 text-lg shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-full text-muted-foreground">Cargando productos...</div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="interactive-btn text-left bg-white p-5 rounded-2xl border border-border/60 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 flex flex-col gap-2 group"
                  >
                    <div className="text-xs text-muted-foreground font-mono bg-accent/50 w-max px-2 py-1 rounded-md">{product.barcode || 'S/N'}</div>
                    <div className="font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{product.name}</div>
                    <div className="mt-auto pt-2 flex items-center justify-between w-full">
                      <span className="text-xl font-extrabold text-teal-600">Bs. {product.price}</span>
                      <span className="text-xs text-muted-foreground font-medium bg-gray-100 px-2 py-1 rounded-lg">Stock: {product.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart */}
        <div className="w-[400px] flex flex-col glass-card rounded-3xl overflow-hidden border-border/40 shrink-0">
          <div className="p-6 bg-gradient-to-r from-primary to-teal-500 text-white">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart /> Venta Actual
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/40">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 opacity-50">
                <PackageSearch size={48} />
                <p>Carrito vacío</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.product.id} className="bg-white p-3 rounded-2xl border border-border flex items-center justify-between shadow-sm">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-sm truncate">{item.product.name}</p>
                    <p className="text-primary font-bold text-sm">Bs. {item.product.price}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded-lg interactive-btn"><Minus size={16} /></button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded-lg interactive-btn"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="ml-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl interactive-btn">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-border/50">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg text-muted-foreground font-medium">Total a cobrar</span>
              <span className="text-3xl font-extrabold text-foreground">Bs. {cartTotal.toFixed(2)}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full interactive-btn py-4 rounded-2xl bg-gradient-to-r from-primary to-teal-500 text-white font-bold text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard /> Cobrar
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="glass-card rounded-3xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-6">Finalizar Venta</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Total</label>
                <div className="text-4xl font-black text-primary">Bs. {cartTotal.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Método de Pago</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setStatus("paid")}
                    className={`flex-1 py-3 rounded-xl font-bold interactive-btn border-2 ${status === 'paid' ? 'bg-primary/10 border-primary text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    Pagado
                  </button>
                  <button 
                    onClick={() => setStatus("credit")}
                    className={`flex-1 py-3 rounded-xl font-bold interactive-btn border-2 ${status === 'credit' ? 'bg-orange-500/10 border-orange-500 text-orange-600' : 'border-border text-muted-foreground'}`}
                  >
                    Fiado
                  </button>
                </div>
              </div>

              {status === "credit" && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2"><UserPlus size={16}/> Seleccionar Cliente</label>
                  <select 
                    className="input-field"
                    value={clientId}
                    onChange={(e) => setClientId(Number(e.target.value))}
                  >
                    <option value="">-- Seleccione un cliente --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Deuda actual: Bs. {c.debt})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-muted text-muted-foreground hover:bg-muted/80 interactive-btn"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={createSale.isPending}
                  className="flex-1 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 interactive-btn shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {createSale.isPending ? "Procesando..." : <><ReceiptText size={20}/> Confirmar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Receipt Area (Hidden in screen, block in print) */}
      {receiptData && (
        <div className="print-receipt text-black hidden font-mono text-sm leading-tight p-4 w-[300px]">
          <div className="text-center mb-4">
            <h1 className="font-bold text-xl mb-1">FARMACIA WEB</h1>
            <p>Comprobante de Venta</p>
            <p>Sin Valor Fiscal</p>
            <p className="mt-2 text-xs">{format(receiptData.date, "dd/MM/yyyy HH:mm")}</p>
          </div>
          
          <div className="border-t border-b border-black py-2 my-2 border-dashed">
            <div className="flex justify-between font-bold mb-2 text-xs">
              <span className="w-1/2">Cant x Prod</span>
              <span className="text-right">Total</span>
            </div>
            {receiptData.items.map(item => (
              <div key={item.product.id} className="mb-2">
                <div className="font-bold truncate">{item.product.name}</div>
                <div className="flex justify-between text-xs">
                  <span>{item.quantity} x {item.product.price}</span>
                  <span>Bs. {(parseFloat(item.product.price) * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-lg font-bold mt-4">
            <span>TOTAL:</span>
            <span>Bs. {receiptData.total.toFixed(2)}</span>
          </div>
          <p className="text-center mt-8 text-xs">¡Gracias por su preferencia!</p>
        </div>
      )}
    </Layout>
  );
}
