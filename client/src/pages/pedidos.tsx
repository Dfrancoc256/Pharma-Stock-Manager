import { useEffect, useState } from "react";

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);

  const cargarPedidos = async () => {
    const res = await fetch("/api/sheets/pedidos");
    const json = await res.json();

    setPedidos(Array.isArray(json.data) ? json.data : []);
  };

  useEffect(() => {
    cargarPedidos();
  }, []);

  return (
    <div>
      <h2>Pedidos</h2>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Proveedor</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {pedidos.map((p) => (
            <tr key={p.ID_Pedido}>
              <td>{p.ID_Pedido}</td>
              <td>{p.Nombre}</td>
              <td>{p.Cantidad}</td>
              <td>{p.Proveedor}</td>
              <td>{p.Estado}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}