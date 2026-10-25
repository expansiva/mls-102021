/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/participante.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "Participante",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [],
  "data": {
    "entityId": "Participante",
    "storageTarget": "mdm",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.identification",
        "type": "object"
      },
      {
        "name": "details.identification.subtype",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.identification.name",
        "type": "string"
      },
      {
        "name": "details.identification.status",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.identification.tags",
        "type": "string",
        "derived": true
      },
      {
        "name": "details.base",
        "type": "object"
      },
      {
        "name": "details.person",
        "type": "object"
      },
      {
        "name": "details.general",
        "type": "object"
      },
      {
        "name": "details.tarefas",
        "type": "object"
      },
      {
        "name": "details.tarefas.aceitaTarefas",
        "type": "boolean"
      },
      {
        "name": "details.tarefas.podeCriarTarefas",
        "type": "boolean"
      },
      {
        "name": "details.tarefas.aceitaTarefasEfetivo",
        "type": "boolean",
        "derived": true
      },
      {
        "name": "details.tarefas.podeCriarTarefasEfetivo",
        "type": "boolean",
        "derived": true
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [
      "participanteNaoConfiguradoAceitaECria",
      "escolhaGestorNuncaSobrescrita",
      "gestorPorAcessoPlataforma",
      "responsavelAceitaTarefas",
      "criarTarefaExigePodeCriar",
      "participanteSemCadastroPessoal"
    ],
    "imports": []
  }
} as const;

export default definition;
