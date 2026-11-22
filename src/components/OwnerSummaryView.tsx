import React, { useEffect, useMemo, useState } from 'react';
import {
  getBarOpsData,
  getDeliveryConfig,
  isDeliveryOrder,
  parseDeliveryOrderMeta,
} from '../lib/opsUtils';
import {
  estimateRecipeCost,
  getRecipeItemType,
  getUnpricedAvailableDrinks,
  money,
  norm,
  type UiThemeMode,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  Order,
  PaymentMethod,
  Recipe,
  TableCallAlert,
  TableTab,
} from '../types/meubar';

type SummaryPeriod = 'today' | '7d' | 'month' | 'all';

interface OwnerSummaryViewProps {
  bar: Bar;
  orders: Order[];
  recipes: Recipe[];
  items: BarItem[];
  prices: Record<string, number>;
  tableTabs: TableTab[];
  tableCalls: TableCallAlert[];
  hasPricing: boolean;
  uiThemeMode: UiThemeMode;
  onToggleTheme: () => void;
  onRefresh: () => Promise<void>;
  onGoQueue: (station?: 'all' | 'bar' | 'cozinha' | 'garcom') => void;
  onGoCashier: () => void;
  onGoDelivery: () => void;
  onGoStock: () => void;
  onGoPrices: () => void;
  onGoReports: () => void;
  onOpenQr: () => void;
}

const PAY_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  credito: 'Cartão Crédito',
  debito: 'Cartão Débito',
  dinheiro: 'Dinheiro',
  misto: 'Misto',
};

function isDateInPeriod(iso: string | undefined, period: SummaryPeriod): boolean {
  if (period === 'all') return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (period === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (period === '7d') {
    return now.getTime() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
  }
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export const OwnerSummaryView: React.FC<OwnerSummaryViewProps> = ({
  bar,
  orders,
  recipes,
  items,
  prices,
  tableTabs,
  tableCalls,
  hasPricing,
  uiThemeMode,
  onToggleTheme,
  onRefresh,
  onGoQueue,
  onGoCashier,
  onGoDelivery,
  onGoStock,
  onGoPrices,
  onGoReports,
  onOpenQr,
}) => {
  const [period, setPeriod] = useState<SummaryPeriod>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [activeBlockModal, setActiveBlockModal] = useState<
    null | 'revenue' | 'profit' | 'tickets' | 'channels' | 'topItems' | 'payments' | 'alerts'
  >(null);

  useEffect(() => {
    if (!activeBlockModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveBlockModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeBlockModal]);

  const ops = useMemo(() => getBarOpsData(bar), [bar]);
  const deliveryCfg = useMemo(() => getDeliveryConfig(bar), [bar]);

  const { recipeById, recipeByName } = useMemo(() => {
    const byId = new Map<string, Recipe>();
    const byName = new Map<string, Recipe>();
    recipes.forEach((r) => {
      byId.set(r.id, r);
      const k = norm(r.name);
      if (k && !byName.has(k)) byName.set(k, r);
    });
    return { recipeById: byId, recipeByName: byName };
  }, [recipes]);

  const metrics = useMemo(() => {
    const allShifts = ops.cash_shifts || [];
    const shiftSales = allShifts.flatMap((sh) => sh.sales || []);
    const periodShiftSales = shiftSales.filter((s) => isDateInPeriod(s.paid_at, period));
    const settledOrderIds = new Set<string>();
    periodShiftSales.forEach((s) => (s.order_ids || []).forEach((id) => settledOrderIds.add(id)));

    const periodOrders = orders.filter((o) => isDateInPeriod(o.created_at, period));

    let realizedRevenue = 0;
    let realizedCmv = 0;
    let realizedTickets = 0;
    let openRevenue = 0;
    let openOrdersCount = 0;
    let salonRevenue = 0;
    let deliveryRevenue = 0;

    const paymentTotals: Record<string, number> = {
      pix: 0,
      credito: 0,
      debito: 0,
      dinheiro: 0,
    };

    const itemMap = new Map<
      string,
      { name: string; qty: number; revenue: number; type: string }
    >();

    const addItemStat = (name: string, qty: number, rev: number, typeLabel: string) => {
      const cleanName = (name || 'Item').trim();
      const key = norm(cleanName) || cleanName;
      const cur = itemMap.get(key);
      if (cur) {
        cur.qty += qty;
        cur.revenue += rev;
      } else {
        itemMap.set(key, { name: cleanName, qty, revenue: rev, type: typeLabel });
      }
    };

    // 1. Vendas fechadas no Caixa (fonte mais precisa de pagamento e CMV)
    periodShiftSales.forEach((sale) => {
      const total = Number(sale.total || 0);
      realizedRevenue += total;
      realizedCmv += Number(sale.cmv_total || 0);
      realizedTickets += 1;

      const isDlvSale =
        /delivery|retirada/i.test(sale.tab_label || '') ||
        /^#/.test((sale.tab_label || '').trim());
      if (isDlvSale) deliveryRevenue += total;
      else salonRevenue += total;

      if (sale.payment_method === 'misto' && Array.isArray(sale.splits)) {
        sale.splits.forEach((sp) => {
          paymentTotals[sp.method] = (paymentTotals[sp.method] || 0) + Number(sp.amount || 0);
        });
      } else if (sale.payment_method && sale.payment_method !== 'misto') {
        paymentTotals[sale.payment_method] =
          (paymentTotals[sale.payment_method] || 0) + total;
      }

      (sale.items_summary || []).forEach((it) => {
        const typeLabel =
          it.item_type === 'petisco'
            ? 'Petisco'
            : it.item_type === 'avulso'
              ? 'Bebida avulsa'
              : 'Drink';
        addItemStat(it.name, Number(it.qty || 1), Number(it.total || 0), typeLabel);
      });
    });

    // 2. Pedidos diretos da tabela orders (pagos fora de turno ou em andamento agora)
    periodOrders.forEach((o) => {
      const rec = recipeById.get(o.recipe_id) || recipeByName.get(norm(o.recipe_name || ''));
      const qty = Math.max(1, Number(o.qty || 1));
      const unitPrice = Number(
        o.unit_price ?? o.price ?? (rec ? prices[rec.id] : 0) ?? 0
      );
      const lineTotal = unitPrice * qty;
      const isDlv = isDeliveryOrder(o);

      if (settledOrderIds.has(o.id)) {
        return; // já contabilizado na venda de caixa
      }

      if (o.paid) {
        realizedRevenue += lineTotal;
        realizedTickets += 1;
        if (rec) {
          realizedCmv += estimateRecipeCost(rec, items, bar) * qty;
        }
        if (isDlv) deliveryRevenue += lineTotal;
        else salonRevenue += lineTotal;

        const pm = (o.payment_method || 'pix') as string;
        if (pm in paymentTotals) {
          paymentTotals[pm] += lineTotal;
        }
      } else {
        openRevenue += lineTotal;
        openOrdersCount += 1;
        if (isDlv) deliveryRevenue += lineTotal;
        else salonRevenue += lineTotal;
      }

      const itemType = rec ? getRecipeItemType(rec) : 'drink';
      const typeLabel =
        itemType === 'petisco'
          ? 'Petisco'
          : itemType === 'avulso'
            ? 'Bebida avulsa'
            : 'Drink';
      addItemStat(o.recipe_name || rec?.name || 'Item', qty, lineTotal, typeLabel);
    });

    const totalProjected = realizedRevenue + openRevenue;
    const estimatedProfit = Math.max(0, realizedRevenue - realizedCmv);
    const marginPct =
      realizedRevenue > 0 ? Math.round((estimatedProfit / realizedRevenue) * 100) : 0;
    const totalTickets = realizedTickets + openOrdersCount;
    const avgTicket = totalTickets > 0 ? totalProjected / totalTickets : 0;

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
      .slice(0, 8);

    const activeQueue = orders.filter((o) => o.status !== 'done');
    const pendingBar = activeQueue.filter((o) => {
      const rec = recipeById.get(o.recipe_id) || recipeByName.get(norm(o.recipe_name || ''));
      const st = o.station || (rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar');
      return st === 'bar' && o.status === 'pending';
    }).length;
    const pendingKitchen = activeQueue.filter((o) => {
      const rec = recipeById.get(o.recipe_id) || recipeByName.get(norm(o.recipe_name || ''));
      const st = o.station || (rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar');
      return st === 'cozinha' && o.status === 'pending';
    }).length;
    const readyToServe = activeQueue.filter((o) => o.status === 'ready').length;
    const activeDeliveryCodes = new Set(
      activeQueue.map((o) => parseDeliveryOrderMeta(o)?.code).filter(Boolean)
    ).size;

    const lowStockItems = items.filter(
      (i) =>
        (!i.bar_id || i.bar_id === bar.id) &&
        (!i.in_stock ||
          (Number(i.min_qty || 0) > 0 && Number(i.qty || 0) <= Number(i.min_qty || 0)))
    );

    const unpricedDrinks = hasPricing
      ? getUnpricedAvailableDrinks(recipes, items, prices, bar)
      : [];

    const openShift = allShifts.find((s) => s.status === 'open') || null;

    return {
      realizedRevenue,
      openRevenue,
      totalProjected,
      realizedCmv,
      estimatedProfit,
      marginPct,
      totalTickets,
      avgTicket,
      salonRevenue,
      deliveryRevenue,
      paymentTotals,
      topItems,
      activeQueueCount: activeQueue.length,
      pendingBar,
      pendingKitchen,
      readyToServe,
      activeDeliveryCodes,
      lowStockItems,
      unpricedDrinks,
      openShift,
    };
  }, [ops, orders, period, recipeById, recipeByName, prices, items, bar, recipes, hasPricing]);

  const maxTopQty = metrics.topItems[0]?.qty || 1;
  const totalPaySum = Object.values(metrics.paymentTotals).reduce((a, b) => a + b, 0);
  const channelTotal = metrics.salonRevenue + metrics.deliveryRevenue;
  const salonPct = channelTotal > 0 ? Math.round((metrics.salonRevenue / channelTotal) * 100) : 100;
  const deliveryPct = channelTotal > 0 ? 100 - salonPct : 0;

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho executivo */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="!m-0">Resumo em tempo real</h1>
          <p className="mu !mt-0.5">
            {bar.name} ·{' '}
            {metrics.openShift
              ? `Caixa aberto por ${metrics.openShift.opened_by}`
              : 'Caixa fechado agora'}{' '}
            · Atualiza a cada 5s
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--s1)] border border-[var(--bd)]">
            {(
              [
                ['today', 'Hoje'],
                ['7d', '7 dias'],
                ['month', 'Mês'],
                ['all', 'Tudo'],
              ] as [SummaryPeriod, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors whitespace-nowrap ${
                  period === id
                    ? 'bg-[var(--ac)] text-[var(--on-ac)]'
                    : 'bg-transparent text-[var(--mu)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="b g sm whitespace-nowrap"
            onClick={onToggleTheme}
            title="Alternar entre modo diurno e modo noturno"
          >
            {uiThemeMode === 'dark' ? '☀️ Diurno' : '🌙 Noturno'}
          </button>

          <button
            type="button"
            className="b g sm whitespace-nowrap"
            disabled={refreshing}
            onClick={() => void handleManualRefresh()}
          >
            {refreshing ? 'Atualizando...' : '↻ Atualizar'}
          </button>
        </div>
      </div>

      {/* Faixa principal de 4 Blocos Clicáveis (ao clicar abre modal completo e fecha o anterior) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveBlockModal('revenue')}
          className="panel !mt-0 !p-4 text-left flex flex-col justify-between cursor-pointer hover:border-[var(--ok)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">💰 Faturamento</div>
          <div className="text-2xl font-extrabold tabular-nums mt-1.5 text-[var(--ok)]">
            {money(metrics.realizedRevenue)}
          </div>
          <div className="text-xs text-[var(--mu)] mt-1.5 tabular-nums">
            Em aberto: <strong className="text-[var(--tx)]">{money(metrics.openRevenue)}</strong> · Ver →
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveBlockModal('profit')}
          className="panel !mt-0 !p-4 text-left flex flex-col justify-between cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">📈 Lucro estimado</div>
          <div className="text-2xl font-extrabold tabular-nums mt-1.5 text-[var(--tx)]">
            {money(metrics.estimatedProfit)}
          </div>
          <div className="text-xs text-[var(--mu)] mt-1.5 tabular-nums">
            Margem <strong className="text-[var(--ok)]">{metrics.marginPct}%</strong> · Detalhes →
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveBlockModal('tickets')}
          className="panel !mt-0 !p-4 text-left flex flex-col justify-between cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🧾 Pedidos & ticket</div>
          <div className="text-2xl font-extrabold tabular-nums mt-1.5 text-[var(--tx)]">
            {metrics.totalTickets}
          </div>
          <div className="text-xs text-[var(--mu)] mt-1.5 tabular-nums">
            Média <strong className="text-[var(--tx)]">{money(metrics.avgTicket)}</strong> · Detalhes →
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveBlockModal('channels')}
          className="panel !mt-0 !p-4 text-left flex flex-col justify-between cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🏪 Salão vs Delivery</div>
          <div className="text-2xl font-extrabold tabular-nums mt-1.5 text-[var(--ac)]">
            {money(metrics.totalProjected)}
          </div>
          <div className="text-xs text-[var(--mu)] mt-1.5 tabular-nums">
            Salão {salonPct}% · Delivery {deliveryPct}% →
          </div>
        </button>
      </div>

      {/* Operação ao vivo agora (cliques diretos para agir) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => onGoQueue('bar')}
          className="panel !mt-0 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🍸 Fila do Barman</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-[var(--tx)]">
            {metrics.pendingBar}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">em preparo agora</div>
        </button>

        <button
          type="button"
          onClick={() => onGoQueue('cozinha')}
          className="panel !mt-0 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🍳 Cozinha (KDS)</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-[var(--tx)]">
            {metrics.pendingKitchen}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">petiscos pendentes</div>
        </button>

        <button
          type="button"
          onClick={() => onGoQueue('garcom')}
          className="panel !mt-0 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🪑 Mesas & Garçom</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-[var(--tx)]">
            {tableTabs.length}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {metrics.readyToServe} pronto(s) · {tableCalls.length} chamado(s)
          </div>
        </button>

        <button
          type="button"
          onClick={onGoDelivery}
          className="panel !mt-0 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
        >
          <div className="text-sm font-semibold text-[var(--mu)]">🛵 Delivery 0%</div>
          <div className="text-2xl font-bold tabular-nums mt-1 text-[var(--tx)]">
            {metrics.activeDeliveryCodes}
          </div>
          <div className="text-xs text-[var(--mu)] mt-0.5">
            {deliveryCfg.enabled ? 'Recebendo pedidos' : 'Delivery pausado'}
          </div>
        </button>
      </div>

      {/* Duas colunas: Top Mais Vendidos + Pagamentos & Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ranking de Itens Mais Vendidos */}
        <section className="panel !mt-0 lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="!m-0">Itens mais vendidos</h2>
              <p className="mu text-xs !mt-0.5 !mb-0">
                Ranking atualizado automaticamente conforme os pedidos entram e fecham.
              </p>
            </div>
            <button type="button" className="b g sm shrink-0" onClick={onGoReports}>
              Ver relatório completo
            </button>
          </div>

          {metrics.topItems.length === 0 ? (
            <div className="py-8 text-center space-y-2.5 border-t border-[var(--bd)]">
              <p className="mu !m-0">
                Nenhuma venda registrada neste período ainda. Assim que chegarem pedidos nas mesas,
                balcão ou delivery, o ranking aparece aqui na hora.
              </p>
              <div className="flex justify-center gap-2 flex-wrap pt-1">
                <button type="button" className="b sm" onClick={onOpenQr}>
                  📱 Abrir QR do cardápio
                </button>
                <button type="button" className="b g sm" onClick={() => onGoQueue('garcom')}>
                  ➕ Lançar pedido agora
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--bd)]">
              {metrics.topItems.map((it, idx) => {
                const widthPct = Math.max(8, Math.round((it.qty / maxTopQty) * 100));
                return (
                  <div key={it.name} className="py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-bold tabular-nums text-[var(--ac)] mr-2">
                          {String(idx + 1).padStart(2, '0')}.
                        </span>
                        <span className="font-semibold text-sm text-[var(--tx)]">{it.name}</span>
                        <span className="text-xs text-[var(--mu)] ml-2">· {it.type}</span>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <span className="text-sm font-bold text-[var(--tx)]">{it.qty}×</span>
                        <span className="text-xs text-[var(--ok)] font-semibold ml-2">
                          {money(it.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--s2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--ac)]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Formas de pagamento + Alertas operacionais */}
        <div className="lg:col-span-5 space-y-4">
          <section className="panel !mt-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="!m-0">Entradas por pagamento</h2>
              <button type="button" className="b g sm" onClick={onGoCashier}>
                Abrir Caixa
              </button>
            </div>

            {totalPaySum <= 0 ? (
              <p className="mu text-xs !m-0">
                Nenhuma conta fechada neste período ainda. Feche mesas no Caixa para acompanhar Pix,
                cartão e dinheiro em tempo real.
              </p>
            ) : (
              <div className="space-y-2.5">
                {(['pix', 'credito', 'debito', 'dinheiro'] as const).map((method) => {
                  const val = metrics.paymentTotals[method] || 0;
                  const pct = totalPaySum > 0 ? Math.round((val / totalPaySum) * 100) : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs tabular-nums">
                        <span className="font-medium text-[var(--tx)]">{PAY_LABELS[method]}</span>
                        <span className="text-[var(--mu)]">
                          <strong className="text-[var(--tx)]">{money(val)}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--s2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--ok)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Alertas que exigem atenção do dono */}
          <section className="panel !mt-0 space-y-2.5">
            <h2 className="!m-0">Atenção rápida</h2>

            {metrics.lowStockItems.length === 0 && metrics.unpricedDrinks.length === 0 ? (
              <p className="mu text-xs !m-0">
                Tudo certo no estoque e na precificação do seu cardápio agora.
              </p>
            ) : (
              <div className="space-y-2">
                {metrics.lowStockItems.length > 0 && (
                  <div className="flex items-center justify-between gap-2 py-2 border-b border-[var(--bd)]">
                    <div className="text-xs">
                      <strong className="text-[var(--tx)]">
                        {metrics.lowStockItems.length} item(ns) em falta ou estoque baixo
                      </strong>
                      <div className="text-[var(--mu)] mt-0.5">
                        {metrics.lowStockItems
                          .slice(0, 3)
                          .map((i) => i.name)
                          .join(', ')}
                        {metrics.lowStockItems.length > 3 ? '…' : ''}
                      </div>
                    </div>
                    <button type="button" className="b g sm shrink-0" onClick={onGoStock}>
                      Ver estoque
                    </button>
                  </div>
                )}

                {metrics.unpricedDrinks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 py-1">
                    <div className="text-xs">
                      <strong className="text-[var(--tx)]">
                        {metrics.unpricedDrinks.length} drink(s) sem preço definido
                      </strong>
                      <div className="text-[var(--mu)] mt-0.5">
                        Já têm ingredientes mas aguardam preço para aparecer no cardápio.
                      </div>
                    </div>
                    <button type="button" className="b sm shrink-0" onClick={onGoPrices}>
                      Precificar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--bd)] flex flex-wrap gap-2">
              <button type="button" className="b sm" onClick={onGoCashier}>
                💵 Caixa
              </button>
              <button type="button" className="b g sm" onClick={onOpenQr}>
                📱 QR Cardápio
              </button>
              <button type="button" className="b g sm" onClick={onGoReports}>
                📊 Relatórios & CSV
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL EXCLUSIVO DE DETALHES DO BLOCO (clicar em outro fecha o antigo; clicar fora fecha todos) */}
      {activeBlockModal && (
        <div className="ov" onClick={() => setActiveBlockModal(null)}>
          <div
            className="modal !max-w-lg !w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--bd)]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                  📊 Detalhamento do Bloco
                </span>
                <h3 className="!m-0 text-xl font-extrabold mt-0.5">
                  {activeBlockModal === 'revenue'
                    ? '💰 Faturamento & Pagamentos'
                    : activeBlockModal === 'profit'
                      ? '📈 Lucro Líquido & CMV'
                      : activeBlockModal === 'tickets'
                        ? '🧾 Pedidos & Ticket Médio'
                        : '🏪 Salão vs Delivery'}
                </h3>
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={() => setActiveBlockModal(null)}
              >
                ✕ Fechar
              </button>
            </div>

            {/* Navegação rápida entre os blocos fechando automaticamente o anterior */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['revenue', '💰 Faturamento'],
                  ['profit', '📈 Lucro'],
                  ['tickets', '🧾 Pedidos'],
                  ['channels', '🏪 Canais'],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${activeBlockModal === id ? 'on' : ''}`}
                  onClick={() => setActiveBlockModal(id)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {activeBlockModal === 'revenue' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Já recebido</div>
                    <div className="text-xl font-extrabold text-[var(--ok)] mt-1 tabular-nums">
                      {money(metrics.realizedRevenue)}
                    </div>
                  </div>
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Em aberto nas mesas</div>
                    <div className="text-xl font-extrabold text-[var(--ac)] mt-1 tabular-nums">
                      {money(metrics.openRevenue)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-bold">Por forma de pagamento</div>
                  {(['pix', 'credito', 'debito', 'dinheiro'] as const).map((m) => (
                    <div
                      key={m}
                      className="flex justify-between text-sm rounded-xl px-3 py-2 bg-[var(--s2)] border border-[var(--bd)]"
                    >
                      <span>{PAY_LABELS[m]}</span>
                      <b className="tabular-nums">{money(metrics.paymentTotals[m] || 0)}</b>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="b full"
                  onClick={() => {
                    setActiveBlockModal(null);
                    onGoCashier();
                  }}
                >
                  💵 Ir para o Caixa
                </button>
              </div>
            )}

            {activeBlockModal === 'profit' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Lucro estimado</div>
                    <div className="text-xl font-extrabold text-[var(--ok)] mt-1 tabular-nums">
                      {money(metrics.estimatedProfit)}
                    </div>
                  </div>
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Custo dos insumos (CMV)</div>
                    <div className="text-xl font-extrabold mt-1 tabular-nums">
                      {money(metrics.realizedCmv)}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)] text-sm">
                  Margem média atual: <b className="text-[var(--ok)]">{metrics.marginPct}%</b>.
                  Mantenha os custos no Estoque atualizados para máxima precisão do lucro.
                </div>
                <button
                  type="button"
                  className="b full"
                  onClick={() => {
                    setActiveBlockModal(null);
                    onGoReports();
                  }}
                >
                  📊 Abrir Relatório Financeiro Completo
                </button>
              </div>
            )}

            {activeBlockModal === 'tickets' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Total de pedidos</div>
                    <div className="text-xl font-extrabold mt-1 tabular-nums">
                      {metrics.totalTickets}
                    </div>
                  </div>
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Ticket médio</div>
                    <div className="text-xl font-extrabold text-[var(--ac)] mt-1 tabular-nums">
                      {money(metrics.avgTicket)}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)] text-sm space-y-1">
                  <div>🍸 Fila Barman: <b>{metrics.pendingBar}</b></div>
                  <div>🍳 Fila Cozinha: <b>{metrics.pendingKitchen}</b></div>
                  <div>🔔 Prontos p/ entregar: <b>{metrics.readyToServe}</b></div>
                </div>
                <button
                  type="button"
                  className="b full"
                  onClick={() => {
                    setActiveBlockModal(null);
                    onGoQueue('all');
                  }}
                >
                  🔔 Abrir Fila de Pedidos
                </button>
              </div>
            )}

            {activeBlockModal === 'channels' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Salão / Mesas ({salonPct}%)</div>
                    <div className="text-xl font-extrabold mt-1 tabular-nums">
                      {money(metrics.salonRevenue)}
                    </div>
                  </div>
                  <div className="rounded-xl p-3.5 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Delivery ({deliveryPct}%)</div>
                    <div className="text-xl font-extrabold text-[var(--ac)] mt-1 tabular-nums">
                      {money(metrics.deliveryRevenue)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="b full"
                  onClick={() => {
                    setActiveBlockModal(null);
                    onGoDelivery();
                  }}
                >
                  🛵 Gerenciar Delivery
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
