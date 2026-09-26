/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Recepcionista.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityRecepcionista = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Recepcionista",
  "title": "Recepcionista",
  "description": "Pessoa da clínica que cadastra pacientes e administra os agendamentos.",
  "displayField": "details.identification.name",
  "relationships": {},
  "capabilities": {
    "read.byId": "Lê a recepcionista pelo identificador mestre, por consulta direta no índice e no documento, para telas internas que já possuem seu registro.",
    "locate.byName": "Localiza recepcionistas pelo nome, pesquisando o índice de pessoas, para quem administra os cadastros da clínica.",
    "locate.byDocument": "Localiza uma recepcionista pelo documento nacional, para evitar duplicidade durante seu cadastro interno.",
    "register.createOrAttach": "Cria ou vincula a pessoa existente ao papel de recepcionista, conferindo documento e aplicando a tag do módulo, para o responsável interno pelo cadastro.",
    "edit.platformFields": "Atualiza nome, documento e demais dados mantidos pela plataforma, reindexando a identificação quando necessário, para quem mantém o cadastro da recepcionista.",
    "edit.moduleNamespace": "Atualiza somente o espaço agendaClinica da recepcionista, protegido da escrita de outros módulos, para a administração do módulo.",
    "inactivate": "Inativa ou reativa a recepcionista sem apagar seu registro mestre, alterando a situação da plataforma, para quem mantém os cadastros internos.",
    "audit": "Exibe quem alterou os dados da recepcionista e quando, pela auditoria do registro mestre, para a administração da clínica.",
    "invite.login": "Concede convite de acesso à recepcionista, criando o identificador de login no índice da organização, para quem administra os acessos internos."
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
        "description": "Documento mestre da pessoa, com dados da plataforma e o espaço exclusivo do módulo agenda clínica.",
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
                "description": "Indica que este registro mestre representa uma pessoa.",
                "title": "Tipo de registro",
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
                    "description": "Registro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Registro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela organização."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação ativa, inativa, mesclada ou bloqueada do registro mestre da recepcionista.",
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
                    "description": "Outro documento de identificação."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar a recepcionista.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional da recepcionista.",
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
                "description": "Código ISO do país ao qual se aplicam o documento e as regras da recepcionista.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa usados pela clínica para reconhecer e manter a recepcionista."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da plataforma para esta pessoa; não há dado adicional deste grupo usado pela agenda clínica."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados pessoais da plataforma; a agenda clínica não usa campos adicionais deste grupo para a recepcionista."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, somente para leitura pela agenda clínica."
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

export type AgendaClinicaEntityRecepcionistaType = typeof agendaClinicaEntityRecepcionista;

export default agendaClinicaEntityRecepcionista;
