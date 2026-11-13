/// <mls fileReference="_102047_/l4/compras/ontology/ContatoFornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const comprasEntityContatoFornecedor = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "ContatoFornecedor",
  "title": "Contato do fornecedor",
  "description": "Telefone ou e-mail do fornecedor, registrado como canal de contato ligado ao fornecedor.",
  "displayField": "details.identification.name",
  "relationships": {
    "fornecedor": {
      "relationshipId": "fornecedorContatos",
      "to": "Fornecedor",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Fornecedor do contato",
      "description": "O fornecedor ao qual este canal de contato pertence, pelo vínculo HasContact.",
      "direction": "to",
      "role": "HasContact"
    }
  },
  "capabilities": {
    "read.byId": "Lê o contato pelo id para mostrá-lo na ficha do fornecedor e nos pedidos; usado pelo comprador, gerente de compras e almoxarife.",
    "locate.byContact": "Encontra o contato e seu fornecedor pelo telefone ou e-mail, para evitar duplicidade ao cadastrar; usado pelo comprador.",
    "locate.byName": "Procura contatos pelo nome digitado; usado pelo comprador ao manter fornecedores.",
    "link.contact": "Cria o canal de contato (telefone, WhatsApp ou e-mail) e o liga ao fornecedor por HasContact; usado pelo comprador ao cadastrar fornecedores.",
    "edit.platformFields": "Corrige o nome, o tipo ou o valor do contato; usado pelo comprador.",
    "inactivate": "Retira de uso um contato que o fornecedor não usa mais, sem apagá-lo; usado pelo comprador.",
    "unlink": "Desfaz o vínculo do contato com o fornecedor mantendo o histórico; usado pelo comprador.",
    "listLinks": "Mostra a qual fornecedor o contato pertence, na ficha do fornecedor; usado pelo comprador e gerente de compras.",
    "comment": "Deixa uma nota sobre o contato, como melhor horário para ligar; usado pelo comprador.",
    "audit": "Mostra quem alterou o contato e quando, pelo módulo de auditoria da plataforma; usado por um administrador."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "compras.ContatoFornecedor",
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
                    "value": "ContactChannel",
                    "title": "Canal de contato"
                  }
                ],
                "description": "Sempre ContactChannel: o registro é um canal de contato.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Como o comprador reconhece o contato, por exemplo 'Comercial - telefone' ou o nome da pessoa de contato no fornecedor.",
                "title": "Nome do contato"
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
                "description": "Situação do contato no cadastro mestre (ativo ou inativo)."
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do contato (ISO 3166-1 alfa-2), normalmente BR.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis de módulo do registro, como compras.ContatoFornecedor; escritos pela plataforma.",
                "title": "Papéis"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Quando o contato foi registrado."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Última alteração do contato."
              }
            },
            "description": "Identificação do canal de contato do fornecedor."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas dos vínculos, recalculadas pela plataforma; inclui o fornecedor ao qual o contato pertence.",
                "title": "Vínculos"
              },
              "notes": {
                "type": "string",
                "maxLength": 1000,
                "title": "Observações",
                "description": "Observação livre sobre o contato, como horário de atendimento."
              }
            },
            "description": "Dados comuns a todo registro mestre."
          },
          "contactChannel": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contactType": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "Phone",
                    "title": "Telefone"
                  },
                  {
                    "value": "Email",
                    "title": "E-mail"
                  },
                  {
                    "value": "WhatsApp",
                    "title": "WhatsApp"
                  }
                ],
                "title": "Tipo de contato",
                "description": "Se o contato do fornecedor é telefone, WhatsApp ou e-mail."
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "O número de telefone ou o endereço de e-mail do fornecedor, sem máscara.",
                "title": "Contato"
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Verificado",
                "description": "Indica se o contato foi confirmado."
              },
              "verifiedAt": {
                "type": "timestamp",
                "title": "Verificado em",
                "description": "Quando o contato foi confirmado."
              }
            },
            "description": "O telefone ou e-mail do fornecedor como registro próprio."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; lidos, não declarados aqui."
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

export type ComprasEntityContatoFornecedorType = typeof comprasEntityContatoFornecedor;

export default comprasEntityContatoFornecedor;
