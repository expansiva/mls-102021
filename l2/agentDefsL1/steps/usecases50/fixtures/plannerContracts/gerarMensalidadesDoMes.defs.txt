/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/contracts/gerarMensalidadesDoMes.defs.ts" enhancement="_blank"/>

// GENERATED from l4 — do not edit (workspace gerarMensalidadesDoMes; one contract file per workspace, all bffCalls).

// bffCall cmdGerarMensalidadesDoMes (command) — Output kind=object; route mensalidadesAcademia.gerarMensalidadesDoMes.cmdGerarMensalidadesDoMes.
export interface CmdGerarMensalidadesDoMesInput {
  competencia: string;
}

export interface CmdGerarMensalidadesDoMesOutput {
  id: string;
  matriculaId: string;
  competencia: string;
  vencimento: string;
  valorCobranca: number;
}

export const cmdGerarMensalidadesDoMesRoute = 'mensalidadesAcademia.gerarMensalidadesDoMes.cmdGerarMensalidadesDoMes' as const;
