/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/requests/participantes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "participantes",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/createParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/updateParticipante.defs.ts"
  ],
  "data": {
    "pageId": "participantes",
    "requests": [
      {
        "route": "tarefas.participantes.listarParticipantes",
        "kind": "qry",
        "uses": [
          "listParticipante"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "participantes",
            "entity": "Participante",
            "items": "items",
            "page": "participantes.page",
            "pageSize": "participantes.pageSize",
            "hasMore": "participantes.hasMore",
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
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.tags",
                "path": "details.identification.tags"
              },
              {
                "field": "details.tarefas.aceitaTarefas",
                "path": "details.tarefas.aceitaTarefas"
              },
              {
                "field": "details.tarefas.podeCriarTarefas",
                "path": "details.tarefas.podeCriarTarefas"
              },
              {
                "field": "details.tarefas.aceitaTarefasEfetivo",
                "path": "details.tarefas.aceitaTarefasEfetivo"
              },
              {
                "field": "details.tarefas.podeCriarTarefasEfetivo",
                "path": "details.tarefas.podeCriarTarefasEfetivo"
              }
            ]
          }
        ],
        "params": [
          {
            "name": "page",
            "target": "participantes",
            "pages": "participantes"
          },
          {
            "name": "pageSize",
            "target": "participantes",
            "pages": "participantes"
          },
          {
            "name": "busca",
            "target": "participantes",
            "field": "details.identification.name",
            "optional": true
          }
        ],
        "rules": [
          "participanteNaoConfiguradoAceitaECria"
        ],
        "doc": {
          "raw": "Finalidade: Lista os participantes do módulo de tarefas da organização, com busca opcional pelo nome.\nEntrada: busca: trecho do nome do participante (opcional); page e pageSize: página pedida e tamanho da página.\nProcessamento: Localiza pelo papel tarefas.Participante os registros da organização, filtra pelo nome quando há busca e ordena pelo nome. Calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo pela regra participanteNaoConfiguradoAceitaECria: marca vazia vale sim; os campos efetivos são calculados, nunca gravados. Devolve só identificação e marcas do módulo, sem dado pessoal.\nSaída: Página { items, page, pageSize, hasMore } de participantes com id, versão, nome, situação, papéis, marcas do gestor (vazias quando não configurado) e marcas efetivas.",
          "purpose": "Lista os participantes do módulo de tarefas da organização, com busca opcional pelo nome.",
          "input": "busca: trecho do nome do participante (opcional); page e pageSize: página pedida e tamanho da página.",
          "processing": "Localiza pelo papel tarefas.Participante os registros da organização, filtra pelo nome quando há busca e ordena pelo nome. Calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo pela regra participanteNaoConfiguradoAceitaECria: marca vazia vale sim; os campos efetivos são calculados, nunca gravados. Devolve só identificação e marcas do módulo, sem dado pessoal.",
          "output": "Página { items, page, pageSize, hasMore } de participantes com id, versão, nome, situação, papéis, marcas do gestor (vazias quando não configurado) e marcas efetivas."
        }
      },
      {
        "route": "tarefas.participantes.buscarUsuarios",
        "kind": "qry",
        "uses": [
          "listParticipante"
        ],
        "transaction": "none",
        "output": [
          {
            "kind": "list",
            "path": "usuarios",
            "entity": "Participante",
            "items": "",
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
              }
            ]
          }
        ],
        "params": [
          {
            "name": "busca",
            "target": "usuarios",
            "field": "details.identification.name"
          }
        ],
        "rules": [
          "participanteSemCadastroPessoal"
        ],
        "doc": {
          "raw": "Finalidade: Busca pelo nome, entre os usuários da organização, quem pode ser incluído como participante.\nEntrada: busca: trecho do nome do usuário digitado pelo gestor.\nProcessamento: Consulta a lista de usuários da plataforma pelo nome, mantém apenas usuários ativos que ainda não têm o papel tarefas.Participante e limita o resultado aos primeiros encontrados. Pela regra participanteSemCadastroPessoal não lê nem devolve dado pessoal, apenas o nome.\nSaída: Lista curta de usuários com id, nome e situação.",
          "purpose": "Busca pelo nome, entre os usuários da organização, quem pode ser incluído como participante.",
          "input": "busca: trecho do nome do usuário digitado pelo gestor.",
          "processing": "Consulta a lista de usuários da plataforma pelo nome, mantém apenas usuários ativos que ainda não têm o papel tarefas.Participante e limita o resultado aos primeiros encontrados. Pela regra participanteSemCadastroPessoal não lê nem devolve dado pessoal, apenas o nome.",
          "output": "Lista curta de usuários com id, nome e situação."
        }
      },
      {
        "route": "tarefas.participantes.incluirParticipante",
        "kind": "cmd",
        "uses": [
          "createParticipante"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "participante",
            "entity": "Participante",
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
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.tags",
                "path": "details.identification.tags"
              },
              {
                "field": "details.tarefas.aceitaTarefas",
                "path": "details.tarefas.aceitaTarefas"
              },
              {
                "field": "details.tarefas.podeCriarTarefas",
                "path": "details.tarefas.podeCriarTarefas"
              },
              {
                "field": "details.tarefas.aceitaTarefasEfetivo",
                "path": "details.tarefas.aceitaTarefasEfetivo"
              },
              {
                "field": "details.tarefas.podeCriarTarefasEfetivo",
                "path": "details.tarefas.podeCriarTarefasEfetivo"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "participanteSemCadastroPessoal",
          "participanteNaoConfiguradoAceitaECria",
          "escolhaGestorNuncaSobrescrita",
          "gestorPorAcessoPlataforma"
        ],
        "doc": {
          "raw": "Finalidade: Inclui um usuário da organização como participante do módulo de tarefas.\nEntrada: id: id do usuário escolhido na busca; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas opcionais do gestor, deixadas vazias quando não informadas.\nProcessamento: Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma). Marca o papel tarefas.Participante no registro do usuário e grava só o espaço do módulo, sem cadastrar pessoa nem pedir dado pessoal (participanteSemCadastroPessoal). Marcas não informadas ficam vazias e valem sim (participanteNaoConfiguradoAceitaECria); marcas já existentes do gestor não são sobrescritas automaticamente (escolhaGestorNuncaSobrescrita). Os campos efetivos são calculados na leitura.\nSaída: O participante incluído, no novo estado, com versão, marcas do gestor e marcas efetivas.",
          "purpose": "Inclui um usuário da organização como participante do módulo de tarefas.",
          "input": "id: id do usuário escolhido na busca; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas opcionais do gestor, deixadas vazias quando não informadas.",
          "processing": "Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma). Marca o papel tarefas.Participante no registro do usuário e grava só o espaço do módulo, sem cadastrar pessoa nem pedir dado pessoal (participanteSemCadastroPessoal). Marcas não informadas ficam vazias e valem sim (participanteNaoConfiguradoAceitaECria); marcas já existentes do gestor não são sobrescritas automaticamente (escolhaGestorNuncaSobrescrita). Os campos efetivos são calculados na leitura.",
          "output": "O participante incluído, no novo estado, com versão, marcas do gestor e marcas efetivas."
        }
      },
      {
        "route": "tarefas.participantes.salvarMarcas",
        "kind": "cmd",
        "uses": [
          "updateParticipante"
        ],
        "transaction": "single",
        "output": [
          {
            "kind": "entity",
            "path": "participante",
            "entity": "Participante",
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
                "field": "details.identification.name",
                "path": "details.identification.name"
              },
              {
                "field": "details.identification.status",
                "path": "details.identification.status"
              },
              {
                "field": "details.identification.tags",
                "path": "details.identification.tags"
              },
              {
                "field": "details.tarefas.aceitaTarefas",
                "path": "details.tarefas.aceitaTarefas"
              },
              {
                "field": "details.tarefas.podeCriarTarefas",
                "path": "details.tarefas.podeCriarTarefas"
              },
              {
                "field": "details.tarefas.aceitaTarefasEfetivo",
                "path": "details.tarefas.aceitaTarefasEfetivo"
              },
              {
                "field": "details.tarefas.podeCriarTarefasEfetivo",
                "path": "details.tarefas.podeCriarTarefasEfetivo"
              }
            ]
          }
        ],
        "params": [],
        "rules": [
          "escolhaGestorNuncaSobrescrita",
          "participanteNaoConfiguradoAceitaECria",
          "gestorPorAcessoPlataforma"
        ],
        "doc": {
          "raw": "Finalidade: Grava as marcas de aceitar tarefas e de poder criar tarefas de um participante.\nEntrada: id e version: participante escolhido e versão lida, para concorrência otimista; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas escolhidas pelo gestor.\nProcessamento: Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma) e recusa se a versão mudou. Grava as duas marcas só no espaço do módulo; por escolhaGestorNuncaSobrescrita, só o gestor altera essas marcas e nenhum processo automático as substitui. Os campos efetivos são recalculados (participanteNaoConfiguradoAceitaECria), nunca gravados. A mudança fica registrada na auditoria da plataforma.\nSaída: O participante no novo estado, com a nova versão, as marcas do gestor e as marcas efetivas.",
          "purpose": "Grava as marcas de aceitar tarefas e de poder criar tarefas de um participante.",
          "input": "id e version: participante escolhido e versão lida, para concorrência otimista; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas escolhidas pelo gestor.",
          "processing": "Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma) e recusa se a versão mudou. Grava as duas marcas só no espaço do módulo; por escolhaGestorNuncaSobrescrita, só o gestor altera essas marcas e nenhum processo automático as substitui. Os campos efetivos são recalculados (participanteNaoConfiguradoAceitaECria), nunca gravados. A mudança fica registrada na auditoria da plataforma.",
          "output": "O participante no novo estado, com a nova versão, as marcas do gestor e as marcas efetivas."
        }
      }
    ]
  }
} as const;

export default definition;
