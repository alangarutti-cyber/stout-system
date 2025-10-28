import React from "react";

const ConferenceSummarySection = ({ onRefresh, selectedCompanies }) => {
  return (
    <div className="p-4 bg-muted/40 rounded-md text-sm text-muted-foreground">
      <p><strong>Resumo da conferência</strong> (em desenvolvimento)</p>
      <p>Empresas selecionadas: {selectedCompanies?.length || 0}</p>
      <p>Último refresh: {onRefresh}</p>
    </div>
  );
};

export default ConferenceSummarySection;
