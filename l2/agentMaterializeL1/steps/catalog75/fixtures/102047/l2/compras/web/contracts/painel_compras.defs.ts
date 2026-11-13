/// <mls fileReference="_102047_/l2/compras/web/contracts/painel_compras.defs.ts" enhancement="_blank"/>

/** Linha mensal do painel de compras de um fornecedor: total comprado e quantidade de pedidos gerados no mês. */
export interface TotalFornecedor {
  readonly fornecedorId: string;
  fornecedor: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  details: {
    readonly totalComprado: string;
    readonly quantidadePedidos: number;
  };
}

/** Resumo do painel de compras de um mês: indicadores gerais da organização e total comprado por fornecedor. */
export interface ResumoMes {
  readonly periodo: string;
  details: {
    readonly solicitacoesAguardandoAutorizacao: number;
    readonly pedidosEmAberto: number;
    readonly pedidosAtrasados: number;
  };
  totaisPorFornecedor: TotalFornecedor[];
}

/** Opção de fornecedor e preço pesquisada pela IA para uma solicitação de compra, sempre uma estimativa. */
export interface OpcaoPesquisada {
  id: string;
  readonly posicao: number;
  fornecedorNome: string;
  tipoFonte: 'web' | 'previousPurchase' | 'registeredSupplier';
  readonly dataPesquisa: string;
  details: {
    precoUnitario: string;
    moeda: 'BRL' | 'USD' | 'EUR';
    prazoEntregaDias?: number;
    fonte: {
      descricao?: string;
    };
    observacao?: string;
    readonly valorTotalEstimado: string;
    readonly escolhida?: boolean;
  };
}

/** Solicitação de compra com produto, comprador, dados da necessidade, decisão do gerente e suas opções pesquisadas. */
export interface SolicitacaoEmDecisao {
  id: string;
  version: number;
  readonly numero: string;
  status: 'rascunho' | 'enviada' | 'emPesquisa' | 'aguardandoAutorizacao' | 'autorizada' | 'rejeitada';
  produtoId: string;
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
  compradorId: string;
  comprador: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  dataNecessidade: string;
  enviadaEm?: string;
  details: {
    quantidade: number;
    justificativa: string;
    readonly necessidadeVencida: boolean;
    readonly quantidadeOpcoes: number;
    decididaEm?: string;
    motivoRejeicao?: string;
  };
  opcaoEscolhidaId?: string;
  opcoes: OpcaoPesquisada[];
}

/** Pedido de compra não totalmente recebido cuja data prevista de entrega já passou, com fornecedor, produto, atraso e saldo a receber. */
export interface PedidoAtrasado {
  id: string;
  readonly numero: string;
  status: 'emAberto' | 'parcialmenteRecebido' | 'recebido';
  fornecedorId: string;
  fornecedor: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  produtoId: string;
  produto: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  dataPrevistaEntrega: string;
  details: {
    readonly atrasado: boolean;
    readonly diasAtraso: number;
    readonly saldoAReceber: number;
    readonly valorTotal: string;
    moeda: 'BRL' | 'USD' | 'EUR';
  };
}

export interface Painel_comprasContracts {
  /**
   * Finalidade: Carrega de uma vez tudo o que o painel de compras mostra ao abrir: indicadores do mês corrente, total comprado por fornecedor, solicitações aguardando decisão do gerente com suas opções e a primeira página dos pedidos atrasados.
   * Entrada: page e pageSize: página e tamanho da página da lista de pedidos atrasados (padrão página 1).
   * Processamento: Lê o PainelCompras do mês corrente (actualDate): a linha geral (fornecedorId vazio) fornece solicitacoesAguardandoAutorizacao, pedidosEmAberto e pedidosAtrasados; as linhas por fornecedor fornecem totalComprado e quantidadePedidos (totalCompradoPorFornecedorNoMes: soma de quantidade × preço unitário dos pedidos gerados no mês), com o nome do fornecedor lido do cadastro mestre, ordenadas por total decrescente. Lista as solicitações da organização com status aguardandoAutorizacao (solicitacaoAguardandoAutorizacao), ordenadas por dataNecessidade, com nome do produto e unidade, nome do comprador e as até três opções (maximoTresOpcoes) ordenadas por posição, buscadas em lote por solicitacaoId; necessidadeVencida, quantidadeOpcoes e valorTotalEstimado (preço unitário × quantidade da solicitação) são calculados, e as opções são apresentadas como estimativa (opcaoSomenteEstimativa). Lista os pedidos em aberto ou parcialmente recebidos com dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, calculando atrasado, diasAtraso, saldoAReceber e valorTotal.
   * Saída: resumo: indicadores do mês com o total por fornecedor; solicitacoes: solicitações aguardando autorização com suas opções; pedidosAtrasados: página { items, page, pageSize, hasMore } de pedidos atrasados.
   */
  'compras.painel_compras.carregarPainel': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { resumo: ResumoMes; solicitacoes: SolicitacaoEmDecisao[]; pedidosAtrasados: { items: PedidoAtrasado[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['solicitacaoAguardandoAutorizacao', 'pedidoAtrasadoAposDataPrevista', 'totalCompradoPorFornecedorNoMes', 'opcaoSomenteEstimativa', 'maximoTresOpcoes'];
    access: { actors: ['gerenteCompras']; grants: ['gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores', 'gerentePainel']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca as páginas seguintes da lista de pedidos atrasados da organização.
   * Entrada: page: número da página pedida; pageSize: quantidade de pedidos por página.
   * Processamento: Filtra pedidos com status emAberto ou parcialmenteRecebido e dataPrevistaEntrega anterior a hoje (pedidoAtrasadoAposDataPrevista), ordenados por diasAtraso decrescente, mesmo critério de carregarPainel; lê nomes de fornecedor e produto do cadastro mestre; atrasado, diasAtraso, saldoAReceber e valorTotal são calculados.
   * Saída: pedidos: página { items, page, pageSize, hasMore } de pedidos atrasados com fornecedor, produto, data prevista, dias de atraso e saldo a receber.
   */
  'compras.painel_compras.listarPedidosAtrasados': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { pedidos: { items: PedidoAtrasado[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['pedidoAtrasadoAposDataPrevista'];
    access: { actors: ['gerenteCompras']; grants: ['gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores', 'gerentePainel']; scope: 'organization' };
  };
  /**
   * Finalidade: Autoriza uma solicitação aguardando autorização escolhendo uma das opções pesquisadas, gerando o pedido de compra.
   * Entrada: id e version: solicitação e versão lida (concorrência otimista); opcaoEscolhidaId: opção pesquisada escolhida pelo gerente; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.
   * Processamento: Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); exige opção informada (autorizacaoExigeOpcao) e pertencente à própria solicitação (opcaoDaMesmaSolicitacao); recusa versão divergente. Executa a transição autorizar gravando opcaoEscolhidaId e decididaEm e, na mesma transação, gera um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção, produto e quantidade da solicitação e data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).
   * Saída: solicitacao: a solicitação em status autorizada, com a opção escolhida, decididaEm e suas opções (escolhida marcada).
   */
  'compras.painel_compras.autorizarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.autorizar';
    input: { id: string; version: number; opcaoEscolhidaId: string; details: { decididaEm?: string } };
    output: { solicitacao: SolicitacaoEmDecisao };
    rules: ['apenasGerenteDecide', 'autorizacaoExigeOpcao', 'opcaoDaMesmaSolicitacao', 'pedidoSomenteDeSolicitacaoAutorizada', 'pedidoUsaOpcaoEscolhida', 'umPedidoPorSolicitacao', 'numeroPedidoSequencial'];
    access: { actors: ['gerenteCompras']; grants: ['gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores', 'gerentePainel']; scope: 'organization' };
  };
  /**
   * Finalidade: Rejeita uma solicitação aguardando autorização registrando o motivo informado pelo gerente.
   * Entrada: id e version: solicitação e versão lida (concorrência otimista); details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, quando ausente o servidor usa o momento atual.
   * Processamento: Recusa se quem chama não é gerente de compras ou se a solicitação não está em aguardandoAutorizacao (apenasGerenteDecide); recusa motivo vazio (rejeicaoExigeMotivo); recusa versão divergente. Executa a transição rejeitar gravando motivoRejeicao e decididaEm; nenhum pedido é gerado.
   * Saída: solicitacao: a solicitação em status rejeitada, com motivo, decididaEm e suas opções.
   */
  'compras.painel_compras.rejeitarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.rejeitar';
    input: { id: string; version: number; details: { motivoRejeicao: string; decididaEm?: string } };
    output: { solicitacao: SolicitacaoEmDecisao };
    rules: ['apenasGerenteDecide', 'rejeicaoExigeMotivo'];
    access: { actors: ['gerenteCompras']; grants: ['gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores', 'gerentePainel']; scope: 'organization' };
  };
}
