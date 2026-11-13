/// <mls fileReference="_102047_/l2/compras/web/contracts/pedidos.defs.ts" enhancement="_blank"/>

/** Identificação do fornecedor no cadastro mestre. */
export interface FornecedorIdentificacao {
  name: string;
}

/** Dados de empresa do fornecedor. */
export interface FornecedorEmpresa {
  legalName: string;
}

/** Detalhes do fornecedor do pedido. */
export interface FornecedorDetalhes {
  identification: FornecedorIdentificacao;
  company: FornecedorEmpresa;
}

/** Fornecedor de um pedido de compra, com nome e razão social. */
export interface FornecedorRef {
  id: string;
  details: FornecedorDetalhes;
}

/** Identificação do produto no cadastro mestre. */
export interface ProdutoIdentificacao {
  name: string;
}

/** Dados de catálogo do produto. */
export interface ProdutoDadosProduto {
  unitOfMeasure?: string;
}

/** Detalhes do produto comprado. */
export interface ProdutoDetalhes {
  identification: ProdutoIdentificacao;
  product: ProdutoDadosProduto;
}

/** Produto de um pedido de compra, com nome e unidade de medida. */
export interface ProdutoRef {
  id: string;
  details: ProdutoDetalhes;
}

/** Valores resumidos de um pedido de compra. */
export interface PedidoResumoDetalhes {
  readonly valorTotal: string;
  moeda: 'BRL' | 'USD' | 'EUR';
  readonly atrasado: boolean;
  readonly saldoAReceber: number;
}

/** Pedido de compra resumido: número, emissão, situação, fornecedor, produto, valor total, atraso e saldo a receber. */
export interface PedidoResumo {
  id: string;
  readonly numero: string;
  readonly dataEmissao: string;
  status: 'emAberto' | 'parcialmenteRecebido' | 'recebido';
  fornecedorId: string;
  produtoId: string;
  details: PedidoResumoDetalhes;
  fornecedor: FornecedorRef;
  produto: ProdutoRef;
}

/** Quantidade e situação de um recebimento em relação ao pedido. */
export interface RecebimentoDetalhes {
  quantidadeRecebida: number;
  observacao?: string;
  readonly recebimentoTotal: boolean;
  readonly saldoPendente: number;
}

/** Recebimento total ou parcial registrado para um pedido de compra. */
export interface RecebimentoRegistrado {
  id: string;
  dataRecebimento: string;
  details: RecebimentoDetalhes;
}

/** Quantidades, preço, valores e lembrete de um pedido de compra. */
export interface PedidoDetalheValores {
  quantidade: number;
  precoUnitario: string;
  moeda: 'BRL' | 'USD' | 'EUR';
  readonly valorTotal: string;
  readonly quantidadeRecebida: number;
  readonly saldoAReceber: number;
  readonly atrasado: boolean;
  readonly ultimoLembreteEm?: string;
}

/** Pedido de compra completo com fornecedor, produto, quantidades, preço, saldo, origem na solicitação, último lembrete e os recebimentos registrados. */
export interface PedidoDetalhe {
  id: string;
  version: number;
  readonly numero: string;
  status: 'emAberto' | 'parcialmenteRecebido' | 'recebido';
  solicitacaoId: string;
  fornecedorId: string;
  produtoId: string;
  readonly dataEmissao: string;
  dataPrevistaEntrega: string;
  details: PedidoDetalheValores;
  fornecedor: FornecedorRef;
  produto: ProdutoRef;
  recebimentos: RecebimentoRegistrado[];
}

export interface PedidosContracts {
  /**
   * Finalidade: Pesquisa os pedidos de compra da organização por número, produto, fornecedor, situação e período de emissão, opcionalmente só os atrasados.
   * Entrada: numero: trecho do número do pedido; produto.details.identification.name: texto do nome do produto.details.identification.name; fornecedor.details.identification.name: texto do nome do fornecedor.details.identification.name; status: situação do pedido; emitidoDe/emitidoAte: limites do período da data de emissão; details.atrasado: quando verdadeiro traz apenas pedidos atrasados (lista de atrasados aberta a partir do painel); page e pageSize: paginação.
   * Processamento: Filtra PedidoCompra pelas colunas indexadas (situação, período de emissão), localiza produto e fornecedor pelo nome no cadastro mestre e busca o número por texto; ordena por data de emissão decrescente. Lê nome do fornecedor e do produto no MDM. Calcula valorTotal (quantidade × preço unitário), saldoAReceber (quantidade pedida − soma dos recebimentos) e atrasado conforme pedidoAtrasadoAposDataPrevista: pedido emAberto ou parcialmenteRecebido com data prevista de entrega anterior a hoje. Campos derivados são calculados, nunca gravados.
   * Saída: Página { items, page, pageSize, hasMore } de pedidos resumidos com número, emissão, situação, fornecedor, produto, valor total e moeda, indicação de atraso e saldo a receber.
   */
  'compras.pedidos.pesquisarPedidos': {
    kind: 'qry';
    input: { numero?: string; produto: { details: { identification: { name?: string } } }; fornecedor: { details: { identification: { name?: string } } }; status?: 'emAberto' | 'parcialmenteRecebido' | 'recebido'; emitidoDe?: string; emitidoAte?: string; details: { atrasado?: boolean }; page: number; pageSize: number };
    output: { pedidos: { items: PedidoResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['pedidoAtrasadoAposDataPrevista'];
    access: { actors: ['almoxarife', 'comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre um pedido de compra com tudo o que se confere nele: fornecedor, produto, quantidades, preço, saldo, origem, último lembrete e recebimentos.
   * Entrada: pedidoId: id do pedido escolhido na lista ou vindo do lembrete de entrega (URL).
   * Processamento: Lê o PedidoCompra pelo id, o fornecedor (nome e razão social) e o produto (nome e unidade de medida) no MDM e lista os recebimentos pela chave pedidoCompraId em ordem de data de recebimento. Calcula valorTotal, quantidadeRecebida (soma dos recebimentos), saldoAReceber e atrasado (pedidoAtrasadoAposDataPrevista); para cada recebimento calcula saldoPendente e recebimentoTotal acumulando as quantidades até ele. ultimoLembreteEm é o dia do último lembrete enviado pela verificação diária (lembreteEntregaEAtraso), apenas lido.
   * Saída: O pedido em seu estado atual, com versão, solicitação de origem, data de emissão, data prevista de entrega, valores calculados, fornecedor, produto e a lista de recebimentos registrados.
   */
  'compras.pedidos.abrirPedido': {
    kind: 'qry';
    input: { pedidoId: string };
    output: { pedido: PedidoDetalhe };
    rules: ['pedidoAtrasadoAposDataPrevista', 'lembreteEntregaEAtraso'];
    access: { actors: ['almoxarife', 'comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
  /**
   * Finalidade: Registra a chegada total ou parcial de um pedido de compra pelo almoxarife.
   * Entrada: pedidoCompraId: pedido recebido; dataRecebimento: momento da chegada da mercadoria; details.quantidadeRecebida: quantidade que chegou nesta entrega; details.observacao: anotação opcional sobre avarias ou divergências.
   * Processamento: Recusa se o pedido não estiver emAberto ou parcialmenteRecebido (recebimentoSomentePedidoEmAberto), se a quantidade não for maior que zero (quantidadeRecebidaPositiva) ou se for maior que o saldo a receber, de modo que a soma recebida nunca ultrapasse a quantidade pedida (recebimentoNaoExcedeSaldo, recebimentoNaoExcedePedido). Em uma única transação grava o Recebimento, move o pedido para recebido quando a soma alcança a quantidade pedida ou para parcialmenteRecebido quando ainda resta saldo (recebimentoAtualizaSituacaoPedido, transições concluirRecebimento/registrarRecebimentoParcial) e dá entrada no estoque da quantidade recebida do produto (recebimentoDaEntradaEstoque). recebimentoTotal, saldoPendente, quantidadeRecebida e saldoAReceber são calculados, nunca gravados.
   * Saída: pedido: o pedido na nova situação, com valores recalculados e a lista de recebimentos incluindo o novo; linha: o mesmo pedido em forma resumida, com situação, atraso e saldo a receber atualizados.
   */
  'compras.pedidos.registrarRecebimento': {
    kind: 'cmd';
    writes: 'Recebimento.create';
    input: { pedidoCompraId: string; dataRecebimento: string; details: { quantidadeRecebida: number; observacao?: string } };
    output: { pedido: PedidoDetalhe; linha: PedidoResumo };
    rules: ['recebimentoSomentePedidoEmAberto', 'quantidadeRecebidaPositiva', 'recebimentoNaoExcedeSaldo', 'recebimentoNaoExcedePedido', 'recebimentoAtualizaSituacaoPedido', 'recebimentoDaEntradaEstoque'];
    access: { actors: ['almoxarife', 'comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'almoxarifeRecebimento', 'almoxarifeFornecedorProduto']; scope: 'organization' };
  };
}
