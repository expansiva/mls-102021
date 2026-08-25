# register — Registro determinístico do backend

## Agentes

- agentCbRegister (cb-register)

## Input

Artefatos l1 gerados.

## Output

l5/project.json (modules[].backend). Enfileira cb-validate-all.

## Invariantes

Determinístico. Rotas/tabelas descobertas em runtime (inversao de dependencia). masters.backend.agentFolder = 'agentChangeBackend' (raiz).
Registro é reconciliação, não append: backend block cujo diretório de persistência sumiu sai do `project.json`; o merge em `l5/config.json` (finalize + composer de publish) descarta o mesmo órfão em `persistenceModules` / `backendControllers` e declara o nome no log.
