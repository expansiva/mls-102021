/// <mls fileReference="_102047_/l2/comandaRestaurante/web/contracts/inicio.defs.ts" enhancement="_blank"/>

/** Indicadores consolidados da operação do restaurante para a visão geral. */
export interface ResumoOperacional {
  readonly mesasDisponiveis: number;
  readonly valorComandasAbertas: number;
}

export interface InicioContracts {
  /**
   * Finalidade: Carrega os indicadores consolidados que caixa e garçom usam para consultar rapidamente a disponibilidade das mesas e o valor ainda em atendimento.
   * Entrada: Não recebe parâmetros: o resumo considera toda a operação da organização acessível ao ator.
   * Processamento: Conta as mesas cuja disponibilidade calculada é verdadeira. Filtra as comandas com situação aberta e calcula o valor das comandas em aberto pela soma de seus subtotais; cada subtotal é derivado apenas dos valores totais dos itens não cancelados, conforme a regra subtotalComandaCalculado. Retorna somente os indicadores, sem transferir listas de mesas, comandas ou itens.
   * Saída: Retorna o resumo operacional já agregado para renderização direta dos destaques da página, com a quantidade de mesas disponíveis e o valor total das comandas abertas.
   */
  'comandaRestaurante.inicio.carregarResumoOperacional': {
    kind: 'qry';
    input: {};
    output: { resumoOperacional: ResumoOperacional };
    rules: ['subtotalComandaCalculado'];
    access: { actors: ['caixa', 'garcom']; grants: ['garcomAtendimentoComandas', 'caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
}
