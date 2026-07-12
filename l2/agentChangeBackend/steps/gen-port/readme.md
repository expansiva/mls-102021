# gen-port — Geração dos repository ports

## Agentes

- agentCbRepositoryPort (cb-gen-port)

## Input

Agregados + eventos.

## Output

l1/{module}/layer_2_application/ports/*.defs.ts. Enfileira cb-gen-table.

## Invariantes

LLM, camada inteira. Ports tipados em termos de dominio (sem SQL).

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
