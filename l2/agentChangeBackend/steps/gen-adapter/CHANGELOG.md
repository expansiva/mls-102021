# CHANGELOG

## 2026-07-11 — migração ns3 (todo/modernizeChangeBackend.md)

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-adapter/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
