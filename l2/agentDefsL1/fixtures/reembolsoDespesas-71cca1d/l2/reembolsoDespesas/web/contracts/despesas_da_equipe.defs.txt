/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/contracts/despesas_da_equipe.defs.ts" enhancement="_blank"/>

export interface DespesaLoad {
  id: string;
  readonly version: number;
  colaboradorId: string;
  status: 'draft' | 'awaitingApproval' | 'rejected' | 'approved' | 'paid';
  details: {
    dataDespesa: string;
    categoria: string;
    valor: string;
    reenvioRealizado: boolean;
    motivoRejeicao: string;
  };
}

export interface ColaboradorLoad {
  id: string;
  details: {
    identification: string;
  };
}

export interface DespesaApproveExpense {
  id: string;
  readonly version: number;
  details: {
    motivoRejeicao: string;
  };
}

export interface Despesas_da_equipeContracts {
  'reembolsoDespesas.despesas_da_equipe.load': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { despesasDaEquipe: DespesaLoad[]; colaborador: ColaboradorLoad[]; pagePendingTeamExpenses: number; pageSizePendingTeamExpenses: number; hasMorePendingTeamExpenses: boolean };
    meta: { output: { despesasDaEquipe: { entity: 'Despesa'; many: true }; colaborador: { entity: 'Colaborador'; many: true } }; lists: { pendingTeamExpenses: { key: 'despesasDaEquipe'; page: 'pagePendingTeamExpenses'; pageSize: 'pageSizePendingTeamExpenses'; hasMore: 'hasMorePendingTeamExpenses' } }; params: { colaboradorId: { filters: 'despesasDaEquipe'; field: 'colaboradorId' }; page: { pages: 'pendingTeamExpenses' }; pageSize: { pages: 'pendingTeamExpenses' } } };
    rules: ['managerTeamExpenseAccess'];
    access: { actors: ['gestorEquipe']; grants: ['gestorAnalisaDespesasDaEquipe']; scope: 'related' };
  };
  'reembolsoDespesas.despesas_da_equipe.loadDespesasDaEquipe': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { despesasDaEquipe: DespesaLoad[]; pagePendingTeamExpenses: number; pageSizePendingTeamExpenses: number; hasMorePendingTeamExpenses: boolean };
    meta: { output: { despesasDaEquipe: { entity: 'Despesa'; many: true } }; lists: { pendingTeamExpenses: { key: 'despesasDaEquipe'; page: 'pagePendingTeamExpenses'; pageSize: 'pageSizePendingTeamExpenses'; hasMore: 'hasMorePendingTeamExpenses' } }; params: { colaboradorId: { filters: 'despesasDaEquipe'; field: 'colaboradorId' }; page: { pages: 'pendingTeamExpenses' }; pageSize: { pages: 'pendingTeamExpenses' } } };
    rules: ['managerTeamExpenseAccess'];
    access: { actors: ['gestorEquipe']; grants: ['gestorAnalisaDespesasDaEquipe']; scope: 'related' };
  };
  'reembolsoDespesas.despesas_da_equipe.approveExpense': {
    kind: 'cmd';
    writes: 'Despesa.aprovarDespesa';
    input: { details: { motivoRejeicao: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaApproveExpense };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['managerTeamExpenseAccess'];
    access: { actors: ['gestorEquipe']; grants: ['gestorAnalisaDespesasDaEquipe']; scope: 'related' };
  };
  'reembolsoDespesas.despesas_da_equipe.rejectExpense': {
    kind: 'cmd';
    writes: 'Despesa.rejeitarDespesa';
    input: { details: { motivoRejeicao: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaApproveExpense };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['managerTeamExpenseAccess', 'rejectionReasonRequired'];
    access: { actors: ['gestorEquipe']; grants: ['gestorAnalisaDespesasDaEquipe']; scope: 'related' };
  };
}
