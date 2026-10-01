/// <mls fileReference="_102047_/l2/controleEstoque/web/contracts/movimentacoes.defs.ts" enhancement="_blank"/>

export interface MovimentacaoEstoqueLoad {
  id: string;
  produtoId: string;
  movimentadoEm: string;
  details: {
    tipo: 'entrada' | 'saida';
    quantidade: number;
  };
}

export interface ProdutoLoad {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    product: {
      unitOfMeasure: string;
    };
    controleEstoque: {
      quantidadeMinima: number;
      readonly saldoAtual: number;
      readonly saldoAbaixoDoMinimo: boolean;
    };
  };
}

export interface MovimentacoesContracts {
  'controleEstoque.movimentacoes.load': {
    kind: 'qry';
    input: { produtoId?: string; page?: number; pageSize?: number };
    output: { movimentacoes: MovimentacaoEstoqueLoad[]; produtos: ProdutoLoad[]; pageHistoricoMovimentacoes: number; pageSizeHistoricoMovimentacoes: number; hasMoreHistoricoMovimentacoes: boolean };
    meta: { output: { movimentacoes: { entity: 'MovimentacaoEstoque'; many: true }; produtos: { entity: 'Produto'; many: true } }; lists: { historicoMovimentacoes: { key: 'movimentacoes'; page: 'pageHistoricoMovimentacoes'; pageSize: 'pageSizeHistoricoMovimentacoes'; hasMore: 'hasMoreHistoricoMovimentacoes' } }; params: { produtoId: { filters: 'movimentacoes'; field: 'produtoId' }; page: { pages: 'historicoMovimentacoes' }; pageSize: { pages: 'historicoMovimentacoes' } } };
    rules: ['movimentacaoEstoqueImutavel', 'quantidadeMovimentadaPositiva', 'registroMovimentacaoAtualizaSaldo', 'quantidadeMinimaValida', 'saldoAtualProduto', 'avisoSaldoMinimoProduto'];
    access: { actors: ['estoquista']; grants: ['gerenciarEstoque']; scope: 'organization' };
  };
  'controleEstoque.movimentacoes.registrarMovimentacao': {
    kind: 'cmd';
    writes: 'MovimentacaoEstoque.create';
    input: { produtoId: string; movimentadoEm: string; details: { tipo: 'entrada' | 'saida'; quantidade: number } };
    output: { movimentacaoEstoque: MovimentacaoEstoqueLoad };
    meta: { output: { movimentacaoEstoque: { entity: 'MovimentacaoEstoque'; many: false } }; lists: {}; params: {} };
    rules: ['movimentacaoEstoqueImutavel', 'quantidadeMovimentadaPositiva', 'registroMovimentacaoAtualizaSaldo'];
    access: { actors: ['estoquista']; grants: ['gerenciarEstoque']; scope: 'organization' };
  };
}
