/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Paciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityPaciente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Paciente",
  "title": "Paciente",
  "description": "Pessoa cadastrada ou associada à clínica para receber consultas.",
  "displayField": "details.identification.name",
  "relationships": {
    "contatos": {
      "relationshipId": "patientContacts",
      "to": "ContatoPaciente",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Contatos do paciente",
      "description": "Canais de contato do paciente, incluindo telefone para confirmação da consulta.",
      "required": "sempre que o paciente estiver associado à clínica",
      "role": "HasContact"
    },
    "consultas": {
      "relationshipId": "appointmentPatient",
      "to": "Consulta",
      "via": "Consulta.patientId",
      "cardinality": "1:N",
      "title": "Consultas do paciente",
      "description": "Consultas agendadas para este paciente.",
      "mode": "fk",
      "direction": "to",
      "required": "sempre que houver uma consulta agendada para o paciente",
      "role": "paciente"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um paciente pelo identificador mestre para exibir seus dados cadastrais à recepcionista durante o agendamento.",
    "locate.byName": "Localiza pacientes pelo nome para a recepcionista identificar a pessoa antes de cadastrá-la ou agendar uma consulta.",
    "locate.byDocument": "Localiza um paciente pelo documento nacional para a recepcionista evitar cadastros duplicados.",
    "locate.byContact": "Localiza o paciente pelo telefone ou outro canal de contato para a recepcionista confirmar consultas.",
    "register.createOrAttach": "Cria ou associa uma pessoa ao papel de paciente da agenda clínica, por documento ou contato, para a recepcionista cadastrá-la sem duplicidade.",
    "edit.platformFields": "Atualiza os dados cadastrais mestres do paciente para a recepcionista manter o cadastro correto.",
    "inactivate": "Inativa ou reativa o papel de paciente sem apagar seu histórico de consultas, para a recepcionista manter o cadastro utilizável.",
    "link.contact": "Vincula um canal de contato, incluindo telefone, ao paciente para a recepcionista poder confirmar consultas.",
    "listLinks": "Lista contatos e consultas relacionados ao paciente para a recepcionista consultar as informações necessárias ao atendimento.",
    "audit": "Consulta as alterações do cadastro mestre do paciente para auditoria administrativa da clínica."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-ssn-unique-for-us",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "agendaClinica.Paciente",
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Dados mestres da pessoa associada à clínica como paciente.",
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
                "description": "Subtipo mestre da pessoa cadastrada como paciente.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o paciente é identificado pela clínica.",
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
                    "description": "Registro ativo."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro inativo."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro unido a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação",
                "description": "Situação mestre que indica se o paciente está ativo para uso na clínica.",
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
                    "description": "Documento SSN."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Documento EIN."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Passaporte."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de motorista",
                    "description": "Carteira de motorista."
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
                    "title": "VAT",
                    "description": "Documento fiscal VAT."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para localizar ou evitar duplicidade do paciente.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional usado na identificação do paciente.",
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
                "description": "País que define as regras aplicáveis ao documento e à privacidade do paciente.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação e situação do paciente no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Nomes alternativos pelos quais o paciente pode ser reconhecido.",
                "title": "Outros nomes",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo derivado dos canais de contato vinculados ao paciente, incluindo o telefone usado na confirmação de consultas.",
                "title": "Contatos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências compactas derivadas dos relacionamentos do paciente.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "notes": {
                "type": "string",
                "maxLength": 0,
                "title": "Observações",
                "description": "Observações gerais mantidas no cadastro mestre do paciente.",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados básicos do cadastro mestre usados pela clínica."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do paciente, aplicável conforme o país informado.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa natural aplicáveis ao paciente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, disponíveis apenas para leitura neste módulo."
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

export type AgendaClinicaEntityPacienteType = typeof agendaClinicaEntityPaciente;

export default agendaClinicaEntityPaciente;
