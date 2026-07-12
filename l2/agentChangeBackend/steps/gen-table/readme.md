# gen-table — Geração das TableDefinition

## Agentes

- agentCbPersistenceTable (cb-gen-table)

## Input

Agregados + eventos + plano de colunas (cbShared.planTableColumns).

## Output

l1/{module}/layer_1_external/adapters/persistence/{table}.defs.ts. Enfileira cb-gen-adapter.

## Invariantes

LLM, camada inteira. Colunas indexadas reais + details JSONB. MDM/reaction nao geram tabela.

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
