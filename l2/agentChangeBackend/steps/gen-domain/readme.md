# gen-domain — Geração da camada de domínio

## Agentes

- agentCbDomainEntity (cb-gen-domain)

## Input

Agregados derivados (cbShared.deriveAggregates) + eventos persistidos.

## Output

l1/{module}/layer_3_domain/entities/*.defs.ts (+ value-objects). Enfileira cb-gen-port.

## Invariantes

LLM, camada inteira em uma chamada. Entidades puras (sem persistencia/ctx.data).

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`).
