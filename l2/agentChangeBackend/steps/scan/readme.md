# scan — Scan / readiness / lock (entrada determinística)

## Agentes

- agentCbScanCreateOwners (cb-scan)
- agentCbValidateL4Readiness (cb-validate-readiness)
- agentCbLockOwners (cb-lock)

## Input

l4/{module} + l5/{module}/todoBackend.defs.ts (owners status=toCreate).

## Output

Owners validados e marcados inProgress; enfileira cb-gen-domain. Sem trabalho => encerra sem escrever.

## Invariantes

Deterministicos (sem LLM). Unica mutacao de status antes do sucesso e o lock toCreate->inProgress.
