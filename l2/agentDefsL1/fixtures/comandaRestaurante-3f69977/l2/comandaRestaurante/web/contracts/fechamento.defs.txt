/// <mls fileReference="_102047_/l2/comandaRestaurante/web/contracts/fechamento.defs.ts" enhancement="_blank"/>

/** Dados da mesa vinculada à comanda, apresentados para o caixa localizar a cobrança. */
export interface MesaResumo {
  code: string;
}

/** Resumo de uma comanda ainda aberta para localização e seleção no fechamento. */
export interface ComandaAbertaResumo {
  id: string;
  number: number;
  mesaId: string;
  status: 'open' | 'closed';
  details: ComandaResumoDetails;
  mesa: MesaResumo;
}

/** Valores calculados exibidos no resumo de uma comanda aberta. */
export interface ComandaResumoDetails {
  readonly totalComanda: string;
}

/** Identificação do item de cardápio associada a uma linha da comanda. */
export interface ItemCardapioNaComanda {
  name: string;
}

/** Dados de quantidade, observação, preço registrado e total calculado da linha conferida pelo caixa. */
export interface ItemComandaDetailsParaFechamento {
  details: {
    quantidade: number;
    observacao?: string;
    precoUnitario: string;
  };
  readonly valorTotal: string;
}

/** Linha válida da comanda que compõe a cobrança a conferir. */
export interface ItemComandaParaFechamento {
  status: 'launched' | 'canceled';
  itemCardapioId: string;
  details: ItemComandaDetailsParaFechamento;
  itemCardapio: ItemCardapioNaComanda;
}

/** Desconto, pagamento e totais da comanda mostrados e informados no fechamento. */
export interface ComandaDetailsParaFechamento {
  details: {
    discountAmount?: string;
    paymentMethod?: 'cash' | 'debitCard' | 'creditCard' | 'pix';
  };
  readonly subtotal: string;
  readonly totalComanda: string;
}

/** Indicador de disponibilidade da mesa vinculada após a situação atual da comanda. */
export interface MesaNoFechamento {
  readonly disponivel: boolean;
}

/** Comanda selecionada com linhas válidas, totais calculados, dados de pagamento e indicador da mesa para conferência e fechamento. */
export interface ComandaParaFechamento {
  id: string;
  version: number;
  number: number;
  status: 'open' | 'closed';
  details: ComandaDetailsParaFechamento;
  items: ItemComandaParaFechamento[];
  mesa: MesaNoFechamento;
}

export interface FechamentoContracts {
  /**
   * Finalidade: Carrega o fechamento com as comandas abertas para localização e, quando houver contexto, a cobrança completa que o caixa irá conferir.
   * Entrada: comandaId identifica a comanda recebida no contexto. number e mesaCode restringem a localização inicial. page e pageSize definem a janela da lista de comandas abertas.
   * Processamento: Filtra a lista obrigatoriamente por situação open, aplica número e código de mesa quando informados, ordena de forma estável e entrega a janela paginada. Compõe o código da mesa e calcula o total de cada resumo conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Se comandaId identificar uma comanda aberta, compõe suas linhas launched, nomes do cardápio, pagamento, totais calculados e disponibilidade calculada da mesa; campos derivados são apenas calculados.
   * Saída: Retorna uma lista paginada e enxuta pronta para localizar a conta e, opcionalmente, a comanda contextual completa para preencher revisão, pagamento e ação de fechamento.
   */
  'comandaRestaurante.fechamento.carregarFechamento': {
    kind: 'qry';
    input: { comandaId?: string; number?: number; mesaCode?: string; page: number; pageSize: number };
    output: { openComandas: { items: ComandaAbertaResumo[]; page: number; pageSize: number; hasMore: boolean }; selectedComanda?: ComandaParaFechamento };
    rules: ['subtotalComandaCalculado', 'totalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Substitui a lista de localização pelas comandas abertas que correspondem ao número ou à mesa procurados pelo caixa.
   * Entrada: number filtra pelo número da comanda e mesaCode pelo código da mesa. page e pageSize definem a primeira janela resultante da busca ou troca de filtros.
   * Processamento: Restringe o resultado a comandas open, combina os filtros informados e ordena antes de paginar. Para cada resumo, compõe a mesa e calcula totalComanda pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado, sem registrar valores derivados.
   * Saída: Retorna a janela paginada de resumos para substituir a lista que o caixa está pesquisando.
   */
  'comandaRestaurante.fechamento.buscarComandasAbertas': {
    kind: 'qry';
    input: { number?: number; mesaCode?: string; page: number; pageSize: number };
    output: { openComandas: { items: ComandaAbertaResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['subtotalComandaCalculado', 'totalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca a próxima janela das comandas abertas da localização atual sem recarregar os resumos já exibidos.
   * Entrada: number e mesaCode repetem os filtros ativos. page e pageSize identificam a próxima janela solicitada.
   * Processamento: Aplica os mesmos filtros obrigatórios de situação open, número e mesa, ordena de forma estável e pagina a próxima janela. Compõe mesa e total calculado conforme valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado.
   * Saída: Retorna uma página adicional de resumos para ser anexada à lista de comandas abertas.
   */
  'comandaRestaurante.fechamento.carregarMaisComandasAbertas': {
    kind: 'qry';
    input: { number?: number; mesaCode?: string; page: number; pageSize: number };
    output: { openComandas: { items: ComandaAbertaResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['subtotalComandaCalculado', 'totalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Obtém a comanda aberta selecionada pelo caixa, já composta para conferência, recebimento e fechamento.
   * Entrada: id é o identificador da comanda escolhida na lista de comandas abertas.
   * Processamento: Lê a comanda aberta autorizada, inclui somente itens launched, associa o nome de cada ItemCardapio e calcula valorTotal, subtotal e totalComanda segundo valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Também calcula o indicador de disponibilidade da mesa, sem gravar nenhum campo derivado.
   * Saída: Retorna versão, situação, linhas válidas, desconto, forma de pagamento, totais e indicador da mesa para os organismos de revisão, pagamento e fechamento.
   */
  'comandaRestaurante.fechamento.obterComandaParaFechamento': {
    kind: 'qry';
    input: { id: string };
    output: { comanda: ComandaParaFechamento };
    rules: ['subtotalComandaCalculado', 'totalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Registra o desconto e o pagamento, fecha a comanda e confirma que sua mesa foi liberada.
   * Entrada: id e version identificam a comanda aberta e protegem contra fechamento concorrente. discountAmount é o desconto opcional. paymentMethod é a forma de pagamento obrigatória do fechamento.
   * Processamento: Em transação, recompõe os itens launched e recalcula valorTotal, subtotal e total pelas regras valorTotalItemComandaCalculado, subtotalComandaCalculado e totalComandaCalculado. Recusa pagamento ausente por pagamentoObrigatorioNoFechamento e desconto superior ao subtotal por descontoNaoExcedeSubtotal. Com a versão válida, grava o payload da transição fecharComanda, muda a situação para closed e libera a mesa segundo fechamentoLiberaMesa.
   * Saída: Retorna a comanda fechada, com linhas, desconto, pagamento, totais recalculados e indicador de mesa disponível, para redesenhar imediatamente a confirmação.
   */
  'comandaRestaurante.fechamento.fecharComandaPaga': {
    kind: 'cmd';
    writes: 'Comanda.fecharComanda';
    input: { id: string; version: number; details: { discountAmount?: string; paymentMethod: 'cash' | 'debitCard' | 'creditCard' | 'pix' } };
    output: { comanda: ComandaParaFechamento };
    rules: ['pagamentoObrigatorioNoFechamento', 'descontoNaoExcedeSubtotal', 'fechamentoLiberaMesa', 'subtotalComandaCalculado', 'totalComandaCalculado', 'valorTotalItemComandaCalculado'];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
}
