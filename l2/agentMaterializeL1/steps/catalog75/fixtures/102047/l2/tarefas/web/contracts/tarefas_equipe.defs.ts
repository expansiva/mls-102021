/// <mls fileReference="_102047_/l2/tarefas/web/contracts/tarefas_equipe.defs.ts" enhancement="_blank"/>

/** Tarefa da organização em forma resumida, com a lista, o responsável, quem age agora e as marcas de vencimento já calculadas. */
export interface TarefaResumo {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta';
  prazo?: string;
  listaId: string;
  listaTarefas: {
    nome: string;
  };
  responsavelId: string;
  participante: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  readonly criadaEm: string;
  details: {
    readonly quemAgeAgora?: string;
    readonly venceHoje: boolean;
    readonly atrasada: boolean;
    readonly progressoChecklist: string;
  };
  readonly quemAgeAgoraNome?: string;
}

/** Quantidade de tarefas em uma situação, dentro dos filtros aplicados. */
export interface ContagemSituacao {
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  readonly quantidade: number;
}

/** Lista de tarefas identificada pelo nome. */
export interface ListaOpcao {
  id: string;
  nome: string;
}

/** Participante do módulo identificado pelo nome, com a situação na plataforma e se aceita tarefas. */
export interface ParticipanteOpcao {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    tarefas: {
      readonly aceitaTarefasEfetivo: boolean;
    };
  };
}

/** Item da checklist de uma tarefa, na sua ordem, com a marca de concluído. */
export interface ItemChecklistLinha {
  id: string;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
    readonly concluidoEm?: string;
  };
}

/** Evento do ciclo de uma tarefa (criação, início, envio para revisão, devolução, retomada, conclusão, troca de responsável ou cancelamento) com o momento em que ocorreu. */
export interface EventoTarefa {
  readonly tipo: string;
  readonly momento: string;
  details: {
    motivoDevolucao?: string;
  };
  readonly responsavelNome?: string;
}

/** Tarefa completa com lista, responsável, quem criou, quem age agora, subtarefas, checklist em ordem e o histórico de eventos. */
export interface TarefaDetalhe {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prioridade: 'baixa' | 'media' | 'alta';
  prazo?: string;
  listaId: string;
  listaTarefas: {
    nome: string;
  };
  responsavelId: string;
  participante: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  criadorId: string;
  readonly criadorNome: string;
  details: {
    readonly quemAgeAgora?: string;
    descricao?: string;
    readonly aberta: boolean;
    readonly quantidadeSubtarefas: number;
    readonly progressoChecklist: string;
  };
  readonly quemAgeAgoraNome?: string;
  readonly criadaEm: string;
  checklist: ItemChecklistLinha[];
  historico: EventoTarefa[];
}

export interface Tarefas_equipeContracts {
  /**
   * Finalidade: Carrega as opções dos filtros de lista e de responsável da visão de tarefas da equipe.
   * Entrada: Nenhuma entrada; o gestor é identificado pela sessão.
   * Processamento: Lê as listas de tarefas ordenadas pelo nome e os participantes do módulo pelo papel tarefas.Participante, ordenados pelo nome. aceitaTarefasEfetivo é calculado (participanteNaoConfiguradoAceitaECria: sem configuração vale sim), nunca gravado.
   * Saída: As listas de tarefas (id e nome) e os participantes (id, nome, situação na plataforma e se aceita tarefas).
   */
  'tarefas.tarefas_equipe.carregarFiltrosEquipe': {
    kind: 'qry';
    input: {};
    output: { listas: ListaOpcao[]; participantes: ParticipanteOpcao[] };
    rules: ['participanteNaoConfiguradoAceitaECria'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
  /**
   * Finalidade: Lista todas as tarefas da organização com os filtros do gestor, servindo tanto a visão em lista quanto o quadro por situação.
   * Entrada: listaId, responsavelId, prioridade e status: filtros opcionais por igualdade; prazoDe e prazoAte: intervalo opcional de prazo; page e pageSize: página pedida.
   * Processamento: Executa ao abrir a página (sem filtros) e a cada mudança de filtro ou página. O gestor, definido pelo acesso da plataforma (gestorPorAcessoPlataforma), vê todas as tarefas (membroVeResponsavelOuCriador). Ordena por criadaEm decrescente. Junta o nome da lista e os nomes do responsável e de quem age agora. Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), venceHoje e atrasada (tarefaAbertaVencimento) e progressoChecklist contando itens marcados sobre o total; nada disso é gravado. Conta as tarefas por situação sob os mesmos filtros, sem paginação.
   * Saída: A página de tarefas resumidas { items, page, pageSize, hasMore } e a quantidade de tarefas em cada situação para os mesmos filtros.
   */
  'tarefas.tarefas_equipe.listarTarefasEquipe': {
    kind: 'qry';
    input: { listaId?: string; responsavelId?: string; prioridade?: 'baixa' | 'media' | 'alta'; status?: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada'; prazoDe?: string; prazoAte?: string; page: number; pageSize: number };
    output: { tarefas: { items: TarefaResumo[]; page: number; pageSize: number; hasMore: boolean }; contagemPorSituacao: ContagemSituacao[] };
    rules: ['membroVeResponsavelOuCriador', 'gestorPorAcessoPlataforma', 'quemAgeAgoraPorSituacao', 'tarefaAbertaVencimento'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre uma tarefa da organização com tudo que o gestor confere antes de agir: responsável, prazo, checklist, subtarefas e histórico.
   * Entrada: tarefaId: id da tarefa escolhida na lista ou no quadro.
   * Processamento: Lê a tarefa pelo id, junta o nome da lista e os nomes do responsável, de quem criou e de quem age agora. Lista os itens da checklist pela tarefa em ordem. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta (tarefaAbertaVencimento), quantidadeSubtarefas contando as tarefas que apontam esta como pai e progressoChecklist; nada disso é gravado. Monta o histórico em ordem de tempo a partir de criadaEm, devolvidaEm com motivo, retomadaEm, concluidaEm, canceladaEm e dos eventos de mudança de situação e reatribuição da ocorrência do processo de tarefa da plataforma. Comentários e anexos não vêm daqui (moduloNaoGuardaComentarios).
   * Saída: A tarefa no estado atual, com sua checklist ordenada e o histórico de eventos em ordem de tempo.
   */
  'tarefas.tarefas_equipe.obterTarefaEquipe': {
    kind: 'qry';
    input: { tarefaId: string };
    output: { tarefa: TarefaDetalhe };
    rules: ['quemAgeAgoraPorSituacao', 'tarefaAbertaVencimento', 'moduloNaoGuardaComentarios'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca pelo nome os participantes que podem ser escolhidos como novo responsável.
   * Entrada: nome: trecho do nome digitado; vazio traz os primeiros por ordem alfabética.
   * Processamento: Filtra participantes ativos que aceitam tarefas (responsavelAceitaTarefas), com aceitaTarefasEfetivo calculado como sim quando o gestor não configurou (participanteNaoConfiguradoAceitaECria). A busca é só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome). Limita a uma quantidade curta de resultados ordenados pelo nome.
   * Saída: Os participantes elegíveis encontrados, com id, nome, situação e se aceita tarefas.
   */
  'tarefas.tarefas_equipe.buscarResponsaveisDisponiveis': {
    kind: 'qry';
    input: { nome?: string };
    output: { participantes: ParticipanteOpcao[] };
    rules: ['responsavelAceitaTarefas', 'escolhaResponsavelPeloNome', 'participanteNaoConfiguradoAceitaECria'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
  /**
   * Finalidade: Troca o responsável de uma tarefa pelo participante escolhido pelo gestor.
   * Entrada: id: tarefa a reatribuir; version: versão lida, para concorrência otimista; responsavelId: novo responsável escolhido pelo nome.
   * Processamento: Recusa quem não é o criador nem gestor pelo acesso da plataforma (reatribuirApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa responsável inativo ou que não aceita tarefas (responsavelAceitaTarefas). Recusa versão divergente. Grava só o responsável, sem mudar a situação (edicaoNaoMudaSituacao). Quando a tarefa está a fazer ou em andamento, o novo responsável passa a ser quem age agora (quemAgeAgoraPorSituacao, calculado, não gravado) e a ocorrência do processo da plataforma troca e avisa essa pessoa (avisarQuemAgeAgora).
   * Saída: A tarefa no novo estado, com o novo responsável, quem age agora recalculado, checklist e histórico incluindo a troca.
   */
  'tarefas.tarefas_equipe.trocarResponsavelTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.update';
    input: { id: string; version: number; responsavelId: string };
    output: { tarefa: TarefaDetalhe };
    rules: ['reatribuirApenasCriadorOuGestor', 'gestorPorAcessoPlataforma', 'responsavelAceitaTarefas', 'edicaoNaoMudaSituacao', 'quemAgeAgoraPorSituacao', 'avisarQuemAgeAgora'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
  /**
   * Finalidade: Cancela uma tarefa ainda aberta a pedido do gestor.
   * Entrada: id: tarefa a cancelar; version: versão lida, para concorrência otimista.
   * Processamento: Recusa quem não é o criador nem gestor pelo acesso da plataforma e recusa tarefa que não está a fazer, em andamento ou em revisão (cancelarApenasCriadorOuGestor, gestorPorAcessoPlataforma). Recusa versão divergente. Aplica a transição cancelar, levando a situação a cancelada e registrando canceladaEm. Antes de trocar, identifica quem estava agindo e o processo da plataforma o avisa (avisarQuemAgeAgora); depois quem age agora passa a ser ninguém (quemAgeAgoraPorSituacao, calculado).
   * Saída: A tarefa cancelada, não mais aberta, sem quem age agora, com checklist e histórico incluindo o cancelamento.
   */
  'tarefas.tarefas_equipe.cancelarTarefaEquipe': {
    kind: 'cmd';
    writes: 'Tarefa.cancelar';
    input: { id: string; version: number };
    output: { tarefa: TarefaDetalhe };
    rules: ['cancelarApenasCriadorOuGestor', 'gestorPorAcessoPlataforma', 'avisarQuemAgeAgora', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes', 'gestorListas', 'gestorTodasTarefas']; scope: 'organization' };
  };
}
