/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/arrivalInput.ts" enhancement="_blank"/>

// d1_289: the message an arrival carries, read from the catalog of its connection: the operation, the type of its input and the catalog types that type names
// (the module catalog, the action: three levels down at most). One reader for the function of a process that receives the arrival (workflows45, d1_282) and for the
// monitor cases of the page that serves it (tests60), so both see the same shape.

import { catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { connectionCatalogSource, type CatalogRead } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { answerTypeNames, catalogTypeBody } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

export interface ArrivalInput {
  arrival: string;
  connectionId: string;
  operationId: string;
  /** The catalog type of the input of the arrival (`PlatformReleaseCatalogChangedInput`). */
  inputType: string;
  /** What generated code imports the catalog types from. */
  importPath: string;
  /** The body of the input type on one line, `{ releaseId: string; … }`; '' when the catalog does not declare it or it is long. */
  inputBody: string;
  /** The input type and the catalog types it names, each as `` `Name` is `{ … }` ``. */
  shapes: string[];
}

/** The input of an arrival `<connectionId>.<operationId>`; null when the catalog or the operation is not readable, or the operation is a call. */
export async function arrivalInputOf(read: CatalogRead, project: number, moduleName: string, arrival: string): Promise<ArrivalInput | null> {
  const dot = arrival.indexOf('.');
  if (dot <= 0) return null;
  const connectionId = arrival.slice(0, dot);
  const operationId = arrival.slice(dot + 1);
  const catalog = await connectionCatalogSource(read, project, moduleName, connectionId);
  const operation = catalog.source ? catalogOperations(catalog.source)?.find(item => item.operationId === operationId && item.direction !== 'call') : undefined;
  if (!catalog.source || !operation) return null;
  const shapes = [operation.inputType, ...answerTypeNames(catalog.source, operation.inputType, 3)].flatMap(name => {
    const body = catalogTypeBody(catalog.source, name);
    return body ? [`\`${name}\` is \`${body}\``] : [];
  });
  return { arrival, connectionId, operationId, inputType: operation.inputType, importPath: catalog.importPath, inputBody: catalogTypeBody(catalog.source, operation.inputType), shapes };
}
