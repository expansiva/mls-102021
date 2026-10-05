/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/inicio.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "requestService",
  "artifactId": "inicio",
  "moduleName": "comandaRestaurante",
  "status": "pending",
  "dependencies": [],
  "data": {
    "pageId": "inicio",
    "requests": [
      {
        "route": "comandaRestaurante.inicio.carregarResumoOperacional",
        "kind": "qry",
        "uses": [],
        "transaction": "none",
        "output": [
          {
            "kind": "computed",
            "path": "resumoOperacional",
            "rules": [
              "subtotalComandaCalculado"
            ]
          }
        ],
        "params": [],
        "rules": [
          "subtotalComandaCalculado"
        ],
        "doc": {
          "raw": "Finalidade: Carrega os indicadores consolidados que caixa e garçom usam para consultar rapidamente a disponibilidade das mesas e o valor ainda em atendimento.\nEntrada: Não recebe parâmetros: o resumo considera toda a operação da organização acessível ao ator.\nProcessamento: Conta as mesas cuja disponibilidade calculada é verdadeira. Filtra as comandas com situação aberta e calcula o valor das comandas em aberto pela soma de seus subtotais; cada subtotal é derivado apenas dos valores totais dos itens não cancelados, conforme a regra subtotalComandaCalculado. Retorna somente os indicadores, sem transferir listas de mesas, comandas ou itens.\nSaída: Retorna o resumo operacional já agregado para renderização direta dos destaques da página, com a quantidade de mesas disponíveis e o valor total das comandas abertas.",
          "purpose": "Carrega os indicadores consolidados que caixa e garçom usam para consultar rapidamente a disponibilidade das mesas e o valor ainda em atendimento.",
          "input": "Não recebe parâmetros: o resumo considera toda a operação da organização acessível ao ator.",
          "processing": "Conta as mesas cuja disponibilidade calculada é verdadeira. Filtra as comandas com situação aberta e calcula o valor das comandas em aberto pela soma de seus subtotais; cada subtotal é derivado apenas dos valores totais dos itens não cancelados, conforme a regra subtotalComandaCalculado. Retorna somente os indicadores, sem transferir listas de mesas, comandas ou itens.",
          "output": "Retorna o resumo operacional já agregado para renderização direta dos destaques da página, com a quantidade de mesas disponíveis e o valor total das comandas abertas."
        }
      }
    ]
  }
} as const;

export default definition;
