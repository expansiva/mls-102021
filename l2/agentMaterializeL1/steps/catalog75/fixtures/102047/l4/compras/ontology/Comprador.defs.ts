/// <mls fileReference="_102047_/l4/compras/ontology/Comprador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityComprador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Comprador",
  "title": "Comprador",
  "description": "Usuário da organização que abre solicitações de compra e cadastra fornecedores; escolhido da lista de usuários, nunca cadastrado pelo módulo.",
  "displayField": "details.identification.name",
  "relationships": {
    "solicitacoes": {
      "relationshipId": "solicitacaoComprador",
      "to": "SolicitacaoCompra",
      "via": "SolicitacaoCompra.compradorId",
      "cardinality": "1:N",
      "title": "Solicitações de compra abertas",
      "description": "Solicitações de compra abertas por este comprador.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "locate.users": "Lista os usuários da organização com login, filtrando pelo nome e pelo papel compras.Comprador, para escolher o comprador responsável; usado pelo comprador e pelo gerente de compras.",
    "read.byId": "Lê o comprador pelo mdmId para mostrar seu nome nas solicitações e pedidos listados; usado por comprador, gerente de compras e almoxarife.",
    "locate.byName": "Encontra compradores pelo nome digitado para filtrar a pesquisa de solicitações; usado pelo comprador e pelo gerente de compras.",
    "locate.byTag": "Encontra todos os usuários marcados com o papel compras.Comprador pelo índice de tags; usado pelo gerente de compras ao acompanhar quem compra.",
    "listLinks": "Mostra as solicitações de compra ligadas ao comprador; usado pelo gerente de compras na ficha do comprador.",
    "inactivate": "Retira o papel de comprador de uso sem apagá-lo, podendo ser reativado; usado pelo gerente de compras.",
    "comment": "Deixa uma observação sobre o comprador no registro; usado pelo gerente de compras.",
    "statusHistory.read": "Mostra quando o comprador foi ativado ou inativado e por quem; usado pelo gerente de compras.",
    "audit": "Informa quem alterou o registro do comprador e quando, pelo módulo de auditoria da plataforma; usado por um administrador.",
    "compras.solicitacoesDoComprador": "Lista as solicitações de compra abertas pelo comprador da sessão pela chave estrangeira da solicitação; usado pelo comprador para ver as suas solicitações."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "compradorEscolhidoDaListaDeUsuarios",
    "compradorInativoNaoAbreSolicitacao"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "compras.Comprador",
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
        "description": "Registro mestre da pessoa que atua como comprador no módulo compras.",
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
                "description": "Sempre pessoa: o comprador é um usuário da organização.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do comprador como aparece na lista de usuários e nas solicitações de compra que ele abriu.",
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
                "title": "Situação",
                "description": "Situação do usuário no cadastro mestre; só compradores ativos são escolhidos para abrir solicitações."
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis de módulo do registro; inclui compras.Comprador quando a pessoa atua como comprador.",
                "title": "Papéis"
              }
            },
            "description": "Identificação do usuário da organização que atua como comprador."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns da plataforma; o módulo compras não usa nenhum deles para o comprador."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados de pessoa física da plataforma; o módulo compras não usa nenhum deles para o comprador."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo apenas lê."
          },
          "compras": {
            "type": "object",
            "owner": "module",
            "fields": {
              "loginEmail": {
                "type": "string",
                "derived": true,
                "title": "E-mail de acesso",
                "description": "E-mail de acesso do comprador, lido do login da plataforma; nunca digitado nem armazenado pelo módulo."
              }
            },
            "description": "Espaço do módulo compras sobre o comprador; vazio, pois o módulo não guarda nada próprio sobre ele."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityCompradorType = typeof comprasEntityComprador;

export default comprasEntityComprador;
