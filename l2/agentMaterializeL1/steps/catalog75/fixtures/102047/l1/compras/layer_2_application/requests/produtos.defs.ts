/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/produtos.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "produtos",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/createProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/updateProduto.defs.ts"
  ],
  "data": {
    "pageId": "produtos",
    "requests": [
      {
        "route": "compras.produtos.listarProdutos",
        "kind": "qry",
        "uses": [
          "listProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "produtos",
            "entity": "Produto",
            "items": "items",
            "page": "produtos.page",
            "pageSize": "produtos.pageSize",
            "hasMore": "produtos.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.product.sku",
                "path": "details.product.sku"
              },
              {
                "field": "details.product.category",
                "path": "details.product.category"
              },
              {
                "field": "details.product.brand",
                "path": "details.product.brand"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              },
              {
                "field": "details.product.isInventoried",
                "path": "details.product.isInventoried"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "produtos",
            "pages": "produtos"
          },
          {
            "name": "pageSize",
            "target": "produtos",
            "pages": "produtos"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a primeira página do catálogo de produtos usados nas compras ao abrir a página.\nEntrada: page: número da página (começa em 1); pageSize: quantidade de produtos por página.\nProcessamento: Seleciona os produtos da organização marcados com o papel compras.Produto (locate.byTag), em todas as situações do cadastro, ordenados pelo nome. A situação é lida do cadastro mestre, nunca calculada ou gravada aqui.\nSaída: Página de produtos com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }.",
          "purpose": "Carrega a primeira página do catálogo de produtos usados nas compras ao abrir a página.",
          "input": "page: número da página (começa em 1); pageSize: quantidade de produtos por página.",
          "processing": "Seleciona os produtos da organização marcados com o papel compras.Produto (locate.byTag), em todas as situações do cadastro, ordenados pelo nome. A situação é lida do cadastro mestre, nunca calculada ou gravada aqui.",
          "output": "Página de produtos com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }."
        }
      },
      {
        "route": "compras.produtos.pesquisarProdutos",
        "kind": "qry",
        "uses": [
          "listProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "produtos",
            "entity": "Produto",
            "items": "items",
            "page": "produtos.page",
            "pageSize": "produtos.pageSize",
            "hasMore": "produtos.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.product.sku",
                "path": "details.product.sku"
              },
              {
                "field": "details.product.category",
                "path": "details.product.category"
              },
              {
                "field": "details.product.brand",
                "path": "details.product.brand"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              },
              {
                "field": "details.product.isInventoried",
                "path": "details.product.isInventoried"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "produtos",
            "pages": "produtos"
          },
          {
            "name": "pageSize",
            "target": "produtos",
            "pages": "produtos"
          },
          {
            "name": "search",
            "target": "produtos",
            "field": "details.identification.name",
            "optional": true
          },
          {
            "name": "details",
            "target": "produtos",
            "field": "details"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Pesquisa produtos do catálogo de compras pelo nome, outros nomes ou código interno, com filtro opcional por categoria e situação.\nEntrada: search: texto digitado, comparado com nome, outros nomes e código interno (SKU); details.product.category: categoria exata do produto; details.identification.status: situação no cadastro; page e pageSize: paginação.\nProcessamento: Restringe aos produtos da organização com o papel compras.Produto; aplica a busca textual (locate.byName, incluindo aliases e sku) e os filtros informados; ordena pelo nome e pagina.\nSaída: Página de produtos encontrados com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }.",
          "purpose": "Pesquisa produtos do catálogo de compras pelo nome, outros nomes ou código interno, com filtro opcional por categoria e situação.",
          "input": "search: texto digitado, comparado com nome, outros nomes e código interno (SKU); details.product.category: categoria exata do produto; details.identification.status: situação no cadastro; page e pageSize: paginação.",
          "processing": "Restringe aos produtos da organização com o papel compras.Produto; aplica a busca textual (locate.byName, incluindo aliases e sku) e os filtros informados; ordena pelo nome e pagina.",
          "output": "Página de produtos encontrados com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }."
        }
      },
      {
        "route": "compras.produtos.obterProduto",
        "kind": "qry",
        "uses": [
          "getProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "produto",
            "entity": "Produto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              },
              {
                "field": "details.base.aliases",
                "path": "details.base.aliases"
              },
              {
                "field": "details.base.notes",
                "path": "details.base.notes"
              },
              {
                "field": "details.product.sku",
                "path": "details.product.sku"
              },
              {
                "field": "details.product.category",
                "path": "details.product.category"
              },
              {
                "field": "details.product.brand",
                "path": "details.product.brand"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              },
              {
                "field": "details.product.isInventoried",
                "path": "details.product.isInventoried"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "produto",
            "field": "id"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Lê o cadastro completo de um produto escolhido no catálogo para conferência ou alteração.\nEntrada: id: identificador (mdmId) do produto selecionado.\nProcessamento: Lê o produto pelo id (read.byId) dentro da organização; falha com não encontrado se não existir.\nSaída: O produto com id, versão atual, situação, nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque.",
          "purpose": "Lê o cadastro completo de um produto escolhido no catálogo para conferência ou alteração.",
          "input": "id: identificador (mdmId) do produto selecionado.",
          "processing": "Lê o produto pelo id (read.byId) dentro da organização; falha com não encontrado se não existir.",
          "output": "O produto com id, versão atual, situação, nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque."
        }
      },
      {
        "route": "compras.produtos.cadastrarProduto",
        "kind": "cmd",
        "uses": [
          "createProduto"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "produto",
            "entity": "Produto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              },
              {
                "field": "details.base.aliases",
                "path": "details.base.aliases"
              },
              {
                "field": "details.base.notes",
                "path": "details.base.notes"
              },
              {
                "field": "details.product.sku",
                "path": "details.product.sku"
              },
              {
                "field": "details.product.category",
                "path": "details.product.category"
              },
              {
                "field": "details.product.brand",
                "path": "details.product.brand"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              },
              {
                "field": "details.product.isInventoried",
                "path": "details.product.isInventoried"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Cadastra no catálogo um produto que falta para as compras, ou anexa o papel compras.Produto a um produto já existente no cadastro mestre.\nEntrada: details.identification.name: nome do produto; details.identification.countryCode: país ISO 3166-1 alfa-2; details.base.aliases: outros nomes; details.base.notes: observações; details.product.sku: código interno; details.product.category: categoria; details.product.brand: marca; details.product.unitOfMeasure: unidade de medida; details.product.isInventoried: se o recebimento dá entrada no estoque.\nProcessamento: Valida a forma do documento (país alfa-2, nome obrigatório) e cria o produto pelo register.createOrAttach, com subtipo Product e o papel compras.Produto; id, versão, subtipo, situação e papéis são preenchidos pelo motor, nunca pela página.\nSaída: O produto criado, em situação Active, com id, versão inicial e todos os dados cadastrados.",
          "purpose": "Cadastra no catálogo um produto que falta para as compras, ou anexa o papel compras.Produto a um produto já existente no cadastro mestre.",
          "input": "details.identification.name: nome do produto; details.identification.countryCode: país ISO 3166-1 alfa-2; details.base.aliases: outros nomes; details.base.notes: observações; details.product.sku: código interno; details.product.category: categoria; details.product.brand: marca; details.product.unitOfMeasure: unidade de medida; details.product.isInventoried: se o recebimento dá entrada no estoque.",
          "processing": "Valida a forma do documento (país alfa-2, nome obrigatório) e cria o produto pelo register.createOrAttach, com subtipo Product e o papel compras.Produto; id, versão, subtipo, situação e papéis são preenchidos pelo motor, nunca pela página.",
          "output": "O produto criado, em situação Active, com id, versão inicial e todos os dados cadastrados."
        }
      },
      {
        "route": "compras.produtos.salvarAlteracaoProduto",
        "kind": "cmd",
        "uses": [
          "updateProduto"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "produto",
            "entity": "Produto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              },
              {
                "field": "details.base.aliases",
                "path": "details.base.aliases"
              },
              {
                "field": "details.base.notes",
                "path": "details.base.notes"
              },
              {
                "field": "details.product.sku",
                "path": "details.product.sku"
              },
              {
                "field": "details.product.category",
                "path": "details.product.category"
              },
              {
                "field": "details.product.brand",
                "path": "details.product.brand"
              },
              {
                "field": "details.product.unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              },
              {
                "field": "details.product.isInventoried",
                "path": "details.product.isInventoried"
              }
            ]
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Grava as correções do cadastro de um produto existente do catálogo.\nEntrada: id: id do produto alterado; version: versão lida, para concorrência otimista; demais campos: novos valores de nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque.\nProcessamento: Recusa com conflito se a versão informada diferir da atual; valida a forma do documento e atualiza os campos da plataforma (edit.platformFields). A situação, o subtipo e os papéis não são alterados aqui; a versão é incrementada pelo motor.\nSaída: O produto alterado, com a nova versão, sua situação atual e todos os dados gravados.",
          "purpose": "Grava as correções do cadastro de um produto existente do catálogo.",
          "input": "id: id do produto alterado; version: versão lida, para concorrência otimista; demais campos: novos valores de nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque.",
          "processing": "Recusa com conflito se a versão informada diferir da atual; valida a forma do documento e atualiza os campos da plataforma (edit.platformFields). A situação, o subtipo e os papéis não são alterados aqui; a versão é incrementada pelo motor.",
          "output": "O produto alterado, com a nova versão, sua situação atual e todos os dados gravados."
        }
      }
    ]
  }
} as const;

export default definition;
