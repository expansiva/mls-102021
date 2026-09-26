/// <mls fileReference="_102021_/l1/agentMaterializeL1/proofC6.ts" enhancement="_blank"/>

/**
 * C6 on the lima app: route catalog cases through the real execBff against
 * PostgreSQL. Module cases are out of scope. Restart of app2047 is the
 * persistence check. Rows created here are deleted by this proof's id prefix.
 *
 * Imports the served dist (same AppError as the app). Do not use register-hooks.
 *
 *   cd /data/mls-base/current-102047
 *   env from app2047 + PROJECT_ID=102047
 *   node --import tsx /data/mls-base/mls-102021/l1/agentMaterializeL1/proofC6.ts --evidence <dir>
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const PREFIX = 'm124c6';
const TABLE = 'mls102047_agendaClinica_consulta';
const SLOT = '2099-06-15T10:00:00.000Z';
const RECEPCIONISTA = ['agendaClinica:recepcionista'] as const;

interface CatalogCase {
  caseId: string;
  gate: string;
  routine: string;
  actorId: string;
  runner?: string;
  caller?: { source: 'http'; authorities: string[] };
  preconditions: string[];
  expect: { ok: boolean; status: number; errorCode: string | null };
}

interface ExecResult {
  status: number;
  ok: boolean;
  errorCode: string | null;
  data: unknown;
  reason: string;
}

interface CaseRow {
  caseId: string;
  routine: string;
  gate: string;
  caller: unknown;
  status: number | null;
  errorCode: string | null;
  ok: boolean | null;
  expectStatus: number;
  expectError: string | null;
  matched: boolean;
  reason: string;
}

function parseArgs(argv: string[]): { evidence: string } {
  const evidenceIndex = argv.indexOf('--evidence');
  if (evidenceIndex < 0 || !argv[evidenceIndex + 1]) throw new Error('--evidence is required');
  return { evidence: resolve(argv[evidenceIndex + 1]) };
}

function omittedField(item: CatalogCase): string | null {
  for (const line of item.preconditions) {
    const match = /^(\w+) omitted$/.exec(line);
    if (match) return match[1];
  }
  return null;
}

function paramsFor(item: CatalogCase, extras: Record<string, unknown> = {}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    id: `${PREFIX}-id`,
    pacienteId: `${PREFIX}-pac`,
    profissionalId: `${PREFIX}-pro`,
    scheduledAt: SLOT,
    status: 'scheduled',
    details: { telephoneConfirmation: { confirmedAt: '' } },
    ...extras,
  };
  const omit = omittedField(item);
  if (omit) delete body[omit];
  return body;
}

async function loadApp() {
  const dist = join(process.cwd(), 'dist/local');
  const bff = await import(pathToFileURL(join(dist, '_102034_/l1/server/layer_2_controllers/execBff.js')).href) as {
    execBff: (request: unknown, ctx?: unknown) => Promise<{ response: { ok: boolean; data: unknown; error?: { code?: string; message?: string } | null }; statusCode: number }>;
    createDefaultRequestContext: () => unknown;
  };
  const catalogMod = await import(pathToFileURL(join(dist, '_102047_/l1/agendaClinica/materialization/agentMaterializeL1/scenarioCatalog.js')).href) as {
    scenarioCatalog: { scenarios: Array<{ cases: CatalogCase[] }> };
  };
  return { ...bff, scenarioCatalog: catalogMod.scenarioCatalog };
}

function psql(sql: string): { code: number; stdout: string; stderr: string } {
  const url = process.env.DATABASE_URL_TEST ?? '';
  if (!url) throw new Error('DATABASE_URL_TEST is not set');
  const result = spawnSync('psql', [url, '-At', '-c', sql], { encoding: 'utf8' });
  return { code: result.status ?? 1, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim() };
}

function countPrefix(): number {
  const sql = `SELECT count(*) FROM "${TABLE}" WHERE id LIKE '${PREFIX}%' OR "pacienteId" LIKE '${PREFIX}%' OR "profissionalId" LIKE '${PREFIX}%'`;
  const out = psql(sql);
  if (out.code !== 0) throw new Error(out.stderr || 'count failed');
  return Number(out.stdout || '0');
}

function deletePrefix(): { code: number; stdout: string; stderr: string } {
  return psql(`DELETE FROM "${TABLE}" WHERE id LIKE '${PREFIX}%' OR "pacienteId" LIKE '${PREFIX}%' OR "profissionalId" LIKE '${PREFIX}%' RETURNING id`);
}

function restartApp(): { code: number; stdout: string; stderr: string; argv: string[] } {
  const env = { ...process.env, PM2_HOME: process.env.PM2_HOME || '/home/wagnerpereira.guest/.pm2' };
  const argv = ['restart', 'app2047'];
  const result = spawnSync('pm2', argv, { encoding: 'utf8', env });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '', argv: ['pm2', ...argv] };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(args.evidence, { recursive: true });
  writeFileSync(`${args.evidence}/command.txt`, `${process.argv.join(' ')}\ncwd=${process.cwd()}\nPROJECT_ID=${process.env.PROJECT_ID ?? ''}\nCOLLAB_PROJECT_ID=${process.env.COLLAB_PROJECT_ID ?? ''}\nNODE_ENV=${process.env.NODE_ENV ?? ''}\nPORT=${process.env.PORT ?? ''}\n`);

  const app = await loadApp();
  const call = async (routine: string, params: Record<string, unknown>, source: 'http', authorities: string[], actorId: string): Promise<ExecResult> => {
    const executed = await app.execBff({
      routine,
      params,
      meta: {
        source,
        verifiedAuthorities: authorities,
        verifiedUserId: actorId || undefined,
      },
    }, app.createDefaultRequestContext());
    const response = executed.response;
    return {
      status: executed.statusCode,
      ok: response.ok,
      errorCode: response.error?.code ?? null,
      data: response.data,
      reason: response.error?.message ?? (response.ok ? 'ok' : ''),
    };
  };

  const routeCases = app.scenarioCatalog.scenarios.flatMap(scenario => scenario.cases).filter(item => item.runner === 'route');
  const caseRows: CaseRow[] = [];
  for (const item of routeCases) {
    const caller = item.caller ?? { source: 'http' as const, authorities: [] as string[] };
    const result = await call(item.routine, paramsFor(item), caller.source, caller.authorities, item.actorId);
    const matched = result.status === item.expect.status && result.errorCode === item.expect.errorCode;
    caseRows.push({
      caseId: item.caseId,
      routine: item.routine,
      gate: item.gate,
      caller,
      status: result.status,
      errorCode: result.errorCode,
      ok: result.ok,
      expectStatus: item.expect.status,
      expectError: item.expect.errorCode,
      matched,
      reason: result.reason,
    });
  }

  const before = countPrefix();
  const createParams = {
    pacienteId: `${PREFIX}-pac`,
    profissionalId: `${PREFIX}-pro`,
    scheduledAt: SLOT,
    status: 'scheduled',
    details: { telephoneConfirmation: { confirmedAt: '' } },
  };
  const created = await call('agendaClinica.consultas.cmdCreateConsulta', createParams, 'http', [...RECEPCIONISTA], 'recepcionista');
  const createdId = created.ok && created.data && typeof created.data === 'object' && 'id' in created.data
    ? String((created.data as { id: unknown }).id)
    : '';
  const listed = await call('agendaClinica.consultas.qryListConsulta', {
    id: createdId || `${PREFIX}-id`,
    ...createParams,
  }, 'http', [...RECEPCIONISTA], 'recepcionista');
  const duplicate = await call('agendaClinica.consultas.cmdCreateConsulta', createParams, 'http', [...RECEPCIONISTA], 'recepcionista');
  const afterCreate = countPrefix();
  const restart = restartApp();
  const afterRestart = countPrefix();
  const listedAfter = await call('agendaClinica.consultas.qryListConsulta', {
    id: createdId || `${PREFIX}-id`,
    ...createParams,
  }, 'http', [...RECEPCIONISTA], 'recepcionista');
  const denied = await call('agendaClinica.consultas.cmdCreateConsulta', createParams, 'http', [], '');
  const cleanup = deletePrefix();
  const leftover = countPrefix();

  const persistence = {
    before,
    afterCreate,
    afterRestart,
    leftover,
    created,
    createdId,
    listed,
    duplicate,
    listedAfter,
    denied,
    restart: { code: restart.code, argv: restart.argv, stdout: restart.stdout, stderr: restart.stderr },
    cleanup: { code: cleanup.code, stdout: cleanup.stdout, stderr: cleanup.stderr },
    postgresHadRow: afterCreate > before,
    survivedRestart: afterRestart === afterCreate && afterCreate > before,
    duplicate409: duplicate.status === 409,
    access403: denied.status === 403,
    cleaned: leftover === 0,
  };

  writeFileSync(`${args.evidence}/cases.json`, `${JSON.stringify({ routeCount: routeCases.length, cases: caseRows }, null, 2)}\n`);
  writeFileSync(`${args.evidence}/persistence.json`, `${JSON.stringify(persistence, null, 2)}\n`);
  writeFileSync(`${args.evidence}/counts.json`, `${JSON.stringify({ before, afterCreate, afterRestart, leftover }, null, 2)}\n`);
  writeFileSync(`${args.evidence}/restart.txt`, `argv: ${restart.argv.join(' ')}\ncode: ${restart.code}\n--- stdout ---\n${restart.stdout}\n--- stderr ---\n${restart.stderr}\n`);

  const catalogPassed = caseRows.filter(row => row.matched).length;
  writeFileSync(`${args.evidence}/summary.md`, [
    '# m1_24 C6 evidence',
    '',
    `route cases: ${routeCases.length}`,
    `catalog matched: ${catalogPassed}/${caseRows.length}`,
    `create status: ${created.status} code=${created.errorCode} id=${createdId}`,
    `list status: ${listed.status}`,
    `duplicate status: ${duplicate.status} code=${duplicate.errorCode}`,
    `postgres before/afterCreate/afterRestart/leftover: ${before}/${afterCreate}/${afterRestart}/${leftover}`,
    `survivedRestart: ${persistence.survivedRestart}`,
    `access without authority: ${denied.status} ${denied.errorCode}`,
    `pm2 restart code: ${restart.code}`,
    `cleaned: ${persistence.cleaned}`,
    '',
  ].join('\n'));

  const failed = [
    catalogPassed !== caseRows.length ? 'catalog' : '',
    created.status !== 200 ? 'create' : '',
    listed.status !== 200 ? 'list' : '',
    duplicate.status !== 409 ? 'duplicate' : '',
    denied.status !== 403 ? 'auth' : '',
    leftover !== 0 ? 'cleanup' : '',
  ].filter(Boolean);
  if (failed.length) {
    console.error(`proofC6 failed: ${failed.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log(`proofC6: ${catalogPassed}/${caseRows.length} catalog, create ${created.status}, duplicate ${duplicate.status}, pg ${before}->${afterCreate}->${afterRestart}->${leftover}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
