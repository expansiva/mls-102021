/// <mls fileReference="_102047_/l4/tarefas/ontology/MembroEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityMembroEquipe = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "entityId": "MembroEquipe",
  "title": "Membro da equipe",
  "description": "Pessoa da equipe que cria, executa e revisa tarefas; é responsável ou criadora de tarefas. O gestor também é um membro da equipe.",
  "displayField": "details.identification.name",
  "relationships": {
    "tarefasResponsavel": {
      "relationshipId": "tarefaResponsavel",
      "to": "Tarefa",
      "via": "Tarefa.responsavelId",
      "cardinality": "1:N",
      "title": "Tarefas sob responsabilidade",
      "description": "Tarefas que o membro executa.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "tarefasCriadas": {
      "relationshipId": "tarefaCriador",
      "to": "Tarefa",
      "via": "Tarefa.criadorId",
      "cardinality": "1:N",
      "title": "Tarefas criadas",
      "description": "Tarefas que o membro criou e revisa.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "avisosVencimento": {
      "relationshipId": "avisoResponsavel",
      "to": "AvisoVencimento",
      "via": "AvisoVencimento.responsavelId",
      "cardinality": "1:N",
      "title": "Avisos diários de vencimento",
      "description": "Avisos diários das tarefas abertas que vencem hoje ou estão atrasadas.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o membro pelo mdmId para mostrar responsável e criador nas listas e no quadro de tarefas; usado por todas as telas de tarefas.",
    "locate.byName": "Busca membros ativos pelo nome para escolher o novo responsável ao criar ou reatribuir uma tarefa; usado pelo membro e pelo gestor.",
    "locate.byLogin": "Resolve o membro da sessão pelo e-mail de login, base das visões 'minhas tarefas' e 'tarefas que criei'; usado pela plataforma.",
    "register.createOrAttach": "Cria ou anexa a pessoa com o papel tarefas.MembroEquipe, sem duplicar quem já existe no cadastro mestre; usado pelo gestor ao montar a equipe.",
    "edit.platformFields": "Corrige o nome e o país do membro no cadastro mestre; usado pelo gestor.",
    "inactivate": "Inativa o membro que saiu da equipe, que deixa de aparecer na escolha de responsável, e o reativa se voltar; usado pelo gestor.",
    "link.contact": "Vincula o e-mail ou telefone do membro por HasContact, usado nos avisos de tarefa; usado pelo gestor.",
    "listLinks": "Mostra os vínculos do membro, como a quem se reporta na equipe; usado na ficha do membro.",
    "invite.login": "Dá login ao membro para que ele veja e execute suas tarefas; usado pelo gestor.",
    "audit": "Mostra quem alterou o cadastro do membro e quando; usado pelo gestor."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "rule-delete-blocked-by-relationships",
    "responsavelDeveSerMembroAtivo"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "tarefas.MembroEquipe",
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
        "description": "Registro mestre da pessoa da equipe, como a plataforma o guarda.",
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
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre pessoa: o membro da equipe é uma pessoa física.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do membro como aparece nas tarefas (responsável e criador) e na escolha de quem recebe a tarefa.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação no cadastro",
                "description": "Ativo pode receber tarefas; inativo deixa de aparecer na escolha de responsável."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do membro, que define as regras de privacidade aplicáveis.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis de módulo da pessoa; inclui tarefas.MembroEquipe.",
                "title": "Papéis"
              }
            },
            "description": "Colunas de índice da plataforma usadas para localizar o membro."
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
                "description": "Resumo dos canais de contato vinculados, lido para os avisos ao responsável e ao criador.",
                "title": "Contatos"
              }
            },
            "description": "Dados comuns da plataforma; o módulo não usa nenhum além dos contatos derivados."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD do membro, exigido pela plataforma para residentes no Brasil.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Ramo de pessoa física da plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo apenas lê."
          },
          "tarefas": {
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

export type TarefasEntityMembroEquipeType = typeof tarefasEntityMembroEquipe;

export default tarefasEntityMembroEquipe;
