/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/requests/agenda_diaria.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "agenda_diaria",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getPaciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/getProfissional.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/listConsulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/usecases/registrarAtendimento.defs.ts"
  ],
  "data": {
    "pageId": "agenda_diaria",
    "requests": [
      {
        "route": "agendaClinica.agenda_diaria.carregarAgendaDiaria",
        "kind": "qry",
        "uses": [
          "listConsulta",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "consultas",
            "entity": "Consulta",
            "items": "items",
            "page": "consultas.page",
            "pageSize": "consultas.pageSize",
            "hasMore": "consultas.hasMore",
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
            "kind": "unresolved",
            "path": "consultas.items.paciente.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.carregarAgendaDiaria projects items.paciente.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "consultas.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "consultas",
            "pages": "consultas"
          },
          {
            "name": "pageSize",
            "target": "consultas",
            "pages": "consultas"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Carrega a primeira página da agenda de hoje do profissional autenticado para exibir seus horários, pacientes e situações.\nEntrada: page e pageSize definem a página inicial e a quantidade de consultas por página; ambos vêm do contexto de navegação da agenda.\nProcessamento: Obtém o profissional autenticado no contexto, filtra Consulta por profissionalId desse profissional e por scheduledAt no dia atual, ordena por horário crescente, resolve somente o paciente relacionado e aplica a paginação solicitada. O escopo próprio e os campos retornados respeitam as permissões do profissional.\nSaída: Retorna consultas no formato de linha da agenda, já limitadas à agenda própria de hoje e acompanhadas de items, page, pageSize e hasMore para a lista paginada.",
          "purpose": "Carrega a primeira página da agenda de hoje do profissional autenticado para exibir seus horários, pacientes e situações.",
          "input": "page e pageSize definem a página inicial e a quantidade de consultas por página; ambos vêm do contexto de navegação da agenda.",
          "processing": "Obtém o profissional autenticado no contexto, filtra Consulta por profissionalId desse profissional e por scheduledAt no dia atual, ordena por horário crescente, resolve somente o paciente relacionado e aplica a paginação solicitada. O escopo próprio e os campos retornados respeitam as permissões do profissional.",
          "output": "Retorna consultas no formato de linha da agenda, já limitadas à agenda própria de hoje e acompanhadas de items, page, pageSize e hasMore para a lista paginada."
        }
      },
      {
        "route": "agendaClinica.agenda_diaria.carregarMaisConsultasDoDia",
        "kind": "qry",
        "uses": [
          "listConsulta",
          "getPaciente"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "consultas",
            "entity": "Consulta",
            "items": "items",
            "page": "consultas.page",
            "pageSize": "consultas.pageSize",
            "hasMore": "consultas.hasMore",
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
            "kind": "unresolved",
            "path": "consultas.items.paciente.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.carregarMaisConsultasDoDia projects items.paciente.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
          {
            "kind": "related",
            "path": "consultas.items.paciente",
            "entity": "Paciente",
            "relationship": "consultaPaciente",
            "fields": [
              {
                "field": "id",
                "path": "id"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "consultas",
            "pages": "consultas"
          },
          {
            "name": "pageSize",
            "target": "consultas",
            "pages": "consultas"
          }
        ],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Busca sob demanda a próxima página de consultas da agenda de hoje do profissional autenticado.\nEntrada: page informa a página solicitada pela ação de carregar mais, e pageSize define o limite de linhas dessa página.\nProcessamento: Repete o filtro da agenda própria do dia atual pelo profissional autenticado, ordena as consultas por scheduledAt crescente, resolve o nome do paciente relacionado e aplica a página requerida. Não amplia o escopo para consultas de outro profissional ou de outro dia.\nSaída: Retorna uma página adicional de linhas da agenda, com items, page, pageSize e hasMore, para ser acrescentada à lista já exibida.",
          "purpose": "Busca sob demanda a próxima página de consultas da agenda de hoje do profissional autenticado.",
          "input": "page informa a página solicitada pela ação de carregar mais, e pageSize define o limite de linhas dessa página.",
          "processing": "Repete o filtro da agenda própria do dia atual pelo profissional autenticado, ordena as consultas por scheduledAt crescente, resolve o nome do paciente relacionado e aplica a página requerida. Não amplia o escopo para consultas de outro profissional ou de outro dia.",
          "output": "Retorna uma página adicional de linhas da agenda, com items, page, pageSize e hasMore, para ser acrescentada à lista já exibida."
        }
      },
      {
        "route": "agendaClinica.agenda_diaria.carregarConsultaSelecionada",
        "kind": "qry",
        "uses": [
          "getConsulta",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "unresolved",
            "path": "consulta.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.carregarConsultaSelecionada projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
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
            "kind": "unresolved",
            "path": "consulta.paciente.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.carregarConsultaSelecionada projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
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
            "kind": "unresolved",
            "path": "consulta.profissional.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.carregarConsultaSelecionada projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
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
          }
        ],
        "params": [],
        "rules": [],
        "doc": {
          "raw": "Finalidade: Abre a consulta escolhida na agenda diária para identificar paciente, horário e profissional e permitir o registro do atendimento.\nEntrada: consultaId é o identificador da linha selecionada pelo profissional na lista da própria agenda.\nProcessamento: Localiza a Consulta pelo identificador, confirma que ela pertence ao profissional autenticado e que está prevista para o dia atual, resolve os dados autorizados do Paciente e do Profissional relacionados e inclui a versão e a anotação existente.\nSaída: Retorna a consulta selecionada completa no formato usado pelo resumo, formulário e ações, inclusive version para controle de concorrência no registro.",
          "purpose": "Abre a consulta escolhida na agenda diária para identificar paciente, horário e profissional e permitir o registro do atendimento.",
          "input": "consultaId é o identificador da linha selecionada pelo profissional na lista da própria agenda.",
          "processing": "Localiza a Consulta pelo identificador, confirma que ela pertence ao profissional autenticado e que está prevista para o dia atual, resolve os dados autorizados do Paciente e do Profissional relacionados e inclui a versão e a anotação existente.",
          "output": "Retorna a consulta selecionada completa no formato usado pelo resumo, formulário e ações, inclusive version para controle de concorrência no registro."
        }
      },
      {
        "route": "agendaClinica.agenda_diaria.registrarAtendimento",
        "kind": "cmd",
        "uses": [
          "registrarAtendimento",
          "getPaciente",
          "getProfissional"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "unresolved",
            "path": "consulta.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.registrarAtendimento projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
          },
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
            "kind": "unresolved",
            "path": "consulta.paciente.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.registrarAtendimento projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
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
            "kind": "unresolved",
            "path": "consulta.profissional.details",
            "reason": "DISCLOSURE: Route agendaClinica.agenda_diaria.registrarAtendimento projects details, paciente.details, profissional.details. A grant names a sub-path, but the nested shape could not be read, so the container was not released."
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
          }
        ],
        "params": [],
        "rules": [
          "transicaoConsultaValida",
          "anotacaoObrigatoriaNoAtendimento"
        ],
        "doc": {
          "raw": "Finalidade: Registra o atendimento realizado na consulta aberta pelo profissional e devolve o estado atualizado para redesenhar a página.\nEntrada: id e version identificam a Consulta e protegem a alteração concorrente; details.attendanceNote é a anotação obrigatória enviada pelo formulário para o payload da transição.\nProcessamento: Confirma que a consulta pertence ao profissional autenticado e executa Consulta.registrarAtendimento. Aplica transicaoConsultaValida, aceitando somente a mudança de scheduled ou confirmed para attended, e anotacaoObrigatoriaNoAtendimento, recusando payload sem anotação. Após a transição, resolve paciente e profissional relacionados para compor o registro atualizado.\nSaída: Retorna a consulta já atendida, com nova version, status e anotação persistida, para atualizar tanto o detalhe aberto quanto sua linha na agenda sem uma segunda chamada.",
          "purpose": "Registra o atendimento realizado na consulta aberta pelo profissional e devolve o estado atualizado para redesenhar a página.",
          "input": "id e version identificam a Consulta e protegem a alteração concorrente; details.attendanceNote é a anotação obrigatória enviada pelo formulário para o payload da transição.",
          "processing": "Confirma que a consulta pertence ao profissional autenticado e executa Consulta.registrarAtendimento. Aplica transicaoConsultaValida, aceitando somente a mudança de scheduled ou confirmed para attended, e anotacaoObrigatoriaNoAtendimento, recusando payload sem anotação. Após a transição, resolve paciente e profissional relacionados para compor o registro atualizado.",
          "output": "Retorna a consulta já atendida, com nova version, status e anotação persistida, para atualizar tanto o detalhe aberto quanto sua linha na agenda sem uma segunda chamada."
        }
      }
    ]
  }
} as const;

export default definition;
