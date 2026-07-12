# gen-seeds — Geração dos seeds

## Agentes

- agentCbSeeds (cb-gen-seeds)

## Input

L4/L5 + table defs.

## Output

l1/{module}/.../persistence/seeds.ts. Enfileira cb-register.

## Invariantes

Hibrido: LLM planeja (JSON estrito), cbSeedsCore compila/valida deterministicamente. 1 repair.

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
