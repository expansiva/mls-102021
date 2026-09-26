/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Médico ou terapeuta da clínica para quem as consultas são agendadas e que registra os próprios atendimentos.",
  "displayField": "details.identification.name",
  "relationships": {
    "consultas": {
      "relationshipId": "consultaProfissional",
      "to": "Consulta",
      "via": "Consulta.profissionalId",
      "cardinality": "1:N",
      "title": "Consultas do profissional",
      "description": "Consultas agendadas para este profissional.",
      "mode": "fk",
      "direction": "to",
      "required": "Não é obrigatório que o profissional tenha consultas; cada consulta vinculada exige um profissional.",
      "role": "profissional"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre de um profissional pelo identificador para exibi-lo nas consultas e na agenda diária; usado pela recepcionista e pelo profissional.",
    "locate.byName": "Localiza profissionais pelo nome no índice do MDM para que a recepcionista selecione quem realizará a consulta.",
    "locate.byDocument": "Localiza um profissional pelo documento nacional para evitar duplicidade no seu cadastro; usado pela administração autorizada.",
    "register.createOrAttach": "Cria ou associa ao papel de Profissional um registro de pessoa já existente, deduplicando por documento; usado pela administração autorizada.",
    "edit.platformFields": "Atualiza os dados de identificação e a ocupação do profissional no registro mestre; usado pela administração autorizada.",
    "edit.moduleNamespace": "Atualiza exclusivamente o espaço agendaClinica do profissional, que permanece sem dados adicionais neste módulo; usado pela administração autorizada.",
    "inactivate": "Inativa ou reativa o cadastro mestre de um profissional para retirá-lo ou devolvê-lo ao uso da clínica; usado pela administração autorizada.",
    "listLinks": "Lista as consultas relacionadas ao profissional por meio do vínculo de consulta; usado pela recepcionista e pelo profissional.",
    "statusHistory.read": "Mostra quando a situação mestre do profissional mudou e quem realizou a alteração; usado pela administração autorizada.",
    "audit": "Consulta a auditoria das alterações do cadastro mestre do profissional; usado pela administração autorizada.",
    "invite.login": "Convida o profissional para criar o login que permite acessar somente a própria agenda diária; usado pela administração autorizada."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Profissional",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Dados mestre da pessoa que atua como médico ou terapeuta na clínica.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa",
                    "description": "Pessoa natural."
                  }
                ],
                "description": "Indica que este cadastro mestre é de uma pessoa.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual a recepcionista localiza o profissional ao agendar uma consulta.",
                "title": "Nome",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Cadastro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Cadastro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Unificado",
                    "description": "Cadastro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do profissional, usada para mantê-lo ativo ou inativo na clínica.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de viagem."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para deduplicar o profissional no cadastro mestre.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional informado para localizar ou deduplicar o profissional.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Código do país que define as regras aplicáveis ao documento do profissional.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Identificação mestre usada para localizar e manter o profissional."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do registro mestre do profissional utilizados pela plataforma."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "occupation": {
                "type": "string",
                "maxLength": 0,
                "title": "Ocupação",
                "description": "Ocupação do profissional, como médico ou terapeuta.",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa natural aproveitados para identificar a atuação profissional na clínica."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização e somente lidos pela agenda clínica."
          },
          "agendaClinica": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type AgendaClinicaEntityProfissionalType = typeof agendaClinicaEntityProfissional;

export default agendaClinicaEntityProfissional;
