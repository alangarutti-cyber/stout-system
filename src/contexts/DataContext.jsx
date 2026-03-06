// src/contexts/DataContext.jsx
import React, { createContext, useContext, useMemo, useState } from "react";

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  // Mock básico só pra tela funcionar; troque pelos seus dados reais quando quiser.
  const [items, setItems] = useState({
    cashClosings: [],
  });

  const data = useMemo(
    () => ({
      companies: [
        { id: "1", name: "Stout Limeira" },
        { id: "2", name: "Stout Americana" },
      ],
      paymentMethods: [
        { id: "pm_cash", name: "Dinheiro", type: "dinheiro" },
        { id: "pm_pix", name: "PIX", type: "pix" },
        { id: "pm_cd", name: "Cartão Débito", type: "cartao_debito" },
        { id: "pm_cc", name: "Cartão Crédito", type: "cartao_credito" },
        { id: "pm_online", name: "Online", type: "online" },
      ],
      cardOperators: [
        {
          id: "op1",
          name: "Cielo",
          associations: [
            { paymentMethodId: "pm_cd", fee: 1.5, additionalFee: 0.0 },
            { paymentMethodId: "pm_cc", fee: 2.99, additionalFee: 0.0 },
            { paymentMethodId: "pm_pix", fee: 0.0, additionalFee: 0.0 },
          ],
        },
      ],
      cardMachines: [
        { id: "m1", name: "Balcão 01", companyId: "1", operatorId: "op1", active: true },
        { id: "m2", name: "Balcão 02", companyId: "1", operatorId: "op1", active: true },
        { id: "m3", name: "Americana A", companyId: "2", operatorId: "op1", active: true },
      ],
    }),
    []
  );

  const addItem = (collection, payload) =>
    setItems((prev) => ({
      ...prev,
      [collection]: [...(prev[collection] || []), payload],
    }));

  const value = useMemo(() => ({ data, addItem, items }), [data, addItem, items]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData deve ser usado dentro de <DataProvider />");
  return ctx;
};
