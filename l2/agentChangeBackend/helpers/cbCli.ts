/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCli.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure CLI parsing for the agentChangeBackend root. Side-effect-free (no cbShared/libModel import) so
// it stays unit-testable — the l2 test stub crashes on cbShared's libStor->libModel import, mirroring
// why cbWorkspace.ts was extracted.

export type CbCommandKind = 'rebuild-all' | 'rebuild-defs' | 'run' | 'help';

const CLI_KEYWORDS = new Set(['rebuild', 'all', 'defs', 'run', 'help']);

/** Parse the user prompt into a CLI command plus an OPTIONAL target module. Lenient: mention stripped,
 * command keyword matched anywhere. The module is the first token that is NOT a CLI keyword and not a
 * slash-flag (case is PRESERVED — module names are case-sensitive). 'all' is a keyword, never a module.
 * Empty (bare @@changeBackend) is the autonomous default -> 'run'. A bare non-keyword token
 * (e.g. "@@changeBackend cafeFlow") means: run (continue) that specific module. */
export function parseCli(raw: string | undefined): { kind: CbCommandKind; module: string } {
  const stripped = String(raw || '').replace(/@@?[a-z0-9_]*changebackend\s*/i, '').trim();
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const cleaned = tokens.map(t => t.replace(/^\/+/, ''));   // drop leading slash of /rebuild, /run, ...
  const lower = cleaned.map(t => t.toLowerCase());
  let module = '';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('/')) continue;                // slash-flags are commands, never modules
    if (CLI_KEYWORDS.has(lower[i])) continue;               // rebuild | all | defs | run | help
    module = cleaned[i];
    break;
  }
  let kind: CbCommandKind;
  if (lower.includes('rebuild')) kind = lower.includes('defs') ? 'rebuild-defs' : 'rebuild-all';
  else if (lower.includes('run')) kind = 'run';
  else if (lower.includes('help')) kind = 'help';
  else if (module) kind = 'run';                            // bare module name -> continue that module
  else if (tokens.length) kind = 'help';                    // unrecognized, keyword-less noise
  else kind = 'run';                                        // empty -> autonomous run
  return { kind, module };
}

/** The human message content stored on the bootstrap step: the prompt with the mention stripped and
 * lowercased. Kept separate from parseCli (which preserves module case). */
export function normalizePrompt(raw: string | undefined): string {
  return String(raw || '')
    .trim()
    .replace(/@@?[a-z0-9_]*changebackend\s*/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
