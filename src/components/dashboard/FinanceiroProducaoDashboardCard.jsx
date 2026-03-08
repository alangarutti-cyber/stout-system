import React from "react";
import { Factory, DollarSign, Receipt, Building2, Trophy } from "lucide-react";

const resumoEmpresas = [
  { empresa: "Stout Burger Americana", titulos: 65, total: "R$ 497.110,84" },
  { empresa: "Stout Burger Limeira", titulos: 39, total: "R$ 432.566,79" },
];

const FinanceiroProducaoDashboardCard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] md:text-[32px] font-extrabold text-gray-900">
          Financeiro da Produção
        </h1>
        <p className="text-gray-700 mt-1 text-lg">
          Resumo financeiro das compras das empresas na produção
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Total Vendido</span>
            <DollarSign className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">R$ 929.677,63</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Empresas Comprando</span>
            <Building2 className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">2</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Pedidos/Títulos</span>
            <Receipt className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">104</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 font-medium">Ticket Médio</span>
            <Factory className="text-[#ff6600]" size={20} />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">R$ 8.939,21</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-[20px] font-bold text-gray-900 mb-4">Resumo por Empresa</h2>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Empresa</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Títulos</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumoEmpresas.map((item) => (
                  <tr key={item.empresa} className="border-t border-gray-200">
                    <td className="px-4 py-4 text-sm text-gray-900">{item.empresa}</td>
                    <td className="px-4 py-4 text-sm text-center text-gray-900">{item.titulos}</td>
                    <td className="px-4 py-4 text-sm text-right font-bold text-gray-900">{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="text-[#ff6600]" size={24} />
            <h2 className="text-[20px] font-bold text-gray-900">Maior Compradora</h2>
          </div>

          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-5">
            <p className="text-sm text-gray-600 mb-2">Empresa com maior volume acumulado</p>
            <h3 className="text-xl font-extrabold text-gray-900">Stout Burger Americana</h3>
            <p className="text-2xl font-extrabold text-[#ff6600] mt-3">R$ 497.110,84</p>
            <p className="text-sm text-gray-700 mt-2">65 pedidos/títulos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroProducaoDashboardCard;