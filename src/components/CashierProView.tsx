import React, { useMemo, useState } from 'react';
import {
  applyLoyaltyOnSale,
  buildPixBrCode,
  canRoleDo,
  findLoyaltyCustomer,
  getActiveCashShift,
  getBarOpsData,
  getLoyaltyConfig,
  logBarAudit,
  PAYMENT_METHOD_LABELS,
  printCustomerBill,
  saveBarOpsData,
} from '../lib/opsUtils';
import { sb } from '../lib/supabase';
import { estimateRecipeCost, getRecipeItemType, money, norm } from '../lib/utils';
import type {
  Bar,
  BarItem,
  CashMovement,
  CashRegisterShift,
  CashSaleRecord,
  Order,
  PaymentMethod,
  PaymentSplit,
  Recipe,
  TableCallAlert,
  TableTab,
} from '../types/meubar';

interface CustomerTabItem {
  orderId: string;
  recipeId: string;
  recipeName: string;
  clientName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  cmv: number;
}

interface CustomerTab {
  key: string;
  name: string;
  isTable: boolean;
  tableTabId?: string;
  tableCode?: string;
  members: string[];
  total: number;
  cmvTotal: number;
  ids: string[];
  items: CustomerTabItem[];
  byMember: Record<string, number>;
}

export const CashierProView: React.FC<{
  bar: Bar;
  role: string | null;
  actorName: string;
  orders: Order[];
  tableTabs?: TableTab[];
  tableCalls?: TableCallAlert[];
  recipes: Recipe[];
  items?: BarItem[];
  prices: Record<string, number>;
  hasPricing: boolean;
  settledIds: Set<string>;
  onSettled: (ids: string[]) => void;
  onBarUpdated: (bar: Bar) => void;
  onRefreshOrders: () => Promise<void>;
  onRefreshTableTabs?: () => Promise<void>;
  onResolveCall?: (id: string) => Promise<void>;
  onGoManagement?: (
    subtab?:
      | 'dashboard'
      | 'compras'
      | 'happyhour'
      | 'fidelidade'
      | 'reservas'
      | 'modificadores'
      | 'config'
  ) => void;
  onBackMore: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  role,
  actorName,
  orders,
  tableTabs = [],
  tableCalls = [],
  recipes,
  items = [],
  prices,
  hasPricing,
  settledIds,
  onSettled,
  onBarUpdated,
  onRefreshOrders,
  onRefreshTableTabs,
  onResolveCall,
  onGoManagement,
  onBackMore,
  onToast,
}) => {
  const [clientFilter, setClientFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Shift states
  const ops = useMemo(() => getBarOpsData(bar), [bar]);
  const activeShift = useMemo(() => getActiveCashShift(bar), [bar]);
  const [showShiftModal, setShowShiftModal] = useState<null | 'open' | 'move' | 'close'>(null);
  const [openingFloatStr, setOpeningFloatStr] = useState('150');
  const [moveType, setMoveType] = useState<'sangria' | 'suprimento'>('sangria');
  const [moveAmountStr, setMoveAmountStr] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [closingCountedStr, setClosingCountedStr] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Payment / Checkout modal state (100% presencial — maquininha / dinheiro / pix direto)
  const [checkoutTab, setCheckoutTab] = useState<CustomerTab | null>(null);
  const [includeServiceFee, setIncludeServiceFee] = useState(true);
  const [serviceFeePct, setServiceFeePct] = useState<number>(ops.default_service_fee_pct ?? 10);
  const [discountType, setDiscountType] = useState<'brl' | 'pct'>('brl');
  const [discountValStr, setDiscountValStr] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [splitPeople, setSplitPeople] = useState(1);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('credito');
  const [cashReceivedStr, setCashReceivedStr] = useState('');
  const [mixedSplits, setMixedSplits] = useState<Record<Exclude<PaymentMethod, 'misto'>, string>>({
    pix: '',
    credito: '',
    debito: '',
    dinheiro: '',
  });
  const [showPixQr, setShowPixQr] = useState(false);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState<{
    clientName: string;
    stamps?: number;
    cashback?: number;
  } | null>(null);
  const loyaltyCfg = useMemo(() => getLoyaltyConfig(bar), [bar]);

  // Cancel item state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<{
    orderId: string;
    label: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const canDiscount = canRoleDo(bar, role, 'can_discount');
  const canCancel = canRoleDo(bar, role, 'can_cancel_order');
  const canCloseShift = canRoleDo(bar, role, 'can_close_shift');

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const openOrders = orders.filter((o) => !o.paid && !settledIds.has(o.id));
  const openTabsById = new Map(tableTabs.map((t) => [t.id, t]));
  const openTabsByLabel = new Map(tableTabs.map((t) => [norm(t.table_label), t]));

  const { allCustomers, grandTotal } = useMemo(() => {
    const grouped: Record<string, CustomerTab> = {};
    let gTotal = 0;

    tableTabs.forEach((t) => {
      const key = `tab:${t.id}`;
      grouped[key] = {
        key,
        name: t.table_label,
        isTable: true,
        tableTabId: t.id,
        tableCode: t.code,
        members: Array.isArray(t.members) ? [...t.members] : [t.opened_by],
        total: 0,
        cmvTotal: 0,
        ids: [],
        items: [],
        byMember: {},
      };
    });

    openOrders.forEach((o) => {
      const rawName = (o.client_name || o.customer_name || 'Cliente').trim();
      const matchedTab =
        (o.table_tab_id && openTabsById.get(o.table_tab_id)) ||
        (o.table_label ? openTabsByLabel.get(norm(o.table_label)) : undefined);

      const rec = recipeById.get(o.recipe_id);
      const rName = o.recipe_name || rec?.name || 'Item';
      const unit =
        o.price != null
          ? Number(o.price)
          : o.unit_price != null
            ? Number(o.unit_price)
            : o.recipe_id && prices[o.recipe_id] != null
              ? Number(prices[o.recipe_id])
              : 0;
      const qty = Number(o.qty) || 1;
      const line = qty * unit;
      const estCmv = rec ? estimateRecipeCost(rec, items, bar) * qty : (Number(bar.base_cost) || 0) * qty;
      gTotal += line;

      const itemEntry: CustomerTabItem = {
        orderId: o.id,
        recipeId: o.recipe_id,
        recipeName: rName,
        clientName: rawName,
        qty,
        unitPrice: unit,
        lineTotal: line,
        cmv: estCmv,
      };

      if (matchedTab) {
        const key = `tab:${matchedTab.id}`;
        if (!grouped[key]) {
          grouped[key] = {
            key,
            name: matchedTab.table_label,
            isTable: true,
            tableTabId: matchedTab.id,
            tableCode: matchedTab.code,
            members: Array.isArray(matchedTab.members) ? [...matchedTab.members] : [],
            total: 0,
            cmvTotal: 0,
            ids: [],
            items: [],
            byMember: {},
          };
        }
        if (rawName && !grouped[key].members.some((m) => norm(m) === norm(rawName))) {
          grouped[key].members.push(rawName);
        }
        grouped[key].total += line;
        grouped[key].cmvTotal += estCmv;
        grouped[key].ids.push(o.id);
        grouped[key].items.push(itemEntry);
        grouped[key].byMember[rawName] = (grouped[key].byMember[rawName] || 0) + line;
        return;
      }

      const key = `client:${norm(rawName) || 'cliente'}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          name: rawName,
          isTable: false,
          members: [rawName],
          total: 0,
          cmvTotal: 0,
          ids: [],
          items: [],
          byMember: {},
        };
      }
      grouped[key].total += line;
      grouped[key].cmvTotal += estCmv;
      grouped[key].ids.push(o.id);
      grouped[key].items.push(itemEntry);
      grouped[key].byMember[rawName] = (grouped[key].byMember[rawName] || 0) + line;
    });

    const list = Object.values(grouped).sort((a, b) => {
      if (a.isTable !== b.isTable) return a.isTable ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { allCustomers: list, grandTotal: gTotal };
  }, [tableTabs, openOrders, recipeById, prices, items, bar.base_cost]);

  const searchNorm = norm(clientSearch);
  const customers = allCustomers.filter((c) => {
    if (clientFilter && c.key !== clientFilter) return false;
    if (searchNorm) {
      const matchName = norm(c.name).includes(searchNorm);
      const matchMembers = c.members.some((m) => norm(m).includes(searchNorm));
      const matchCode = c.tableCode && c.tableCode.includes(searchNorm);
      if (!matchName && !matchMembers && !matchCode) return false;
    }
    return true;
  });

  // Shift real-time math
  const shiftSummary = useMemo(() => {
    if (!activeShift) return null;
    const totals: Record<Exclude<PaymentMethod, 'misto'>, number> = {
      pix: 0,
      credito: 0,
      debito: 0,
      dinheiro: 0,
    };
    let salesTotal = 0;
    let serviceFees = 0;
    let discounts = 0;
    for (const s of activeShift.sales || []) {
      salesTotal += Number(s.total) || 0;
      serviceFees += Number(s.service_fee) || 0;
      discounts += Number(s.discount) || 0;
      if (s.payment_method === 'misto' && s.splits?.length) {
        s.splits.forEach((sp) => {
          totals[sp.method] = (totals[sp.method] || 0) + Number(sp.amount || 0);
        });
      } else if (s.payment_method !== 'misto') {
        totals[s.payment_method] = (totals[s.payment_method] || 0) + Number(s.total || 0);
      }
    }
    let sangrias = 0;
    let suprimentos = 0;
    for (const m of activeShift.movements || []) {
      if (m.type === 'sangria') sangrias += Number(m.amount) || 0;
      else suprimentos += Number(m.amount) || 0;
    }
    const expectedCash =
      (Number(activeShift.opening_float) || 0) + totals.dinheiro + suprimentos - sangrias;
    return { totals, salesTotal, serviceFees, discounts, sangrias, suprimentos, expectedCash };
  }, [activeShift]);

  const openCheckout = (c: CustomerTab) => {
    setCheckoutTab(c);
    setIncludeServiceFee(hasPricing && (ops.default_service_fee_pct ?? 10) > 0);
    setServiceFeePct(ops.default_service_fee_pct ?? 10);
    setDiscountType('brl');
    setDiscountValStr('0');
    setDiscountReason('');
    setSplitPeople(Math.max(1, c.isTable ? Math.min(c.members.length || 1, 1) : 1));
    setPayMethod('credito');
    setCashReceivedStr('');
    setMixedSplits({ pix: '', credito: '', debito: '', dinheiro: '' });
    setShowPixQr(false);
  };

  // Checkout calculated totals
  const checkoutCalc = useMemo(() => {
    if (!checkoutTab) return { subtotal: 0, fee: 0, discount: 0, total: 0 };
    const subtotal = checkoutTab.total;
    const fee = hasPricing && includeServiceFee ? Math.round(subtotal * (serviceFeePct / 100) * 100) / 100 : 0;
    const rawDisc = Math.max(0, Number(discountValStr.replace(',', '.')) || 0);
    const discount =
      canDiscount
        ? discountType === 'pct'
          ? Math.round(subtotal * (Math.min(100, rawDisc) / 100) * 100) / 100
          : Math.min(subtotal + fee, rawDisc)
        : 0;
    const total = Math.max(0, Math.round((subtotal + fee - discount) * 100) / 100);
    return { subtotal, fee, discount, total };
  }, [checkoutTab, hasPricing, includeServiceFee, serviceFeePct, discountType, discountValStr, canDiscount]);

  const pixPayload = useMemo(() => {
    if (!ops.pix_key || !checkoutTab || checkoutCalc.total <= 0) return '';
    return buildPixBrCode({
      key: ops.pix_key,
      merchantName: ops.pix_merchant_name || bar.name,
      city: ops.pix_city || bar.city || 'BRASIL',
      amount: checkoutCalc.total,
      txid: `MB${Date.now().toString().slice(-8)}`,
    });
  }, [ops.pix_key, ops.pix_merchant_name, ops.pix_city, bar.name, bar.city, checkoutTab, checkoutCalc.total]);

  const handleOpenShift = async () => {
    const floatVal = Math.max(0, Number(openingFloatStr.replace(',', '.')) || 0);
    setBusy(true);
    try {
      const nextShift: CashRegisterShift = {
        id: 'shift_' + Date.now(),
        opened_by: actorName || 'Caixa',
        opened_at: new Date().toISOString(),
        opening_float: floatVal,
        status: 'open',
        movements: [],
        sales: [],
      };
      const updated = await saveBarOpsData(
        bar,
        { cash_shifts: [nextShift, ...(ops.cash_shifts || [])] },
        onBarUpdated
      );
      if (updated) {
        await logBarAudit(
          updated,
          'Abertura de caixa',
          `Turno aberto com fundo de troco de ${money(floatVal)}`,
          actorName,
          role || 'caixa',
          onBarUpdated
        );
        onToast('Turno de caixa aberto!');
        setShowShiftModal(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCashMovement = async () => {
    if (!activeShift) return;
    const val = Math.max(0, Number(moveAmountStr.replace(',', '.')) || 0);
    if (val <= 0) {
      onToast('Informe um valor maior que zero.');
      return;
    }
    setBusy(true);
    try {
      const mv: CashMovement = {
        id: 'mv_' + Date.now(),
        type: moveType,
        amount: val,
        reason: moveReason.trim() || (moveType === 'sangria' ? 'Retirada de caixa' : 'Reforço de troco'),
        by: actorName || 'Caixa',
        at: new Date().toISOString(),
      };
      const nextShifts = (ops.cash_shifts || []).map((s) =>
        s.id === activeShift.id ? { ...s, movements: [mv, ...(s.movements || [])] } : s
      );
      const updated = await saveBarOpsData(bar, { cash_shifts: nextShifts }, onBarUpdated);
      if (updated) {
        await logBarAudit(
          updated,
          moveType === 'sangria' ? 'Sangria de caixa' : 'Suprimento de caixa',
          `${money(val)} — ${mv.reason}`,
          actorName,
          role || 'caixa',
          onBarUpdated
        );
        onToast(`${moveType === 'sangria' ? 'Sangria' : 'Suprimento'} registrada!`);
        setMoveAmountStr('');
        setMoveReason('');
        setShowShiftModal(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift || !shiftSummary) return;
    if (!canCloseShift) {
      onToast('Seu cargo não tem permissão para fechar o caixa.');
      return;
    }
    const counted = Math.max(0, Number(closingCountedStr.replace(',', '.')) || 0);
    const diff = Math.round((counted - shiftSummary.expectedCash) * 100) / 100;
    setBusy(true);
    try {
      const nextShifts = (ops.cash_shifts || []).map((s) =>
        s.id === activeShift.id
          ? {
              ...s,
              status: 'closed' as const,
              closed_by: actorName || 'Caixa',
              closed_at: new Date().toISOString(),
              closing_counted: counted,
              expected_cash: shiftSummary.expectedCash,
              cash_diff: diff,
              notes: closingNotes.trim() || undefined,
            }
          : s
      );
      const updated = await saveBarOpsData(bar, { cash_shifts: nextShifts }, onBarUpdated);
      if (updated) {
        await logBarAudit(
          updated,
          'Fechamento de caixa',
          `Vendas: ${money(shiftSummary.salesTotal)} | Dinheiro esperado: ${money(shiftSummary.expectedCash)} | Contado: ${money(counted)} | Diferença: ${money(diff)}`,
          actorName,
          role || 'caixa',
          onBarUpdated
        );
        onToast('Turno de caixa fechado e salvo no histórico!');
        setClosingCountedStr('');
        setClosingNotes('');
        setShowShiftModal(null);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!checkoutTab) return;
    let splits: PaymentSplit[] | undefined;

    if (payMethod === 'misto' && checkoutCalc.total > 0) {
      splits = (['pix', 'credito', 'debito', 'dinheiro'] as const)
        .map((m) => ({
          method: m,
          amount: Math.max(0, Number((mixedSplits[m] || '').replace(',', '.')) || 0),
        }))
        .filter((x) => x.amount > 0);
      const sum = Math.round(splits.reduce((acc, x) => acc + x.amount, 0) * 100) / 100;
      if (Math.abs(sum - checkoutCalc.total) > 0.05) {
        onToast(
          `A soma do pagamento misto (${money(sum)}) precisa bater com o total (${money(checkoutCalc.total)}).`
        );
        return;
      }
    }

    setBusy(true);
    try {
      if (checkoutTab.ids.length > 0) {
        onSettled(checkoutTab.ids);
        const updPayload: Record<string, unknown> = {
          paid: true,
          status: 'done',
          payment_method: payMethod,
          discount: checkoutCalc.discount,
          service_fee: checkoutCalc.fee,
          paid_at: new Date().toISOString(),
        };
        const r = await sb.from('orders').update(updPayload).in('id', checkoutTab.ids);
        if (r.error) {
          const r2 = await sb
            .from('orders')
            .update({ paid: true, status: 'done' })
            .in('id', checkoutTab.ids);
          if (r2.error) {
            await sb.from('orders').update({ status: 'done' }).in('id', checkoutTab.ids);
          }
        }
      }

      if (checkoutTab.tableTabId) {
        await sb
          .from('table_tabs')
          .update({ status: 'closed', closed_at: new Date().toISOString() })
          .eq('id', checkoutTab.tableTabId);
        if (onRefreshTableTabs) await onRefreshTableTabs();
      }

      // Record sale in active shift (or auto-create today's shift so financial dashboard is always 100% populated)
      if (checkoutCalc.total > 0 || checkoutTab.ids.length > 0) {
        const saleRecord: CashSaleRecord = {
          id: 'sale_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
          tab_label: checkoutTab.name,
          client_name: checkoutTab.members.join(', ') || checkoutTab.name,
          subtotal: checkoutCalc.subtotal,
          service_fee: checkoutCalc.fee,
          discount: checkoutCalc.discount,
          discount_reason: discountReason.trim() || undefined,
          total: checkoutCalc.total,
          payment_method: payMethod,
          splits,
          items_count: checkoutTab.items.reduce((acc, it) => acc + it.qty, 0),
          items_summary: checkoutTab.items.map((it) => ({
            name: it.recipeName,
            qty: it.qty,
            total: it.lineTotal,
            item_type: getRecipeItemType(recipeById.get(it.recipeId) || {}),
          })),
          cmv_total: Math.round(checkoutTab.cmvTotal * 100) / 100,
          paid_at: new Date().toISOString(),
          by: actorName || 'Caixa',
          order_ids: checkoutTab.ids,
        };

        let nextShifts = [...(ops.cash_shifts || [])];
        const openIdx = nextShifts.findIndex((s) => s.status === 'open');
        if (openIdx >= 0) {
          nextShifts[openIdx] = {
            ...nextShifts[openIdx],
            sales: [saleRecord, ...(nextShifts[openIdx].sales || [])],
          };
        } else {
          nextShifts = [
            {
              id: 'shift_' + Date.now(),
              opened_by: actorName || 'Automático',
              opened_at: new Date().toISOString(),
              opening_float: 0,
              status: 'open',
              movements: [],
              sales: [saleRecord],
            },
            ...nextShifts,
          ];
        }

        const clientNamesForLoyalty =
          checkoutTab.members.length > 0 ? checkoutTab.members : [checkoutTab.name];
        const nextLoyaltyCustomers = applyLoyaltyOnSale(ops, {
          clientNames: clientNamesForLoyalty,
          itemsCount: saleRecord.items_count,
          saleTotal: checkoutCalc.total,
          redeemClientName: loyaltyRedeem?.clientName,
          redeemedStamps: loyaltyRedeem?.stamps,
          redeemedCashback: loyaltyRedeem?.cashback,
        });

        const updated = await saveBarOpsData(
          bar,
          { cash_shifts: nextShifts, loyalty_customers: nextLoyaltyCustomers },
          onBarUpdated
        );
        if (updated && checkoutCalc.discount > 0) {
          await logBarAudit(
            updated,
            'Desconto / Cortesia',
            `${checkoutTab.name}: -${money(checkoutCalc.discount)} (${discountReason.trim() || 'sem motivo informado'})`,
            actorName,
            role || 'caixa',
            onBarUpdated
          );
        }
      }

      if (clientFilter === checkoutTab.key) setClientFilter('');
      onToast(
        checkoutTab.isTable
          ? `Pagamento registrado (${PAYMENT_METHOD_LABELS[payMethod].label}) e ${checkoutTab.name} liberada!`
          : `Pagamento de ${checkoutTab.name} registrado!`
      );
      setLoyaltyRedeem(null);
      setCheckoutTab(null);
      await onRefreshOrders();
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSingleOrder = async () => {
    if (!cancelOrderTarget) return;
    if (!canCancel) {
      onToast('Seu cargo não tem permissão para cancelar pedidos.');
      return;
    }
    setBusy(true);
    try {
      await sb.from('orders').delete().eq('id', cancelOrderTarget.orderId);
      await logBarAudit(
        bar,
        'Cancelamento de item no caixa',
        `${cancelOrderTarget.label} — Motivo: ${cancelReason.trim() || 'Não informado'}`,
        actorName,
        role || 'caixa',
        onBarUpdated
      );
      onToast('Item cancelado e registrado na auditoria.');
      setCancelOrderTarget(null);
      setCancelReason('');
      await onRefreshOrders();
    } finally {
      setBusy(false);
    }
  };

  const handlePrintTab = (c: CustomerTab, isPreBill: boolean) => {
    const feePct = ops.default_service_fee_pct ?? 10;
    const fee = hasPricing && feePct > 0 ? Math.round(c.total * (feePct / 100) * 100) / 100 : 0;
    const ok = printCustomerBill({
      bar,
      title: c.isTable ? `Mesa: ${c.name}` : `Cliente: ${c.name}`,
      subtitle: c.isTable && c.members.length > 0 ? `Pessoas: ${c.members.join(', ')}` : undefined,
      lines: c.items.map((it) => ({
        label: `${it.qty}x ${it.recipeName}${c.isTable ? ` (${it.clientName})` : ''}`,
        amount: it.lineTotal,
      })),
      subtotal: c.total,
      serviceFee: fee,
      serviceFeePct: feePct,
      discount: 0,
      total: c.total + fee,
      isPreBill,
    });
    if (!ok) onToast('Não foi possível abrir a janela de impressão neste aparelho.');
  };

  const handleCopyWhatsAppBill = (c: CustomerTab) => {
    const feePct = ops.default_service_fee_pct ?? 10;
    const fee = hasPricing && feePct > 0 ? Math.round(c.total * (feePct / 100) * 100) / 100 : 0;
    const lines = [
      `🧾 *Resumo da conta — ${bar.name}*`,
      `${c.isTable ? '🪑 ' + c.name : '👤 ' + c.name}`,
      '',
      ...c.items.map((it) => `• ${it.qty}x ${it.recipeName} — ${money(it.lineTotal)}`),
      '',
      `Subtotal: ${money(c.total)}`,
      ...(fee > 0 ? [`Serviço (${feePct}%): ${money(fee)}`] : []),
      `*Total: ${money(c.total + fee)}*`,
      ...(ops.pix_key ? ['', `💠 Chave Pix da loja: ${ops.pix_key}`] : []),
    ].join('\n');
    void navigator.clipboard?.writeText(lines);
    onToast('Resumo da conta copiado! Cole no WhatsApp do cliente.');
  };

  return (
    <div>
      <div className="row sp">
        <button type="button" className="b g sm" onClick={onBackMore}>
          ← Voltar para Mais
        </button>
        {onGoManagement && canRoleDo(bar, role, 'can_view_reports') && (
          <button
            type="button"
            className="b g sm"
            onClick={() => onGoManagement('dashboard')}
          >
            📊 Relatórios & Lucro
          </button>
        )}
      </div>

      <h1 className="mt-3">Caixa & Turno</h1>
      <p className="mu">
        {bar.name} · Receba na maquininha, dinheiro ou Pix da loja e registre aqui para fechar o
        turno e acompanhar seu lucro.
      </p>

      {tableCalls.length > 0 && (
        <div className="panel mt-3 !border-amber-400/60 bg-amber-500/10 space-y-1.5">
          <div className="text-xs font-bold text-amber-200">
            🔔 {tableCalls.length} chamado(s) ativo(s) de mesa
          </div>
          {tableCalls.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 text-xs bg-black/20 rounded-lg px-2.5 py-1.5"
            >
              <div>
                <b>{c.kind === 'bill' ? '🧾 Pediu a Conta' : '🙋 Chamou Garçom'}</b> ·{' '}
                {c.table_label ? `${c.table_label} (${c.client_name})` : c.client_name}
                {c.note ? ` — ${c.note}` : ''}
              </div>
              {onResolveCall && (
                <button
                  type="button"
                  className="b ok sm !py-1"
                  onClick={() => void onResolveCall(c.id)}
                >
                  ✓ Atendido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PAINEL DO TURNO DE CAIXA */}
      <div className="panel mt-3">
        <div className="row sp flex-wrap gap-2">
          <div>
            <h3 className="!m-0">
              {activeShift ? '🟢 Turno de caixa ABERTO' : '⚪ Nenhum turno aberto'}
            </h3>
            {activeShift ? (
              <p className="mu text-[12px] !mt-0.5 !mb-0">
                Aberto por <b>{activeShift.opened_by}</b> às{' '}
                {new Date(activeShift.opened_at).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · Fundo: {money(activeShift.opening_float)}
              </p>
            ) : (
              <p className="mu text-[12px] !mt-0.5 !mb-0">
                Abra o turno com o fundo de troco para controlar sangrias, suprimentos e quebra de
                caixa.
              </p>
            )}
          </div>
          <div className="row gap-1.5 flex-wrap">
            {!activeShift ? (
              <button
                type="button"
                className="b sm ok"
                onClick={() => setShowShiftModal('open')}
              >
                🔓 Abrir turno
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setShowShiftModal('move')}
                >
                  💸 Sangria / Suprimento
                </button>
                {canCloseShift && (
                  <button
                    type="button"
                    className="b sm"
                    onClick={() => {
                      setClosingCountedStr(
                        shiftSummary ? shiftSummary.expectedCash.toFixed(2) : '0'
                      );
                      setShowShiftModal('close');
                    }}
                  >
                    🔒 Fechar turno
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {activeShift && shiftSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="rounded-xl p-2.5 bg-white/5 border border-white/10">
              <div className="text-[11px] text-[var(--mut)]">Recebido no turno</div>
              <div className="text-base font-extrabold text-[var(--ok)]">
                {money(shiftSummary.salesTotal)}
              </div>
              <div className="text-[10px] text-[var(--mut)]">
                {activeShift.sales.length} conta(s) paga(s)
              </div>
            </div>
            <div className="rounded-xl p-2.5 bg-white/5 border border-white/10">
              <div className="text-[11px] text-[var(--mut)]">💳 Maquininha</div>
              <div className="text-base font-bold">
                {money(shiftSummary.totals.credito + shiftSummary.totals.debito)}
              </div>
              <div className="text-[10px] text-[var(--mut)]">
                Créd {money(shiftSummary.totals.credito)} · Déb {money(shiftSummary.totals.debito)}
              </div>
            </div>
            <div className="rounded-xl p-2.5 bg-white/5 border border-white/10">
              <div className="text-[11px] text-[var(--mut)]">💠 Pix da loja</div>
              <div className="text-base font-bold">{money(shiftSummary.totals.pix)}</div>
              <div className="text-[10px] text-[var(--mut)]">
                10% garçom: {money(shiftSummary.serviceFees)}
              </div>
            </div>
            <div className="rounded-xl p-2.5 bg-white/5 border border-white/10">
              <div className="text-[11px] text-[var(--mut)]">💵 Em gaveta (esperado)</div>
              <div className="text-base font-bold text-[var(--ac)]">
                {money(shiftSummary.expectedCash)}
              </div>
              <div className="text-[10px] text-[var(--mut)]">
                Dinheiro {money(shiftSummary.totals.dinheiro)} · Sangria {money(shiftSummary.sangrias)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOTAL EM ABERTO */}
      <div className="pay mt-3">
        <div className="row sp">
          <span>Total em aberto ({allCustomers.length} comanda(s) ativa(s))</span>
          <span className="tt">{money(grandTotal)}</span>
        </div>
      </div>

      {/* FILTRO */}
      {allCustomers.length > 0 && (
        <div className="panel mt-3">
          <div className="row sp">
            <h3 className="!m-0">Filtro de clientes / mesas ativas</h3>
            {(clientFilter || clientSearch) && (
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  setClientFilter('');
                  setClientSearch('');
                }}
              >
                Limpar
              </button>
            )}
          </div>
          <input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar mesa, código ou pessoa…"
            className="mt-2"
          />
          <div className="chips !flex-wrap !overflow-visible mt-2">
            <span
              className={`chip ${!clientFilter ? 'on' : ''}`}
              onClick={() => setClientFilter('')}
            >
              Todos ({allCustomers.length})
            </span>
            {allCustomers.map((c) => (
              <span
                key={c.key}
                className={`chip ${clientFilter === c.key ? 'on' : ''}`}
                onClick={() => setClientFilter(clientFilter === c.key ? '' : c.key)}
              >
                {c.isTable ? `🪑 ${c.name}` : c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE COMANDAS EM ABERTO */}
      <div className="space-y-2.5 mt-3.5">
        {customers.length > 0 ? (
          customers.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl p-3.5 border border-white/10 bg-[var(--sf)] space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="text-base">{c.isTable ? `🪑 ${c.name}` : `👤 ${c.name}`}</b>
                    {c.tableCode && (
                      <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                        Cód: {c.tableCode}
                      </span>
                    )}
                    {hasPricing && <span className="pr text-base">{money(c.total)}</span>}
                  </div>
                  {c.isTable && c.members.length > 0 && (
                    <div className="mu text-[0.78rem] mt-0.5">
                      Na mesa: <b>{c.members.join(', ')}</b>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => handlePrintTab(c, true)}
                  >
                    🖨️ Pré-conta
                  </button>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => handleCopyWhatsAppBill(c)}
                  >
                    📤 WhatsApp
                  </button>
                  <button
                    type="button"
                    className="b sm ok"
                    onClick={() => openCheckout(c)}
                  >
                    {c.isTable ? '💳 Fechar mesa' : '💳 Receber / Fechar'}
                  </button>
                </div>
              </div>

              {c.items.length > 0 ? (
                <div className="space-y-1 pt-2 border-t border-white/10">
                  {c.items.map((it) => (
                    <div
                      key={it.orderId}
                      className="flex items-center justify-between gap-2 text-xs py-0.5"
                    >
                      <span>
                        <b>{it.qty}×</b> {it.recipeName}
                        {c.isTable ? (
                          <span className="text-[var(--mut)]"> — {it.clientName}</span>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-2">
                        {hasPricing && <b>{money(it.lineTotal)}</b>}
                        {canCancel && (
                          <button
                            type="button"
                            className="text-[11px] text-red-400 hover:text-red-300 bg-transparent border-0 cursor-pointer px-1"
                            title="Cancelar item"
                            onClick={() =>
                              setCancelOrderTarget({
                                orderId: it.orderId,
                                label: `${it.qty}x ${it.recipeName} (${c.name})`,
                              })
                            }
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mu text-[0.78rem] !mb-0">
                  Comanda aberta via QR da mesa (nenhum pedido lançado ainda).
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="mu">
            {allCustomers.length > 0
              ? 'Nenhuma comanda encontrada com esse filtro.'
              : 'Nenhuma comanda pendente no caixa agora.'}
          </p>
        )}
      </div>

      {/* MODAL: RECEBER / FECHAR CONTA (MAQUININHA / DINHEIRO / PIX DIRETO) */}
      {checkoutTab && (
        <div className="ov" onClick={() => !busy && setCheckoutTab(null)}>
          <div
            className="w narrow !max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row sp mb-2">
              <h2 className="!m-0">
                💳 Fechar conta — {checkoutTab.isTable ? checkoutTab.name : checkoutTab.name}
              </h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => setCheckoutTab(null)}
              >
                ✕
              </button>
            </div>
            <p className="mu text-xs">
              Cobre o cliente na sua maquininha, dinheiro ou Pix da loja e registre abaixo para
              contabilizar no turno.
            </p>

            {/* RESUMO POR PESSOA (PARA MESAS COM VÁRIOS CLIENTES) */}
            {Object.keys(checkoutTab.byMember).length > 1 && (
              <div className="rounded-xl p-2.5 bg-white/5 border border-white/10 mb-3">
                <div className="text-xs font-bold mb-1">👥 Consumo individual na mesa:</div>
                <div className="space-y-1 text-xs">
                  {Object.entries(checkoutTab.byMember).map(([member, val]) => {
                    const withFee = includeServiceFee
                      ? val * (1 + serviceFeePct / 100)
                      : val;
                    return (
                      <div key={member} className="flex justify-between">
                        <span>{member}</span>
                        <b>
                          {money(val)}
                          {includeServiceFee ? ` (c/ ${serviceFeePct}%: ${money(withFee)})` : ''}
                        </b>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAXA DE SERVIÇO & DESCONTO */}
            {hasPricing && (
              <div className="panel !p-3 mb-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="!m-0 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={(e) => setIncludeServiceFee(e.target.checked)}
                      className="!w-4 !h-4"
                    />
                    Taxa de serviço (garçom)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={serviceFeePct}
                      onChange={(e) => setServiceFeePct(Math.max(0, Number(e.target.value) || 0))}
                      className="!w-16 !py-1 text-center"
                    />
                    <span className="text-xs">%</span>
                  </div>
                </div>

                {loyaltyCfg.enabled &&
                  (() => {
                    const candidates =
                      checkoutTab.members.length > 0 ? checkoutTab.members : [checkoutTab.name];
                    const matched = candidates
                      .map((nm) => findLoyaltyCustomer(bar, nm))
                      .find((rec) => rec !== null);
                    if (!matched) return null;
                    const canRedeemStamps =
                      loyaltyCfg.mode === 'stamps' && matched.stamps >= loyaltyCfg.stamps_target;
                    const canRedeemCash =
                      loyaltyCfg.mode === 'cashback' &&
                      matched.cashback_balance >= (loyaltyCfg.min_redeem_value ?? 0) &&
                      matched.cashback_balance > 0;
                    return (
                      <div className="pt-2 border-t border-white/10">
                        <div className="rounded-xl p-2.5 bg-amber-500/10 border border-amber-400/35 space-y-1.5">
                          <div className="text-xs">
                            <b>🎁 Fidelidade — {matched.name}:</b>{' '}
                            {loyaltyCfg.mode === 'stamps'
                              ? `${matched.stamps}/${loyaltyCfg.stamps_target} carimbos`
                              : `${money(matched.cashback_balance)} em cashback`}
                          </div>
                          {(canRedeemStamps || canRedeemCash) && (
                            <button
                              type="button"
                              className={`b sm ${loyaltyRedeem ? 'ok' : ''}`}
                              onClick={() => {
                                if (loyaltyRedeem) {
                                  setLoyaltyRedeem(null);
                                  setDiscountValStr('0');
                                  setDiscountReason('');
                                  return;
                                }
                                if (canRedeemStamps) {
                                  setDiscountType('brl');
                                  setDiscountValStr(String(loyaltyCfg.stamp_reward_value));
                                  setDiscountReason(`Resgate Fidelidade: ${loyaltyCfg.stamp_reward_label}`);
                                  setLoyaltyRedeem({
                                    clientName: matched.name,
                                    stamps: loyaltyCfg.stamps_target,
                                  });
                                } else if (canRedeemCash) {
                                  const useVal = Math.min(
                                    matched.cashback_balance,
                                    checkoutCalc.subtotal + checkoutCalc.fee
                                  );
                                  setDiscountType('brl');
                                  setDiscountValStr(useVal.toFixed(2));
                                  setDiscountReason(`Resgate Cashback (${matched.name})`);
                                  setLoyaltyRedeem({
                                    clientName: matched.name,
                                    cashback: useVal,
                                  });
                                }
                              }}
                            >
                              {loyaltyRedeem
                                ? '✓ Resgate aplicado (toque para desfazer)'
                                : canRedeemStamps
                                  ? `🎁 Resgatar prêmio (-${money(loyaltyCfg.stamp_reward_value)})`
                                  : `💸 Usar cashback (-${money(matched.cashback_balance)})`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {canDiscount && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">🏷️ Desconto / Cortesia</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={`b sm ${discountType === 'brl' ? '' : 'g'}`}
                          onClick={() => setDiscountType('brl')}
                        >
                          R$
                        </button>
                        <button
                          type="button"
                          className={`b sm ${discountType === 'pct' ? '' : 'g'}`}
                          onClick={() => setDiscountType('pct')}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={discountValStr}
                        onChange={(e) => setDiscountValStr(e.target.value)}
                        placeholder="0,00"
                      />
                      <input
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        placeholder="Motivo (ex: cortesia)"
                      />
                    </div>
                  </div>
                )}

                {/* DIVIDIR POR IGUAL */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">➗ Dividir conta por igual:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`b sm !px-2.5 ${splitPeople === n ? '' : 'g'}`}
                        onClick={() => setSplitPeople(n)}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TOTAIS */}
            <div className="pay mb-3">
              <div className="row sp text-xs">
                <span>Subtotal ({checkoutTab.items.length} pedido(s))</span>
                <span>{money(checkoutCalc.subtotal)}</span>
              </div>
              {checkoutCalc.fee > 0 && (
                <div className="row sp text-xs mt-1">
                  <span>Serviço ({serviceFeePct}%)</span>
                  <span>+ {money(checkoutCalc.fee)}</span>
                </div>
              )}
              {checkoutCalc.discount > 0 && (
                <div className="row sp text-xs mt-1 text-red-300">
                  <span>Desconto</span>
                  <span>- {money(checkoutCalc.discount)}</span>
                </div>
              )}
              <div className="row sp mt-2 pt-2 border-t border-white/10">
                <b>Total a receber</b>
                <span className="tt">{money(checkoutCalc.total)}</span>
              </div>
              {splitPeople > 1 && (
                <div className="row sp text-xs mt-1 text-[var(--ac)]">
                  <span>Valor por pessoa ({splitPeople} pessoas)</span>
                  <b>{money(checkoutCalc.total / splitPeople)}</b>
                </div>
              )}
            </div>

            {/* FORMA DE PAGAMENTO PRESENCIAL */}
            {hasPricing && checkoutCalc.total > 0 && (
              <div className="space-y-2.5 mb-3">
                <label className="!mt-0">Como o cliente pagou? (maquininha / caixa)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(['credito', 'debito', 'pix', 'dinheiro', 'misto'] as PaymentMethod[]).map(
                    (m) => (
                      <button
                        key={m}
                        type="button"
                        className={`b sm ${payMethod === m ? '' : 'g'}`}
                        onClick={() => setPayMethod(m)}
                      >
                        {PAYMENT_METHOD_LABELS[m].icon}{' '}
                        {m === 'credito'
                          ? 'Crédito'
                          : m === 'debito'
                            ? 'Débito'
                            : m === 'pix'
                              ? 'Pix'
                              : m === 'dinheiro'
                                ? 'Dinheiro'
                                : 'Misto'}
                      </button>
                    )
                  )}
                </div>

                {/* CALCULADORA DE TROCO PARA DINHEIRO */}
                {payMethod === 'dinheiro' && (
                  <div className="rounded-xl p-2.5 bg-white/5 border border-white/10 space-y-1.5">
                    <label className="!mt-0 text-xs">Valor recebido em dinheiro (para troco)</label>
                    <input
                      value={cashReceivedStr}
                      onChange={(e) => setCashReceivedStr(e.target.value)}
                      placeholder={`Ex: ${Math.ceil(checkoutCalc.total / 10) * 10}`}
                    />
                    {Number(cashReceivedStr.replace(',', '.')) >= checkoutCalc.total && (
                      <div className="text-sm font-bold text-[var(--ok)]">
                        💵 Troco a devolver:{' '}
                        {money(
                          Number(cashReceivedStr.replace(',', '.')) - checkoutCalc.total
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PAGAMENTO MISTO */}
                {payMethod === 'misto' && (
                  <div className="rounded-xl p-2.5 bg-white/5 border border-white/10 space-y-2">
                    <div className="text-xs font-semibold">
                      Divida os valores entre as formas recebidas:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pix', 'credito', 'debito', 'dinheiro'] as const).map((m) => (
                        <div key={m}>
                          <label className="!mt-0 text-[11px]">
                            {m === 'pix'
                              ? '💠 Pix (R$)'
                              : m === 'credito'
                                ? '💳 Crédito (R$)'
                                : m === 'debito'
                                  ? '💳 Débito (R$)'
                                  : '💵 Dinheiro (R$)'}
                          </label>
                          <input
                            value={mixedSplits[m]}
                            onChange={(e) =>
                              setMixedSplits((prev) => ({ ...prev, [m]: e.target.value }))
                            }
                            placeholder="0,00"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PIX QR CODE DIRETO DA CHAVE DO BAR (ZERO INTERMEDIÁRIO) */}
                {payMethod === 'pix' && (
                  <div className="rounded-xl p-3 bg-white/5 border border-white/10 space-y-2">
                    {ops.pix_key ? (
                      <>
                        <div className="row sp">
                          <span className="text-xs font-semibold">
                            💠 Pix direto para sua chave: <b>{ops.pix_key}</b>
                          </span>
                          <button
                            type="button"
                            className="b g sm"
                            onClick={() => setShowPixQr((v) => !v)}
                          >
                            {showPixQr ? 'Ocultar QR' : '📱 Mostrar QR Pix'}
                          </button>
                        </div>
                        {showPixQr && pixPayload && (
                          <div className="text-center space-y-2 pt-2">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                                pixPayload
                              )}`}
                              alt="QR Code Pix"
                              className="mx-auto rounded-xl bg-white p-2 w-48 h-48"
                            />
                            <div className="text-[11px] text-[var(--mut)]">
                              Valor exato: <b>{money(checkoutCalc.total)}</b> · Cai direto na conta
                              do bar, sem taxas de gateway.
                            </div>
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => {
                                void navigator.clipboard?.writeText(pixPayload);
                                onToast('Pix Copia e Cola copiado!');
                              }}
                            >
                              📋 Copiar Pix Copia e Cola
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="row sp flex-wrap gap-2">
                        <span className="text-xs text-[var(--mut)]">
                          Cadastre sua chave Pix para gerar QR Code automático na conta (zero taxa).
                        </span>
                        {onGoManagement && (
                          <button
                            type="button"
                            className="b g sm"
                            onClick={() => {
                              setCheckoutTab(null);
                              onGoManagement('config');
                            }}
                          >
                            Configurar Pix
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                className="b g"
                onClick={() => {
                  const ok = printCustomerBill({
                    bar,
                    title: checkoutTab.isTable
                      ? `Mesa: ${checkoutTab.name}`
                      : `Cliente: ${checkoutTab.name}`,
                    subtitle:
                      checkoutTab.isTable && checkoutTab.members.length > 0
                        ? `Pessoas: ${checkoutTab.members.join(', ')}`
                        : undefined,
                    lines: checkoutTab.items.map((it) => ({
                      label: `${it.qty}x ${it.recipeName}`,
                      amount: it.lineTotal,
                    })),
                    subtotal: checkoutCalc.subtotal,
                    serviceFee: checkoutCalc.fee,
                    serviceFeePct: includeServiceFee ? serviceFeePct : 0,
                    discount: checkoutCalc.discount,
                    total: checkoutCalc.total,
                    paymentInfo: PAYMENT_METHOD_LABELS[payMethod].label,
                    splitCount: splitPeople,
                    isPreBill: false,
                  });
                  if (!ok) onToast('Impressão indisponível neste dispositivo.');
                }}
              >
                🖨️ Imprimir recibo
              </button>
              <button
                type="button"
                className="b ok"
                disabled={busy}
                onClick={() => void handleConfirmPayment()}
              >
                {busy ? 'Fechando…' : '✅ Confirmar recebido & Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TURNO DE CAIXA (ABRIR / SANGRIA-SUPRIMENTO / FECHAR) */}
      {showShiftModal && (
        <div className="ov" onClick={() => !busy && setShowShiftModal(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row sp mb-2">
              <h2 className="!m-0">
                {showShiftModal === 'open'
                  ? '🔓 Abrir turno de caixa'
                  : showShiftModal === 'move'
                    ? '💸 Sangria ou Suprimento'
                    : '🔒 Fechar turno de caixa'}
              </h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => setShowShiftModal(null)}
              >
                ✕
              </button>
            </div>

            {showShiftModal === 'open' && (
              <div className="space-y-3">
                <label>Fundo de troco inicial em dinheiro (R$)</label>
                <input
                  value={openingFloatStr}
                  onChange={(e) => setOpeningFloatStr(e.target.value)}
                  placeholder="Ex: 150,00"
                />
                <button
                  type="button"
                  className="b full ok"
                  disabled={busy}
                  onClick={() => void handleOpenShift()}
                >
                  {busy ? 'Abrindo…' : 'Confirmar abertura de caixa'}
                </button>
              </div>
            )}

            {showShiftModal === 'move' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`b sm ${moveType === 'sangria' ? '' : 'g'}`}
                    onClick={() => setMoveType('sangria')}
                  >
                    ➖ Sangria (Retirada)
                  </button>
                  <button
                    type="button"
                    className={`b sm ${moveType === 'suprimento' ? '' : 'g'}`}
                    onClick={() => setMoveType('suprimento')}
                  >
                    ➕ Suprimento (Reforço)
                  </button>
                </div>
                <label>Valor (R$)</label>
                <input
                  value={moveAmountStr}
                  onChange={(e) => setMoveAmountStr(e.target.value)}
                  placeholder="Ex: 100,00"
                />
                <label>Motivo</label>
                <input
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  placeholder="Ex: Pagamento gelo / Troco"
                />
                <button
                  type="button"
                  className="b full"
                  disabled={busy}
                  onClick={() => void handleCashMovement()}
                >
                  {busy ? 'Salvando…' : 'Registrar movimentação'}
                </button>
              </div>
            )}

            {showShiftModal === 'close' && shiftSummary && (
              <div className="space-y-3">
                <div className="rounded-xl p-3 bg-white/5 border border-white/10 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Total vendido no turno:</span>
                    <b className="text-[var(--ok)]">{money(shiftSummary.salesTotal)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Crédito (maquininha):</span>
                    <b>{money(shiftSummary.totals.credito)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Débito (maquininha):</span>
                    <b>{money(shiftSummary.totals.debito)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Pix da loja:</span>
                    <b>{money(shiftSummary.totals.pix)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span>10% Garçons acumulados:</span>
                    <b>{money(shiftSummary.serviceFees)}</b>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-white/10 text-sm">
                    <span>Dinheiro esperado na gaveta:</span>
                    <b className="text-[var(--ac)]">{money(shiftSummary.expectedCash)}</b>
                  </div>
                </div>

                <label>Quanto você contou em dinheiro na gaveta? (R$)</label>
                <input
                  value={closingCountedStr}
                  onChange={(e) => setClosingCountedStr(e.target.value)}
                  placeholder="0,00"
                />
                {closingCountedStr !== '' && (
                  <div className="text-xs font-bold">
                    Diferença (sobra/quebra):{' '}
                    <span
                      className={
                        (Number(closingCountedStr.replace(',', '.')) || 0) -
                          shiftSummary.expectedCash >=
                        0
                          ? 'text-[var(--ok)]'
                          : 'text-red-400'
                      }
                    >
                      {money(
                        (Number(closingCountedStr.replace(',', '.')) || 0) -
                          shiftSummary.expectedCash
                      )}
                    </span>
                  </div>
                )}

                <label>Observações do fechamento (opcional)</label>
                <input
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Ex: Turno tranquilo, tudo conferido"
                />

                <button
                  type="button"
                  className="b full ok"
                  disabled={busy}
                  onClick={() => void handleCloseShift()}
                >
                  {busy ? 'Fechando turno…' : '🔒 Confirmar fechamento de caixa'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR ITEM INDIVIDUAL */}
      {cancelOrderTarget && (
        <div className="ov" onClick={() => !busy && setCancelOrderTarget(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">❌ Cancelar item da comanda</h2>
            <p className="mu text-xs">
              Item: <b>{cancelOrderTarget.label}</b>
            </p>
            <label>Motivo do cancelamento</label>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Cliente desistiu / Lançado errado"
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                className="b g"
                onClick={() => setCancelOrderTarget(null)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="b d"
                disabled={busy}
                onClick={() => void handleCancelSingleOrder()}
              >
                {busy ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
