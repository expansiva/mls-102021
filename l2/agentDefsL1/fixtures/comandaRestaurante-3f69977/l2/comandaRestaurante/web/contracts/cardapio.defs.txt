/// <mls fileReference="_102047_/l2/comandaRestaurante/web/contracts/cardapio.defs.ts" enhancement="_blank"/>

/** Detalhes comerciais do item do cardápio exibidos e editados na página. */
export interface DetalhesItemCardapio {
  details: {
    precoVigente: string;
  };
}

/** Dados de um item exibidos no catálogo do cardápio. */
export interface ItemCardapioResumo {
  id: string;
  name: string;
  details: DetalhesItemCardapio;
}

/** Dados persistidos do item selecionado para preenchimento e manutenção do formulário. */
export interface ItemCardapioEdicao {
  id: string;
  version: number;
  name: string;
  details: DetalhesItemCardapio;
}

export interface CardapioContracts {
  /**
   * Finalidade: Carrega a primeira página do catálogo ao abrir a página para o caixa conferir os itens disponíveis e selecionar um para manutenção.
   * Entrada: page informa a página solicitada, assumindo a primeira quando omitida; pageSize limita quantos itens cabem na faixa exibida.
   * Processamento: Lista ItemCardapio em ordem de nome e identificador como desempate estável, aplica a paginação solicitada e compõe id, name e details.precoVigente. Calcula hasMore pela existência de itens depois da página retornada. Nenhuma regra de lançamento ou totalização de comanda se aplica.
   * Saída: Retorna a página já no formato da lista, com itens, página, tamanho da página e indicação de resultados adicionais.
   */
  'comandaRestaurante.cardapio.carregarItensCardapio': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { pagina: { items: ItemCardapioResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca a próxima página do catálogo quando o caixa continua a leitura, sem transferir todos os itens cadastrados.
   * Entrada: page identifica a próxima página a carregar; pageSize informa a quantidade de itens de cada página.
   * Processamento: Lista a página solicitada de ItemCardapio usando a mesma ordenação estável por nome e identificador, projeta id, name e details.precoVigente e calcula hasMore. Nenhuma regra de lançamento ou totalização de comanda se aplica.
   * Saída: Retorna somente a página solicitada para que seus itens sejam anexados ao catálogo já exibido.
   */
  'comandaRestaurante.cardapio.carregarMaisItensCardapio': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { pagina: { items: ItemCardapioResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Obtém o item escolhido no catálogo para preencher o formulário de manutenção.
   * Entrada: id é o identificador do ItemCardapio selecionado pelo caixa.
   * Processamento: Consulta o item pelo identificador e compõe id, version, name e details.precoVigente para edição autorizada. A version é retornada para controle de concorrência. Nenhuma regra de lançamento ou totalização de comanda se aplica.
   * Saída: Retorna o item selecionado no formato que o formulário usa para mostrar e alterar os dados persistidos.
   */
  'comandaRestaurante.cardapio.obterItemCardapio': {
    kind: 'qry';
    input: { id: string };
    output: { item: ItemCardapioEdicao };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Cadastra um item com nome e preço vigente para uso operacional no cardápio.
   * Entrada: name é o nome pelo qual a equipe localiza o item; details.precoVigente é o preço atualmente cobrado.
   * Processamento: Cria ItemCardapio com o nome e o preço vigente recebidos e compõe o registro persistido, incluindo id e version gerados. Não cria ItemComanda, nem registra preço de lançamento ou executa regras de subtotal, total ou valor de item.
   * Saída: Retorna o item criado e persistido para redesenhar imediatamente o formulário; o catálogo é recarregado para refletir a inclusão.
   */
  'comandaRestaurante.cardapio.cadastrarItemCardapio': {
    kind: 'cmd';
    writes: 'ItemCardapio.create';
    input: { name: string; details: DetalhesItemCardapio };
    output: { item: ItemCardapioEdicao };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Atualiza o nome e o preço vigente do item selecionado para manter o catálogo usado pela operação.
   * Entrada: id e version identificam a versão persistida a alterar; name e details.precoVigente são os valores informados pelo caixa.
   * Processamento: Atualiza o ItemCardapio por id somente se a version recebida corresponder à versão atual, recusando sobrescrita concorrente, e compõe a nova versão persistida. Não altera ItemComanda já lançado nem aplica regras de preço de lançamento, subtotal, total ou valor de ItemComanda.
   * Saída: Retorna o registro atualizado, incluindo a nova version, para redesenhar o formulário sem nova consulta; o catálogo é recarregado para refletir a alteração.
   */
  'comandaRestaurante.cardapio.atualizarItemCardapio': {
    kind: 'cmd';
    writes: 'ItemCardapio.update';
    input: { id: string; version: number; name: string; details: DetalhesItemCardapio };
    output: { item: ItemCardapioEdicao };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
}
