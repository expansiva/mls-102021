/// <mls fileReference="_102047_/l2/tarefas/web/contracts/painel_tarefas.defs.ts" enhancement="_blank"/>

/** Contagens da situação geral das tarefas da organização: abertas, que vencem hoje, atrasadas e devolvidas aguardando retomada. */
export interface IndicadoresTarefas {
  readonly tarefasAbertas: number;
  readonly vencemHoje: number;
  readonly atrasadas: number;
  readonly devolvidasPendentes: number;
}

/** Tarefa aberta de uma lista, com o título e o progresso da sua checklist. */
export interface ResumoTarefaLista {
  id: string;
  titulo: string;
  listaId: string;
  details: {
    readonly progressoChecklist?: string;
  };
}

/** Lista de tarefas (projeto ou área) com a quantidade de tarefas abertas, os totais de itens de checklist concluídos e existentes nas suas tarefas abertas, e as tarefas abertas que têm checklist. */
export interface ResumoLista {
  id: string;
  nome: string;
  details: {
    readonly quantidadeTarefasAbertas: number;
  };
  readonly itensChecklistConcluidos: number;
  readonly itensChecklistTotal: number;
  tarefas: ResumoTarefaLista[];
}

export interface Painel_tarefasContracts {
  /**
   * Finalidade: Carrega, numa única chamada, o painel do gestor: os quatro indicadores gerais das tarefas da organização e o resumo das tarefas abertas por lista com o progresso das checklists.
   * Entrada: Nenhuma entrada; o gestor é identificado pela sessão.
   * Processamento: Verifica que a pessoa da sessão é gestor pelo acesso da plataforma (gestorPorAcessoPlataforma) e considera todas as tarefas da organização, sem o filtro de membro (membroVeResponsavelOuCriador: o gestor vê todas). Conta no servidor, com tarefaAbertaVencimento: abertas (situação diferente de concluida e cancelada), que vencem hoje (abertas com prazo igual à data de hoje), atrasadas (abertas com prazo anterior a hoje) e devolvidas pendentes (em andamento, devolvidas e ainda não retomadas após a última devolução). Para cada lista, ordenada pelo nome, calcula a quantidade de tarefas abertas, conta os itens de checklist totais e concluídos das tarefas abertas da lista e traz as tarefas abertas que têm checklist com o progresso calculado (itens marcados de total). Todos esses valores são derivados e calculados na consulta, nunca gravados.
   * Saída: indicadores com as quatro contagens já calculadas; listas com cada lista de tarefas, seu nome, quantidade de tarefas abertas, totais de itens de checklist concluídos e existentes e as tarefas abertas com título e progresso da checklist.
   */
  'tarefas.painel_tarefas.carregarPainelTarefas': {
    kind: 'qry';
    input: {};
    output: { indicadores: IndicadoresTarefas; listas: ResumoLista[] };
    rules: ['tarefaAbertaVencimento', 'membroVeResponsavelOuCriador', 'gestorPorAcessoPlataforma'];
    access: { actors: ['gestor']; grants: ['gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
}
