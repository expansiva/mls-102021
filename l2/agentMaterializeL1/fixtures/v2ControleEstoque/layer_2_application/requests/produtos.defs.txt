/// <mls fileReference="_102047_/l1/controleEstoque/layer_2_application/requests/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "produtos",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/controleEstoque/layer_2_application/usecases/createProduto.defs.ts",
    "_102047_/l1/controleEstoque/layer_2_application/usecases/listProduto.defs.ts"
  ],
  "data": {
    "pageId": "produtos",
    "requests": [
      {
        "route": "controleEstoque.produtos.load",
        "kind": "qry",
        "uses": [
          "listProduto"
        ],
        "transaction": "none",
        "outputs": [
          {
            "key": "produtos",
            "entity": "Produto",
            "fields": [
              "id",
              "details.identification.name",
              "details.identification.status",
              "details.product.unitOfMeasure",
              "details.controleEstoque.saldoAtual",
              "details.controleEstoque.quantidadeMinima",
              "details.controleEstoque.saldoAbaixoDoMinimo"
            ]
          }
        ],
        "params": [
          {
            "name": "search",
            "target": "produtos",
            "field": "details.identification.name"
          },
          {
            "name": "page",
            "target": "produtos",
            "pages": "listaProdutos"
          },
          {
            "name": "pageSize",
            "target": "produtos",
            "pages": "listaProdutos"
          }
        ]
      },
      {
        "route": "controleEstoque.produtos.cadastrarProduto",
        "kind": "cmd",
        "uses": [
          "createProduto"
        ],
        "transaction": "single",
        "outputs": [
          {
            "key": "produto",
            "entity": "Produto",
            "fields": [
              "id",
              "details.identification.name",
              "details.product.unitOfMeasure",
              "details.controleEstoque.quantidadeMinima"
            ]
          }
        ],
        "params": []
      }
    ]
  }
} as const;

export default definition;
