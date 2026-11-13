/// <mls fileReference="_102047_/l2/compras/web/contracts/meu_cadastro.defs.ts" enhancement="_blank"/>

/** Cadastro do comprador da sessão com nome, situação e e-mail de acesso. */
export interface MeuCadastroComprador {
  id: string;
  details: MeuCadastroCompradorDetails;
}

/** Detalhes do comprador: identificação e dados de compras. */
export interface MeuCadastroCompradorDetails {
  identification: MeuCadastroCompradorIdentification;
  compras: MeuCadastroCompradorCompras;
}

/** Identificação do comprador: nome e situação no cadastro mestre. */
export interface MeuCadastroCompradorIdentification {
  name: string;
  readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
}

/** Dados do comprador no módulo de compras: e-mail de acesso. */
export interface MeuCadastroCompradorCompras {
  readonly loginEmail?: string;
}

export interface Meu_cadastroContracts {
  /**
   * Finalidade: Carrega o cadastro do comprador da sessão para conferência dos dados de identificação e de acesso, somente leitura.
   * Entrada: Nenhuma entrada: o comprador é identificado pelo servidor a partir do usuário logado.
   * Processamento: Localiza o registro Comprador do usuário logado (escopo próprio) e lê nome e situação da identificação. O e-mail de acesso (loginEmail) é derivado: lido do login da plataforma no momento da consulta, nunca gravado pelo endpoint. A situação também é derivada do cadastro mestre.
   * Saída: O registro do comprador da sessão com id, nome, situação (Active, Inactive, Merged ou Blocked) e e-mail de acesso.
   */
  'compras.meu_cadastro.qryMeuCadastro': {
    kind: 'qry';
    input: {};
    output: { comprador: MeuCadastroComprador };
    rules: [];
    access: { actors: ['comprador']; grants: ['compradorProprioRegistro', 'compradorListaCompradores']; scope: 'own' };
  };
}
