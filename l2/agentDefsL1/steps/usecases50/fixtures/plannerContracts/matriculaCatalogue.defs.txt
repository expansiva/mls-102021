/// <mls fileReference="_102047_/l2/mensalidadesAcademia/web/contracts/matriculaCatalogue.defs.ts" enhancement="_blank"/>

// GENERATED from l4 — do not edit (workspace matriculaCatalogue; one contract file per workspace, all bffCalls).

// bffCall qryListAluno (query) — Output kind=paginated; route mensalidadesAcademia.matriculaCatalogue.qryListAluno.
export interface QryListAlunoInput {
  name: string;
  docId?: string;
  page?: number;
  pageSize?: number;
}

export interface QryListAlunoOutputItem {
  id: string;
  name: string;
  docId: string;
  status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
}

export interface QryListAlunoOutput {
  alunoItems: QryListAlunoOutputItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

export const qryListAlunoRoute = 'mensalidadesAcademia.matriculaCatalogue.qryListAluno' as const;

// bffCall qryListPlano (query) — Output kind=paginated; route mensalidadesAcademia.matriculaCatalogue.qryListPlano.
export interface QryListPlanoInput {
  name: string;
  page?: number;
  pageSize?: number;
}

export interface QryListPlanoOutputItem {
  id: string;
  name: string;
  periodicidade: 'monthly' | 'quarterly' | 'annual';
  valor: number;
  diaVencimento: number;
}

export interface QryListPlanoOutput {
  planoItems: QryListPlanoOutputItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

export const qryListPlanoRoute = 'mensalidadesAcademia.matriculaCatalogue.qryListPlano' as const;

// bffCall cmdCreateMatricula (command) — Output kind=object; route mensalidadesAcademia.matriculaCatalogue.cmdCreateMatricula.
export interface CmdCreateMatriculaInput {
  alunoId: string;
  planoId: string;
  dataInicio: string;
}

export interface CmdCreateMatriculaOutput {
  id: string;
  alunoId: string;
  planoId: string;
  status: 'active' | 'canceled';
  dataInicio: string;
}

export const cmdCreateMatriculaRoute = 'mensalidadesAcademia.matriculaCatalogue.cmdCreateMatricula' as const;
