import { Link, useLocation } from "wouter";
import { 
  ShoppingCart, 
  PackageSearch, 
  Users, 
  WalletCards, 
  LineChart, 
  ShieldCheck,
  Stethoscope
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Punto de Venta", icon: ShoppingCart },
  { href: "/inventory", label: "Inventario", icon: PackageSearch },
  { href: "/clients", label: "Clientes & Fiados", icon: Users },
  { href: "/expenses", label: "Gastos", icon: WalletCards },
  { href: "/register", label: "Control de Caja", icon: LineChart },
  { href: "/users", label: "Usuarios", icon: ShieldCheck },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20">
      
      {/* Sidebar */}
      <aside className="w-72 glass-panel flex flex-col z-20 hidden md:flex relative">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Stethoscope size={28} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmacia Web</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Gestión Médica</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto pb-8">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl interactive-btn cursor-pointer ${
                    isActive 
                      ? "bg-primary/10 text-primary font-semibold shadow-inner" 
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground font-medium"
                  }`}
                >
                  <item.icon size={22} className={isActive ? "text-primary" : "opacity-70"} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-secondary to-accent p-5 rounded-3xl border border-white">
            <p className="text-sm font-semibold text-primary mb-1">Caja Abierta</p>
            <p className="text-xs text-muted-foreground">Turno activo</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
