# gen-adapter — Geração dos repository adapters

## Agentes

- agentCbRepositoryAdapter (cb-gen-adapter)

## Input

Agregados (split coluna/details + mdmRefs).

## Output

l1/{module}/.../{entity}RepositoryAdapter.defs.ts. Enfileira cb-gen-usecase.

## Invariantes

LLM, camada inteira. MDM via ctx.mdm (nunca tabela local); ctx.data.moduleData so aqui.

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
