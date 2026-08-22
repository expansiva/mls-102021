/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbLocalStepTitle.ts" enhancement="_blank"/>

import { changeLocalStepTitle, startLocalStepTitleTick } from '/_102025_/l2/collabMessagesEvents.js';

export function localStepTitle(
  context: mls.msg.ExecutionContext,
  step: { stepId: number },
  title: string,
): void {
  const taskPK = context.task?.PK;
  if (!taskPK) return;
  changeLocalStepTitle(taskPK, step.stepId, title);
}

export function startLocalStepTick(
  context: mls.msg.ExecutionContext,
  step: { stepId: number },
  makeTitle: (elapsedSec: number) => string,
): () => void {
  const taskPK = context.task?.PK;
  if (!taskPK) return () => {};
  return startLocalStepTitleTick(taskPK, step.stepId, makeTitle);
}
