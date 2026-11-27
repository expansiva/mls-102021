/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Stage2.ts" enhancement="_blank"/>

// d1_347 s3b: ONE key for the whole stage 2 of the communication between a module and the cm (the platform client `cm(ctx)`, `serveCm`, `once`): the bridge of the cm that the emitter stops writing (s3), the
// transaction that the platform opens for a served route (s1) and what the contexts of the models say (s4) add. The typed step (s5) and the lock of the engine (s6) are out of the key since d1_349 s1. OFF in the committed generator: with it off every emission is, byte for
// byte, the one before stage 2 (a pass over a module that has a cm bridge, with or without `force`, writes the same files as before). It is a value of the generator source and not of the run, because the
// generator runs in the browser that collabmsg simulates (no environment variable, no flag of the message reaches every step): the rehearsal of s7 runs a copy of the generator with it on; it is turned on for
// everyone only after the manager accepts s7. Tests turn it on and off (and put it back).
export const stage2 = { on: false };

/** The connections whose client the platform gives: `cm` in stage 2, none before. */
export function platformClientConnections(): readonly string[] {
  return stage2.on ? ['cm'] : [];
}
