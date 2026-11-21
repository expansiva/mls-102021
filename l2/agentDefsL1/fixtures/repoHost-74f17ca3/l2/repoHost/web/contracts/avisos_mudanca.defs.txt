/// <mls fileReference="_102047_/l2/repoHost/web/contracts/avisos_mudanca.defs.ts" enhancement="_blank"/>

/** Aviso de mudança do repositório em forma resumida: quando mudou, a mensagem de registro e o autor. */
export interface AvisoResumo {
  id: string;
  changedAt: string;
  details: AvisoResumoDetalhes;
}

/** Dados do aviso informados pelo serviço: mensagem de registro e autor. */
export interface AvisoResumoDetalhes {
  commitMessage: string;
  author?: string;
}

/** Aviso de mudança do repositório completo: quando mudou, a mensagem de registro, o autor e os arquivos afetados. */
export interface AvisoCompleto {
  id: string;
  changedAt: string;
  details: AvisoDetalhes;
}

/** Dados do aviso informados pelo serviço: mensagem de registro, autor e arquivos afetados. */
export interface AvisoDetalhes {
  commitMessage: string;
  author?: string;
  files: ArquivoAfetado[];
}

/** Arquivo afetado por uma mudança do repositório, com o tipo de alteração. */
export interface ArquivoAfetado {
  path: string;
  change: 'added' | 'modified' | 'removed';
}

export interface Avisos_mudancaContracts {
  /**
   * Finalidade: Lista os avisos de mudança recebidos do serviço do repositório, em páginas, para acompanhamento pelo administrador.
   * Entrada: page: número da página pedida; pageSize: quantidade de avisos por página.
   * Processamento: Busca os avisos de mudança da organização e ordena por changedAt decrescente, do mais recente ao mais antigo (repoHostChangesNewestFirst). Pagina pelo page e pageSize informados.
   * Saída: Página de avisos com id, momento da mudança, mensagem de registro e autor, no formato { items, page, pageSize, hasMore }.
   */
  'repoHost.avisos_mudanca.listarAvisos': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { avisos: { items: AvisoResumo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['repoHostChangesNewestFirst'];
    access: { actors: ['administrador']; grants: ['administradorAcompanhaAvisos']; scope: 'organization' };
  };
  /**
   * Finalidade: Abre um aviso de mudança pelo id com todos os seus dados.
   * Entrada: id: identificador do aviso escolhido.
   * Processamento: Lê o aviso pelo id dentro da organização do administrador, com a lista de arquivos afetados e o tipo de alteração de cada um.
   * Saída: O aviso com momento da mudança, mensagem de registro completa, autor e arquivos afetados (caminho e tipo de alteração).
   */
  'repoHost.avisos_mudanca.obterAviso': {
    kind: 'qry';
    input: { id: string };
    output: { aviso: AvisoCompleto };
    rules: [];
    access: { actors: ['administrador']; grants: ['administradorAcompanhaAvisos']; scope: 'organization' };
  };
}
