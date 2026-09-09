/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbMdmL4.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CB_ONTOLOGY_SCHEMA_V7, CB_SCAN_ID_FIELD_REQUIRED,
  ontologyDefsVersion, readOntologyEntity, readOntologyRelationships, fkFieldIdsForEntity,
} from './cbDefsSource.js';
import { mdmWriteFromL4 } from '/_102021_/l2/agentChangeBackend/steps/gen-usecase/usecaseOwnerItem.js';
import { MDM_SEED_COUNTRY_CODE, MDM_SEED_COUNTRY_CODE_ORIGIN } from './cbSeedsCore.js';

const v7Cliente = {
  schemaVersion: CB_ONTOLOGY_SCHEMA_V7,
  entityId: 'Cliente',
  kind: 'mdm',
  ownership: 'moduleOwned',
  mdmSubtype: 'Person',
  role: 'ordenServicio.Cliente',
  displayField: 'name',
  fields: [
    { fieldId: 'clienteId', type: 'uuid', required: true },
    { fieldId: 'loyaltyTier', type: 'string', required: false },
  ],
  storage: { target: 'mdm', scope: 'organization', idField: 'clienteId', mdmType: 'ordenServicio.Cliente' },
};

const v7Fornecedor = {
  schemaVersion: CB_ONTOLOGY_SCHEMA_V7,
  entityId: 'Fornecedor',
  kind: 'mdm',
  mdmSubtype: 'Company',
  role: 'ordenServicio.Fornecedor',
  displayField: 'name',
  storage: { target: 'mdm', scope: 'organization', idField: 'fornecedorId', mdmType: 'ordenServicio.Fornecedor' },
  fields: [{ fieldId: 'fornecedorId', type: 'uuid', required: true }, { fieldId: 'leadTimeDays', type: 'integer', required: false }],
};

const v7Produto = {
  schemaVersion: CB_ONTOLOGY_SCHEMA_V7,
  entityId: 'Produto',
  kind: 'mdm',
  mdmSubtype: 'Product',
  role: 'ordenServicio.Produto',
  displayField: 'name',
  storage: { target: 'mdm', scope: 'organization', idField: 'produtoId', mdmType: 'ordenServicio.Produto' },
  fields: [{ fieldId: 'produtoId', type: 'uuid', required: true }, { fieldId: 'reorderPoint', type: 'number', required: false }],
};

test('v7 ontology reader transcribes mdmSubtype, role, displayField, idField', () => {
  const read = readOntologyEntity(v7Cliente);
  assert.equal(read.defsVersion, 7);
  assert.equal(ontologyDefsVersion(v7Cliente), 7);
  assert.equal(read.mdmSubtype, 'Person');
  assert.equal(read.role, 'ordenServicio.Cliente');
  assert.equal(read.displayField, 'name');
  assert.equal(read.storage.idField, 'clienteId');
  assert.equal(read.scanError, undefined);
});

test('v6 ontology stays readable without mdmSubtype and without an idField scan error', () => {
  const v6 = {
    schemaVersion: '2026-08-11-ns4-ontology-v6',
    entityId: 'Client',
    kind: 'mdm',
    storage: { target: 'mdm', scope: 'organization', mdmType: 'buildFlowFsm.Client' },
  };
  const read = readOntologyEntity(v6);
  assert.equal(read.defsVersion, 6);
  assert.equal(read.mdmSubtype, '');
  assert.equal(read.role, 'buildFlowFsm.Client');
  assert.equal(read.storage.idField, '');
  assert.equal(read.scanError, undefined);
});

test('v7 entity without storage.idField is a named scan error, never a name fallback', () => {
  const missing = {
    schemaVersion: CB_ONTOLOGY_SCHEMA_V7,
    entityId: 'Cliente',
    mdmSubtype: 'Person',
    storage: { target: 'mdm', scope: 'organization', mdmType: 'ordenServicio.Cliente' },
  };
  const read = readOntologyEntity(missing);
  assert.equal(read.scanError?.code, CB_SCAN_ID_FIELD_REQUIRED);
  assert.match(read.scanError?.message || '', /CB_SCAN_ID_FIELD_REQUIRED/);
  assert.match(read.scanError?.message || '', /Cliente/);
  assert.equal(read.storage.idField, '');
});

test('relationships[] are the FK source (realization.fieldIds)', () => {
  const index = {
    relationships: [{
      fromEntity: 'OrdenServicio',
      toEntity: 'Cliente',
      type: 'manyToOne',
      persistence: { mode: 'moduleReference' },
      realization: {
        kind: 'fieldReference',
        from: { entityId: 'OrdenServicio', fieldIds: ['clienteId'] },
        to: { entityId: 'Cliente', fieldIds: ['clienteId'] },
      },
    }],
  };
  const rels = readOntologyRelationships(index);
  assert.equal(rels.length, 1);
  assert.deepEqual(rels[0].fromFieldIds, ['clienteId']);
  assert.deepEqual(fkFieldIdsForEntity('OrdenServicio', rels), new Set(['clienteId']));
  assert.deepEqual(fkFieldIdsForEntity('Cliente', rels), new Set(['clienteId']));
  assert.equal(fkFieldIdsForEntity('Produto', rels).size, 0);
});

test('mdmWrites for Cliente/Person, Fornecedor/Company, Produto/Product transcribe the l4', () => {
  const ownerInputs = [
    { inputId: 'name', fieldRef: 'Person.name', type: 'string', required: true, source: 'userInput', description: '' },
    { inputId: 'docId', fieldRef: 'Person.docId', type: 'string', required: false, source: 'userInput', description: '' },
    { inputId: 'loyaltyTier', fieldRef: 'Cliente.loyaltyTier', type: 'string', required: false, source: 'userInput', description: '' },
  ];
  const cliente = mdmWriteFromL4({
    entityId: 'Cliente', title: 'Client', kind: 'mdm', ownership: 'moduleOwned', moduleName: 'ordenServicio',
    mdmType: 'ordenServicio.Cliente', role: 'ordenServicio.Cliente', mdmSubtype: 'Person',
    idField: 'clienteId', displayField: 'name', defsVersion: 7,
    fields: v7Cliente.fields,
  }, { inputs: ownerInputs });
  assert.deepEqual(cliente, {
    entityId: 'Cliente',
    mdmType: 'ordenServicio.Cliente',
    subtype: 'Person',
    idField: 'clienteId',
    baseFields: ['name', 'docId'],
    namespaceFields: ['loyaltyTier'],
  });

  const fornecedor = mdmWriteFromL4({
    entityId: 'Fornecedor', title: 'Supplier', kind: 'mdm', ownership: 'moduleOwned', moduleName: 'ordenServicio',
    mdmType: 'ordenServicio.Fornecedor', role: 'ordenServicio.Fornecedor', mdmSubtype: 'Company',
    idField: 'fornecedorId', defsVersion: 7, fields: v7Fornecedor.fields,
  }, { inputs: [{ inputId: 'legalName', fieldRef: 'Company.legalName', type: 'string', required: true, source: 'userInput', description: '' }] });
  assert.equal(fornecedor.subtype, 'Company');
  assert.deepEqual(fornecedor.baseFields, ['legalName']);
  assert.deepEqual(fornecedor.namespaceFields, ['leadTimeDays']);

  const produto = mdmWriteFromL4({
    entityId: 'Produto', title: 'Product', kind: 'mdm', ownership: 'moduleOwned', moduleName: 'ordenServicio',
    mdmType: 'ordenServicio.Produto', role: 'ordenServicio.Produto', mdmSubtype: 'Product',
    idField: 'produtoId', defsVersion: 7, fields: v7Produto.fields,
  }, { inputs: [] });
  assert.equal(produto.subtype, 'Product');
  assert.deepEqual(produto.baseFields, []);
  assert.deepEqual(produto.namespaceFields, ['reorderPoint']);
});

test('seed country code is the level-1 default, never derived from language', () => {
  assert.equal(MDM_SEED_COUNTRY_CODE, 'US');
  assert.equal(MDM_SEED_COUNTRY_CODE_ORIGIN, 'level1-subtype-default');
});
