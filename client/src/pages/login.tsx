import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) return null;
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Farmacia Web</CardTitle>
          <CardDescription className="text-lg">Gestión de Inventario y Ventas</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-muted-foreground mb-4">
            Accede de forma segura utilizando tu cuenta de Replit.
          </p>
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover-elevate"
            onClick={() => window.location.href = "/api/login"}
          >
            Iniciar Sesión con Replit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
