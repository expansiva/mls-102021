# gen-usecase — Geração dos usecases (fan-out) + roteamento de repair

## Agentes

- agentCbUsecase (cb-gen-usecase dispatcher + cb-usecase-fanout worker)

## Input

Um owner de operacao por worker; findings do juiz (cb-repair-state) no re-spawn.

## Output

l1/{module}/layer_2_application/usecases/{usecase}.defs.ts. Junta em cb-judge.

## Invariantes

Worker NUNCA retorna 'failed' (falha completa-com-trace + repair). Dispatcher adiciona o join antes de completar.

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
