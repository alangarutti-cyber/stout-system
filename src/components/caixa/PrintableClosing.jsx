import React, { forwardRef } from "react";

const PrintableClosing = forwardRef(({ companyName, closingDate, user, data }, ref) => {
  const {
    addedMachines = [],
    expenses = [],
    withdrawals = [],
    systemValues = {},
    valorAbertura = 0,
    suprimentos = 0,
    valorIfoodBruto = 0,
    valorPixCnpj = 0,
    valorDinheiroCaixa = 0,
    observacoes = "",
  } = data || {};

  const formatCurrency = (value) =>
    `R$ ${parseFloat(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const totalMaquinas = addedMachines.reduce(
    (acc, m) => acc + (m.payments || []).reduce((s, p) => s + p.value, 0),
    0
  );

  const totalDespesas = expenses.reduce((acc, e) => acc + (e.value || 0), 0);
  const totalSaidas = withdrawals.reduce((acc, w) => acc + (w.value || 0), 0);
  const totalConferido =
    totalMaquinas + valorIfoodBruto + valorPixCnpj + valorDinheiroCaixa;

  const totalSistema = Object.values(systemValues || {})
    .filter((v) => typeof v === "number")
    .reduce((s, val) => s + val, 0);

  const diferenca = totalConferido - totalSistema;

  return (
    <div ref={ref} className="p-6 text-gray-800 text-sm">
      <h1 className="text-2xl font-bold mb-1 text-center">
        Fechamento de Caixa - {companyName}
      </h1>
      <p className="text-center mb-4">
        Data: {new Date(closingDate).toLocaleDateString("pt-BR")} <br />
        Usuário: {user?.name || user?.email}
      </p>

      <div className="mb-4">
        <h2 className="font-bold border-b pb-1 mb-2">Resumo de Caixa</h2>
        <table className="w-full text-left border-collapse">
          <tbody>
            <tr>
              <td className="py-1">💰 Abertura de Caixa</td>
              <td>{formatCurrency(valorAbertura)}</td>
            </tr>
            <tr>
              <td className="py-1">📥 Suprimentos</td>
              <td>{formatCurrency(suprimentos)}</td>
            </tr>
            <tr>
              <td className="py-1">💵 Dinheiro em Caixa</td>
              <td>{formatCurrency(valorDinheiroCaixa)}</td>
            </tr>
            <tr>
              <td className="py-1">🧾 iFood Online</td>
              <td>{formatCurrency(valorIfoodBruto)}</td>
            </tr>
            <tr>
              <td className="py-1">💳 Pix CNPJ</td>
              <td>{formatCurrency(valorPixCnpj)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-4">
        <h2 className="font-bold border-b pb-1 mb-2">Máquinas</h2>
        {addedMachines.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b font-semibold">
                <th className="py-1">Máquina</th>
                <th className="py-1">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {addedMachines.map((m) => (
                <tr key={m.machine?.id}>
                  <td className="py-1">{m.machine?.name || "Sem nome"}</td>
                  <td className="py-1">
                    {formatCurrency(
                      (m.payments || []).reduce((s, p) => s + p.value, 0)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">Nenhuma máquina adicionada.</p>
        )}
      </div>

      <div className="mb-4">
        <h2 className="font-bold border-b pb-1 mb-2">Despesas / Saídas</h2>
        <table className="w-full text-left border-collapse">
          <tbody>
            <tr>
              <td className="py-1">Despesas</td>
              <td>{formatCurrency(totalDespesas)}</td>
            </tr>
            <tr>
              <td className="py-1">Retiradas</td>
              <td>{formatCurrency(totalSaidas)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-4">
        <h2 className="font-bold border-b pb-1 mb-2">Totais e Diferenças</h2>
        <table className="w-full text-left border-collapse">
          <tbody>
            <tr>
              <td className="py-1 font-semibold">🧾 Total Conferido</td>
              <td className="font-semibold">{formatCurrency(totalConferido)}</td>
            </tr>
            <tr>
              <td className="py-1">💻 Total Sistema</td>
              <td>{formatCurrency(totalSistema)}</td>
            </tr>
            <tr>
              <td className="py-1">📊 Diferença</td>
              <td className={`${diferenca < 0 ? "text-red-600" : "text-green-700"}`}>
                {formatCurrency(diferenca)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {observacoes && (
        <div className="mt-6">
          <h2 className="font-bold border-b pb-1 mb-2">Observações</h2>
          <p className="whitespace-pre-line">{observacoes}</p>
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6">
        Impresso automaticamente pelo Stout System - {new Date().toLocaleString("pt-BR")}
      </p>
    </div>
  );
});

export default PrintableClosing;
