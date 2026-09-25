# agentMaterializeL1

Studio and the CLI run the same plan. `simulate` does not call a model and does not write.

```
@@agentMaterializeL1 /help
```

```
@@agentMaterializeL1 <module> /simulate
@@agentMaterializeL1 <module> /structure
@@agentMaterializeL1 <module> /implement
@@agentMaterializeL1 <module> /verify
@@agentMaterializeL1 <module> /resume
```

Add `flow:<id>` to select one flow. An unknown flow is refused. The agent does not ask which file to open.

CLI, from the mls-base root:

```
tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --help
tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --project <id> --module <lowerCamel> [--stage simulate|structure|implement|verify] [--flow <id>] [--resume] [--output <dir>] [--workers <n>] [--timeout-ms <n>] [--repairs <n>] [--calls <n>]
```

Defaults: stage `simulate`, 2 workers, 120s call timeout, 1 repair per artifact, 4 repairs and 24 model calls per run. A tighter stored budget wins. Those ceilings are not raised. The profile is `appEnv` in `l5/project.json`. If it is absent the mode is `presentation`, not production.
