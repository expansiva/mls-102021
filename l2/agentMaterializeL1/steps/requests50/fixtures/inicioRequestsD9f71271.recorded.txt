/// <mls fileReference="_102047_/l1/comandaRestaurante/layer_2_application/requests/inicio.ts" enhancement="_blank"/>
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { InicioContracts } from '/_102047_/l2/comandaRestaurante/web/contracts/inicio.defs.js';
import { listComanda } from '/_102047_/l1/comandaRestaurante/layer_2_application/usecases/listComanda.js';
import { listItemComanda } from '/_102047_/l1/comandaRestaurante/layer_2_application/usecases/listItemComanda.js';
import { listMesa } from '/_102047_/l1/comandaRestaurante/layer_2_application/usecases/listMesa.js';

type ResumoOutput = InicioContracts['comandaRestaurante.inicio.carregarResumoOperacional']['output'];
type Comanda = Awaited<ReturnType<typeof listComanda>>['items'][number];
type ItemComanda = Awaited<ReturnType<typeof listItemComanda>>['items'][number];

const PAGE_SIZE = 200;

function decimalToNumber(value: string | number | undefined): number {
  if (value === undefined) return 0;
  const result = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`Valor monetário inválido: ${String(value)}`);
  }
  return result;
}

async function loadMesas(ctx: RequestContext): Promise<Awaited<ReturnType<typeof listMesa>>['items']> {
  const items: Awaited<ReturnType<typeof listMesa>>['items'] = [];
  let page = 1;
  for (;;) {
    const result = await listMesa({ page, pageSize: PAGE_SIZE }, ctx);
    items.push(...result.items);
    if (!result.hasMore) return items;
    page += 1;
  }
}

async function loadOpenComandas(ctx: RequestContext): Promise<Comanda[]> {
  const items: Comanda[] = [];
  let page = 1;
  for (;;) {
    const result = await listComanda({ status: 'open', page, pageSize: PAGE_SIZE } as unknown as Parameters<typeof listComanda>[0], ctx);
    items.push(...result.items);
    if (!result.hasMore) return items;
    page += 1;
  }
}

async function loadItems(comandaId: string, ctx: RequestContext): Promise<ItemComanda[]> {
  const items: ItemComanda[] = [];
  let page = 1;
  for (;;) {
    const result = await listItemComanda({ comandaId, page, pageSize: PAGE_SIZE }, ctx);
    items.push(...result.items);
    if (!result.hasMore) return items;
    page += 1;
  }
}

/**
 * Finalidade: Carrega os indicadores consolidados que caixa e garçom usam para consultar rapidamente a disponibilidade das mesas e o valor ainda em atendimento.
 * Entrada: Não recebe parâmetros; o resumo considera toda a operação da organização acessível ao ator.
 * Processamento: Lista todas as mesas e as comandas abertas. Uma mesa está disponível quando não possui comanda aberta vinculada. Para cada comanda aberta, lista os itens e calcula seu subtotal pela soma de quantidade vezes preço unitário dos itens não cancelados, aplicando a regra subtotalComandaCalculado.
 * Saída: Retorna somente os indicadores agregados, sem listas de mesas, comandas ou itens.
 */
export const requests: Record<string, (input: Record<string, unknown>, ctx: RequestContext) => Promise<Record<string, unknown>>> = {
  'comandaRestaurante.inicio.carregarResumoOperacional': async function (_input, ctx): Promise<ResumoOutput> {
    const [mesas, comandasAbertas] = await Promise.all([
      loadMesas(ctx),
      loadOpenComandas(ctx),
    ]);

    const mesasComComandaAberta = new Set(comandasAbertas.map((comanda) => comanda.mesaId));
    const mesasDisponiveis = mesas.reduce(
      (total, mesa) => total + (mesasComComandaAberta.has(mesa.id) ? 0 : 1),
      0,
    );

    let valorComandasAbertas = 0;
    for (const comanda of comandasAbertas) {
      const itens = await loadItems(comanda.id, ctx);
      // subtotalComandaCalculado: soma dos valores dos itens não cancelados.
      for (const item of itens) {
        if (item.status !== 'canceled') {
          valorComandasAbertas += decimalToNumber(item.details.precoUnitario) * item.details.quantidade;
        }
      }
    }

    return {
      resumoOperacional: {
        mesasDisponiveis,
        valorComandasAbertas,
      },
    } as ResumoOutput;
  },
};
