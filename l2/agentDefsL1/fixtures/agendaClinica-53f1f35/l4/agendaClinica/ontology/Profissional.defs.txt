/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Profissional.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityProfissional = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Profissional",
  "title": "Profissional",
  "description": "Médico ou terapeuta que realiza consultas na clínica.",
  "displayField": "details.identification.name",
  "relationships": {
    "consultas": {
      "relationshipId": "consultaProfissional",
      "to": "Consulta",
      "via": "Consulta.profissionalId",
      "cardinality": "1:N",
      "title": "Consultas realizadas",
      "description": "Consultas da agenda clínica realizadas por este profissional.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que uma consulta for agendada para este profissional.",
      "role": "profissional"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre de um profissional pelo identificador para apresentar seu nome e dados na agenda, para recepcionista e profissional.",
    "locate.byName": "Localiza profissionais pelo nome para que a recepcionista escolha quem realizará a consulta.",
    "locate.byDocument": "Localiza um profissional pelo documento nacional para evitar duplicidade no seu cadastro, para a recepcionista.",
    "register.createOrAttach": "Cria ou vincula ao módulo o registro mestre de uma pessoa como profissional, por documento ou contato, para a recepcionista.",
    "edit.platformFields": "Atualiza os dados de identificação e a profissão do profissional no cadastro mestre, para a recepcionista.",
    "edit.moduleNamespace": "Atualiza somente o namespace agendaClinica do profissional quando houver dado exclusivo do módulo, para a recepcionista.",
    "inactivate": "Inativa ou reativa o profissional no cadastro mestre para retirá-lo ou devolvê-lo ao uso na agenda, para a recepcionista.",
    "link.contact": "Vincula um canal de contato ao profissional por HasContact, para a recepcionista manter os contatos sem copiá-los no cadastro.",
    "listLinks": "Lista os relacionamentos e as consultas vinculadas ao profissional para consulta da agenda, para recepcionista e profissional.",
    "invite.login": "Concede login ao profissional por convite para que ele acesse somente a própria agenda diária, para a recepcionista.",
    "audit": "Mostra quem alterou o cadastro mestre do profissional e quando, para a recepcionista responsável pela manutenção."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
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
        "description": "Documento mestre da pessoa que exerce atendimento clínico na agenda.",
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
                    "description": "Pessoa física que atua como profissional."
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
                "description": "Nome pelo qual o profissional é identificado na agenda e nas consultas.",
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
                    "title": "Mesclado",
                    "description": "Cadastro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro bloqueado pela organização."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação operacional do registro mestre do profissional.",
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
                    "description": "Outro documento aceito pela organização."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade do profissional.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do profissional, usado na deduplicação do cadastro mestre.",
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
                "description": "Código ISO do país ao qual se aplicam o documento e as regras do profissional.",
                "title": "País do documento",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do profissional no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Referências derivadas aos canais de contato vinculados ao profissional.",
                "title": "Contatos vinculados",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências compactas de relacionamentos recalculadas pela plataforma.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados gerais da pessoa mantidos pela plataforma e utilizados para localizar e relacionar o profissional."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "occupation": {
                "type": "string",
                "maxLength": 0,
                "title": "Profissão",
                "description": "Especialidade ou ocupação pela qual a pessoa atua na clínica, como médico ou terapeuta.",
                "required": true,
                "min": 0,
                "max": 0
              },
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade aplicável aos dados pessoais do profissional.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa física relevantes para a atuação clínica."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização, apenas para leitura neste módulo."
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
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgendaClinicaEntityProfissionalType = typeof agendaClinicaEntityProfissional;

export default agendaClinicaEntityProfissional;
