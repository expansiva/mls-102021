# judge — Juiz adversarial (crítico)

## Agentes

- agentCbJudge (cb-judge)

## Input

usecase defs vs contrato L4.

## Output

cb-repair-state.json (findings roteados aos workers). Enfileira cb-gen-http.

## Invariantes

LLM valida, nunca gera. Erros re-spawnam workers; leftovers viram warning (gates deterministicos bloqueiam).

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
