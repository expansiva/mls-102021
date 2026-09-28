/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agendaClinica",
  "rules": {
    "consultaSomenteAgendadaPodeRegistrarFalta": "A falta do paciente só pode ser registrada para uma consulta com situação agendada.",
    "consultaSomenteAgendadaPodeRegistrarAtendimento": "O atendimento só pode ser registrado para uma consulta com situação agendada.",
    "anotacaoObrigatoriaNoAtendimento": "O registro de atendimento deve incluir uma anotação do atendimento.",
    "profissionalAtendeSomentePropriaConsulta": "O profissional só pode registrar o atendimento de uma consulta atribuída a ele.",
    "consultaHorarioProfissionalUnico": "Não pode haver duas consultas para o mesmo profissional na mesma data e horário."
  }
} as const satisfies Ns5RulesArtifactV2;

export type AgendaClinicaRulesType = typeof agendaClinicaRules;

export default agendaClinicaRules;
