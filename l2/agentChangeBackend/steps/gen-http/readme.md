# gen-http — Geração determinística dos controllers HTTP (BFF)

## Agentes

- agentCbHttpController (cb-gen-http)

## Input

usecases gerados (funcoes exportadas reais).

## Output

l1/{module}/.../http/controllers/{owner}.defs.ts. Enfileira cb-materialize (ou cb-gen-seeds).

## Invariantes

Determinístico (sem LLM). Coerencia por construcao (handler liga a funcao real do usecase).
