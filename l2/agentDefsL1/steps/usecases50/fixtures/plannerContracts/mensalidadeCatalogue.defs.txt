/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/contracts/mensalidadeCatalogue.defs.ts" enhancement="_blank"/>

// GENERATED from l4 — do not edit (workspace mensalidadeCatalogue; one contract file per workspace, all bffCalls).

// bffCall qryListMensalidade (query) — Output kind=paginated; route mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade.
export interface QryListMensalidadeInput {
  matriculaId: string;
  competencia: string;
  page?: number;
  pageSize?: number;
}

export interface QryListMensalidadeOutputItem {
  id: string;
  matriculaId: string;
  competencia: string;
  vencimento: string;
  valorCobranca: number;
  totalPago: number;
  saldoDevedor: number;
  situacao: string;
}

export interface QryListMensalidadeOutput {
  mensalidadeItems: QryListMensalidadeOutputItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

export const qryListMensalidadeRoute = 'mensalidadesAcademia.mensalidadeCatalogue.qryListMensalidade' as const;

// bffCall qryGetMensalidade (query) — Output kind=object; route mensalidadesAcademia.mensalidadeCatalogue.qryGetMensalidade.
export interface QryGetMensalidadeInput {
  id: string;
}

export interface QryGetMensalidadeOutput {
  id: string;
  matriculaId: string;
  competencia: string;
  vencimento: string;
  valorCobranca: number;
  totalPago: number;
  saldoDevedor: number;
  situacao: string;
}

export const qryGetMensalidadeRoute = 'mensalidadesAcademia.mensalidadeCatalogue.qryGetMensalidade' as const;

// bffCall cmdCreatePagamento (command) — Output kind=object; route mensalidadesAcademia.mensalidadeCatalogue.cmdCreatePagamento.
export interface CmdCreatePagamentoInput {
  mensalidadeId: string;
  dataPagamento: string;
  valor: number;
  formaPagamento: 'cash' | 'pix' | 'debitCard' | 'creditCard' | 'bankTransfer';
}

export interface CmdCreatePagamentoOutput {
  id: string;
  mensalidadeId: string;
  dataPagamento: string;
  valor: number;
  formaPagamento: 'cash' | 'pix' | 'debitCard' | 'creditCard' | 'bankTransfer';
}

export const cmdCreatePagamentoRoute = 'mensalidadesAcademia.mensalidadeCatalogue.cmdCreatePagamento' as const;
