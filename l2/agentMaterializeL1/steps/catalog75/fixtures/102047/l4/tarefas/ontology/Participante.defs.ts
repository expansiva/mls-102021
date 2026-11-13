/// <mls fileReference="_102047_/l4/tarefas/ontology/Participante.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasEntityParticipante = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "tarefas",
  "entityId": "Participante",
  "title": "Participante",
  "description": "Usuário da organização escolhido pelo gestor na lista de usuários da plataforma para participar do módulo. O módulo não cadastra nem pede dado pessoal; guarda no seu espaço apenas se aceita tarefas e se pode criar tarefas (sem configuração, aceita e pode criar). É o responsável e quem criou cada tarefa.",
  "displayField": "details.identification.name",
  "relationships": {
    "tarefasComoResponsavel": {
      "relationshipId": "tarefaResponsavel",
      "to": "Tarefa",
      "via": "Tarefa.responsavelId",
      "cardinality": "1:N",
      "title": "Tarefas de que é responsável",
      "description": "Tarefas em que o participante é o responsável.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "tarefasCriadas": {
      "relationshipId": "tarefaCriador",
      "to": "Tarefa",
      "via": "Tarefa.criadorId",
      "cardinality": "1:N",
      "title": "Tarefas que criou",
      "description": "Tarefas criadas pelo participante, que ele revisa, aceita, devolve, reatribui ou cancela.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "register.createOrAttach": "Só anexa o papel tarefas.Participante a um usuário da organização que já existe, escolhido em locate.users pelo id; nunca cria pessoa nem pede dado pessoal (participanteSemCadastroPessoal).",
    "locate.users": "O gestor escolhe, na lista de usuários da organização com busca pelo nome, quem passa a participar do módulo, sem cadastrar ninguém nem pedir dado pessoal; a mesma lista, filtrada pelo papel tarefas.Participante, alimenta a escolha do responsável.",
    "locate.byName": "Quem cria ou reatribui uma tarefa busca o responsável pelo nome entre os participantes, nunca pelo e-mail.",
    "read.byId": "Telas de tarefas, lista e quadro preenchem o nome do responsável e de quem criou a partir do id do participante.",
    "locate.byTag": "O módulo lista todos os participantes pelo papel tarefas.Participante para a tela de configuração do gestor e para os filtros por responsável.",
    "edit.moduleNamespace": "O gestor inclui o usuário como participante (marcando o papel no seu registro) e marca se aceita tarefas e se pode criar tarefas, escrevendo só o espaço do módulo de tarefas.",
    "inactivate": "O gestor tira um participante de uso sem apagá-lo, mantendo o histórico das tarefas, e pode reativá-lo depois.",
    "listLinks": "A tela do participante mostra as tarefas de que é responsável e as que criou.",
    "audit": "Registra quem mudou as marcas de aceitar e criar tarefas e quando, lido no módulo de auditoria da plataforma.",
    "tarefas.filtrarAceitaTarefas": "Ao escolher o responsável, mostra só participantes ativos que aceitam tarefas (marcados ou ainda não configurados); usado por quem cria ou reatribui.",
    "tarefas.verificarPodeCriar": "Antes de abrir o formulário de nova tarefa, verifica se a pessoa da sessão pode criar tarefas (marcada ou ainda não configurada); usado pelo membro da equipe."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "participanteNaoConfiguradoAceitaECria",
    "escolhaGestorNuncaSobrescrita",
    "gestorPorAcessoPlataforma",
    "responsavelAceitaTarefas",
    "criarTarefaExigePodeCriar",
    "participanteSemCadastroPessoal"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "tarefas.Participante",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro da pessoa no MDM, visto pelo módulo de tarefas: usuário da organização escolhido pelo gestor na lista de usuários da plataforma.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre pessoa: o participante é um usuário da organização.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do usuário, usado para escolher o responsável na lista com busca, como se menciona alguém numa conversa. Lido da plataforma, nunca digitado no módulo.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Unificado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação no MDM",
                "description": "Situação do registro na plataforma; só usuários ativos aparecem para escolha."
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis do registro nos módulos; tarefas.Participante indica que o usuário participa do módulo de tarefas.",
                "title": "Papéis"
              }
            },
            "description": "Camada de identificação da plataforma; o módulo apenas lê."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Camada base da plataforma; o módulo não usa nenhum campo dela."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados de pessoa da plataforma; o módulo não pede nem usa dado pessoal."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo apenas lê."
          },
          "tarefas": {
            "type": "object",
            "owner": "module",
            "fields": {
              "aceitaTarefas": {
                "type": "boolean",
                "title": "Aceita tarefas",
                "description": "Marca do gestor dizendo se o participante pode ser escolhido como responsável. Vazio enquanto não configurado (vale como sim); uma vez marcada, nunca é sobrescrita automaticamente."
              },
              "podeCriarTarefas": {
                "type": "boolean",
                "title": "Pode criar tarefas",
                "description": "Marca do gestor dizendo se o participante pode criar tarefas. Vazio enquanto não configurado (vale como sim); uma vez marcada, nunca é sobrescrita automaticamente."
              },
              "aceitaTarefasEfetivo": {
                "type": "boolean",
                "derived": true,
                "title": "Aceita tarefas (efetivo)",
                "description": "A marca de aceitar tarefas feita pelo gestor; quando o gestor ainda não configurou o participante, vale sim."
              },
              "podeCriarTarefasEfetivo": {
                "type": "boolean",
                "derived": true,
                "title": "Pode criar tarefas (efetivo)",
                "description": "A marca de poder criar tarefas feita pelo gestor; quando o gestor ainda não configurou o participante, vale sim."
              }
            },
            "description": "O que só o módulo de tarefas sabe sobre o participante: as marcas do gestor. Ausência de uma marca significa ainda não configurado."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type TarefasEntityParticipanteType = typeof tarefasEntityParticipante;

export default tarefasEntityParticipante;
