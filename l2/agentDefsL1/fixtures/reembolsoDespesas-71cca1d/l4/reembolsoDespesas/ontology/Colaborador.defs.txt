/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/Colaborador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityColaborador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "Colaborador",
  "title": "Colaborador",
  "description": "Pessoa colaboradora que registra e acompanha as próprias despesas.",
  "displayField": "details.identification.name",
  "relationships": {
    "despesasRegistradas": {
      "relationshipId": "expenseCollaborator",
      "to": "Despesa",
      "via": "Despesa.colaboradorId",
      "cardinality": "1:N",
      "title": "Despesas registradas",
      "description": "Despesas que foram registradas por este colaborador.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre, para cada despesa registrada por este colaborador."
    },
    "gestorResponsavel": {
      "relationshipId": "collaboratorReportsToManager",
      "to": "GestorEquipe",
      "via": "ReportsTo",
      "cardinality": "N:1",
      "title": "Gestor responsável",
      "description": "Gestor de equipe ao qual o colaborador se reporta para fins de aprovação de despesas.",
      "roles": [
        "direct-report"
      ],
      "required": "Enquanto o colaborador estiver ativo neste módulo."
    }
  },
  "capabilities": {
    "read.byId": "Consulta um colaborador pelo identificador mestre · usa leitura direta pelo mdmId · usado pelas telas de despesas e de aprovação para apresentar o responsável.",
    "locate.byName": "Localiza colaboradores pelo nome · pesquisa o índice de pessoas ativas por texto · usado na manutenção da vinculação do colaborador ao gestor.",
    "locate.byDocument": "Localiza uma pessoa pelo documento nacional · consulta o índice de documento antes do vínculo ao módulo · usado para evitar criar colaboradores duplicados.",
    "register.createOrAttach": "Cria ou vincula a pessoa existente ao papel de Colaborador · localiza pelo documento e anexa a etiqueta reembolsoDespesas.Colaborador · usado pelo processo interno que habilita a pessoa a registrar despesas.",
    "link": "Vincula o colaborador ao gestor responsável · cria o relacionamento versionado ReportsTo com o papel direct-report · usado na definição da equipe responsável pela aprovação.",
    "unlink": "Encerra a vinculação do colaborador ao gestor · inativa o relacionamento ReportsTo preservando seu histórico · usado quando há mudança de gestor ou equipe.",
    "listLinks": "Lista os vínculos do colaborador · consulta relacionamentos ativos e seu período de validade · usado para verificar o gestor responsável pela equipe.",
    "inactivate": "Inativa o cadastro mestre do colaborador · altera a situação do registro sem excluí-lo · usado pela administração quando a pessoa deixa de poder registrar despesas.",
    "statusHistory.read": "Consulta o histórico de situação do colaborador · lê as mudanças de status registradas pela plataforma · usado pela administração para acompanhar ativações e inativações.",
    "audit": "Consulta as alterações auditadas do colaborador · lê a trilha de auditoria do cadastro mestre · usado pela administração em conferências."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "reembolsoDespesas.Colaborador",
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
        "description": "Registro mestre da pessoa colaboradora, com dados da plataforma e o espaço do módulo de reembolso de despesas.",
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
                "description": "Indica que este registro mestre é de uma pessoa colaboradora.",
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
                "description": "Nome pelo qual o colaborador é reconhecido nas despesas e nas aprovações.",
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
                "description": "Situação de atividade do registro mestre do colaborador.",
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
                    "description": "Identificador tributário de valor agregado."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento aceito pela plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade no cadastro do colaborador.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento do colaborador, usado com o tipo para deduplicação.",
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
                "description": "Código ISO do país aplicável ao documento e às regras legais do colaborador.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas pela plataforma, incluindo a função de Colaborador neste módulo.",
                "title": "Etiquetas",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação usados para reconhecer, localizar e manter o colaborador no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências derivadas dos relacionamentos ativos do colaborador, incluindo a vinculação ao gestor responsável.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados comuns do cadastro mestre usados para consultar os vínculos do colaborador."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade da pessoa colaboradora, quando exigido pela legislação aplicável.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados da pessoa mantidos pela plataforma para o colaborador."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado entre módulos; este módulo apenas os consulta."
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

export type ReembolsoDespesasEntityColaboradorType = typeof reembolsoDespesasEntityColaborador;

export default reembolsoDespesasEntityColaborador;
