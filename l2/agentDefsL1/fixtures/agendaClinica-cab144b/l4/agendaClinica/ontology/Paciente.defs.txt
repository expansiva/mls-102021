/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Paciente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityPaciente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Paciente",
  "title": "Paciente",
  "description": "Pessoa atendida pela clínica, registrada no cadastro mestre da organização.",
  "displayField": "details.identification.name",
  "relationships": {
    "consultas": {
      "relationshipId": "consultaPaciente",
      "to": "Consulta",
      "via": "Consulta.pacienteId",
      "cardinality": "1:N",
      "title": "Consultas do paciente",
      "description": "Consultas da agenda clínica marcadas para este paciente.",
      "mode": "fk",
      "direction": "to",
      "required": "Nunca; um paciente pode estar cadastrado antes de ter uma consulta.",
      "role": "paciente"
    },
    "contatos": {
      "relationshipId": "pacienteHasContact",
      "to": "ContatoPaciente",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Canais de contato do paciente",
      "description": "Canais de contato mestre vinculados ao paciente e usados pela recepção na confirmação telefônica.",
      "required": "Quando a recepcionista precisar confirmar uma consulta por telefone.",
      "role": "titular"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre do paciente pelo identificador · usa leitura direta e hidratação do documento mestre · recepcionista ao abrir um paciente ou uma consulta.",
    "locate.byName": "Localiza pacientes pelo nome informado · pesquisa o índice de pessoas ativas e seus nomes · recepcionista ao cadastrar ou agendar uma consulta.",
    "locate.byDocument": "Localiza o paciente pelo documento nacional · consulta o índice de tipo e número de documento para deduplicação · recepcionista antes de criar ou vincular o cadastro.",
    "locate.byContact": "Localiza o paciente por telefone, WhatsApp ou e-mail já vinculado · encontra o titular do canal de contato mestre · recepcionista durante o atendimento e a confirmação.",
    "register.createOrAttach": "Cria ou vincula o registro mestre de paciente à agenda clínica · procura por documento ou contato, cria quando ausente e anexa a função de paciente · recepcionista no cadastro de paciente.",
    "edit.platformFields": "Atualiza os dados cadastrais mantidos pela plataforma · grava os campos permitidos do documento mestre e atualiza o índice de identificação · recepcionista ao corrigir o cadastro do paciente.",
    "link.contact": "Vincula um canal telefônico ou outro contato ao paciente · cria ou relaciona um ContactChannel por HasContact e atualiza o resumo derivado · recepcionista para possibilitar confirmações.",
    "listLinks": "Lista os vínculos mestre do paciente · consulta relacionamentos ativos e seu histórico de vigência · recepcionista ao conferir canais de contato.",
    "inactivate": "Inativa ou reativa o cadastro sem apagá-lo · altera a situação mestre entre ativo e inativo · recepcionista ao retirar ou devolver um paciente ao uso da agenda."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento mestre da pessoa atendida pela clínica, com os dados de identificação, contatos vinculados e o espaço exclusivo do módulo.",
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
                    "description": "Pessoa física atendida pela clínica."
                  }
                ],
                "description": "Indica que este registro mestre é de uma pessoa.",
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
                "description": "Nome pelo qual o paciente é identificado pela recepção e nas consultas.",
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
                    "description": "Cadastro unido a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro impedido de uso pela organização."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do registro mestre do paciente para uso pela clínica.",
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
                    "description": "Documento nacional SSN."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Documento nacional EIN."
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
                    "title": "Identidade nacional",
                    "description": "Documento nacional de identidade."
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
                    "title": "Registro tributário",
                    "description": "Registro tributário nacional."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela organização."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional informado para identificar e evitar duplicidade de paciente.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional usado para localizar ou deduplicar o paciente.",
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
                "description": "Código do país aplicável ao documento e às regras cadastrais do paciente.",
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
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo derivado dos canais de contato mestre vinculados ao paciente, consultado pela recepção para confirmação telefônica.",
                "title": "Canais de contato",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências derivadas dos vínculos mestre do paciente, incluindo seus canais de contato.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados base mantidos pela organização e usados pela recepção para consultar os canais de contato do paciente."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade aplicável ao tratamento dos dados do paciente.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa física mantidos pela plataforma e necessários para a conformidade de privacidade do paciente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos; a agenda clínica apenas os lê."
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

export type AgendaClinicaEntityPacienteType = typeof agendaClinicaEntityPaciente;

export default agendaClinicaEntityPaciente;
