d1_287: the checkpoint files of `l1/agents/pipeline/agentDefsL1` of mls-102047 in two states, copied byte for byte (23-24/11/2026).
A: after the first round `@@agentDefsL1 agents /run` held at resolve25 (EXTERNAL_ROUTE_CALL_UNRESOLVED), with a fresh `l1/agents` that `@@agentNewReleaseL1` left (no def on disk).
B: after the `/run` and the `/rederive domain30` that followed (REMOVE_WITHOUT_RECEIPT:2, marker `before: {}`); `input.json` and `resolve25.json` are the same bytes as in A, so B keeps only what differs.
The L2, L4 and l4/organization come from `git archive 30b4af69` and the three pool files from `fixtures/d1_286-refused`.
