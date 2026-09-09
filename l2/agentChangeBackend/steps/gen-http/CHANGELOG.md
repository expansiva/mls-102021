# CHANGELOG

## 2026-09-09 — authorityRefs on handlers + profile table + sessionScope

Each handler carries `authorityRefs` from V4 and `public: true` when the covering grant is public.
Emits `layer_1_external/auth/profileAuthorities.ts` (profile → actors → authorityRefs) and
`layer_2_application/scope/sessionScope.ts` (person-scope predicate from the declared anchor).

## 2026-08-28 — barreira de visibilidade + rota descartada tem nome

Este passo LÊ o que o fan-out de usecases escreveu: ganha o mesmo `refreshProjectIndex()` do
`agentCbJudge` antes de varrer o índice. E a bffCall descartada por defs de usecase ilegível deixa de
ser silenciosa (`skipped` era jogado fora): cada rota perdida entra no status do passo, inclusive
quando o workspace perde TODAS as suas e nem arquivo de controller nasce. O `cb-validate-all` refaz a
conferência contra o contrato l4.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-http/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
