/// <mls fileReference="_102021_/l2/helpers/l1Defs/moduleEvent.ts" enhancement="_blank"/>

/**
 * Module-to-module event publisher of the platform (E2, mls-102034@ce269fc). The generated usecase imports it and calls it with the
 * `bound` of its transaction, so the event commits or rolls back with the write. An outbound event the L4 leaves unbound takes it.
 * Shared by the defs agent (writes it on the def) and the materializer (writes the publisher function).
 */
export const MODULE_EVENT_PUBLISH = {
  symbol: 'publishModuleEvent',
  path: 'mls-102034/l1/server/layer_1_external/events/publishModuleEvent.ts',
  importPath: '/_102034_/l1/server/layer_1_external/events/publishModuleEvent.js',
} as const;

/** The function the generated `outbound.ts` exports for one event, and the use case calls: `repositorioAlterado` -> `publishRepositorioAlterado`. */
export function publisherNameOf(eventId: string): string {
  return `publish${eventId.charAt(0).toUpperCase()}${eventId.slice(1)}`;
}
