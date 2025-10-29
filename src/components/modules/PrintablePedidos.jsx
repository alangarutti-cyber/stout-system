import React, { forwardRef } from "react";
import logoStout from "@/assets/LogoStoutBurger.png";

const PrintablePedidos = forwardRef(({ order }, ref) => {
  if (!order) return null;

  const groupedItems = order.supply_order_items?.reduce((acc, item) => {
    const category = item.products?.product_categories?.name || "Outros";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const total = order.supply_order_items?.reduce(
    (sum, i) => sum + (i.total_price || 0),
    0
  );

  return (
    <div
      ref={ref}
      id={`printable-pedido-${order.id}`}
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#222",
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm 15mm 20mm 15mm",
        boxSizing: "border-box",
      }}
    >
      <style>
        {`
          @media print {
            @page {
              margin: 12mm;
            }
            .page-break {
              page-break-before: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      {/* ===== Cabeçalho minimalista ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <img
          src={logoStout}
          alt="Logo Stout Burger"
          style={{ height: "35px", marginRight: "10px" }}
        />
        <h2
          style={{
            margin: "0",
            fontSize: "16px",
            fontWeight: "bold",
            textAlign: "right",
          }}
        >
          Pedido de Insumos #{order.id}
        </h2>
      </div>

      <hr style={{ border: "0.5px solid #ccc", margin: "4px 0 8px 0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          fontSize: "11px",
          marginBottom: "10px",
        }}
      >
        <div>
          <p style={{ margin: "2px 0" }}>
            <strong>Empresa:</strong> {order.company?.name}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>Data:</strong>{" "}
            {new Date(order.order_date).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div>
          <p style={{ margin: "2px 0" }}>
            <strong>Solicitante:</strong> {order.user?.name}
          </p>
          <p style={{ margin: "2px 0" }}>
            <strong>Status:</strong> {order.status || "Pendente"}
          </p>
        </div>
      </div>

      {/* ===== Conteúdo ===== */}
      <main style={{ marginBottom: "45mm" }}>
        {Object.entries(groupedItems || {}).map(([cat, items], catIndex) => (
          <div
            key={cat}
            className="no-break"
            style={{ marginBottom: "20px", pageBreakInside: "avoid" }}
          >
            <h3
              style={{
                background: "#C8102E",
                color: "white",
                padding: "5px 8px",
                borderRadius: "4px",
                fontSize: "12.5px",
                fontWeight: "bold",
              }}
            >
              {cat}
            </h3>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
                marginTop: "4px",
              }}
            >
              <thead>
                <tr style={{ background: "#f5f5f5" }}>
                  <th style={{ padding: "4px" }}>Produto</th>
                  <th style={{ padding: "4px", textAlign: "center" }}>Qtd</th>
                  <th style={{ padding: "4px", textAlign: "center" }}>Unid.</th>
                  <th style={{ padding: "4px", textAlign: "right" }}>Vl. Unit.</th>
                  <th style={{ padding: "4px", textAlign: "right" }}>Vl. Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid #ddd",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <td style={{ padding: "3px" }}>{i.products?.name}</td>
                    <td style={{ padding: "3px", textAlign: "center" }}>
                      {i.ordered_quantity || i.quantity}
                    </td>
                    <td style={{ padding: "3px", textAlign: "center" }}>
                      {i.ordered_unit || i.products?.unit}
                    </td>
                    <td style={{ padding: "3px", textAlign: "right" }}>
                      {(i.unit_price || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td style={{ padding: "3px", textAlign: "right" }}>
                      {(i.total_price || 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {catIndex % 4 === 3 && <div className="page-break"></div>}
          </div>
        ))}
      </main>

      {/* ===== Total geral ===== */}
      <div
        style={{
          textAlign: "right",
          fontSize: "12px",
          fontWeight: "bold",
          marginTop: "10px",
        }}
      >
        Total do Pedido:{" "}
        {total?.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </div>

      {/* ===== Rodapé ===== */}
      <footer
        style={{
          position: "absolute",
          bottom: "10mm",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: "9.5px",
          color: "#444",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginBottom: "4mm",
          }}
        >
          <div
            style={{
              width: "40%",
              borderTop: "1px solid #333",
              paddingTop: "2mm",
            }}
          >
            Conferido por
          </div>
          <div
            style={{
              width: "40%",
              borderTop: "1px solid #333",
              paddingTop: "2mm",
            }}
          >
            Assinatura do responsável
          </div>
        </div>
        <p style={{ fontSize: "9px" }}>
          Gerado automaticamente pelo <b>Stout System</b> —{" "}
          {new Date().toLocaleDateString("pt-BR")}
        </p>
      </footer>

      <div style={{ height: "45mm" }}></div>
    </div>
  );
});

export default PrintablePedidos;
