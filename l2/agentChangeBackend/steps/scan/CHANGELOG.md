# CHANGELOG

## 2026-07-22 — rename da task para "<module> - backend"

- No primeiro `updateStatus` module-aware (seleção de owners), a task em execução é renomeada de "agentChangeBackend" para "<module> - backend" via `newTaskTitle` no intent update-status (o mesmo campo já plumbado em collab-messages para o e1-draft do newSolution). O root bootstrap não pode fazê-lo — o módulo só é resolvido aqui pelo scan. `createUpdateStatusIntent` (cbShared) ganhou o parâmetro opcional `newTaskTitle`.

## 2026-07-11 — migração ns3 (todo/modernizeChangeBackend.md)

- Step movido do folder plano `agentChangeBackend/` para `steps/scan/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
