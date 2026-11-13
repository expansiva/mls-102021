/// <mls fileReference="_102047_/l2/tarefas/web/contracts/minhas_tarefas.defs.ts" enhancement="_blank"/>

/** Lista de tarefas identificada pelo nome. */
export interface ListaTarefasNome {
  id: string;
  nome: string;
}

/** Participante identificado pelo nome lido da plataforma. */
export interface ParticipanteNome {
  id: string;
  details: {
    identification: {
      name: string;
    };
  };
}

/** Participante ativo que pode ser escolhido como responsável, com sua situação e se aceita tarefas. */
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

/** Tarefa em forma resumida, com lista, responsável, quem criou, quem age agora, progresso da checklist e marcações de vencimento e devolução. */
export interface TarefaResumo {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prazo?: string;
  prioridade: 'baixa' | 'media' | 'alta';
  listaId: string;
  listaTarefas: ListaTarefasNome;
  responsavelId: string;
  responsavel: ParticipanteNome;
  criadorId: string;
  criador: ParticipanteNome;
  details: {
    readonly quemAgeAgora?: string;
    readonly progressoChecklist: string;
    readonly venceHoje: boolean;
    readonly atrasada: boolean;
    readonly devolvidaPendente: boolean;
    readonly aberta: boolean;
  };
  readonly quemAgeAgoraNome?: string;
  readonly criadaEm: string;
}

/** Item marcável da checklist de uma tarefa. */
export interface ItemChecklistLinha {
  id: string;
  version: number;
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
    readonly concluidoEm?: string;
  };
}

/** Tarefa pai identificada pelo título. */
export interface TarefaPaiRef {
  id: string;
  titulo: string;
}

/** Tarefa com todos os seus campos, nomes do responsável e de quem criou, lista, tarefa pai, marcos de devolução, retomada, conclusão e cancelamento, papel da pessoa da sessão e a checklist em ordem. */
export interface TarefaCompleta {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  details: {
    descricao?: string;
    etiquetas?: string;
    readonly quantidadeSubtarefas: number;
    readonly progressoChecklist: string;
    motivoDevolucao?: string;
    devolvidaEm?: string;
    retomadaEm?: string;
    concluidaEm?: string;
    canceladaEm?: string;
    readonly quemAgeAgora?: string;
    readonly devolvidaPendente: boolean;
    readonly aberta: boolean;
  };
  prazo?: string;
  prioridade: 'baixa' | 'media' | 'alta';
  listaId: string;
  listaTarefas: ListaTarefasNome;
  responsavelId: string;
  responsavel: ParticipanteNome;
  criadorId: string;
  criador: ParticipanteNome;
  readonly criadaEm: string;
  tarefaPaiId?: string;
  tarefaPai?: TarefaPaiRef;
  readonly quemAgeAgoraNome?: string;
  readonly souResponsavel: boolean;
  readonly souCriador: boolean;
  itens: ItemChecklistLinha[];
}

/** Marco do ciclo de uma tarefa: criação, início, envio para revisão, devolução com motivo, retomada, aceite, troca de responsável ou cancelamento, com momento e pessoa envolvida. */
export interface EventoHistorico {
  readonly tipo: string;
  readonly momento: string;
  status?: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  readonly responsavelNome?: string;
  details: {
    motivoDevolucao?: string;
  };
}

/** Novo item marcável a acrescentar à checklist de uma tarefa. */
export interface ItemChecklistNovo {
  ordem: number;
  details: {
    descricao: string;
    concluido: boolean;
  };
}

/** Alteração de um item existente da checklist: descrição, ordem ou marcação. */
export interface ItemChecklistAjuste {
  id: string;
  version: number;
  ordem?: number;
  details: {
    descricao?: string;
    concluido?: boolean;
  };
}

export interface Minhas_tarefasContracts {
  /**
   * Finalidade: Carrega a abertura de minhas tarefas: a primeira página do que depende da pessoa da sessão agora, os totais de cada grupo e de vencimento, e se ela pode criar tarefas.
   * Entrada: page e pageSize: página e tamanho da página do grupo ’depende de mim agora’.
   * Processamento: Filtra as tarefas em que a pessoa da sessão é quem age agora (membroVeResponsavelOuCriador), ordenadas por atrasada, vence hoje e criadaEm. quemAgeAgora é calculado pela situação (quemAgeAgoraPorSituacao); aberta, venceHoje e atrasada são calculados pela data de hoje (tarefaAbertaVencimento); progressoChecklist conta itens concluídos sobre o total. Conta no servidor as tarefas abertas de que é responsável, as que criou, as que dependem dela, as que vencem hoje e as atrasadas. possoCriar é a marca efetiva de poder criar tarefas da pessoa da sessão, valendo sim quando não configurada (participanteNaoConfiguradoAceitaECria, criarTarefaExigePodeCriar). Campos derivados são calculados, nunca gravados.
   * Saída: Página { items, page, pageSize, hasMore } de tarefas resumidas que dependem da pessoa agora, os totais por grupo e de vencimento e o indicador podeCriarTarefasEfetivo.
   */
  'tarefas.minhas_tarefas.qryMinhasTarefas': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { tarefas: { items: TarefaResumo[]; page: number; pageSize: number; hasMore: boolean }; readonly quantidadeDependeDeMim: number; readonly quantidadeResponsavel: number; readonly quantidadeCriadas: number; readonly quantidadeVenceHoje: number; readonly quantidadeAtrasadas: number; readonly podeCriarTarefasEfetivo: boolean };
    rules: ['membroVeResponsavelOuCriador', 'quemAgeAgoraPorSituacao', 'tarefaAbertaVencimento', 'participanteNaoConfiguradoAceitaECria', 'criarTarefaExigePodeCriar'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Busca uma página das tarefas da pessoa da sessão num grupo: responsável, criadas ou depende de mim agora.
   * Entrada: grupo: ’responsavel’, ’criadas’ ou ’dependeDeMim’; page e pageSize: página pedida e tamanho.
   * Processamento: Filtra por responsavelId, criadorId ou quemAgeAgora igual à pessoa da sessão conforme o grupo (membroVeResponsavelOuCriador), abertas primeiro, atrasadas e que vencem hoje antes, depois criadaEm. Calcula quemAgeAgora (quemAgeAgoraPorSituacao), aberta, venceHoje, atrasada (tarefaAbertaVencimento), devolvidaPendente e progressoChecklist; nada é gravado.
   * Saída: Página { items, page, pageSize, hasMore } de tarefas resumidas do grupo pedido.
   */
  'tarefas.minhas_tarefas.qryTarefasDoGrupo': {
    kind: 'qry';
    input: { grupo: string; page: number; pageSize: number };
    output: { tarefas: { items: TarefaResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['membroVeResponsavelOuCriador', 'quemAgeAgoraPorSituacao', 'tarefaAbertaVencimento'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Abre uma tarefa com seus dados, checklist, papel da pessoa da sessão e histórico.
   * Entrada: tarefaId: id da tarefa escolhida na lista ou vinda de um aviso.
   * Processamento: Lê a tarefa pelo id e recusa se a pessoa da sessão não for responsável, quem criou nem quem age agora (membroVeResponsavelOuCriador). Compõe nomes do responsável, de quem criou e de quem age agora, nome da lista, título da tarefa pai, quantidade de subtarefas, progressoChecklist e os itens da checklist em ordem (itemChecklistSoQuemVeTarefa). Calcula quemAgeAgora pela situação (quemAgeAgoraPorSituacao), souResponsavel e souCriador comparando com a pessoa da sessão. Monta o histórico pelos marcos da tarefa e do processo da plataforma, em ordem de tempo; comentários e anexos ficam na conversa da plataforma (moduloNaoGuardaComentarios).
   * Saída: A tarefa completa com a checklist em ordem e a lista de eventos do histórico em ordem cronológica.
   */
  'tarefas.minhas_tarefas.qryTarefa': {
    kind: 'qry';
    input: { tarefaId: string };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['membroVeResponsavelOuCriador', 'quemAgeAgoraPorSituacao', 'itemChecklistSoQuemVeTarefa', 'moduloNaoGuardaComentarios'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Busca pelo nome os participantes que podem ser escolhidos como responsável.
   * Entrada: busca: trecho do nome digitado; vazio traz os primeiros por nome.
   * Processamento: Filtra participantes com o papel tarefas.Participante, situação Active e aceitaTarefasEfetivo verdadeiro, valendo sim quando não configurado (responsavelAceitaTarefas, participanteNaoConfiguradoAceitaECria). Busca só pelo nome, nunca pelo e-mail (escolhaResponsavelPeloNome), e não expõe outro dado pessoal (participanteSemCadastroPessoal). Limita a uma quantidade curta, ordenada por nome.
   * Saída: Participantes elegíveis com id, nome, situação e aceita tarefas efetivo.
   */
  'tarefas.minhas_tarefas.qryResponsaveis': {
    kind: 'qry';
    input: { busca?: string };
    output: { participantes: ParticipanteOpcao[] };
    rules: ['escolhaResponsavelPeloNome', 'responsavelAceitaTarefas', 'participanteNaoConfiguradoAceitaECria', 'participanteSemCadastroPessoal'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Busca as listas de tarefas pelo nome para escolher a lista da tarefa.
   * Entrada: busca: trecho do nome da lista; vazio traz as primeiras por nome.
   * Processamento: Busca listas pelo texto no nome, ordenadas por nome, limitadas a uma quantidade curta.
   * Saída: Listas com id e nome.
   */
  'tarefas.minhas_tarefas.qryListas': {
    kind: 'qry';
    input: { busca?: string };
    output: { listas: ListaTarefasNome[] };
    rules: [];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Cria uma nova tarefa em a fazer com o responsável escolhido.
   * Entrada: titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId opcional e details.etiquetas da nova tarefa; criadorId: quem cria, que precisa ser a própria pessoa da sessão.
   * Processamento: Recusa se a pessoa da sessão não puder criar tarefas pela marca efetiva (criarTarefaExigePodeCriar, podeCriarTarefasExigido, participanteNaoConfiguradoAceitaECria) e recusa criadorId diferente da pessoa da sessão: quem criou é sempre ela (criarTarefaExigePodeCriar). Recusa responsável que não seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome) e tarefa pai inválida (tarefaPaiDiferenteDaPropria). Grava com status aFazer; criadaEm é preenchido pelo sistema. Abre a ocorrência do processo da tarefa e avisa o responsável (avisarQuemAgeAgora).
   * Saída: A tarefa criada, em a fazer, completa e com checklist vazia, e seu histórico com o evento de criação.
   */
  'tarefas.minhas_tarefas.cmdCriarTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.create';
    input: { titulo: string; details: { descricao?: string; etiquetas?: string }; prioridade: 'baixa' | 'media' | 'alta'; prazo?: string; listaId: string; responsavelId: string; criadorId: string; tarefaPaiId?: string };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['criarTarefaExigePodeCriar', 'podeCriarTarefasExigido', 'participanteNaoConfiguradoAceitaECria', 'responsavelAceitaTarefas', 'escolhaResponsavelPeloNome', 'tarefaPaiDiferenteDaPropria', 'avisarQuemAgeAgora'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Acrescenta itens marcáveis à checklist de uma tarefa.
   * Entrada: tarefaId: tarefa que recebe os itens; itens: ordem, descrição e marcação inicial de concluído de cada novo item (normalmente falso).
   * Processamento: Recusa se a pessoa da sessão não vê a tarefa (itemChecklistSoQuemVeTarefa) ou se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada). Grava os itens todos juntos com a marcação informada; concluidoEm é preenchido pelo sistema quando o item já vem marcado. A situação da tarefa não muda (marcarItemNaoMudaSituacao). progressoChecklist é recalculado, nunca gravado.
   * Saída: A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico.
   */
  'tarefas.minhas_tarefas.cmdAdicionarItensChecklist': {
    kind: 'cmd';
    writes: 'ItemChecklist.create';
    input: { tarefaId: string; itens: ItemChecklistNovo[] };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['itemChecklistSoQuemVeTarefa', 'itemChecklistTarefaNaoEncerrada', 'marcarItemNaoMudaSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Salva os campos ajustados de uma tarefa e, quando muda, troca o responsável, sem mudar a situação.
   * Entrada: id e version da tarefa; titulo, details.descricao, prioridade, prazo, listaId, responsavelId, tarefaPaiId e details.etiquetas com os novos valores.
   * Processamento: Recusa se a pessoa não vê a tarefa (membroVeResponsavelOuCriador) ou se a version mudou. Nunca altera status (edicaoNaoMudaSituacao). Se responsavelId mudou, exige que a pessoa seja quem criou (reatribuirApenasCriadorOuGestor) e que o novo seja participante ativo que aceita tarefas (responsavelAceitaTarefas, escolhaResponsavelPeloNome), e avisa o novo responsável quando ele passa a agir agora (avisarQuemAgeAgora). Recusa tarefa pai igual à própria ou a uma subtarefa (tarefaPaiDiferenteDaPropria).
   * Saída: A tarefa completa nos novos valores, com a mesma situação, e seu histórico incluindo a troca de responsável quando houver.
   */
  'tarefas.minhas_tarefas.cmdSalvarAlteracoes': {
    kind: 'cmd';
    writes: 'Tarefa.update';
    input: { id: string; version: number; titulo: string; details: { descricao?: string; etiquetas?: string }; prioridade: 'baixa' | 'media' | 'alta'; prazo?: string; listaId: string; responsavelId: string; tarefaPaiId?: string };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['edicaoNaoMudaSituacao', 'membroVeResponsavelOuCriador', 'reatribuirApenasCriadorOuGestor', 'responsavelAceitaTarefas', 'escolhaResponsavelPeloNome', 'tarefaPaiDiferenteDaPropria', 'avisarQuemAgeAgora'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Edita, reordena, marca ou desmarca itens da checklist de uma tarefa.
   * Entrada: tarefaId: tarefa dos itens; itens: id, version e os novos valores de ordem, descrição ou concluído de cada item.
   * Processamento: Recusa se a pessoa não vê a tarefa (itemChecklistSoQuemVeTarefa), se a tarefa está concluída ou cancelada (itemChecklistTarefaNaoEncerrada), se algum item não pertence à tarefa ou se a version mudou. Grava os itens; concluidoEm é preenchido pelo sistema ao marcar e limpo ao desmarcar. A situação da tarefa não muda (marcarItemNaoMudaSituacao).
   * Saída: A tarefa completa com a checklist atualizada e o novo progresso, e seu histórico.
   */
  'tarefas.minhas_tarefas.cmdAjustarChecklist': {
    kind: 'cmd';
    writes: 'ItemChecklist.update';
    input: { tarefaId: string; itens: ItemChecklistAjuste[] };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['itemChecklistSoQuemVeTarefa', 'itemChecklistTarefaNaoEncerrada', 'marcarItemNaoMudaSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Inicia a tarefa de que a pessoa é responsável.
   * Entrada: id e version da tarefa.
   * Processamento: Recusa se a pessoa da sessão não é o responsável (apenasResponsavelExecuta), se a tarefa não está em aFazer ou se a version mudou. Passa a emAndamento; o responsável continua sendo quem age agora (quemAgeAgoraPorSituacao).
   * Saída: A tarefa completa em andamento e seu histórico com o início.
   */
  'tarefas.minhas_tarefas.cmdIniciar': {
    kind: 'cmd';
    writes: 'Tarefa.iniciar';
    input: { id: string; version: number };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['apenasResponsavelExecuta', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Envia para revisão de quem criou a tarefa em andamento do responsável.
   * Entrada: id e version da tarefa.
   * Processamento: Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a tarefa não está emAndamento ou se a version mudou. Passa a emRevisao; quem criou passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).
   * Saída: A tarefa completa em revisão e seu histórico com o envio.
   */
  'tarefas.minhas_tarefas.cmdEnviarParaRevisao': {
    kind: 'cmd';
    writes: 'Tarefa.enviarParaRevisao';
    input: { id: string; version: number };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['apenasResponsavelExecuta', 'quemAgeAgoraPorSituacao', 'avisarQuemAgeAgora'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Aceita a entrega de uma tarefa em revisão criada pela pessoa.
   * Entrada: id e version da tarefa.
   * Processamento: Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao ou se a version mudou. Passa a concluida e registra concluidaEm; ninguém age agora (quemAgeAgoraPorSituacao).
   * Saída: A tarefa completa concluída e seu histórico com o aceite.
   */
  'tarefas.minhas_tarefas.cmdAceitar': {
    kind: 'cmd';
    writes: 'Tarefa.aceitar';
    input: { id: string; version: number };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['apenasCriadorRevisa', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Devolve ao responsável, com motivo, uma tarefa em revisão criada pela pessoa.
   * Entrada: id e version da tarefa; details.motivoDevolucao: o que precisa ser corrigido.
   * Processamento: Recusa se a pessoa não é quem criou (apenasCriadorRevisa), se a tarefa não está emRevisao, se a version mudou ou se o motivo está vazio (devolucaoExigeMotivo). Grava o motivo, registra devolvidaEm e volta a emAndamento; o responsável passa a agir agora (quemAgeAgoraPorSituacao) e é avisado (avisarQuemAgeAgora).
   * Saída: A tarefa completa em andamento com o motivo da devolução e devolvida aguardando retomada, e seu histórico com a devolução.
   */
  'tarefas.minhas_tarefas.cmdDevolver': {
    kind: 'cmd';
    writes: 'Tarefa.devolver';
    input: { id: string; version: number; details: { motivoDevolucao: string } };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['apenasCriadorRevisa', 'devolucaoExigeMotivo', 'quemAgeAgoraPorSituacao', 'avisarQuemAgeAgora'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Retoma a tarefa devolvida para continuar o trabalho.
   * Entrada: id e version da tarefa.
   * Processamento: Recusa se a pessoa não é o responsável (apenasResponsavelExecuta), se a version mudou ou se a tarefa não está emAndamento devolvida e ainda não retomada (retomarSoAposDevolucao). Registra retomadaEm e mantém emAndamento; devolvidaPendente passa a falso por cálculo.
   * Saída: A tarefa completa em andamento já retomada e seu histórico com a retomada.
   */
  'tarefas.minhas_tarefas.cmdRetomar': {
    kind: 'cmd';
    writes: 'Tarefa.retomar';
    input: { id: string; version: number };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['apenasResponsavelExecuta', 'retomarSoAposDevolucao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
  /**
   * Finalidade: Cancela uma tarefa criada pela pessoa.
   * Entrada: id e version da tarefa.
   * Processamento: Recusa se a pessoa não é quem criou nem gestor (cancelarApenasCriadorOuGestor), se a tarefa não está em aFazer, emAndamento ou emRevisao ou se a version mudou. Passa a cancelada e registra canceladaEm; quem estava agindo é avisado (avisarQuemAgeAgora) e ninguém age agora (quemAgeAgoraPorSituacao).
   * Saída: A tarefa completa cancelada e seu histórico com o cancelamento.
   */
  'tarefas.minhas_tarefas.cmdCancelar': {
    kind: 'cmd';
    writes: 'Tarefa.cancelar';
    input: { id: string; version: number };
    output: { tarefa: TarefaCompleta; historico: EventoHistorico[] };
    rules: ['cancelarApenasCriadorOuGestor', 'avisarQuemAgeAgora', 'quemAgeAgoraPorSituacao'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroChecklistPropria', 'membroEscolherResponsavel', 'membroConsultarListas']; scope: 'own' };
  };
}
