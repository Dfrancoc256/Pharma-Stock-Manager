import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
} from "lucide-react";

type ParsedRow = {
  cantidad: string;
  producto: string;
  total: string;
  vendedor: string;
  fecha: string;
  raw: string;
};

function parseCSV(text: string, delimiter: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect if first line is header
  const firstLine = lines[0].toLowerCase();
  const isHeader =
    firstLine.includes("producto") ||
    firstLine.includes("cantidad") ||
    firstLine.includes("total") ||
    firstLine.includes("fecha");
  const dataLines = isHeader ? lines.slice(1) : lines;

  return dataLines
    .map(line => {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));
      // Expected order: Cantidad, Producto, Total, Vendedor, Fecha, CierreCaja, CajaHoy
      return {
        cantidad: cols[0] || "1",
        producto: cols[1] || "",
        total: cols[2] || "",
        vendedor: cols[3] || "",
        fecha: cols[4] || "",
        raw: line,
      };
    })
    .filter(r => r.producto.trim() !== "");
}

export default function ImportarPage() {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ importadas: number; errores: string[]; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = (ev.target?.result as string) || "";
      setCsvText(text);
      setIsParsed(false);
      setParsed([]);
      setResult(null);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handlePreview = () => {
    if (!csvText.trim()) {
      toast({ title: "Pega o sube el archivo CSV primero", variant: "destructive" });
      return;
    }
    const rows = parseCSV(csvText, delimiter);
    if (rows.length === 0) {
      toast({ title: "No se detectaron filas válidas", description: "Verifica el delimitador y el contenido", variant: "destructive" });
      return;
    }
    setParsed(rows);
    setIsParsed(true);
    setResult(null);
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setIsImporting(true);
    try {
      const data = await apiRequest("POST", "/api/sheets/import-ventas", { rows: parsed });
      const res = await data.json();
      setResult(res);
      toast({
        title: `Importación completada`,
        description: `${res.importadas} ventas importadas de ${res.total}`,
      });
    } catch (err: any) {
      toast({ title: "Error al importar", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setCsvText("");
    setParsed([]);
    setIsParsed(false);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="text-primary" size={26} />
            Importar Ventas Históricas
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Importa tu historial de ventas desde Excel exportado como CSV.
            Columnas esperadas: <strong>Cantidad, Producto, Total, Vendedor, Fecha</strong>
          </p>
        </div>

        {/* Step 1: Upload / Paste */}
        {!isParsed && !result && (
          <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
              Sube o pega el archivo CSV
            </h2>

            {/* File upload */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
              data-testid="drop-zone"
            >
              <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Haz clic para subir un archivo CSV</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Exporta tu Excel como CSV (Archivo → Guardar como → CSV)</p>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} data-testid="input-file" />
            </div>

            <div className="text-center text-xs text-muted-foreground">— o pega el contenido directamente —</div>

            <Textarea
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setIsParsed(false); }}
              placeholder={"Pega aquí el contenido CSV...\nEjemplo:\n1,Acetaminofén,25.00,Diego,15/03/2024\n2,Amoxicilina,45.00,Diego,15/03/2024"}
              className="min-h-[180px] font-mono text-xs"
              data-testid="textarea-csv"
            />

            {/* Delimiter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Separador:</span>
              {[
                { label: "Coma (,)", value: "," },
                { label: "Punto y coma (;)", value: ";" },
                { label: "Tab", value: "\t" },
              ].map(d => (
                <button
                  key={d.value}
                  onClick={() => setDelimiter(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    delimiter === d.value
                      ? "bg-primary text-white border-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                  data-testid={`btn-delimiter-${d.label}`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <Button onClick={handlePreview} className="w-full gap-2" data-testid="button-preview">
              <ArrowRight size={16} />
              Previsualizar datos
            </Button>
          </div>
        )}

        {/* Step 2: Preview */}
        {isParsed && !result && (
          <div className="space-y-4">
            <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                  Vista previa — {parsed.length} filas detectadas
                </h2>
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
                  <Trash2 size={14} /> Volver
                </Button>
              </div>

              <div className="overflow-auto max-h-80 rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Cantidad</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 100).map((row, i) => {
                      const totalNum = parseFloat((row.total || "").replace(/,/g, "").replace(/Q/gi, ""));
                      const invalid = !row.producto || isNaN(totalNum) || totalNum <= 0;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-border/30 ${invalid ? "bg-red-50 dark:bg-red-950/20" : i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                          data-testid={`row-preview-${i}`}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-1.5">{row.fecha || "—"}</td>
                          <td className="px-3 py-1.5 font-medium">{row.producto || <span className="text-red-500">Sin producto</span>}</td>
                          <td className="px-3 py-1.5 text-right">{row.cantidad}</td>
                          <td className="px-3 py-1.5 text-right">{isNaN(totalNum) ? <span className="text-red-500">{row.total}</span> : `Q${totalNum.toFixed(2)}`}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{row.vendedor || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {parsed.length > 100 && (
                  <div className="text-center py-2 text-xs text-muted-foreground">
                    Mostrando 100 de {parsed.length} filas
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset} className="flex-1" data-testid="button-back">
                  Volver a editar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex-1 gap-2"
                  data-testid="button-import"
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                      Importando {parsed.length} ventas...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importar {parsed.length} ventas a Google Sheets
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {result && (
          <div className="space-y-4">
            <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">✓</span>
                Importación completada
              </h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 text-center">
                  <CheckCircle2 className="mx-auto mb-1 text-green-600" size={24} />
                  <p className="text-2xl font-bold text-green-700">{result.importadas}</p>
                  <p className="text-xs text-green-600">Importadas</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 text-center">
                  <AlertCircle className="mx-auto mb-1 text-red-500" size={24} />
                  <p className="text-2xl font-bold text-red-600">{result.errores.length}</p>
                  <p className="text-xs text-red-500">Con error</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <FileSpreadsheet className="mx-auto mb-1 text-muted-foreground" size={24} />
                  <p className="text-2xl font-bold text-foreground">{result.total}</p>
                  <p className="text-xs text-muted-foreground">Total filas</p>
                </div>
              </div>

              {result.errores.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-medium text-red-700 mb-2">Filas no importadas:</p>
                  {result.errores.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• {e}</p>
                  ))}
                  {result.errores.length > 10 && (
                    <p className="text-xs text-red-500">...y {result.errores.length - 10} más</p>
                  )}
                </div>
              )}

              <Button onClick={handleReset} className="w-full" variant="outline" data-testid="button-import-more">
                Importar otro archivo
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-sm">¿Cómo exportar tu Excel como CSV?</h3>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Abre tu archivo Excel</li>
            <li>Ve a <strong>Archivo → Guardar como</strong></li>
            <li>En tipo de archivo, elige <strong>CSV (delimitado por comas)</strong></li>
            <li>Guarda el archivo</li>
            <li>Súbelo aquí usando el botón de arriba</li>
          </ol>
          <p className="text-xs text-blue-600 dark:text-blue-500">
            El orden de las columnas debe ser: <strong>Cantidad, Producto, Total, Vendedor, Fecha</strong>.<br/>
            Las columnas de "Cierre Caja" y "Caja hoy" serán ignoradas automáticamente.
          </p>
        </div>
      </div>
    </Layout>
  );
}
