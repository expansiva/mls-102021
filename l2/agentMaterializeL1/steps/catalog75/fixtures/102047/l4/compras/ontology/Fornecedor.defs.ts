/// <mls fileReference="_102047_/l4/compras/ontology/Fornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityFornecedor = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Fornecedor",
  "title": "Fornecedor",
  "description": "Empresa com CNPJ e razão social de quem a organização compra; registro mestre compartilhado, criado ou vinculado pelo comprador.",
  "displayField": "details.identification.name",
  "relationships": {
    "contatos": {
      "relationshipId": "fornecedorContatos",
      "to": "ContatoFornecedor",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Contatos do fornecedor"
    },
    "produtosFornecidos": {
      "relationshipId": "produtoFornecidoFornecedor",
      "to": "ProdutoFornecido",
      "via": "ProdutoFornecido.fornecedorId",
      "cardinality": "1:N",
      "title": "Produtos fornecidos com preço combinado",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "produtos": {
      "relationshipId": "fornecedorProdutos",
      "to": "Produto",
      "via": "ProdutoFornecido",
      "cardinality": "N:N",
      "title": "Produtos que o fornecedor fornece",
      "mode": "throughTable",
      "path": "Fornecedor <- ProdutoFornecido.fornecedorId -> ProdutoFornecido.produtoId -> Produto",
      "derived": true
    },
    "opcoesCotacao": {
      "relationshipId": "opcaoFornecedor",
      "to": "OpcaoCotacao",
      "via": "OpcaoCotacao.fornecedorId",
      "cardinality": "1:N",
      "title": "Opções de cotação com este fornecedor",
      "mode": "fk",
      "direction": "to"
    },
    "pedidos": {
      "relationshipId": "pedidoFornecedor",
      "to": "PedidoCompra",
      "via": "PedidoCompra.fornecedorId",
      "cardinality": "1:N",
      "title": "Pedidos de compra ao fornecedor",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o fornecedor pelo id para exibir nos produtos fornecidos, opções de cotação e pedidos; usado por todas as telas do módulo.",
    "locate.byName": "Procura o fornecedor pela razão social ou nome; usado pelo comprador ao cadastrar e pelo comprador e gerente nas pesquisas.",
    "locate.byDocument": "Encontra o fornecedor pelo CNPJ para evitar duplicidade antes de cadastrar; usado pelo comprador.",
    "register.createOrAttach": "Cria o fornecedor com CNPJ e razão social ou vincula o registro existente ao papel compras.Fornecedor; usado pelo comprador.",
    "edit.platformFields": "Corrige razão social, nome fantasia e documento do fornecedor; usado pelo comprador.",
    "inactivate": "Retira de uso um fornecedor com que a organização deixou de comprar, podendo reativá-lo; usado pelo comprador.",
    "link.contact": "Adiciona telefone, WhatsApp ou e-mail do fornecedor como canal de contato vinculado por HasContact; usado pelo comprador.",
    "listLinks": "Mostra os contatos e vínculos do fornecedor na ficha; usado pelo comprador e pelo gerente.",
    "comment": "Registra observações sobre o fornecedor; usado pelo comprador e pelo gerente.",
    "attach.document": "Anexa documentos do fornecedor, como contrato ou tabela de preços; usado pelo comprador.",
    "audit": "Mostra quem alterou o cadastro do fornecedor e quando; usado pelo gerente de compras."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-company-legal-name-required",
    "rule-delete-blocked-by-relationships",
    "fornecedorCnpjObrigatorio"
  ],
  "kind": "role",
  "subtype": "Company",
  "roleTag": "compras.Fornecedor",
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
        "description": "The JSONB document, as a map of groups (see groups).",
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
                    "value": "Company",
                    "title": "Empresa"
                  }
                ],
                "description": "Sempre empresa para um fornecedor.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome pelo qual o comprador reconhece e procura o fornecedor.",
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
                    "title": "Unificado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação cadastral",
                "description": "Situação do registro mestre (ativo ou inativo)."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CNPJ",
                    "title": "CNPJ"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Fornecedor é identificado pelo CNPJ.",
                "required": true
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do CNPJ do fornecedor, usado para evitar duplicidade.",
                "title": "CNPJ",
                "required": true,
                "pattern": "^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do documento do fornecedor (BR para CNPJ).",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis do registro nos módulos, inclusive compras.Fornecedor.",
                "title": "Papéis"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Momento em que o registro foi criado."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Momento da última alteração do registro."
              }
            },
            "description": "Identificação do fornecedor no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Nome fantasia e outros nomes pelos quais o fornecedor é conhecido.",
                "title": "Outros nomes"
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato do fornecedor, vinculados por HasContact.",
                "title": "Contatos"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas dos vínculos, mantidas pela plataforma.",
                "title": "Vínculos"
              }
            },
            "description": "Dados comuns do registro mestre."
          },
          "company": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "companyKind": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "LegalEntity",
                    "title": "Pessoa jurídica"
                  },
                  {
                    "value": "Branch",
                    "title": "Filial"
                  }
                ],
                "description": "Fornecedor é uma pessoa jurídica ou filial.",
                "title": "Tipo de empresa"
              },
              "legalName": {
                "type": "string",
                "required": true,
                "description": "Razão social registrada do fornecedor.",
                "title": "Razão social"
              },
              "tradeName": {
                "type": "string",
                "description": "Nome comercial do fornecedor.",
                "title": "Nome fantasia"
              }
            },
            "description": "Dados da empresa fornecedora."
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
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ComprasEntityFornecedorType = typeof comprasEntityFornecedor;

export default comprasEntityFornecedor;
