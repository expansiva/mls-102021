d1_286: the three files of the L4 pool that the working tree of mls-102047 had changed over 30b4af69 when `@@agentDefsL1 agents /run` was refused (backend.json, effort.json, postprocess.json),
and the resolve25.json of that round. The rest of the entry is `git archive 30b4af69 l1/agents l2/agents l4/agents l4/organization`, which the test extracts.
