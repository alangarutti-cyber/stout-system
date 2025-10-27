
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

const SaidasSection = ({ 
  expenses = [], 
  courtesies = [], 
  withdrawals = [], 
  onRemoveExpense, 
  onRemoveCourtesy, 
  onRemoveWithdrawal 
}) => {
  const totalSaidas = 
    (expenses || []).reduce((sum, item) => sum + (item.value || 0), 0) +
    (courtesies || []).reduce((sum, item) => sum + (item.value || 0), 0) +
    (withdrawals || []).reduce((sum, item) => sum + (item.value || 0), 0);

  const hasItems = expenses.length > 0 || courtesies.length > 0 || withdrawals.length > 0;

  return (
    <div className="glass-effect rounded-xl p-4 space-y-4">
      <div className="flex justify-between items-baseline">
        <h2 className="text-xl font-bold text-gray-800">Saídas de Caixa</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-red-600">- R$ {totalSaidas.toFixed(2)}</p>
        </div>
      </div>
      
      {!hasItems ? (
        <p className="text-gray-500 text-center py-4">Nenhuma saída registrada.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {expenses.map(item => (
            <div key={`exp-${item.id}`} className="flex justify-between items-center bg-red-50 p-2 rounded-md text-sm">
              <p>🛒 <span className="font-semibold">{item.description}</span></p>
              <div className="flex items-center gap-2">
                <span>R$ {(item.value || 0).toFixed(2)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveExpense(item.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
              </div>
            </div>
          ))}
          {courtesies.map(item => (
            <div key={`crt-${item.id}`} className="flex justify-between items-center bg-purple-50 p-2 rounded-md text-sm">
              <p>🎁 <span className="font-semibold">{item.description}</span></p>
              <div className="flex items-center gap-2">
                <span>R$ {(item.value || 0).toFixed(2)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveCourtesy(item.id)}><Trash2 className="w-4 h-4 text-purple-500"/></Button>
              </div>
            </div>
          ))}
          {withdrawals.map(item => (
            <div key={`wth-${item.id}`} className="flex justify-between items-center bg-yellow-50 p-2 rounded-md text-sm">
              <p>👤 <span className="font-semibold">{item.employee?.name || 'Funcionário'}</span></p>
              <div className="flex items-center gap-2">
                <span>R$ {(item.value || 0).toFixed(2)}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveWithdrawal(item.id)}><Trash2 className="w-4 h-4 text-yellow-700"/></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SaidasSection;
