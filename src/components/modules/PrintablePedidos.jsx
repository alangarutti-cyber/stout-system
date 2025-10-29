import React, { forwardRef } from "react";
import logo from "@/assets/LogoStoutBurger.png";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/pt-br";

// Configurações do Day.js
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("pt-br");
dayjs.tz.setDefault("America/Sao_Paulo");

const PrintablePedidos = forwardRef(({ order }, ref) => {
  if (!order) return null;

  // Agrupar itens por categoria
  const groupedItems = order.supply_order_items?.reduce((acc, item) => {
    const category = item.products?.product_categories?.name || "Sem Categoria";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  // Total geral
  const totalGeral = order.supply_order_items?.reduce(
    (sum, i) => sum + (i.total_price || 0),
    0
  );

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "Arial, sans-serif",
        padding: "10mm 8mm 12mm 8mm",
        color: "#222",
        fontSize: "11px",
        width: "190mm",
        margin: "0 auto",
      }}
    >
      {/* ===== CABEÇALHO ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid #ccc",
          paddingBottom: "6px",
          marginBottom: "8px",
        }}
      >
        <img
          src={logo}
          alt="Logo Stout Burger"
          style={{ height: "38px", opacity: 0.9 }}
        />
        <div style={{ textAlign: "right", lineHeight: "1.4" }}>
          <h2 style={{ fontSize: "14px", margin: 0 }}>
            Pedido de Insumos #{order.id}
          </h2>
          <p style={{ margin: 0 }}>
            <strong>Empresa:</strong> {order.company?.name}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Solicitante:</strong> {order.user?.name}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Data:</strong>{" "}
            {dayjs(order.order_date).tz().format("DD/MM/YYYY")}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Status:</strong> {order.status}
          </p>
        </div>
      </div>

      {/* ===== ITENS AGRUPADOS ===== */}
      {Object.entries(groupedItems || {}).map(([categoria, itens]) => (
        <div key={categoria} style={{ marginBottom: "8px" }}>
          <div
            style={{
              backgroundColor: "#C8102E",
              color: "#fff",
              fontWeight: "bold",
              padding: "4px 8px",
              borderRadius: "4px 4px 0 0",
              fontSize: "11px",
            }}
          >
            {categoria}
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "6px",
            }}
          >
            <thead>
              <tr style={{ background: "#f2f2f2", textAlign: "left" }}>
                <th style={{ padding: "3px 6px", width: "45%" }}>Produto</th>
                <th style={{ padding: "3px 6px", width: "10%" }}>Qtd</th>
                <th style={{ padding: "3px 6px", width: "10%" }}>Unid.</th>
                <th style={{ padding: "3px 6px", width: "15%", textAlign: "right" }}>
                  Vl. Unit.
                </th>
                <th style={{ padding: "3px 6px", width: "20%", textAlign: "right" }}>
                  Vl. Total
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  <td style={{ padding: "3px 6px" }}>{item.products?.name}</td>
                  <td style={{ padding: "3px 6px", textAlign: "center" }}>
                    {item.ordered_quantity || item.quantity}
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "center" }}>
                    {item.ordered_unit || item.products?.unit}
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {(item.unit_price || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    {(item.total_price || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ===== TOTAL GERAL ===== */}
      <div
        style={{
          textAlign: "right",
          fontWeight: "bold",
          fontSize: "12px",
          borderTop: "2px solid #C8102E",
          paddingTop: "4px",
          marginTop: "8px",
        }}
      >
        Total do Pedido:{" "}
        {totalGeral?.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </div>

      {/* ===== RODAPÉ ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "18px",
          fontSize: "9px",
          color: "#555",
        }}
      >
        <div style={{ textAlign: "center", width: "45%" }}>
          <div
            style={{
              borderTop: "1px solid #000",
              marginBottom: "2px",
              width: "100%",
            }}
          ></div>
          Conferido por
        </div>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div
            style={{
              borderTop: "1px solid #000",
              marginBottom: "2px",
              width: "100%",
            }}
          ></div>
          Assinatura do Responsável
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: "10px",
          fontSize: "8px",
          color: "#777",
        }}
      >
        Gerado automaticamente pelo <strong>Stout System</strong> —{" "}
        {dayjs().tz().format("DD/MM/YYYY HH:mm")}
      </p>
    </div>
  );
});

export default PrintablePedidos;
