# CHANGELOG

## 2026-08-31 — o texto das regras L4 chega ao prompt (não só o id)

O worker recebia `useRules` como id opaco e inventava predicados (petição sem imagem virava
inválida). O prompt agora leva id + título + descrição só das regras que a entidade (e membros
embutidos) referencia. Skill: predicado que rejeita só existe com regra/constraint; na dúvida,
comente.

## 2026-08-28 — o workflow do l4 chega ao prompt; invariante que nega par declarado é finding

O scan descartava entity lifecycles (não são owners). O modelo recebia só o enum de status e inventava
terminais (`pending→completed` negado embora a matriz `fromStates` o declare). O payload do worker
passa a incluir `lifecycle.allowed` (terminais = estados SEM aresta de saída — o campo `terminalStates`
do l4 é informativo e pode contradizer a matriz). Invariante que nega um par declarado falha o
afterPromptStep; validate-all confronta o mapa `*_STATUS_TRANSITIONS` gerado (é o que o usecase chama).
Sem workflow, invariantes de integridade seguem livres.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-domain/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
