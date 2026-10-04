/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/GestorEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityGestorEquipe = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "GestorEquipe",
  "title": "Gestor da equipe",
  "description": "Pessoa responsável por analisar e decidir as despesas dos colaboradores de sua equipe.",
  "displayField": "details.identification.name",
  "relationships": {
    "colaboradores": {
      "relationshipId": "collaboratorReportsToManager",
      "to": "Colaborador",
      "via": "ReportsTo",
      "cardinality": "1:N",
      "title": "Colaboradores da equipe",
      "description": "Colaboradores que se reportam a este gestor por meio do relacionamento mestre ReportsTo, com o papel direct-report.",
      "roles": [
        "direct-report"
      ],
      "direction": "to",
      "required": "Não é obrigatória para o gestor; um gestor pode ainda não ter colaboradores vinculados."
    },
    "despesasDaEquipe": {
      "relationshipId": "managerTeamExpenses",
      "to": "Despesa",
      "via": "Despesa",
      "cardinality": "1:N",
      "title": "Despesas da equipe",
      "description": "Despesas registradas por colaboradores que se reportam a este gestor, lidas pelo caminho derivado de equipe.",
      "mode": "throughTable",
      "path": "GestorEquipe <-[ReportsTo]- Colaborador <-[Despesa.colaboradorId]- Despesa",
      "derived": true,
      "required": "Não é obrigatória; o gestor pode não ter despesas de equipe registradas.",
      "role": "gestor responsável"
    }
  },
  "capabilities": {
    "read.byId": "Lê um gestor da equipe pelo identificador mestre · usa leitura por mdmId no índice e no documento MDM · usado pelas telas que exibem o responsável pela análise de uma despesa.",
    "locate.byName": "Localiza gestores pelo nome · pesquisa o nome indexado entre registros do subtipo Pessoa · usado na manutenção dos responsáveis pelas equipes.",
    "locate.byDocument": "Localiza um gestor pelo documento nacional · consulta o documento para deduplicar antes de criar ou anexar o papel · usado por quem cadastra gestores.",
    "register.createOrAttach": "Cria a pessoa quando ausente ou anexa o papel de gestor quando ela já existe · deduplica por documento e grava a tag reembolsoDespesas.GestorEquipe · usado por administradores na composição das equipes.",
    "edit.platformFields": "Atualiza os dados mestres permitidos do gestor · altera os campos de identificação da pessoa no MDM · usado por administradores que mantêm o cadastro.",
    "inactivate": "Inativa ou reativa o gestor sem apagá-lo · altera a situação mestre Active ou Inactive · usado por administradores quando o responsável deixa de atuar.",
    "link": "Vincula colaboradores a este gestor · cria o relacionamento versionado ReportsTo com o papel adequado · usado por administradores ao definir a equipe.",
    "unlink": "Encerra o vínculo de um colaborador com este gestor · inativa o relacionamento ReportsTo mantendo seu histórico · usado por administradores ao reorganizar a equipe.",
    "listLinks": "Lista os colaboradores e demais vínculos do gestor · consulta relacionamentos MDM com validade e papel · usado pelo gestor e por administradores para conferir a equipe.",
    "audit": "Consulta as alterações do cadastro e dos vínculos do gestor · lê a auditoria de escritas do MDM · usado por administradores para rastreabilidade."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-ssn-unique-for-us",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "reembolsoDespesas.GestorEquipe",
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
        "description": "Dados mestres da pessoa que exerce o papel de gestor da equipe no módulo de reembolso de despesas.",
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
                    "description": "Pessoa física cadastrada no MDM."
                  }
                ],
                "description": "Identifica este registro mestre como uma pessoa que pode exercer o papel de gestor da equipe.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 255,
                "description": "Nome pelo qual o gestor da equipe é identificado nas análises de despesas.",
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
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do gestor, usada para manter ativa ou inativa sua participação no módulo.",
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
                    "description": "Identificador fiscal empresarial dos Estados Unidos."
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
                    "title": "VAT",
                    "description": "Identificador fiscal de valor agregado."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro tipo de documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para localizar ou deduplicar o gestor no MDM.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional usado para identificar o gestor já existente no MDM.",
                "title": "Número do documento",
                "maxLength": 100,
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
                "description": "Código ISO do país que define as regras aplicáveis ao documento e à pessoa gestora.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa reconhecida como gestor da equipe."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base da pessoa mantidos pela plataforma; este papel não utiliza campos adicionais nesta camada."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados específicos de pessoa física mantidos pela plataforma; este papel não utiliza campos adicionais nesta camada."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização, lidos pelo módulo quando existentes e não declarados por ele."
          },
          "reembolsoDespesas": {
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

export type ReembolsoDespesasEntityGestorEquipeType = typeof reembolsoDespesasEntityGestorEquipe;

export default reembolsoDespesasEntityGestorEquipe;
