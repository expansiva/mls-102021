# register — Registro determinístico do backend

## Agentes

- agentCbRegister (cb-register)

## Input

Artefatos l1 gerados.

## Output

l5/project.json (modules[].backend). Enfileira cb-validate-all.

## Invariantes

Determinístico. Rotas/tabelas descobertas em runtime (inversao de dependencia). masters.backend.agentFolder = 'agentChangeBackend' (raiz).
