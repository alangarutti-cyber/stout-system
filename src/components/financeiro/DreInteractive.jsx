import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const currency = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const DreRow = ({ label, value, percent, color, children = [], level = 0 }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = children && children.length > 0;

  return (
    <>
      <TableRow
        onClick={() => hasChildren && setOpen(!open)}
        className={cn(
          hasChildren ? "cursor-pointer hover:bg-muted/40 transition-all" : "",
          level === 0 && "bg-muted/20 font-semibold",
          level === 1 && "pl-4 text-sm",
          level > 1 && "pl-8 text-sm text-muted-foreground"
        )}
      >
        <TableCell className="flex items-center gap-2">
          {hasChildren &&
            (open ? (
              <ChevronUp className="w-4 h-4 text-primary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ))}
          {label}
        </TableCell>
        <TableCell className={`text-right font-mono ${color || ""}`}>
          {currency(value)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">{percent}</TableCell>
      </TableRow>

      <AnimatePresence>
        {open &&
          children.map((child, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <td colSpan={3} className="p-0 border-t-0">
                <DreRow {...child} level={level + 1} />
              </td>
            </motion.tr>
          ))}
      </AnimatePresence>
    </>
  );
};

const DreInteractive = ({ dreData }) => {
  if (!dreData) return null;

  const chartData = [
    { name: "Receita Líquida", valor: dreData.receita_liquida },
    { name: "Despesas", valor: dreData.despesas_operacionais },
    { name: "Lucro Líquido", valor: dreData.lucro_liquido },
  ];

  const buildChildren = (array) =>
    (array || []).map((d) => ({
      label: d.description || d.nome || "Item",
      value: d.amount || d.valor || 0,
      children: buildChildren(d.sub || d.itens || []),
    }));

  const rows = [
    {
      label: "Receita Bruta",
      value: dreData.receita_bruta,
      percent: "100%",
      color: "text-emerald-600",
    },
    {
      label: "(-) Deduções (Taxas)",
      value: -dreData.deducoes,
      percent: `${((dreData.deducoes / dreData.receita_bruta) * 100).toFixed(2)}%`,
      color: "text-red-600",
      children: buildChildren(dreData.deducoes_details),
    },
    {
      label: "(=) Receita Líquida",
      value: dreData.receita_liquida,
      percent: "100%",
      color: "text-emerald-700",
    },
    {
      label: "(-) CMV (Custo da Mercadoria Vendida)",
      value: -dreData.cmv,
      percent: `${((dreData.cmv / dreData.receita_bruta) * 100).toFixed(2)}%`,
      color: "text-red-600",
      children: buildChildren(dreData.cmv_details),
    },
    {
      label: "(=) Lucro Bruto",
      value: dreData.lucro_bruto,
      percent: `${(dreData.margem_bruta * 100).toFixed(2)}%`,
      color: "text-emerald-600",
    },
    {
      label: "(-) Despesas Operacionais",
      value: -dreData.despesas_operacionais,
      percent: `${((dreData.despesas_operacionais / dreData.receita_bruta) * 100).toFixed(2)}%`,
      color: "text-red-600",
      children: buildChildren(dreData.despesas_details),
    },
    {
      label: "(=) Lucro/Prejuízo Líquido",
      value: dreData.lucro_liquido,
      percent: `${(dreData.margem_liquida * 100).toFixed(2)}%`,
      color: dreData.lucro_liquido >= 0 ? "text-emerald-700" : "text-red-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Gráfico Resumo */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Resumo Visual</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(v) => currency(v)} />
            <Bar dataKey="valor" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela DRE */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Conta</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <DreRow key={i} {...row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DreInteractive;
