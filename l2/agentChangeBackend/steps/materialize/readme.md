# materialize — Materialização .defs.ts -> .ts (barreira por camada)

## Agentes

- agentCbMaterialize (cb-materialize dispatcher + cb-mat-L{rank} worker)

## Input

.defs.ts stale + dependsFiles (.d.ts) + skills.

## Output

l1/{module}/**/*.ts. Enfileira cb-gen-seeds quando todas as camadas stale terminam.

## Invariantes

INVARIANTE: 1 camada por dispatch (addParallelArgs forca parent a in_progress; criar todas de uma vez NAO e barreira). Compartilha o core (cbMaterializeCore/Io) com o CLI nodejsMaterializeL1 — fronteira congelada.
