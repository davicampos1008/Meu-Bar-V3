import React, { useEffect, useMemo, useState } from 'react';
import { isAlertEnabled } from '../lib/alertPrefs';
import {
  broadcastBarOpsSync,
  canRoleDo,
  enqueueOfflineOrder,
  flushOfflineOrders,
  getBarOpsData,
  getEffectiveItemPrice,
  getEffectiveTableOwner,
  getOfflineQueuedOrders,
  getWaiterConfig,
  isDeliveryOrder,
  logBarAudit,
  parseDeliveryOrderMeta,
  printCustomerBill,
  printKitchenOrBarTicket,
  saveBarOpsData,
  tableOwnerKey,
  WAITER_MODE_META,
} from '../lib/opsUtils';
import { broadcastMenuUpdate, sb } from '../lib/supabase';
import {
  filterRecipesForBar,
  getRecipeItemType,
  isRecipeManuallyUnavailable,
  makeDrink,
  money,
  norm,
  normalizeRecipeIngredients,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  BarMember,
  ItemType,
  Order,
  Recipe,
  TableCallAlert,
  TableTab,
} from '../types/meubar';

function getOrderStation(order: Order, recipe?: Recipe | null): 'bar' | 'cozinha' {
  if (order.station === 'cozinha' || order.station === 'bar') return order.station;
  if (recipe && getRecipeItemType(recipe) === 'petisco') return 'cozinha';
  return 'bar';
}

function elapsedMinutes(iso?: string): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

function clientDisplay(o: Order): string {
  const who = o.client_name || o.customer_name || 'Cliente';
  const dlv = parseDeliveryOrderMeta(o);
  if (dlv) {
    return `${dlv.mode === 'pickup' ? '🛍️ RETIRADA' : '🛵 DELIVERY'} #${dlv.code} · ${who}`;
  }
  return o.table_label ? `${o.table_label} · ${who}` : who;
}

function cleanOrderNote(o: Order): string {
  const dlv = parseDeliveryOrderMeta(o);
  if (dlv) return dlv.cleanItemNote;
  return String(o.note || '').trim();
}

/* ============================================================
 * 1. ÁREA DO BARMAN (Drinks & Avulsos + Ficha Técnica Rápida)
 * ============================================================ */
interface BarmanStationViewProps {
  bar: Bar;
  role?: string | null;
  actorName?: string;
  orders: Order[];
  recipes: Recipe[];
  onSetOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onCancelOrder?: (order: Order, reason: string) => Promise<void>;
  onSelectRecipe?: (recipe: Recipe) => void;
  onGoStock?: () => void;
  onRefresh: () => Promise<void>;
}

export const BarmanStationView: React.FC<BarmanStationViewProps> = ({
  bar,
  role,
  orders,
  recipes,
  onSetOrderStatus,
  onCancelOrder,
  onSelectRecipe,
  onGoStock,
  onRefresh,
}) => {
  const [expandedRecipeKey, setExpandedRecipeKey] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'pending' | 'ready'>('pending');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const canCancel = canRoleDo(bar, role, 'can_cancel_order');

  const { recipeMap, recipeByName } = useMemo(() => {
    const byId: Record<string, Recipe> = {};
    const byName: Record<string, Recipe> = {};
    recipes.forEach((r) => {
      byId[r.id] = r;
      const k = norm(r.name);
      if (k && !byName[k]) byName[k] = r;
    });
    return { recipeMap: byId, recipeByName: byName };
  }, [recipes]);

  const resolveOrderRecipe = (o: Order): Recipe | undefined =>
    recipeMap[o.recipe_id] || recipeByName[norm(o.recipe_name || '')];

  const barOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === 'done') return false;
      const rec = recipeMap[o.recipe_id] || recipeByName[norm(o.recipe_name || '')];
      return getOrderStation(o, rec) === 'bar';
    });
  }, [orders, recipeMap, recipeByName]);

  const pendingOrders = barOrders.filter((o) => o.status === 'pending');
  const readyOrders = barOrders.filter((o) => o.status === 'ready');

  // Agrupamento em lote para preparo simultâneo de drinks iguais
  const groupedPending = useMemo(() => {
    const map: Record<
      string,
      { groupKey: string; recipeId: string; recipe?: Recipe; name: string; totalQty: number; items: Order[] }
    > = {};
    pendingOrders.forEach((o) => {
      const rec = recipeMap[o.recipe_id] || recipeByName[norm(o.recipe_name || '')];
      const key = o.recipe_id || o.recipe_name || o.id;
      if (!map[key]) {
        map[key] = {
          groupKey: key,
          recipeId: o.recipe_id,
          recipe: rec,
          name: o.recipe_name || rec?.name || 'Drink',
          totalQty: 0,
          items: [],
        };
      }
      map[key].totalQty += Number(o.qty) || 1;
      map[key].items.push(o);
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [pendingOrders, recipeMap, recipeByName]);

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="!mb-0.5">🍸 Estação do Barman — {bar.name}</h3>
            <p className="sub !mb-0">
              Pedidos de drinks e bebidas avulsas agrupados em lote com ficha técnica rápida.
            </p>
          </div>
          <div className="flex gap-1.5">
            {onGoStock && (
              <button type="button" className="b g sm" onClick={onGoStock}>
                📦 Estoque / Falta
              </button>
            )}
            <button type="button" className="b g sm" onClick={() => void onRefresh()}>
              ↻
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            className={`b sm ${filterMode === 'pending' ? '' : 'g'}`}
            onClick={() => setFilterMode('pending')}
          >
            🔥 Preparando ({pendingOrders.length})
          </button>
          <button
            type="button"
            className={`b sm ${filterMode === 'ready' ? '' : 'g'}`}
            onClick={() => setFilterMode('ready')}
          >
            🔔 Prontos p/ Garçom ({readyOrders.length})
          </button>
        </div>
      </div>

      {filterMode === 'pending' ? (
        groupedPending.length === 0 ? (
          <div className="card empty">
            🍸 Nenhum drink ou bebida pendente no bar agora. Atualiza automaticamente a cada 5s.
          </div>
        ) : (
          groupedPending.map((group) => {
            const rec = group.recipe || recipeMap[group.recipeId] || recipeByName[norm(group.name)];
            const isOpen = expandedRecipeKey === group.groupKey;
            const isAvulso = rec && getRecipeItemType(rec) === 'avulso';
            const cleanRecIngs = normalizeRecipeIngredients(rec?.ingredients).filter(
              (i) => !i.n.startsWith('__')
            );
            const hasRecipeDetails = Boolean(
              rec &&
                (cleanRecIngs.length > 0 ||
                  rec.steps ||
                  rec.instructions ||
                  rec.description)
            );
            return (
              <div key={group.groupKey + group.name} className="card !border-[var(--ac)]/40">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-extrabold bg-[var(--ac)] text-[#111014] mr-2">
                      {group.totalQty}x
                    </span>
                    <strong className="text-base">
                      {isAvulso ? '🍺' : '🍸'} {group.name}
                    </strong>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {rec && hasRecipeDetails && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() =>
                          setExpandedRecipeKey(isOpen ? null : group.groupKey)
                        }
                      >
                        {isOpen ? 'Ocultar receita' : '📖 Ver receita'}
                      </button>
                    )}
                    {rec && onSelectRecipe && !isAvulso && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => onSelectRecipe(rec)}
                      >
                        🍸 Preparo
                      </button>
                    )}
                    {group.items.length > 1 && (
                      <button
                        type="button"
                        className="b sm"
                        onClick={async () => {
                          for (const it of group.items) {
                            await onSetOrderStatus(it.id, 'ready');
                          }
                        }}
                      >
                        ✓ Todos prontos ({group.items.length})
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && rec && (
                  <div className="mt-2.5 rounded-xl bg-[var(--bg2)] border border-[var(--bd)] p-3 text-xs space-y-1.5">
                    <div className="font-bold text-[var(--ac)]">
                      Ingredientes ({rec.glass || 'Copo padrão'} · {rec.technique || 'Preparo'})
                    </div>
                    {cleanRecIngs.length > 0 && (
                      <ul className="list-disc pl-4 m-0 space-y-0.5">
                        {cleanRecIngs.map((ing, idx) => (
                          <li key={idx}>
                            <strong>{ing.n}</strong>
                            {ing.q ? ` — ${ing.q}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(rec.steps || rec.instructions || rec.description) && (
                      <div className="text-[var(--mut)] pt-1 border-t border-[var(--bd)]">
                        <strong>Modo de preparo:</strong>{' '}
                        {rec.steps || rec.instructions || rec.description}
                      </div>
                    )}
                    {rec.garnish && (
                      <div className="text-[var(--ok)]">
                        <strong>Guarnição:</strong> {rec.garnish}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {group.items.map((o) => {
                    const mins = elapsedMinutes(o.created_at);
                    return (
                      <div
                        key={o.id}
                        className="rounded-xl bg-[var(--bg2)] border border-[var(--bd)] p-2.5 flex items-center justify-between gap-2 flex-wrap"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold">
                            {o.qty}x · {clientDisplay(o)}
                            <span
                              className={`ml-2 text-[11px] font-bold ${
                                mins >= 10 ? 'text-[var(--dn)]' : 'text-[var(--mut)]'
                              }`}
                            >
                              ⏱ {mins}m
                            </span>
                          </div>
                          {cleanOrderNote(o) && (
                            <div className="text-xs text-[var(--ac)] mt-0.5">
                              Obs: {cleanOrderNote(o)}
                            </div>
                          )}
                        </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              className="b g sm"
                              title="Imprimir comanda do bar"
                              onClick={() =>
                                printKitchenOrBarTicket({
                                  bar,
                                  order: o,
                                  recipeName: group.name,
                                  station: 'bar',
                                })
                              }
                            >
                              🖨️
                            </button>
                            {canCancel && onCancelOrder && (
                              <button
                                type="button"
                                className="b d sm"
                                title="Cancelar pedido"
                                onClick={() => {
                                  setCancelTarget(o);
                                  setCancelReason('');
                                }}
                              >
                                ✕
                              </button>
                            )}
                            <button
                              type="button"
                              className="b sm"
                              onClick={() => void onSetOrderStatus(o.id, 'ready')}
                            >
                              🔔 Pronto p/ Garçom
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )
        ) : readyOrders.length === 0 ? (
          <div className="card empty">Nenhum drink aguardando retirada do garçom.</div>
        ) : (
          readyOrders.map((o) => {
            const rec = resolveOrderRecipe(o);
            return (
              <div
                key={o.id}
                className="card !border-[var(--ok)]/40 flex items-center justify-between gap-2 flex-wrap"
              >
                <div>
                  <div className="font-bold text-sm">
                    🔔 {o.qty}x {o.recipe_name || rec?.name || 'Drink'}
                  </div>
                  <div className="text-xs text-[var(--mut)]">{clientDisplay(o)}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {rec && onSelectRecipe && (
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => onSelectRecipe(rec)}
                    >
                      📖 Ver receita
                    </button>
                  )}
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => void onSetOrderStatus(o.id, 'done')}
                  >
                    ✓ Entregue no balcão
                  </button>
                </div>
              </div>
            );
          })
        )}

      {cancelTarget && onCancelOrder && (
        <div className="ov" onClick={() => setCancelTarget(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">❌ Cancelar pedido do bar</h2>
            <p className="mu text-xs">
              {cancelTarget.qty}x {cancelTarget.recipe_name || recipeMap[cancelTarget.recipe_id]?.name} —{' '}
              {clientDisplay(cancelTarget)}
            </p>
            <label>Motivo do cancelamento</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Falta de ingrediente / Cliente cancelou"
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" className="b g" onClick={() => setCancelTarget(null)}>
                Voltar
              </button>
              <button
                type="button"
                className="b d"
                onClick={async () => {
                  await onCancelOrder(cancelTarget, cancelReason.trim() || 'Cancelado no bar');
                  setCancelTarget(null);
                }}
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
 * 2. ÁREA DA COZINHA (KDS de Petiscos + Controle de Falta)
 * ============================================================ */
interface KitchenStationViewProps {
  bar: Bar;
  role?: string | null;
  orders: Order[];
  recipes: Recipe[];
  onSetOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onCancelOrder?: (order: Order, reason: string) => Promise<void>;
  onSelectRecipe?: (recipe: Recipe) => void;
  onRecipesUpdated: () => Promise<void>;
  onOpenCatalog?: () => void;
  onRefresh: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const KitchenStationView: React.FC<KitchenStationViewProps> = ({
  bar,
  role,
  orders,
  recipes,
  onSetOrderStatus,
  onCancelOrder,
  onSelectRecipe,
  onRecipesUpdated,
  onOpenCatalog,
  onRefresh,
  onToast,
}) => {
  const [showAvailability, setShowAvailability] = useState(false);
  const [expandedKitchenOrderId, setExpandedKitchenOrderId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const canCancel = canRoleDo(bar, role, 'can_cancel_order');

  const { recipeMap, recipeByName } = useMemo(() => {
    const byId: Record<string, Recipe> = {};
    const byName: Record<string, Recipe> = {};
    recipes.forEach((r) => {
      byId[r.id] = r;
      const k = norm(r.name);
      if (k && !byName[k]) byName[k] = r;
    });
    return { recipeMap: byId, recipeByName: byName };
  }, [recipes]);

  const resolveKitchenRecipe = (o: Order): Recipe | undefined =>
    recipeMap[o.recipe_id] || recipeByName[norm(o.recipe_name || '')];

  const petiscos = useMemo(
    () =>
      filterRecipesForBar(recipes, bar.id)
        .filter((r) => getRecipeItemType(r) === 'petisco')
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [recipes, bar.id]
  );

  const kitchenOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.status === 'done') return false;
        const rec = recipeMap[o.recipe_id] || recipeByName[norm(o.recipe_name || '')];
        return getOrderStation(o, rec) === 'cozinha';
      }),
    [orders, recipeMap, recipeByName]
  );

  const pending = kitchenOrders.filter((o) => o.status === 'pending');
  const ready = kitchenOrders.filter((o) => o.status === 'ready');

  const togglePetiscoAvail = async (r: Recipe) => {
    const nextAvail = isRecipeManuallyUnavailable(r);
    const res = await sb
      .from('recipes')
      .update({
        ingredients: nextAvail ? [] : [{ n: '__INDISPONIVEL__', q: '' }],
        tags: ['__type:petisco', `__bar:${bar.id}`, nextAvail ? '__avail:1' : '__avail:0'],
      })
      .eq('id', r.id);
    if (res.error) {
      onToast('Erro ao atualizar: ' + res.error.message);
      return;
    }
    onToast(
      nextAvail
        ? `🍟 ${r.name} voltou para o cardápio!`
        : `⛔ ${r.name} marcado em falta na cozinha (oculto do cardápio).`
    );
    await onRecipesUpdated();
    await broadcastMenuUpdate(bar.id, bar);
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="!mb-0.5">🍳 Cozinha (KDS de Petiscos) — {bar.name}</h3>
            <p className="sub !mb-0">
              Apenas pedidos de comidas/petiscos chegam aqui. Ao marcar pronto, o garçom recebe o
              aviso imediatamente.
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              className="b g sm"
              onClick={() => setShowAvailability((v) => !v)}
            >
              🍟 Disponibilidade ({petiscos.length})
            </button>
            {onOpenCatalog && (
              <button type="button" className="b g sm" onClick={onOpenCatalog}>
                + Novo petisco
              </button>
            )}
            <button type="button" className="b g sm" onClick={() => void onRefresh()}>
              ↻
            </button>
          </div>
        </div>
      </div>

      {showAvailability && (
        <div className="card">
          <h3>🍟 Pausar / Ativar petiscos no cardápio</h3>
          {petiscos.length === 0 ? (
            <div className="empty !py-4">
              Nenhum petisco cadastrado. Cadastre em Mais → Petiscos & Avulsos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {petiscos.map((p) => {
                const unavail = isRecipeManuallyUnavailable(p);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-2.5 border border-[var(--bd)] bg-[var(--bg2)] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{p.name}</div>
                      <div className="text-[11px] text-[var(--mut)]">{p.category}</div>
                    </div>
                    <button
                      type="button"
                      className={`b sm ${unavail ? '' : 'd'}`}
                      onClick={() => void togglePetiscoAvail(p)}
                    >
                      {unavail ? '✅ Ativar' : '⛔ Acabou'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pendentes na chapa / fritadeira */}
      <div className="card">
        <h3>🔥 Pedidos em preparo ({pending.length})</h3>
        {pending.length === 0 ? (
          <div className="empty !py-6">
            🍳 Cozinha livre! Novos pedidos de petiscos aparecem aqui automaticamente a cada 5s.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pending.map((o) => {
              const mins = elapsedMinutes(o.created_at);
              const urgent = mins >= 15;
              const rec = resolveKitchenRecipe(o);
              const cleanIngs = normalizeRecipeIngredients(rec?.ingredients).filter(
                (i) => !i.n.startsWith('__')
              );
              const hasRecipeInfo = Boolean(
                rec && (cleanIngs.length > 0 || rec.steps || rec.instructions || rec.description)
              );
              const isOpen = expandedKitchenOrderId === o.id;
              return (
                <div
                  key={o.id}
                  className={`rounded-xl p-3 border ${
                    urgent
                      ? 'border-red-500/60 bg-red-500/10'
                      : 'border-[var(--ac)]/40 bg-[var(--bg2)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold">
                        {o.qty}x {o.recipe_name || rec?.name || 'Petisco'}
                      </div>
                      <div className="text-xs text-[var(--mut)] mt-0.5">{clientDisplay(o)}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        urgent
                          ? 'bg-red-500 text-white'
                          : 'bg-[var(--sf2)] text-[var(--ac)] border border-[var(--bd)]'
                      }`}
                    >
                      ⏱ {mins} min
                    </span>
                  </div>

                  {cleanOrderNote(o) && (
                    <div className="mt-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-xs text-[var(--ac)] font-semibold">
                      📝 {cleanOrderNote(o)}
                    </div>
                  )}

                  {isOpen && rec && (
                    <div className="mt-2 rounded-lg bg-black/25 border border-[var(--bd)] p-2.5 text-xs space-y-1.5">
                      {cleanIngs.length > 0 && (
                        <div>
                          <div className="font-bold text-[var(--ac)] mb-0.5">Ingredientes:</div>
                          <ul className="list-disc pl-4 m-0 space-y-0.5">
                            {cleanIngs.map((ing, idx) => (
                              <li key={idx}>
                                <strong>{ing.n}</strong>
                                {ing.q ? ` — ${ing.q}` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(rec.steps || rec.instructions || rec.description) && (
                        <div className="text-[var(--mut)]">
                          <strong className="text-[var(--txt)]">Preparo:</strong>{' '}
                          {rec.steps || rec.instructions || rec.description}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {hasRecipeInfo && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => setExpandedKitchenOrderId(isOpen ? null : o.id)}
                      >
                        {isOpen ? 'Ocultar' : '📖 Receita'}
                      </button>
                    )}
                    {rec && onSelectRecipe && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => onSelectRecipe(rec)}
                      >
                        🍳 Ficha
                      </button>
                    )}
                    <button
                      type="button"
                      className="b g sm"
                      title="Imprimir comanda da cozinha"
                      onClick={() =>
                        printKitchenOrBarTicket({
                          bar,
                          order: o,
                          recipeName: o.recipe_name || rec?.name || 'Petisco',
                          station: 'cozinha',
                        })
                      }
                    >
                      🖨️
                    </button>
                    {canCancel && onCancelOrder && (
                      <button
                        type="button"
                        className="b d sm"
                        title="Cancelar pedido"
                        onClick={() => {
                          setCancelTarget(o);
                          setCancelReason('');
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      className="b flex-1 sm"
                      onClick={() => void onSetOrderStatus(o.id, 'ready')}
                    >
                      🔔 Marcar PRONTO p/ Garçom
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prontos na boqueta esperando garçom */}
      {ready.length > 0 && (
        <div className="card !border-[var(--ok)]/40">
          <h3>🔔 Prontos na boqueta ({ready.length})</h3>
          <div className="space-y-2">
            {ready.map((o) => (
              <div
                key={o.id}
                className="rounded-xl p-2.5 bg-[var(--bg2)] border border-[var(--ok)]/30 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-sm">
                    {o.qty}x {o.recipe_name || recipeMap[o.recipe_id]?.name || 'Petisco'}
                  </div>
                  <div className="text-xs text-[var(--mut)]">{clientDisplay(o)}</div>
                </div>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => void onSetOrderStatus(o.id, 'done')}
                >
                  ✓ Retirado
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {cancelTarget && onCancelOrder && (
        <div className="ov" onClick={() => setCancelTarget(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">❌ Cancelar pedido da cozinha</h2>
            <p className="mu text-xs">
              {cancelTarget.qty}x {cancelTarget.recipe_name || recipeMap[cancelTarget.recipe_id]?.name} —{' '}
              {clientDisplay(cancelTarget)}
            </p>
            <label>Motivo do cancelamento</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Ingrediente acabou / Erro no pedido"
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" className="b g" onClick={() => setCancelTarget(null)}>
                Voltar
              </button>
              <button
                type="button"
                className="b d"
                onClick={async () => {
                  await onCancelOrder(cancelTarget, cancelReason.trim() || 'Cancelado na cozinha');
                  setCancelTarget(null);
                }}
              >
                Confirmar cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
 * 3. ÁREA DO GARÇOM (Entregas Prontas + Mesas + Lançar Pedido)
 * ============================================================ */
interface WaiterStationViewProps {
  bar: Bar;
  role?: string | null;
  actorName?: string;
  members?: BarMember[];
  orders: Order[];
  recipes: Recipe[];
  items: BarItem[];
  prices: Record<string, number>;
  tableTabs: TableTab[];
  tableCalls?: TableCallAlert[];
  onResolveCall?: (id: string) => Promise<void>;
  onSetOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  onBarUpdated?: (bar: Bar) => void;
  onRefreshAll: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const WaiterStationView: React.FC<WaiterStationViewProps> = ({
  bar,
  role,
  actorName = 'Garçom',
  members = [],
  orders,
  recipes,
  items,
  prices,
  tableTabs,
  tableCalls = [],
  onResolveCall,
  onSetOrderStatus,
  onBarUpdated,
  onRefreshAll,
  onToast,
}) => {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [waiterScope, setWaiterScope] = useState<'all' | 'mine' | 'free'>('all');
  const [orderTab, setOrderTab] = useState<ItemType>('drink');
  const [selectedTableLabel, setSelectedTableLabel] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [selectedModIds, setSelectedModIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [offlineCount, setOfflineCount] = useState(() => getOfflineQueuedOrders(bar.id).length);

  // Transfer / Merge table modal
  const [tableAction, setTableAction] = useState<null | {
    mode: 'transfer' | 'merge';
    source: TableTab;
  }>(null);
  const [targetTableLabel, setTargetTableLabel] = useState('');
  const [targetMergeTabId, setTargetMergeTabId] = useState('');

  // Handoff table to another waiter modal
  const [handoffTable, setHandoffTable] = useState<TableTab | null>(null);
  const [handoffTargetName, setHandoffTargetName] = useState('');

  const ops = useMemo(() => getBarOpsData(bar), [bar]);
  const waiterCfg = useMemo(() => getWaiterConfig(bar), [bar]);
  const tableWaiters = ops.table_waiters || {};
  const orderClaims = ops.order_claims || {};
  const callClaims = ops.call_claims || {};
  const myNorm = norm(actorName);

  useEffect(() => {
    if (waiterCfg.mode === 'fixed') {
      setWaiterScope('mine');
    } else if (waiterCfg.mode === 'open_queue') {
      setWaiterScope('all');
    }
  }, [waiterCfg.mode]);

  const myZones = useMemo(
    () => (waiterCfg.zones || []).filter((z) => norm(z.waiter_name) === myNorm),
    [waiterCfg.zones, myNorm]
  );

  const getTableOwner = (tableLabel?: string | null): string => {
    return getEffectiveTableOwner(bar, tableLabel).waiterName;
  };

  const staffSuggestions = useMemo(() => {
    const set = new Set<string>();
    if (actorName.trim()) set.add(actorName.trim());
    members.forEach((m) => {
      const n = (m.name || '').trim();
      if (n) set.add(n);
    });
    Object.values(tableWaiters).forEach((tw) => {
      if (tw?.waiter_name) set.add(tw.waiter_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [actorName, members, tableWaiters]);
  const relevantModifiers = useMemo(
    () =>
      (ops.modifiers || []).filter(
        (m) => m.applies_to === 'all' || m.applies_to === orderTab
      ),
    [ops.modifiers, orderTab]
  );

  useEffect(() => {
    const onOnline = async () => {
      const sent = await flushOfflineOrders(bar.id);
      setOfflineCount(getOfflineQueuedOrders(bar.id).length);
      if (sent > 0) {
        if (isAlertEnabled('offlineSync')) {
          onToast(`${sent} pedido(s) offline sincronizado(s) automaticamente!`);
        }
        await onRefreshAll();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [bar.id]);

  const recipeMap = useMemo(() => {
    const m: Record<string, Recipe> = {};
    recipes.forEach((r) => {
      m[r.id] = r;
    });
    return m;
  }, [recipes]);

  const readyAll = useMemo(
    () => orders.filter((o) => o.status === 'ready'),
    [orders]
  );

  const readyDeliveryCount = useMemo(
    () => readyAll.filter((o) => isDeliveryOrder(o)).length,
    [readyAll]
  );

  const readySalonOrders = useMemo(
    () => readyAll.filter((o) => !isDeliveryOrder(o)),
    [readyAll]
  );

  const pendingInPrep = useMemo(
    () => orders.filter((o) => o.status === 'pending' && !isDeliveryOrder(o)),
    [orders]
  );

  const openTabs = useMemo(
    () => tableTabs.filter((t) => t.status === 'open'),
    [tableTabs]
  );

  const assignTableWaiter = async (tableLabel: string, waiterName: string | null) => {
    const k = tableOwnerKey(tableLabel);
    if (!k) return;
    setBusyKey(`tw_${k}`);
    try {
      const nextMap = { ...(getBarOpsData(bar).table_waiters || {}) };
      if (waiterName && waiterName.trim()) {
        nextMap[k] = {
          waiter_name: waiterName.trim(),
          table_label: tableLabel,
          assigned_at: new Date().toISOString(),
        };
      } else {
        delete nextMap[k];
      }
      await saveBarOpsData(bar, { table_waiters: nextMap }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      if (waiterName) {
        onToast(`Mesa ${tableLabel} atribuída para ${waiterName}!`);
      } else {
        onToast(`Mesa ${tableLabel} liberada para qualquer garçom.`);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const toggleOrderClaim = async (order: Order, claim: boolean) => {
    setBusyKey(`oc_${order.id}`);
    try {
      const nextClaims = { ...(getBarOpsData(bar).order_claims || {}) };
      if (claim) {
        nextClaims[order.id] = {
          waiter_name: actorName,
          claimed_at: new Date().toISOString(),
        };
      } else {
        delete nextClaims[order.id];
      }
      await saveBarOpsData(bar, { order_claims: nextClaims }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      if (claim) {
        onToast(`Você assumiu a entrega de ${order.qty}x ${order.recipe_name || recipeMap[order.recipe_id]?.name || 'Item'}.`);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeliverOrder = async (order: Order) => {
    setBusyKey(`del_${order.id}`);
    try {
      await onSetOrderStatus(order.id, 'done');
      const curClaims = getBarOpsData(bar).order_claims || {};
      if (curClaims[order.id]) {
        const nextClaims = { ...curClaims };
        delete nextClaims[order.id];
        await saveBarOpsData(bar, { order_claims: nextClaims }, onBarUpdated);
        void broadcastBarOpsSync(bar.id);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const toggleCallClaim = async (call: TableCallAlert, claim: boolean) => {
    setBusyKey(`cc_${call.id}`);
    try {
      const nextClaims = { ...(getBarOpsData(bar).call_claims || {}) };
      if (claim) {
        nextClaims[call.id] = {
          waiter_name: actorName,
          claimed_at: new Date().toISOString(),
        };
      } else {
        delete nextClaims[call.id];
      }
      await saveBarOpsData(bar, { call_claims: nextClaims }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      if (claim) {
        onToast(`Avisado à equipe: ${actorName} está indo atender ${call.table_label || call.client_name}!`);
      }
    } finally {
      setBusyKey(null);
    }
  };

  const handleResolveCallWithCleanup = async (callId: string) => {
    if (onResolveCall) await onResolveCall(callId);
    const curClaims = getBarOpsData(bar).call_claims || {};
    if (curClaims[callId]) {
      const nextClaims = { ...curClaims };
      delete nextClaims[callId];
      await saveBarOpsData(bar, { call_claims: nextClaims }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
    }
  };

  const shiftDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    let freeTables = 0;
    openTabs.forEach((t) => {
      const owner = getTableOwner(t.table_label);
      if (!owner) {
        freeTables++;
      } else {
        counts[owner] = (counts[owner] || 0) + 1;
      }
    });
    return {
      entries: Object.entries(counts).sort((a, b) => b[1] - a[1]),
      freeTables,
    };
  }, [openTabs, tableWaiters]);

  const myTabsCount = openTabs.filter((t) => norm(getTableOwner(t.table_label)) === myNorm).length;
  const freeTabsCount = openTabs.filter((t) => !getTableOwner(t.table_label)).length;

  const visibleTabs = useMemo(() => {
    if (waiterScope === 'mine') {
      return openTabs.filter((t) => norm(getTableOwner(t.table_label)) === myNorm);
    }
    if (waiterScope === 'free') {
      return openTabs.filter((t) => !getTableOwner(t.table_label));
    }
    return openTabs;
  }, [openTabs, waiterScope, tableWaiters, myNorm]);

  const myShiftSummary = useMemo(() => {
    let sales = 0;
    orders.forEach((o) => {
      if (isDeliveryOrder(o)) return;
      const owner = getTableOwner(o.table_label);
      if (norm(owner) !== myNorm) return;
      const unit = Number(o.unit_price ?? o.price ?? prices[o.recipe_id] ?? 0);
      sales += unit * (Number(o.qty) || 1);
    });
    const commPct = Math.max(0, Number(waiterCfg.waiter_commission_pct ?? 10));
    return {
      sales: Math.round(sales * 100) / 100,
      commPct,
      commission: Math.round(sales * (commPct / 100) * 100) / 100,
    };
  }, [orders, prices, myNorm, tableWaiters, waiterCfg]);

  const readyToDeliver = useMemo(() => {
    const sortOwnFirst = (arr: Order[]) =>
      [...arr].sort((a, b) => {
        const aMine = norm(getTableOwner(a.table_label)) === myNorm ? 1 : 0;
        const bMine = norm(getTableOwner(b.table_label)) === myNorm ? 1 : 0;
        return bMine - aMine;
      });
    if (waiterScope === 'mine') {
      return sortOwnFirst(
        readySalonOrders.filter((o) => {
          const owner = getTableOwner(o.table_label);
          const claim = orderClaims[o.id]?.waiter_name || '';
          return norm(owner) === myNorm || norm(claim) === myNorm;
        })
      );
    }
    if (waiterScope === 'free') {
      return readySalonOrders.filter((o) => {
        const owner = getTableOwner(o.table_label);
        const claim = orderClaims[o.id]?.waiter_name || '';
        return !owner && !claim;
      });
    }
    return sortOwnFirst(readySalonOrders);
  }, [readySalonOrders, waiterScope, tableWaiters, orderClaims, myNorm, waiterCfg]);

  const visibleCalls = useMemo(() => {
    const sortOwnFirst = (arr: TableCallAlert[]) =>
      [...arr].sort((a, b) => {
        const aMine = norm(getTableOwner(a.table_label)) === myNorm ? 1 : 0;
        const bMine = norm(getTableOwner(b.table_label)) === myNorm ? 1 : 0;
        return bMine - aMine;
      });
    if (waiterScope === 'mine') {
      return sortOwnFirst(
        tableCalls.filter((c) => {
          const owner = getTableOwner(c.table_label);
          const claim = callClaims[c.id]?.waiter_name || '';
          return norm(owner) === myNorm || norm(claim) === myNorm;
        })
      );
    }
    if (waiterScope === 'free') {
      return tableCalls.filter((c) => {
        const owner = getTableOwner(c.table_label);
        const claim = callClaims[c.id]?.waiter_name || '';
        return !owner && !claim;
      });
    }
    return sortOwnFirst(tableCalls);
  }, [tableCalls, waiterScope, tableWaiters, callClaims, myNorm, waiterCfg]);

  const availableCatalog = useMemo(() => {
    return filterRecipesForBar(recipes, bar.id)
      .filter((r) => makeDrink(r, items) && prices[r.id] != null)
      .filter((r) => getRecipeItemType(r) === orderTab)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [recipes, bar.id, items, prices, orderTab]);

  const tableTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    orders
      .filter((o) => !o.paid)
      .forEach((o) => {
        const key = o.table_tab_id || o.table_label || '';
        if (!key) return;
        const unit = Number(o.unit_price ?? o.price ?? prices[o.recipe_id] ?? 0);
        totals[key] = (totals[key] || 0) + unit * (Number(o.qty) || 1);
      });
    return totals;
  }, [orders, prices]);

  const submitWaiterOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const rec = recipeMap[selectedRecipeId];
    if (!rec) {
      onToast('Selecione um item do cardápio.');
      return;
    }
    const cleanClient = clientName.trim() || 'Mesa / Garçom';
    const matchingTab = openTabs.find((t) => t.table_label === selectedTableLabel);
    const chosenMods = relevantModifiers.filter((m) => selectedModIds.includes(m.id));
    const modExtra = chosenMods.reduce((acc, m) => acc + (Number(m.price) || 0), 0);
    const effPrice = getEffectiveItemPrice(prices[rec.id] ?? 0, rec, bar);
    const unitPrice = (effPrice.finalPrice ?? prices[rec.id] ?? 0) + modExtra;
    const hhTag = effPrice.discounted && effPrice.ruleName ? `[${effPrice.ruleName}]` : '';
    const modsSummary = chosenMods
      .map((m) => (m.price > 0 ? `${m.name} (+${money(m.price)})` : m.name))
      .join(', ');
    const finalNote = [hhTag, modsSummary, note.trim()].filter(Boolean).join(' · ') || null;
    const station: 'bar' | 'cozinha' = getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar';

    const payload: Record<string, unknown> = {
      bar_id: bar.id,
      recipe_id: rec.id,
      recipe_name: rec.name,
      client_name: cleanClient,
      customer_name: cleanClient,
      qty: Math.max(1, Number(qty) || 1),
      note: finalNote,
      price: unitPrice,
      unit_price: unitPrice,
      table_label: selectedTableLabel || null,
      table_tab_id: matchingTab?.id || null,
      station,
      status: 'pending',
      paid: false,
    };

    setSubmitting(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineOrder(bar.id, payload, `${qty}x ${rec.name} (${selectedTableLabel || cleanClient})`);
        setOfflineCount(getOfflineQueuedOrders(bar.id).length);
        onToast('Sem Wi-Fi: pedido salvo na fila offline e será enviado assim que reconectar!');
        setNote('');
        setSelectedModIds([]);
        setQty(1);
        setSelectedRecipeId('');
        return;
      }

      let res = await sb.from('orders').insert(payload);
      if (res.error && /column .* does not exist/i.test(res.error.message || '')) {
        const fallback = {
          bar_id: bar.id,
          recipe_id: rec.id,
          client_name: cleanClient,
          qty: Math.max(1, Number(qty) || 1),
          note: finalNote,
          price: unitPrice,
          table_label: selectedTableLabel || null,
          table_tab_id: matchingTab?.id || null,
          status: 'pending',
          paid: false,
        };
        res = await sb.from('orders').insert(fallback);
      }

      if (res.error) {
        enqueueOfflineOrder(bar.id, payload, `${qty}x ${rec.name} (${selectedTableLabel || cleanClient})`);
        setOfflineCount(getOfflineQueuedOrders(bar.id).length);
        onToast('Conexão instável: pedido guardado na fila offline para reenvio!');
        return;
      }

      // Auto-atribuição de mesa no 1º pedido (respeitando waiter_config)
      if (
        waiterCfg.mode !== 'open_queue' &&
        waiterCfg.auto_assign_on_first_order !== false &&
        selectedTableLabel &&
        !getTableOwner(selectedTableLabel)
      ) {
        const k = tableOwnerKey(selectedTableLabel);
        const nextMap = {
          ...(getBarOpsData(bar).table_waiters || {}),
          [k]: {
            waiter_name: actorName,
            table_label: selectedTableLabel,
            assigned_at: new Date().toISOString(),
          },
        };
        await saveBarOpsData(bar, { table_waiters: nextMap }, onBarUpdated);
        void broadcastBarOpsSync(bar.id);
      }

      onToast(
        `Pedido enviado para ${station === 'cozinha' ? '🍳 Cozinha' : '🍸 Bar'}: ${qty}x ${rec.name}`
      );
      setNote('');
      setSelectedModIds([]);
      setQty(1);
      setSelectedRecipeId('');
      await onRefreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmTableAction = async () => {
    if (!tableAction) return;
    setSubmitting(true);
    try {
      if (tableAction.mode === 'transfer') {
        const dest = targetTableLabel.trim();
        if (!dest || dest === tableAction.source.table_label) {
          onToast('Escolha uma mesa de destino diferente.');
          return;
        }
        await sb
          .from('table_tabs')
          .update({ table_label: dest })
          .eq('id', tableAction.source.id);
        await sb
          .from('orders')
          .update({ table_label: dest })
          .eq('table_tab_id', tableAction.source.id);
        await logBarAudit(
          bar,
          'Transferência de mesa',
          `${tableAction.source.table_label} → ${dest}`,
          actorName,
          role || 'garcom',
          onBarUpdated
        );
        onToast(`${tableAction.source.table_label} transferida para ${dest}!`);
      } else {
        const targetTab = openTabs.find((t) => t.id === targetMergeTabId);
        if (!targetTab || targetTab.id === tableAction.source.id) {
          onToast('Escolha outra mesa aberta para juntar.');
          return;
        }
        const mergedMembers = Array.from(
          new Set([
            ...(targetTab.members || [targetTab.opened_by]),
            ...(tableAction.source.members || [tableAction.source.opened_by]),
          ])
        );
        await sb
          .from('orders')
          .update({ table_tab_id: targetTab.id, table_label: targetTab.table_label })
          .eq('table_tab_id', tableAction.source.id);
        await sb
          .from('table_tabs')
          .update({ members: mergedMembers })
          .eq('id', targetTab.id);
        await sb
          .from('table_tabs')
          .update({ status: 'closed', closed_at: new Date().toISOString() })
          .eq('id', tableAction.source.id);
        await logBarAudit(
          bar,
          'Junção de mesas',
          `${tableAction.source.table_label} unida com ${targetTab.table_label}`,
          actorName,
          role || 'garcom',
          onBarUpdated
        );
        onToast(`${tableAction.source.table_label} juntada com ${targetTab.table_label}!`);
      }
      setTableAction(null);
      await onRefreshAll();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="!mb-0.5">🍽️ Central do Garçom — {bar.name}</h3>
            <p className="sub !mb-0">
              Operando como <b className="text-[var(--txt)]">{actorName}</b> · Modo{' '}
              <b className="text-[var(--ac)]">{WAITER_MODE_META[waiterCfg.mode].shortLabel}</b>
              {myZones.length > 0 && (
                <>
                  {' '}
                  · 📍 Sua praça:{' '}
                  <b className="text-[var(--ok)]">
                    {myZones.map((z) => `${z.name} (${(z.table_labels || []).length})`).join(', ')}
                  </b>
                </>
              )}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="b sm"
              onClick={() => setShowNewOrder((v) => !v)}
            >
              {showNewOrder ? 'Fechar pedido' : '➕ Lançar pedido'}
            </button>
            <button type="button" className="b g sm" onClick={() => void onRefreshAll()}>
              ↻
            </button>
          </div>
        </div>

        {/* Resumo pessoal do turno do garçom */}
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          <div className="rounded-xl p-2 bg-[var(--bg2)] border border-[var(--bd)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--mut)]">Suas mesas</div>
            <div className="text-base font-extrabold tabular-nums text-[var(--ac)]">{myTabsCount}</div>
          </div>
          <div className="rounded-xl p-2 bg-[var(--bg2)] border border-[var(--bd)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--mut)]">Vendas (suas mesas)</div>
            <div className="text-base font-extrabold tabular-nums text-[var(--ok)]">
              {money(myShiftSummary.sales)}
            </div>
          </div>
          <div className="rounded-xl p-2 bg-[var(--bg2)] border border-[var(--bd)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--mut)]">
              Comissão ({myShiftSummary.commPct}%)
            </div>
            <div className="text-base font-extrabold tabular-nums">
              {money(myShiftSummary.commission)}
            </div>
          </div>
        </div>

        {/* Filtros Multi-Garçom: Minhas Mesas | Livres | Salão Todo */}
        <div className="chips !flex-wrap !overflow-visible mt-3">
          <button
            type="button"
            className={`chip ${waiterScope === 'mine' ? 'on' : ''}`}
            onClick={() => setWaiterScope('mine')}
          >
            👤 Minhas mesas ({myTabsCount})
          </button>
          <button
            type="button"
            className={`chip ${waiterScope === 'free' ? 'on' : ''}`}
            onClick={() => setWaiterScope('free')}
          >
            🆓 Livres / Sem garçom ({freeTabsCount})
          </button>
          <button
            type="button"
            className={`chip ${waiterScope === 'all' ? 'on' : ''}`}
            onClick={() => setWaiterScope('all')}
          >
            👥 Salão todo ({openTabs.length})
          </button>
        </div>

        {/* Distribuição ao vivo de mesas por garçom */}
        {openTabs.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-[var(--bd)] flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--mut)]">
            <span className="font-bold text-[var(--txt)]">Salão agora:</span>
            {shiftDistribution.entries.map(([wName, cnt]) => (
              <span
                key={wName}
                className={`px-2 py-0.5 rounded-md border ${
                  norm(wName) === myNorm
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200 font-bold'
                    : 'bg-[var(--bg2)] border-[var(--bd)] text-[var(--txt)]'
                }`}
              >
                👤 {wName}: {cnt} {cnt === 1 ? 'mesa' : 'mesas'}
              </span>
            ))}
            {shiftDistribution.freeTables > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-200 font-bold">
                🆓 Sem garçom: {shiftDistribution.freeTables}
              </span>
            )}
          </div>
        )}
      </div>

      {readyDeliveryCount > 0 && (
        <div className="rounded-xl px-3 py-2 bg-sky-500/10 border border-sky-400/40 text-xs text-sky-200 flex items-center justify-between gap-2">
          <span>
            🛵 <b>{readyDeliveryCount}</b> pedido(s) de <b>Delivery / Retirada</b> pronto(s) — gerencie no painel <b>Delivery & Motoboys</b>.
          </span>
        </div>
      )}

      {visibleCalls.length > 0 && (
        <div className="card !border-amber-400/70 bg-amber-500/15 space-y-2">
          <div className="text-xs font-extrabold text-amber-200 uppercase tracking-wider">
            🔔 Chamados ao vivo das mesas ({visibleCalls.length})
          </div>
          {visibleCalls.map((c) => {
            const owner = getTableOwner(c.table_label);
            const claim = callClaims[c.id];
            const claimedByMe = claim && norm(claim.waiter_name) === myNorm;
            const claimedByOther = claim && !claimedByMe;
            return (
              <div
                key={c.id}
                className="rounded-xl p-2.5 bg-black/25 border border-amber-400/30 flex items-center justify-between gap-2 flex-wrap"
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold">
                      {c.kind === 'bill' ? '🧾 Pediu a Conta' : '🙋 Chamou Garçom'} ·{' '}
                      {c.table_label || 'Balcão'}
                    </span>
                    {owner && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          norm(owner) === myNorm
                            ? 'bg-emerald-500/25 text-emerald-200'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {norm(owner) === myNorm ? '⭐ SUA MESA' : `👤 Mesa de ${owner}`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--mut)] mt-0.5">
                    Cliente: <b>{c.client_name}</b>
                    {c.note ? ` · ${c.note}` : ''}
                  </div>
                  {claim && (
                    <div
                      className={`text-[11px] font-bold mt-1 ${
                        claimedByMe ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      🏃 {claim.waiter_name} já está indo atender
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {!claim ? (
                    <button
                      type="button"
                      className="b sm"
                      disabled={busyKey === `cc_${c.id}`}
                      onClick={() => void toggleCallClaim(c, true)}
                    >
                      ✋ Indo atender
                    </button>
                  ) : claimedByMe ? (
                    <button
                      type="button"
                      className="b g sm"
                      disabled={busyKey === `cc_${c.id}`}
                      onClick={() => void toggleCallClaim(c, false)}
                    >
                      Soltar
                    </button>
                  ) : null}
                  {onResolveCall && (
                    <button
                      type="button"
                      className={`b sm ${claimedByOther ? 'g' : 'ok'}`}
                      onClick={() => void handleResolveCallWithCleanup(c.id)}
                    >
                      ✓ Atendido
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {offlineCount > 0 && (
        <div className="card !border-amber-500/50 bg-amber-500/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs">
            <b>📡 {offlineCount} pedido(s) na fila offline</b> aguardando sinal de Wi-Fi.
          </div>
          <button
            type="button"
            className="b sm"
            onClick={async () => {
              const sent = await flushOfflineOrders(bar.id);
              setOfflineCount(getOfflineQueuedOrders(bar.id).length);
              if (sent > 0) {
                onToast(`${sent} pedido(s) sincronizado(s)!`);
                await onRefreshAll();
              } else {
                onToast('Ainda sem conexão com o servidor.');
              }
            }}
          >
            ↻ Reenviar agora
          </button>
        </div>
      )}

      {/* Formulário rápido para o garçom lançar pedido na mesa */}
      {showNewOrder && (
        <form className="card !border-[var(--ac)]/50" onSubmit={(e) => void submitWaiterOrder(e)}>
          <h3>➕ Novo pedido para mesa / cliente</h3>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <button
              type="button"
              className={`b sm ${orderTab === 'drink' ? '' : 'g'}`}
              onClick={() => {
                setOrderTab('drink');
                setSelectedRecipeId('');
              }}
            >
              🍸 Drinks
            </button>
            <button
              type="button"
              className={`b sm ${orderTab === 'petisco' ? '' : 'g'}`}
              onClick={() => {
                setOrderTab('petisco');
                setSelectedRecipeId('');
              }}
            >
              🍟 Petiscos
            </button>
            <button
              type="button"
              className={`b sm ${orderTab === 'avulso' ? '' : 'g'}`}
              onClick={() => {
                setOrderTab('avulso');
                setSelectedRecipeId('');
              }}
            >
              🍺 Avulsos
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label>Mesa (opcional)</label>
              <select
                value={selectedTableLabel}
                onChange={(e) => setSelectedTableLabel(e.target.value)}
              >
                <option value="">Balcão / Sem mesa</option>
                {(bar.table_names || ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5']).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Nome do cliente</label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: Ana / Mesa 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
            <div className="sm:col-span-2">
              <label>Item disponível ({availableCatalog.length})</label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
              >
                <option value="">Selecione um item...</option>
                {availableCatalog.map((r) => {
                  const eff = getEffectiveItemPrice(prices[r.id], r, bar);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.name} — {money(eff.finalPrice ?? prices[r.id] ?? 0)}
                      {eff.discounted ? ' (🍻 Happy Hour)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label>Qtd</label>
              <input
                type="number"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          {relevantModifiers.length > 0 && (
            <div className="mt-2">
              <label className="!mt-0">Adicionais & Observações rápidas</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {relevantModifiers.map((m) => {
                  const active = selectedModIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`b sm !text-[11px] ${active ? '' : 'g'}`}
                      onClick={() =>
                        setSelectedModIds((prev) =>
                          prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                        )
                      }
                    >
                      {active ? '✓ ' : '+ '}
                      {m.name}
                      {m.price > 0 ? ` (+${money(m.price)})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label>Observação livre (opcional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: sem gelo, ponto da carne, limão à parte..."
          />

          <button type="submit" className="b w-full mt-3" disabled={submitting}>
            {submitting
              ? 'Enviando...'
              : orderTab === 'petisco'
                ? '🍳 Enviar pedido para a Cozinha'
                : '🍸 Enviar pedido para o Bar'}
          </button>
        </form>
      )}

      {/* PRONTOS PARA LEVAR À MESA */}
      <div className="card !border-[var(--ok)]/50">
        <h3>
          🔔 Prontos para levar à mesa ({readyToDeliver.length}
          {waiterScope !== 'all' ? ` de ${readySalonOrders.length}` : ''})
        </h3>
        {readyToDeliver.length === 0 ? (
          <div className="empty !py-5">
            {waiterScope === 'mine'
              ? 'Nenhum pedido pronto para as suas mesas agora.'
              : waiterScope === 'free'
                ? 'Nenhum pedido pronto livre agora.'
                : `Nenhum pedido pronto aguardando retirada agora. (${pendingInPrep.length} em preparo)`}
          </div>
        ) : (
          <div className="space-y-2">
            {readyToDeliver.map((o) => {
              const rec = recipeMap[o.recipe_id];
              const station = getOrderStation(o, rec);
              const owner = getTableOwner(o.table_label);
              const claim = orderClaims[o.id];
              const claimedByMe = claim && norm(claim.waiter_name) === myNorm;
              const claimedByOther = claim && !claimedByMe;
              const cleanObs = cleanOrderNote(o);
              return (
                <div
                  key={o.id}
                  className={`rounded-xl p-3 border flex items-center justify-between gap-2 flex-wrap ${
                    claimedByOther
                      ? 'border-white/15 bg-white/5 opacity-80'
                      : 'border-[var(--ok)]/40 bg-[var(--ok)]/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[var(--bg2)] border border-[var(--bd)]">
                        {station === 'cozinha' ? '🍳 COZINHA' : '🍸 BAR'}
                      </span>
                      <strong className="text-sm">
                        {o.qty}x {o.recipe_name || rec?.name || 'Pedido'}
                      </strong>
                      {owner ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            norm(owner) === myNorm
                              ? 'bg-emerald-500/25 text-emerald-200'
                              : 'bg-white/10 text-[var(--mut)]'
                          }`}
                        >
                          {norm(owner) === myNorm ? '⭐ SUA MESA' : `👤 Mesa de ${owner}`}
                        </span>
                      ) : (
                        o.table_label && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-200">
                            🆓 Livre
                          </span>
                        )
                      )}
                    </div>
                    <div className="text-xs text-[var(--txt)] mt-1 font-semibold">
                      👤 {clientDisplay(o)}
                    </div>
                    {cleanObs && <div className="text-xs text-[var(--ac)] mt-0.5">Obs: {cleanObs}</div>}
                    {claim && (
                      <div
                        className={`text-[11px] font-bold mt-1 ${
                          claimedByMe ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        🏃 Levando agora: {claim.waiter_name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!claim ? (
                      <button
                        type="button"
                        className="b g sm"
                        disabled={busyKey === `oc_${o.id}`}
                        onClick={() => void toggleOrderClaim(o, true)}
                      >
                        ✋ Vou levar
                      </button>
                    ) : claimedByMe ? (
                      <button
                        type="button"
                        className="b g sm"
                        disabled={busyKey === `oc_${o.id}`}
                        onClick={() => void toggleOrderClaim(o, false)}
                      >
                        Soltar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`b sm ${claimedByOther ? 'g' : ''}`}
                      disabled={busyKey === `del_${o.id}`}
                      onClick={() => void handleDeliverOrder(o)}
                    >
                      ✓ Entregue na mesa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MESAS & COMANDAS ABERTAS */}
      <div className="card">
        <h3>
          🪑 Mesas & Comandas abertas ({visibleTabs.length}
          {waiterScope !== 'all' ? ` de ${openTabs.length}` : ''})
        </h3>
        {visibleTabs.length === 0 ? (
          <div className="empty !py-4">
            {waiterScope === 'mine'
              ? 'Você ainda não assumiu nenhuma mesa. Toque em "🆓 Livres" ou "👥 Salão todo" e clique em "✋ Assumir".'
              : waiterScope === 'free'
                ? 'Todas as mesas abertas já possuem garçom responsável!'
                : 'Nenhuma comanda de mesa aberta no momento.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {visibleTabs.map((t) => {
              const total = tableTotals[t.id] || tableTotals[t.table_label] || 0;
              const owner = getTableOwner(t.table_label);
              const isMine = owner && norm(owner) === myNorm;
              const tabKey = tableOwnerKey(t.table_label);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl p-3 border bg-[var(--bg2)] ${
                    isMine
                      ? 'border-emerald-400/50'
                      : !owner
                        ? 'border-amber-400/40'
                        : 'border-[var(--bd)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">🪑 {t.table_label}</strong>
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-[var(--ac)]/20 text-[var(--ac)]">
                      Cód: {t.code}
                    </span>
                  </div>

                  {/* Responsável pela mesa (Multi-Garçom) */}
                  <div className="flex items-center justify-between gap-1.5 mt-1.5">
                    {owner ? (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isMine
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : 'bg-white/10 text-[var(--txt)]'
                        }`}
                      >
                        👤 Responsável: {owner}
                        {isMine ? ' (Você)' : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200">
                        🆓 Sem garçom atribuído
                      </span>
                    )}
                    <div className="flex gap-1">
                      {!isMine && (
                        <button
                          type="button"
                          className="b ok sm !py-0.5 !px-2 !text-[11px]"
                          disabled={busyKey === `tw_${tabKey}`}
                          onClick={() => void assignTableWaiter(t.table_label, actorName)}
                        >
                          ✋ Assumir
                        </button>
                      )}
                      {owner && (
                        <button
                          type="button"
                          className="b g sm !py-0.5 !px-2 !text-[11px]"
                          title="Passar mesa para outro garçom ou liberar"
                          onClick={() => {
                            setHandoffTargetName('');
                            setHandoffTable(t);
                          }}
                        >
                          👥 Passar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[var(--mut)] mt-1.5">
                    Pessoas: {(t.members || [t.opened_by]).join(', ')}
                  </div>
                  <div className="flex items-center justify-between gap-1.5 flex-wrap mt-2 pt-2 border-t border-[var(--bd)]">
                    <span className="text-xs font-bold text-[var(--ok)]">
                      Consumo: {money(total)}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        type="button"
                        className="b g sm"
                        title="Imprimir pré-conta da mesa"
                        onClick={() => {
                          const tabOrders = orders.filter(
                            (o) => !o.paid && (o.table_tab_id === t.id || o.table_label === t.table_label)
                          );
                          const feePct = ops.default_service_fee_pct ?? 10;
                          const fee = feePct > 0 ? Math.round(total * (feePct / 100) * 100) / 100 : 0;
                          printCustomerBill({
                            bar,
                            title: `Mesa: ${t.table_label}`,
                            subtitle: `Pessoas: ${(t.members || [t.opened_by]).join(', ')}`,
                            lines: tabOrders.map((o) => {
                              const u = Number(o.unit_price ?? o.price ?? prices[o.recipe_id] ?? 0);
                              return {
                                label: `${o.qty}x ${o.recipe_name || recipeMap[o.recipe_id]?.name || 'Item'}`,
                                amount: u * (Number(o.qty) || 1),
                              };
                            }),
                            subtotal: total,
                            serviceFee: fee,
                            serviceFeePct: feePct,
                            discount: 0,
                            total: total + fee,
                            isPreBill: true,
                          });
                        }}
                      >
                        🖨️
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        title="Transferir para outra mesa"
                        onClick={() => {
                          setTargetTableLabel('');
                          setTableAction({ mode: 'transfer', source: t });
                        }}
                      >
                        🔄 Trocar
                      </button>
                      {openTabs.length > 1 && (
                        <button
                          type="button"
                          className="b g sm"
                          title="Juntar com outra mesa aberta"
                          onClick={() => {
                            setTargetMergeTabId('');
                            setTableAction({ mode: 'merge', source: t });
                          }}
                        >
                          🔗 Juntar
                        </button>
                      )}
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => {
                          setSelectedTableLabel(t.table_label);
                          setClientName(t.opened_by || '');
                          setShowNewOrder(true);
                        }}
                      >
                        + Pedir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PASSAR MESA PARA OUTRO GARÇOM */}
      {handoffTable && (
        <div className="ov" onClick={() => setHandoffTable(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">👥 Passar {handoffTable.table_label}</h2>
            <p className="mu text-xs mb-2">
              Atual responsável: <b>{getTableOwner(handoffTable.table_label) || 'Nenhum'}</b>. Escolha
              outro garçom do turno ou libere a mesa para a fila livre do salão.
            </p>
            {staffSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {staffSuggestions.map((nm) => (
                  <button
                    key={nm}
                    type="button"
                    className={`b sm ${handoffTargetName === nm ? '' : 'g'}`}
                    onClick={() => setHandoffTargetName(nm)}
                  >
                    👤 {nm}
                  </button>
                ))}
              </div>
            )}
            <label>Ou digite o nome do garçom</label>
            <input
              value={handoffTargetName}
              onChange={(e) => setHandoffTargetName(e.target.value)}
              placeholder="Ex: Carlos, Fernanda..."
              maxLength={40}
            />
            <div className="grid grid-cols-1 gap-2 mt-3">
              <button
                type="button"
                className="b ok"
                disabled={!handoffTargetName.trim()}
                onClick={async () => {
                  await assignTableWaiter(handoffTable.table_label, handoffTargetName.trim());
                  setHandoffTable(null);
                }}
              >
                ✓ Transferir mesa para {handoffTargetName.trim() || '...'}
              </button>
              <button
                type="button"
                className="b g"
                onClick={async () => {
                  await assignTableWaiter(handoffTable.table_label, null);
                  setHandoffTable(null);
                }}
              >
                🆓 Liberar mesa para qualquer garçom
              </button>
              <button type="button" className="b g" onClick={() => setHandoffTable(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERIR OU JUNTAR MESAS */}
      {tableAction && (
        <div className="ov" onClick={() => !submitting && setTableAction(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">
              {tableAction.mode === 'transfer'
                ? `🔄 Transferir ${tableAction.source.table_label}`
                : `🔗 Juntar ${tableAction.source.table_label} com outra mesa`}
            </h2>
            {tableAction.mode === 'transfer' ? (
              <>
                <label>Nova mesa de destino</label>
                <select
                  value={targetTableLabel}
                  onChange={(e) => setTargetTableLabel(e.target.value)}
                >
                  <option value="">Selecione a mesa…</option>
                  {(bar.table_names || ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5'])
                    .filter((nm) => nm !== tableAction.source.table_label)
                    .map((nm) => (
                      <option key={nm} value={nm}>
                        {nm}
                      </option>
                    ))}
                </select>
              </>
            ) : (
              <>
                <label>Unir todos os pedidos e pessoas com:</label>
                <select
                  value={targetMergeTabId}
                  onChange={(e) => setTargetMergeTabId(e.target.value)}
                >
                  <option value="">Selecione a mesa aberta…</option>
                  {openTabs
                    .filter((ot) => ot.id !== tableAction.source.id)
                    .map((ot) => (
                      <option key={ot.id} value={ot.id}>
                        {ot.table_label} (Cód {ot.code})
                      </option>
                    ))}
                </select>
              </>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" className="b g" onClick={() => setTableAction(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="b ok"
                disabled={submitting}
                onClick={() => void handleConfirmTableAction()}
              >
                {submitting ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
