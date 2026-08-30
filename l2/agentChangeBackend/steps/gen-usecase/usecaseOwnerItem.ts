/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-usecase/usecaseOwnerItem.ts" enhancement="_blank"/>

// Pure owner-item + plan validation for gen-usecase. Kept free of cbShared's runtime graph so the
// payload and the unknown-port guard stay unit-testable (l2 stub crashes on cbShared's libModel import).

import type { CbScan, CbOwner, CbEntity } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { MDM_WRITE_PATH_ENABLED } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import { lifecycleForEntity, type CbEntityLifecycle } from '/_102021_/l2/agentChangeBackend/helpers/cbLifecycle.js';
import { mdmSubtypeFor } from '/_102021_/l2/agentChangeBackend/helpers/cbSeedsCore.js';
import { collectIoShapeSymmetryIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

export function deriveMaps(scan: CbScan) {
  const roots = new Set(scan.aggregates.map(a => a.rootEntity));
  const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId)); // master data: read by id, no port
  const derivedIds = new Set(scan.entities.filter(e => e.kind === 'derived').map(e => e.entityId));
  const childToRoot = new Map<string, string>();
  for (const a of scan.aggregates) for (const m of a.embeddedMembers) childToRoot.set(m, a.rootEntity);
  const byId = new Map(scan.entities.map(e => [e.entityId, e]));
  // ownerEntity -> events the owner's usecases must emit when they mutate that aggregate.
  const eventsByOwner = new Map<string, typeof scan.events>();
  for (const ev of scan.events) {
    const list = eventsByOwner.get(ev.ownerEntity) || [];
    list.push(ev);
    eventsByOwner.set(ev.ownerEntity, list);
  }
  return { roots, mdmIds, derivedIds, childToRoot, byId, eventsByOwner };
}

function unknownPortIssue(ownerId: string, fnName: string, port: string, entities: Map<string, CbEntity>): string {
  const where = fnName ? `usecase ${ownerId}.${fnName}` : `usecase ${ownerId}`;
  const kind = entities.get(port)?.kind;
  if (kind === 'derived') {
    return `${where}: '${port}' is a derived projection (no table, no repository port) — read the persisted sources through their ports and compose ${port} in the output; ofEntity: '${port}' is allowed on output fields`;
  }
  if (kind === 'mdm') {
    return `${where}: '${port}' is master data (no local repository port) — read it via ctx.mdm; never put an mdmRef in ports`;
  }
  return `${where}: unknown port '${port}'`;
}

/** Reject defs that drift from the current entity/port contract before materialization can turn the
 * mismatch into broken TypeScript. */
export function validateUsecasePlan(result: any, scan: CbScan, ownerId: string): string[] {
  const issues: string[] = [];
  // A usecase that declares NO function for its own operation is a stub: nothing to materialize, and
  // every controller that references it fails the final gate with "export not found" — defs-level, so
  // no re-materialization can repair it (run 8 of buildFlowFsm: 4 stubs, 12 findings, run dead at the
  // last step). The operationId must be among the functions, whatever the reason for the omission.
  const functionNames = (Array.isArray(result?.functions) ? result.functions : [])
    .map((fn: any) => readString(fn?.functionName)).filter(Boolean);
  if (!functionNames.includes(ownerId)) {
    issues.push(functionNames.length
      ? `usecase ${ownerId}: no function named '${ownerId}' (declared: ${functionNames.join(', ')}) — the operation must be implemented by a function of its own name`
      : `usecase ${ownerId}: functions[] is empty — a stub usecase is forbidden; implement the operation as a function named '${ownerId}'`);
  }
  const entities = new Map(scan.entities.map(entity => [entity.entityId, entity]));
  const knownPorts = new Set([
    ...scan.aggregates.map(aggregate => aggregate.rootEntity),
    ...scan.events.filter(event => event.persisted).map(event => event.entityId),
  ]);
  for (const port of readStringArray(result?.ports)) if (!knownPorts.has(port)) issues.push(unknownPortIssue(ownerId, '', port, entities));
  for (const fn of Array.isArray(result?.functions) ? result.functions : []) {
    for (const port of readStringArray(fn?.ports)) if (!knownPorts.has(port)) issues.push(unknownPortIssue(ownerId, fn?.functionName || '<function>', port, entities));
    for (const io of [...(Array.isArray(fn?.input) ? fn.input : []), ...(Array.isArray(fn?.output) ? fn.output : [])]) {
      const entityId = readString(io?.ofEntity);
      if (!entityId) continue;
      const entity = entities.get(entityId);
      if (!entity) { issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: unknown ofEntity '${entityId}'`); continue; }
      const fieldName = readString(io?.name);
      if (fieldName && !(entity.fields ?? []).some((field: any) => field.fieldId === fieldName)) {
        issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: ${entityId}.${fieldName} is not declared by the entity`);
      }
    }
    const allowedStatuses = new Set(scan.entities.flatMap(entity => (entity.fields ?? []).flatMap((field: any) => Array.isArray(field.enum) ? field.enum : [])));
    issues.push(...collectIoShapeSymmetryIssues(fn).map(issue => `usecase ${ownerId}.${fn?.functionName || '<function>'}: ${issue}`));
    for (const step of readStringArray(fn?.steps)) {
      // Steps are primarily natural-language explanations. Only validate an explicit QUOTED
      // assignment (`status = "delivered"`, `status: 'delivered'`, `status is "delivered"`), never
      // prose: unquoted forms like "status: must be 'active'" captured 'must' and burned repair
      // budget on a false positive (run 102049-c, updateReservationStatus).
      for (const match of step.matchAll(/\bstatus\s*(?:=|:)\s*["']([A-Za-z][A-Za-z0-9_]*)["']|\bstatus\s+is\s+["']([A-Za-z][A-Za-z0-9_]*)["']/giu)) {
        const status = match[1] || match[2];
        if (!allowedStatuses.has(status)) issues.push(`usecase ${ownerId}.${fn?.functionName || '<function>'}: status '${status}' is not declared by any entity enum`);
      }
    }
  }
  return [...new Set(issues)];
}

// The single-owner item sent to the LLM (explicit ports/mdmRefs/derivedRefs + entity fields to shape input/output).
export function buildOwnerItem(o: CbOwner, maps: ReturnType<typeof deriveMaps>, lifecycles?: readonly CbEntityLifecycle[]) {
  const { roots, mdmIds, derivedIds, childToRoot, byId, eventsByOwner } = maps;
  const fieldsOf = (id: string) => (byId.get(id)?.fields || []).map((f: any) => ({ fieldId: f.fieldId, type: f.type, required: f.required, ...(f.enum ? { enum: f.enum } : {}) }));
  const rawRefs = [...new Set([o.entity, ...o.reads, ...o.writes].filter(Boolean))];           // keep children + mdm for fields
  const portRefs = [...new Set(rawRefs.map(id => childToRoot.get(id) ?? id))];                  // children -> parent root
  const mutated = new Set([o.entity, ...o.writes].filter(Boolean).map(id => childToRoot.get(id) ?? id));
  const eventWrites = [...new Set([o.entity, ...o.writes].filter(Boolean))]
    .flatMap(id => eventsByOwner.get(id) || [])
    .concat([...mutated].flatMap(id => eventsByOwner.get(id) || []))
    .filter((ev, i, arr) => arr.findIndex(x => x.entityId === ev.entityId) === i)
    .map(ev => ({ entityId: ev.entityId, owner: ev.ownerEntity, purpose: ev.purpose, persisted: ev.persisted, port: ev.persisted ? ev.entityId : null }));
  // Gated: an entity declared `kind: mdm` with an ownership other than `moduleOwned` still classifies as
  // `mdm` with the write path OFF, so without the gate a module in that shape would already see a
  // different prompt — and "the current module is untouched" has to be true by construction, not by luck.
  const mdmWrites = (MDM_WRITE_PATH_ENABLED ? [...new Set([o.entity, ...o.writes].filter(Boolean))] : [])
    .filter(id => mdmIds.has(id))
    .map(id => {
      const entity = byId.get(id);
      return {
        entityId: id,
        mdmType: entity?.mdmType || '',
        subtype: mdmSubtypeFor(id),
        idField: entity?.idField || '',
      };
    })
    .filter(write => !!write.mdmType);
  const derivedRefs = rawRefs.filter(id => derivedIds.has(id)).map(id => {
    const entity = byId.get(id);
    return {
      entityId: id,
      description: entity?.description || '',
      notes: entity?.storageNotes || '',
    };
  });
  const lifecycle = lifecycleForEntity(lifecycles, o.entity) || lifecycleForEntity(lifecycles, childToRoot.get(o.entity) || '');
  return {
    usecaseId: o.id,
    ownerKind: o.kind,
    opKind: o.opKind,
    entity: o.entity,
    parentAggregate: childToRoot.get(o.entity) ?? o.entity,
    reads: o.reads,
    writes: o.writes,
    rulesApplied: o.rulesApplied,
    accessPattern: o.accessPattern ?? null,
    // Option 3: the canonical wire shape from l4. The function output type is PINNED to this — it is
    // copied over the model's output below, so the usecase never re-drifts the contract.
    outputShape: o.outputShape ?? null,
    inputs: o.inputs,
    contextResolution: o.contextResolution,
    acceptanceAssertions: o.acceptanceAssertions,
    ports: portRefs.filter(id => roots.has(id) && !mdmIds.has(id) && !derivedIds.has(id)),
    mdmRefs: rawRefs.filter(id => mdmIds.has(id)),
    // Master data this operation WRITES. The skill documents the ctx.mdm write surface; what it cannot
    // know is the canonical type 102034 indexes by, the subtype its closed union requires, and which
    // module field carries the mdmId — those come from the l4 `storage` block. Absent (not empty) when
    // the operation writes no master data, so a module without MDM writes sees the same prompt as before.
    ...(mdmWrites.length ? { mdmWrites } : {}),
    // MDM semantics of the operation, verbatim from the l4 (`Ns4E8MdmSemantics`): the cadastral
    // lifecycle pair, the name of the active-only opt-out input, the derived situation output. Absent
    // (not empty) when the l4 carries no `mdm` block, so a module generated before the block exists
    // sees exactly the prompt it saw before. Not gated by MDM_WRITE_PATH_ENABLED: routing a lifecycle
    // to ctx.mdm.entity.inactivate/reactivate is the ONLY correct code for an operation the catalogue
    // emitted instead of a delete — with or without the local-artifact flip.
    ...(o.mdm ? { mdm: o.mdm } : {}),
    // Derived projections this operation reads. Absent (not empty) when none, so a module without
    // derived entities sees the same prompt as before. They are an output shape, not a port.
    ...(derivedRefs.length ? { derivedRefs } : {}),
    eventWrites, // append-only events to emit (persisted -> via its port; reaction -> outbox)
    entityFields: Object.fromEntries(rawRefs.map(id => [id, fieldsOf(id)])),
    // Declared entity lifecycle (when the module has one). Absent, not empty, so a module without a
    // workflow sees the same prompt as before. Confirmed needed: this worker does not receive domain
    // invariants, and it is the code that throws "cannot transition from pending to completed".
    ...(lifecycle ? { lifecycle } : {}),
  };
}
