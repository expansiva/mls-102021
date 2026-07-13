/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_blank"/>

// Parallel materialization children share one host. Keep their repair-state read-modify-write
// operations ordered so a late writer cannot erase findings from its siblings.
let mutationQueue: Promise<void> = Promise.resolve();

export async function serializeRepairMutation<T>(operation: () => Promise<T>): Promise<T> {
  const previous = mutationQueue;
  let release!: () => void;
  mutationQueue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}
