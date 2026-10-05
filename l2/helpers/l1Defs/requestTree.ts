/// <mls fileReference="_102021_/l2/helpers/l1Defs/requestTree.ts" enhancement="_blank"/>

import type { DisclosureNode } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

/**
 * The output of one request service route as the D1 classified it (d1_61): a tree of contract paths, one node per
 * classified part, written by controllers60 from the derived route (input20 + resolve25). The nesting is the path:
 * `comanda` is the parent of `comanda.itens`. The D1 plan, the M1 request service and the M1 obligations read the
 * same nodes, through `outputViews`.
 */

/** One contract leaf of a node: `field` relative to the node element, `path` the ontology path of the node entity. */
export interface RequestTreeField {
  field: string;
  path: string;
}

/**
 * - `entity`: the object at `path` is a record of `entity`.
 * - `list`: the array of `entity` at `path`. `items` names the item array inside a page wrapper (`{ items: Row[]; ... }`),
 *   empty when `path` is the array itself. The paging keys are contract paths from the route output root.
 * - `related`: fields of an entity linked by one L4 relationship: an N:1 field next to its owner (same `path`), or a
 *   nested relation (`comanda.itens`). `relationship` is absent while the derivation left it open.
 * - `computed`: a readonly value that is no ontology path. `entity` is the output that owns it (absent in a group of
 *   outputs); `rules` is the rule a resolution tied it to, else the route rules (the candidates).
 * - `unresolved`: what the derivation left open, with the reason.
 */
export type RequestOutputNode =
  | { kind: 'entity'; path: string; entity: string; fields: RequestTreeField[] }
  | {
    kind: 'list';
    path: string;
    entity: string;
    items: string;
    page?: string;
    pageSize?: string;
    hasMore?: string;
    total?: string;
    fields: RequestTreeField[];
  }
  | { kind: 'related'; path: string; entity: string; relationship?: string; fields: RequestTreeField[] }
  | { kind: 'computed'; path: string; entity?: string; rules: string[] }
  | { kind: 'unresolved'; path: string; reason: string };

export const REQUEST_NODE_KINDS = ['entity', 'list', 'related', 'computed', 'unresolved'] as const;

export const REQUEST_PAGING_KEYS = ['page', 'pageSize', 'hasMore', 'total'] as const;

/** The route JSDoc as the contract parser read it (d2_78): always the raw text, and the sections it recognized. */
export interface RequestDoc {
  raw: string;
  purpose?: string;
  input?: string;
  processing?: string;
  output?: string;
}

export const REQUEST_DOC_SECTIONS = ['purpose', 'input', 'processing', 'output'] as const;

/** The contract path of the records of a node: the item array of a page wrapper, else the node path. */
export function elementPath(node: Extract<RequestOutputNode, { fields: RequestTreeField[] }>): string {
  return node.kind === 'list' && node.items ? `${node.path}.${node.items}` : node.path;
}

/** The tree of a def read back. Null when any node is not a node (fail closed). */
export function readOutputTree(value: unknown): RequestOutputNode[] | null {
  if (!Array.isArray(value)) return null;
  const nodes: RequestOutputNode[] = [];
  for (const item of value) {
    const node = readNode(item);
    if (!node) return null;
    nodes.push(node);
  }
  return nodes;
}

/** The doc of a def read back: undefined when absent, null when it is not a doc. */
export function readRequestDoc(value: unknown): RequestDoc | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || typeof value.raw !== 'string') return null;
  const doc: RequestDoc = { raw: value.raw };
  for (const key of Object.keys(value)) {
    if (key === 'raw') continue;
    if (!(REQUEST_DOC_SECTIONS as readonly string[]).includes(key) || typeof value[key] !== 'string') return null;
    doc[key as typeof REQUEST_DOC_SECTIONS[number]] = value[key] as string;
  }
  return doc;
}

/**
 * One root member of the route output with what is under it: `entity` is the entity of the node at `key` (empty for a
 * group of outputs); `fields` the classified contract paths relative to `key`; `disclosure` each of them as the one
 * disclosure rule reads it (`nodeDisclosure`). An `unresolved` node projects nothing and is not disclosed.
 */
export interface RequestOutputView {
  key: string;
  entity: string;
  fields: string[];
  disclosure: DisclosureNode[];
}

export function outputViews(tree: readonly RequestOutputNode[]): RequestOutputView[] {
  const keys: string[] = [];
  for (const node of tree) {
    const key = node.path.split('.')[0];
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.map(key => {
    const under = tree.filter(node => node.path === key || node.path.startsWith(`${key}.`));
    const head = under.find((node): node is Extract<RequestOutputNode, { kind: 'entity' | 'list' }> => node.path === key && (node.kind === 'entity' || node.kind === 'list'));
    const fields: string[] = [];
    const disclosure: DisclosureNode[] = [];
    for (const node of under) {
      if (node.kind === 'unresolved') continue;
      if (node.kind === 'computed') {
        // A value that is the whole member (an aggregate with no field of an entity) is named by the member.
        const field = relative(node.path, key) || key;
        fields.push(field);
        disclosure.push({ kind: 'computed', field, entity: node.entity ?? '' });
        continue;
      }
      if (node.kind === 'list') {
        for (const name of REQUEST_PAGING_KEYS) {
          const value = node[name];
          if (value) disclosure.push({ kind: 'paging', field: relative(value, key) });
        }
      }
      const prefix = relative(elementPath(node), key);
      for (const item of node.fields) {
        const field = prefix ? `${prefix}.${item.field}` : item.field;
        fields.push(field);
        disclosure.push({ kind: 'entity', field, entity: node.entity, path: item.path });
      }
    }
    return { key, entity: head?.entity ?? '', fields, disclosure };
  });
}

/** `path` relative to `key`; '' for `key` itself; a path outside `key` (a flat paging key at the root) as it is. */
function relative(path: string, key: string): string {
  if (path === key) return '';
  return path.startsWith(`${key}.`) ? path.slice(key.length + 1) : path;
}

function readNode(item: unknown): RequestOutputNode | null {
  if (!isRecord(item) || !text(item.path)) return null;
  const path = item.path as string;
  switch (item.kind) {
    case 'entity': {
      const fields = readFields(item.fields);
      if (!fields || !text(item.entity) || !onlyKeys(item, ['kind', 'path', 'entity', 'fields'])) return null;
      return { kind: 'entity', path, entity: item.entity as string, fields };
    }
    case 'list': {
      const fields = readFields(item.fields);
      if (!fields || !text(item.entity) || typeof item.items !== 'string') return null;
      if (!onlyKeys(item, ['kind', 'path', 'entity', 'items', 'fields', ...REQUEST_PAGING_KEYS])) return null;
      const node: Extract<RequestOutputNode, { kind: 'list' }> = { kind: 'list', path, entity: item.entity as string, items: item.items, fields };
      for (const name of REQUEST_PAGING_KEYS) {
        if (item[name] === undefined) continue;
        if (!text(item[name])) return null;
        node[name] = item[name] as string;
      }
      return node;
    }
    case 'related': {
      const fields = readFields(item.fields);
      if (!fields || !text(item.entity) || !onlyKeys(item, ['kind', 'path', 'entity', 'relationship', 'fields'])) return null;
      if (item.relationship !== undefined && !text(item.relationship)) return null;
      return { kind: 'related', path, entity: item.entity as string, ...(item.relationship ? { relationship: item.relationship as string } : {}), fields };
    }
    case 'computed': {
      if (!Array.isArray(item.rules) || !item.rules.every(text) || !onlyKeys(item, ['kind', 'path', 'entity', 'rules'])) return null;
      if (item.entity !== undefined && !text(item.entity)) return null;
      return { kind: 'computed', path, ...(item.entity ? { entity: item.entity as string } : {}), rules: [...item.rules as string[]] };
    }
    case 'unresolved':
      if (!text(item.reason) || !onlyKeys(item, ['kind', 'path', 'reason'])) return null;
      return { kind: 'unresolved', path, reason: item.reason as string };
    default:
      return null;
  }
}

function readFields(value: unknown): RequestTreeField[] | null {
  if (!Array.isArray(value)) return null;
  const fields: RequestTreeField[] = [];
  for (const item of value) {
    if (!isRecord(item) || !text(item.field) || !text(item.path) || !onlyKeys(item, ['field', 'path'])) return null;
    fields.push({ field: item.field as string, path: item.path as string });
  }
  return fields;
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

function text(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
