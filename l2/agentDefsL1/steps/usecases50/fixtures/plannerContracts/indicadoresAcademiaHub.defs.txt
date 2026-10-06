/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/contracts/indicadoresAcademiaHub.defs.ts" enhancement="_blank"/>

// GENERATED from l4 — do not edit (workspace indicadoresAcademiaHub; one contract file per workspace, all bffCalls).

// bffCall qryInspectMensalidade (query) — Output kind=object; route mensalidadesAcademia.indicadoresAcademiaHub.qryInspectMensalidade.
export interface QryInspectMensalidadeInput {
  competencia: string;
}

export interface QryInspectMensalidadeOutput {
  competencia: string;
  totalPago: number;
  saldoDevedor: number;
  situacao: string;
}

export const qryInspectMensalidadeRoute = 'mensalidadesAcademia.indicadoresAcademiaHub.qryInspectMensalidade' as const;
