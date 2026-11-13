/// <mls fileReference="_102047_/l2/compras/web/shared/inicio_comprador.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "carregarInicioComprador": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "alertas",
        "solicitacoesParaEnviar"
      ]
    },
    "enviarSolicitacao": {
      "kind": "cmd",
      "trigger": "enviarSolicitacao",
      "returns": [
        "solicitacao"
      ],
      "writes": "SolicitacaoCompra.enviar"
    }
  },
  "states": {
    "alertas": {
      "source": "carregarInicioComprador.alertas",
      "description": "Resumo dos atrasos do comprador: solicitações com necessidade vencida e pedidos atrasados, com seus totais.",
      "organisms": [
        "alertasPendencias"
      ]
    },
    "solicitacoesParaEnviar": {
      "source": "carregarInicioComprador.solicitacoesParaEnviar",
      "description": "the list of Solicitação de compra do comprador com produto, quantidade, justificativa, data de necessidade, pendências da conferência e indicação de completude.",
      "organisms": [
        "solicitacoesParaEnviar"
      ]
    }
  },
  "journeys": [
    {
      "step": "abrirSolicitacao/criarSolicitacao",
      "organisms": [
        "solicitacoesParaEnviar"
      ],
      "continuesIn": "solicitacoes"
    },
    {
      "step": "abrirSolicitacao/enviarSolicitacao",
      "organisms": [
        "solicitacoesParaEnviar"
      ]
    },
    {
      "step": "abrirSolicitacao/verOpcoesPesquisadas",
      "organisms": [
        "alertasPendencias"
      ],
      "continuesIn": "solicitacoes"
    }
  ],
  "rules": [
    "quantidadePositiva",
    "solicitacaoCompletaParaEnviar"
  ],
  "access": {
    "actors": [
      "comprador"
    ],
    "grants": [
      "compradorCadastros",
      "compradorSolicitacoesPedidos"
    ]
  }
} as const;
