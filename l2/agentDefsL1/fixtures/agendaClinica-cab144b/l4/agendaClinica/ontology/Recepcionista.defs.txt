/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Recepcionista.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityRecepcionista = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Recepcionista",
  "title": "Recepcionista",
  "description": "Pessoa da clínica que cadastra pacientes e opera os agendamentos.",
  "displayField": "details.identification.name",
  "relationships": {},
  "capabilities": {
    "read.byId": "Lê uma recepcionista pelo identificador mestre já conhecido, por consulta direta ao índice e ao documento, para as telas administrativas da clínica.",
    "locate.byName": "Localiza recepcionistas pelo nome informado, usando a busca por nome do cadastro mestre, para a administração autorizada da clínica.",
    "locate.byDocument": "Localiza uma recepcionista pelo documento nacional, para evitar duplicidade antes de vinculá-la à função, pela consulta de documento do MDM usada pela administração autorizada.",
    "register.createOrAttach": "Cria ou vincula uma pessoa existente ao papel de recepcionista, deduplicando pelo documento e anexando a role agendaClinica.Recepcionista, para a administração autorizada da clínica.",
    "edit.platformFields": "Atualiza os dados de identificação e o consentimento de privacidade mantidos pela plataforma, regravando o índice quando necessário, para a administração autorizada da clínica.",
    "inactivate": "Inativa ou reativa o cadastro mestre da recepcionista sem excluí-lo, por alteração de situação, para a administração autorizada da clínica.",
    "listLinks": "Exibe os vínculos ativos e históricos da recepcionista registrados no MDM, pela consulta de relacionamentos, para a administração autorizada da clínica.",
    "invite.login": "Concede acesso de login à recepcionista por convite, criando o identificador de login no índice da organização, para a administração autorizada da clínica.",
    "audit": "Consulta quem alterou os dados da recepcionista e quando, pelo histórico de auditoria do MDM, para a administração autorizada da clínica."
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
  "roleTag": "agendaClinica.Recepcionista",
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
        "description": "Documento mestre da pessoa que atua como recepcionista na clínica.",
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
                    "description": "Pessoa física."
                  }
                ],
                "description": "Indica que este registro mestre é de uma pessoa que exerce a função de recepcionista.",
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
                "description": "Nome pelo qual a recepcionista é identificada na clínica.",
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
                    "description": "Cadastro retirado de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do registro mestre da recepcionista na plataforma.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "Número de seguridade social dos Estados Unidos."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Identificador fiscal de empresa dos Estados Unidos."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Documento de passaporte."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de motorista",
                    "description": "Documento de habilitação."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identificação."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Cadastro Nacional da Pessoa Jurídica."
                  },
                  {
                    "value": "VAT",
                    "title": "Identificação fiscal",
                    "description": "Número de identificação fiscal."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade no cadastro da recepcionista.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional da recepcionista, quando informado.",
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
                "maxLength": 0,
                "default": "US",
                "description": "Código do país que define as regras aplicáveis ao documento e ao cadastro da recepcionista.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa reconhecidos pela plataforma e usados para localizar e manter a recepcionista."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da plataforma sobre a recepcionista que este módulo não precisa complementar."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade da recepcionista, quando exigido pela legislação aplicável.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados pessoais da plataforma necessários para registrar o consentimento de privacidade da recepcionista."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, apenas para leitura neste módulo."
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

export type AgendaClinicaEntityRecepcionistaType = typeof agendaClinicaEntityRecepcionista;

export default agendaClinicaEntityRecepcionista;
