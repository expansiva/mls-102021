/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/shared/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "forms": {},
  "requests": {},
  "states": {},
  "functions": {
    "abrirDespesasDaEquipe": {
      "description": "Abre as despesas da equipe.",
      "navigate": "despesas_da_equipe"
    }
  },
  "journeys": [],
  "rules": {},
  "access": {
    "actors": [
      "gestorEquipe"
    ],
    "grants": []
  }
} as const;
