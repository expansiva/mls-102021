/// <mls fileReference="_102047_/l4/controleEstoque/ontology/Produto.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueEntityProduto = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "controleEstoque",
  "entityId": "Produto",
  "title": "Produto",
  "description": "Produto acompanhado pelo estoque, com quantidade mínima definida para sinalizar saldo abaixo do mínimo.",
  "displayField": "details.identification.name",
  "relationships": {
    "movimentacoesEstoque": {
      "relationshipId": "movimentacaoEstoqueProduto",
      "to": "MovimentacaoEstoque",
      "via": "MovimentacaoEstoque.produtoId",
      "cardinality": "1:N",
      "title": "Movimentações de estoque",
      "description": "Movimentações de entrada ou saída registradas para este produto.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "produto movimentado"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um produto pelo identificador mestre; lê o registro pelo id no índice e documento; usado pelo estoquista ao abrir um produto localizado ou referenciado por uma movimentação.",
    "locate.byName": "Localiza produtos pelo nome; pesquisa o texto informado entre os produtos ativos no índice mestre; usado pelo estoquista para cadastrar movimentações e acompanhar saldos.",
    "register.createOrAttach": "Cadastra ou associa um produto ao controle de estoque; localiza o registro mestre e cria ou anexa a função do módulo, gravando a quantidade mínima; usado pelo estoquista no cadastro de produto.",
    "edit.platformFields": "Altera os dados de catálogo usados pelo estoque, como nome e unidade de medida; atualiza os campos da plataforma no registro mestre; usado pelo estoquista na manutenção do produto.",
    "edit.moduleNamespace": "Altera a quantidade mínima do produto; atualiza somente o espaço controleEstoque do registro mestre; usado pelo estoquista para ajustar o acompanhamento do saldo.",
    "inactivate": "Inativa ou reativa um produto sem removê-lo do cadastro mestre; altera a situação do registro; usado pelo estoquista quando o produto deixa ou volta a ser controlado.",
    "statusHistory.read": "Mostra as mudanças de situação do produto; consulta o histórico de status do registro mestre; usado pelo estoquista ao verificar a disponibilidade do cadastro.",
    "audit": "Mostra quem alterou dados do produto e quando; consulta a auditoria do registro mestre; usado pelo estoquista para conferir a manutenção do cadastro."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "quantidadeMinimaValida",
    "saldoAtualProduto",
    "avisoSaldoMinimoProduto"
  ],
  "kind": "role",
  "subtype": "Product",
  "roleTag": "controleEstoque.Produto",
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
        "description": "Documento mestre do produto acompanhado pelo controle de estoque.",
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
                    "value": "Product",
                    "title": "Produto",
                    "description": "Item de catálogo ou estoque."
                  }
                ],
                "description": "Identifica este cadastro mestre como um produto.",
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
                "description": "Nome usado pelo estoquista para localizar e reconhecer o produto controlado.",
                "title": "Nome do produto",
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
                    "description": "Cadastro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação do produto no cadastro mestre, usada para indicar se ele está ativo para o controle de estoque.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do produto no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos comuns do registro mestre; nenhum campo desta camada é necessário neste controle."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "unitOfMeasure": {
                "type": "string",
                "description": "Unidade em que o estoquista registra entradas, saídas, saldo e quantidade mínima do produto.",
                "title": "Unidade de medida",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de catálogo do produto utilizados para interpretar as quantidades movimentadas."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, somente para leitura neste módulo."
          },
          "controleEstoque": {
            "type": "object",
            "owner": "module",
            "fields": {
              "quantidadeMinima": {
                "type": "number",
                "required": true,
                "of": "Address",
                "title": "Quantidade mínima",
                "description": "Quantidade mínima em estoque a partir da qual o produto deve ser acompanhado por aviso.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "saldoAtual": {
                "type": "number",
                "derived": true,
                "title": "Saldo atual",
                "description": "Quantidade disponível do produto, calculada pelas entradas menos as saídas registradas para este produto."
              },
              "saldoAbaixoDoMinimo": {
                "type": "boolean",
                "derived": true,
                "title": "Saldo abaixo do mínimo",
                "description": "Indica que o saldo atual do produto está menor que a quantidade mínima definida para seu acompanhamento."
              }
            },
            "description": "Dados próprios deste módulo para acompanhar o nível mínimo do produto."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ControleEstoqueEntityProdutoType = typeof controleEstoqueEntityProduto;

export default controleEstoqueEntityProduto;
