/// <mls fileReference="_102047_/l2/compras/web/contracts/solicitacoes.defs.ts" enhancement="_blank"/>

/** Solicitação de compra resumida com produto, comprador, fornecedores das opções pesquisadas e indicadores de completude, quantidade de opções e necessidade vencida. */
export interface SolicitacaoResumo {
  id: string;
  readonly numero: string;
  status: 'rascunho' | 'enviada' | 'emPesquisa' | 'aguardandoAutorizacao' | 'autorizada' | 'rejeitada';
  produtoId: string;
  produto: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  comprador: {
    details: {
      identification: {
        name: string;
      };
    };
  };
  opcaoCotacao: {
    fornecedorNome: string[];
  };
  enviadaEm?: string;
  dataNecessidade: string;
  details: {
    readonly completa: boolean;
    readonly quantidadeOpcoes: number;
    readonly necessidadeVencida: boolean;
  };
}

/** Opção de fornecedor e preço pesquisada pela IA para a solicitação, sempre uma estimativa, com fonte, data da pesquisa, valor total estimado e indicação de escolha. */
export interface OpcaoPesquisada {
  id: string;
  readonly posicao: number;
  fornecedorNome: string;
  details: {
    precoUnitario: string;
    moeda: 'BRL' | 'USD' | 'EUR';
    prazoEntregaDias?: number;
    fonte: {
      url?: string;
      descricao?: string;
    };
    readonly valorTotalEstimado: string;
    readonly escolhida: boolean;
    estimativa: boolean;
  };
  tipoFonte: 'web' | 'previousPurchase' | 'registeredSupplier';
  readonly dataPesquisa: string;
}

/** Pedido de compra gerado pela autorização da solicitação. */
export interface PedidoGerado {
  id: string;
  readonly numero: string;
  readonly dataEmissao: string;
}

/** Solicitação de compra completa com produto, quantidade, justificativa, marcos do processo do sistema, até três opções pesquisadas e o pedido gerado quando autorizada. */
export interface SolicitacaoDetalhe {
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
  details: {
    quantidade: number;
    justificativa: string;
    conferidaEm?: string;
    pendencias?: string;
    pesquisadaEm?: string;
    decididaEm?: string;
    motivoRejeicao?: string;
    readonly completa: boolean;
    readonly quantidadeOpcoes: number;
    readonly necessidadeVencida: boolean;
  };
  dataNecessidade: string;
  opcaoEscolhidaId?: string;
  enviadaEm?: string;
  opcoes: OpcaoPesquisada[];
  pedidoGerado?: PedidoGerado;
}

/** Produto ativo do catálogo que pode ser solicitado, com sua unidade de medida. */
export interface ProdutoEscolha {
  id: string;
  details: {
    identification: {
      name: string;
    };
    product: {
      unitOfMeasure?: string;
    };
  };
}

export interface SolicitacoesContracts {
  /**
   * Finalidade: Pesquisa as solicitações de compra da organização por produto, fornecedor, situação e período de envio, já com os indicadores de completude, opções e necessidade vencida.
   * Entrada: produtoId: produto da solicitação; opcaoCotacao.fornecedorNome: texto procurado no nome do fornecedor das opções pesquisadas; status: situação da solicitação (aguardandoAutorizacao localiza as pendentes do gerente); enviadaDe/enviadaAte: período da data de envio; numero: número da solicitação; page/pageSize: paginação.
   * Processamento: Filtra SolicitacaoCompra por colunas (produtoId, status, enviadaEm no período) e pelo número; quando há fornecedorNome, mantém só as solicitações com alguma OpcaoCotacao cujo fornecedorNome contenha o texto. Ordena da mais recente para a mais antiga. Compõe o nome do produto e do comprador pelo cadastro mestre e os nomes dos fornecedores das opções numa única leitura por página. Calcula completa (produto, quantidade > 0, justificativa e data preenchidos), quantidadeOpcoes (contagem das opções, no máximo três) e necessidadeVencida (dataNecessidade antes de hoje e situação diferente de autorizada e rejeitada); nada disso é gravado.
   * Saída: Página de solicitações resumidas { items, page, pageSize, hasMore } com número, situação, produto, comprador, fornecedores das opções, envio, necessidade e indicadores.
   */
  'compras.solicitacoes.listarSolicitacoes': {
    kind: 'qry';
    input: { produtoId?: string; opcaoCotacao: { fornecedorNome?: string }; status?: 'rascunho' | 'enviada' | 'emPesquisa' | 'aguardandoAutorizacao' | 'autorizada' | 'rejeitada'; enviadaDe?: string; enviadaAte?: string; numero?: string; page: number; pageSize: number };
    output: { solicitacoes: { items: SolicitacaoResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega a solicitação escolhida com suas opções pesquisadas, os marcos do processo do sistema e o pedido gerado.
   * Entrada: id: id da solicitação de compra.
   * Processamento: Lê a SolicitacaoCompra pelo id, o produto (nome e unidade) do cadastro mestre, as até três OpcaoCotacao pela solicitacaoId ordenadas pela posição e o PedidoCompra pela solicitacaoId, quando existir. Calcula escolhida (id igual a opcaoEscolhidaId), valorTotalEstimado (preço unitário × quantidade da solicitação, na moeda da opção), completa, quantidadeOpcoes e necessidadeVencida. Toda opção sai com estimativa verdadeira (opcaoSomenteEstimativa).
   * Saída: A solicitação na situação atual, com versão, dados do pedido, datas de envio, conferência, pesquisa e decisão, pendências, motivo de rejeição, opções e o pedido gerado (número e emissão) quando autorizada.
   */
  'compras.solicitacoes.obterSolicitacao': {
    kind: 'qry';
    input: { id: string };
    output: { solicitacao: SolicitacaoDetalhe };
    rules: ['opcaoSomenteEstimativa'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Encontra produtos pelo nome digitado para escolher o produto de uma nova solicitação ou filtrar a pesquisa.
   * Entrada: details.identification.name: texto procurado no details.identification.name do produto; vazio traz os produtos marcados com compras.Produto.
   * Processamento: Localiza Produto pelo nome (ou pela tag compras.Produto quando sem texto) e mantém apenas os ativos (produtoInativoNaoSolicitado). Limita a 20 resultados ordenados pelo nome.
   * Saída: Lista de produtos ativos com id, nome e unidade de medida.
   */
  'compras.solicitacoes.buscarProdutos': {
    kind: 'qry';
    input: { details: { identification: { name?: string } } };
    output: { produtos: ProdutoEscolha[] };
    rules: ['produtoInativoNaoSolicitado'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre uma nova solicitação de compra em rascunho.
   * Entrada: produtoId: produto pedido; details.quantidade: details.quantidade na unidade do produto; details.justificativa: motivo da necessidade; dataNecessidade: data em que o produto precisa estar disponível; compradorId: comprador responsável escolhido da lista de usuários, quando ausente o servidor usa o usuário logado; opcaoEscolhidaId: opção escolhida, sempre vazia na criação (só é preenchida na autorização).
   * Processamento: Recusa quantidade menor ou igual a zero (quantidadePositiva), produto inativo (produtoInativoNaoSolicitado) e comprador inativo (compradorInativoNaoAbreSolicitacao). O comprador vem sempre da lista de usuários da organização com papel compras.Comprador, nunca é cadastrado aqui (compradorEscolhidoDaListaDeUsuarios); sem compradorId, usa o usuário da sessão. Recusa opcaoEscolhidaId preenchida, pois só a autorização escolhe opção. Emite o número pela sequência do módulo e grava com situação rascunho.
   * Saída: A solicitação criada, em rascunho, com número, versão, produto e indicadores calculados, sem opções.
   */
  'compras.solicitacoes.criarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.create';
    input: { produtoId: string; details: { quantidade: number; justificativa: string }; dataNecessidade: string; compradorId?: string; opcaoEscolhidaId?: string };
    output: { solicitacao: SolicitacaoDetalhe };
    rules: ['quantidadePositiva', 'produtoInativoNaoSolicitado', 'compradorInativoNaoAbreSolicitacao', 'compradorEscolhidoDaListaDeUsuarios'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Envia a solicitação em rascunho para conferência e pesquisa de opções.
   * Entrada: id: solicitação a enviar; version: versão lida, para concorrência otimista.
   * Processamento: Exige situação rascunho e versão atual. Aplica a transição enviar, registrando enviadaEm; recusa quantidade não positiva (quantidadePositiva). A conferência de completude do sistema (solicitacaoCompletaParaEnviar) segue para a pesquisa ou devolve ao rascunho com pendências.
   * Saída: A solicitação na nova situação, com enviadaEm e versão atualizada.
   */
  'compras.solicitacoes.enviarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.enviar';
    input: { id: string; version: number };
    output: { solicitacao: SolicitacaoDetalhe };
    rules: ['solicitacaoCompletaParaEnviar', 'quantidadePositiva'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Autoriza a solicitação escolhendo uma das opções pesquisadas e gera o pedido de compra.
   * Entrada: id e version: solicitação e versão lida; opcaoEscolhidaId: opção escolhida; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.
   * Processamento: Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Exige opção (autorizacaoExigeOpcao) pertencente à própria solicitação (opcaoDaMesmaSolicitacao). Na mesma transação aplica a transição autorizar e cria um único pedido (umPedidoPorSolicitacao, pedidoSomenteDeSolicitacaoAutorizada) com número sequencial (numeroPedidoSequencial), fornecedor, preço, moeda e prazo da opção e produto e quantidade da solicitação, com data prevista = emissão + prazo (pedidoUsaOpcaoEscolhida).
   * Saída: A solicitação autorizada, com opção marcada como escolhida, decididaEm, nova versão e o pedido gerado (número e emissão).
   */
  'compras.solicitacoes.autorizarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.autorizar';
    input: { id: string; version: number; opcaoEscolhidaId: string; details: { decididaEm?: string } };
    output: { solicitacao: SolicitacaoDetalhe };
    rules: ['apenasGerenteDecide', 'autorizacaoExigeOpcao', 'opcaoDaMesmaSolicitacao', 'pedidoSomenteDeSolicitacaoAutorizada', 'pedidoUsaOpcaoEscolhida', 'umPedidoPorSolicitacao', 'numeroPedidoSequencial'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
  /**
   * Finalidade: Rejeita a solicitação registrando o motivo informado pelo gerente.
   * Entrada: id e version: solicitação e versão lida; details.motivoRejeicao: motivo da rejeição; details.decididaEm: momento da decisão, preenchido pelo servidor com agora quando ausente.
   * Processamento: Só o gerente de compras, com a solicitação aguardando autorização (apenasGerenteDecide). Recusa motivo vazio (rejeicaoExigeMotivo). Aplica a transição rejeitar gravando motivo e decididaEm.
   * Saída: A solicitação rejeitada, com motivo, decididaEm, nova versão e suas opções.
   */
  'compras.solicitacoes.rejeitarSolicitacao': {
    kind: 'cmd';
    writes: 'SolicitacaoCompra.rejeitar';
    input: { id: string; version: number; details: { motivoRejeicao: string; decididaEm?: string } };
    output: { solicitacao: SolicitacaoDetalhe };
    rules: ['apenasGerenteDecide', 'rejeicaoExigeMotivo'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'compradorSolicitacoesPedidos', 'compradorProprioRegistro', 'compradorListaCompradores', 'gerenteCadastrosConsulta', 'gerenteSolicitacoesPedidos', 'gerenteCompradores']; scope: 'organization' };
  };
}
