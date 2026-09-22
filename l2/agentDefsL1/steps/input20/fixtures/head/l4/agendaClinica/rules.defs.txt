/// <mls fileReference="_102047_/l4/agendaClinica/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agendaClinica",
  "rules": {
    "consultationTransitionFlow": "Uma consulta agendada pode ser confirmada, uma consulta agendada ou confirmada pode ser registrada como falta, e uma consulta agendada ou confirmada pode ser concluída como atendida.",
    "attendanceNoteRequired": "A conclusão de uma consulta como atendida exige uma anotação do profissional sobre o atendimento.",
    "professionalOwnAppointment": "O profissional somente pode consultar a agenda diária e concluir como atendidas as consultas vinculadas a ele próprio.",
    "ruleForeignNamespaceRefused": "Dados pertencentes a outro módulo não podem ser mantidos no espaço de dados da agenda clínica.",
    "ruleDeleteBlockedByRelationships": "Um registro não pode ser excluído enquanto possuir relacionamentos vinculados.",
    "ruleDocumentShapeValidated": "Os dados de documento de identificação devem respeitar o formato aplicável ao país e ao tipo de documento informados.",
    "ruleIdentityNeverInNamespace": "Dados de identidade devem permanecer no cadastro mestre e não podem ser mantidos no espaço de dados da agenda clínica.",
    "rulePersonSsnUniqueForUs": "Nos Estados Unidos, um número de seguridade social só pode identificar uma pessoa no cadastro mestre.",
    "rulePersonPrivacyConsentRequiredBrEu": "O consentimento de privacidade é obrigatório para pessoas cujo país informado seja Brasil ou um país da União Europeia.",
    "ruleContactValueUniquePerType": "Um mesmo valor de contato só pode ser associado uma vez a cada tipo de canal de contato.",
    "uniqueProfessionalSchedule": "Não pode haver duas consultas para o mesmo profissional na mesma data e horário."
  }
} as const satisfies Ns5RulesArtifactV2;

export type AgendaClinicaRulesType = typeof agendaClinicaRules;

export default agendaClinicaRules;
