/// <mls fileReference="_102047_/l2/compras/web/contracts/fornecedores.defs.ts" enhancement="_blank"/>

/** Identificação do fornecedor no cadastro mestre: nome, CNPJ e situação cadastral. */
export interface FornecedorIdentificacao {
  name: string;
  docId: string;
  readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
}

/** Dados de empresa do fornecedor: razão social, nome fantasia e tipo de empresa. */
export interface FornecedorEmpresa {
  legalName: string;
  tradeName?: string;
  companyKind: 'LegalEntity' | 'Branch';
}

/** Outros nomes pelos quais o fornecedor é conhecido. */
export interface FornecedorBase {
  aliases: string;
}

/** Detalhes cadastrais do fornecedor. */
export interface FornecedorDetails {
  identification: FornecedorIdentificacao;
  company: FornecedorEmpresa;
  base: FornecedorBase;
}

/** Fornecedor cadastrado, com identificação, CNPJ, razão social e situação. */
export interface Fornecedor {
  id: string;
  version: number;
  details: FornecedorDetails;
}

/** Nome do contato do fornecedor. */
export interface ContatoIdentificacao {
  name: string;
}

/** Canal de contato: tipo, valor e se foi verificado. */
export interface ContatoCanal {
  contactType: 'Phone' | 'Email' | 'WhatsApp';
  value: string;
  isVerified: boolean;
}

/** Detalhes do contato do fornecedor. */
export interface ContatoDetails {
  identification: ContatoIdentificacao;
  contactChannel: ContatoCanal;
}

/** Telefone, WhatsApp ou e-mail vinculado ao fornecedor. */
export interface ContatoFornecedor {
  id: string;
  details: ContatoDetails;
}

/** Nome do produto no catálogo. */
export interface ProdutoIdentificacao {
  name: string;
}

/** Dados de produto: unidade de medida. */
export interface ProdutoInfo {
  unitOfMeasure?: string;
}

/** Detalhes do produto do catálogo. */
export interface ProdutoDetails {
  identification: ProdutoIdentificacao;
  product: ProdutoInfo;
}

/** Produto do catálogo com nome e unidade de medida. */
export interface Produto {
  id: string;
  details: ProdutoDetails;
}

/** Condições combinadas com o fornecedor para o produto. */
export interface ProdutoFornecidoDetails {
  precoCombinado: string;
  moeda: string;
  prazoEntregaDias?: number;
  observacoes?: string;
}

/** Produto fornecido por um fornecedor com preço combinado, moeda e prazo habitual, junto do nome e unidade do produto. */
export interface ProdutoFornecido {
  id: string;
  version: number;
  fornecedorId: string;
  produtoId: string;
  details: ProdutoFornecidoDetails;
  produto: Produto;
}

export interface FornecedoresContracts {
  /**
   * Finalidade: Localiza fornecedores cadastrados pelo CNPJ ou pela razão social, para conferir se já existem antes de cadastrar.
   * Entrada: texto: CNPJ (com ou sem máscara) ou parte da razão social/nome digitado; ausente lista todos. page e pageSize: página pedida e seu tamanho.
   * Processamento: Se o texto tiver forma de CNPJ, normaliza os dígitos e busca por docId (locate.byDocument, chave única por fornecedorCnpjObrigatorio); senão busca por razão social, nome e outros nomes (locate.byName). Restringe aos registros com papel compras.Fornecedor da organização, ordena por nome e pagina.
   * Saída: Página de fornecedores com id, versão, nome, CNPJ, razão social, nome fantasia, tipo de empresa, outros nomes e situação cadastral.
   */
  'compras.fornecedores.buscarFornecedores': {
    kind: 'qry';
    input: { texto?: string; page: number; pageSize: number };
    output: { fornecedores: { items: Fornecedor[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['fornecedorCnpjObrigatorio'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega a ficha completa de um fornecedor: dados cadastrais, contatos e produtos fornecidos com preço combinado.
   * Entrada: fornecedorId: id do fornecedor escolhido.
   * Processamento: Lê o fornecedor por id, lista seus contatos vinculados por HasContact e os produtos fornecidos pela coluna fornecedorId, compondo em cada um o nome e a unidade de medida do produto lidos do cadastro mestre. Ordena os produtos pelo nome.
   * Saída: O fornecedor com identificação, empresa e outros nomes; a lista de contatos com nome, tipo, valor e verificação; a lista de produtos fornecidos com preço combinado, moeda, prazo de entrega, observações e o produto.
   */
  'compras.fornecedores.obterFichaFornecedor': {
    kind: 'qry';
    input: { fornecedorId: string };
    output: { fornecedor: Fornecedor; contatos: ContatoFornecedor[]; produtosFornecidos: ProdutoFornecido[] };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Encontra produtos do catálogo pelo nome para associá-los ao fornecedor.
   * Entrada: texto: parte do nome ou de outro nome do produto.
   * Processamento: Busca por nome e outros nomes (locate.byName) entre os produtos da organização, ordena por nome e limita a até 20 resultados.
   * Saída: Lista curta de produtos com id, nome e unidade de medida.
   */
  'compras.fornecedores.buscarProdutos': {
    kind: 'qry';
    input: { texto: string };
    output: { produtos: Produto[] };
    rules: [];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Cadastra um novo fornecedor ou vincula ao papel compras.Fornecedor o registro mestre já existente com o mesmo CNPJ.
   * Entrada: details.identification.docType: sempre CNPJ; details.identification.docId: número do CNPJ; details.identification.name: nome de reconhecimento; details.identification.countryCode: país do documento (BR); details.company.companyKind: pessoa jurídica ou filial; details.company.legalName: razão social; details.company.tradeName: nome fantasia; details.base.aliases: outros nomes.
   * Processamento: Aplica fornecedorCnpjObrigatorio: recusa sem CNPJ, valida a forma do CNPJ e recusa se já houver fornecedor de compras com o mesmo CNPJ; se o registro mestre existe sem o papel, vincula (register.createOrAttach). Exige razão social. Situação, papéis e datas são preenchidos pela plataforma.
   * Saída: O fornecedor criado ou vinculado, ativo, com id, versão, identificação, empresa e outros nomes.
   */
  'compras.fornecedores.salvarFornecedor': {
    kind: 'cmd';
    writes: 'Fornecedor.create';
    input: { details: { identification: { docType: 'CNPJ'; docId: string; name: string; countryCode: string }; company: { companyKind: 'LegalEntity' | 'Branch'; legalName: string; tradeName?: string }; base: { aliases?: string } } };
    output: { fornecedor: Fornecedor };
    rules: ['fornecedorCnpjObrigatorio'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
  /**
   * Finalidade: Associa um produto do catálogo ao fornecedor com o preço combinado.
   * Entrada: fornecedorId: fornecedor recém-cadastrado ou aberto; produtoId: produto escolhido; details.precoCombinado: preço unitário acordado; details.moeda: código ISO 4217; details.prazoEntregaDias: prazo habitual em dias; details.observacoes: condições adicionais.
   * Processamento: Aplica precoCombinadoPositivo: recusa preço menor ou igual a zero ou sem moeda. Aplica produtoFornecidoUnicoPorFornecedor: recusa se o produto já está associado a este fornecedor. Grava a associação e lê do cadastro mestre o nome e a unidade do produto.
   * Saída: O produto fornecido criado, com id, versão, fornecedor, produto (nome e unidade), preço combinado, moeda, prazo e observações.
   */
  'compras.fornecedores.adicionarProdutoFornecido': {
    kind: 'cmd';
    writes: 'ProdutoFornecido.create';
    input: { fornecedorId: string; produtoId: string; details: { precoCombinado: string; moeda: string; prazoEntregaDias?: number; observacoes?: string } };
    output: { produtoFornecido: ProdutoFornecido };
    rules: ['produtoFornecidoUnicoPorFornecedor', 'precoCombinadoPositivo'];
    access: { actors: ['comprador', 'gerenteCompras']; grants: ['compradorCadastros', 'gerenteCadastrosConsulta']; scope: 'organization' };
  };
}
