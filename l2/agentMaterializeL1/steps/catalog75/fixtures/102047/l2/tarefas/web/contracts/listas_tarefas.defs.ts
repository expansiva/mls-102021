/// <mls fileReference="_102047_/l2/tarefas/web/contracts/listas_tarefas.defs.ts" enhancement="_blank"/>

/** Dados descritivos e indicador de uma lista de tarefas. */
export interface ListaTarefasDetails {
  descricao?: string;
  readonly quantidadeTarefasAbertas: number;
}

/** Lista de tarefas que agrupa tarefas por projeto ou área, com nome, descrição e quantidade de tarefas abertas. */
export interface ListaTarefas {
  id: string;
  version: number;
  nome: string;
  details: ListaTarefasDetails;
}

export interface Listas_tarefasContracts {
  /**
   * Finalidade: Carrega as listas de tarefas cadastradas na organização, ordenadas pelo nome, com busca pelo nome e a quantidade de tarefas abertas de cada uma.
   * Entrada: texto: trecho opcional digitado na busca, comparado ao nome da lista; page e pageSize: página pedida e tamanho da página.
   * Processamento: Acessível apenas ao gestor (somenteGestorMantemListas). Filtra as listas cujo nome contém o texto, quando informado, e ordena pelo nome. Para cada lista calcula quantidadeTarefasAbertas contando as tarefas com listaId da lista que estão abertas, isto é, nem concluídas nem canceladas (tarefaAbertaVencimento); o valor é derivado, nunca gravado.
   * Saída: Página { items, page, pageSize, hasMore } de listas com id, version, nome, descrição e quantidade de tarefas abertas.
   */
  'tarefas.listas_tarefas.qryListasTarefas': {
    kind: 'qry';
    input: { texto?: string; page: number; pageSize: number };
    output: { listas: { items: ListaTarefas[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['somenteGestorMantemListas', 'tarefaAbertaVencimento'];
    access: { actors: ['gestor']; grants: ['gestorListas']; scope: 'organization' };
  };
  /**
   * Finalidade: Cria uma nova lista de tarefas com o nome e a descrição informados pelo gestor.
   * Entrada: nome: nome obrigatório da lista; details.descricao: texto livre opcional sobre o projeto ou a área.
   * Processamento: Recusa quem não é gestor (somenteGestorMantemListas). Exige nome preenchido e recusa nome igual ao de outra lista, informando que o nome já existe (nomeListaUnico, garantido pelo índice único). Grava a lista; quantidadeTarefasAbertas é calculada (zero para lista nova).
   * Saída: A lista criada, com id, version inicial, nome, descrição e quantidade de tarefas abertas.
   */
  'tarefas.listas_tarefas.cmdCriarLista': {
    kind: 'cmd';
    writes: 'ListaTarefas.create';
    input: { nome: string; details: { descricao?: string } };
    output: { lista: ListaTarefas };
    rules: ['nomeListaUnico', 'somenteGestorMantemListas'];
    access: { actors: ['gestor']; grants: ['gestorListas']; scope: 'organization' };
  };
  /**
   * Finalidade: Altera o nome e a descrição de uma lista de tarefas existente.
   * Entrada: id: lista alterada; version: versão lida, para controle de concorrência; nome: novo nome obrigatório; details.descricao: nova descrição opcional.
   * Processamento: Recusa quem não é gestor (somenteGestorMantemListas). Recusa versão desatualizada. Exige nome preenchido e recusa nome igual ao de outra lista (nomeListaUnico). Grava nome e descrição; quantidadeTarefasAbertas é recalculada a partir das tarefas abertas da lista, nunca gravada.
   * Saída: A lista alterada no novo estado, com id, nova version, nome, descrição e quantidade de tarefas abertas.
   */
  'tarefas.listas_tarefas.cmdSalvarLista': {
    kind: 'cmd';
    writes: 'ListaTarefas.update';
    input: { id: string; version: number; nome: string; details: { descricao?: string } };
    output: { lista: ListaTarefas };
    rules: ['nomeListaUnico', 'somenteGestorMantemListas'];
    access: { actors: ['gestor']; grants: ['gestorListas']; scope: 'organization' };
  };
}
