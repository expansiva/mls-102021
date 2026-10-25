/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateParticipante.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateParticipante",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/participante.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "updateParticipante",
    "entityId": "Participante",
    "operation": "update",
    "rulesApplied": [
      "criarTarefaExigePodeCriar",
      "escolhaGestorNuncaSobrescrita",
      "gestorPorAcessoPlataforma",
      "participanteNaoConfiguradoAceitaECria",
      "participanteSemCadastroPessoal",
      "responsavelAceitaTarefas"
    ],
    "effects": [],
    "mdm": {
      "namespace": "tarefas",
      "role": "tarefas.Participante",
      "atomic": true,
      "calls": [
        {
          "id": "update",
          "method": "update",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "edit.moduleNamespace"
          ],
          "alternative": false,
          "when": [],
          "arguments": [
            {
              "name": "mdmId",
              "role": "selector",
              "origin": {
                "kind": "contract",
                "path": "id"
              },
              "path": "id"
            },
            {
              "name": "expectedVersion",
              "role": "parameter",
              "origin": {
                "kind": "contract",
                "path": "version",
                "evidence": "writePrecondition"
              },
              "path": "version"
            },
            {
              "name": "tarefas",
              "role": "patch",
              "origin": {
                "kind": "contract",
                "path": "details.tarefas"
              },
              "capability": "edit.moduleNamespace",
              "path": "details.tarefas"
            }
          ],
          "result": [
            "mdmId",
            "version",
            "details"
          ]
        }
      ]
    }
  }
} as const;

export default definition;
