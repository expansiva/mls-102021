/// <mls fileReference="_102047_/l2/comandaRestaurante/web/contracts/mesas.defs.ts" enhancement="_blank"/>

/** Dados completos de uma mesa necessários para exibir a lista da casa, preencher a seleção no formulário e redesenhar a página após manutenção. */
export interface MesaResumo {
  id: string;
  version: number;
  code: string;
  details: {
    readonly disponivel: boolean;
  };
}

export interface MesasContracts {
  /**
   * Finalidade: Carrega as mesas da casa para o caixa consultar seus códigos, conferir a disponibilidade e selecionar uma mesa para manutenção.
   * Entrada: Não recebe parâmetros; considera o escopo organizacional autorizado para o caixa.
   * Processamento: Obtém as mesas visíveis ao caixa e as ordena pelo código. Para cada mesa, compõe identificador, versão, código e disponibilidade. A disponibilidade é derivada pela inexistência de comanda aberta vinculada e é calculada nesta consulta, sem ser gravada. A lista representa o conjunto físico de mesas da casa e é carregada integralmente, sem paginação.
   * Saída: Retorna as mesas no formato consumido pela lista e pelo formulário selecionado. A versão acompanha cada registro para permitir atualização concorrente segura.
   */
  'comandaRestaurante.mesas.carregarMesas': {
    kind: 'qry';
    input: {};
    output: { mesas: MesaResumo[] };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Cadastra uma mesa para a operação do restaurante e devolve seu estado completo para redesenhar a página.
   * Entrada: code é o código da nova mesa informado pelo caixa.
   * Processamento: Cria a mesa com o código recebido, aplicando as validações de criação e a unicidade do código no repositório. Depois compõe o identificador, a versão, o código e a disponibilidade. A disponibilidade é derivada da inexistência de comanda aberta vinculada, é calculada no retorno e não é gravada pelo comando.
   * Saída: Retorna a mesa criada no formato usado pela lista e pelo formulário, permitindo inseri-la na lista sem uma segunda chamada.
   */
  'comandaRestaurante.mesas.criarMesa': {
    kind: 'cmd';
    writes: 'Mesa.create';
    input: { code: string };
    output: { mesa: MesaResumo };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
  /**
   * Finalidade: Atualiza o código da mesa selecionada e devolve seu estado completo e corrente para redesenhar a página.
   * Entrada: id identifica a mesa selecionada, version protege a gravação contra atualização concorrente e code é o código informado pelo caixa.
   * Processamento: Localiza a mesa pelo identificador, confere a versão recebida e atualiza seu código, aplicando as validações de manutenção e a unicidade do código. Em seguida compõe o identificador, a nova versão, o código e a disponibilidade derivada. A disponibilidade é calculada pela inexistência de comanda aberta vinculada e não é armazenada por este comando.
   * Saída: Retorna a mesa atualizada no formato da lista e do formulário, permitindo atualizar a linha e manter a versão corrente sem nova consulta.
   */
  'comandaRestaurante.mesas.atualizarMesa': {
    kind: 'cmd';
    writes: 'Mesa.update';
    input: { id: string; version: number; code: string };
    output: { mesa: MesaResumo };
    rules: [];
    access: { actors: ['caixa']; grants: ['caixaFechamentoEcadastroOperacional']; scope: 'organization' };
  };
}
