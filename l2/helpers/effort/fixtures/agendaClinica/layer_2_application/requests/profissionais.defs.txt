/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/profissionais.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "profissionais",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts"
  ],
  "data": {
    "pageId": "profissionais",
    "requests": [
      {
        "route": "agendaClinica.profissionais.loadAvailableProfessionals",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "professionals.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.loadAvailableProfessionals projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "professionals",
            "entity": "Profissional",
            "items": "items",
            "page": "professionals.page",
            "pageSize": "professionals.pageSize",
            "hasMore": "professionals.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "pageSize",
            "target": "professionals",
            "pages": "professionals"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a primeira página do diretório de profissionais disponíveis quando a página é aberta.\nEntrada: page e pageSize definem a página inicial e a quantidade de linhas adequadas à tela; são parâmetros de navegação do estado da página.\nProcessamento: Lista somente profissionais da organização cuja situação do cadastro mestre é Active, pois a página prioriza quem está disponível para o agendamento. Ordena de forma estável pelo nome e projeta apenas identificador, nome, situação e tipo de atuação.\nSaída: Retorna professionals no contrato paginado { items, page, pageSize, hasMore }, já filtrado para profissionais ativos, para preencher o diretório sem carregar documentos ou o cadastro completo.",
          "purpose": "Carrega a primeira página do diretório de profissionais disponíveis quando a página é aberta.",
          "input": "page e pageSize definem a página inicial e a quantidade de linhas adequadas à tela; são parâmetros de navegação do estado da página.",
          "processing": "Lista somente profissionais da organização cuja situação do cadastro mestre é Active, pois a página prioriza quem está disponível para o agendamento. Ordena de forma estável pelo nome e projeta apenas identificador, nome, situação e tipo de atuação.",
          "output": "Retorna professionals no contrato paginado { items, page, pageSize, hasMore }, já filtrado para profissionais ativos, para preencher o diretório sem carregar documentos ou o cadastro completo."
        }
      },
      {
        "route": "agendaClinica.profissionais.loadMoreAvailableProfessionals",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "professionals.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.loadMoreAvailableProfessionals projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "professionals",
            "entity": "Profissional",
            "items": "items",
            "page": "professionals.page",
            "pageSize": "professionals.pageSize",
            "hasMore": "professionals.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "pageSize",
            "target": "professionals",
            "pages": "professionals"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Obtém a próxima página do diretório de profissionais disponíveis quando a recepcionista solicita mais resultados.\nEntrada: page é a página seguinte solicitada e pageSize é a quantidade de linhas por página; ambos vêm do estado de paginação da lista.\nProcessamento: Aplica o mesmo recorte organizacional, situação Active e ordenação estável do carregamento inicial, buscando somente a página solicitada.\nSaída: Retorna professionals no contrato paginado para anexar seus items ao diretório já mostrado e informar se ainda há mais resultados.",
          "purpose": "Obtém a próxima página do diretório de profissionais disponíveis quando a recepcionista solicita mais resultados.",
          "input": "page é a página seguinte solicitada e pageSize é a quantidade de linhas por página; ambos vêm do estado de paginação da lista.",
          "processing": "Aplica o mesmo recorte organizacional, situação Active e ordenação estável do carregamento inicial, buscando somente a página solicitada.",
          "output": "Retorna professionals no contrato paginado para anexar seus items ao diretório já mostrado e informar se ainda há mais resultados."
        }
      },
      {
        "route": "agendaClinica.profissionais.searchAvailableProfessionals",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "professionals.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.searchAvailableProfessionals projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "professionals",
            "entity": "Profissional",
            "items": "items",
            "page": "professionals.page",
            "pageSize": "professionals.pageSize",
            "hasMore": "professionals.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "pageSize",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "search",
            "target": "professionals",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Localiza, sob demanda, profissionais disponíveis pelo nome para a recepcionista escolher o cadastro certo.\nEntrada: search é o texto de nome informado pela recepcionista; page e pageSize controlam a primeira página da busca.\nProcessamento: Usa a capacidade de localização por nome no escopo da organização, mantém somente registros Active e aplica correspondência normalizada por nome. Ordena os resultados de forma estável e não expõe documento nesta consulta resumida.\nSaída: Retorna professionals no contrato paginado, substituindo a lista corrente pelos resultados da busca já adequados à seleção.",
          "purpose": "Localiza, sob demanda, profissionais disponíveis pelo nome para a recepcionista escolher o cadastro certo.",
          "input": "search é o texto de nome informado pela recepcionista; page e pageSize controlam a primeira página da busca.",
          "processing": "Usa a capacidade de localização por nome no escopo da organização, mantém somente registros Active e aplica correspondência normalizada por nome. Ordena os resultados de forma estável e não expõe documento nesta consulta resumida.",
          "output": "Retorna professionals no contrato paginado, substituindo a lista corrente pelos resultados da busca já adequados à seleção."
        }
      },
      {
        "route": "agendaClinica.profissionais.loadMoreProfessionalSearch",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "professionals.items.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.loadMoreProfessionalSearch projects items.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "list",
            "path": "professionals",
            "entity": "Profissional",
            "items": "items",
            "page": "professionals.page",
            "pageSize": "professionals.pageSize",
            "hasMore": "professionals.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professionals.items.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professionals.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "pageSize",
            "target": "professionals",
            "pages": "professionals"
          },
          {
            "name": "search",
            "target": "professionals",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Busca a próxima página da localização por nome sem reiniciar os resultados já exibidos.\nEntrada: search preserva o termo de busca ativo; page e pageSize identificam a próxima página a carregar.\nProcessamento: Repete exatamente o recorte organizacional, a situação Active, a normalização de nome e a ordenação estável da busca inicial, limitando a leitura à página solicitada.\nSaída: Retorna professionals no contrato paginado para acrescentar os novos items aos resultados de busca existentes.",
          "purpose": "Busca a próxima página da localização por nome sem reiniciar os resultados já exibidos.",
          "input": "search preserva o termo de busca ativo; page e pageSize identificam a próxima página a carregar.",
          "processing": "Repete exatamente o recorte organizacional, a situação Active, a normalização de nome e a ordenação estável da busca inicial, limitando a leitura à página solicitada.",
          "output": "Retorna professionals no contrato paginado para acrescentar os novos items aos resultados de busca existentes."
        }
      },
      {
        "route": "agendaClinica.profissionais.getProfessional",
        "kind": "qry",
        "uses": [
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "professional.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.getProfessional projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "professional",
            "entity": "Profissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professional.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professional.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "professional",
            "field": "id"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega o cadastro completo do profissional que a recepcionista selecionou para conferência e edição.\nEntrada: id é o identificador do profissional selecionado no diretório.\nProcessamento: Lê o registro pelo identificador dentro do escopo organizacional autorizado e compõe nome, documento, país, situação, tipo de atuação e version para controle otimista. Não carrega dados de privacidade ou dados gerais que a página não usa.\nSaída: Retorna professional completo para preencher simultaneamente o detalhe e o formulário de manutenção.",
          "purpose": "Carrega o cadastro completo do profissional que a recepcionista selecionou para conferência e edição.",
          "input": "id é o identificador do profissional selecionado no diretório.",
          "processing": "Lê o registro pelo identificador dentro do escopo organizacional autorizado e compõe nome, documento, país, situação, tipo de atuação e version para controle otimista. Não carrega dados de privacidade ou dados gerais que a página não usa.",
          "output": "Retorna professional completo para preencher simultaneamente o detalhe e o formulário de manutenção."
        }
      },
      {
        "route": "agendaClinica.profissionais.createProfessional",
        "kind": "cmd",
        "uses": [
          "createProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "unresolved",
            "path": "professional.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.createProfessional projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "professional",
            "entity": "Profissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professional.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professional.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Cria ou reutiliza e vincula o cadastro mestre de uma pessoa como profissional da agenda clínica.\nEntrada: name, docType, docId e countryCode preenchem a identificação mestre; professionalType grava a atuação medical ou therapist no namespace agendaClinica.\nProcessamento: Executa register.createOrAttach no escopo autorizado. Valida a combinação de documento e país exigida pela operação e mantém a identificação no cadastro mestre, gravando no namespace agendaClinica somente a atuação permitida.\nSaída: Retorna professional com id e version gerados ou resolvidos, situação, identificação e atuação para redesenhar detalhe e formulário e inserir ou atualizar a linha correspondente no diretório.",
          "purpose": "Cria ou reutiliza e vincula o cadastro mestre de uma pessoa como profissional da agenda clínica.",
          "input": "name, docType, docId e countryCode preenchem a identificação mestre; professionalType grava a atuação medical ou therapist no namespace agendaClinica.",
          "processing": "Executa register.createOrAttach no escopo autorizado. Valida a combinação de documento e país exigida pela operação e mantém a identificação no cadastro mestre, gravando no namespace agendaClinica somente a atuação permitida.",
          "output": "Retorna professional com id e version gerados ou resolvidos, situação, identificação e atuação para redesenhar detalhe e formulário e inserir ou atualizar a linha correspondente no diretório."
        }
      },
      {
        "route": "agendaClinica.profissionais.updateProfessional",
        "kind": "cmd",
        "uses": [
          "updateProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "unresolved",
            "path": "professional.details",
            "reason": "DISCLOSURE: Route agendaClinica.profissionais.updateProfessional projects details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "entity",
            "path": "professional",
            "entity": "Profissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "version",
                "path": "version"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              },
              {
                "field": "details.identification.countryCode",
                "path": "details.identification.countryCode"
              }
            ]
          },
          {
            "kind": "related",
            "path": "professional.details.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "professional.details.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "professional.details.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Atualiza os dados de identificação permitidos e o tipo de atuação do profissional selecionado.\nEntrada: id identifica o cadastro e version faz a concorrência otimista; os demais campos são as alterações de nome, documento, país e tipo de atuação preenchidas no formulário.\nProcessamento: Recusa versão desatualizada e aplica edit.platformFields à identificação e edit.moduleNamespace exclusivamente a agendaClinica.professionalType. Não altera situação, consentimento ou dados gerais.\nSaída: Retorna professional com a nova version e todos os dados exibidos, permitindo redesenhar detalhe e formulário e atualizar a linha da lista sem nova leitura.",
          "purpose": "Atualiza os dados de identificação permitidos e o tipo de atuação do profissional selecionado.",
          "input": "id identifica o cadastro e version faz a concorrência otimista; os demais campos são as alterações de nome, documento, país e tipo de atuação preenchidas no formulário.",
          "processing": "Recusa versão desatualizada e aplica edit.platformFields à identificação e edit.moduleNamespace exclusivamente a agendaClinica.professionalType. Não altera situação, consentimento ou dados gerais.",
          "output": "Retorna professional com a nova version e todos os dados exibidos, permitindo redesenhar detalhe e formulário e atualizar a linha da lista sem nova leitura."
        }
      }
    ]
  }
} as const;

export default definition;
