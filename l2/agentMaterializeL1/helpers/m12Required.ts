/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Required.ts" enhancement="_blank"/>

// d1_224: the fields a usecase demands of its input, read from the type the compiler sees (the resolver of d1_200), so a gate can tell a value
// that is missing from a value that is meant to be empty. A member is `required` unless it is optional; its `kind` says what an empty literal
// would have to be for it.

import { catalogFilePath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { resolveInputType } from '/_102021_/l2/agentMaterializeL1/emitters/typeResolve.js';
import { isCatalogImport } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';

/** One member of an input type, as far as an empty literal is concerned. */
export interface M12InputField {
  name: string;
  optional: boolean;
  /** `string`: a plain string; `array`: a list; `object`: a record with `requiredMembers` required members; `other`: anything else. */
  kind: 'string' | 'array' | 'object' | 'other';
  /** For an `object`: how many of its members are required (an object of optional members accepts `{}`). */
  requiredMembers: number;
}

/** The members of the outermost `{ … }` of a resolved type, depth-aware. Empty when the text is not an object. */
export function inputFieldsOf(resolved: string): M12InputField[] {
  const text = resolved.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return [];
  const body = text.slice(1, -1);
  const members: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') quote = char;
    else if (char === '{' || char === '(' || char === '[' || char === '<') depth += 1;
    else if (char === '}' || char === ')' || char === ']') depth -= 1;
    else if (char === '>' && body[index - 1] !== '=') depth -= 1;
    else if ((char === ';' || char === ',') && depth === 0) {
      members.push(body.slice(start, index));
      start = index + 1;
    }
  }
  members.push(body.slice(start));
  const out: M12InputField[] = [];
  for (const member of members) {
    const line = member.replace(/\/\*[\s\S]*?\*\//gu, ' ').trim();
    const match = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/u.exec(line);
    if (!match) continue;
    const type = match[3].trim();
    const object = type.startsWith('{') && type.endsWith('}');
    out.push({
      name: match[1],
      optional: match[2] === '?',
      kind: object ? 'object' : /^(?:string)$/u.test(type) ? 'string' : /\[\]$/u.test(type) || /^(?:Readonly)?Array\s*</u.test(type) ? 'array' : 'other',
      requiredMembers: object ? inputFieldsOf(type).filter(field => !field.optional).length : 0,
    });
  }
  return out;
}

/** What `ctx` offers to read: the generated files, and the catalog of a connection by its import. */
export interface M12RequiredContext {
  units: ReadonlyArray<{ definition: { artifactType: string }; outputRef: string }>;
  read(ref: string): Promise<string | null>;
}

/**
 * The input fields of every usecase of the module that is already generated, by function name. A usecase that is not generated, or whose
 * input type is not found, is left out: nothing is claimed about it.
 */
export async function usecaseInputsOf(ctx: M12RequiredContext): Promise<Map<string, readonly M12InputField[]>> {
  const out = new Map<string, readonly M12InputField[]>();
  const readImport = async (specifier: string): Promise<string | null> => {
    if (isCatalogImport(specifier)) return ctx.read(catalogFilePath(/([^/]+)\.js$/u.exec(specifier)?.[1] ?? ''));
    return specifier.startsWith('/_') ? ctx.read(specifier.replace(/\.js$/u, '.ts')) : null;
  };
  for (const unit of ctx.units) {
    if (unit.definition.artifactType !== 'usecase') continue;
    const generated = await ctx.read(unit.outputRef);
    if (!generated) continue;
    const signature = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(\s*\w+\s*:\s*([A-Za-z_$][\w$]*)/u.exec(generated);
    if (!signature) continue;
    const resolved = await resolveInputType({ entry: generated, typeName: signature[2], readImport });
    const fields = inputFieldsOf(resolved.text);
    if (fields.length) out.set(signature[1], fields);
  }
  return out;
}

/** Every member of a resolved object type by its path (`details.operation`), and whether it may be left out: a member under an optional one may. */
export function flatFieldsOf(resolved: string, prefix = '', parentOptional = false): Array<{ path: string; optional: boolean }> {
  const out: Array<{ path: string; optional: boolean }> = [];
  for (const field of inputFieldsOf(resolved)) {
    const path = prefix ? `${prefix}.${field.name}` : field.name;
    const optional = parentOptional || field.optional;
    out.push({ path, optional });
    if (field.kind !== 'object') continue;
    const type = new RegExp(String.raw`(?:^|[;{,\s])${field.name}\??\s*:\s*(\{[\s\S]*)`, 'u').exec(resolved)?.[1] ?? '';
    // the object of this member: balanced braces from its `{`
    let depth = 0;
    let end = -1;
    for (let index = 0; index < type.length; index += 1) {
      if (type[index] === '{') depth += 1;
      else if (type[index] === '}') {
        depth -= 1;
        if (depth === 0) { end = index; break; }
      }
    }
    if (end > 0) out.push(...flatFieldsOf(type.slice(0, end + 1), path, optional));
  }
  return out;
}
