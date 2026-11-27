/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/callerModule.test.ts" enhancement="_blank"/>

// d1_349 s4: the gate that refuses a comparison of `ctx.moduleId` with a text other than the module itself, in usecases and in processes.

import assert from 'node:assert/strict';
import test from 'node:test';

import { callerModuleProblems } from '/_102021_/l2/agentMaterializeL1/helpers/callerModule.js';
import { usecaseGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { workflowGate } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

void test('d1_349 s4: ctx.moduleId against a text that is not the module is a problem, whatever the operator or the side', () => {
  for (const code of [
    "if (ctx.moduleId !== 'cm') throw new Error('x');",
    'if (ctx.moduleId != "cm") return;',
    "const ok = 'cm' === ctx.moduleId;",
    'if (context.moduleId == `cm`) return;',
  ]) {
    const problems = callerModuleProblems(code, 'telegram');
    assert.equal(problems.length, 1, code);
    assert.match(problems[0], /^CALLER_MODULE_COMPARED: .*ctx\.requestMeta\?\.connection\?\.connectionId === 'cm'/u, code);
  }
  assert.match(callerModuleProblems("if (ctx.moduleId !== 'cm') return;", 'telegram')[0], /ctx\.moduleId is always the module that runs; to know the cm is the caller read ctx\.requestMeta\?\.connection\?\.connectionId === 'cm'\./u);
});

void test('d1_349 s4: the own module, a comment, a variable and the connection are not problems', () => {
  for (const code of [
    "if (ctx.moduleId !== 'telegram') return;",
    "// ctx.moduleId !== 'cm' is wrong here\nconst a = 1;",
    'if (ctx.moduleId !== other) return;',
    "if (ctx.requestMeta?.connection?.connectionId === 'cm') return;",
    'const id = ctx.moduleId;',
  ]) assert.deepEqual(callerModuleProblems(code, 'telegram'), [], code);
});

void test('d1_349 s4: the usecase gate and the process gate carry it', () => {
  const code = "/// h\nexport async function f(input: unknown, ctx: RequestContext) { if (ctx.moduleId !== 'cm') throw new Error('x'); }\n";
  const use = usecaseGate(code, { header: '/// h', functionName: 'f', project: 1, moduleName: 'telegram', ruleIds: [] } as never);
  assert.ok(use.some(item => item.startsWith('CALLER_MODULE_COMPARED')), use.join('\n'));
  const flow = workflowGate(code, { header: '/// h', facts: { processId: 'p', trigger: { kind: 'manual', actorRef: '', event: '', schedule: '' }, occurrence: '', functions: [], operations: [] }, project: 1, moduleName: 'telegram', ports: [] });
  assert.ok(flow.some(item => item.startsWith('CALLER_MODULE_COMPARED')), flow.join('\n'));
});
