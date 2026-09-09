/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbAccess.ts" enhancement="_blank"/>

/**
 * Pure readers of l4 access-bindings + V4 operationAuthorityRefs, and the template emitters for the
 * person-scope predicate and the profile→authority table. No platform imports — unit-tested directly.
 *
 * The l4 is the only source of meaning. Field ids come from the declared anchor hops, never from a
 * name suffix. Missing authority on a V4 module is a named scan error, never a permissive fallback.
 */

export const CB_ACCESS_BINDINGS_SCHEMA_V1 = '2026-09-08-ns4-access-bindings-v1';
export const CB_ACCESS_MATRIX_SCHEMA_V4 = '2026-08-13-ns4-access-matrix-v4';
export const CB_PERSON_LOGIN_FIELD = 'platformUserId';
export const CB_SCAN_AUTHORITY_REQUIRED = 'CB_SCAN_AUTHORITY_REQUIRED';
export const CB_SCAN_ACCESS_BINDINGS_WITHOUT_V4 = 'CB_SCAN_ACCESS_BINDINGS_WITHOUT_V4';
export const CB_SCAN_AUTHORITY_WITHOUT_BINDINGS = 'CB_SCAN_AUTHORITY_WITHOUT_BINDINGS';

export type CbAccessScopeMode = 'organization' | 'assigned' | 'own' | 'related' | 'public' | 'custom';
export type CbAnchorDirection = 'forward' | 'incoming';

export interface CbAccessAnchorHop {
  entityRef: string;
  fieldId: string;
  targetEntityRef: string;
  direction: CbAnchorDirection;
}

export interface CbAccessAnchor {
  hops: CbAccessAnchorHop[];
  terminus: { entityRef: string; fieldId: string };
}

export interface CbAccessBinding {
  profileRef: string;
  authorityRef: string;
  entityRef: string;
  mode: CbAccessScopeMode;
  description: string;
  anchor: CbAccessAnchor | null;
  projectionRef: string;
}

export interface CbSynthesizedAuthority {
  authorityRef: string;
  entityRef: string;
  profileRef: string;
  mode: CbAccessScopeMode;
  description: string;
  anchor: CbAccessAnchor | null;
}

export interface CbOperationAuthorityRef {
  operationRef: string;
  route: string;
  workspaceId: string;
  functionId: string;
  authorityRefs: string[];
}

export interface CbAccessProfile {
  profileId: string;
  actorRefs: string[];
  kind: string;
}

export interface CbAccessGrant {
  profileRef: string;
  authorityRef: string;
  mode: CbAccessScopeMode;
}

export interface CbModuleAccess {
  hasV4: boolean;
  hasBindings: boolean;
  operationAuthorityRefs: CbOperationAuthorityRef[];
  bindings: CbAccessBinding[];
  synthesized: CbSynthesizedAuthority[];
  profiles: CbAccessProfile[];
  grants: CbAccessGrant[];
}

export interface CbEntityAccessCatalog {
  entityId: string;
  kind: string;
  storageTarget: string;
  mdmType: string;
  role: string;
  idField: string;
}

export interface CbOwnerAccess {
  authorityRefs: string[];
  publicRoute: boolean;
  scope: CbOwnerScope;
}

export interface CbOwnerScope {
  mode: CbAccessScopeMode | 'mixed' | 'none';
  authorityRefs: string[];
  description: string;
  projectionRef: string;
  anchor: CbAccessAnchor | null;
  helperName: string;
  alreadyApplied: boolean;
}

export interface CbScopeWalkStep {
  kind: 'sessionPersons' | 'join' | 'project';
  entityRef: string;
  mdmType: string;
  matchField: string;
  collectField: string;
  via: 'mdm' | 'port';
}

export interface CbScopeWalkPlan {
  filterFieldId: string;
  steps: CbScopeWalkStep[];
}

const PERSON_SCOPE: ReadonlySet<string> = new Set(['own', 'assigned', 'related']);

function readTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readTrimmed).filter(Boolean);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function scopeMode(value: unknown): CbAccessScopeMode {
  const mode = readTrimmed(value);
  if (mode === 'assigned' || mode === 'own' || mode === 'related' || mode === 'public' || mode === 'custom') return mode;
  return 'organization';
}

function readHop(value: unknown): CbAccessAnchorHop | null {
  if (!isPlainRecord(value)) return null;
  const entityRef = readTrimmed(value.entityRef);
  const fieldId = readTrimmed(value.fieldId);
  const targetEntityRef = readTrimmed(value.targetEntityRef);
  const direction: CbAnchorDirection = readTrimmed(value.direction) === 'incoming' ? 'incoming' : 'forward';
  if (!entityRef || !fieldId || !targetEntityRef) return null;
  return { entityRef, fieldId, targetEntityRef, direction };
}

function readAnchor(value: unknown): CbAccessAnchor | null {
  if (!isPlainRecord(value)) return null;
  const hops = (Array.isArray(value.hops) ? value.hops : []).map(readHop).filter((hop): hop is CbAccessAnchorHop => !!hop);
  const terminus = isPlainRecord(value.terminus) ? value.terminus : {};
  const entityRef = readTrimmed(terminus.entityRef);
  const fieldId = readTrimmed(terminus.fieldId) || CB_PERSON_LOGIN_FIELD;
  if (!entityRef) return hops.length ? { hops, terminus: { entityRef: hops[hops.length - 1]?.targetEntityRef || '', fieldId } } : null;
  return { hops, terminus: { entityRef, fieldId } };
}

function readModeFromBlock(value: unknown): { mode: CbAccessScopeMode; description: string } {
  const block = isPlainRecord(value) ? value : {};
  const nested = isPlainRecord(block.dataScope) ? block.dataScope : block;
  return { mode: scopeMode(nested.mode), description: readTrimmed(nested.description) };
}

/** `access/access-bindings.defs.ts` — bindings + synthesized authorities. Empty when unreadable. */
export function readAccessBindings(parsed: Record<string, unknown>): Pick<CbModuleAccess, 'bindings' | 'synthesized'> {
  const bindings: CbAccessBinding[] = [];
  const rawBindings = Array.isArray(parsed.bindings) ? parsed.bindings : [];
  for (const raw of rawBindings) {
    if (!isPlainRecord(raw)) continue;
    const authorityRef = readTrimmed(raw.authorityRef);
    const entityRef = readTrimmed(raw.entityRef);
    if (!authorityRef || !entityRef) continue;
    const scope = readModeFromBlock(raw);
    bindings.push({
      profileRef: readTrimmed(raw.profileRef),
      authorityRef,
      entityRef,
      mode: scope.mode,
      description: scope.description,
      anchor: readAnchor(raw.anchor),
      projectionRef: readTrimmed(raw.projectionRef),
    });
  }
  const synthesized: CbSynthesizedAuthority[] = [];
  const rawSynth = Array.isArray(parsed.synthesizedAuthorities) ? parsed.synthesizedAuthorities : [];
  for (const raw of rawSynth) {
    if (!isPlainRecord(raw)) continue;
    const authorityRef = readTrimmed(raw.authorityRef);
    const entityRef = readTrimmed(raw.entityRef);
    if (!authorityRef || !entityRef) continue;
    const scope = readModeFromBlock(raw);
    synthesized.push({
      authorityRef,
      entityRef,
      profileRef: readTrimmed(raw.profileRef),
      mode: scope.mode,
      description: scope.description,
      anchor: readAnchor(raw.anchor),
    });
  }
  return { bindings, synthesized };
}

/** V4 `operationAuthorityRefs` plus the profile/grant table from the access matrix. */
export function readAccessMatrixV4(parsed: Record<string, unknown>): Pick<CbModuleAccess, 'hasV4' | 'operationAuthorityRefs' | 'profiles' | 'grants'> {
  const schema = readTrimmed(parsed.schemaVersion);
  const realization = isPlainRecord(parsed.realization) ? parsed.realization : {};
  const status = readTrimmed(realization.status);
  const rows = Array.isArray(realization.operationAuthorityRefs) ? realization.operationAuthorityRefs : [];
  const hasV4 = schema.indexOf('access-matrix-v4') >= 0 || schema === CB_ACCESS_MATRIX_SCHEMA_V4 || status === 'navigationCompiled';
  const operationAuthorityRefs: CbOperationAuthorityRef[] = [];
  if (hasV4) {
    for (const raw of rows) {
      if (!isPlainRecord(raw)) continue;
      const operationRef = readTrimmed(raw.operationRef);
      if (!operationRef) continue;
      operationAuthorityRefs.push({
        operationRef,
        route: readTrimmed(raw.route),
        workspaceId: readTrimmed(raw.workspaceId),
        functionId: readTrimmed(raw.functionId),
        authorityRefs: unique(readStringArray(raw.authorityRefs)),
      });
    }
  }
  const profiles: CbAccessProfile[] = [];
  for (const raw of Array.isArray(parsed.profiles) ? parsed.profiles : []) {
    if (!isPlainRecord(raw)) continue;
    const profileId = readTrimmed(raw.profileId);
    if (!profileId) continue;
    profiles.push({
      profileId,
      actorRefs: unique(readStringArray(raw.actorRefs)),
      kind: readTrimmed(raw.kind),
    });
  }
  const grants: CbAccessGrant[] = [];
  for (const raw of Array.isArray(parsed.grants) ? parsed.grants : []) {
    if (!isPlainRecord(raw)) continue;
    const profileRef = readTrimmed(raw.profileRef);
    const authorityRef = readTrimmed(raw.authorityRef);
    if (!profileRef || !authorityRef) continue;
    grants.push({ profileRef, authorityRef, mode: readModeFromBlock(raw).mode });
  }
  return { hasV4, operationAuthorityRefs, profiles, grants };
}

export function mergeModuleAccess(
  matrix: ReturnType<typeof readAccessMatrixV4> | undefined,
  bindings: ReturnType<typeof readAccessBindings> | undefined,
): CbModuleAccess | undefined {
  if (!matrix && !bindings) return undefined;
  return {
    hasV4: matrix?.hasV4 === true,
    hasBindings: !!(bindings && (bindings.bindings.length || bindings.synthesized.length)),
    operationAuthorityRefs: matrix?.operationAuthorityRefs ?? [],
    bindings: bindings?.bindings ?? [],
    synthesized: bindings?.synthesized ?? [],
    profiles: matrix?.profiles ?? [],
    grants: matrix?.grants ?? [],
  };
}

export function authorityRefsForOperation(access: CbModuleAccess, operationId: string): string[] {
  const refs: string[] = [];
  for (const row of access.operationAuthorityRefs) {
    if (row.operationRef === operationId) refs.push(...row.authorityRefs);
  }
  return unique(refs);
}

interface ResolvedAuthority {
  authorityRef: string;
  mode: CbAccessScopeMode;
  description: string;
  anchor: CbAccessAnchor | null;
  projectionRef: string;
}

function resolveAuthority(access: CbModuleAccess, authorityRef: string, entityRef: string): ResolvedAuthority | undefined {
  const binding = access.bindings.find(row => row.authorityRef === authorityRef && row.entityRef === entityRef)
    || access.bindings.find(row => row.authorityRef === authorityRef);
  if (binding) {
    return {
      authorityRef,
      mode: binding.mode,
      description: binding.description,
      anchor: binding.anchor,
      projectionRef: binding.projectionRef,
    };
  }
  const synth = access.synthesized.find(row => row.authorityRef === authorityRef && row.entityRef === entityRef)
    || access.synthesized.find(row => row.authorityRef === authorityRef);
  if (synth) {
    return {
      authorityRef,
      mode: synth.mode,
      description: synth.description,
      anchor: synth.anchor,
      projectionRef: '',
    };
  }
  const grant = access.grants.find(row => row.authorityRef === authorityRef);
  if (grant) {
    return { authorityRef, mode: grant.mode, description: '', anchor: null, projectionRef: '' };
  }
  return undefined;
}

export function helperNameForOperation(operationId: string): string {
  const ident = operationId ? operationId.charAt(0).toUpperCase() + operationId.slice(1) : 'Operation';
  return `scopeFilterFor${ident}`;
}

export function resolveOwnerAccess(
  access: CbModuleAccess,
  owner: { id: string; entity: string },
): CbOwnerAccess | undefined {
  const authorityRefs = authorityRefsForOperation(access, owner.id);
  if (!authorityRefs.length) return undefined;
  const resolved = authorityRefs.map(ref => resolveAuthority(access, ref, owner.entity)).filter((row): row is ResolvedAuthority => !!row);
  const modes = unique(resolved.map(row => row.mode));
  const person = resolved.find(row => PERSON_SCOPE.has(row.mode) && row.anchor);
  const custom = resolved.find(row => row.mode === 'custom');
  const isPublic = modes.indexOf('public') >= 0;
  let mode: CbOwnerScope['mode'] = 'none';
  if (modes.length === 1) mode = modes[0] as CbAccessScopeMode;
  else if (modes.length > 1) mode = 'mixed';
  const needsHelper = resolved.some(row => PERSON_SCOPE.has(row.mode) && row.anchor);
  return {
    authorityRefs,
    publicRoute: isPublic && modes.every(item => item === 'public'),
    scope: {
      mode,
      authorityRefs,
      description: custom?.description || person?.description || resolved[0]?.description || '',
      projectionRef: resolved.find(row => row.projectionRef)?.projectionRef || '',
      anchor: person?.anchor ?? null,
      helperName: needsHelper ? helperNameForOperation(owner.id) : '',
      alreadyApplied: needsHelper,
    },
  };
}

export function accessScanWarnings(access: CbModuleAccess | undefined, operationIds: readonly string[]): string[] {
  if (!access) return [];
  const warnings: string[] = [];
  if (access.hasBindings && !access.hasV4) {
    warnings.push(`${CB_SCAN_ACCESS_BINDINGS_WITHOUT_V4}: access-bindings present without V4 operationAuthorityRefs`);
  }
  if (access.hasV4 && !access.hasBindings) {
    warnings.push(`${CB_SCAN_AUTHORITY_WITHOUT_BINDINGS}: V4 present without access-bindings — authority is checked, person-scope filter is not emitted`);
  }
  if (access.hasV4) {
    for (const operationId of operationIds) {
      if (!authorityRefsForOperation(access, operationId).length) {
        warnings.push(`${CB_SCAN_AUTHORITY_REQUIRED}: operation '${operationId}' has no authorityRefs`);
      }
    }
  }
  return warnings;
}

export function customScopeRecords(
  access: CbModuleAccess | undefined,
  owners: ReadonlyArray<{ id: string; entity: string }>,
): Array<{ operationId: string; description: string }> {
  if (!access) return [];
  const out: Array<{ operationId: string; description: string }> = [];
  for (const owner of owners) {
    const resolved = resolveOwnerAccess(access, owner);
    if (resolved?.scope.mode === 'custom') {
      out.push({ operationId: owner.id, description: resolved.scope.description });
    }
  }
  return out;
}

function catalogOf(entities: readonly CbEntityAccessCatalog[], entityId: string): CbEntityAccessCatalog | undefined {
  return entities.find(entity => entity.entityId === entityId);
}

function mdmTypeOf(entity: CbEntityAccessCatalog | undefined, entityId: string): string {
  return entity?.role || entity?.mdmType || entityId;
}

function idFieldOf(entity: CbEntityAccessCatalog | undefined, entityId: string): string {
  return entity?.idField || '';
}

function viaOf(entity: CbEntityAccessCatalog | undefined): 'mdm' | 'port' {
  if (!entity) return 'port';
  if (entity.kind === 'mdm' || entity.storageTarget === 'mdm' || entity.storageTarget === 'external') return 'mdm';
  return 'port';
}

/**
 * Reverse-walk the declared hops from the Person terminus back to the operation entity.
 * Field ids are those of the hops — never inferred from a name.
 */
export function planAnchorWalk(
  startEntity: string,
  anchor: CbAccessAnchor,
  entities: readonly CbEntityAccessCatalog[],
): CbScopeWalkPlan | undefined {
  const terminus = catalogOf(entities, anchor.terminus.entityRef);
  const steps: CbScopeWalkStep[] = [{
    kind: 'sessionPersons',
    entityRef: anchor.terminus.entityRef,
    mdmType: mdmTypeOf(terminus, anchor.terminus.entityRef),
    matchField: anchor.terminus.fieldId || CB_PERSON_LOGIN_FIELD,
    collectField: idFieldOf(terminus, anchor.terminus.entityRef) || 'mdmId',
    via: 'mdm',
  }];
  if (!anchor.hops.length) {
    const idField = idFieldOf(catalogOf(entities, startEntity), startEntity);
    return { filterFieldId: idField, steps };
  }
  let current = anchor.terminus.entityRef;
  for (let index = anchor.hops.length - 1; index >= 0; index--) {
    const hop = anchor.hops[index];
    if (hop.direction === 'forward') {
      const entity = catalogOf(entities, hop.entityRef);
      steps.push({
        kind: 'join',
        entityRef: hop.entityRef,
        mdmType: mdmTypeOf(entity, hop.entityRef),
        matchField: hop.fieldId,
        collectField: idFieldOf(entity, hop.entityRef),
        via: viaOf(entity),
      });
      current = hop.entityRef;
    } else {
      const entity = catalogOf(entities, hop.entityRef);
      if (current === hop.entityRef) {
        steps.push({
          kind: 'project',
          entityRef: hop.entityRef,
          mdmType: mdmTypeOf(entity, hop.entityRef),
          matchField: hop.fieldId,
          collectField: hop.fieldId,
          via: viaOf(entity),
        });
        current = hop.targetEntityRef;
      } else {
        steps.push({
          kind: 'join',
          entityRef: hop.entityRef,
          mdmType: mdmTypeOf(entity, hop.entityRef),
          matchField: hop.fieldId,
          collectField: hop.fieldId,
          via: viaOf(entity),
        });
        current = hop.entityRef;
      }
    }
  }
  const start = catalogOf(entities, startEntity);
  const last = steps[steps.length - 1];
  const filterFieldId = last?.kind === 'join' && last.entityRef === startEntity
    ? last.matchField
    : (idFieldOf(start, startEntity) || last?.collectField || '');
  if (last?.kind === 'join' && last.entityRef === startEntity) {
    steps.pop();
  }
  if (!filterFieldId) return undefined;
  return { filterFieldId, steps };
}

export interface ProfileAuthorityRow {
  profileId: string;
  actorIds: string[];
  roleScopes: string[];
  authorityRefs: string[];
}

export function buildProfileAuthorityTable(moduleName: string, access: CbModuleAccess): ProfileAuthorityRow[] {
  return access.profiles.map(profile => {
    const actorIds = profile.actorRefs.length ? profile.actorRefs : [profile.profileId];
    const fromGrants = access.grants.filter(grant => grant.profileRef === profile.profileId).map(grant => grant.authorityRef);
    const fromSynth = access.synthesized.filter(row => row.profileRef === profile.profileId).map(row => row.authorityRef);
    const fromBindings = access.bindings.filter(row => row.profileRef === profile.profileId).map(row => row.authorityRef);
    return {
      profileId: profile.profileId,
      actorIds,
      roleScopes: actorIds.map(actorId => `${moduleName}:${actorId}`),
      authorityRefs: unique([...fromGrants, ...fromSynth, ...fromBindings]),
    };
  });
}

export function operationAuthorityModes(
  access: CbModuleAccess,
  operationId: string,
  entityRef: string,
): Array<{ authorityRef: string; mode: CbAccessScopeMode }> {
  return authorityRefsForOperation(access, operationId).map(ref => {
    const resolved = resolveAuthority(access, ref, entityRef);
    return { authorityRef: ref, mode: resolved?.mode ?? 'organization' };
  });
}

function tsString(value: string): string {
  return JSON.stringify(value);
}

function tsStringArray(values: readonly string[]): string {
  return `[${values.map(tsString).join(', ')}]`;
}

export function emitProfileAuthoritiesTs(moduleName: string, access: CbModuleAccess, owners: ReadonlyArray<{ id: string; entity: string }>): string {
  const rows = buildProfileAuthorityTable(moduleName, access);
  const operations = owners.map(owner => {
    const modes = operationAuthorityModes(access, owner.id, owner.entity);
    return { id: owner.id, modes };
  }).filter(row => row.modes.length);
  const profileBlock = rows.map(row => [
    '  {',
    `    profileId: ${tsString(row.profileId)},`,
    `    actorIds: ${tsStringArray(row.actorIds)} as const,`,
    `    roleScopes: ${tsStringArray(row.roleScopes)} as const,`,
    `    authorityRefs: ${tsStringArray(row.authorityRefs)} as const,`,
    '  },',
  ].join('\n')).join('\n');
  const opBlock = operations.map(row => {
    const entries = row.modes.map(mode =>
      `    { authorityRef: ${tsString(mode.authorityRef)}, mode: ${tsString(mode.mode)} }`).join(',\n');
    return `  ${tsString(row.id)}: [\n${entries},\n  ]`;
  }).join(',\n');
  return [
    `/// <mls fileReference="l1/${moduleName}/layer_1_external/auth/profileAuthorities.ts" enhancement="_blank"/>`,
    '',
    '// Generated from the l4 access matrix (V4) and access-bindings. Do not edit by hand.',
    '',
    'export interface ProfileAuthorityRow {',
    '  profileId: string;',
    '  actorIds: readonly string[];',
    '  roleScopes: readonly string[];',
    '  authorityRefs: readonly string[];',
    '}',
    '',
    `export const PROFILE_AUTHORITIES: readonly ProfileAuthorityRow[] = [`,
    profileBlock || '',
    '];',
    '',
    'export const OPERATION_AUTHORITIES: Record<string, readonly { authorityRef: string; mode: string }[]> = {',
    opBlock,
    '};',
    '',
    'export function authorityRefsForSession(actorScope: readonly string[]): string[] {',
    '  const refs = new Set<string>();',
    '  for (const row of PROFILE_AUTHORITIES) {',
    '    const hit = actorScope.some(scope => scope === row.profileId || row.actorIds.indexOf(scope) >= 0 || row.roleScopes.indexOf(scope) >= 0);',
    '    if (!hit) continue;',
    '    for (const authorityRef of row.authorityRefs) refs.add(authorityRef);',
    '  }',
    '  return [...refs];',
    '}',
    '',
  ].join('\n');
}

function emitWalkSteps(plan: CbScopeWalkPlan): string[] {
  const lines: string[] = ['  let allowed: string[] = [];'];
  for (const step of plan.steps) {
    if (step.kind === 'sessionPersons') {
      lines.push(`  allowed = await personIdsForRole(ctx, ${tsString(step.mdmType)}, ${tsString(step.matchField)});`);
      continue;
    }
    if (step.kind === 'project') {
      lines.push(`  allowed = uniqueStrings(rowsOf(loaded).map(row => fieldOf(row, ${tsString(step.collectField)})));`);
      continue;
    }
    if (step.via === 'mdm') {
      lines.push(`  {`);
      lines.push(`    const listed = await ctx.mdm.collection.listByType({ type: ${tsString(step.mdmType)}, status: 'Active' });`);
      lines.push(`    const matched = listed.items.filter(item => allowed.indexOf(detailField(item.details, ${tsString(step.matchField)}) || item.mdmId) >= 0);`);
      const collect = step.collectField && step.collectField !== 'mdmId'
        ? `detailField(item.details, ${tsString(step.collectField)}) || item.mdmId`
        : 'item.mdmId';
      lines.push(`    allowed = uniqueStrings(matched.map(item => ${collect}));`);
      lines.push(`    loaded = matched.map(item => ({ ...item.details, mdmId: item.mdmId }));`);
      lines.push(`  }`);
    } else {
      lines.push(`  {`);
      lines.push(`    const port = resolveRepository<{ list(input: Record<string, unknown>): Promise<unknown> }>(ctx, ${tsString(step.entityRef)});`);
      lines.push(`    const listed = await port.list({});`);
      lines.push(`    const matched = rowsOf(listed).filter(row => allowed.indexOf(fieldOf(row, ${tsString(step.matchField)})) >= 0);`);
      lines.push(`    allowed = uniqueStrings(matched.map(row => fieldOf(row, ${tsString(step.collectField)})));`);
      lines.push(`    loaded = matched;`);
      lines.push(`  }`);
    }
  }
  lines.push(`  return { fieldId: ${tsString(plan.filterFieldId)}, allowed };`);
  return lines;
}

export function emitSessionScopeTs(
  moduleName: string,
  project: number,
  access: CbModuleAccess,
  owners: ReadonlyArray<{ id: string; entity: string }>,
  entities: readonly CbEntityAccessCatalog[],
): string {
  const helpers: string[] = [];
  let needsPort = false;
  for (const owner of owners) {
    const resolved = resolveOwnerAccess(access, owner);
    if (!resolved?.scope.helperName || !resolved.scope.anchor) continue;
    const plan = planAnchorWalk(owner.entity, resolved.scope.anchor, entities);
    if (!plan) continue;
    if (plan.steps.some(step => step.via === 'port' && step.kind === 'join')) needsPort = true;
    helpers.push([
      `export async function ${resolved.scope.helperName}(ctx: RequestContext): Promise<ScopeFilter | null> {`,
      `  const required = OPERATION_AUTHORITIES[${tsString(owner.id)}] ?? [];`,
      '  const sessionRefs = authorityRefsForSession(ctx.sessionContext?.actorScope ?? []);',
      '  const matched = required.filter(row => sessionRefs.indexOf(row.authorityRef) >= 0);',
      '  const effective = matched.length ? matched : required;',
      `  if (effective.some(row => row.mode === 'organization' || row.mode === 'public')) return null;`,
      `  if (!effective.some(row => row.mode === 'own' || row.mode === 'assigned' || row.mode === 'related')) return null;`,
      '  let loaded: Record<string, unknown>[] = [];',
      ...emitWalkSteps(plan),
      '}',
      '',
    ].join('\n'));
  }
  const importAuth = `/_${project}_/l1/${moduleName}/layer_1_external/auth/profileAuthorities.js`;
  return [
    `/// <mls fileReference="_${project}_/l1/${moduleName}/layer_2_application/scope/sessionScope.ts" enhancement="_blank"/>`,
    '',
    '// Generated from l4 access-bindings anchors. Person-scope predicate — do not re-derive.',
    `import { type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';`,
    ...(needsPort ? [`import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';`] : []),
    `import { authorityRefsForSession, OPERATION_AUTHORITIES } from '${importAuth}';`,
    '',
    'export interface ScopeFilter { fieldId: string; allowed: string[] }',
    '',
    'function sessionUserId(ctx: RequestContext): string {',
    '  return String(ctx.sessionContext?.actorId ?? \'\').trim();',
    '}',
    '',
    'function detailField(details: unknown, fieldId: string): string {',
    '  if (!details || typeof details !== \'object\' || Array.isArray(details)) return \'\';',
    '  const value = (details as Record<string, unknown>)[fieldId];',
    '  return typeof value === \'string\' ? value : \'\';',
    '}',
    '',
    'function fieldOf(row: Record<string, unknown>, fieldId: string): string {',
    '  const value = row[fieldId];',
    '  return typeof value === \'string\' ? value : \'\';',
    '}',
    '',
    'function uniqueStrings(values: string[]): string[] {',
    '  return [...new Set(values.filter(Boolean))];',
    '}',
    '',
    'function rowsOf(listed: unknown): Record<string, unknown>[] {',
    '  if (Array.isArray(listed)) return listed.filter(row => !!row && typeof row === \'object\') as Record<string, unknown>[];',
    '  if (listed && typeof listed === \'object\') {',
    '    const rec = listed as Record<string, unknown>;',
    '    for (const key of Object.keys(rec)) {',
    '      if (Array.isArray(rec[key])) return rec[key] as Record<string, unknown>[];',
    '    }',
    '  }',
    '  return [];',
    '}',
    '',
    'async function personIdsForRole(ctx: RequestContext, mdmType: string, loginField: string): Promise<string[]> {',
    '  const userId = sessionUserId(ctx);',
    '  if (!userId) return [];',
    '  const listed = await ctx.mdm.collection.listByType({ type: mdmType, status: \'Active\' });',
    '  return listed.items.filter(item => detailField(item.details, loginField) === userId).map(item => item.mdmId);',
    '}',
    '',
    'export function rowInScope(row: Record<string, unknown>, filter: ScopeFilter): boolean {',
    '  return filter.allowed.indexOf(fieldOf(row, filter.fieldId)) >= 0;',
    '}',
    '',
    ...helpers,
  ].join('\n');
}

export function pinUsecaseScope(result: Record<string, unknown>, scope: CbOwnerScope | undefined): void {
  if (scope && (scope.helperName || scope.mode === 'custom')) {
    result.scopeFilter = {
      mode: scope.mode,
      alreadyApplied: scope.alreadyApplied,
      helperName: scope.helperName,
      description: scope.description,
      projectionRef: scope.projectionRef,
    };
  } else {
    delete result.scopeFilter;
  }
}
