/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/fixtures/v1Contracts.ts" enhancement="_blank"/>

import type { D1ContractSource, D1ControllerRoute } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

/** One contract file per page. listConsulta is two shapes. A wide unused interface is not a binding. */
export function contractSources(moduleName: string, routes: readonly D1ControllerRoute[]): D1ContractSource[] {
  const byPage = new Map<string, D1ControllerRoute[]>();
  for (const route of routes) {
    const list = byPage.get(route.page) || [];
    list.push(route);
    byPage.set(route.page, list);
  }
  return [...byPage.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([pageId, pageRoutes]) => {
    const types: string[] = [
      'export interface ListConsultaOutput { id: string; status: string; attendanceNote: string; }',
    ];
    const entries: string[] = [];
    pageRoutes.forEach((route, index) => {
      const name = `Out${index}`;
      const body = outputBody(route);
      const list = route.kind === 'qry' || route.kind === 'query';
      types.push(list ? `export type ${name} = ${body}[];` : `export interface ${name} ${body}`);
      entries.push(`"${route.route}": { output: "${name}" }`);
    });
    const source = `${types.join('\n')}\nexport const routes = { ${entries.join(', ')} } as const;\n`;
    return {
      pageId,
      path: `l2/${moduleName}/web/contracts/${pageId}.defs.ts`,
      source,
    };
  });
}

/** Type assertion instead of an input/output symbol. Not a projection. */
export const V1_ASSERTION_CONTRACT = `
    export interface Wide { id: string; attendanceNote: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": value as Wide } as const;
  `;

/** A form field named actorId is not the session. */
export const V1_FORM_CONTRACT = `
    export interface In { actorId: string; }
    export interface Out { id: string; }
    export const routes = { "agendaClinica.agenda.qryListConsulta": { input: "In", output: "Out" } } as const;
  `;

function outputBody(route: D1ControllerRoute): string {
  if (route.usecaseRef === 'listConsulta' && route.page === 'agenda') {
    return '{ id: string; status: string; attendanceNote: string }';
  }
  if (route.usecaseRef === 'listConsulta') return '{ id: string; status: string }';
  return '{ id: string }';
}
