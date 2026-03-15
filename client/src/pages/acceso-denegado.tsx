import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldOff, LogIn } from "lucide-react";

const RAZONES: Record<string, { titulo: string; desc: string }> = {
  "no-registrado": {
    titulo: "Usuario no registrado",
    desc: "Tu correo electrónico no está registrado en el sistema. Contacta al administrador de la farmacia para que te agregue.",
  },
  "inactivo": {
    titulo: "Usuario inactivo",
    desc: "Tu cuenta está desactivada. Contacta al administrador para reactivarla.",
  },
  "sin-email": {
    titulo: "Sin correo electrónico",
    desc: "No se pudo obtener tu correo electrónico. Intenta de nuevo.",
  },
};

export default function AccesoDenegadoPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const razon = params.get("razon") || "no-registrado";
  const info = RAZONES[razon] || RAZONES["no-registrado"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-destructive">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-destructive">
            Acceso Denegado
          </CardTitle>
          <CardDescription className="text-base font-medium">{info.titulo}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-muted-foreground text-sm">{info.desc}</p>
          <div className="border-t pt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => (window.location.href = "/api/login")}
              data-testid="button-reintentar"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Intentar con otra cuenta
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Farmacia Web &mdash; Sistema de Gestión
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
