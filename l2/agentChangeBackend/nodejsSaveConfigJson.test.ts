/// <mls fileReference="_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { composeBackendRuntimeConfig } from '/_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.js';

const CLIENT_ID = '109001';

function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function withRoot(run: (root: string, clientRoot: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-config-mlsdep-'));
  try {
    const clientRoot = path.join(root, `mls-${CLIENT_ID}`);
    fs.mkdirSync(path.join(clientRoot, 'l5'), { recursive: true });
    run(root, clientRoot);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('mlsDep.json from the backend compose includes both runtimeProject masters and is idempotent', () => {
  withRoot((root, clientRoot) => {
    const controllers = path.join(clientRoot, 'l1', 'todo', 'layer_1_external', 'adapters', 'http', 'controllers');
    const persistence = path.join(clientRoot, 'l1', 'todo', 'layer_1_external', 'adapters', 'persistence');
    fs.mkdirSync(controllers, { recursive: true });
    fs.mkdirSync(persistence, { recursive: true });
    writeFile(path.join(clientRoot, 'l5', 'project.json'), `${JSON.stringify({
      masters: {
        frontend: { runtimeProject: 102033 },
        backend: { runtimeProject: 102034 },
      },
      modules: [{
        moduleName: 'todo',
        backend: {
          backendControllers: `./_${CLIENT_ID}_/l1/todo/layer_1_external/adapters/http/controllers`,
          persistence: { tableDefsDir: `./_${CLIENT_ID}_/l1/todo/layer_1_external/adapters/persistence` },
          routeKeys: ['todo.taskCatalogue.qryListTask'],
        },
      }],
    }, null, 2)}\n`);
    writeFile(path.join(clientRoot, 'l5', 'config.json'), `${JSON.stringify({
      workspaceDependencies: [CLIENT_ID, '102020', '102021', '102027', '102029'],
    }, null, 2)}\n`);

    composeBackendRuntimeConfig(root, CLIENT_ID);
    const dest = path.join(clientRoot, 'mlsDep.json');
    const first = fs.readFileSync(dest, 'utf8');
    const parsed = JSON.parse(first) as { workspaceDependencies: string[] };
    assert.ok(parsed.workspaceDependencies.includes('102033'));
    assert.ok(parsed.workspaceDependencies.includes('102034'));
    assert.ok(parsed.workspaceDependencies.includes('102020'));
    composeBackendRuntimeConfig(root, CLIENT_ID);
    assert.equal(fs.readFileSync(dest, 'utf8'), first);
  });
});
