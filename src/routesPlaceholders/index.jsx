import React from "react";

/**
 * ⚙️ Este arquivo contém apenas componentes placeholder
 * para as novas rotas financeiras e analíticas.
 * Assim você pode navegar e visualizar tudo,
 * mesmo antes dos módulos reais estarem prontos.
 */

export const ContasPagar = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Contas a Pagar</h2>
    <p className="text-muted-foreground">
      Aqui você poderá gerenciar as contas a pagar de cada empresa, com filtros por fornecedor,
      vencimento, status e centro de custo.
    </p>
  </div>
);

export const ContasReceber = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Contas a Receber</h2>
    <p className="text-muted-foreground">
      Central de recebimentos — controle de fiado, repasses e lançamentos automáticos.
    </p>
  </div>
);

export const ContaCorrenteFiado = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Conta Corrente (Fiado)</h2>
    <p className="text-muted-foreground">
      Gerencie os fiados, saldos de clientes e histórico de pagamentos por empresa.
    </p>
  </div>
);

export const Recebimentos = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Recebimentos</h2>
    <p className="text-muted-foreground">
      Registro e conferência de recebimentos externos (cartões, iFood, Pix, etc).
    </p>
  </div>
);

export const ResumoFinanceiro = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Resumo Financeiro</h2>
    <p className="text-muted-foreground">
      Painel consolidado com totais de contas a pagar, a receber e saldo projetado.
    </p>
  </div>
);

export const DRESimplificado = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">DRE Simplificado</h2>
    <p className="text-muted-foreground">
      Visualização rápida do resultado operacional por empresa ou grupo.
    </p>
  </div>
);

export const Categorias = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Categorias de Contas</h2>
    <p className="text-muted-foreground">
      Configure categorias de despesas e receitas para organização contábil.
    </p>
  </div>
);

export const FormasPagamento = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Formas de Pagamento</h2>
    <p className="text-muted-foreground">
      Cadastre e gerencie as formas de pagamento aceitas (dinheiro, cartão, Pix, etc).
    </p>
  </div>
);

export const MeuNegocio = () => (
  <div className="p-6">
    <h2 className="text-2xl font-bold mb-3 text-primary">Meu Negócio</h2>
    <p className="text-muted-foreground">
      Resumo gerencial com indicadores de performance, metas e saúde financeira global.
    </p>
  </div>
);
