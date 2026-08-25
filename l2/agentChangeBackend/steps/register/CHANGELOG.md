# CHANGELOG

## 2026-08-25 — registro reconcilia, não acrescenta

- `updateL5BackendConfig` remove do `l5/project.json` o backend cujo `tableDefsDir` já não existe no stor (módulo regenerado com outro nome).
- O merge em `l5/config.json` (`saveBackendWorkspaceConfig` + `nodejsSaveConfigJson`) deixa de appendar: `persistenceModules` e `backendControllers` passam a ser o conjunto vivo do l5. Órfãos saem nomeados no log.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/register/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
