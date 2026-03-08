import React, { forwardRef } from "react";

const PrintablePedidos = forwardRef(({ order }, ref) => {
  const total = order?.supply_order_items?.reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0
  );

  return (
    <div ref={ref} style={{ padding: 24, fontFamily: "Arial, sans-serif", color: "#111" }}>
      <h1 style={{ marginBottom: 8 }}>Pedido #{order?.id}</h1>
      <p><strong>Empresa:</strong> {order?.company?.name || "-"}</p>
      <p><strong>Data:</strong> {order?.order_date || "-"}</p>
      <p><strong>Status:</strong> {order?.status || "-"}</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Produto</th>
            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Qtd</th>
            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Unid.</th>
            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Valor Unit.</th>
            <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(order?.supply_order_items || []).map((item) => (
            <tr key={item.id}>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {item?.products?.name || "-"}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {item?.ordered_quantity || item?.quantity || 0}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {item?.ordered_unit || item?.products?.unit || "-"}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {Number(item?.unit_price || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>
                {Number(item?.total_price || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 20 }}>
        Total: {Number(total || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </h3>
    </div>
  );
});

PrintablePedidos.displayName = "PrintablePedidos";

export default PrintablePedidos;