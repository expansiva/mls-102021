/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agendaClinica",
  "rules": {
    "transicoesConsultaValidas": "Uma consulta só pode ser confirmada quando estiver agendada, e só pode ser marcada como faltante ou atendida quando estiver agendada ou confirmada.",
    "atendimentoExigeAnotacao": "Uma consulta só pode ser marcada como atendida com uma anotação do atendimento registrada.",
    "profissionalHorarioUnico": "Não pode haver duas consultas para o mesmo profissional na mesma data e horário."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type AgendaClinicaRulesType = typeof agendaClinicaRules;

export default agendaClinicaRules;
