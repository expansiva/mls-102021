/// <mls fileReference="_102021_/l2/agentMaterializeL1/core/io.ts" enhancement="_blank"/>

/** Read port for simulate. There is no write, delete, migrate or model method on purpose. */
export interface MaterializeReadIo {
  read(ref: string): Promise<string | null>;
}

export async function contentHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
