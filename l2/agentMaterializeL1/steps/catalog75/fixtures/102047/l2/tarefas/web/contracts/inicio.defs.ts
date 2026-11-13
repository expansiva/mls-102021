/// <mls fileReference="_102047_/l2/tarefas/web/contracts/inicio.defs.ts" enhancement="_blank"/>

/** Identificação de um participante reduzida ao nome lido da plataforma. */
export interface ParticipanteIdentificacaoResumo {
  name: string;
}

/** Detalhes de um participante com apenas a identificação pelo nome. */
export interface ParticipanteNomeDetalhes {
  identification: ParticipanteIdentificacaoResumo;
}

/** Participante identificado pelo nome, como responsável ou quem criou uma tarefa. */
export interface ParticipanteNome {
  id: string;
  details: ParticipanteNomeDetalhes;
}

/** Lista de tarefas (projeto ou área) identificada pelo nome. */
export interface ListaTarefasNome {
  id: string;
  nome: string;
}

/** Detalhes de uma tarefa pendente: quem age agora, devolução, progresso da checklist e vencimento. */
export interface PendenciaTarefaDetalhes {
  readonly quemAgeAgora?: string;
  readonly devolvidaPendente: boolean;
  motivoDevolucao?: string;
  readonly progressoChecklist: string;
  readonly venceHoje: boolean;
  readonly atrasada: boolean;
}

/** Tarefa que depende de uma pessoa agora, com situação, prazo, prioridade, lista, responsável, quem criou, progresso da checklist e motivo da devolução. */
export interface PendenciaTarefa {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prazo?: string;
  prioridade: 'baixa' | 'media' | 'alta';
  listaId: string;
  responsavelId: string;
  criadorId: string;
  readonly criadaEm: string;
  details: PendenciaTarefaDetalhes;
  listaTarefas: ListaTarefasNome;
  responsavel: ParticipanteNome;
  criador: ParticipanteNome;
}

/** Detalhes de vencimento e progresso de uma tarefa aberta. */
export interface AlertaPrazoDetalhes {
  readonly aberta: boolean;
  readonly venceHoje: boolean;
  readonly atrasada: boolean;
  readonly progressoChecklist: string;
}

/** Tarefa aberta que vence hoje ou está atrasada, com título, prazo e situação. */
export interface AlertaPrazo {
  id: string;
  titulo: string;
  prazo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  details: AlertaPrazoDetalhes;
}

/** Contadores das tarefas de uma pessoa: abertas, que vencem hoje, atrasadas e devolvidas aguardando retomada. */
export interface IndicadoresTarefas {
  readonly abertas: number;
  readonly vencemHoje: number;
  readonly atrasadas: number;
  readonly devolvidasPendentes: number;
}

/** Marcas efetivas de aceitar e de criar tarefas de um participante. */
export interface PermissoesTarefas {
  readonly aceitaTarefasEfetivo: boolean;
  readonly podeCriarTarefasEfetivo: boolean;
}

/** Nome e marcas efetivas de tarefas de um participante. */
export interface PermissoesParticipanteDetalhes {
  identification: ParticipanteIdentificacaoResumo;
  tarefas: PermissoesTarefas;
}

/** Participante com seu nome e se aceita e pode criar tarefas (efetivo). */
export interface PermissoesParticipante {
  details: PermissoesParticipanteDetalhes;
}

export interface InicioContracts {
  /**
   * Finalidade: Carrega de uma vez a tela inicial do membro: o que depende dele agora, os prazos de hoje e atrasados, os contadores das suas tarefas e as suas marcas de aceitar e criar tarefas.
   * Entrada: Nenhuma entrada; a pessoa da sessão é identificada pelo servidor.
   * Processamento: Restringe às tarefas visíveis ao membro (membroVeResponsavelOuCriador). Pendências: tarefas cujo quemAgeAgora calculado é a pessoa da sessão (quemAgeAgoraPorSituacao) — a fazer ou em andamento como responsável, em revisão como quem criou — incluindo as em andamento devolvidas e ainda não retomadas (devolvidaPendente, retomarSoAposDevolucao), ordenadas por prazo e criadaEm, com nome da lista, nomes do responsável e de quem criou e progressoChecklist calculado pela contagem dos itens. Alertas: tarefas abertas de que a pessoa é responsável que vencem hoje ou estão atrasadas (tarefaAbertaVencimento, mesmo critério do resumo das 8h de resumoDiarioOitoHoras), ordenadas por prazo. Indicadores: contagens no servidor de abertas, vencem hoje, atrasadas e devolvidas pendentes entre as tarefas de que a pessoa é responsável. Permissões: lê o participante da sessão e calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo como a marca do gestor ou sim quando não configurado (participanteNaoConfiguradoAceitaECria). Campos derivados são calculados, nunca gravados.
   * Saída: Lista de pendências com situação, prazo, prioridade, lista, responsável, quem criou, progresso e motivo da devolução; lista de alertas de prazo; os quatro contadores já calculados; e o nome com as marcas efetivas da pessoa da sessão.
   */
  'tarefas.inicio.carregarInicio': {
    kind: 'qry';
    input: {};
    output: { pendencias: PendenciaTarefa[]; alertas: AlertaPrazo[]; indicadores: IndicadoresTarefas; permissoes: PermissoesParticipante };
    rules: ['membroVeResponsavelOuCriador', 'quemAgeAgoraPorSituacao', 'retomarSoAposDevolucao', 'tarefaAbertaVencimento', 'resumoDiarioOitoHoras', 'participanteNaoConfiguradoAceitaECria'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Inicia uma tarefa a fazer de que a pessoa da sessão é responsável.
   * Entrada: id: tarefa a iniciar; version: versão lida, para controle de concorrência.
   * Processamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta) ou se a situação não for aFazer, ou se a versão divergir. Executa a transição iniciar para emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao, calculado). Recalcula os contadores da pessoa.
   * Saída: A tarefa na nova situação em andamento, com lista, nomes, progresso e campos derivados recalculados, e os contadores atualizados da pessoa.
   */
  'tarefas.inicio.iniciarTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.iniciar';
    input: { id: string; version: number };
    output: { tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas };
    rules: ['apenasResponsavelExecuta', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Envia para revisão (ou reenvia após devolução) uma tarefa em andamento de que a pessoa da sessão é responsável.
   * Entrada: id: tarefa a enviar; version: versão lida, para controle de concorrência.
   * Processamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a situação não for emAndamento ou se a versão divergir. Executa a transição enviarParaRevisao para emRevisao; quem criou passa a ser quem age agora (quemAgeAgoraPorSituacao) e é avisado pelo processo da tarefa (avisarQuemAgeAgora), sem iniciar novo aviso para quem já tem um em andamento (avisoNaoSobrepostoPorPessoa). Recalcula os contadores.
   * Saída: A tarefa em revisão, com quem age agora já sendo quem criou, e os contadores atualizados da pessoa.
   */
  'tarefas.inicio.enviarRevisao': {
    kind: 'cmd';
    writes: 'Tarefa.enviarParaRevisao';
    input: { id: string; version: number };
    output: { tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas };
    rules: ['apenasResponsavelExecuta', 'avisarQuemAgeAgora', 'avisoNaoSobrepostoPorPessoa', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Aceita a entrega de uma tarefa em revisão criada pela pessoa da sessão, concluindo-a.
   * Entrada: id: tarefa a aceitar; version: versão lida, para controle de concorrência.
   * Processamento: Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao ou se a versão divergir. Executa a transição aceitar para concluida; quem age agora passa a ser ninguém e a tarefa deixa de ser aberta (calculados). Recalcula os contadores.
   * Saída: A tarefa concluída, sem quem aja agora, e os contadores atualizados da pessoa.
   */
  'tarefas.inicio.aceitarTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.aceitar';
    input: { id: string; version: number };
    output: { tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas };
    rules: ['apenasCriadorRevisa', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Devolve ao responsável, com o motivo, uma tarefa em revisão criada pela pessoa da sessão.
   * Entrada: id: tarefa a devolver; version: versão lida; details.motivoDevolucao: texto obrigatório explicando o que corrigir.
   * Processamento: Recusa se a pessoa da sessão não for quem criou (apenasCriadorRevisa), se a situação não for emRevisao, se a versão divergir ou se o motivo vier vazio (devolucaoExigeMotivo). Executa a transição devolver para emAndamento gravando o motivo; o sistema preenche devolvidaEm. O responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora, sem sobrepor aviso em andamento — avisoNaoSobrepostoPorPessoa). devolvidaPendente passa a verdadeiro por cálculo. Recalcula os contadores.
   * Saída: A tarefa em andamento com o motivo da devolução e quem age agora sendo o responsável, e os contadores atualizados da pessoa.
   */
  'tarefas.inicio.devolverTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.devolver';
    input: { id: string; version: number; details: { motivoDevolucao: string } };
    output: { tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas };
    rules: ['apenasCriadorRevisa', 'devolucaoExigeMotivo', 'avisarQuemAgeAgora', 'avisoNaoSobrepostoPorPessoa', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Retoma uma tarefa devolvida de que a pessoa da sessão é responsável, para continuar o trabalho.
   * Entrada: id: tarefa a retomar; version: versão lida, para controle de concorrência.
   * Processamento: Recusa se a pessoa da sessão não for o responsável (apenasResponsavelExecuta), se a versão divergir ou se a tarefa não estiver em andamento devolvida e ainda não retomada após a devolução (retomarSoAposDevolucao). Executa a transição retomar, mantendo emAndamento; o sistema preenche retomadaEm e devolvidaPendente passa a falso por cálculo. Recalcula os contadores.
   * Saída: A tarefa em andamento já retomada, com o motivo da última devolução, e os contadores atualizados da pessoa.
   */
  'tarefas.inicio.retomarTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.retomar';
    input: { id: string; version: number };
    output: { tarefa: PendenciaTarefa; indicadores: IndicadoresTarefas };
    rules: ['apenasResponsavelExecuta', 'retomarSoAposDevolucao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
}
