/// <mls fileReference="_102047_/l2/compras/web/contracts/entregas_a_receber.defs.ts" enhancement="_blank"/>

/** Indicadores do dia sobre os pedidos ainda não totalmente recebidos: entregas previstas para hoje, pedidos atrasados e saldo total a receber. */
export interface ResumoEntregas {
  readonly entregasPrevistasHoje: number;
  readonly pedidosAtrasados: number;
  readonly maiorAtrasoDias: number;
  readonly saldoTotalAReceber: number;
  atrasados: PedidoAtrasado[];
}

/** Pedido de compra atrasado, identificado pelo número, com os dias de atraso. */
export interface PedidoAtrasado {
  id: string;
  readonly numero: string;
  details: {
    readonly diasAtraso: number;
  };
}

/** Pedido de compra em aberto ou parcialmente recebido, com fornecedor, produto, data prevista, quantidades e indicação de atraso ou entrega prevista para hoje. */
export interface PedidoAguardandoEntrega {
  id: string;
  readonly numero: string;
  status: 'emAberto' | 'parcialmenteRecebido' | 'recebido';
  dataPrevistaEntrega: string;
  details: {
    quantidade: number;
    readonly quantidadeRecebida: number;
    readonly saldoAReceber: number;
    readonly atrasado: boolean;
    readonly diasAtraso: number;
    readonly entregaPrevistaHoje: boolean;
  };
  fornecedor: {
    details: {
      identification: {
        name: string;
      };
      company: {
        legalName: string;
      };
    };
  };
  produto: {
    details: {
      identification: {
        name: string;
      };
      product: {
        unitOfMeasure?: string;
      };
    };
  };
}

/** Pedido de compra com os dados de conferência do recebimento: fornecedor, produto, unidade, quantidades pedida, recebida e saldo, datas de emissão, previsão e último lembrete. */
export interface PedidoConferencia {
  id: string;
  readonly numero: string;
  status: 'emAberto' | 'parcialmenteRecebido' | 'recebido';
  readonly dataEmissao: string;
  dataPrevistaEntrega: string;
  details: {
    quantidade: number;
    readonly quantidadeRecebida: number;
    readonly saldoAReceber: number;
    observacoes?: string;
    readonly ultimoLembreteEm?: string;
  };
  fornecedor: {
    details: {
      company: {
        legalName: string;
        tradeName?: string;
      };
      identification: {
        docId: string;
      };
    };
  };
  produto: {
    details: {
      identification: {
        name: string;
      };
      product: {
        sku?: string;
        unitOfMeasure?: string;
        isInventoried?: boolean;
      };
    };
  };
}

/** Recebimento lançado para um pedido de compra, com data, quantidade, observação, indicação se completou o pedido e saldo pendente. */
export interface RecebimentoRegistrado {
  id: string;
  pedidoCompraId: string;
  dataRecebimento: string;
  details: {
    quantidadeRecebida: number;
    observacao?: string;
    readonly recebimentoTotal: boolean;
    readonly saldoPendente: number;
  };
}

export interface Entregas_a_receberContracts {
  /**
   * Finalidade: Carrega na abertura da página a situação do dia e a primeira página da fila de pedidos aguardando entrega da organização.
   * Entrada: page: número da página da fila (começa em 1); pageSize: quantidade de pedidos por página.
   * Processamento: Considera apenas pedidos com status emAberto ou parcialmenteRecebido (os mesmos que a regra lembreteEntregaEAtraso acompanha). Calcula, sem gravar, os derivados de cada pedido: quantidadeRecebida (soma dos recebimentos), saldoAReceber (quantidade menos recebido), atrasado (data prevista anterior a hoje), diasAtraso (dias entre a data prevista e hoje, zero se não atrasado) e entregaPrevistaHoje. O resumo conta os pedidos com entrega prevista hoje, os atrasados, o maior número de dias de atraso, soma o saldo a receber de todos e lista os atrasados com número e dias de atraso. A fila junta razão social e nome do fornecedor e nome e unidade do produto, ordenada por atrasados primeiro (mais dias de atraso), depois previstos para hoje, depois data prevista crescente.
   * Saída: resumo com os indicadores já calculados e a lista de atrasados; fila paginada { items, page, pageSize, hasMore } de pedidos aguardando entrega com fornecedor, produto, quantidades e indicadores de atraso.
   */
  'compras.entregas_a_receber.getEntregasDoDia': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { resumo: ResumoEntregas; fila: { items: PedidoAguardandoEntrega[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['lembreteEntregaEAtraso'];
    access: { actors: ['almoxarife']; grants: ['almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca na fila de pedidos aguardando entrega pelo número do pedido e navega entre as páginas.
   * Entrada: numero: texto do número do pedido digitado na busca (vazio traz todos); page e pageSize: página pedida e tamanho da página.
   * Processamento: Mesmo filtro da fila de abertura (status emAberto ou parcialmenteRecebido), acrescido da busca por número (locate.byText). Calcula os derivados quantidadeRecebida, saldoAReceber, atrasado, diasAtraso e entregaPrevistaHoje, junta fornecedor e produto e mantém a mesma ordenação.
   * Saída: fila paginada { items, page, pageSize, hasMore } dos pedidos aguardando entrega que atendem à busca.
   */
  'compras.entregas_a_receber.buscarFilaEntregas': {
    kind: 'qry';
    input: { numero?: string; page: number; pageSize: number };
    output: { fila: { items: PedidoAguardandoEntrega[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['almoxarife']; grants: ['almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre o pedido escolhido na fila ou vindo do lembrete, com os dados de conferência e o histórico de recebimentos.
   * Entrada: id: id do pedido de compra selecionado.
   * Processamento: Lê o pedido pelo id, junta do cadastro mestre razão social, nome fantasia e CNPJ do fornecedor e nome, SKU, unidade e controle de estoque do produto. Lista os recebimentos do pedido (listByForeignKey) em ordem de data. Calcula, sem gravar, quantidadeRecebida e saldoAReceber do pedido e, para cada recebimento, recebimentoTotal e saldoPendente acumulados até ele. ultimoLembreteEm é o dia do último lembrete da regra lembreteEntregaEAtraso.
   * Saída: pedido com dados de conferência, datas de emissão, previsão e último lembrete; recebimentos já lançados com data, quantidade, observação e saldo pendente.
   */
  'compras.entregas_a_receber.getPedidoParaRecebimento': {
    kind: 'qry';
    input: { id: string };
    output: { pedido: PedidoConferencia; recebimentos: RecebimentoRegistrado[] };
    rules: ['lembreteEntregaEAtraso'];
    access: { actors: ['almoxarife']; grants: ['almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
  /**
   * Finalidade: Lança o recebimento total ou parcial do pedido conferido, dá entrada no estoque e atualiza a situação do pedido.
   * Entrada: pedidoCompraId: pedido cuja chegada é registrada; dataRecebimento: momento da chegada; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: avarias ou divergências encontradas (opcional).
   * Processamento: Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva), se for maior que o saldo a receber (recebimentoNaoExcedeSaldo) ou se a soma recebida ultrapassar a quantidade pedida (recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, dá entrada no estoque da quantidade do produto do pedido (recebimentoDaEntradaEstoque, compras.darEntradaEstoque) e move o pedido para recebido (concluirRecebimento) quando a soma alcança a quantidade pedida ou para parcialmenteRecebido (registrarRecebimentoParcial) quando resta saldo (recebimentoAtualizaSituacaoPedido). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.
   * Saída: recebimento criado com recebimentoTotal e saldoPendente calculados; pedido na nova situação com quantidade recebida e saldo a receber atualizados.
   */
  'compras.entregas_a_receber.registrarRecebimento': {
    kind: 'cmd';
    writes: 'Recebimento.create';
    input: { pedidoCompraId: string; dataRecebimento: string; details: { quantidadeRecebida: number; observacao?: string } };
    output: { recebimento: RecebimentoRegistrado; pedido: PedidoConferencia };
    rules: ['recebimentoSomentePedidoEmAberto', 'quantidadeRecebidaPositiva', 'recebimentoNaoExcedeSaldo', 'recebimentoNaoExcedePedido', 'recebimentoAtualizaSituacaoPedido', 'recebimentoDaEntradaEstoque'];
    access: { actors: ['almoxarife']; grants: ['almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
}
