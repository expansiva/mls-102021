/// <mls fileReference="_102047_/l2/tarefas/web/contracts/participantes.defs.ts" enhancement="_blank"/>

/** Usuário da organização que participa do módulo de tarefas, com sua situação, papéis, as marcas do gestor e as marcas efetivas de aceitar e criar tarefas. */
export interface ParticipanteModulo {
  id: string;
  version: number;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      readonly tags: string;
    };
    tarefas: {
      aceitaTarefas?: boolean;
      podeCriarTarefas?: boolean;
      readonly aceitaTarefasEfetivo: boolean;
      readonly podeCriarTarefasEfetivo: boolean;
    };
  };
}

/** Usuário ativo da organização que ainda não participa do módulo de tarefas, identificado apenas pelo nome lido da plataforma. */
export interface UsuarioOrganizacao {
  id: string;
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
  };
}

export interface ParticipantesContracts {
  /**
   * Finalidade: Lista os participantes do módulo de tarefas da organização, com busca opcional pelo nome.
   * Entrada: busca: trecho do nome do participante (opcional); page e pageSize: página pedida e tamanho da página.
   * Processamento: Localiza pelo papel tarefas.Participante os registros da organização, filtra pelo nome quando há busca e ordena pelo nome. Calcula aceitaTarefasEfetivo e podeCriarTarefasEfetivo pela regra participanteNaoConfiguradoAceitaECria: marca vazia vale sim; os campos efetivos são calculados, nunca gravados. Devolve só identificação e marcas do módulo, sem dado pessoal.
   * Saída: Página { items, page, pageSize, hasMore } de participantes com id, versão, nome, situação, papéis, marcas do gestor (vazias quando não configurado) e marcas efetivas.
   */
  'tarefas.participantes.listarParticipantes': {
    kind: 'qry';
    input: { busca?: string; page: number; pageSize: number };
    output: { participantes: { items: ParticipanteModulo[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['participanteNaoConfiguradoAceitaECria'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca pelo nome, entre os usuários da organização, quem pode ser incluído como participante.
   * Entrada: busca: trecho do nome do usuário digitado pelo gestor.
   * Processamento: Consulta a lista de usuários da plataforma pelo nome, mantém apenas usuários ativos que ainda não têm o papel tarefas.Participante e limita o resultado aos primeiros encontrados. Pela regra participanteSemCadastroPessoal não lê nem devolve dado pessoal, apenas o nome.
   * Saída: Lista curta de usuários com id, nome e situação.
   */
  'tarefas.participantes.buscarUsuarios': {
    kind: 'qry';
    input: { busca: string };
    output: { usuarios: UsuarioOrganizacao[] };
    rules: ['participanteSemCadastroPessoal'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes']; scope: 'organization' };
  };
  /**
   * Finalidade: Inclui um usuário da organização como participante do módulo de tarefas.
   * Entrada: id: id do usuário escolhido na busca; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas opcionais do gestor, deixadas vazias quando não informadas.
   * Processamento: Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma). Marca o papel tarefas.Participante no registro do usuário e grava só o espaço do módulo, sem cadastrar pessoa nem pedir dado pessoal (participanteSemCadastroPessoal). Marcas não informadas ficam vazias e valem sim (participanteNaoConfiguradoAceitaECria); marcas já existentes do gestor não são sobrescritas automaticamente (escolhaGestorNuncaSobrescrita). Os campos efetivos são calculados na leitura.
   * Saída: O participante incluído, no novo estado, com versão, marcas do gestor e marcas efetivas.
   */
  'tarefas.participantes.incluirParticipante': {
    kind: 'cmd';
    writes: 'Participante.create';
    input: { id: string; details: { tarefas: { aceitaTarefas?: boolean; podeCriarTarefas?: boolean } } };
    output: { participante: ParticipanteModulo };
    rules: ['participanteSemCadastroPessoal', 'participanteNaoConfiguradoAceitaECria', 'escolhaGestorNuncaSobrescrita', 'gestorPorAcessoPlataforma'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes']; scope: 'organization' };
  };
  /**
   * Finalidade: Grava as marcas de aceitar tarefas e de poder criar tarefas de um participante.
   * Entrada: id e version: participante escolhido e versão lida, para concorrência otimista; details.tarefas.aceitaTarefas e details.tarefas.podeCriarTarefas: marcas escolhidas pelo gestor.
   * Processamento: Verifica pelo acesso da plataforma que quem chama é gestor (gestorPorAcessoPlataforma) e recusa se a versão mudou. Grava as duas marcas só no espaço do módulo; por escolhaGestorNuncaSobrescrita, só o gestor altera essas marcas e nenhum processo automático as substitui. Os campos efetivos são recalculados (participanteNaoConfiguradoAceitaECria), nunca gravados. A mudança fica registrada na auditoria da plataforma.
   * Saída: O participante no novo estado, com a nova versão, as marcas do gestor e as marcas efetivas.
   */
  'tarefas.participantes.salvarMarcas': {
    kind: 'cmd';
    writes: 'Participante.update';
    input: { id: string; version: number; details: { tarefas: { aceitaTarefas: boolean; podeCriarTarefas: boolean } } };
    output: { participante: ParticipanteModulo };
    rules: ['escolhaGestorNuncaSobrescrita', 'participanteNaoConfiguradoAceitaECria', 'gestorPorAcessoPlataforma'];
    access: { actors: ['gestor']; grants: ['gestorParticipantes']; scope: 'organization' };
  };
}
