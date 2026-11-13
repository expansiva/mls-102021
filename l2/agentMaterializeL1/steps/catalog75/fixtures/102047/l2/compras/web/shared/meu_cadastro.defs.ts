/// <mls fileReference="_102047_/l2/compras/web/shared/meu_cadastro.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "qryMeuCadastro": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "comprador"
      ]
    }
  },
  "states": {
    "comprador": {
      "source": "qryMeuCadastro.comprador",
      "description": "Cadastro do comprador da sessão com nome, situação e e-mail de acesso.",
      "organisms": [
        "meuCadastroComprador"
      ]
    }
  },
  "journeys": [],
  "rules": [],
  "access": {
    "actors": [
      "comprador"
    ],
    "grants": [
      "compradorProprioRegistro",
      "compradorListaCompradores"
    ]
  }
} as const;
