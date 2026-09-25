/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.ts" enhancement="_blank"/>

import {
  D1_MDM_CALLS,
  type D1MdmArgument,
  type D1MdmCall,
  type D1MdmClause,
  type D1MdmGap,
  type D1MdmOrigin,
  type D1MdmPlannedCall,
  type D1UsecaseMdm,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

/**
 * Platform keys of the MDM detail record that `entity.update` accepts as a
 * caller patch. Engine fields stay out: status is inactivate/reactivate,
 * tags and moduleTypes are attachRole, relationshipRefs is link.
 * This set mirrors the facade. A key the facade does not accept is a gap.
 */
const FACADE_PLATFORM_KEYS = new Set<string>([
  'name', 'docType', 'docId', 'countryCode', 'aliases', 'contacts', 'addresses',
  'privacyConsent', 'birthDate', 'gender', 'nationality', 'occupation', 'photoUrl', 'notes',
  'companyKind', 'parentCompanyId', 'externalCode', 'legalName', 'tradeName', 'legalType',
  'foundingDate', 'taxRegime', 'industryCode', 'website',
  'sku', 'productType', 'category', 'brand', 'unitOfMeasure', 'isInventoried',
  'serviceCode', 'serviceKind', 'parentServiceId', 'serviceType', 'durationMinutes', 'deliveryMode',
  'locationType', 'locationCode', 'parentLocationId', 'capacity', 'propertyAddress',
  'assetCategory', 'serialNumber', 'manufacturer', 'model',
  'contactType', 'value', 'isVerified', 'verifiedAt',
  'storageBucket', 'storagePath', 'originModule', 'docCategory', 'fileName', 'mimeType',
  'bankRoutingNumber', 'bankName', 'accountNumber', 'accountType', 'swift', 'iban',
  'pixKey', 'pixKeyType',
  'promotionSource', 'promotedTo', 'ttlExpiresAt',
]);

const ENGINE_KEYS = new Set<string>([
  'mdmId', 'subtype', 'status', 'moduleTypes', 'tags', 'relationshipRefs',
  'mergedInto', 'createdAt', 'updatedAt', 'namespaces',
]);

const READ_CAPABILITIES = [
  'read.byId',
  'locate.byDocument',
  'locate.byName',
  'locate.byTag',
  'locate.byContact',
  'listLinks',
] as const;

/** Same filter the worker catalog and the gate use before bindMdm. */
export function capabilityApplies(name: string, operation: string): boolean {
  if (operation === 'update') return name === 'edit.platformFields' || name.startsWith('edit.');
  if (operation === 'create') return name.startsWith('register.') || name === 'create';
  if (operation === 'list' || operation === 'get') return name.startsWith('read.') || name.startsWith('locate.') || name.startsWith('list');
  return false;
}

/**
 * Capabilities this operation may name, then the calls bindMdm actually emits.
 * Context, worker schema and the gate all take this result. A locate the input
 * cannot feed is not offered.
 */
export function mdmForOperation(input: MdmBindInput & { operation: string }): D1UsecaseMdm {
  return bindMdm({
    ...input,
    selected: input.capabilities.filter(name => capabilityApplies(name, input.operation)),
  });
}

/** One schema pair per bound call. Alternative writes stay in the catalog. */
export function mdmStepPairs(mdm: D1UsecaseMdm): Array<{ call: string; capability: string }> {
  const pairs: Array<{ call: string; capability: string }> = [];
  const seen = new Set<string>();
  for (const call of mdm.calls) {
    for (const capability of call.capabilities) {
      if (!call.method || !capability) continue;
      const key = `${call.method}\u0000${capability}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ call: call.method, capability });
    }
  }
  return pairs;
}

/**
 * Capabilities the ontology can name and the facade does not implement.
 * Inactivate and reactivate do not write status history. Audit is another module.
 */
export function mdmFacadeGaps(): D1MdmGap[] {
  return [
    {
      capability: 'statusHistory.read',
      code: 'MDM_UNBOUND',
      evidence: 'MdmFacade has no status-history read. findStatusHistoryByEntity is a separate usecase routed as mdm.statusHistory.findByEntity. entity.inactivate and entity.reactivate do not write that history.',
    },
    {
      capability: 'audit',
      code: 'MDM_UNBOUND',
      evidence: 'MdmFacade has no audit read. Audit is a separate module (audit.auditLog.load, audit.statusHistory.load), not an entity method.',
    },
  ];
}

export function isMdmFacadeCall(value: string): value is D1MdmCall {
  return (D1_MDM_CALLS as readonly string[]).includes(value);
}

/** A patch key the caller module may not write. Platform keys and the caller namespace are allowed. */
export function isForeignMdmPatchKey(namespace: string, key: string): boolean {
  if (FACADE_PLATFORM_KEYS.has(key)) return false;
  return key !== namespace;
}

/**
 * Facade methods named by capabilities alone.
 * Callers that only need the catalog use this. It does not read a contract
 * and it does not invent arguments.
 */
export function mdmCapabilityCalls(selected: readonly string[]): Array<{ method: string; capabilities: string[] }> {
  const chosen = new Set(selected);
  const calls: Array<{ method: string; capabilities: string[] }> = [];
  const update = ['edit.platformFields', 'edit.moduleNamespace'].filter(name => chosen.has(name));
  if (update.length) calls.push({ method: 'update', capabilities: update });
  if (chosen.has('register.createOrAttach')) {
    const capability = ['register.createOrAttach'];
    calls.push(
      { method: 'findByDocument', capabilities: capability },
      { method: 'create', capabilities: capability },
      { method: 'attachRole', capabilities: capability },
    );
  }
  const reads: Array<[string, string]> = [
    ['read.byId', 'get'],
    ['locate.byDocument', 'findByDocument'],
    ['locate.byContact', 'findByContact'],
    ['locate.byName', 'listByType'],
    ['locate.byTag', 'listByType'],
    ['listLinks', 'relatedOfMany'],
  ];
  for (const [capability, method] of reads) {
    if (chosen.has(capability)) calls.push({ method, capabilities: [capability] });
  }
  if (chosen.has('inactivate')) {
    calls.push(
      { method: 'inactivate', capabilities: ['inactivate'] },
      { method: 'reactivate', capabilities: ['inactivate'] },
    );
  }
  if (chosen.has('invite.login')) calls.push({ method: 'invite', capabilities: ['invite.login'] });
  if (chosen.has('link.contact')) calls.push({ method: 'link', capabilities: ['link.contact'] });
  return calls;
}

/** One field of this operation's input, flattened. `writePrecondition` is the ontology mark, not the name. */
export interface MdmInputField {
  path: string;
  optional: boolean;
  writePrecondition: boolean;
}

export interface MdmBindInput {
  entityId: string;
  namespace: string;
  /** Every capability the role declares. A locate capability does not put its arguments on every input. */
  capabilities: readonly string[];
  /** Capabilities this operation actually uses. */
  selected: readonly string[];
  platformFields: readonly string[];
  /**
   * Fields shared by every resolved route input.
   * `null` means the route contract was not read. A call that needs a contract
   * argument is not emitted (`MDM_CONTRACT_UNREAD`).
   * An empty list means the contract was read and declares nothing.
   */
  inputFields?: readonly MdmInputField[] | null;
  /** Why the contract was not read, one reason per route. Ignored when fields were read. */
  contractUnread?: string;
}

export function bindMdm(input: MdmBindInput): D1UsecaseMdm {
  const role = input.namespace && input.entityId ? `${input.namespace}.${input.entityId}` : '';
  const gaps: D1MdmGap[] = [];
  const calls: D1MdmPlannedCall[] = [];
  const selected = new Set(input.selected);
  const skipped = new Set<string>();
  const fields = input.inputFields ?? null;
  const reason = fields ? '' : (input.contractUnread?.trim() || 'contract absent');
  const platformCapability = input.selected.includes('edit.platformFields')
    ? 'edit.platformFields'
    : input.selected.includes('register.createOrAttach')
      ? 'register.createOrAttach'
      : '';
  const platform = fields && platformCapability
    ? platformPatches(input, platformCapability, gaps)
    : [];
  if (selected.has('edit.platformFields') || selected.has('edit.moduleNamespace')) {
    if (!fields) {
      if (selected.has('edit.platformFields')) refuseUnread(gaps, 'edit.platformFields', reason);
      if (selected.has('edit.moduleNamespace')) refuseUnread(gaps, 'edit.moduleNamespace', reason);
    } else {
      const update = updateCall(input, platform, gaps);
      if (update) calls.push(update);
    }
  }

  if (selected.has('register.createOrAttach') || selected.has('create')) {
    if (selected.has('create') && !selected.has('register.createOrAttach')) {
      gaps.push(knownGap('create'));
    } else if (!fields) {
      refuseUnread(gaps, 'register.createOrAttach', reason);
    } else {
      calls.push(...createOrAttachCalls(input, role, platform, gaps));
    }
  }

  for (const name of READ_CAPABILITIES) {
    if (!selected.has(name)) continue;
    if (!fields && name !== 'locate.byTag') {
      refuseUnread(gaps, name, reason);
      continue;
    }
    if (fields && !readFeedable(name, fields)) {
      skipped.add(name);
      continue;
    }
    const call = readCall(name, role, fields);
    if (call) calls.push(call);
  }

  if (selected.has('inactivate')) {
    if (!fields) refuseUnread(gaps, 'inactivate', reason);
    else {
      calls.push(statusCall(input, 'inactivate'));
      calls.push(statusCall(input, 'reactivate'));
    }
  }
  if (selected.has('invite.login')) {
    if (!fields) refuseUnread(gaps, 'invite.login', reason);
    else calls.push(inviteCall());
  }
  if (selected.has('link.contact')) {
    if (!fields) refuseUnread(gaps, 'link.contact', reason);
    else calls.push(linkCall(fields));
  }

  for (const name of input.selected) {
    if (skipped.has(name)) continue;
    if (calls.some(call => call.capabilities.includes(name))) continue;
    if (gaps.some(gap => gap.capability === name)) continue;
    gaps.push(knownGap(name));
  }

  gaps.push(...mdmFlowGaps(calls, input, gaps));
  const executable = calls.filter(call => !call.alternative);
  return {
    namespace: input.namespace,
    role,
    atomic: executable.length === 1 && gaps.length === 0,
    calls,
    gaps,
  };
}

/**
 * Proves the serialized plan. Prior links and the create-or-attach branch are checked
 * whether or not a contract was read. A contract argument with no field list is
 * `MDM_CONTRACT_UNREAD`, not a pass.
 */
export function mdmFlowGaps(
  calls: readonly D1MdmPlannedCall[],
  input: MdmBindInput,
  existing: readonly D1MdmGap[] = [],
): D1MdmGap[] {
  const gaps: D1MdmGap[] = [];
  const seen = new Set(existing.map(gap => `${gap.code}\u0000${gap.evidence}`));
  const reason = input.inputFields == null ? (input.contractUnread?.trim() || 'contract absent') : '';
  const push = (capability: string, evidence: string) => {
    const key = `MDM_ARGUMENT_UNBOUND\u0000${evidence}`;
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push({ capability, code: 'MDM_ARGUMENT_UNBOUND', evidence });
  };
  const pushUnread = (capability: string) => {
    const evidence = `${capability} needs a contract argument. ${reason}`;
    const key = `MDM_CONTRACT_UNREAD\u0000${evidence}`;
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push({ capability, code: 'MDM_CONTRACT_UNREAD', evidence });
  };
  const role = input.namespace && input.entityId ? `${input.namespace}.${input.entityId}` : '';
  calls.forEach((call, index) => {
    const capability = call.capabilities[0] || call.method;
    if (!call.id) push(capability, `${call.method} has no id.`);
    for (const clause of call.when) {
      if (clause.kind === 'prior' && !earlier(calls, index, clause.call || '')) {
        push(capability, `${call.id || call.method} waits on ${clause.call || '(none)'}, which is not an earlier result.`);
      }
      if (clause.kind === 'contract' && input.inputFields == null) {
        pushUnread(capability);
      } else if (clause.kind === 'contract' && input.inputFields && !input.inputFields.some(field => field.path === clause.path)) {
        push(capability, `${call.id || call.method} waits on ${clause.path}, which is not on the input.`);
      }
    }
    for (const arg of call.arguments) {
      if (input.inputFields == null && arg.origin.kind === 'contract') {
        pushUnread(capability);
        continue;
      }
      proveArgument(calls, index, call, arg, input, role, push);
    }
    if (call.method === 'update' || call.method === 'inactivate' || call.method === 'reactivate') {
      if (input.inputFields == null) {
        pushUnread(capability);
      } else {
        if (!call.arguments.some(arg => arg.name === 'mdmId')) {
          push(capability, `${call.id || call.method} has no mdmId from the input id.`);
        }
        proveVersion(call, input, push);
      }
    }
    if (call.method === 'create' && call.arguments.some(arg => arg.name === 'expectedVersion')) {
      push(capability, 'entity.create does not take expectedVersion. Create excludes write preconditions.');
    }
    if (call.method === 'attachRole') {
      const id = call.arguments.find(arg => arg.name === 'mdmId');
      if (!id || id.origin.kind !== 'prior') {
        push(capability, 'attachRole mdmId is not an earlier result.');
      }
    }
  });
  const create = calls.find(call => call.method === 'create' && call.capabilities.includes('register.createOrAttach'));
  if (create) {
    for (const locate of calls) {
      if (locate.method !== 'findByDocument' && locate.method !== 'findByContact') continue;
      const waits = create.when.some(clause => (
        clause.kind === 'prior' && clause.call === locate.id && clause.path === 'mdmId' && clause.present === false
      ));
      if (!waits) {
        push('register.createOrAttach', `create does not skip when ${locate.id || locate.method} already found the person.`);
      }
    }
  }
  if (input.inputFields && calls.some(call => call.method === 'findByContact')) {
    if (!contactPair(input.inputFields)) {
      push('locate.byContact', 'findByContact needs contactType and value on this input. The locate capability does not add them.');
    }
  }
  return gaps;
}

function refuseUnread(gaps: D1MdmGap[], capability: string, reason: string): void {
  const evidence = `${capability} needs a contract argument. ${reason}`;
  if (gaps.some(gap => gap.code === 'MDM_CONTRACT_UNREAD' && gap.capability === capability && gap.evidence === evidence)) return;
  gaps.push({ capability, code: 'MDM_CONTRACT_UNREAD', evidence });
}

function knownGap(capability: string): D1MdmGap {
  const standing = mdmFacadeGaps().find(gap => gap.capability === capability);
  if (standing) return standing;
  return {
    capability,
    code: 'MDM_UNBOUND',
    evidence: `Capability ${capability} has no method on the MDM facade.`,
  };
}

function platformPatches(input: MdmBindInput, capability: string, gaps: D1MdmGap[]): D1MdmArgument[] {
  const args: D1MdmArgument[] = [];
  const seen = new Set<string>();
  for (const path of input.platformFields) {
    const resolved = platformPatchKey(path);
    if ('gap' in resolved) {
      gaps.push({ capability, code: 'MDM_PATCH_UNBOUND', evidence: resolved.gap });
      continue;
    }
    if (!input.inputFields || !input.inputFields.some(field => field.path === path)) continue;
    if (seen.has(resolved.key)) continue;
    seen.add(resolved.key);
    args.push(contractArg(resolved.key, 'patch', path, capability));
  }
  return args;
}

function platformPatchKey(path: string): { key: string } | { gap: string } {
  const parts = path.split('.');
  if (parts.length < 3 || parts[0] !== 'details') {
    return { gap: `${path} is not a details field entity.update can patch.` };
  }
  const branch = parts[1];
  const leaf = parts[parts.length - 1];
  if (branch !== 'identification' && branch !== 'person' && branch !== 'base') {
    return { gap: `${path} is not a platform branch. Module data is the caller namespace key, not a platform patch.` };
  }
  if (ENGINE_KEYS.has(leaf)) {
    return { gap: `${path} is not an edit.platformFields key. status is inactivate or reactivate; tags are attachRole.` };
  }
  if (!FACADE_PLATFORM_KEYS.has(leaf)) {
    return { gap: `${path} has no key on entity.update.` };
  }
  return { key: leaf };
}

/**
 * Platform fields and the caller namespace share one `entity.update`.
 * Two updates would each send the same expectedVersion; the second is stale.
 * The facade accepts both key kinds in one patch and bumps version once.
 * expectedVersion is the contract field marked writePrecondition. The plan does not read a newer version.
 */
function updateCall(input: MdmBindInput, platform: readonly D1MdmArgument[], gaps: D1MdmGap[]): D1MdmPlannedCall | null {
  const capabilities: string[] = [];
  const args: D1MdmArgument[] = [];
  const id = identityArg(input);
  if (id) args.push(id);
  const version = versionArg(input);
  if (version) args.push(version);
  if (input.selected.includes('edit.platformFields')) {
    capabilities.push('edit.platformFields');
    if (!platform.length && !gaps.some(gap => gap.capability === 'edit.platformFields')) {
      gaps.push({
        capability: 'edit.platformFields',
        code: 'MDM_PATCH_UNBOUND',
        evidence: 'edit.platformFields has no platform field that entity.update can patch.',
      });
    }
    args.push(...platform);
  }
  if (input.selected.includes('edit.moduleNamespace')) {
    capabilities.push('edit.moduleNamespace');
    const namespacePath = `details.${input.namespace}`;
    if (!input.namespace) {
      gaps.push({
        capability: 'edit.moduleNamespace',
        code: 'MDM_UNBOUND',
        evidence: 'edit.moduleNamespace needs the caller module namespace. None is declared.',
      });
    } else if (!input.inputFields || !input.inputFields.some(field => field.path === namespacePath)) {
      gaps.push({
        capability: 'edit.moduleNamespace',
        code: 'MDM_ARGUMENT_UNBOUND',
        evidence: `${namespacePath} is not on this operation input.`,
      });
    } else {
      args.push(contractArg(input.namespace, 'patch', namespacePath, 'edit.moduleNamespace'));
    }
  }
  if (!capabilities.length) return null;
  return {
    id: 'update',
    method: 'update',
    target: 'entity',
    shape: 'write',
    capabilities,
    alternative: false,
    when: [],
    arguments: args,
    result: ['mdmId', 'version', 'details'],
  };
}

/**
 * New person: find (when its input is present), then create, then attachRole.
 * Existing person: a find hit skips create. attachRole reads the mdmId that hit produced.
 * locate.byContact on the role does not add findByContact unless this input declares the pair.
 * Nothing here wraps the sequence in one transaction.
 */
function createOrAttachCalls(
  input: MdmBindInput,
  role: string,
  platform: readonly D1MdmArgument[],
  gaps: D1MdmGap[],
): D1MdmPlannedCall[] {
  const capability = 'register.createOrAttach';
  const calls: D1MdmPlannedCall[] = [];
  const docType = 'details.identification.docType';
  const docId = 'details.identification.docId';
  const fields = input.inputFields;
  if (!fields) return [];
  const documentOnInput = fields.some(field => field.path === docType) && fields.some(field => field.path === docId);
  if (documentOnInput) {
    calls.push(point('findByDocument', capability, [
      contractArg('docType', 'selector', docType),
      contractArg('docId', 'selector', docId),
    ], presentWhen(fields, [docType, docId]), 'findDocument'));
  }
  const contact = contactPair(fields);
  if (contact && input.capabilities.includes('locate.byContact')) {
    calls.push(point('findByContact', capability, [
      contractArg('contactType', 'selector', contact.type.path),
      contractArg('value', 'selector', contact.value.path),
    ], presentWhen(fields, [contact.type.path, contact.value.path]), 'findContact'));
  }
  if (!platform.length && !gaps.some(gap => gap.capability === capability)) {
    gaps.push({
      capability,
      code: 'MDM_PATCH_UNBOUND',
      evidence: 'register.createOrAttach has no platform field that entity.create can write.',
    });
  }
  const locateIds = calls.map(call => call.id);
  calls.push({
    id: 'createPerson',
    method: 'create',
    target: 'entity',
    shape: 'write',
    capabilities: [capability],
    alternative: false,
    when: locateIds.map(call => ({ kind: 'prior', call, path: 'mdmId', present: false })),
    arguments: [...platform],
    result: ['mdmId', 'version', 'alreadyExists'],
  });
  calls.push({
    id: 'attachRole',
    method: 'attachRole',
    target: 'entity',
    shape: 'write',
    capabilities: [capability],
    alternative: false,
    when: [],
    arguments: [
      priorArg('mdmId', 'selector', [...locateIds, 'createPerson'], 'mdmId'),
      literalArg('role', 'parameter', role, 'role'),
    ],
    result: ['mdmId', 'version'],
  });
  return calls;
}

function readCall(
  capability: (typeof READ_CAPABILITIES)[number],
  role: string,
  fields: readonly MdmInputField[] | null,
): D1MdmPlannedCall | null {
  if (capability === 'read.byId') {
    if (!fields) return null;
    return point('get', capability, [contractArg('mdmId', 'selector', 'id')], presentWhen(fields, ['id']), 'get');
  }
  if (capability === 'locate.byDocument') {
    if (!fields) return null;
    const paths = ['details.identification.docType', 'details.identification.docId'];
    return point('findByDocument', capability, [
      contractArg('docType', 'selector', paths[0]),
      contractArg('docId', 'selector', paths[1]),
    ], presentWhen(fields, paths), 'findByDocument');
  }
  if (capability === 'locate.byContact') {
    if (!fields) return null;
    const pair = contactPair(fields);
    if (!pair) return null;
    return point('findByContact', capability, [
      contractArg('contactType', 'selector', pair.type.path),
      contractArg('value', 'selector', pair.value.path),
    ], presentWhen(fields, [pair.type.path, pair.value.path]), 'findByContact');
  }
  if (capability === 'locate.byName') {
    if (!fields) return null;
    return {
      id: 'listByName',
      method: 'listByType',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      when: presentWhen(fields, ['details.identification.name']),
      arguments: [
        literalArg('type', 'parameter', role, 'role'),
        contractArg('name', 'selector', 'details.identification.name'),
      ],
      result: ['items', 'page', 'pageSize', 'total'],
    };
  }
  if (capability === 'locate.byTag') {
    return {
      id: 'listByTag',
      method: 'listByType',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      when: [],
      arguments: [literalArg('type', 'parameter', role, 'role')],
      result: ['items', 'page', 'pageSize', 'total'],
    };
  }
  if (capability === 'listLinks') {
    if (!fields) return null;
    return {
      id: 'listLinks',
      method: 'relatedOfMany',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      when: presentWhen(fields, ['id']),
      arguments: [contractArg('mdmIds', 'selector', 'id')],
      result: ['mdmId', 'relationshipId', 'type', 'direction'],
    };
  }
  return null;
}

function point(
  method: D1MdmCall,
  capability: string,
  args: D1MdmArgument[],
  when: D1MdmClause[],
  id: string,
): D1MdmPlannedCall {
  return {
    id,
    method,
    target: 'entity',
    shape: 'point',
    capabilities: [capability],
    alternative: false,
    when,
    arguments: args,
    result: ['mdmId', 'version', 'details'],
  };
}

/** The method writes the status. The caller passes the id and the expected version, not a status patch. */
function statusCall(input: MdmBindInput, method: 'inactivate' | 'reactivate'): D1MdmPlannedCall {
  const args: D1MdmArgument[] = [];
  const id = identityArg(input);
  if (id) args.push(id);
  const version = versionArg(input);
  if (version) args.push(version);
  return {
    id: method,
    method,
    target: 'entity',
    shape: 'write',
    capabilities: ['inactivate'],
    alternative: true,
    when: [],
    arguments: args,
    result: ['mdmId', 'version'],
  };
}

function inviteCall(): D1MdmPlannedCall {
  return {
    id: 'invite',
    method: 'invite',
    target: 'identity',
    shape: 'write',
    capabilities: ['invite.login'],
    alternative: false,
    when: [],
    arguments: [
      contractArg('mdmId', 'selector', 'id'),
      contractArg('email', 'parameter', 'email'),
      contextArg('moduleId'),
      contextArg('actorId'),
    ],
    result: ['token', 'expiresAt'],
  };
}

function linkCall(fields: readonly MdmInputField[]): D1MdmPlannedCall {
  return {
    id: 'link',
    method: 'link',
    target: 'entity',
    shape: 'write',
    capabilities: ['link.contact'],
    alternative: false,
    when: presentWhen(fields, ['id', 'toId', 'type']),
    arguments: [
      contractArg('fromId', 'selector', 'id'),
      contractArg('toId', 'selector', 'toId'),
      contractArg('type', 'parameter', 'type'),
    ],
    result: ['id', 'fromId', 'toId', 'type'],
  };
}

function identityArg(input: MdmBindInput): D1MdmArgument | null {
  if (!input.inputFields || !input.inputFields.some(field => field.path === 'id') || mayBeAbsent(input.inputFields, 'id')) {
    return null;
  }
  return contractArg('mdmId', 'selector', 'id');
}

function versionArg(input: MdmBindInput): D1MdmArgument | null {
  if (!input.inputFields) return null;
  const marked = input.inputFields.filter(field => field.writePrecondition);
  if (marked.length !== 1 || mayBeAbsent(input.inputFields, marked[0].path)) return null;
  const path = marked[0].path;
  return { name: 'expectedVersion', role: 'parameter', path, origin: { kind: 'contract', path, evidence: 'writePrecondition' } };
}

function contractArg(
  name: string,
  role: D1MdmArgument['role'],
  path: string,
  capability?: string,
): D1MdmArgument {
  const arg: D1MdmArgument = { name, role, path, origin: { kind: 'contract', path } };
  if (capability) arg.capability = capability;
  return arg;
}

function literalArg(name: string, role: D1MdmArgument['role'], value: string, evidence: string): D1MdmArgument {
  return { name, role, value, origin: { kind: 'literal', evidence } };
}

function contextArg(name: string): D1MdmArgument {
  return { name, role: 'parameter', value: 'ctx', origin: { kind: 'context', evidence: 'ctx' } };
}

function priorArg(name: string, role: D1MdmArgument['role'], calls: string[], path: string): D1MdmArgument {
  return { name, role, origin: { kind: 'prior', path, calls } };
}

function presentWhen(fields: readonly MdmInputField[], paths: readonly string[]): D1MdmClause[] {
  return paths
    .filter(path => mayBeAbsent(fields, path))
    .map(path => ({ kind: 'contract', path, present: true }));
}

function mayBeAbsent(fields: readonly MdmInputField[], path: string): boolean {
  const parts = path.split('.');
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc}.${part}` : part;
    if (fields.find(field => field.path === acc)?.optional) return true;
  }
  return false;
}

function contactPair(fields: readonly MdmInputField[]): { type: MdmInputField; value: MdmInputField } | null {
  for (const field of fields) {
    if (field.path !== 'contactType' && !field.path.endsWith('.contactType')) continue;
    const parent = field.path.slice(0, Math.max(0, field.path.length - 'contactType'.length));
    const value = fields.find(item => item.path === `${parent}value`);
    if (value) return { type: field, value };
  }
  return null;
}

function readFeedable(name: string, fields: readonly MdmInputField[]): boolean {
  if (name === 'read.byId' || name === 'listLinks') return fields.some(field => field.path === 'id');
  if (name === 'locate.byDocument') {
    return fields.some(field => field.path === 'details.identification.docType')
      && fields.some(field => field.path === 'details.identification.docId');
  }
  if (name === 'locate.byContact') return contactPair(fields) !== null;
  if (name === 'locate.byName') return fields.some(field => field.path === 'details.identification.name');
  if (name === 'locate.byTag') return true;
  return false;
}

function proveVersion(
  call: D1MdmPlannedCall,
  input: MdmBindInput,
  push: (capability: string, evidence: string) => void,
): void {
  const capability = call.capabilities[0] || call.method;
  const version = call.arguments.find(arg => arg.name === 'expectedVersion');
  if (input.inputFields == null) return;
  if (!version) {
    push(capability, `${call.id || call.method} has no expectedVersion from a writePrecondition field. The plan does not read the current version.`);
    return;
  }
  if (version.origin.kind !== 'contract') {
    push(capability, `${call.id || call.method} expectedVersion is not the contract precondition.`);
    return;
  }
  const field = input.inputFields.find(item => item.path === version.origin.path && item.writePrecondition);
  if (version.origin.evidence !== 'writePrecondition' || !field || mayBeAbsent(input.inputFields, field.path)) {
    push(capability, `${call.id || call.method} expectedVersion is not a required writePrecondition on this input.`);
  }
}

function proveArgument(
  calls: readonly D1MdmPlannedCall[],
  index: number,
  call: D1MdmPlannedCall,
  arg: D1MdmArgument,
  input: MdmBindInput,
  role: string,
  push: (capability: string, evidence: string) => void,
): void {
  const capability = call.capabilities[0] || call.method;
  const origin: D1MdmOrigin = arg.origin;
  if (origin.kind === 'context') {
    if (arg.value !== 'ctx') push(capability, `${call.id} argument ${arg.name} is not ctx.`);
    return;
  }
  if (origin.kind === 'literal') {
    if (!arg.value) push(capability, `${call.id} argument ${arg.name} has no literal.`);
    if ((arg.name === 'role' || (arg.name === 'type' && origin.evidence === 'role')) && arg.value !== role) {
      push(capability, `${call.id} ${arg.name} ${arg.value || '(none)'} is not ${role}.`);
    }
    return;
  }
  if (origin.kind === 'contract') {
    if (!origin.path) {
      push(capability, `${call.id} argument ${arg.name} has no contract path.`);
      return;
    }
    if (arg.name === 'expectedVersion' || input.inputFields == null) return;
    if (!input.inputFields.some(field => field.path === origin.path)) {
      push(capability, `${call.id} argument ${arg.name} reads ${origin.path}, which is not on this input.`);
      return;
    }
    if (arg.role !== 'patch' && mayBeAbsent(input.inputFields, origin.path)) {
      const guarded = call.when.some(clause => clause.kind === 'contract' && clause.path === origin.path && clause.present);
      if (!guarded) push(capability, `${call.id} argument ${arg.name} reads optional ${origin.path} with no presence condition.`);
    }
    return;
  }
  const ids = origin.calls || [];
  if (!origin.path || !ids.length) {
    push(capability, `${call.id} argument ${arg.name} does not name an earlier result.`);
    return;
  }
  for (const id of ids) {
    const producer = calls.slice(0, index).find(item => item.id === id);
    if (!producer) {
      push(capability, `${call.id} argument ${arg.name} cites ${id}, which is not an earlier call.`);
      continue;
    }
    if (!producer.result.includes(origin.path)) {
      push(capability, `${call.id} argument ${arg.name} cites ${id}.${origin.path}, which that call does not produce.`);
    }
  }
  if (call.method === 'attachRole' && arg.name === 'mdmId') proveAttach(calls, index, ids, push);
}

function proveAttach(
  calls: readonly D1MdmPlannedCall[],
  index: number,
  ids: readonly string[],
  push: (capability: string, evidence: string) => void,
): void {
  const before = calls.slice(0, index);
  const producers = ids.flatMap(id => {
    const call = before.find(item => item.id === id);
    return call ? [call] : [];
  });
  if (producers.some(call => call.when.length === 0 && call.result.includes('mdmId'))) return;
  const create = producers.find(call => call.method === 'create');
  if (!create) {
    push('register.createOrAttach', 'attachRole has no create result to use when locate misses.');
    return;
  }
  for (const locate of before) {
    if (locate.method !== 'findByDocument' && locate.method !== 'findByContact') continue;
    if (!ids.includes(locate.id)) push('register.createOrAttach', `attachRole does not read ${locate.id}.`);
  }
}

function earlier(calls: readonly D1MdmPlannedCall[], index: number, id: string): boolean {
  return calls.slice(0, index).some(call => call.id === id);
}
