/// <mls fileReference="_102047_/l2/comandaRestaurante/web/contracts/atendimento.defs.ts" enhancement="_blank"/>

/** Mesa disponível para início do atendimento, apresentada para seleção do garçom. */
export interface MesaDisponivel {
  id: string;
  code: string;
  details: {
    readonly disponivel: boolean;
  };
}

/** Identificação da mesa vinculada à comanda exibida no atendimento. */
export interface MesaReferencia {
  id: string;
  code: string;
}

/** Comanda aberta disponível para localização e seleção pelo garçom. */
export interface ComandaResumo {
  id: string;
  version: number;
  number: number;
  mesaId: string;
  status: 'open' | 'closed';
  mesa: MesaReferencia;
}

/** Item do cardápio apresentado para busca e escolha no lançamento. */
export interface ItemCardapioResumo {
  id: string;
  name: string;
  details: {
    precoVigente: string;
  };
}

/** Coleções independentes usadas para localizar a mesa, a comanda aberta e o item do pedido. */
export interface ContextoAtendimento {
  mesasDisponiveis: { items: MesaDisponivel[]; page: number; pageSize: number; hasMore: boolean };
  comandasAbertas: { items: ComandaResumo[]; page: number; pageSize: number; hasMore: boolean };
  itensCardapio: { items: ItemCardapioResumo[]; page: number; pageSize: number; hasMore: boolean };
}

/** Referência do cardápio da linha lançada, com o nome necessário para a conferência. */
export interface ItemCardapioDaComanda {
  id: string;
  name: string;
}

/** Linha da comanda, inclusive as canceladas, para conferência e correção. */
export interface ItemComandaAtendimento {
  id: string;
  version: number;
  comandaId: string;
  itemCardapioId: string;
  status: 'launched' | 'canceled';
  details: {
    quantidade: number;
    observacao?: string;
    precoUnitario: string;
    readonly valorTotal: string;
  };
  itemCardapio: ItemCardapioDaComanda;
}

/** Comanda selecionada, sua mesa, todos os itens e o subtotal calculado para o atendimento. */
export interface ComandaAtendimento {
  id: string;
  version: number;
  number: number;
  mesaId: string;
  status: 'open' | 'closed';
  mesa: MesaReferencia;
  details: {
    readonly subtotal: string;
  };
  itens: ItemComandaAtendimento[];
}

export interface AtendimentoContracts {
  /**
   * Finalidade: Carrega de uma vez o contexto inicial para o garçom localizar uma mesa disponível, uma comanda aberta ou um item do cardápio.
   * Entrada: Os pares mesasPage e mesasPageSize, comandasPage e comandasPageSize, itensPage e itensPageSize definem opcionalmente o trecho inicial de cada lista; na ausência deles, aplica os tamanhos padrão da página.
   * Processamento: Consulta somente mesas com disponibilidade calculada verdadeira, somente comandas em situação open e itens do cardápio ordenados por nome. Cada coleção é ordenada e paginada de forma independente, retornando hasMore sem transferir itens fora da tela. Não altera registros.
   * Saída: Retorna as três coleções já filtradas e no formato de localização, para abastecer a busca e a escolha inicial do contexto de atendimento.
   */
  'comandaRestaurante.atendimento.carregarAtendimento': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { contextoAtendimento: ContextoAtendimento };
    rules: [];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Atualiza a localização do atendimento quando o garçom pesquisa ou navega nas listas de mesa, comanda e cardápio.
   * Entrada: mesaTermo filtra o código de mesas disponíveis; comandaNumero restringe uma comanda aberta pelo número; itemTermo pesquisa um trecho do nome do item. Cada par de página define o trecho da respectiva lista.
   * Processamento: Mantém os filtros próprios do atendimento: mesa disponível e comanda open. Aplica os termos informados, ordena cada resultado, calcula hasMore para a página solicitada e não grava dados.
   * Saída: Retorna o contexto de localização substituto, com as listas filtradas e paginadas que a página deve redesenhar.
   */
  'comandaRestaurante.atendimento.atualizarLocalizacaoAtendimento': {
    kind: 'qry';
    input: { mesaTermo?: string; comandaNumero?: number; itemTermo?: string; page: number; pageSize: number };
    output: { contextoAtendimento: ContextoAtendimento };
    rules: [];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega a comanda escolhida com a mesa, todas as linhas e o subtotal necessários para conferir e operar o atendimento.
   * Entrada: comandaId é o identificador da comanda selecionada pelo garçom na localização.
   * Processamento: Lê a comanda, a mesa vinculada e todas as linhas, inclusive canceladas, com o nome do item de cardápio. Calcula valorTotal de cada linha conforme valorTotalItemComandaCalculado e subtotal apenas com linhas não canceladas conforme subtotalComandaCalculado; esses valores derivados não são gravados por esta consulta.
   * Saída: Retorna a comanda completa para redesenhar a conferência, identificar a comanda ativa no formulário e disponibilizar a linha selecionada para cancelamento.
   */
  'comandaRestaurante.atendimento.obterComandaAtendimento': {
    kind: 'qry';
    input: { comandaId: string };
    output: { comanda: ComandaAtendimento };
    rules: ['subtotalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre a comanda da mesa disponível escolhida e devolve o atendimento pronto para registrar pedidos.
   * Entrada: mesaId preenche o vínculo obrigatório da nova comanda com a mesa selecionada.
   * Processamento: Em transação, verifica que a mesa está disponível conforme mesaDisponivelParaAbrirComanda e recusa outra comanda open para a mesma mesa conforme umaComandaAbertaPorMesa. Gera o número sequencial, cria a comanda em situação open e calcula o subtotal vazio conforme subtotalComandaCalculado.
   * Saída: Retorna a nova comanda com mesa, número, situação, linhas vazias e subtotal, permitindo redesenhar a conferência imediatamente.
   */
  'comandaRestaurante.atendimento.abrirComanda': {
    kind: 'cmd';
    writes: 'Comanda.create';
    input: { mesaId: string };
    output: { comanda: ComandaAtendimento };
    rules: ['mesaDisponivelParaAbrirComanda', 'umaComandaAbertaPorMesa', 'subtotalComandaCalculado'];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Inclui o pedido informado na comanda aberta e devolve a conferência integral já atualizada.
   * Entrada: comandaId vincula a nova linha à comanda; itemCardapioId identifica o item escolhido; quantidade registra o volume pedido; observacao registra a orientação opcional de preparo.
   * Processamento: Recusa o lançamento em comanda diferente de open conforme itensSomenteEmComandaAberta. Obtém o preço vigente e o registra na linha conforme precoUnitarioRegistradoNoLancamento, calcula valorTotal conforme valorTotalItemComandaCalculado e recalcula o subtotal da comanda conforme subtotalComandaCalculado.
   * Saída: Retorna a comanda com a nova linha, nome do item, preço registrado, valor calculado e subtotal atualizado, sem exigir nova consulta.
   */
  'comandaRestaurante.atendimento.lancarItem': {
    kind: 'cmd';
    writes: 'ItemComanda.create';
    input: { comandaId: string; itemCardapioId: string; details: { quantidade: number; observacao?: string } };
    output: { comanda: ComandaAtendimento };
    rules: ['itensSomenteEmComandaAberta', 'precoUnitarioRegistradoNoLancamento', 'valorTotalItemComandaCalculado', 'subtotalComandaCalculado'];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Cancela a linha escolhida por engano e devolve a comanda com a cobrança recalculada.
   * Entrada: id identifica o item da comanda a transicionar e version protege a operação contra alteração concorrente.
   * Processamento: Executa cancelarItemComanda somente para uma linha launched cuja comanda está open, conforme itemComandaOperacaoSomenteComandaAberta. Mantém a linha no histórico como canceled, calcula seu valor conforme valorTotalItemComandaCalculado e recalcula o subtotal desconsiderando-a conforme subtotalComandaCalculado.
   * Saída: Retorna a comanda completa com a linha marcada como canceled e o subtotal atualizado para conferência imediata.
   */
  'comandaRestaurante.atendimento.cancelarItem': {
    kind: 'cmd';
    writes: 'ItemComanda.cancelarItemComanda';
    input: { id: string; version: number };
    output: { comanda: ComandaAtendimento };
    rules: ['itemComandaOperacaoSomenteComandaAberta', 'valorTotalItemComandaCalculado', 'subtotalComandaCalculado'];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
}
