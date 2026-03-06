import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  Bike,
  Download,
  Save,
  Edit,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUser } from "@/contexts/UserContext";

const Pagamentos = () => {
  const { toast } = useToast();
  const { user, companies, userCompanyAccess } = useUser();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [currentEmployeeData, setCurrentEmployeeData] = useState({
    name: "",
    pix_key: "",
    role: "Motoboy",
    valor_encosta: "",
    valor_entrega: "",
    salario: "",
    encargos: "",
    inss_empresa: "",
    fgts: "",
    ferias_terco: "",
    decimo_terceiro: "",
    gratificacao: "",
    cargo: "",
    setor: "",
  });
  const [paymentData, setPaymentData] = useState([]);
  const [paymentPeriod, setPaymentPeriod] = useState({ start: "", end: "" });
  const [companySectors, setCompanySectors] = useState([]);

  // === Empresas permitidas ===
  useEffect(() => {
    if (user && companies && userCompanyAccess) {
      if (user.is_admin || user.role === "Super Administrador") {
        setAllowedCompanies(companies);
        if (companies.length > 0) setSelectedCompany(companies[0].id);
      } else {
        const accessIds = userCompanyAccess
          .filter((a) => a.user_id === user.id)
          .map((a) => a.company_id);
        const allowed = companies.filter((c) => accessIds.includes(c.id));
        setAllowedCompanies(allowed);
        if (allowed.length > 0) setSelectedCompany(allowed[0].id);
      }
    }
  }, [user, companies, userCompanyAccess]);

  // === Buscar funcionários ===
  const fetchEmployees = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", selectedCompany)
      .order("name");

    if (error)
      toast({
        title: "Erro ao buscar funcionários",
        description: error.message,
        variant: "destructive",
      });
    else setEmployees(data || []);
    setLoading(false);
  }, [selectedCompany, toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // === Salvar ou editar funcionário ===
  const handleSaveEmployee = async () => {
    const dataToSave = {
      company_id: selectedCompany,
      name: currentEmployeeData.name,
      pix_key: currentEmployeeData.pix_key,
      role: currentEmployeeData.role,
      valor_encosta:
        currentEmployeeData.role === "Motoboy"
          ? parseFloat(currentEmployeeData.valor_encosta) || 0
          : null,
      valor_entrega:
        currentEmployeeData.role === "Motoboy"
          ? parseFloat(currentEmployeeData.valor_entrega) || 0
          : null,
      salario: ["Freelancer", "CLT"].includes(currentEmployeeData.role)
        ? parseFloat(currentEmployeeData.salario) || 0
        : null,
      encargos:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.encargos) || 0
          : null,
      inss_empresa:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.inss_empresa) || 0
          : null,
      fgts:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.fgts) || 0
          : null,
      ferias_terco:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.ferias_terco) || 0
          : null,
      decimo_terceiro:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.decimo_terceiro) || 0
          : null,
      gratificacao:
        currentEmployeeData.role === "CLT"
          ? parseFloat(currentEmployeeData.gratificacao) || 0
          : null,
      cargo:
        currentEmployeeData.role === "CLT"
          ? currentEmployeeData.cargo
          : null,
      setor:
        currentEmployeeData.role === "Freelancer"
          ? currentEmployeeData.setor
          : null,
    };

    let error;
    if (editingEmployee) {
      ({ error } = await supabase
        .from("employees")
        .update(dataToSave)
        .eq("id", editingEmployee.id));
    } else {
      ({ error } = await supabase.from("employees").insert(dataToSave));
    }
    if (error)
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({
        title: `Funcionário ${editingEmployee ? "atualizado" : "criado"}!`,
        variant: "success",
      });
      setIsDialogOpen(false);
      fetchEmployees();
    }
  };

  // === Excluir funcionário ===
  const handleDeleteEmployee = async () => {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", employeeToDelete.id);
    if (error)
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Funcionário excluído!", variant: "success" });
      fetchEmployees();
    }
    setIsDeleteOpen(false);
  };

  // === Interface ===
  const getEmployeeIcon = (role) => {
    switch (role) {
      case "Motoboy":
        return <Bike className="w-6 h-6 text-pink-600" />;
      case "Freelancer":
        return <Users className="w-6 h-6 text-purple-600" />;
      case "CLT":
        return <UserCheck className="w-6 h-6 text-sky-600" />;
      default:
        return <Users className="w-6 h-6 text-gray-600" />;
    }
  };

  const getEmployeeColor = (role) => {
    switch (role) {
      case "Motoboy":
        return "pink";
      case "Freelancer":
        return "purple";
      case "CLT":
        return "sky";
      default:
        return "gray";
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Label htmlFor="company-select-func">Empresa</Label>
          <select
            id="company-select-func"
            value={selectedCompany || ""}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full sm:w-auto mt-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            {allowedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gradient-primary text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Colaborador
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl p-4 border-l-4 border-${getEmployeeColor(
                emp.role
              )}-500 shadow-sm bg-white dark:bg-slate-900`}
            >
              <div className="flex items-start gap-4 mb-2">
                {getEmployeeIcon(emp.role)}
                <div>
                  <h3 className="font-semibold">{emp.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {emp.role}
                    {emp.cargo && ` - ${emp.cargo}`}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Pagamentos;
