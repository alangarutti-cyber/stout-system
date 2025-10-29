import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle } from 'lucide-react';

const LaunchForm = ({ companyId, onAddLaunch }) => {
  const [machines, setMachines] = useState([]);
  const [banks, setBanks] = useState([]);
  const [launchData, setLaunchData] = useState({
    card_machine_id: '',
    gross_value: '',
    fee_rate: 0,
    fee_value: 0,
    net_value: 0,
    destination_bank_id: '',
    description: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      const { data: machinesData, error: machinesError } = await supabase.from('card_machines').select('*').eq('company_id', companyId);
      if (machinesError) toast({ title: "Erro ao buscar máquinas", variant: "destructive" });
      else setMachines(machinesData);

      const { data: banksData, error: banksError } = await supabase.from('bank_accounts').select('id, bank_name, account_number');
      // In a real app, you would filter banks by company access
      if (banksError) toast({ title: "Erro ao buscar bancos", variant: "destructive" });
      else setBanks(banksData);
    };
    fetchData();
  }, [companyId]);
  
  useEffect(() => {
      const grossValue = parseFloat(launchData.gross_value) || 0;
      const feeRate = parseFloat(launchData.fee_rate) || 0;
      const feeValue = (grossValue * feeRate) / 100;
      const netValue = grossValue - feeValue;
      setLaunchData(prev => ({ ...prev, fee_value: feeValue, net_value: netValue }));
  }, [launchData.gross_value, launchData.fee_rate]);


  const handleMachineChange = (machineId) => {
      const machine = machines.find(m => m.id.toString() === machineId);
      // This is a simplification. Real fee logic could be much more complex.
      // We are assuming a single fee, but it could depend on credit/debit etc.
      // For now, let's just grab a fee from payment_methods associated with operator.
      const getFee = async () => {
        if (!machine || !machine.operator_id) {
          setLaunchData(prev => ({...prev, card_machine_id: machineId, fee_rate: 0}));
          return;
        }
        const { data: methods } = await supabase.from('payment_methods').select('fee').eq('operator_id', machine.operator_id).limit(1).single();
        setLaunchData(prev => ({...prev, card_machine_id: machineId, fee_rate: methods?.fee || 0}));
      }
      getFee();
  };
  
  const handleAddClick = () => {
    const grossValue = parseFloat(launchData.gross_value);
    if (!grossValue || grossValue <= 0) {
        toast({ title: "Valor inválido", description: "O valor bruto deve ser maior que zero.", variant: "destructive" });
        return;
    }
    const machine = machines.find(m => m.id.toString() === launchData.card_machine_id);
    const bank = banks.find(b => b.id.toString() === launchData.destination_bank_id);

    onAddLaunch({
        ...launchData,
        gross_value: grossValue,
        id: Date.now(), // Temporary ID for UI list
        machine_name: machine?.serial_number || 'Direto',
        bank_name: bank ? `${bank.bank_name} / ${bank.account_number}` : 'N/A',
    });

    // Reset form
    setLaunchData({
        card_machine_id: '',
        gross_value: '',
        fee_rate: 0,
        fee_value: 0,
        net_value: 0,
        destination_bank_id: '',
        description: '',
    });
  };

  return (
    <div className="glass-effect p-4 rounded-xl space-y-4">
        <h3 className="font-bold text-lg">Adicionar Lançamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={launchData.card_machine_id} onChange={(e) => handleMachineChange(e.target.value)} className="input-style">
                <option value="">Lançamento Direto (Dinheiro, Pix)</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.serial_number} - {m.machine_number}</option>)}
            </select>
            <Input type="number" placeholder="Valor Bruto" value={launchData.gross_value} onChange={e => setLaunchData(p => ({...p, gross_value: e.target.value}))} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm items-center">
            <p>Taxa: <span className="font-mono">{launchData.fee_rate.toFixed(2)}%</span></p>
            <p>Valor Taxa: <span className="font-mono text-red-600">- {launchData.fee_value.toFixed(2)}</span></p>
            <p className="font-bold">Valor Líquido: <span className="font-mono text-green-600">{launchData.net_value.toFixed(2)}</span></p>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={launchData.destination_bank_id} onChange={e => setLaunchData(p => ({...p, destination_bank_id: e.target.value}))} className="input-style">
                <option value="">Banco Destino</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name} / {b.account_number}</option>)}
            </select>
            <Input placeholder="Descrição (opcional)" value={launchData.description} onChange={e => setLaunchData(p => ({...p, description: e.target.value}))} />
        </div>
        <Button onClick={handleAddClick} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Lançamento
        </Button>
    </div>
  );
};

export default LaunchForm;