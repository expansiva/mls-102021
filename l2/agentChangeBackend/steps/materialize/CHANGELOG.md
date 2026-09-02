# CHANGELOG

## 2026-09-02 — requiredMethods no `.ts` materializado do port

A pós-checagem do plano (gen-port `ensureRequiredPortMethods`) permanece. O
materialize do port lê `requiredMethods` do `.defs.ts` e, se a interface do `.ts`
omitiu um método exigido, completa deterministicamente (`delete(id: XId):
Promise<void>` quando `XId` está no arquivo) e registra `systemDecision`. Método
não derivável vira finding. Event ports continuam append-only. O guard do
adapter (`adapterPortMethodIssues` / validate-all) já lê o `.ts` materializado,
não o plano.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/materialize/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
