/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/contracts/minhas_despesas.defs.ts" enhancement="_blank"/>

export interface DespesaLoad {
  id: string;
  readonly version: number;
  status: 'draft' | 'awaitingApproval' | 'rejected' | 'approved' | 'paid';
  details: {
    dataDespesa: string;
    categoria: string;
    valor: string;
    descricao: string;
    reenvioRealizado: boolean;
  };
}

export interface DespesaRegistrarDespesa {
  id: string;
  readonly version: number;
  details: {
    dataDespesa: string;
    categoria: string;
    valor: string;
    descricao: string;
  };
}

export interface Minhas_despesasContracts {
  'reembolsoDespesas.minhas_despesas.load': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { minhasDespesas: DespesaLoad[]; pageListaMinhasDespesas: number; pageSizeListaMinhasDespesas: number; hasMoreListaMinhasDespesas: boolean };
    meta: { output: { minhasDespesas: { entity: 'Despesa'; many: true } }; lists: { listaMinhasDespesas: { key: 'minhasDespesas'; page: 'pageListaMinhasDespesas'; pageSize: 'pageSizeListaMinhasDespesas'; hasMore: 'hasMoreListaMinhasDespesas' } }; params: { colaboradorId: { filters: 'minhasDespesas'; field: 'colaboradorId' }; page: { pages: 'listaMinhasDespesas' }; pageSize: { pages: 'listaMinhasDespesas' } } };
    rules: ['expenseOwnerOnly'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
  'reembolsoDespesas.minhas_despesas.loadMinhasDespesas': {
    kind: 'qry';
    input: { colaboradorId?: string; page?: number; pageSize?: number };
    output: { minhasDespesas: DespesaLoad[]; pageListaMinhasDespesas: number; pageSizeListaMinhasDespesas: number; hasMoreListaMinhasDespesas: boolean };
    meta: { output: { minhasDespesas: { entity: 'Despesa'; many: true } }; lists: { listaMinhasDespesas: { key: 'minhasDespesas'; page: 'pageListaMinhasDespesas'; pageSize: 'pageSizeListaMinhasDespesas'; hasMore: 'hasMoreListaMinhasDespesas' } }; params: { colaboradorId: { filters: 'minhasDespesas'; field: 'colaboradorId' }; page: { pages: 'listaMinhasDespesas' }; pageSize: { pages: 'listaMinhasDespesas' } } };
    rules: ['expenseOwnerOnly'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
  'reembolsoDespesas.minhas_despesas.registrarDespesa': {
    kind: 'cmd';
    writes: 'Despesa.create';
    input: { details: { dataDespesa: string; categoria: string; valor: string; descricao: string }; colaboradorId: string };
    output: { despesa: DespesaRegistrarDespesa };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['validExpenseData'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
  'reembolsoDespesas.minhas_despesas.corrigirDespesa': {
    kind: 'cmd';
    writes: 'Despesa.update';
    input: { details: { dataDespesa: string; categoria: string; valor: string; descricao: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaRegistrarDespesa };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['expenseOwnerOnly', 'validExpenseData', 'singleResubmission'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
  'reembolsoDespesas.minhas_despesas.enviarParaAprovacao': {
    kind: 'cmd';
    writes: 'Despesa.enviarParaAprovacao';
    input: { details: { dataDespesa: string; categoria: string; valor: string; descricao: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaRegistrarDespesa };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['expenseOwnerOnly', 'validExpenseData', 'proofRequiredBeforeSubmission'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
  'reembolsoDespesas.minhas_despesas.reenviarParaAprovacao': {
    kind: 'cmd';
    writes: 'Despesa.reenviarParaAprovacao';
    input: { details: { dataDespesa: string; categoria: string; valor: string; descricao: string }; colaboradorId: string; id: string; version: number };
    output: { despesa: DespesaRegistrarDespesa };
    meta: { output: { despesa: { entity: 'Despesa'; many: false } }; lists: {}; params: {} };
    rules: ['expenseOwnerOnly', 'validExpenseData', 'proofRequiredBeforeSubmission', 'singleResubmission'];
    access: { actors: ['colaborador']; grants: ['colaboradorGerenciaPropriasDespesas']; scope: 'own' };
  };
}
