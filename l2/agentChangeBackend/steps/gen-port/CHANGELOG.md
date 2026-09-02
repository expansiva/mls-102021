# CHANGELOG

## 2026-09-02 — requiredMethods no plano do port (delete)

O item do gen-port carrega `requiredMethods` derivado das operações `delete*` do l4
(não do nome de arquivo). Se a LLM omitir `delete`, o afterPrompt completa a
assinatura e registra `systemDecision`. Event ports continuam append-only.

## 2026-08-25 — ListFilter inclui search/sortBy/sortOrder

Quando o l4 da lista declara esses inputs, o filtro da porta os carrega (search string, sortBy
união fechada, sortOrder asc|desc). Sem eles no l4, o filtro permanece só PK/FK/status.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-port/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
