/// <mls fileReference="_102047_/l2/compras/web/contracts/inicio_comprador.defs.ts" enhancement="_blank"/>

/** Identificação do produto no cadastro mestre. */
export interface ProdutoIdentificacao {
  name: string;
}

/** Dados de produto do cadastro mestre. */
export interface ProdutoDadosProduto {
  unitOfMeasure?: string;
}

/** Detalhes do produto do cadastro mestre. */
export interface ProdutoDetalhes {
  identification: ProdutoIdentificacao;
  product?: ProdutoDadosProduto;
}

/** Produto do catálogo, com nome e unidade de medida. */
export interface ProdutoResumo {
  id: string;
  details: ProdutoDetalhes;
}

/** Identificação do fornecedor no cadastro mestre. */
export interface FornecedorIdentificacao {
  name: string;
}

/** Detalhes do fornecedor do cadastro mestre. */
export interface FornecedorDetalhes {
  identification: FornecedorIdentificacao;
}

/** Fornecedor do pedido, com seu nome. */
export interface FornecedorResumo {
  id: string;
  details: FornecedorDetalhes;
}

/** Indicadores calculados da solicitação com necessidade vencida. */
export interface SolicitacaoVencidaDetalhes {
  readonly necessidadeVencida: boolean;
  readonly quantidadeOpcoes: number;
}

/** Solicitação de compra cuja data de necessidade já passou sem autorização nem rejeição, com o produto e o número de opções pesquisadas. */
export interface SolicitacaoVencida {
  id: string;
  readonly numero: string;
  status: 'rascunho' | 'enviada' | 'emPesquisa' | 'aguardandoAutorizacao' | 'autorizada' | 'rejeitada';
  dataNecessidade: string;
  produtoId: string;
  produto: ProdutoResumo;
  details: SolicitacaoVencidaDetalhes;
}

/** Indicadores calculados de atraso e saldo do pedido. */
export interface PedidoAtrasadoDetalhes {
  readonly atrasado: boolean;
  readonly diasAtraso: number;
  readonly saldoAReceber: number;
}

/** Pedido de compra não totalmente recebido com data prevista de entrega anterior a hoje, com fornecedor, dias de atraso e saldo a receber. */
export interface PedidoAtrasado {
  id: string;
  readonly numero: string;
  dataPrevistaEntrega: string;
  fornecedorId: string;
  fornecedor: FornecedorResumo;
  details: PedidoAtrasadoDetalhes;
}

/** Resumo dos atrasos do comprador: solicitações com necessidade vencida e pedidos atrasados, com seus totais. */
export interface AlertasPendencias {
  readonly totalSolicitacoesVencidas: number;
  solicitacoesVencidas: SolicitacaoVencida[];
  readonly totalPedidosAtrasados: number;
  pedidosAtrasados: PedidoAtrasado[];
}

/** Dados da necessidade de compra e resultado da conferência. */
export interface SolicitacaoParaEnviarDetalhes {
  quantidade: number;
  justificativa: string;
  pendencias?: string;
  readonly completa: boolean;
}

/** Solicitação de compra do comprador com produto, quantidade, justificativa, data de necessidade, pendências da conferência e indicação de completude. */
export interface SolicitacaoParaEnviar {
  id: string;
  version: number;
  readonly numero: string;
  status: 'rascunho' | 'enviada' | 'emPesquisa' | 'aguardandoAutorizacao' | 'autorizada' | 'rejeitada';
  produtoId: string;
  produto: ProdutoResumo;
  dataNecessidade: string;
  details: SolicitacaoParaEnviarDetalhes;
}

export interface Inicio_compradorContracts {
  /**
   * Finalidade: Carrega de uma vez a página inicial do comprador: os alertas de necessidades vencidas e pedidos atrasados e as solicitações em rascunho que ele precisa completar e enviar.
   * Entrada: Nenhuma entrada; o comprador é o usuário logado, identificado pelo servidor.
   * Processamento: Solicitações vencidas: solicitações do comprador logado (compradorId) com necessidadeVencida verdadeira, calculada como dataNecessidade anterior a hoje e situação diferente de autorizada e rejeitada; para cada uma calcula quantidadeOpcoes contando as OpcaoCotacao pela solicitacaoId (no máximo três) e lê o nome do produto no cadastro mestre; ordena pela dataNecessidade mais antiga. Pedidos atrasados: pedidos originados das solicitações do comprador logado, em situação emAberto ou parcialmenteRecebido com dataPrevistaEntrega anterior a hoje; calcula atrasado, diasAtraso (dias entre a data prevista e hoje) e saldoAReceber (quantidade pedida menos a soma dos recebimentos), lê o nome do fornecedor; ordena por diasAtraso decrescente. Os totais são as contagens de cada lista. Solicitações para enviar: solicitações do comprador logado em situação rascunho, com produto (nome e unidade de medida), quantidade, justificativa, dataNecessidade, pendências da conferência e completa calculada conforme solicitacaoCompletaParaEnviar (produto, quantidade maior que zero, justificativa e data preenchidos); ordenadas pela dataNecessidade. Campos derivados são calculados na leitura, nunca gravados.
   * Saída: alertas com os totais e as listas de solicitações vencidas e pedidos atrasados; solicitacoesParaEnviar com as solicitações em rascunho do comprador.
   */
  'compras.inicio_comprador.carregarInicioComprador': {
    kind: 'qry';
    input: {};
    output: { alertas: AlertasPendencias; solicitacoesParaEnviar: SolicitacaoParaEnviar[] };
    rules: ['solicitacaoCompletaParaEnviar'];
    access: { actors: ['comprador']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos']; scope: 'organization' };
  };
  /**
   * Finalidade: Envia uma solicitação em rascunho do comprador para conferência de completude e pesquisa de opções.
   * Entrada: id: a solicitação a enviar; version: versão lida, para controle de concorrência otimista.
   * Processamento: Verifica que a solicitação pertence ao comprador logado, está em rascunho e que a versão confere. Aplica a transição enviar (rascunho → enviada), gravando enviadaEm. quantidadePositiva: recusa se a quantidade não for maior que zero. solicitacaoCompletaParaEnviar: a conferência do sistema verifica produto, quantidade, justificativa e data de necessidade; se faltar algo a solicitação volta a rascunho com as pendências, senão segue para emPesquisa e a pesquisa de opções é disparada. completa é calculada, nunca gravada.
   * Saída: A solicitação enviada, no seu novo estado (enviada, em pesquisa ou de volta a rascunho com pendências), com nova versão, produto, quantidade, justificativa, data de necessidade e completa.
   */
  'compras.inicio_comprador.enviarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.enviar';
    input: { id: string; version: number };
    output: { solicitacao: SolicitacaoParaEnviar };
    rules: ['solicitacaoCompletaParaEnviar', 'quantidadePositiva'];
    access: { actors: ['comprador']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos']; scope: 'organization' };
  };
}
