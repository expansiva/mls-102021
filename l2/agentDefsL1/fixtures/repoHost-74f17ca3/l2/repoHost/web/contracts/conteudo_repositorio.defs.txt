/// <mls fileReference="_102047_/l2/repoHost/web/contracts/conteudo_repositorio.defs.ts" enhancement="_blank"/>

/** Dados descritivos de uma pasta ou arquivo do repositório: nome e tamanho. */
export interface ItemArvoreDetalhes {
  name: string;
  sizeBytes?: number;
}

/** Pasta ou arquivo do repositório com seu caminho, tipo e pasta pai. */
export interface ItemArvore {
  id: string;
  path: string;
  entryType: 'folder' | 'file';
  parentEntryId?: string;
  details: ItemArvoreDetalhes;
}

/** Dados de um arquivo do repositório informados pelo serviço: nome, versão do conteúdo, tamanho, tipo de mídia e última sincronização. */
export interface ArquivoDetalhes {
  name: string;
  contentVersion?: string;
  sizeBytes?: number;
  mimeType?: string;
  lastSyncedAt?: string;
}

/** Arquivo do repositório com seus dados de versão e sincronização e o conteúdo atual trazido do serviço que o hospeda. */
export interface ArquivoRepositorio {
  id: string;
  path: string;
  entryType: 'folder' | 'file';
  details: ArquivoDetalhes;
  conteudo: string;
}

export interface Conteudo_repositorioContracts {
  /**
   * Finalidade: Lista as pastas e arquivos do repositório de uma pasta (ou da raiz) ou os que correspondem a uma busca pelo caminho, para navegação.
   * Entrada: parentEntryId: id da pasta cujo conteúdo é listado; ausente lista os itens da raiz. busca: texto contido no caminho; quando informado, busca em todo o repositório ignorando a pasta. page e pageSize: página solicitada e tamanho da página.
   * Processamento: Sem busca, usa listByForeignKey/locate.byColumn filtrando por parentEntryId (itens sem pasta pai quando ausente); a pasta informada deve ser do tipo folder (repoHostParentMustBeFolder). Com busca, usa locate.byText sobre o caminho. Ordena pastas antes de arquivos e depois por nome; o nome é o último trecho do caminho (repoHostNameFromPath). Escopo da organização do administrador.
   * Saída: Página de itens { items, page, pageSize, hasMore } com id, caminho, tipo, pasta pai, nome e tamanho (tamanho só para arquivos).
   */
  'repoHost.conteudo_repositorio.listarItensRepositorio': {
    kind: 'qry';
    input: { parentEntryId?: string; busca?: string; page: number; pageSize: number };
    output: { itens: { items: ItemArvore[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['repoHostParentMustBeFolder', 'repoHostNameFromPath'];
    access: { actors: ['administrador']; grants: ['administradorConsultaRepositorio']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre um arquivo do repositório e traz o conteúdo atual do serviço que o hospeda junto com os dados de versão e sincronização.
   * Entrada: id: id do item do repositório escolhido.
   * Processamento: Lê o item por read.byId; se for uma pasta, recusa a leitura, pois pasta não tem conteúdo, tamanho nem tipo de mídia (repoHostFolderHasNoContent). Chama repoHost.readFileContent para obter o conteúdo atual pelo caminho; o conteúdo não é guardado.
   * Saída: O arquivo com id, caminho, tipo, nome, versão do conteúdo, tamanho, tipo de mídia, última sincronização e o conteúdo como está no repositório.
   */
  'repoHost.conteudo_repositorio.lerArquivo': {
    kind: 'qry';
    input: { id: string };
    output: { arquivo: ArquivoRepositorio };
    rules: ['repoHostFolderHasNoContent'];
    access: { actors: ['administrador']; grants: ['administradorConsultaRepositorio']; scope: 'organization' };
  };
}
