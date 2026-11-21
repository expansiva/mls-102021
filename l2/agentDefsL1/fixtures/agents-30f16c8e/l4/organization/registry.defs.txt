/// <mls fileReference="_102047_/l4/organization/registry.defs.ts" enhancement="_blank"/>

import type { Ns4SolutionRegistryArtifact } from '/_102035_/l2/solution/helpers/ns4Types.js';

export const solutionRegistry = {
  "schemaVersion": "ns4-solution-registry-v1",
  "level1SchemaVersion": "2026-09-15-mdm-ontology-v2",
  "modules": [
    {
      "moduleName": "reembolsoDespesas",
      "actors": [
        {
          "actorId": "colaborador",
          "kind": "internal"
        },
        {
          "actorId": "gestorEquipe",
          "kind": "internal"
        },
        {
          "actorId": "financeiro",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "reembolsoDespesas.Colaborador",
          "namespace": "reembolsoDespesas"
        },
        {
          "subtype": "Person",
          "roleTag": "reembolsoDespesas.GestorEquipe",
          "namespace": "reembolsoDespesas"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Colaborador",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "GestorEquipe",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Despesa",
          "kind": "entity",
          "class": "core"
        }
      ],
      "events": [
        {
          "eventId": "aprovarDespesa",
          "on": "Despesa.aprovarDespesa"
        }
      ],
      "updatedAt": "2026-10-02T15:30:35.579Z"
    },
    {
      "moduleName": "comandaRestaurante",
      "actors": [
        {
          "actorId": "garcom",
          "kind": "internal"
        },
        {
          "actorId": "caixa",
          "kind": "internal"
        }
      ],
      "roles": [],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Mesa",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "ItemCardapio",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "Comanda",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "ItemComanda",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "comandaFechada",
          "on": "Comanda.fecharComanda"
        }
      ],
      "updatedAt": "2026-10-04T05:01:31.016Z"
    },
    {
      "moduleName": "agendaClinica",
      "actors": [
        {
          "actorId": "recepcionista",
          "kind": "internal"
        },
        {
          "actorId": "profissional",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "agendaClinica.Paciente",
          "namespace": "agendaClinica"
        },
        {
          "subtype": "Person",
          "roleTag": "agendaClinica.Profissional",
          "namespace": "agendaClinica"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Paciente",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Profissional",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Consulta",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "confirmarConsulta",
          "on": "Consulta.confirmarConsulta"
        },
        {
          "eventId": "registrarFalta",
          "on": "Consulta.registrarFalta"
        },
        {
          "eventId": "registrarAtendimento",
          "on": "Consulta.registrarAtendimento"
        }
      ],
      "updatedAt": "2026-10-07T07:16:47.918Z"
    },
    {
      "moduleName": "controleEstoque",
      "actors": [
        {
          "actorId": "estoquista",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Product",
          "roleTag": "controleEstoque.Produto",
          "namespace": "controleEstoque"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Produto",
          "kind": "role",
          "mdmSubtype": "Product",
          "class": "mdm"
        },
        {
          "entityId": "Movimentacao",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "produtoCadastrado",
          "on": "Produto.create"
        },
        {
          "eventId": "movimentacaoRegistrada",
          "on": "Movimentacao.create"
        }
      ],
      "updatedAt": "2026-10-12T15:41:38.204Z"
    },
    {
      "moduleName": "ordenServicio",
      "actors": [
        {
          "actorId": "recepcionista",
          "kind": "internal"
        },
        {
          "actorId": "tecnico",
          "kind": "internal"
        },
        {
          "actorId": "cliente",
          "kind": "external"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "ordenServicio.Cliente",
          "namespace": "ordenServicio"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Cliente",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "OrdenServicio",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "PiezaOrden",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "presupuestoAprobado",
          "on": "OrdenServicio.aprobarPresupuesto"
        },
        {
          "eventId": "presupuestoRechazado",
          "on": "OrdenServicio.rechazarPresupuesto"
        },
        {
          "eventId": "ordenServicioFinalizada",
          "on": "OrdenServicio.finalizar"
        }
      ],
      "updatedAt": "2026-10-12T20:29:01.147Z"
    },
    {
      "moduleName": "financeiro",
      "actors": [
        {
          "actorId": "caixa",
          "kind": "internal"
        },
        {
          "actorId": "gerenteFinanceiro",
          "kind": "internal"
        },
        {
          "actorId": "pagador",
          "kind": "external"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "financeiro.Pagador",
          "namespace": "financeiro"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Pagador",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "TituloReceber",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Recebimento",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "PainelRecebiveis",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "recebimentoRegistrado",
          "on": "Recebimento.create"
        },
        {
          "eventId": "recebimentoEstornado",
          "on": "Recebimento.estornar"
        }
      ],
      "updatedAt": "2026-10-13T00:51:10.149Z"
    },
    {
      "moduleName": "hiringPipeline",
      "actors": [
        {
          "actorId": "recruiter",
          "kind": "internal"
        },
        {
          "actorId": "hiringManager",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "hiringPipeline.Candidate",
          "namespace": "hiringPipeline"
        },
        {
          "subtype": "ContactChannel",
          "roleTag": "hiringPipeline.CandidateEmail",
          "namespace": "hiringPipeline"
        },
        {
          "subtype": "Person",
          "roleTag": "hiringPipeline.HiringManager",
          "namespace": "hiringPipeline"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Candidate",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "CandidateEmail",
          "kind": "role",
          "mdmSubtype": "ContactChannel",
          "class": "mdm"
        },
        {
          "entityId": "HiringManager",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "JobPosition",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Application",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "candidateHired",
          "on": "Application.hire"
        },
        {
          "eventId": "jobPositionClosed",
          "on": "JobPosition.close"
        }
      ],
      "updatedAt": "2026-10-13T00:55:16.386Z"
    },
    {
      "moduleName": "inscricaoEvento",
      "actors": [
        {
          "actorId": "organizador",
          "kind": "internal"
        },
        {
          "actorId": "publico",
          "kind": "external"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "inscricaoEvento.Participante",
          "namespace": "inscricaoEvento"
        },
        {
          "subtype": "ContactChannel",
          "roleTag": "inscricaoEvento.EmailParticipante",
          "namespace": "inscricaoEvento"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Evento",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Inscricao",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "Participante",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "EmailParticipante",
          "kind": "role",
          "mdmSubtype": "ContactChannel",
          "class": "mdm"
        }
      ],
      "events": [
        {
          "eventId": "eventoPublicado",
          "on": "Evento.publicar"
        },
        {
          "eventId": "inscricaoRealizada",
          "on": "Inscricao.create"
        },
        {
          "eventId": "inscricaoCancelada",
          "on": "Inscricao.cancelar"
        },
        {
          "eventId": "inscricaoPromovida",
          "on": "Inscricao.promover"
        }
      ],
      "updatedAt": "2026-10-13T00:58:17.896Z"
    },
    {
      "moduleName": "locacaoEquipamentos",
      "actors": [
        {
          "actorId": "atendente",
          "kind": "internal"
        },
        {
          "actorId": "gerente",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "locacaoEquipamentos.Cliente",
          "namespace": "locacaoEquipamentos"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Cliente",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Equipamento",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "ContratoLocacao",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "ItemContrato",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "contratoLocacaoAtivado",
          "on": "ContratoLocacao.ativarContrato"
        },
        {
          "eventId": "devolucaoRegistrada",
          "on": "ContratoLocacao.registrarDevolucao"
        }
      ],
      "updatedAt": "2026-10-13T01:01:52.979Z"
    },
    {
      "moduleName": "manutencaoFrota",
      "actors": [
        {
          "actorId": "motorista",
          "kind": "internal"
        },
        {
          "actorId": "gestor",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "manutencaoFrota.Motorista",
          "namespace": "manutencaoFrota"
        },
        {
          "subtype": "Company",
          "roleTag": "manutencaoFrota.Oficina",
          "namespace": "manutencaoFrota"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Veiculo",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Motorista",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Oficina",
          "kind": "role",
          "mdmSubtype": "Company",
          "class": "mdm"
        },
        {
          "entityId": "Abastecimento",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "PlanoManutencao",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "OrdemManutencao",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "ordemManutencaoConcluida",
          "on": "OrdemManutencao.concluir"
        },
        {
          "eventId": "abastecimentoRegistrado",
          "on": "Abastecimento.create"
        }
      ],
      "updatedAt": "2026-10-13T01:05:14.988Z"
    },
    {
      "moduleName": "mensalidadesAcademia",
      "actors": [
        {
          "actorId": "recepcao",
          "kind": "internal"
        },
        {
          "actorId": "gerencia",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "mensalidadesAcademia.Aluno",
          "namespace": "mensalidadesAcademia"
        },
        {
          "subtype": "Person",
          "roleTag": "mensalidadesAcademia.Recepcao",
          "namespace": "mensalidadesAcademia"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Aluno",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Recepcao",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "Plano",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "Matricula",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Mensalidade",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "Pagamento",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "PainelMensalidades",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "matriculaRealizada",
          "on": "Matricula.create"
        },
        {
          "eventId": "matriculaCancelada",
          "on": "Matricula.cancelar"
        },
        {
          "eventId": "mensalidadeGerada",
          "on": "Mensalidade.create"
        },
        {
          "eventId": "mensalidadeQuitada",
          "on": "Mensalidade.quitar"
        }
      ],
      "updatedAt": "2026-10-13T01:09:01.349Z"
    },
    {
      "moduleName": "tarefas",
      "actors": [
        {
          "actorId": "membroEquipe",
          "kind": "internal"
        },
        {
          "actorId": "gestor",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "tarefas.Participante",
          "namespace": "tarefas"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Participante",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "ListaTarefas",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "Tarefa",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "ItemChecklist",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "tarefaConcluida",
          "on": "Tarefa.aceitar"
        },
        {
          "eventId": "tarefaCancelada",
          "on": "Tarefa.cancelar"
        }
      ],
      "updatedAt": "2026-10-23T01:12:36.704Z"
    },
    {
      "moduleName": "compras",
      "actors": [
        {
          "actorId": "comprador",
          "kind": "internal"
        },
        {
          "actorId": "gerenteCompras",
          "kind": "internal"
        },
        {
          "actorId": "almoxarife",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Company",
          "roleTag": "compras.Fornecedor",
          "namespace": "compras"
        },
        {
          "subtype": "ContactChannel",
          "roleTag": "compras.ContatoFornecedor",
          "namespace": "compras"
        },
        {
          "subtype": "Product",
          "roleTag": "compras.Produto",
          "namespace": "compras"
        },
        {
          "subtype": "Person",
          "roleTag": "compras.Comprador",
          "namespace": "compras"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Fornecedor",
          "kind": "role",
          "mdmSubtype": "Company",
          "class": "mdm"
        },
        {
          "entityId": "ContatoFornecedor",
          "kind": "role",
          "mdmSubtype": "ContactChannel",
          "class": "mdm"
        },
        {
          "entityId": "Produto",
          "kind": "role",
          "mdmSubtype": "Product",
          "class": "mdm"
        },
        {
          "entityId": "Comprador",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        },
        {
          "entityId": "ProdutoFornecido",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "SolicitacaoCompra",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "OpcaoCotacao",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "PedidoCompra",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "Recebimento",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "PainelCompras",
          "kind": "entity",
          "class": "supporting"
        }
      ],
      "events": [
        {
          "eventId": "recebimentoCompraRegistrado",
          "on": "Recebimento.create"
        },
        {
          "eventId": "pedidoCompraRecebido",
          "on": "PedidoCompra.concluirRecebimento"
        }
      ],
      "updatedAt": "2026-11-12T18:13:55.127Z"
    },
    {
      "moduleName": "agents",
      "actors": [
        {
          "actorId": "companyAdmin",
          "kind": "internal"
        },
        {
          "actorId": "organizationMember",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "agents.OrganizationUser",
          "namespace": "agents"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "Agent",
          "kind": "external"
        },
        {
          "entityId": "AgentDraft",
          "kind": "external"
        },
        {
          "entityId": "AgentBehavior",
          "kind": "external"
        },
        {
          "entityId": "PersonalConduct",
          "kind": "external"
        },
        {
          "entityId": "AgentSimulation",
          "kind": "external"
        },
        {
          "entityId": "Tool",
          "kind": "entity",
          "class": "supporting"
        },
        {
          "entityId": "AgentTool",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "PersonToolRestriction",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "ExecutionSummary",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "OrganizationUser",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        }
      ],
      "events": [],
      "updatedAt": "2026-11-18T01:14:40.523Z"
    },
    {
      "moduleName": "repoHost",
      "actors": [
        {
          "actorId": "administrador",
          "kind": "internal"
        }
      ],
      "roles": [],
      "generalFields": [],
      "entities": [
        {
          "entityId": "RepositoryEntry",
          "kind": "entity",
          "class": "core"
        },
        {
          "entityId": "RepositoryChange",
          "kind": "entity",
          "class": "event"
        }
      ],
      "events": [
        {
          "eventId": "repositorioAlterado",
          "on": "RepositoryChange.create"
        }
      ],
      "updatedAt": "2026-11-19T23:53:36.476Z"
    },
    {
      "moduleName": "conteudo",
      "actors": [
        {
          "actorId": "editor",
          "kind": "internal"
        }
      ],
      "roles": [
        {
          "subtype": "Person",
          "roleTag": "conteudo.Editor",
          "namespace": "conteudo"
        }
      ],
      "generalFields": [],
      "entities": [
        {
          "entityId": "ContentFile",
          "kind": "external"
        },
        {
          "entityId": "Publication",
          "kind": "entity",
          "class": "event"
        },
        {
          "entityId": "Editor",
          "kind": "role",
          "mdmSubtype": "Person",
          "class": "mdm"
        }
      ],
      "events": [],
      "updatedAt": "2026-11-20T05:17:01.950Z"
    }
  ]
} as const satisfies Ns4SolutionRegistryArtifact;

export type SolutionRegistryType = typeof solutionRegistry;

export default solutionRegistry;
