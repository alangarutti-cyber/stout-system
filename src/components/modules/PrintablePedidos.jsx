import React, { forwardRef } from "react";

const PrintablePedidos = forwardRef(({ order }, ref) => {
  const itens = order?.supply_order_items || [];

  const total = itens.reduce(
    (sum, item) => sum + Number(item.total_price || 0),
    0
  );

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("pt-BR");
    } catch {
      return value;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return value;
    }
  };

  return (
    <div
      ref={ref}
      style={{
        padding: "20px 20px 30px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#111",
        background: "#fff",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <style>
        {`
          @media print {
            .print-page-break-avoid {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }

            thead {
              display: table-header-group;
            }

            tr, td, th {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}
      </style>

      {/* Cabeçalho */}
      <div
        className="print-page-break-avoid"
        style={{
          border: "1px solid #d9d9d9",
          borderRadius: 10,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            borderBottom: "2px solid #eee",
            paddingBottom: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                color: "#111827",
              }}
            >
              Pedido de Insumos
            </h1>
            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Documento para separação, transporte e recebimento
            </p>
          </div>

          <div
            style={{
              minWidth: 170,
              textAlign: "right",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#6b7280",
              }}
            >
              Nº do Pedido
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#ff6600",
              }}
            >
              #{order?.id || "-"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <div>
            <p style={{ margin: 0 }}>
              <strong>Empresa:</strong> {order?.company?.name || "-"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {order?.status || "-"}
            </p>
          </div>

          <div>
            <p style={{ margin: 0 }}>
              <strong>Data do Pedido:</strong> {formatDate(order?.order_date)}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Gerado em:</strong> {formatDateTime(order?.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                border: "1px solid #ccc",
                padding: 8,
                textAlign: "left",
                width: "40%",
                background: "#f5f5f5",
              }}
            >
              Produto
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: 8,
                textAlign: "center",
                width: "10%",
                background: "#f5f5f5",
              }}
            >
              Qtd
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: 8,
                textAlign: "center",
                width: "10%",
                background: "#f5f5f5",
              }}
            >
              Unid.
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: 8,
                textAlign: "right",
                width: "20%",
                background: "#f5f5f5",
              }}
            >
              Valor Unit.
            </th>
            <th
              style={{
                border: "1px solid #ccc",
                padding: 8,
                textAlign: "right",
                width: "20%",
                background: "#f5f5f5",
              }}
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="print-page-break-avoid">
              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  verticalAlign: "top",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {item?.products?.name || "-"}
              </td>

              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  textAlign: "center",
                  verticalAlign: "top",
                }}
              >
                {item?.ordered_quantity || item?.quantity || 0}
              </td>

              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  textAlign: "center",
                  verticalAlign: "top",
                }}
              >
                {item?.ordered_unit || item?.products?.unit || "-"}
              </td>

              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  textAlign: "right",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(item?.unit_price || 0)}
              </td>

              <td
                style={{
                  border: "1px solid #ccc",
                  padding: 8,
                  textAlign: "right",
                  verticalAlign: "top",
                  whiteSpace: "nowrap",
                }}
              >
                {formatCurrency(item?.total_price || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div
        className="print-page-break-avoid"
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            minWidth: 260,
            border: "1px solid #d1d5db",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 16,
            fontWeight: "bold",
            textAlign: "right",
            background: "#fafafa",
          }}
        >
          Total do Pedido: {formatCurrency(total)}
        </div>
      </div>

      {/* Blocos extras */}
      <div
        className="print-page-break-avoid"
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 10,
            padding: 12,
            minHeight: 90,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>Observações</div>
          <div style={{ fontSize: 13, color: "#555", minHeight: 50 }}>
            {order?.observations || order?.observacao || "____________________________________________________________"}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: 10,
            padding: 12,
            minHeight: 90,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 8 }}>Conferência</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div>Data de saída: ____ / ____ / ______</div>
            <div>Hora de saída: ______ : ______</div>
            <div>Data de recebimento: ____ / ____ / ______</div>
            <div>Hora de recebimento: ______ : ______</div>
          </div>
        </div>
      </div>

      {/* Assinaturas */}
      <div
        className="print-page-break-avoid"
        style={{
          marginTop: 60,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 34,
        }}
      >
        <div>
          <div
            style={{
              borderTop: "1px solid #000",
              width: "100%",
              paddingTop: 6,
              fontSize: 13,
            }}
          >
            Assinatura de quem separou o pedido
          </div>
        </div>

        <div>
          <div
            style={{
              borderTop: "1px solid #000",
              width: "100%",
              paddingTop: 6,
              fontSize: 13,
            }}
          >
            Assinatura de quem transportou o pedido
          </div>
        </div>

        <div>
          <div
            style={{
              borderTop: "1px solid #000",
              width: "100%",
              paddingTop: 6,
              fontSize: 13,
            }}
          >
            Assinatura de quem recebeu o pedido
          </div>
        </div>
      </div>
    </div>
  );
});

PrintablePedidos.displayName = "PrintablePedidos";

export default PrintablePedidos;