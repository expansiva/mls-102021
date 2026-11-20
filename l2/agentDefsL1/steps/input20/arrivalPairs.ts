/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/arrivalPairs.ts" enhancement="_blank"/>

// d1_232: what an arrival (an `inbound` event line or a `serve` line) does to each entity, read by the one reader of the NS5 and turned into
// the operations the L1 plans. The reader is `ns5ArrivalEffects`; nothing here reads `writes`, `entityRefs` or `effect` of a line.

import type { Ns5ArrivalEffect } from '/_102035_/l2/solution/arrivalEffects.js';
import type { L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';

/** Operation of each effect a `serve` line may say. `transition` is not here: a serve line has no transition (d1_206). */
export const SERVE_OPERATION_OF_EFFECT: Readonly<Partial<Record<Ns5ArrivalEffect, L1Operation>>> = {
  list: 'list',
  read: 'get',
  create: 'create',
  update: 'update',
  remove: 'delete',
};

/** Operation of each effect an `inbound` line may say (the vocabulary of today). A transition carries its own `transitionRef`. */
export const INBOUND_OPERATION_OF_EFFECT: Readonly<Partial<Record<Ns5ArrivalEffect, L1Operation>>> = {
  create: 'create',
  update: 'update',
};
