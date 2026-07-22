/// <mls fileReference="_102021_/l2/agentChangeBackend/agentChangeBackend.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Stage 3 backend reconciler — ROOT, with a small CLI. v1 is autonomous and create-only.
// The root LLM is SKIPPED (AgentIntentAddMessageAI.skipRootLLM) — bootstrap is deterministic.
// A run ALWAYS targets a single module (keeps each task small); commands take an optional [module]
// (case-sensitive; "all" is a keyword, never a module). No module -> the first (sorted) module with
// pending owners. The resolved module is persisted in longMemory so every step scopes to the same one.
// Usage (type after the agent mention):
//   /rebuild all [module]   reset the target module's owners -> toCreate, then regenerate defs AND
//                           materialize the .ts (files overwritten in place by saveDefs)
//   /rebuild defs [module]  reset the target module's owners -> toCreate and regenerate .defs.ts ONLY
//   /run [module]           generate for the target module's pending owners (toCreate | inProgress)
//   <module>                same as /run for that module (bare non-keyword token)
//   (empty mention)         same as /run: continue the first module with pending owners
//   /help                   print help (a result step) and stop
// See spec.md + flow.json in this folder.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, setTodoBackendStatus, createAgentStepPayload, createUpdateStatusIntent, logPrefix,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { parseCli, normalizePrompt } from '/_102021_/l2/agentChangeBackend/helpers/cbCli.js';

const ALL_STATUSES = ['toCreate', 'toUpdate', 'toRemove', 'inProgress', 'done'];

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentChangeBackend',
    agentProject: 102021,
    agentFolder: 'agentChangeBackend',
    agentDescription: 'Stage 3 backend reconciler (v1, hexagonal). CLI: /rebuild all | /run | /help.',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const raw = userPrompt || context.message.content || '';
  const { kind: cmd, module: requestedModule } = parseCli(raw);

  // Resolve the ONE module this run targets, and (for rebuild) reset only that module's owners so the
  // task stays small. No explicit module -> the first (sorted) module with owners; readBackendScan
  // (given the override) already scopes owners to it. The resolved module is persisted in longMemory
  // so every downstream step (which reads it via readTargetModule) scopes to the SAME module.
  let targetModule = requestedModule;
  if (cmd === 'rebuild-all' || cmd === 'rebuild-defs') {
    let reset = 0;
    try {
      const scan = await readBackendScan(ALL_STATUSES, undefined, requestedModule);
      targetModule = scan.moduleNames[0] || requestedModule;
      for (const owner of scan.owners) {
        if (await setTodoBackendStatus(owner, 'toCreate')) reset++;
      }
    } catch (e) {
      console.error(`${logPrefix(agent)} ${cmd} reset failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else if (cmd === 'run') {
    // Resolve the target module up front (explicit, else the first module with pending owners) so the
    // task title is correct AT CREATION. Renaming later via the update-status intent's newTaskTitle is
    // best-effort and depends on collab-messages forwarding it; the bootstrap taskTitle path is the
    // reliable one. Never blocks the run.
    try {
      const scan = await readBackendScan(['toCreate', 'inProgress'], undefined, requestedModule);
      targetModule = scan.moduleNames[0] || requestedModule;
    } catch (e) {
      console.error(`${logPrefix(agent)} run module resolve failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Task title reflects the ONE module this run targets (backend). Set here, at creation, via the
  // deployed taskTitle path — not the mid-run newTaskTitle intent.
  const taskTitle = targetModule ? `${targetModule} - backend` : 'agentChangeBackend';

  // The root agent step is created WITHOUT calling the model (skipRootLLM); the chain is added below.
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentChangeBackend deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: normalizePrompt(raw) || 'agentChangeBackend' },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentChangeBackend', flowName: 'agentChangeBackend', version: '1', cliCommand: cmd, targetModule },
    },
  };

  if (cmd === 'help') {
    return [addMessageAI, createBootstrapAddStepIntent(context, createHelpStep())];
  }

  const scanStep = createAgentStepPayload('cb-scan', 'agentCbScanCreateOwners', 'Scan todoBackend (status = toCreate)', { planId: 'cb-scan' }, [], 'sequential', 'waiting_human_input');
  return [addMessageAI, createBootstrapAddStepIntent(context, scanStep)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

/** Add a step under the root (stepId 1), created by the skipRootLLM bootstrap above. */
function createBootstrapAddStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

function createHelpStep(): mls.msg.AIPayload {
  return {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Help',
    result: HELP,
    planning: { planId: 'help', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as any;
}

const HELP = `agentChangeBackend — CLI

Uso: @@changeBackend <comando> [módulo]

Uma execução processa SEMPRE um único módulo (para a task não ficar grande). Sem [módulo], assume
o primeiro módulo (ordem alfabética) com pendências; com [módulo], processa só aquele. "all" é
palavra do comando, nunca nome de módulo.

Comandos:
- /rebuild all [módulo]  : reseta os owners do módulo-alvo para toCreate e regenera o backend — defs E materialização dos .ts (arquivos sobrescritos in place; sem deletar).
- /rebuild defs [módulo] : reseta os owners do módulo-alvo para toCreate e regenera SOMENTE os .defs.ts (NÃO materializa os .ts).
- /run [módulo]          : gera os owners pendentes (todoBackend = toCreate | inProgress) sem resetar; materializa os .ts faltando/desatualizados.
- <módulo>               : igual ao /run daquele módulo (ex: @@changeBackend cafeFlow).
- (sem comando)          : igual ao /run — varre o todoBackend e continua o primeiro módulo pendente.
- /help                  : mostra esta ajuda.

Qualquer outro texto sem comando e sem módulo reconhecível mostra esta ajuda.`;
