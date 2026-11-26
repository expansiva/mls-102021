/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/readNeverFails.ts" enhancement="_blank"/>

/**
 * d1_313: a read does not fail because an item it only shows is gone. One text for the usecases that read and the request services that compose reads, so the two say the same.
 * (The telegram Bots, Conversations and Audit screens went down for every row when one agent, or one bot, no longer existed.)
 */
export const READ_NEVER_FAILS = 'A read never fails because an item it only shows is missing. A list, a get, and the read that redraws the screen after a write fill a derived field of an item (the name of the record it points to, a label, a count) from the record they find; when that record does not exist any more, the derived field comes out empty (absent or null) and the row still appears. NOT_FOUND for a missing item belongs to the write that chooses the item (a create, a change of the choice) and to the get of the record the caller asked for by its own id. The empty form is the one the type has: an optional field is left out, a required text is the empty text (`""`), and never `null` where the type has no `null`. A required object with no empty form is not invented: it is a defect of the source, and the unit says so as a source gap instead of writing `null!`, `undefined!` or a cast.';
