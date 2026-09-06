# gen-adapter — Geração dos repository adapters

## Agentes

- agentCbRepositoryAdapter (cb-gen-adapter dispatcher + cb-adapter-fanout worker)

## Input

Agregados (split coluna/details + mdmRefs) e eventos persistidos. O dispatcher lista os ids; cada worker recebe **um** item.

## Output

l1/{module}/.../{entity}RepositoryAdapter.defs.ts (um por agregado e por evento persistido). Enfileira cb-gen-usecase **join no fan-out** (`dependsOn cb-adapter-fanout`), nunca no dispatcher.

## Invariantes

- Dispatcher não chama LLM. Worker: 1 LLM call, 1 `.defs.ts`.
- Barreira = `cb-adapter-fanout`. Dispatcher completa no instante em que despacha.
- `sanitizeAdapterNotes` em todo caminho de escrita (worker `saveDefs` e reúso `rewriteAdapterDefsNotes`).
- MDM via ctx.mdm (nunca tabela local); ctx.data.moduleData só aqui.
- Slots = `CB_MAX_PARALLEL` (o mesmo do `cb-domain-fanout`).

## Prompt

`prompt.md` (marcador `<!-- modelType -->`; placeholder `{{toolName}}` resolvido em runtime via `cbShared.readCbPrompt`). O worker usa o mesmo prompt de sistema; o human leva só o item daquele slot.
