/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/contracts/cancelarPropriaMatricula.defs.ts" enhancement="_blank"/>

// GENERATED from l4 — do not edit (workspace cancelarPropriaMatricula; one contract file per workspace, all bffCalls).

// bffCall qryListMatricula (query) — Output kind=paginated; route mensalidadesAcademia.cancelarPropriaMatricula.qryListMatricula.
export interface QryListMatriculaInput {
  page?: number;
  pageSize?: number;
}

export interface QryListMatriculaOutputItem {
  id: string;
  planoId: string;
  status: 'active' | 'canceled';
  dataInicio: string;
}

export interface QryListMatriculaOutput {
  matriculaItems: QryListMatriculaOutputItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

export const qryListMatriculaRoute = 'mensalidadesAcademia.cancelarPropriaMatricula.qryListMatricula' as const;

// bffCall qryGetMatricula (query) — Output kind=object; route mensalidadesAcademia.cancelarPropriaMatricula.qryGetMatricula.
export interface QryGetMatriculaInput {
  id: string;
}

export interface QryGetMatriculaOutput {
  id: string;
  planoId: string;
  status: 'active' | 'canceled';
  dataInicio: string;
  dataCancelamento: string;
}

export const qryGetMatriculaRoute = 'mensalidadesAcademia.cancelarPropriaMatricula.qryGetMatricula' as const;

// bffCall cmdCancelarMatricula (command) — Output kind=object; route mensalidadesAcademia.cancelarPropriaMatricula.cmdCancelarMatricula.
export interface CmdCancelarMatriculaInput {
  id: string;
}

export interface CmdCancelarMatriculaOutput {
  id: string;
  status: 'active' | 'canceled';
  dataCancelamento: string;
}

export const cmdCancelarMatriculaRoute = 'mensalidadesAcademia.cancelarPropriaMatricula.cmdCancelarMatricula' as const;
