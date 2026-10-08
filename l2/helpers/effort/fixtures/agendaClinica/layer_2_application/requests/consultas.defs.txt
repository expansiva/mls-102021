/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/consultas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "consultas",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/usecases/confirmarConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/createConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarFalta.defs.ts"
  ],
  "data": {
    "pageId": "consultas",
    "requests": [
      {
        "route": "agendaClinica.consultas.carregarAgenda",
        "kind": "qry",
        "uses": [
          "listConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "cabecalho.dataAgenda",
            "reason": "Interface AgendaCabecalho: field dataAgenda is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "quantidadePendentes",
            "reason": "Output quantidadePendentes is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "status",
            "target": "agenda",
            "field": "status"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a visão inicial da agenda clínica para a recepcionista localizar e conferir consultas.\nEntrada: Recebe a data de agenda do contexto, um filtro opcional de situação e a página solicitada.\nProcessamento: Busca consultas da data informada, aplica a situação quando ela foi escolhida, ordena por data e horário e resolve os dados mestres permitidos de paciente e profissional. Calcula quantidadePendentes a partir das consultas da data com situação scheduled ou confirmed; o indicador é derivado e não é gravado.\nSaída: Devolve o cabeçalho da data, o indicador já calculado e uma página de linhas de agenda prontas para exibição.",
          "purpose": "Carrega a visão inicial da agenda clínica para a recepcionista localizar e conferir consultas.",
          "input": "Recebe a data de agenda do contexto, um filtro opcional de situação e a página solicitada.",
          "processing": "Busca consultas da data informada, aplica a situação quando ela foi escolhida, ordena por data e horário e resolve os dados mestres permitidos de paciente e profissional. Calcula quantidadePendentes a partir das consultas da data com situação scheduled ou confirmed; o indicador é derivado e não é gravado.",
          "output": "Devolve o cabeçalho da data, o indicador já calculado e uma página de linhas de agenda prontas para exibição."
        }
      },
      {
        "route": "agendaClinica.consultas.filtrarAgenda",
        "kind": "qry",
        "uses": [
          "listConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "cabecalho.dataAgenda",
            "reason": "Interface AgendaCabecalho: field dataAgenda is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "quantidadePendentes",
            "reason": "Output quantidadePendentes is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "status",
            "target": "agenda",
            "field": "status"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Substitui a agenda exibida quando a recepcionista muda a data ou a situação procurada.\nEntrada: Recebe a data, a situação opcional e a primeira página desejada para a nova consulta de agenda.\nProcessamento: Aplica os filtros informados, ordena a agenda por horário, compõe nomes e tipo de profissional e calcula novamente quantidadePendentes para a data escolhida.\nSaída: Devolve o novo cabeçalho, indicador e página filtrada, para substituir a visão anterior sem a página somar registros.",
          "purpose": "Substitui a agenda exibida quando a recepcionista muda a data ou a situação procurada.",
          "input": "Recebe a data, a situação opcional e a primeira página desejada para a nova consulta de agenda.",
          "processing": "Aplica os filtros informados, ordena a agenda por horário, compõe nomes e tipo de profissional e calcula novamente quantidadePendentes para a data escolhida.",
          "output": "Devolve o novo cabeçalho, indicador e página filtrada, para substituir a visão anterior sem a página somar registros."
        }
      },
      {
        "route": "agendaClinica.consultas.carregarMaisAgenda",
        "kind": "qry",
        "uses": [
          "listConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "status",
            "target": "agenda",
            "field": "status"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Traz a próxima página da mesma agenda já filtrada.\nEntrada: Recebe os filtros atuais e o número da próxima página com seu tamanho.\nProcessamento: Repete exatamente os filtros de data e situação da agenda atual, mantém a ordenação por horário e busca apenas a página solicitada.\nSaída: Devolve mais linhas de agenda e os metadados de paginação para acrescentá-las à lista existente.",
          "purpose": "Traz a próxima página da mesma agenda já filtrada.",
          "input": "Recebe os filtros atuais e o número da próxima página com seu tamanho.",
          "processing": "Repete exatamente os filtros de data e situação da agenda atual, mantém a ordenação por horário e busca apenas a página solicitada.",
          "output": "Devolve mais linhas de agenda e os metadados de paginação para acrescentá-las à lista existente."
        }
      },
      {
        "route": "agendaClinica.consultas.consultarConsultaSelecionada",
        "kind": "qry",
        "uses": [
          "getConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "entity",
            "path": "consulta",
            "entity": "Consulta",
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
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "consulta.profissional.agendaClinica",
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
            "path": "consulta.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "Interface ContatosPaciente has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route agendaClinica.consultas.consultarConsultaSelecionada projects Paciente.contacts, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "id",
            "target": "consulta",
            "field": "id"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a consulta escolhida com os dados necessários para conferir, agir ou reutilizar no formulário.\nEntrada: Recebe o identificador da linha selecionada na agenda.\nProcessamento: Lê a consulta por id e compõe o paciente com identificação e contatos, além do profissional com identificação e tipo de atuação.\nSaída: Devolve uma consulta detalhada com versão, para exibir o contexto conferido e enviar transições com concorrência otimista.",
          "purpose": "Carrega a consulta escolhida com os dados necessários para conferir, agir ou reutilizar no formulário.",
          "input": "Recebe o identificador da linha selecionada na agenda.",
          "processing": "Lê a consulta por id e compõe o paciente com identificação e contatos, além do profissional com identificação e tipo de atuação.",
          "output": "Devolve uma consulta detalhada com versão, para exibir o contexto conferido e enviar transições com concorrência otimista."
        }
      },
      {
        "route": "agendaClinica.consultas.localizarPacientesParaAgendamento",
        "kind": "qry",
        "uses": [
          "listPaciente",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "pacientes",
            "entity": "Paciente",
            "items": "items",
            "page": "pacientes.page",
            "pageSize": "pacientes.pageSize",
            "hasMore": "pacientes.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pacientes.items.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pacientes.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pacientes",
            "pages": "pacientes"
          },
          {
            "name": "pageSize",
            "target": "pacientes",
            "pages": "pacientes"
          },
          {
            "name": "termo",
            "target": "pacientes",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Localiza pacientes para a recepcionista escolher quem receberá o novo agendamento.\nEntrada: Recebe o texto informado no nome do paciente e a primeira página de resultados.\nProcessamento: Pesquisa o índice de nomes de pacientes dentro da organização e retorna somente a identificação que a recepcionista pode consultar.\nSaída: Devolve uma página de pacientes identificados para preencher pacienteId no formulário de agendamento.",
          "purpose": "Localiza pacientes para a recepcionista escolher quem receberá o novo agendamento.",
          "input": "Recebe o texto informado no nome do paciente e a primeira página de resultados.",
          "processing": "Pesquisa o índice de nomes de pacientes dentro da organização e retorna somente a identificação que a recepcionista pode consultar.",
          "output": "Devolve uma página de pacientes identificados para preencher pacienteId no formulário de agendamento."
        }
      },
      {
        "route": "agendaClinica.consultas.carregarMaisPacientesParaAgendamento",
        "kind": "qry",
        "uses": [
          "listPaciente",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "pacientes",
            "entity": "Paciente",
            "items": "items",
            "page": "pacientes.page",
            "pageSize": "pacientes.pageSize",
            "hasMore": "pacientes.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "pacientes.items.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "unresolved",
            "path": "pacientes.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "pacientes",
            "pages": "pacientes"
          },
          {
            "name": "pageSize",
            "target": "pacientes",
            "pages": "pacientes"
          },
          {
            "name": "termo",
            "target": "pacientes",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Acrescenta resultados à localização de pacientes usada no agendamento.\nEntrada: Recebe o mesmo termo de nome e a próxima página solicitada.\nProcessamento: Mantém a pesquisa de pacientes pelo nome e busca somente a próxima página de registros permitidos.\nSaída: Devolve mais opções de paciente e metadados de paginação para anexar à pesquisa atual.",
          "purpose": "Acrescenta resultados à localização de pacientes usada no agendamento.",
          "input": "Recebe o mesmo termo de nome e a próxima página solicitada.",
          "processing": "Mantém a pesquisa de pacientes pelo nome e busca somente a próxima página de registros permitidos.",
          "output": "Devolve mais opções de paciente e metadados de paginação para anexar à pesquisa atual."
        }
      },
      {
        "route": "agendaClinica.consultas.localizarProfissionaisParaAgendamento",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "profissionais",
            "entity": "Profissional",
            "items": "items",
            "page": "profissionais.page",
            "pageSize": "profissionais.pageSize",
            "hasMore": "profissionais.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "profissionais.items.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "profissionais.items.agendaClinica",
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
            "path": "profissionais.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "profissionais.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "profissionais",
            "pages": "profissionais"
          },
          {
            "name": "pageSize",
            "target": "profissionais",
            "pages": "profissionais"
          },
          {
            "name": "termo",
            "target": "profissionais",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Localiza profissionais da agenda para a recepcionista definir o responsável pela nova consulta.\nEntrada: Recebe o nome pesquisado e a primeira página de resultados.\nProcessamento: Pesquisa profissionais da organização pelo nome e compõe sua identificação e o tipo de atuação da agenda clínica.\nSaída: Devolve uma página de profissionais que o formulário usa para preencher profissionalId.",
          "purpose": "Localiza profissionais da agenda para a recepcionista definir o responsável pela nova consulta.",
          "input": "Recebe o nome pesquisado e a primeira página de resultados.",
          "processing": "Pesquisa profissionais da organização pelo nome e compõe sua identificação e o tipo de atuação da agenda clínica.",
          "output": "Devolve uma página de profissionais que o formulário usa para preencher profissionalId."
        }
      },
      {
        "route": "agendaClinica.consultas.carregarMaisProfissionaisParaAgendamento",
        "kind": "qry",
        "uses": [
          "listProfissional",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "profissionais",
            "entity": "Profissional",
            "items": "items",
            "page": "profissionais.page",
            "pageSize": "profissionais.pageSize",
            "hasMore": "profissionais.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "profissionais.items.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "profissionais.items.agendaClinica",
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
            "path": "profissionais.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "profissionais.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "profissionais",
            "pages": "profissionais"
          },
          {
            "name": "pageSize",
            "target": "profissionais",
            "pages": "profissionais"
          },
          {
            "name": "termo",
            "target": "profissionais",
            "field": "details.identification.name"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Acrescenta resultados à localização de profissionais para o agendamento.\nEntrada: Recebe o termo de nome mantido na pesquisa e a próxima página.\nProcessamento: Repete a busca de profissionais pelo nome e retorna apenas a página posterior solicitada.\nSaída: Devolve opções adicionais de profissional para anexar à lista de escolha existente.",
          "purpose": "Acrescenta resultados à localização de profissionais para o agendamento.",
          "input": "Recebe o termo de nome mantido na pesquisa e a próxima página.",
          "processing": "Repete a busca de profissionais pelo nome e retorna apenas a página posterior solicitada.",
          "output": "Devolve opções adicionais de profissional para anexar à lista de escolha existente."
        }
      },
      {
        "route": "agendaClinica.consultas.agendarConsulta",
        "kind": "cmd",
        "uses": [
          "createConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "consulta",
            "entity": "Consulta",
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
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "consulta.profissional.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "consulta.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "Interface ContatosPaciente has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "cabecalho.dataAgenda",
            "reason": "Interface AgendaCabecalho: field dataAgenda is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "quantidadePendentes",
            "reason": "Output quantidadePendentes is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route agendaClinica.consultas.agendarConsulta projects Paciente.contacts, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          }
        ],
        "rules": [
          "consultaSemConflito"
        ],
        "doc": {
          "raw": "Finalidade: Cria o agendamento informado pela recepcionista e devolve a visão que a página precisa redesenhar.\nEntrada: Recebe pacienteId, profissionalId e data e horário editados no formulário, além dos filtros e da página de agenda atualmente visíveis.\nProcessamento: Cria a consulta com situação scheduled e aplica consultaSemConflito, recusando o comando se já existir consulta do mesmo profissional na mesma data e horário. Em seguida compõe a consulta criada e recompõe a página atual da agenda e seu indicador derivado.\nSaída: Devolve a consulta criada com versão e vínculos resolvidos, bem como cabeçalho, indicador e página de agenda atualizados; não exige nova chamada para redesenhar a página.",
          "purpose": "Cria o agendamento informado pela recepcionista e devolve a visão que a página precisa redesenhar.",
          "input": "Recebe pacienteId, profissionalId e data e horário editados no formulário, além dos filtros e da página de agenda atualmente visíveis.",
          "processing": "Cria a consulta com situação scheduled e aplica consultaSemConflito, recusando o comando se já existir consulta do mesmo profissional na mesma data e horário. Em seguida compõe a consulta criada e recompõe a página atual da agenda e seu indicador derivado.",
          "output": "Devolve a consulta criada com versão e vínculos resolvidos, bem como cabeçalho, indicador e página de agenda atualizados; não exige nova chamada para redesenhar a página."
        }
      },
      {
        "route": "agendaClinica.consultas.confirmarConsulta",
        "kind": "cmd",
        "uses": [
          "confirmarConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "consulta",
            "entity": "Consulta",
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
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "consulta.profissional.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "consulta.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "Interface ContatosPaciente has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "cabecalho.dataAgenda",
            "reason": "Interface AgendaCabecalho: field dataAgenda is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "quantidadePendentes",
            "reason": "Output quantidadePendentes is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route agendaClinica.consultas.confirmarConsulta projects Paciente.contacts, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          }
        ],
        "rules": [
          "transicaoConsultaValida"
        ],
        "doc": {
          "raw": "Finalidade: Registra a confirmação telefônica da consulta conferida e atualiza a agenda exibida.\nEntrada: Recebe id e version da consulta selecionada, mais os filtros e a página de agenda que precisam ser redesenhados.\nProcessamento: Executa a transição confirmarConsulta e aplica transicaoConsultaValida, aceitando somente a mudança de scheduled para confirmed. Após a transição, recompõe a consulta, a página filtrada e quantidadePendentes.\nSaída: Devolve a consulta confirmada com a nova versão, o indicador recalculado e as linhas atualizadas da página da agenda.",
          "purpose": "Registra a confirmação telefônica da consulta conferida e atualiza a agenda exibida.",
          "input": "Recebe id e version da consulta selecionada, mais os filtros e a página de agenda que precisam ser redesenhados.",
          "processing": "Executa a transição confirmarConsulta e aplica transicaoConsultaValida, aceitando somente a mudança de scheduled para confirmed. Após a transição, recompõe a consulta, a página filtrada e quantidadePendentes.",
          "output": "Devolve a consulta confirmada com a nova versão, o indicador recalculado e as linhas atualizadas da página da agenda."
        }
      },
      {
        "route": "agendaClinica.consultas.registrarFalta",
        "kind": "cmd",
        "uses": [
          "registrarFalta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "consulta",
            "entity": "Consulta",
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
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.paciente.base",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.base",
                "path": "details.base"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "consulta.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "consulta.profissional.agendaClinica",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.agendaClinica.professionalType",
                "path": "details.agendaClinica.professionalType"
              }
            ]
          },
          {
            "kind": "list",
            "path": "agenda",
            "entity": "Consulta",
            "items": "items",
            "page": "agenda.page",
            "pageSize": "agenda.pageSize",
            "hasMore": "agenda.hasMore",
            "fields": [
              {
                "field": "id",
                "path": "id"
              },
              {
                "field": "pacienteId",
                "path": "pacienteId"
              },
              {
                "field": "profissionalId",
                "path": "profissionalId"
              },
              {
                "field": "scheduledAt",
                "path": "scheduledAt"
              },
              {
                "field": "status",
                "path": "status"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.paciente.identification",
            "entity": "Paciente",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
                "field": "details.identification.docType",
                "path": "details.identification.docType"
              },
              {
                "field": "details.identification.docId",
                "path": "details.identification.docId"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional",
            "entity": "Profissional",
            "relationship": "consultaProfissional",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          },
          {
            "kind": "related",
            "path": "agenda.items.profissional.identification",
            "entity": "Profissional",
            "fields": [
              {
                "field": "details.identification.subtype",
                "path": "details.identification.subtype"
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
            "path": "agenda.items.profissional.agendaClinica",
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
            "path": "consulta.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "Interface ContatosPaciente has no field that is not readonly, so no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "cabecalho.dataAgenda",
            "reason": "Interface AgendaCabecalho: field dataAgenda is not a field of any entity."
          },
          {
            "kind": "unresolved",
            "path": "quantidadePendentes",
            "reason": "Output quantidadePendentes is a value (number), not an interface; no entity owns it."
          },
          {
            "kind": "unresolved",
            "path": "agenda.paciente.identification",
            "reason": "Paciente inside Paciente needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.identification",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "agenda.profissional.agendaClinica",
            "reason": "Profissional inside Profissional needs one L4 relationship between them; found 0."
          },
          {
            "kind": "unresolved",
            "path": "consulta.paciente.base.contacts",
            "reason": "PROJECTION_FIELD_UNKNOWN: Route agendaClinica.consultas.registrarFalta projects Paciente.contacts, which is not a field of the ontology."
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "agenda",
            "pages": "agenda"
          },
          {
            "name": "pageSize",
            "target": "agenda",
            "pages": "agenda"
          }
        ],
        "rules": [
          "transicaoConsultaValida"
        ],
        "doc": {
          "raw": "Finalidade: Registra a falta do paciente na consulta conferida e devolve a agenda já atualizada.\nEntrada: Recebe id e version da consulta, junto dos filtros e da página de agenda em uso.\nProcessamento: Executa registrarFalta conforme transicaoConsultaValida, permitindo somente scheduled ou confirmed para noShow. Recompõe a consulta resultante, a página filtrada e o indicador derivado após a transição.\nSaída: Devolve a consulta marcada como falta, com nova versão, e os dados completos para redesenhar o cabeçalho, o indicador e a lista sem recarga adicional.",
          "purpose": "Registra a falta do paciente na consulta conferida e devolve a agenda já atualizada.",
          "input": "Recebe id e version da consulta, junto dos filtros e da página de agenda em uso.",
          "processing": "Executa registrarFalta conforme transicaoConsultaValida, permitindo somente scheduled ou confirmed para noShow. Recompõe a consulta resultante, a página filtrada e o indicador derivado após a transição.",
          "output": "Devolve a consulta marcada como falta, com nova versão, e os dados completos para redesenhar o cabeçalho, o indicador e a lista sem recarga adicional."
        }
      }
    ]
  }
} as const;

export default definition;
