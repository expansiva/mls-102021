/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCli.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Pure CLI parsing for the agentChangeBackend root. Side-effect-free (no cbShared/libModel import) so
// it stays unit-testable — the l2 test stub crashes on cbShared's libStor->libModel import, mirroring
// why cbWorkspace.ts was extracted.

export type CbCommandKind = 'rebuild-all' | 'rebuild-defs' | 'rebuild-seeds' | 'run' | 'help';

const CLI_KEYWORDS = new Set(['rebuild', 'all', 'defs', 'seeds', 'run', 'help', 'fast']);

/** Parse the user prompt into a CLI command plus an OPTIONAL target module. Lenient: mention stripped,
 * command keyword matched anywhere. The module is the first token that is NOT a CLI keyword and not a
 * slash-flag (case is PRESERVED — module names are case-sensitive). 'all' is a keyword, never a module.
 * Empty (bare @@changeBackend) is the autonomous default -> 'run'. A bare non-keyword token
 * (e.g. "@@changeBackend cafeFlow") means: run (continue) that specific module. */
export function parseCli(raw: string | undefined): { kind: CbCommandKind; module: string; noAssets: boolean; fast: boolean } {
  const stripped = String(raw || '').replace(/@@?[a-z0-9_]*changebackend\s*/i, '').trim();
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const cleaned = tokens.map(t => t.replace(/^\/+/, ''));   // drop leading slash of /rebuild, /run, ...
  const lower = cleaned.map(t => t.toLowerCase());
  // T11: `--no-assets` skips the optional seed-image step entirely (cosmetic assets, real money).
  // Accepted with either dash style so `--no-assets` and `/no-assets` both work.
  const noAssets = lower.some(t => t.replace(/^-+/, '') === 'no-assets' || t.replace(/^-+/, '') === 'noassets');
  const fast = lower.some(t => t === 'fast');
  let module = '';
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].startsWith('/') || tokens[i].startsWith('-')) continue;  // flags are never modules
    if (CLI_KEYWORDS.has(lower[i])) continue;               // rebuild | all | defs | run | help
    module = cleaned[i];
    break;
  }
  let kind: CbCommandKind;
  if (lower.includes('rebuild')) {
    // seeds-only regeneration takes precedence over defs; bare `/rebuild` (neither) is the full rebuild.
    kind = lower.includes('seeds') ? 'rebuild-seeds' : lower.includes('defs') ? 'rebuild-defs' : 'rebuild-all';
  }
  else if (lower.includes('run')) kind = 'run';
  else if (lower.includes('help')) kind = 'help';
  else if (module) kind = 'run';                            // bare module name -> continue that module
  // Flags alone are NOT noise: `@@changeBackend --no-assets` is an autonomous run that skips assets.
  else if (tokens.some(t => !t.startsWith('/') && !t.startsWith('-'))) kind = 'help'; // keyword-less noise
  else kind = 'run';                                        // empty (or flags only) -> autonomous run
  return { kind, module, noAssets, fast };
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
