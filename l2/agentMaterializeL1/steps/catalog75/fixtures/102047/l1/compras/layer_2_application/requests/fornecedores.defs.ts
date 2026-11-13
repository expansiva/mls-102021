/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/fornecedores.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "fornecedores",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/createFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/createProdutoFornecido.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getContatoFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/getProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listContatoFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listFornecedor.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listProduto.defs.ts",
    "_102047_/l1/compras/layer_2_application/usecases/listProdutoFornecido.defs.ts"
  ],
  "data": {
    "pageId": "fornecedores",
    "requests": [
      {
        "route": "compras.fornecedores.buscarFornecedores",
        "kind": "qry",
        "uses": [
          "listFornecedor",
          "getFornecedor"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "fornecedores",
            "entity": "Fornecedor",
            "items": "items",
            "page": "fornecedores.page",
            "pageSize": "fornecedores.pageSize",
            "hasMore": "fornecedores.hasMore",
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
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedores.items.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              },
              {
                "field": "docId",
                "path": "details.identification.docId"
              },
              {
                "field": "status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedores.items.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              },
              {
                "field": "tradeName",
                "path": "details.company.tradeName"
              },
              {
                "field": "companyKind",
                "path": "details.company.companyKind"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedores.items.details.base",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "aliases",
                "path": "details.base.aliases"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "fornecedores.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedores.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedores.details.base",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "fornecedores",
            "pages": "fornecedores"
          },
          {
            "name": "pageSize",
            "target": "fornecedores",
            "pages": "fornecedores"
          },
          {
            "name": "texto",
            "target": "fornecedores",
            "optional": true
          }
        ],
        "rules": [
          "fornecedorCnpjObrigatorio"
        ],
        "doc": {
          "raw": "Finalidade: Localiza fornecedores cadastrados pelo CNPJ ou pela razão social, para conferir se já existem antes de cadastrar.\nEntrada: texto: CNPJ (com ou sem máscara) ou parte da razão social/nome digitado; ausente lista todos. page e pageSize: página pedida e seu tamanho.\nProcessamento: Se o texto tiver forma de CNPJ, normaliza os dígitos e busca por docId (locate.byDocument, chave única por fornecedorCnpjObrigatorio); senão busca por razão social, nome e outros nomes (locate.byName). Restringe aos registros com papel compras.Fornecedor da organização, ordena por nome e pagina.\nSaída: Página de fornecedores com id, versão, nome, CNPJ, razão social, nome fantasia, tipo de empresa, outros nomes e situação cadastral.",
          "purpose": "Localiza fornecedores cadastrados pelo CNPJ ou pela razão social, para conferir se já existem antes de cadastrar.",
          "input": "texto: CNPJ (com ou sem máscara) ou parte da razão social/nome digitado; ausente lista todos. page e pageSize: página pedida e seu tamanho.",
          "processing": "Se o texto tiver forma de CNPJ, normaliza os dígitos e busca por docId (locate.byDocument, chave única por fornecedorCnpjObrigatorio); senão busca por razão social, nome e outros nomes (locate.byName). Restringe aos registros com papel compras.Fornecedor da organização, ordena por nome e pagina.",
          "output": "Página de fornecedores com id, versão, nome, CNPJ, razão social, nome fantasia, tipo de empresa, outros nomes e situação cadastral."
        }
      },
      {
        "route": "compras.fornecedores.obterFichaFornecedor",
        "kind": "qry",
        "uses": [
          "getFornecedor",
          "listContatoFornecedor",
          "getContatoFornecedor",
          "listProdutoFornecido",
          "getProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "fornecedor",
            "entity": "Fornecedor",
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
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              },
              {
                "field": "docId",
                "path": "details.identification.docId"
              },
              {
                "field": "status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              },
              {
                "field": "tradeName",
                "path": "details.company.tradeName"
              },
              {
                "field": "companyKind",
                "path": "details.company.companyKind"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.base",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "aliases",
                "path": "details.base.aliases"
              }
            ]
          },
          {
            "kind": "list",
            "path": "contatos",
            "entity": "ContatoFornecedor",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "contatos.details.identification",
            "entity": "ContatoFornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "contatos.details.contactChannel",
            "entity": "ContatoFornecedor",
            "fields": [
              {
                "field": "contactType",
                "path": "details.contactChannel.contactType"
              },
              {
                "field": "value",
                "path": "details.contactChannel.value"
              },
              {
                "field": "isVerified",
                "path": "details.contactChannel.isVerified"
              }
            ]
          },
          {
            "kind": "list",
            "path": "produtosFornecidos",
            "entity": "ProdutoFornecido",
            "items": "",
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
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtosFornecidos.produto",
            "entity": "Produto",
            "relationship": "produtoFornecidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtosFornecidos.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtosFornecidos.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.base",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "contatos.details.identification",
            "reason": "ContatoFornecedor inside ContatoFornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "contatos.details.contactChannel",
            "reason": "ContatoFornecedor inside ContatoFornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "produtosFornecidos.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "produtosFornecidos.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "fornecedorId",
            "target": "produtosFornecidos",
            "field": "fornecedorId"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a ficha completa de um fornecedor: dados cadastrais, contatos e produtos fornecidos com preço combinado.\nEntrada: fornecedorId: id do fornecedor escolhido.\nProcessamento: Lê o fornecedor por id, lista seus contatos vinculados por HasContact e os produtos fornecidos pela coluna fornecedorId, compondo em cada um o nome e a unidade de medida do produto lidos do cadastro mestre. Ordena os produtos pelo nome.\nSaída: O fornecedor com identificação, empresa e outros nomes; a lista de contatos com nome, tipo, valor e verificação; a lista de produtos fornecidos com preço combinado, moeda, prazo de entrega, observações e o produto.",
          "purpose": "Carrega a ficha completa de um fornecedor: dados cadastrais, contatos e produtos fornecidos com preço combinado.",
          "input": "fornecedorId: id do fornecedor escolhido.",
          "processing": "Lê o fornecedor por id, lista seus contatos vinculados por HasContact e os produtos fornecidos pela coluna fornecedorId, compondo em cada um o nome e a unidade de medida do produto lidos do cadastro mestre. Ordena os produtos pelo nome.",
          "output": "O fornecedor com identificação, empresa e outros nomes; a lista de contatos com nome, tipo, valor e verificação; a lista de produtos fornecidos com preço combinado, moeda, prazo de entrega, observações e o produto."
        }
      },
      {
        "route": "compras.fornecedores.buscarProdutos",
        "kind": "qry",
        "uses": [
          "listProduto",
          "getProduto"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "produtos",
            "entity": "Produto",
            "items": "",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtos.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtos.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "produtos.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "produtos.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "texto",
            "target": "produtos",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Encontra produtos do catálogo pelo nome para associá-los ao fornecedor.\nEntrada: texto: parte do nome ou de outro nome do produto.\nProcessamento: Busca por nome e outros nomes (locate.byName) entre os produtos da organização, ordena por nome e limita a até 20 resultados.\nSaída: Lista curta de produtos com id, nome e unidade de medida.",
          "purpose": "Encontra produtos do catálogo pelo nome para associá-los ao fornecedor.",
          "input": "texto: parte do nome ou de outro nome do produto.",
          "processing": "Busca por nome e outros nomes (locate.byName) entre os produtos da organização, ordena por nome e limita a até 20 resultados.",
          "output": "Lista curta de produtos com id, nome e unidade de medida."
        }
      },
      {
        "route": "compras.fornecedores.salvarFornecedor",
        "kind": "cmd",
        "uses": [
          "createFornecedor"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "fornecedor",
            "entity": "Fornecedor",
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
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.identification",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              },
              {
                "field": "docId",
                "path": "details.identification.docId"
              },
              {
                "field": "status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.company",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "legalName",
                "path": "details.company.legalName"
              },
              {
                "field": "tradeName",
                "path": "details.company.tradeName"
              },
              {
                "field": "companyKind",
                "path": "details.company.companyKind"
              }
            ]
          },
          {
            "kind": "related",
            "path": "fornecedor.details.base",
            "entity": "Fornecedor",
            "fields": [
              {
                "field": "aliases",
                "path": "details.base.aliases"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.identification",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.company",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "fornecedor.details.base",
            "reason": "Fornecedor inside Fornecedor needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [
          "fornecedorCnpjObrigatorio"
        ],
        "doc": {
          "raw": "Finalidade: Cadastra um novo fornecedor ou vincula ao papel compras.Fornecedor o registro mestre já existente com o mesmo CNPJ.\nEntrada: details.identification.docType: sempre CNPJ; details.identification.docId: número do CNPJ; details.identification.name: nome de reconhecimento; details.identification.countryCode: país do documento (BR); details.company.companyKind: pessoa jurídica ou filial; details.company.legalName: razão social; details.company.tradeName: nome fantasia; details.base.aliases: outros nomes.\nProcessamento: Aplica fornecedorCnpjObrigatorio: recusa sem CNPJ, valida a forma do CNPJ e recusa se já houver fornecedor de compras com o mesmo CNPJ; se o registro mestre existe sem o papel, vincula (register.createOrAttach). Exige razão social. Situação, papéis e datas são preenchidos pela plataforma.\nSaída: O fornecedor criado ou vinculado, ativo, com id, versão, identificação, empresa e outros nomes.",
          "purpose": "Cadastra um novo fornecedor ou vincula ao papel compras.Fornecedor o registro mestre já existente com o mesmo CNPJ.",
          "input": "details.identification.docType: sempre CNPJ; details.identification.docId: número do CNPJ; details.identification.name: nome de reconhecimento; details.identification.countryCode: país do documento (BR); details.company.companyKind: pessoa jurídica ou filial; details.company.legalName: razão social; details.company.tradeName: nome fantasia; details.base.aliases: outros nomes.",
          "processing": "Aplica fornecedorCnpjObrigatorio: recusa sem CNPJ, valida a forma do CNPJ e recusa se já houver fornecedor de compras com o mesmo CNPJ; se o registro mestre existe sem o papel, vincula (register.createOrAttach). Exige razão social. Situação, papéis e datas são preenchidos pela plataforma.",
          "output": "O fornecedor criado ou vinculado, ativo, com id, versão, identificação, empresa e outros nomes."
        }
      },
      {
        "route": "compras.fornecedores.adicionarProdutoFornecido",
        "kind": "cmd",
        "uses": [
          "createProdutoFornecido",
          "getProduto"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "produtoFornecido",
            "entity": "ProdutoFornecido",
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
                "field": "fornecedorId",
                "path": "fornecedorId"
              },
              {
                "field": "produtoId",
                "path": "produtoId"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtoFornecido.produto",
            "entity": "Produto",
            "relationship": "produtoFornecidoProduto",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "details",
                "path": "details"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtoFornecido.produto.details.identification",
            "entity": "Produto",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "related",
            "path": "produtoFornecido.produto.details.product",
            "entity": "Produto",
            "fields": [
              {
                "field": "unitOfMeasure",
                "path": "details.product.unitOfMeasure"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "produtoFornecido.produto.details.identification",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "produtoFornecido.produto.details.product",
            "reason": "Produto inside Produto needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [
          "produtoFornecidoUnicoPorFornecedor",
          "precoCombinadoPositivo"
        ],
        "doc": {
          "raw": "Finalidade: Associa um produto do catálogo ao fornecedor com o preço combinado.\nEntrada: fornecedorId: fornecedor recém-cadastrado ou aberto; produtoId: produto escolhido; details.precoCombinado: preço unitário acordado; details.moeda: código ISO 4217; details.prazoEntregaDias: prazo habitual em dias; details.observacoes: condições adicionais.\nProcessamento: Aplica precoCombinadoPositivo: recusa preço menor ou igual a zero ou sem moeda. Aplica produtoFornecidoUnicoPorFornecedor: recusa se o produto já está associado a este fornecedor. Grava a associação e lê do cadastro mestre o nome e a unidade do produto.\nSaída: O produto fornecido criado, com id, versão, fornecedor, produto (nome e unidade), preço combinado, moeda, prazo e observações.",
          "purpose": "Associa um produto do catálogo ao fornecedor com o preço combinado.",
          "input": "fornecedorId: fornecedor recém-cadastrado ou aberto; produtoId: produto escolhido; details.precoCombinado: preço unitário acordado; details.moeda: código ISO 4217; details.prazoEntregaDias: prazo habitual em dias; details.observacoes: condições adicionais.",
          "processing": "Aplica precoCombinadoPositivo: recusa preço menor ou igual a zero ou sem moeda. Aplica produtoFornecidoUnicoPorFornecedor: recusa se o produto já está associado a este fornecedor. Grava a associação e lê do cadastro mestre o nome e a unidade do produto.",
          "output": "O produto fornecido criado, com id, versão, fornecedor, produto (nome e unidade), preço combinado, moeda, prazo e observações."
        }
      }
    ]
  }
} as const;

export default definition;
