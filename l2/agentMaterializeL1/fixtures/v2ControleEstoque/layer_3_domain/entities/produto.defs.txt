/// <mls fileReference="_102047_/l1/controleEstoque/layer_3_domain/entities/produto.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "Produto",
  "moduleName": "controleEstoque",
  "status": "generated",
  "dependencies": [],
  "data": {
    "entityId": "Produto",
    "storageTarget": "mdm",
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
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.identification",
        "type": "object"
      },
      {
        "name": "details.identification.subtype",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.identification.name",
        "type": "string"
      },
      {
        "name": "details.identification.status",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.base",
        "type": "object"
      },
      {
        "name": "details.product",
        "type": "object"
      },
      {
        "name": "details.product.unitOfMeasure",
        "type": "string"
      },
      {
        "name": "details.general",
        "type": "object"
      },
      {
        "name": "details.controleEstoque",
        "type": "object"
      },
      {
        "name": "details.controleEstoque.quantidadeMinima",
        "type": "number"
      },
      {
        "name": "details.controleEstoque.saldoAtual",
        "type": "number",
        "derived": true
      },
      {
        "name": "details.controleEstoque.saldoAbaixoDoMinimo",
        "type": "boolean",
        "derived": true
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [
      "quantidadeMinimaValida",
      "saldoAtualProduto",
      "avisoSaldoMinimoProduto"
    ],
    "imports": []
  }
} as const;

export default definition;
