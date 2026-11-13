/// <mls fileReference="_102047_/l1/compras/layer_2_application/requests/meu_cadastro.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "meu_cadastro",
  "moduleName": "compras",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/compras/layer_2_application/usecases/getComprador.defs.ts"
  ],
  "data": {
    "pageId": "meu_cadastro",
    "requests": [
      {
        "route": "compras.meu_cadastro.qryMeuCadastro",
        "kind": "qry",
        "uses": [
          "getComprador"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "comprador.details",
            "reason": "DISCLOSURE: Route compras.meu_cadastro.qryMeuCadastro projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "comprador",
            "entity": "Comprador",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "comprador.details.identification",
            "entity": "Comprador",
            "fields": [
              {
                "field": "name",
                "path": "details.identification.name"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "comprador.details.identification.status",
            "reason": "COMPUTED_NOT_DISCLOSED: compras.meu_cadastro.qryMeuCadastro details.identification.status"
          },
          {
            "kind": "unresolved",
            "path": "comprador.details.identification",
            "reason": "Comprador inside Comprador needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "comprador.details.identification.status",
            "reason": "Interface MeuCadastroCompradorIdentification: readonly status is not a field of Comprador; it may stand for one of its paths."
          },
          {
            "kind": "unresolved",
            "path": "comprador.details.compras",
            "reason": "Interface MeuCadastroCompradorCompras has no field that is not readonly, so no entity owns it."
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega o cadastro do comprador da sessão para conferência dos dados de identificação e de acesso, somente leitura.\nEntrada: Nenhuma entrada: o comprador é identificado pelo servidor a partir do usuário logado.\nProcessamento: Localiza o registro Comprador do usuário logado (escopo próprio) e lê nome e situação da identificação. O e-mail de acesso (loginEmail) é derivado: lido do login da plataforma no momento da consulta, nunca gravado pelo endpoint. A situação também é derivada do cadastro mestre.\nSaída: O registro do comprador da sessão com id, nome, situação (Active, Inactive, Merged ou Blocked) e e-mail de acesso.",
          "purpose": "Carrega o cadastro do comprador da sessão para conferência dos dados de identificação e de acesso, somente leitura.",
          "input": "Nenhuma entrada: o comprador é identificado pelo servidor a partir do usuário logado.",
          "processing": "Localiza o registro Comprador do usuário logado (escopo próprio) e lê nome e situação da identificação. O e-mail de acesso (loginEmail) é derivado: lido do login da plataforma no momento da consulta, nunca gravado pelo endpoint. A situação também é derivada do cadastro mestre.",
          "output": "O registro do comprador da sessão com id, nome, situação (Active, Inactive, Merged ou Blocked) e e-mail de acesso."
        }
      }
    ]
  }
} as const;

export default definition;
