# CHANGELOG

## 2026-08-30 — projeção derivada no judge (sem port, como MDM)

O gerador de usecase já omite o port de `kind: derived`. O judge ainda tratava "lê entidade sem
port" como estrutural — o finding de `downloadSignaturesCsv`/`SignatureExport`. Lista de derivadas
no cabeçalho do batch (ausente quando o módulo não tem nenhuma) e carve-out na regra 1: faltar
port para derivada não é erro; declarar port para ela é.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/judge/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
