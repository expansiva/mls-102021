/// <mls fileReference="_102047_/l2/compras/web/contracts/produtos.defs.ts" enhancement="_blank"/>

/** Produto do catálogo de compras com os dados de identificação, código, classificação, unidade de medida, controle de estoque e situação no cadastro. */
export interface ProdutoResumo {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    product: {
      sku?: string;
      category?: string;
      brand?: string;
      unitOfMeasure?: string;
      isInventoried?: boolean;
    };
  };
}

/** Cadastro completo de um produto do catálogo de compras, com versão para controle de concorrência, nomes, país, código, classificação, unidade de medida, controle de estoque, observações e situação. */
export interface ProdutoDetalhe {
  id: string;
  version: number;
  details: {
    identification: {
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      name: string;
      countryCode: string;
    };
    base: {
      aliases: string;
      notes?: string;
    };
    product: {
      sku?: string;
      category?: string;
      brand?: string;
      unitOfMeasure?: string;
      isInventoried?: boolean;
    };
  };
}

export interface ProdutosContracts {
  /**
   * Finalidade: Carrega a primeira página do catálogo de produtos usados nas compras ao abrir a página.
   * Entrada: page: número da página (começa em 1); pageSize: quantidade de produtos por página.
   * Processamento: Seleciona os produtos da organização marcados com o papel compras.Produto (locate.byTag), em todas as situações do cadastro, ordenados pelo nome. A situação é lida do cadastro mestre, nunca calculada ou gravada aqui.
   * Saída: Página de produtos com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }.
   */
  'compras.produtos.listarProdutos': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { produtos: { items: ProdutoResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Pesquisa produtos do catálogo de compras pelo nome, outros nomes ou código interno, com filtro opcional por categoria e situação.
   * Entrada: search: texto digitado, comparado com nome, outros nomes e código interno (SKU); details.product.category: categoria exata do produto; details.identification.status: situação no cadastro; page e pageSize: paginação.
   * Processamento: Restringe aos produtos da organização com o papel compras.Produto; aplica a busca textual (locate.byName, incluindo aliases e sku) e os filtros informados; ordena pelo nome e pagina.
   * Saída: Página de produtos encontrados com id, nome, situação, código interno, categoria, marca, unidade de medida e se controla estoque, no formato { items, page, pageSize, hasMore }.
   */
  'compras.produtos.pesquisarProdutos': {
    kind: 'qry';
    input: { search?: string; details: { product: { category?: string }; identification: { status?: 'Active' | 'Inactive' | 'Merged' | 'Blocked' } }; page: number; pageSize: number };
    output: { produtos: { items: ProdutoResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Lê o cadastro completo de um produto escolhido no catálogo para conferência ou alteração.
   * Entrada: id: identificador (mdmId) do produto selecionado.
   * Processamento: Lê o produto pelo id (read.byId) dentro da organização; falha com não encontrado se não existir.
   * Saída: O produto com id, versão atual, situação, nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque.
   */
  'compras.produtos.obterProduto': {
    kind: 'qry';
    input: { id: string };
    output: { produto: ProdutoDetalhe };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Cadastra no catálogo um produto que falta para as compras, ou anexa o papel compras.Produto a um produto já existente no cadastro mestre.
   * Entrada: details.identification.name: nome do produto; details.identification.countryCode: país ISO 3166-1 alfa-2; details.base.aliases: outros nomes; details.base.notes: observações; details.product.sku: código interno; details.product.category: categoria; details.product.brand: marca; details.product.unitOfMeasure: unidade de medida; details.product.isInventoried: se o recebimento dá entrada no estoque.
   * Processamento: Valida a forma do documento (país alfa-2, nome obrigatório) e cria o produto pelo register.createOrAttach, com subtipo Product e o papel compras.Produto; id, versão, subtipo, situação e papéis são preenchidos pelo motor, nunca pela página.
   * Saída: O produto criado, em situação Active, com id, versão inicial e todos os dados cadastrados.
   */
  'compras.produtos.cadastrarProduto': {
    kind: 'cmd';
    writes: 'Produto.create';
    input: { details: { identification: { name: string; countryCode: string }; base: { aliases: string; notes?: string }; product: { sku?: string; category?: string; brand?: string; unitOfMeasure?: string; isInventoried?: boolean } } };
    output: { produto: ProdutoDetalhe };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Grava as correções do cadastro de um produto existente do catálogo.
   * Entrada: id: id do produto alterado; version: versão lida, para concorrência otimista; demais campos: novos valores de nome, país, outros nomes, observações, código interno, categoria, marca, unidade de medida e controle de estoque.
   * Processamento: Recusa com conflito se a versão informada diferir da atual; valida a forma do documento e atualiza os campos da plataforma (edit.platformFields). A situação, o subtipo e os papéis não são alterados aqui; a versão é incrementada pelo motor.
   * Saída: O produto alterado, com a nova versão, sua situação atual e todos os dados gravados.
   */
  'compras.produtos.salvarAlteracaoProduto': {
    kind: 'cmd';
    writes: 'Produto.update';
    input: { id: string; version: number; details: { identification: { name: string; countryCode: string }; base: { aliases: string; notes?: string }; product: { sku?: string; category?: string; brand?: string; unitOfMeasure?: string; isInventoried?: boolean } } };
    output: { produto: ProdutoDetalhe };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
}
