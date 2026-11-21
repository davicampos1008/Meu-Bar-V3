import React, { useMemo, useState } from 'react';
import {
  broadcastBarOpsSync,
  buildCustomerDeliveryWhatsAppLink,
  buildMapsSearchUrl,
  buildMotoboyWhatsAppLink,
  DELIVERY_PAYMENT_LABELS,
  deliveryMenuUrl,
  getBarOpsData,
  getDeliveryConfig,
  logBarAudit,
  parseDeliveryOrderMeta,
  printDeliveryTicket,
  saveBarOpsData,
  type DeliveryOrderGroup,
} from '../lib/opsUtils';
import { sb } from '../lib/supabase';
import { money } from '../lib/utils';
import type {
  Bar,
  DeliveryConfig,
  DeliveryCourier,
  DeliveryDispatchRecord,
  DeliveryPaymentOption,
  DeliveryStage,
  Order,
  Recipe,
} from '../types/meubar';

interface DeliveryProViewProps {
  bar: Bar;
  role?: string | null;
  actorName?: string;
  orders: Order[];
  recipes: Recipe[];
  prices: Record<string, number>;
  onBarUpdated: (bar: Bar) => void;
  onRefreshOrders: () => Promise<void>;
  onBackMore: () => void;
  onToast: (msg: string) => void;
}

const STAGE_META: Record<
  DeliveryStage,
  { label: string; badgeClass: string; customerMsg: string }
> = {
  received: {
    label: '🆕 Recebido',
    badgeClass: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
    customerMsg: '✅ Recebemos o seu pedido e já estamos conferindo!',
  },
  preparing: {
    label: '👨‍🍳 Em preparo',
    badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
    customerMsg: '👨‍🍳 Seu pedido já está sendo preparado no bar/cozinha!',
  },
  ready_for_courier: {
    label: '📦 Pronto p/ envio',
    badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
    customerMsg: '📦 Seu pedido ficou pronto e está aguardando o motoboy retirar!',
  },
  out_for_delivery: {
    label: '🛵 Saiu para entrega',
    badgeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    customerMsg: '🛵 Seu pedido saiu para entrega! Em breve o motoboy chega no endereço.',
  },
  delivered: {
    label: '✅ Entregue',
    badgeClass: 'bg-white/10 text-white/70 border-white/20',
    customerMsg: '✅ Pedido entregue! Muito obrigado pela preferência.',
  },
  cancelled: {
    label: '❌ Cancelado',
    badgeClass: 'bg-red-500/20 text-red-200 border-red-400/40',
    customerMsg: '❌ Seu pedido precisou ser cancelado. Entre em contato conosco.',
  },
};

function computeEffectiveStage(group: DeliveryOrderGroup): DeliveryStage {
  const disp = group.dispatch?.stage;
  if (disp === 'cancelled' || disp === 'delivered') return disp;
  const allDone = group.orders.every((o) => o.status === 'done');
  if (allDone) return 'delivered';
  if (disp === 'out_for_delivery') return 'out_for_delivery';
  const allReady = group.orders.every((o) => o.status === 'ready' || o.status === 'done');
  if (allReady) return 'ready_for_courier';
  if (disp === 'preparing') return 'preparing';
  return 'received';
}

export const DeliveryProView: React.FC<DeliveryProViewProps> = ({
  bar,
  role,
  actorName = 'Equipe',
  orders,
  recipes,
  prices,
  onBarUpdated,
  onRefreshOrders,
  onBackMore,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'orders' | 'couriers' | 'config'>('orders');
  const [showDelivered, setShowDelivered] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [dispatchModalGroup, setDispatchModalGroup] = useState<DeliveryOrderGroup | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [customCourierName, setCustomCourierName] = useState('');
  const [customCourierPhone, setCustomCourierPhone] = useState('');

  // Courier form
  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierPhone, setNewCourierPhone] = useState('');
  const [newCourierVehicle, setNewCourierVehicle] = useState('Moto');
  const [savingCourier, setSavingCourier] = useState(false);

  // Delivery config state
  const currentCfg = useMemo(() => getDeliveryConfig(bar), [bar]);
  const [cfg, setCfg] = useState<DeliveryConfig>(currentCfg);
  const [savingCfg, setSavingCfg] = useState(false);

  const ops = useMemo(() => getBarOpsData(bar), [bar]);
  const couriers = ops.delivery_couriers || [];
  const activeCouriers = useMemo(() => couriers.filter((c) => c.active), [couriers]);
  const dispatches = ops.delivery_dispatches || {};

  const recipeNames = useMemo(() => {
    const map: Record<string, string> = {};
    recipes.forEach((r) => {
      map[r.id] = r.name;
    });
    return map;
  }, [recipes]);

  const deliveryGroups = useMemo<DeliveryOrderGroup[]>(() => {
    const byCode = new Map<string, DeliveryOrderGroup>();
    orders.forEach((o) => {
      const meta = parseDeliveryOrderMeta(o);
      if (!meta) return;
      const unit = Number(o.unit_price ?? o.price ?? prices[o.recipe_id] ?? 0);
      const lineTotal = unit * (Number(o.qty) || 1);
      const existing = byCode.get(meta.code);
      const ordCreatedAt = o.created_at || new Date().toISOString();
      if (!existing) {
        byCode.set(meta.code, {
          code: meta.code,
          mode: meta.mode,
          clientName: o.client_name || o.customer_name || 'Cliente',
          phone: meta.phone,
          address: meta.address,
          payment: meta.payment,
          changeFor: meta.changeFor,
          fee: meta.fee,
          subtotal: lineTotal,
          total: lineTotal + meta.fee,
          createdAt: ordCreatedAt,
          orders: [o],
          dispatch: dispatches[meta.code],
        });
      } else {
        existing.orders.push(o);
        existing.subtotal = Math.round((existing.subtotal + lineTotal) * 100) / 100;
        existing.total = Math.round((existing.subtotal + existing.fee) * 100) / 100;
        if (!existing.phone && meta.phone) existing.phone = meta.phone;
        if (ordCreatedAt < existing.createdAt) existing.createdAt = ordCreatedAt;
      }
    });
    return Array.from(byCode.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders, prices, dispatches]);

  const activeGroups = useMemo(
    () =>
      deliveryGroups.filter((g) => {
        const st = computeEffectiveStage(g);
        return st !== 'delivered' && st !== 'cancelled';
      }),
    [deliveryGroups]
  );

  const completedGroups = useMemo(
    () =>
      deliveryGroups.filter((g) => {
        const st = computeEffectiveStage(g);
        return st === 'delivered' || st === 'cancelled';
      }),
    [deliveryGroups]
  );

  const visibleGroups = showDelivered ? deliveryGroups : activeGroups;

  const updateDispatch = async (
    group: DeliveryOrderGroup,
    patch: Partial<DeliveryDispatchRecord>,
    orderStatusUpdate?: 'ready' | 'done'
  ) => {
    setBusyCode(group.code);
    try {
      const ids = group.orders.map((o) => o.id);
      if (orderStatusUpdate && ids.length > 0) {
        const dbPatch: Record<string, unknown> = { status: orderStatusUpdate };
        if (orderStatusUpdate === 'ready') dbPatch.ready_at = new Date().toISOString();
        let res = await sb.from('orders').update(dbPatch).in('id', ids);
        if (res.error && orderStatusUpdate === 'ready') {
          await sb.from('orders').update({ status: orderStatusUpdate }).in('id', ids);
        }
      }

      const curDispatches = getBarOpsData(bar).delivery_dispatches || {};
      const prev = curDispatches[group.code];
      const nextRec: DeliveryDispatchRecord = {
        code: group.code,
        stage: patch.stage || prev?.stage || 'received',
        courier_id: patch.courier_id !== undefined ? patch.courier_id : prev?.courier_id,
        courier_name: patch.courier_name !== undefined ? patch.courier_name : prev?.courier_name,
        courier_phone: patch.courier_phone !== undefined ? patch.courier_phone : prev?.courier_phone,
        dispatched_at: patch.dispatched_at || prev?.dispatched_at,
        delivered_at: patch.delivered_at || prev?.delivered_at,
        updated_by: actorName,
        updated_at: new Date().toISOString(),
      };
      const nextMap = { ...curDispatches, [group.code]: nextRec };
      await saveBarOpsData(bar, { delivery_dispatches: nextMap }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      await onRefreshOrders();
    } finally {
      setBusyCode(null);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchModalGroup) return;
    const picked = couriers.find((c) => c.id === selectedCourierId);
    const cName = picked ? picked.name : customCourierName.trim();
    const cPhone = picked ? picked.phone : customCourierPhone.trim();
    if (!cName) {
      onToast('Selecione um motoboy cadastrado ou digite o nome do entregador.');
      return;
    }
    await updateDispatch(
      dispatchModalGroup,
      {
        stage: 'out_for_delivery',
        courier_id: picked?.id,
        courier_name: cName,
        courier_phone: cPhone,
        dispatched_at: new Date().toISOString(),
      },
      'ready'
    );
    await logBarAudit(
      bar,
      'Despacho de Delivery',
      `Pedido #${dispatchModalGroup.code} (${dispatchModalGroup.clientName}) enviado com ${cName}`,
      actorName,
      role || 'staff',
      onBarUpdated
    );
    onToast(`Pedido #${dispatchModalGroup.code} despachado com ${cName}!`);
    setDispatchModalGroup(null);
  };

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName.trim()) {
      onToast('Informe o nome do motoboy.');
      return;
    }
    setSavingCourier(true);
    try {
      const nextCourier: DeliveryCourier = {
        id: 'mot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: newCourierName.trim(),
        phone: newCourierPhone.trim(),
        vehicle: newCourierVehicle.trim() || 'Moto',
        active: true,
      };
      const nextList = [nextCourier, ...couriers];
      await saveBarOpsData(bar, { delivery_couriers: nextList }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      setNewCourierName('');
      setNewCourierPhone('');
      setNewCourierVehicle('Moto');
      onToast(`Motoboy ${nextCourier.name} cadastrado!`);
    } finally {
      setSavingCourier(false);
    }
  };

  const handleToggleCourier = async (id: string) => {
    const nextList = couriers.map((c) => (c.id === id ? { ...c, active: !c.active } : c));
    await saveBarOpsData(bar, { delivery_couriers: nextList }, onBarUpdated);
    void broadcastBarOpsSync(bar.id);
  };

  const handleRemoveCourier = async (id: string) => {
    const nextList = couriers.filter((c) => c.id !== id);
    await saveBarOpsData(bar, { delivery_couriers: nextList }, onBarUpdated);
    void broadcastBarOpsSync(bar.id);
    onToast('Motoboy removido.');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      await saveBarOpsData(bar, { delivery_config: cfg }, onBarUpdated);
      void broadcastBarOpsSync(bar.id);
      onToast(
        cfg.enabled
          ? 'Delivery Direto salvo e ativado no link externo!'
          : 'Configurações de Delivery salvas!'
      );
    } finally {
      setSavingCfg(false);
    }
  };

  const togglePayMethod = (opt: DeliveryPaymentOption) => {
    setCfg((prev) => {
      const has = prev.payment_methods.includes(opt);
      const next = has
        ? prev.payment_methods.filter((x) => x !== opt)
        : [...prev.payment_methods, opt];
      return { ...prev, payment_methods: next.length > 0 ? next : [opt] };
    });
  };

  const directLink = deliveryMenuUrl(bar.id, 'delivery');

  const copyDeliveryLink = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      onToast('Link do App de Delivery copiado! Cole no Instagram ou WhatsApp.');
    } catch {
      onToast('Copie o link exibido no campo abaixo.');
    }
  };

  return (
    <div className="space-y-3 pb-8">
      <div className="row sp">
        <div>
          <h1 className="!mb-0">🛵 Delivery & Motoboys</h1>
          <p className="mu text-xs !mt-0.5">
            Pedido direto sem comissão · Bar/Cozinha → Despacho → Rota no WhatsApp do Motoboy
          </p>
        </div>
        <button type="button" className="b g sm" onClick={onBackMore}>
          ← Voltar
        </button>
      </div>

      {/* Status rápido + Link externo */}
      <div className="card !border-[var(--ac)]/40">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--ac)]">
              {currentCfg.enabled ? '🟢 Delivery Próprio ATIVO' : '⚪ Delivery Próprio DESATIVADO'}
            </div>
            <div className="text-xs text-[var(--mut)] mt-0.5">
              Taxa: <b>{money(currentCfg.delivery_fee)}</b> · Mínimo:{' '}
              <b>{money(currentCfg.min_order_value)}</b> · Prazo: <b>{currentCfg.eta_minutes}</b>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button type="button" className="b sm" onClick={() => void copyDeliveryLink()}>
              🔗 Copiar Link Delivery
            </button>
            <a
              href={directLink}
              target="_blank"
              rel="noopener noreferrer"
              className="b g sm no-underline"
            >
              👁️ Abrir App Delivery
            </a>
          </div>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="chips !flex-wrap !overflow-visible">
        <button
          type="button"
          className={`chip ${subTab === 'orders' ? 'on' : ''}`}
          onClick={() => setSubTab('orders')}
        >
          📦 Pedidos ({activeGroups.length})
        </button>
        <button
          type="button"
          className={`chip ${subTab === 'couriers' ? 'on' : ''}`}
          onClick={() => setSubTab('couriers')}
        >
          🛵 Motoboys ({activeCouriers.length})
        </button>
        <button
          type="button"
          className={`chip ${subTab === 'config' ? 'on' : ''}`}
          onClick={() => setSubTab('config')}
        >
          ⚙️ Configurar Delivery & Link
        </button>
      </div>

      {/* ABA 1: FILA DE PEDIDOS DELIVERY */}
      {subTab === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-[var(--mut)]">
              Ativos: <b>{activeGroups.length}</b> · Finalizados hoje: <b>{completedGroups.length}</b>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="b g sm"
                onClick={() => setShowDelivered((v) => !v)}
              >
                {showDelivered ? 'Ocultar finalizados' : `Ver finalizados (${completedGroups.length})`}
              </button>
              <button type="button" className="b g sm" onClick={() => void onRefreshOrders()}>
                ↻ Atualizar
              </button>
            </div>
          </div>

          {!currentCfg.enabled && (
            <div className="panel !border-amber-400/50 bg-amber-500/10 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-amber-200">
                <b>Delivery ainda desligado!</b> Ative na aba <b>⚙️ Configurar Delivery</b> para seus
                clientes pedirem pelo link externo.
              </div>
              <button type="button" className="b sm" onClick={() => setSubTab('config')}>
                Ativar agora
              </button>
            </div>
          )}

          {visibleGroups.length === 0 ? (
            <div className="card">
              <div className="empty !py-8">
                Nenhum pedido de Delivery ou Retirada {showDelivered ? 'registrado' : 'em aberto'} no
                momento.
                <br />
                <span className="text-xs text-[var(--mut)]">
                  Compartilhe o Link de Delivery no Instagram ou WhatsApp para receber pedidos aqui em
                  tempo real.
                </span>
              </div>
            </div>
          ) : (
            visibleGroups.map((g) => {
              const stage = computeEffectiveStage(g);
              const metaStage = STAGE_META[stage];
              const isBusy = busyCode === g.code;
              const mapsHref = buildMapsSearchUrl(g.address, bar.city);
              const courierPhone = g.dispatch?.courier_phone || '';
              const courierWaHref = courierPhone
                ? buildMotoboyWhatsAppLink(courierPhone, bar, g, recipeNames)
                : '';
              const customerWaHref = g.phone
                ? buildCustomerDeliveryWhatsAppLink(g.phone, bar, g, metaStage.customerMsg)
                : '';

              return (
                <div
                  key={g.code}
                  className={`card space-y-2.5 ${
                    stage === 'ready_for_courier'
                      ? '!border-purple-400/60'
                      : stage === 'out_for_delivery'
                        ? '!border-emerald-400/60'
                        : stage === 'received'
                          ? '!border-sky-400/60'
                          : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold">
                          {g.mode === 'pickup' ? '🛍️ RETIRADA' : '🛵 DELIVERY'} #{g.code}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${metaStage.badgeClass}`}
                        >
                          {metaStage.label}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--mut)] mt-0.5">
                        Cliente: <b className="text-[var(--txt)]">{g.clientName}</b>
                        {g.phone ? ` · 📱 ${g.phone}` : ''} ·{' '}
                        {new Date(g.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-[var(--ok)]">
                        {money(g.total)}
                      </div>
                      <div className="text-[11px] text-[var(--mut)]">
                        {g.payment}
                        {g.changeFor ? ` · Troco p/ ${g.changeFor}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Endereço + Google Maps */}
                  <div className="rounded-xl bg-[var(--bg2)] border border-[var(--bd)] p-2.5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs">
                      <span className="text-[var(--mut)]">
                        {g.mode === 'pickup' ? 'Modalidade:' : '📍 Endereço de entrega:'}
                      </span>{' '}
                      <b>{g.address}</b>
                    </div>
                    {g.mode === 'delivery' && g.address && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="b g sm no-underline !py-1"
                      >
                        🗺️ Ver no Maps
                      </a>
                    )}
                  </div>

                  {/* Itens do pedido */}
                  <div className="space-y-1">
                    {g.orders.map((o) => {
                      const itemMeta = parseDeliveryOrderMeta(o);
                      return (
                        <div
                          key={o.id}
                          className="flex items-center justify-between gap-2 text-xs px-2 py-1 rounded-lg bg-black/20"
                        >
                          <div>
                            <b>
                              {o.qty || 1}x {o.recipe_name || recipeNames[o.recipe_id] || 'Item'}
                            </b>
                            {itemMeta?.cleanItemNote && (
                              <span className="text-[var(--ac)] ml-1.5">
                                ({itemMeta.cleanItemNote})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--mut)]">
                            {o.status === 'done'
                              ? '✅'
                              : o.status === 'ready'
                                ? '📦 Pronto'
                                : '⏳ Preparando'}
                          </span>
                        </div>
                      );
                    })}
                    {g.fee > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-[var(--mut)] px-2">
                        <span>Taxa de entrega</span>
                        <span>{money(g.fee)}</span>
                      </div>
                    )}
                  </div>

                  {/* Motoboy atribuído */}
                  {g.dispatch?.courier_name && (
                    <div className="rounded-xl px-2.5 py-2 bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs text-emerald-100">
                        🛵 Motoboy: <b>{g.dispatch.courier_name}</b>
                        {g.dispatch.courier_phone ? ` (${g.dispatch.courier_phone})` : ''}
                      </div>
                      {courierWaHref && (
                        <a
                          href={courierWaHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="b ok sm no-underline !py-1"
                        >
                          📲 Enviar rota p/ Motoboy
                        </a>
                      )}
                    </div>
                  )}

                  {/* Ações operacionais */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--bd)]">
                    {stage === 'received' && (
                      <button
                        type="button"
                        className="b sm"
                        disabled={isBusy}
                        onClick={() => void updateDispatch(g, { stage: 'preparing' })}
                      >
                        👨‍🍳 Aceitar & Preparar
                      </button>
                    )}

                    {(stage === 'received' || stage === 'preparing') && (
                      <button
                        type="button"
                        className="b ok sm"
                        disabled={isBusy}
                        onClick={() =>
                          void updateDispatch(g, { stage: 'ready_for_courier' }, 'ready')
                        }
                      >
                        📦 Marcar Pronto
                      </button>
                    )}

                    {g.mode === 'delivery' &&
                      (stage === 'received' ||
                        stage === 'preparing' ||
                        stage === 'ready_for_courier') && (
                        <button
                          type="button"
                          className="b ok sm"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedCourierId(activeCouriers[0]?.id || '');
                            setCustomCourierName('');
                            setCustomCourierPhone('');
                            setDispatchModalGroup(g);
                          }}
                        >
                          🛵 Despachar p/ Motoboy
                        </button>
                      )}

                    {stage !== 'delivered' && stage !== 'cancelled' && (
                      <button
                        type="button"
                        className={`b sm ${
                          stage === 'out_for_delivery' || g.mode === 'pickup' ? 'ok' : 'g'
                        }`}
                        disabled={isBusy}
                        onClick={() =>
                          void updateDispatch(
                            g,
                            { stage: 'delivered', delivered_at: new Date().toISOString() },
                            'done'
                          )
                        }
                      >
                        ✅ Concluir Entrega
                      </button>
                    )}

                    {customerWaHref && (
                      <a
                        href={customerWaHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="b g sm no-underline"
                      >
                        💬 WhatsApp Cliente
                      </a>
                    )}

                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => printDeliveryTicket({ bar, group: g, recipeNames })}
                    >
                      🖨️ Etiqueta
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ABA 2: CADASTRO DE MOTOBOYS */}
      {subTab === 'couriers' && (
        <div className="space-y-3">
          <form className="card" onSubmit={(e) => void handleAddCourier(e)}>
            <h3>➕ Cadastrar Motoboy (Próprio ou Parceiro)</h3>
            <p className="sub">
              Cadastre seus entregadores fixos ou motoboys parceiros do bairro para despachar rotas
              em 1 clique pelo WhatsApp com endereço + link do Google Maps + valor a cobrar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label>Nome do motoboy</label>
                <input
                  value={newCourierName}
                  onChange={(e) => setNewCourierName(e.target.value)}
                  placeholder="Ex: Lucas Motoboy"
                  maxLength={40}
                />
              </div>
              <div>
                <label>WhatsApp (DDD + número)</label>
                <input
                  value={newCourierPhone}
                  onChange={(e) => setNewCourierPhone(e.target.value)}
                  placeholder="Ex: 11999998888"
                  maxLength={20}
                />
              </div>
              <div>
                <label>Veículo / Obs</label>
                <input
                  value={newCourierVehicle}
                  onChange={(e) => setNewCourierVehicle(e.target.value)}
                  placeholder="Ex: Moto CG · Bag térmica"
                  maxLength={40}
                />
              </div>
            </div>
            <button type="submit" className="b mt-3" disabled={savingCourier}>
              {savingCourier ? 'Salvando...' : '➕ Cadastrar Motoboy'}
            </button>
          </form>

          <div className="card">
            <h3>🛵 Motoboys cadastrados ({couriers.length})</h3>
            {couriers.length === 0 ? (
              <div className="empty !py-5">
                Nenhum motoboy cadastrado ainda. Você também pode digitar um entregador avulso (ou
                chamar Uber Flash / 99 Entrega) na hora de despachar.
              </div>
            ) : (
              <div className="space-y-2">
                {couriers.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl p-2.5 bg-[var(--bg2)] border border-[var(--bd)] flex items-center justify-between gap-2 flex-wrap"
                  >
                    <div>
                      <div className="text-sm font-bold">
                        {c.active ? '🟢' : '⚪'} {c.name}{' '}
                        {c.vehicle && (
                          <span className="text-xs font-normal text-[var(--mut)]">
                            · {c.vehicle}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--mut)]">
                        WhatsApp: {c.phone || 'Não informado'}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => void handleToggleCourier(c.id)}
                      >
                        {c.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="b dn sm"
                        onClick={() => void handleRemoveCourier(c.id)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: CONFIGURAÇÕES DE DELIVERY & LINK EXTERNO */}
      {subTab === 'config' && (
        <form className="card space-y-3" onSubmit={(e) => void handleSaveConfig(e)}>
          <h3>⚙️ Configurar Delivery Próprio (0% comissão)</h3>
          <p className="sub">
            Seus clientes abrem um link exclusivo do seu bar (sem precisar baixar app), montam a
            sacola de drinks/petiscos/avulsos, informam endereço e o pedido cai direto no Bar, na
            Cozinha e neste painel!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="!mt-0 flex items-center gap-2 rounded-xl p-3 bg-[var(--bg2)] border border-[var(--bd)] cursor-pointer">
              <input
                type="checkbox"
                className="!w-4 !h-4"
                checked={cfg.enabled}
                onChange={(e) => setCfg((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              <span className="text-xs font-bold text-[var(--txt)]">
                🛵 Ativar pedidos de Delivery externo
              </span>
            </label>
            <label className="!mt-0 flex items-center gap-2 rounded-xl p-3 bg-[var(--bg2)] border border-[var(--bd)] cursor-pointer">
              <input
                type="checkbox"
                className="!w-4 !h-4"
                checked={cfg.allow_pickup}
                onChange={(e) => setCfg((prev) => ({ ...prev, allow_pickup: e.target.checked }))}
              />
              <span className="text-xs font-bold text-[var(--txt)]">
                🛍️ Permitir Retirada no Balcão (sem taxa)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label>Taxa fixa de entrega (R$)</label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={cfg.delivery_fee}
                onChange={(e) =>
                  setCfg((prev) => ({ ...prev, delivery_fee: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
            </div>
            <div>
              <label>Pedido mínimo (R$)</label>
              <input
                type="number"
                step="1"
                min={0}
                value={cfg.min_order_value}
                onChange={(e) =>
                  setCfg((prev) => ({
                    ...prev,
                    min_order_value: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
              />
            </div>
            <div>
              <label>Tempo estimado</label>
              <input
                value={cfg.eta_minutes}
                onChange={(e) => setCfg((prev) => ({ ...prev, eta_minutes: e.target.value }))}
                placeholder="Ex: 35-50 min"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label>Bairros atendidos / Aviso de entrega</label>
              <input
                value={cfg.areas_note || ''}
                onChange={(e) => setCfg((prev) => ({ ...prev, areas_note: e.target.value }))}
                placeholder="Ex: Centro, Vila Nova e raio de 5km"
              />
            </div>
            <div>
              <label>WhatsApp da loja (para dúvidas do cliente)</label>
              <input
                value={cfg.whatsapp_phone || ''}
                onChange={(e) => setCfg((prev) => ({ ...prev, whatsapp_phone: e.target.value }))}
                placeholder="Ex: 11999998888"
              />
            </div>
          </div>

          <div>
            <label>Formas de pagamento aceitas na entrega (presencial)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Object.keys(DELIVERY_PAYMENT_LABELS) as DeliveryPaymentOption[]).map((opt) => {
                const active = cfg.payment_methods.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`b sm ${active ? '' : 'g'}`}
                    onClick={() => togglePayMethod(opt)}
                  >
                    {active ? '✓ ' : '+ '}
                    {DELIVERY_PAYMENT_LABELS[opt]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl p-3 bg-[var(--bg2)] border border-[var(--bd)] space-y-1.5">
            <div className="text-xs font-bold text-[var(--ac)]">
              🔗 Link Externo do seu App de Delivery (coloque na Bio do Instagram e WhatsApp)
            </div>
            <input readOnly value={directLink} className="text-xs font-mono" />
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" className="b sm" onClick={() => void copyDeliveryLink()}>
                📋 Copiar link
              </button>
              <a
                href={directLink}
                target="_blank"
                rel="noopener noreferrer"
                className="b g sm no-underline"
              >
                👁️ Testar como cliente
              </a>
            </div>
          </div>

          <button type="submit" className="b ok w-full" disabled={savingCfg}>
            {savingCfg ? 'Salvando...' : '💾 Salvar Configurações de Delivery'}
          </button>
        </form>
      )}

      {/* MODAL DESPACHAR PARA MOTOBOY */}
      {dispatchModalGroup && (
        <div className="ov" onClick={() => setDispatchModalGroup(null)}>
          <div className="w narrow space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">🛵 Despachar Pedido #{dispatchModalGroup.code}</h2>
            <p className="mu text-xs !mb-0">
              Cliente: <b>{dispatchModalGroup.clientName}</b> · {dispatchModalGroup.address} ·{' '}
              <b>{money(dispatchModalGroup.total)}</b> ({dispatchModalGroup.payment})
            </p>

            {activeCouriers.length > 0 && (
              <div>
                <label className="!mt-0">Escolha um motoboy cadastrado</label>
                <div className="grid grid-cols-1 gap-1.5 mt-1">
                  {activeCouriers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`b sm !justify-between ${selectedCourierId === c.id ? '' : 'g'}`}
                      onClick={() => {
                        setSelectedCourierId(c.id);
                        setCustomCourierName('');
                        setCustomCourierPhone('');
                      }}
                    >
                      <span>
                        🛵 {c.name} {c.vehicle ? `(${c.vehicle})` : ''}
                      </span>
                      <span className="text-[11px] opacity-80">{c.phone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-[var(--bd)] pt-2">
              <label className="!mt-0">
                Ou entregador avulso / Uber Flash / 99 Entrega
              </label>
              <input
                value={customCourierName}
                onChange={(e) => {
                  setCustomCourierName(e.target.value);
                  if (e.target.value.trim()) setSelectedCourierId('');
                }}
                placeholder="Nome do motoboy ou app (ex: Uber Flash - Marcos)"
              />
              <input
                className="mt-1.5"
                value={customCourierPhone}
                onChange={(e) => setCustomCourierPhone(e.target.value)}
                placeholder="WhatsApp do motoboy (opcional, para enviar rota)"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="b g"
                onClick={() => setDispatchModalGroup(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="b ok"
                disabled={busyCode === dispatchModalGroup.code}
                onClick={() => void handleConfirmDispatch()}
              >
                🛵 Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
