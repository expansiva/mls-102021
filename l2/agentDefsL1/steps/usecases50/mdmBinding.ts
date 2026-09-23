/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.ts" enhancement="_blank"/>

import {
  D1_MDM_CALLS,
  type D1MdmArgument,
  type D1MdmCall,
  type D1MdmGap,
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

export interface MdmBindInput {
  entityId: string;
  namespace: string;
  /** Every capability the role declares. Contact dedupe is decided from this, not from the operation filter. */
  capabilities: readonly string[];
  /** Capabilities this operation actually uses. */
  selected: readonly string[];
  platformFields: readonly string[];
}

export function bindMdm(input: MdmBindInput): D1UsecaseMdm {
  const role = input.namespace && input.entityId ? `${input.namespace}.${input.entityId}` : '';
  const gaps: D1MdmGap[] = [];
  const calls: D1MdmPlannedCall[] = [];
  const selected = new Set(input.selected);
  const platformCapability = input.selected.includes('edit.platformFields')
    ? 'edit.platformFields'
    : input.selected.includes('register.createOrAttach')
      ? 'register.createOrAttach'
      : '';
  const platform = platformCapability
    ? platformPatches(input.platformFields, platformCapability, gaps)
    : [];
  if (selected.has('edit.platformFields') || selected.has('edit.moduleNamespace')) {
    const update = updateCall(input, platform, gaps);
    if (update) calls.push(update);
  }

  if (selected.has('register.createOrAttach') || selected.has('create')) {
    if (selected.has('create') && !selected.has('register.createOrAttach')) {
      gaps.push(knownGap('create'));
    } else {
      calls.push(...createOrAttachCalls(input, platform, gaps));
    }
  }

  for (const name of READ_CAPABILITIES) {
    if (!selected.has(name)) continue;
    const call = readCall(name, role);
    if (call) calls.push(call);
  }

  if (selected.has('inactivate')) {
    calls.push(statusCall('inactivate'));
    calls.push(statusCall('reactivate'));
  }
  if (selected.has('invite.login')) calls.push(inviteCall());
  if (selected.has('link.contact')) calls.push(linkCall());

  for (const name of input.selected) {
    if (calls.some(call => call.capabilities.includes(name))) continue;
    if (gaps.some(gap => gap.capability === name)) continue;
    gaps.push(knownGap(name));
  }

  const executable = calls.filter(call => !call.alternative);
  return {
    namespace: input.namespace,
    role,
    atomic: executable.length === 1 && gaps.length === 0,
    calls,
    gaps,
  };
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

function platformPatches(paths: readonly string[], capability: string, gaps: D1MdmGap[]): D1MdmArgument[] {
  const args: D1MdmArgument[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const resolved = platformPatchKey(path);
    if ('gap' in resolved) {
      gaps.push({ capability, code: 'MDM_PATCH_UNBOUND', evidence: resolved.gap });
      continue;
    }
    if (seen.has(resolved.key)) continue;
    seen.add(resolved.key);
    args.push({ name: resolved.key, role: 'patch', capability, path });
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
 */
function updateCall(input: MdmBindInput, platform: readonly D1MdmArgument[], gaps: D1MdmGap[]): D1MdmPlannedCall | null {
  const capabilities: string[] = [];
  const args: D1MdmArgument[] = [
    { name: 'mdmId', role: 'selector', path: 'id' },
    { name: 'expectedVersion', role: 'parameter', path: 'version' },
  ];
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
    if (!input.namespace) {
      gaps.push({
        capability: 'edit.moduleNamespace',
        code: 'MDM_UNBOUND',
        evidence: 'edit.moduleNamespace needs the caller module namespace. None is declared.',
      });
    } else {
      args.push({
        name: input.namespace,
        role: 'patch',
        capability: 'edit.moduleNamespace',
        path: `details.${input.namespace}`,
      });
    }
  }
  if (!capabilities.length) return null;
  return {
    method: 'update',
    target: 'entity',
    shape: 'write',
    capabilities,
    alternative: false,
    arguments: args,
    result: ['mdmId', 'version', 'details'],
  };
}

/**
 * New person: find, then create, then attachRole.
 * Existing person: find hits, then attachRole only. create does not add the role tag.
 * create also dedupes a person by document and may return alreadyExists; that is a separate call.
 * Nothing here wraps the sequence in one transaction.
 */
function createOrAttachCalls(input: MdmBindInput, platform: readonly D1MdmArgument[], gaps: D1MdmGap[]): D1MdmPlannedCall[] {
  const capability = 'register.createOrAttach';
  const role = `${input.namespace}.${input.entityId}`;
  const calls: D1MdmPlannedCall[] = [
    {
      method: 'findByDocument',
      target: 'entity',
      shape: 'point',
      capabilities: [capability],
      alternative: false,
      arguments: [
        { name: 'docType', role: 'selector', path: 'details.identification.docType' },
        { name: 'docId', role: 'selector', path: 'details.identification.docId' },
      ],
      result: ['mdmId', 'version', 'details'],
    },
  ];
  if (input.capabilities.includes('locate.byContact')) {
    calls.push({
      method: 'findByContact',
      target: 'entity',
      shape: 'point',
      capabilities: [capability],
      alternative: false,
      arguments: [
        { name: 'contactType', role: 'selector', path: 'contactType' },
        { name: 'value', role: 'selector', path: 'value' },
      ],
      result: ['mdmId', 'version', 'details'],
    });
  }
  if (!platform.length && !gaps.some(gap => gap.capability === capability)) {
    gaps.push({
      capability,
      code: 'MDM_PATCH_UNBOUND',
      evidence: 'register.createOrAttach has no platform field that entity.create can write.',
    });
  }
  calls.push({
    method: 'create',
    target: 'entity',
    shape: 'write',
    capabilities: [capability],
    alternative: false,
    arguments: [...platform],
    result: ['mdmId', 'version', 'alreadyExists'],
  });
  calls.push({
    method: 'attachRole',
    target: 'entity',
    shape: 'write',
    capabilities: [capability],
    alternative: false,
    arguments: [
      { name: 'mdmId', role: 'selector', path: 'id' },
      { name: 'role', role: 'parameter', value: role },
    ],
    result: ['mdmId', 'version'],
  });
  return calls;
}

function readCall(capability: (typeof READ_CAPABILITIES)[number], role: string): D1MdmPlannedCall | null {
  if (capability === 'read.byId') {
    return point('get', capability, [{ name: 'mdmId', role: 'selector', path: 'id' }]);
  }
  if (capability === 'locate.byDocument') {
    return point('findByDocument', capability, [
      { name: 'docType', role: 'selector', path: 'details.identification.docType' },
      { name: 'docId', role: 'selector', path: 'details.identification.docId' },
    ]);
  }
  if (capability === 'locate.byContact') {
    return point('findByContact', capability, [
      { name: 'contactType', role: 'selector', path: 'contactType' },
      { name: 'value', role: 'selector', path: 'value' },
    ]);
  }
  if (capability === 'locate.byName') {
    return {
      method: 'listByType',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      arguments: [
        { name: 'type', role: 'parameter', value: role },
        { name: 'name', role: 'selector', path: 'details.identification.name' },
      ],
      result: ['items', 'page', 'pageSize', 'total'],
    };
  }
  if (capability === 'locate.byTag') {
    return {
      method: 'listByType',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      arguments: [{ name: 'type', role: 'parameter', value: role }],
      result: ['items', 'page', 'pageSize', 'total'],
    };
  }
  if (capability === 'listLinks') {
    return {
      method: 'relatedOfMany',
      target: 'collection',
      shape: 'collection',
      capabilities: [capability],
      alternative: false,
      arguments: [{ name: 'mdmIds', role: 'selector', path: 'id' }],
      result: ['mdmId', 'relationshipId', 'type', 'direction'],
    };
  }
  return null;
}

function point(method: D1MdmCall, capability: string, args: D1MdmArgument[]): D1MdmPlannedCall {
  return {
    method,
    target: 'entity',
    shape: 'point',
    capabilities: [capability],
    alternative: false,
    arguments: args,
    result: ['mdmId', 'version', 'details'],
  };
}

/** The method writes the status. The caller passes the id and the expected version, not a status patch. */
function statusCall(method: 'inactivate' | 'reactivate'): D1MdmPlannedCall {
  return {
    method,
    target: 'entity',
    shape: 'write',
    capabilities: ['inactivate'],
    alternative: true,
    arguments: [
      { name: 'mdmId', role: 'selector', path: 'id' },
      { name: 'expectedVersion', role: 'parameter', path: 'version' },
    ],
    result: ['mdmId', 'version'],
  };
}

function inviteCall(): D1MdmPlannedCall {
  return {
    method: 'invite',
    target: 'identity',
    shape: 'write',
    capabilities: ['invite.login'],
    alternative: false,
    arguments: [
      { name: 'mdmId', role: 'selector', path: 'id' },
      { name: 'email', role: 'parameter', path: 'email' },
      { name: 'moduleId', role: 'parameter', value: 'ctx' },
      { name: 'actorId', role: 'parameter', value: 'ctx' },
    ],
    result: ['token', 'expiresAt'],
  };
}

function linkCall(): D1MdmPlannedCall {
  return {
    method: 'link',
    target: 'entity',
    shape: 'write',
    capabilities: ['link.contact'],
    alternative: false,
    arguments: [
      { name: 'fromId', role: 'selector', path: 'id' },
      { name: 'toId', role: 'selector', path: 'toId' },
      { name: 'type', role: 'parameter', path: 'type' },
    ],
    result: ['id', 'fromId', 'toId', 'type'],
  };
}
