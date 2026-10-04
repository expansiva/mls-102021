/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/contracts/despesas_aprovadas.defs.ts" enhancement="_blank"/>

export interface DespesaLoad {
  id: string;
  readonly version: number;
  colaboradorId: string;
  status: 'draft' | 'awaitingApproval' | 'rejected' | 'approved' | 'paid';
  details: {
    dataDespesa: string;
    categoria: string;
    valor: string;
    dataPagamento: string;
  };
}

export interface DespesaRegisterPayment {
  id: string;
  readonly version: number;
  details: {
    dataPagamento: string;
  };
}

export interface Despesas_aprovadasContracts {
  'reembolsoDespesas.despesas_aprovadas.load': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { despesasAprovadas: DespesaLoad[]; pageApprovedExpensesList: number; pageSizeApprovedExpensesList: number; hasMoreApprovedExpensesList: boolean };
    meta: { output: { despesasAprovadas: { entity: 'Despesa'; many: true } }; lists: { approvedExpensesList: { key: 'despesasAprovadas'; page: 'pageApprovedExpensesList'; pageSize: 'pageSizeApprovedExpensesList'; hasMore: 'hasMoreApprovedExpensesList' } }; params: { colaboradorId: { filters: 'despesasAprovadas'; field: 'colaboradorId' }; page: { pages: 'approvedExpensesList' }; pageSize: { pages: 'approvedExpensesList' } } };
    rules: ['financeApprovedExpenseAccess'];
    access: { actors: ['financeiro']; grants: ['financeiroConsultaEpagaDespesasAprovadas']; scope: 'related' };
  };
  'reembolsoDespesas.despesas_aprovadas.loadDespesasAprovadas': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { despesasAprovadas: DespesaLoad[]; pageApprovedExpensesList: number; pageSizeApprovedExpensesList: number; hasMoreApprovedExpensesList: boolean };
    meta: { output: { despesasAprovadas: { entity: 'Despesa'; many: true } }; lists: { approvedExpensesList: { key: 'despesasAprovadas'; page: 'pageApprovedExpensesList'; pageSize: 'pageSizeApprovedExpensesList'; hasMore: 'hasMoreApprovedExpensesList' } }; params: { colaboradorId: { filters: 'despesasAprovadas'; field: 'colaboradorId' }; page: { pages: 'approvedExpensesList' }; pageSize: { pages: 'approvedExpensesList' } } };
    rules: ['financeApprovedExpenseAccess'];
    access: { actors: ['financeiro']; grants: ['financeiroConsultaEpagaDespesasAprovadas']; scope: 'related' };
  };
  'reembolsoDespesas.despesas_aprovadas.registerPayment': {
    kind: 'cmd';
    writes: 'Despesa.registrarPagamento';
    input: { details: { dataPagamento: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaRegisterPayment };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['financeApprovedExpenseAccess', 'paymentDateRequired'];
    access: { actors: ['financeiro']; grants: ['financeiroConsultaEpagaDespesasAprovadas']; scope: 'related' };
  };
}
