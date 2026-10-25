/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createParticipante.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createParticipante",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/participante.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createParticipante",
    "entityId": "Participante",
    "operation": "create",
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
      "atomic": false,
      "calls": [
        {
          "id": "attachRole",
          "method": "attachRole",
          "target": "entity",
          "shape": "write",
          "capabilities": [
            "register.createOrAttach"
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
              "name": "role",
              "role": "parameter",
              "origin": {
                "kind": "literal",
                "evidence": "role"
              },
              "value": "tarefas.Participante"
            }
          ],
          "result": [
            "mdmId",
            "version"
          ]
        },
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
                "kind": "prior",
                "path": "mdmId",
                "calls": [
                  "attachRole"
                ]
              }
            },
            {
              "name": "expectedVersion",
              "role": "parameter",
              "origin": {
                "kind": "prior",
                "path": "version",
                "calls": [
                  "attachRole"
                ]
              }
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
