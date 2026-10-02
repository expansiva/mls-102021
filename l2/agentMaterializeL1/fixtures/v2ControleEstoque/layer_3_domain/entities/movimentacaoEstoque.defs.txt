/// <mls fileReference="_102047_/l1/controleEstoque/layer_3_domain/entities/movimentacaoEstoque.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "MovimentacaoEstoque",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_3_domain/entities/produto.defs.ts"
  ],
  "data": {
    "entityId": "MovimentacaoEstoque",
    "storageTarget": "moduleDatabase",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "produtoId",
        "type": "record",
        "ref": "Produto"
      },
      {
        "name": "movimentadoEm",
        "type": "timestamp"
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.tipo",
        "type": "enum"
      },
      {
        "name": "details.quantidade",
        "type": "integer"
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [
      "movimentacaoEstoqueImutavel",
      "quantidadeMovimentadaPositiva",
      "registroMovimentacaoAtualizaSaldo"
    ],
    "imports": []
  }
} as const;

export default definition;
