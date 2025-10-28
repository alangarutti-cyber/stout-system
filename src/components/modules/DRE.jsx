import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/customSupabaseClient";
import { useUser } from "@/contexts/UserContext";
import DreInteractive from "@/components/financeiro/DreInteractive";

const DRE = () => {
  const { user, companies, userCompanyAccess } = useUser();
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [dreData, setDreData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Define empresas permitidas conforme permissão do usuário
  const allowedCompanies = useMemo(() => {
    if (!user || !companies || !userCompanyAccess) return [];
    if (user.is_admin) return companies;
    const companyIds = userCompanyAccess.map((access) => access.company_id);
    return companies.filter((c) => companyIds.includes(c.id));
  }, [user, companies, userCompanyAccess]);

  const allowedCompanyIds = useMemo(
    () => allowedCompanies.map((c) => c.id),
    [allowedCompanies]
  );

  useEffect(() => {
    if (allowedCompanies.length === 1) {
      setSelectedCompany(allowedCompanies[0].id.toString());
    }
  }, [allowedCompanies]);

  // 🔹 Função para buscar dados do DRE no Supabase
  const fetchDreData = useCallback(async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split("-");
    const startDate = `${year}-${month}-01`;

    const companyIdsToFilter =
      selectedCompany !== "all"
        ? [parseInt(selectedCompany)]
        : allowedCompanyIds;

    if (companyIdsToFilter.length === 0) {
      setLoading(false);
      setDreData(null);
      return;
    }

    try {
      const { data: dre, error } = await supabase.rpc("get_dre_data", {
        p_company_ids: companyIdsToFilter,
        p_month: startDate,
      });

      if (error) throw error;
      setDreData(dre);
    } catch (error) {
      console.error("Erro ao carregar DRE:", error);
      toast({
        title: "Erro ao buscar DRE",
        description: error.message,
        variant: "destructive",
      });
      setDreData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, selectedMonth, allowedCompanyIds, toast]);

  useEffect(() => {
    if (allowedCompanyIds.length > 0) {
      fetchDreData();
    }
  }, [fetchDreData, allowedCompanyIds]);

  return (
    <div className="space-y-6 p-0 md:p-4">
      {/* 🔹 Filtros superiores */}
      <div className="bg-card/80 backdrop-blur-sm border rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Empresa
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="all">Consolidado</option>
              {allowedCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Período
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchDreData} className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin mr-2" />}
              Analisar
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => toast({ title: "Exportação em breve!" })}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar DRE
            </Button>
          </div>
        </div>
      </div>

      {/* 🔹 Área principal */}
      {loading ? (
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="animate-spin h-8 w-8 mx-auto" />
          <p className="mt-2">Carregando DRE...</p>
        </div>
      ) : !dreData ? (
        <div className="p-10 text-center text-muted-foreground bg-card rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-medium">Nenhum dado encontrado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique os filtros e tente novamente.
          </p>
        </div>
      ) : (
        // 🔹 Novo DRE Interativo com gráfico e expansão
        <DreInteractive dreData={dreData} />
      )}
    </div>
  );
};

export default DRE;
