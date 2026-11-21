/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/callInputs.ts" enhancement="_blank"/>

// d1_269: where each required field of the input of an outside operation comes from, for a usecase of an entity the module stores. The usecase takes the
// fields of its entity and of the routes that use it; a required field of the operation that none of them names has no source by name, and the model
// chooses its source in a list the code closes (resolve25, the one step of the D1 that asks a model a closed choice). The usecase of an entity kept
// outside takes the input of the operation as its own, and has nothing to choose.

import { catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { topParams } from '/_102021_/l2/agentDefsL1/steps/input20/deriveServe.js';
import type { D1CallInput, D1CallInputGap, D1CallInputSource, D1SelectedRequest, D1SelectedUsecase } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

export interface CallInputsSource {
  usecases: readonly D1SelectedUsecase[];
  requests: readonly D1SelectedRequest[];
  catalogTexts: Readonly<Record<string, string>>;
  entities: Readonly<Record<string, unknown>>;
  entityKind: ReadonlyMap<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Top-level fields of an ontology entity: name → { type, ref }. */
function fieldsOf(entityId: string, entity: unknown): Map<string, { type: string; ref: string; note: string }> {
  const out = new Map<string, { type: string; ref: string; note: string }>();
  const record = isRecord(entity) && isRecord(entity.record) ? entity.record : null;
  const fields = record && isRecord(record.fields) ? record.fields : null;
  for (const [name, raw] of Object.entries(fields ?? {})) {
    if (name.includes('.') || !isRecord(raw)) continue;
    // A field of type `record` points to one entity (`to: [Entity]`): the usecase holds the id of that record as text.
    const target = raw.type === 'record' && Array.isArray(raw.to) && raw.to.length === 1 && typeof raw.to[0] === 'string' ? raw.to[0] : '';
    const note = [raw.title, raw.description].filter((item): item is string => typeof item === 'string' && item !== '').join(': ');
    out.set(name, target ? { type: 'uuid', ref: target, note } : { type: typeof raw.type === 'string' ? raw.type : '', ref: typeof raw.ref === 'string' ? raw.ref : '', note });
  }
  // The column of a foreign key a relationship names (`via: "<Entity>.<column>"`) is a field of the record that the entity lists as a relationship, not in `record.fields`.
  const relationships = isRecord(entity) && isRecord(entity.relationships) ? Object.values(entity.relationships) : [];
  for (const relationship of relationships) {
    if (!isRecord(relationship) || relationship.mode !== 'fk' || typeof relationship.via !== 'string' || typeof relationship.to !== 'string') continue;
    const [owner, column] = relationship.via.split('.');
    if (owner === entityId && column && !out.has(column)) out.set(column, { type: 'uuid', ref: relationship.to, note: typeof relationship.description === 'string' ? relationship.description : '' });
  }
  return out;
}

const TEXT_TYPES = new Set(['string', 'text', 'uuid']);

export function callInputGaps(source: CallInputsSource): D1CallInputGap[] {
  const gaps: D1CallInputGap[] = [];
  for (const usecase of source.usecases) {
    if (!usecase.call) continue;
    const kind = source.entityKind.get(usecase.entity);
    if (!kind || kind === 'external' || kind === 'role') continue;
    const [connectionId, operationId] = usecase.call.split('.');
    const catalog = source.catalogTexts[connectionId];
    const operation = catalog ? catalogOperations(catalog)?.find(item => item.operationId === operationId) : undefined;
    if (!catalog || !operation) continue;
    const required = topParams(catalog, operation.inputType).filter(param => !param.optional).map(param => param.name);
    if (required.length === 0) continue;
    const own = fieldsOf(usecase.entity, source.entities[usecase.entity]);
    const params = [...new Set(source.requests.filter(request => (request.uses ?? []).includes(usecase.usecaseId)).flatMap(request => request.params.map(param => param.name)))].sort();
    const named = new Set([...own.keys(), ...params]);
    for (const field of required) {
      if (named.has(field)) continue;
      const candidates = new Set<string>();
      for (const name of [...new Set([...params, ...own.keys()])].sort()) {
        const type = own.get(name)?.type ?? '';
        if (!type || TEXT_TYPES.has(type)) candidates.add(`input:${name}`);
      }
      for (const name of params) {
        const target = own.get(name)?.ref;
        const targetFields = target ? fieldsOf(target, source.entities[target]) : null;
        if (!target || !targetFields || source.entityKind.get(target) === 'external') continue;
        for (const [fieldName, info] of [...targetFields].sort(([left], [right]) => left.localeCompare(right))) {
          if (TEXT_TYPES.has(info.type)) candidates.add(`entity:${target}.${fieldName}@${name}`);
        }
      }
      const notes = [...candidates].map(candidate => {
        const entityPick = /^entity:([^.]+)\.([^@]+)@(.+)$/u.exec(candidate);
        if (entityPick) {
          const info = fieldsOf(entityPick[1], source.entities[entityPick[1]]).get(entityPick[2]);
          return `- ${candidate}: the field ${entityPick[2]} of the ${entityPick[1]} record that the id ${entityPick[3]} points to${info?.note ? ` (${info.note})` : ''}; empty when ${entityPick[3]} is absent.`;
        }
        const name = candidate.slice('input:'.length);
        const info = own.get(name);
        return `- ${candidate}: the field ${name} of the usecase input${info?.note ? ` (${info.note})` : ''}.`;
      });
      const reason = [
        `The usecase ${usecase.usecaseId} (${usecase.operation} of ${usecase.entity}) calls ${usecase.call}${operation.description ? `: ${operation.description}` : ''}.`,
        `The operation requires \`${field}\` and no field of the usecase has that name. Which value does the usecase send?`,
        ...notes,
      ].join(' ');
      gaps.push({ usecaseId: usecase.usecaseId, call: usecase.call, field, candidates: [...candidates], reason });
    }
  }
  return gaps;
}

/** The source a candidate names, or null for `none` and for anything that is not a candidate form. */
export function callInputSourceOf(choice: string): D1CallInputSource | null {
  const input = /^input:([A-Za-z_][\w]*)$/u.exec(choice);
  if (input) return { kind: 'input', field: input[1] };
  const entity = /^entity:([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)@([A-Za-z_][\w]*)$/u.exec(choice);
  return entity ? { kind: 'entity', entity: entity[1], field: entity[2], idFrom: entity[3] } : null;
}

/** The chosen sources of a usecase, from the answers of its unit (`usecase:<usecaseId>`, path `<call>.<field>`). `none` and an unknown form leave the field open. */
export function callInputsOf(usecaseId: string, gaps: readonly D1CallInputGap[], answers: ReadonlyMap<string, ReadonlyArray<{ path: string; choice: string }>>): D1CallInput[] {
  const given = answers.get(`usecase:${usecaseId}`) ?? [];
  const out: D1CallInput[] = [];
  for (const gap of gaps.filter(item => item.usecaseId === usecaseId)) {
    const choice = given.find(item => item.path === `${gap.call}.${gap.field}`)?.choice ?? '';
    const from = gap.candidates.includes(choice) ? callInputSourceOf(choice) : null;
    if (from) out.push({ call: gap.call, field: gap.field, from });
  }
  return out;
}
