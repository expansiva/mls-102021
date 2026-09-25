/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Identity.ts" enhancement="_blank"/>

import {
  parseDefinitionSource,
  readDefinition,
  renderDefinition,
  semanticHash,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';

/**
 * Identity of a def file. A v2 definition hashes the semantic projection, so a
 * status edit is not a new source. Anything else hashes the raw text.
 */
export async function sourceIdentityHash(source: string): Promise<string> {
  const parsed = readV2(source);
  if (!parsed) return sha256Text(source);
  return semanticHash(parsed);
}

/**
 * A receipt matches the disk when the bytes match, the semantic hash matches,
 * or the only difference is the status D1 would have written as pending.
 * An old receipt of the pending file must not look like SOURCE_CHANGED after
 * a legitimate status update.
 */
export async function hashesAgree(disk: string, receiptHash: string): Promise<boolean> {
  if (!receiptHash || !disk) return false;
  if (await sha256Text(disk) === receiptHash) return true;
  if (await sourceIdentityHash(disk) === receiptHash) return true;
  const pending = await pendingRenderHash(disk);
  return pending !== '' && pending === receiptHash;
}

export async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function readV2(source: string): M1Definition | null {
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed)) return null;
  const read = readDefinition(parsed.definition);
  if ('issues' in read) return null;
  return read;
}

async function pendingRenderHash(disk: string): Promise<string> {
  const parsed = readV2(disk);
  if (!parsed) return '';
  const match = /fileReference="([^"]+)"/.exec(disk);
  const defPath = match?.[1] || '';
  if (!defPath) return '';
  const rendered = renderDefinition({ ...parsed, status: 'pending' }, defPath);
  if (!('source' in rendered)) return '';
  return sha256Text(rendered.source);
}
