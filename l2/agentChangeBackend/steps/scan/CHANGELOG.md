# CHANGELOG

## 2026-09-09 — V4 operation without authorityRefs is CB_SCAN_AUTHORITY_REQUIRED

Preflight promotes `CB_SCAN_AUTHORITY_REQUIRED` (operation of a V4 module with empty
`authorityRefs`) to a blocking error. Never a permissive fallback. Pre-n07 l4 without V4 is unchanged.

## 2026-07-22 — rename da task para "<module> - backend"

- No primeiro `updateStatus` module-aware (seleção de owners), a task em execução é renomeada de "agentChangeBackend" para "<module> - backend" via `newTaskTitle` no intent update-status (o mesmo campo já plumbado em collab-messages para o e1-draft do newSolution). O root bootstrap não pode fazê-lo — o módulo só é resolvido aqui pelo scan. `createUpdateStatusIntent` (cbShared) ganhou o parâmetro opcional `newTaskTitle`.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/scan/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
