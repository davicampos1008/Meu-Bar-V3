import React, { useEffect, useMemo, useState } from 'react';
import {
  buildDisplayUrl,
  detectAvailableMonitors,
  getDefaultMonitorPresets,
  getSavedMonitors,
  publishCustomerDisplay,
  saveMonitorForMode,
  startPresentationCast,
  type DisplayMode,
  type MonitorOption,
  type SavedMonitorMap,
} from '../lib/displaySync';
import {
  applyLoyaltyOnSale,
  buildPixBrCode,
  canRoleDo,
  findLoyaltyCustomer,
  getActiveCashShift,
  getBarOpsData,
  getEffectiveTableOwner,
  getLoyaltyConfig,
  logBarAudit,
  PAYMENT_METHOD_LABELS,
  printCustomerBill,
  saveBarOpsData,
} from '../lib/opsUtils';
import {
  hasStoreManagerPin,
  verifyStoreManagerPin,
} from '../lib/staffAuth';
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
  status?: string;
  note?: string | null;
  createdAt?: string;
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

const QUICK_EXTRAS = [
  { label: 'Dose extra', price: 12 },
  { label: 'Energético', price: 14 },
  { label: 'Gelo + Limão extra', price: 3 },
  { label: 'Água mineral', price: 6 },
  { label: 'Porção adicional', price: 25 },
];

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
  onOpenDisplayMode?: (mode: DisplayMode) => void;
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
  exclusiveTerminalMode?: boolean;
  onEnterExclusiveTerminal?: () => void;
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
  onOpenDisplayMode,
  onGoManagement,
  exclusiveTerminalMode = false,
  onEnterExclusiveTerminal,
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
  const [serviceFeeMode, setServiceFeeMode] = useState<'pct' | 'fixed'>('pct');
  const [serviceFeePct, setServiceFeePct] = useState<number>(ops.default_service_fee_pct ?? 10);
  const [serviceFeeFixedStr, setServiceFeeFixedStr] = useState('');
  const [selectedWaiterName, setSelectedWaiterName] = useState('');
  const [includeCouvert, setIncludeCouvert] = useState(Boolean(ops.couvert_enabled));
  const [couvertUnitStr, setCouvertUnitStr] = useState(
    ops.couvert_price ? String(ops.couvert_price) : '0'
  );
  const [couvertPeopleCount, setCouvertPeopleCount] = useState(1);

  // Discount protected by Store ADM Password
  const [discountType, setDiscountType] = useState<'brl' | 'pct'>('brl');
  const [discountValStr, setDiscountValStr] = useState('0');
  const [discountReason, setDiscountReason] = useState('');
  const [discountUnlockedBy, setDiscountUnlockedBy] = useState<string | null>(null);
  const [discountPinInput, setDiscountPinInput] = useState('');
  const [discountPinErr, setDiscountPinErr] = useState('');
  const [checkingDiscountPin, setCheckingDiscountPin] = useState(false);

  // Supervised item edit modal (requires Store ADM Password)
  const [editItemTarget, setEditItemTarget] = useState<{
    orderId: string;
    tabName: string;
    recipeName: string;
    currentQty: number;
    unitPrice: number;
  } | null>(null);
  const [editItemQtyStr, setEditItemQtyStr] = useState('1');
  const [editItemReason, setEditItemReason] = useState('');
  const [editItemPin, setEditItemPin] = useState('');
  const [editItemPinErr, setEditItemPinErr] = useState('');

  // Cancel item ADM PIN
  const [cancelPin, setCancelPin] = useState('');
  const [cancelPinErr, setCancelPinErr] = useState('');

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

  // Expanded customer card + inline extras/doses extras + Second Screen Hub
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [extraFormForKey, setExtraFormForKey] = useState<string | null>(null);
  const [extraName, setExtraName] = useState('');
  const [extraPriceStr, setExtraPriceStr] = useState('');
  const [extraQty, setExtraQty] = useState(1);
  const [extraClientName, setExtraClientName] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [savingExtra, setSavingExtra] = useState(false);

  const [showDisplayHub, setShowDisplayHub] = useState(false);
  const [displayQrMode, setDisplayQrMode] = useState<DisplayMode | null>(null);
  const [monitors, setMonitors] = useState<MonitorOption[]>(() => getDefaultMonitorPresets());
  const [savedMonitors, setSavedMonitors] = useState<SavedMonitorMap>(() => getSavedMonitors());
  const [detectingMonitors, setDetectingMonitors] = useState(false);
  const [projectedLabel, setProjectedLabel] = useState<string>('');

  // Cancel item state
  const [cancelOrderTarget, setCancelOrderTarget] = useState<{
    orderId: string;
    label: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const canDiscount = canRoleDo(bar, role, 'can_discount') || Boolean(discountUnlockedBy);
  const canCancel = canRoleDo(bar, role, 'can_cancel_order') || exclusiveTerminalMode;
  const canCloseShift = canRoleDo(bar, role, 'can_close_shift');
  const isOwnerRole = role === 'owner' || role === 'dono' || role === 'gerente';
  const storeHasPin = hasStoreManagerPin(bar);

  const waiterOptions = useMemo(() => {
    const set = new Set<string>();
    (ops.staff_accounts || []).forEach((acc) => {
      if (acc.active && (acc.roles.includes('garcom') || acc.roles.includes('gerente'))) {
        set.add(acc.name);
      }
    });
    Object.values(ops.table_waiters || {}).forEach((tw) => {
      if (tw?.waiter_name?.trim()) set.add(tw.waiter_name.trim());
    });
    (ops.waiter_config?.zones || []).forEach((z) => {
      if (z.waiter_name?.trim()) set.add(z.waiter_name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [ops.staff_accounts, ops.table_waiters, ops.waiter_config]);

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
        status: o.status,
        note: o.note,
        createdAt: o.created_at,
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
    setServiceFeeMode('pct');
    setServiceFeePct(ops.default_service_fee_pct ?? 10);
    setServiceFeeFixedStr('');
    const effOwner = c.isTable ? getEffectiveTableOwner(bar, c.name) : null;
    setSelectedWaiterName(effOwner?.waiterName || '');
    const hasCouvert = Boolean(ops.couvert_enabled && (ops.couvert_price || 0) > 0);
    setIncludeCouvert(hasCouvert);
    setCouvertUnitStr(String(ops.couvert_price || 0));
    setCouvertPeopleCount(
      ops.couvert_per_person ? Math.max(1, c.members.length || 1) : 1
    );
    setDiscountType('brl');
    setDiscountValStr('0');
    setDiscountReason('');
    setDiscountUnlockedBy(null);
    setDiscountPinInput('');
    setDiscountPinErr('');
    setSplitPeople(Math.max(1, c.isTable ? Math.min(c.members.length || 1, 1) : 1));
    setPayMethod('credito');
    setCashReceivedStr('');
    setMixedSplits({ pix: '', credito: '', debito: '', dinheiro: '' });
    setShowPixQr(false);
  };

  // Checkout calculated totals (Subtotal + Couvert + Serviço Garçom - Desconto)
  const checkoutCalc = useMemo(() => {
    if (!checkoutTab) return { subtotal: 0, couvert: 0, fee: 0, discount: 0, total: 0 };
    const subtotal = checkoutTab.total;
    const couvertUnit = Math.max(0, Number(couvertUnitStr.replace(',', '.')) || 0);
    const couvertMult = ops.couvert_per_person ? Math.max(1, couvertPeopleCount) : 1;
    const couvert =
      hasPricing && includeCouvert && couvertUnit > 0
        ? Math.round(couvertUnit * couvertMult * 100) / 100
        : 0;

    let fee = 0;
    if (hasPricing && includeServiceFee) {
      if (serviceFeeMode === 'fixed') {
        const parsedFixed = Math.max(0, Number(serviceFeeFixedStr.replace(',', '.')) || 0);
        fee = Math.round(parsedFixed * 100) / 100;
      } else {
        fee = Math.round(subtotal * (Math.max(0, serviceFeePct) / 100) * 100) / 100;
      }
    }

    const rawDisc = Math.max(0, Number(discountValStr.replace(',', '.')) || 0);
    const discountAllowed = Boolean(loyaltyRedeem) || Boolean(discountUnlockedBy);
    const discount = discountAllowed
      ? discountType === 'pct'
        ? Math.round(subtotal * (Math.min(100, rawDisc) / 100) * 100) / 100
        : Math.min(subtotal + couvert + fee, rawDisc)
      : 0;
    const total = Math.max(0, Math.round((subtotal + couvert + fee - discount) * 100) / 100);
    return { subtotal, couvert, fee, discount, total };
  }, [
    checkoutTab,
    hasPricing,
    includeCouvert,
    couvertUnitStr,
    couvertPeopleCount,
    ops.couvert_per_person,
    includeServiceFee,
    serviceFeeMode,
    serviceFeePct,
    serviceFeeFixedStr,
    discountType,
    discountValStr,
    discountUnlockedBy,
    loyaltyRedeem,
  ]);

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

  const projectTabToCustomerScreen = async (
    c: CustomerTab,
    overrideCalc?: {
      subtotal: number;
      couvert?: number;
      fee: number;
      feePct: number;
      discount: number;
      total: number;
      splitPeople?: number;
      paymentMethodLabel?: string;
      pixPayload?: string;
    }
  ) => {
    const feePct = overrideCalc ? overrideCalc.feePct : ops.default_service_fee_pct ?? 10;
    const subtotal = overrideCalc ? overrideCalc.subtotal : c.total;
    const couvert =
      overrideCalc?.couvert !== undefined
        ? overrideCalc.couvert
        : hasPricing && ops.couvert_enabled && (ops.couvert_price || 0) > 0
          ? Math.round(
              (ops.couvert_price || 0) *
                (ops.couvert_per_person ? Math.max(1, c.members.length || 1) : 1) *
                100
            ) / 100
          : 0;
    const fee = overrideCalc
      ? overrideCalc.fee
      : hasPricing && feePct > 0
        ? Math.round(subtotal * (feePct / 100) * 100) / 100
        : 0;
    const discount = overrideCalc ? overrideCalc.discount : 0;
    const total = overrideCalc
      ? overrideCalc.total
      : Math.max(0, subtotal + couvert + fee - discount);
    const computedPix =
      overrideCalc?.pixPayload !== undefined
        ? overrideCalc.pixPayload
        : ops.pix_key && total > 0
          ? buildPixBrCode({
              key: ops.pix_key,
              merchantName: ops.pix_merchant_name || bar.name,
              city: ops.pix_city || bar.city || 'BRASIL',
              amount: total,
              txid: `MB${Date.now().toString().slice(-8)}`,
            })
          : undefined;

    await publishCustomerDisplay(bar.id, {
      mode: 'checkout',
      barId: bar.id,
      customerName: c.name,
      isTable: c.isTable,
      tableCode: c.tableCode,
      items: c.items.map((it) => ({
        label: it.recipeName,
        qty: it.qty,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        note: it.note || undefined,
        clientName: it.clientName,
      })),
      subtotal,
      couvert,
      couvertLabel: ops.couvert_label || 'Couvert artístico',
      serviceFee: fee,
      serviceFeePct: feePct,
      service100ToWaiter: Boolean(ops.service_fee_100_to_waiter),
      discount,
      total,
      splitPeople: overrideCalc?.splitPeople || 1,
      paymentMethodLabel: overrideCalc?.paymentMethodLabel,
      pixPayload: computedPix || undefined,
      pixKey: ops.pix_key || undefined,
      updatedAt: new Date().toISOString(),
    });
    setProjectedLabel(`${c.name} · ${money(total)}`);
  };

  const clearCustomerScreenToLogo = async () => {
    await publishCustomerDisplay(bar.id, {
      mode: 'idle',
      barId: bar.id,
      updatedAt: new Date().toISOString(),
    });
    setProjectedLabel('');
    onToast('🖼️ 2ª Tela limpa — exibindo a logo da empresa!');
  };

  // Mantém a 2ª tela sincronizada em tempo real enquanto o modal de Checkout está aberto
  useEffect(() => {
    if (!checkoutTab) return;
    void projectTabToCustomerScreen(checkoutTab, {
      subtotal: checkoutCalc.subtotal,
      couvert: checkoutCalc.couvert,
      fee: checkoutCalc.fee,
      feePct: includeServiceFee && serviceFeeMode === 'pct' ? serviceFeePct : 0,
      discount: checkoutCalc.discount,
      total: checkoutCalc.total,
      splitPeople,
      paymentMethodLabel: PAYMENT_METHOD_LABELS[payMethod].label,
      pixPayload: payMethod === 'pix' || ops.pix_key ? pixPayload : '',
    });
  }, [
    checkoutTab?.key,
    checkoutCalc.total,
    checkoutCalc.couvert,
    checkoutCalc.fee,
    checkoutCalc.discount,
    splitPeople,
    payMethod,
    pixPayload,
  ]);

  const handleAddExtraCharge = async (c: CustomerTab) => {
    const label = extraName.trim();
    const price = Math.max(0, Number(extraPriceStr.replace(',', '.')) || 0);
    const qty = Math.max(1, Math.min(50, Number(extraQty) || 1));
    if (label.length < 2) {
      onToast('Digite o nome da dose extra ou adicional.');
      return;
    }
    if (hasPricing && price <= 0) {
      onToast('Informe o valor do adicional (R$).');
      return;
    }

    setSavingExtra(true);
    try {
      const targetClient = (extraClientName.trim() || c.members[0] || c.name).slice(0, 60);
      const basePayload: Record<string, unknown> = {
        bar_id: bar.id,
        client_name: targetClient,
        customer_name: targetClient,
        recipe_name: `➕ ${label}`,
        qty,
        price,
        unit_price: price,
        note: extraNote.trim() || 'Adicional lançado no caixa',
        status: 'done',
        paid: false,
        station: 'bar',
      };
      if (c.isTable) {
        basePayload.table_label = c.name;
        if (c.tableTabId) basePayload.table_tab_id = c.tableTabId;
      }

      let ins = await sb.from('orders').insert(basePayload);
      if (ins.error) {
        // Fallback para bancos com schema mais enxuto ou recipe_id obrigatório
        const fallbackRecipeId = recipes[0]?.id;
        const retryPayload: Record<string, unknown> = {
          bar_id: bar.id,
          client_name: targetClient,
          recipe_name: `➕ ${label}`,
          qty,
          price,
          note: extraNote.trim() || 'Adicional lançado no caixa',
          status: 'done',
          paid: false,
          ...(c.isTable ? { table_label: c.name } : {}),
          ...(c.tableTabId ? { table_tab_id: c.tableTabId } : {}),
          ...(fallbackRecipeId ? { recipe_id: fallbackRecipeId } : {}),
        };
        ins = await sb.from('orders').insert(retryPayload);
      }

      if (ins.error) {
        onToast('Erro ao lançar adicional: ' + ins.error.message);
        return;
      }

      setExtraName('');
      setExtraPriceStr('');
      setExtraQty(1);
      setExtraNote('');
      setExtraFormForKey(null);
      onToast(`✓ ${qty}× ${label} (${money(price * qty)}) adicionado na conta de ${c.name}!`);
      await onRefreshOrders();
    } finally {
      setSavingExtra(false);
    }
  };

  const handleDetectMonitors = async () => {
    setDetectingMonitors(true);
    const res = await detectAvailableMonitors();
    setMonitors(res.monitors);
    setDetectingMonitors(false);
    onToast(
      res.detectedPhysical > 0
        ? `✓ ${res.detectedPhysical} monitor(es) físico(s) detectado(s)! Escolha e salve abaixo.`
        : 'Use os perfis de monitor abaixo ou abra o link/QR na TV ou tablet.'
    );
  };

  const handleSelectMonitor = (mode: DisplayMode, screenId: string) => {
    const picked = monitors.find((m) => m.screenId === screenId) || null;
    const next = saveMonitorForMode(mode, picked);
    setSavedMonitors(next);
    if (picked) {
      onToast(`✓ Monitor "${picked.label}" salvo permanentemente para esta tela!`);
    }
  };

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
          couvert: checkoutCalc.couvert,
          couvert_label: checkoutCalc.couvert > 0 ? ops.couvert_label || 'Couvert artístico' : undefined,
          service_fee: checkoutCalc.fee,
          service_100_to_waiter: Boolean(ops.service_fee_100_to_waiter && checkoutCalc.fee > 0),
          waiter_name: selectedWaiterName.trim() || undefined,
          waiter_commission:
            ops.service_fee_100_to_waiter && checkoutCalc.fee > 0
              ? checkoutCalc.fee
              : undefined,
          discount: checkoutCalc.discount,
          discount_reason: discountReason.trim() || undefined,
          discount_approved_by: discountUnlockedBy || undefined,
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
            'Desconto / Cortesia (Aprovado ADM)',
            `${checkoutTab.name}: -${money(checkoutCalc.discount)} (${discountReason.trim() || 'sem motivo informado'}) | Liberado por: ${discountUnlockedBy || actorName}`,
            actorName,
            role || 'caixa',
            onBarUpdated
          );
        }
      }

      if (clientFilter === checkoutTab.key) setClientFilter('');
      await publishCustomerDisplay(bar.id, {
        mode: 'paid',
        barId: bar.id,
        customerName: checkoutTab.name,
        total: checkoutCalc.total,
        updatedAt: new Date().toISOString(),
      });
      setProjectedLabel('');
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

  const handleUnlockDiscountWithPin = async () => {
    setDiscountPinErr('');
    if (!storeHasPin) {
      if (isOwnerRole && !exclusiveTerminalMode) {
        setDiscountUnlockedBy(`${actorName || 'Dono'} (sem PIN cadastrado)`);
        onToast('Desconto liberado! Dica: cadastre a Senha ADM em Gestão → Config.');
        return;
      }
      setDiscountPinErr('Peça ao Dono/Gerente para cadastrar a Senha ADM da loja em Gestão → Config.');
      return;
    }
    if (!discountPinInput.trim()) {
      setDiscountPinErr('Digite a Senha ADM (Gerente ou Dono).');
      return;
    }
    setCheckingDiscountPin(true);
    try {
      const res = await verifyStoreManagerPin(bar, discountPinInput.trim());
      if (!res.ok) {
        setDiscountPinErr('Senha ADM incorreta.');
        return;
      }
      setDiscountUnlockedBy(res.approverName || 'Gerente/Dono');
      setDiscountPinInput('');
      onToast(`🔓 Desconto liberado por ${res.approverName || 'Gerente/Dono'}!`);
    } finally {
      setCheckingDiscountPin(false);
    }
  };

  const handleSaveSupervisedItemEdit = async () => {
    if (!editItemTarget) return;
    setEditItemPinErr('');
    const nextQty = Math.max(1, Math.min(99, parseInt(editItemQtyStr, 10) || 1));

    let approvedBy = actorName || 'Dono';
    if (storeHasPin || exclusiveTerminalMode || !isOwnerRole) {
      if (!storeHasPin) {
        if (!isOwnerRole || exclusiveTerminalMode) {
          setEditItemPinErr('Cadastre uma Senha ADM da loja em Gestão → Config para liberar edições no Caixa.');
          return;
        }
      } else {
        const res = await verifyStoreManagerPin(bar, editItemPin.trim());
        if (!res.ok) {
          setEditItemPinErr('Senha ADM (Gerente/Dono) incorreta.');
          return;
        }
        approvedBy = res.approverName || 'Gerente/Dono';
      }
    }

    setBusy(true);
    try {
      const r = await sb
        .from('orders')
        .update({ qty: nextQty })
        .eq('id', editItemTarget.orderId);
      if (r.error) {
        setEditItemPinErr(r.error.message || 'Erro ao editar item.');
        return;
      }
      await logBarAudit(
        bar,
        'Edição supervisionada no caixa',
        `${editItemTarget.tabName} · ${editItemTarget.recipeName}: qtd ${editItemTarget.currentQty} → ${nextQty} | Motivo: ${editItemReason.trim() || 'Ajuste de comanda'} | Aprovado por: ${approvedBy}`,
        actorName,
        role || 'caixa',
        onBarUpdated
      );
      onToast(`✓ Item editado (supervisionado por ${approvedBy}).`);
      setEditItemTarget(null);
      setEditItemPin('');
      setEditItemReason('');
      await onRefreshOrders();
    } finally {
      setBusy(false);
    }
  };

  const handleCancelSingleOrder = async () => {
    if (!cancelOrderTarget) return;
    setCancelPinErr('');
    if (!canCancel) {
      onToast('Seu cargo não tem permissão para cancelar pedidos.');
      return;
    }

    let approvedBy = actorName || 'Dono';
    if (storeHasPin || exclusiveTerminalMode || !isOwnerRole) {
      if (!storeHasPin) {
        if (!isOwnerRole || exclusiveTerminalMode) {
          setCancelPinErr('Cadastre a Senha ADM da loja em Gestão → Config para autorizar cancelamentos.');
          return;
        }
      } else {
        const res = await verifyStoreManagerPin(bar, cancelPin.trim());
        if (!res.ok) {
          setCancelPinErr('Senha ADM (Gerente/Dono) incorreta.');
          return;
        }
        approvedBy = res.approverName || 'Gerente/Dono';
      }
    }

    setBusy(true);
    try {
      await sb.from('orders').delete().eq('id', cancelOrderTarget.orderId);
      await logBarAudit(
        bar,
        'Cancelamento de item no caixa',
        `${cancelOrderTarget.label} — Motivo: ${cancelReason.trim() || 'Não informado'} | Aprovado por: ${approvedBy}`,
        actorName,
        role || 'caixa',
        onBarUpdated
      );
      onToast(`Item cancelado (aprovado por ${approvedBy}) e registrado na auditoria.`);
      setCancelOrderTarget(null);
      setCancelReason('');
      setCancelPin('');
      await onRefreshOrders();
    } finally {
      setBusy(false);
    }
  };

  const handlePrintTab = (c: CustomerTab, isPreBill: boolean) => {
    const feePct = ops.default_service_fee_pct ?? 10;
    const couvert =
      hasPricing && ops.couvert_enabled && (ops.couvert_price || 0) > 0
        ? Math.round(
            (ops.couvert_price || 0) *
              (ops.couvert_per_person ? Math.max(1, c.members.length || 1) : 1) *
              100
          ) / 100
        : 0;
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
      couvert,
      couvertLabel: ops.couvert_label || 'Couvert artístico',
      serviceFee: fee,
      serviceFeePct: feePct,
      service100ToWaiter: Boolean(ops.service_fee_100_to_waiter),
      discount: 0,
      total: c.total + couvert + fee,
      isPreBill,
    });
    if (!ok) onToast('Não foi possível abrir a janela de impressão neste aparelho.');
  };

  const handleCopyWhatsAppBill = (c: CustomerTab) => {
    const feePct = ops.default_service_fee_pct ?? 10;
    const couvert =
      hasPricing && ops.couvert_enabled && (ops.couvert_price || 0) > 0
        ? Math.round(
            (ops.couvert_price || 0) *
              (ops.couvert_per_person ? Math.max(1, c.members.length || 1) : 1) *
              100
          ) / 100
        : 0;
    const fee = hasPricing && feePct > 0 ? Math.round(c.total * (feePct / 100) * 100) / 100 : 0;
    const lines = [
      `🧾 *Resumo da conta — ${bar.name}*`,
      `${c.isTable ? '🪑 ' + c.name : '👤 ' + c.name}`,
      '',
      ...c.items.map((it) => `• ${it.qty}x ${it.recipeName} — ${money(it.lineTotal)}`),
      '',
      `Subtotal: ${money(c.total)}`,
      ...(couvert > 0 ? [`🎵 ${ops.couvert_label || 'Couvert artístico'}: ${money(couvert)}`] : []),
      ...(fee > 0
        ? [
            `Serviço (${feePct}%): ${money(fee)}${
              ops.service_fee_100_to_waiter ? ' (100% repassado ao garçom)' : ''
            }`,
          ]
        : []),
      `*Total: ${money(c.total + couvert + fee)}*`,
      ...(ops.pix_key ? ['', `💠 Chave Pix da loja: ${ops.pix_key}`] : []),
    ].join('\n');
    void navigator.clipboard?.writeText(lines);
    onToast('Resumo da conta copiado! Cole no WhatsApp do cliente.');
  };

  return (
    <div>
      <div className="row sp flex-wrap gap-2">
        {!exclusiveTerminalMode ? (
          <button type="button" className="b g sm" onClick={onBackMore}>
            ← Voltar para Mais
          </button>
        ) : (
          <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-[var(--ac)]/20 text-[var(--ac)] border border-[var(--ac)]/40">
            🖥️ Terminal Exclusivo do Caixa · Operador: {actorName}
          </span>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            className="b sm"
            onClick={() => setShowDisplayHub(true)}
          >
            📺 Selecionar Tela Extra / 2ª Tela
          </button>
          {projectedLabel && (
            <button
              type="button"
              className="b g sm"
              onClick={() => void clearCustomerScreenToLogo()}
              title="Voltar 2ª tela para a logo da empresa"
            >
              🖼️ Mostrar Logo
            </button>
          )}
          {!exclusiveTerminalMode && onEnterExclusiveTerminal && (
            <button
              type="button"
              className="b g sm"
              onClick={onEnterExclusiveTerminal}
              title="Abrir modo dedicado somente para operação do Caixa"
            >
              🖥️ Modo Terminal Caixa
            </button>
          )}
          {!exclusiveTerminalMode && onGoManagement && canRoleDo(bar, role, 'can_view_reports') && (
            <button
              type="button"
              className="b g sm"
              onClick={() => onGoManagement('dashboard')}
            >
              📊 Relatórios
            </button>
          )}
        </div>
      </div>

      <h1 className="mt-3">
        {exclusiveTerminalMode ? 'Terminal do Caixa' : 'Caixa & Turno'}
      </h1>
      <p className="mu">
        {exclusiveTerminalMode
          ? `${bar.name} · Visualize comandas, edite itens sob supervisão da Senha ADM, finalize cobranças e escolha a tela extra para o cliente.`
          : `${bar.name} · Toque no nome do cliente ou mesa para abrir detalhado, adicionar doses extras e projetar o resumo + Pix QR na 2ª tela.`}
      </p>

      {/* MENU RÁPIDO DE TELA EXTRA (DESTAQUE NO TERMINAL EXCLUSIVO DO CAIXA) */}
      {exclusiveTerminalMode && (
        <div className="panel mt-2.5 !border-[var(--ac)]/45 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs font-extrabold text-[var(--ac)]">
              📺 Menu Rápido — Selecionar Tela Extra de Visualização
            </div>
            <button
              type="button"
              className="b g sm !py-1"
              onClick={() => setShowDisplayHub(true)}
            >
              ⚙️ Configurar Monitores Salvos
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              className="b sm"
              onClick={() => {
                if (onOpenDisplayMode) onOpenDisplayMode('customer');
                else setShowDisplayHub(true);
              }}
            >
              💳 2ª Tela Cliente
            </button>
            <button
              type="button"
              className="b g sm"
              onClick={() => {
                if (onOpenDisplayMode) onOpenDisplayMode('queue_client');
                else setShowDisplayHub(true);
              }}
            >
              📺 TV Fila Clientes
            </button>
            <button
              type="button"
              className="b g sm"
              onClick={() => {
                if (onOpenDisplayMode) onOpenDisplayMode('queue_team');
                else setShowDisplayHub(true);
              }}
            >
              👨‍🍳 TV Fila Equipe
            </button>
            <button
              type="button"
              className="b g sm"
              onClick={() => void clearCustomerScreenToLogo()}
            >
              🖼️ Exibir Logo
            </button>
          </div>
        </div>
      )}

      {projectedLabel && (
        <div className="panel mt-2 !py-2 !px-3 !border-[var(--ac)]/50 flex items-center justify-between gap-2 flex-wrap text-xs">
          <span>
            📺 <b>2ª Tela exibindo agora:</b> {projectedLabel}
          </span>
          <button
            type="button"
            className="b g sm !py-1"
            onClick={() => void clearCustomerScreenToLogo()}
          >
            🖼️ Limpar (Exibir Logo)
          </button>
        </div>
      )}

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

      {/* LISTA DE COMANDAS EM ABERTO (EXPANSÍVEL AO CLICAR NO NOME) */}
      <div className="space-y-2.5 mt-3.5">
        {customers.length > 0 ? (
          customers.map((c) => {
            const isExpanded = expandedKey === c.key;
            const totalUnits = c.items.reduce((acc, it) => acc + it.qty, 0);
            const showExtraDrawer = extraFormForKey === c.key;
            return (
              <div
                key={c.key}
                className={`rounded-2xl p-3.5 border transition-colors space-y-2.5 ${
                  isExpanded
                    ? 'border-[var(--ac)] bg-[var(--sf)]'
                    : 'border-[var(--bd)] bg-[var(--sf)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    className="text-left bg-transparent border-0 p-0 cursor-pointer flex-1 min-w-[180px] text-[var(--tx)]"
                    onClick={() => setExpandedKey(isExpanded ? null : c.key)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--ac)]">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <b className="text-base">{c.isTable ? `🪑 ${c.name}` : `👤 ${c.name}`}</b>
                      {c.tableCode && (
                        <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                          Cód: {c.tableCode}
                        </span>
                      )}
                      {hasPricing && <span className="pr text-base">{money(c.total)}</span>}
                    </div>
                    <div className="mu text-[0.76rem] mt-0.5">
                      {totalUnits} item(ns) · Toque no nome para {isExpanded ? 'recolher' : 'ver pedidos detalhados e adicionar extras'}
                      {c.isTable && c.members.length > 0 ? ` · Na mesa: ${c.members.join(', ')}` : ''}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => {
                        setExpandedKey(c.key);
                        setExtraFormForKey(showExtraDrawer ? null : c.key);
                        setExtraClientName(c.members[0] || c.name);
                      }}
                    >
                      ➕ Dose / Extra
                    </button>
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => {
                        void projectTabToCustomerScreen(c);
                        onToast(`📺 Resumo + Pix QR de ${c.name} enviado para a 2ª Tela!`);
                      }}
                    >
                      📺 2ª Tela
                    </button>
                    <button
                      type="button"
                      className="b sm ok"
                      onClick={() => openCheckout(c)}
                    >
                      {c.isTable ? '💳 Fechar mesa' : '💳 Receber'}
                    </button>
                  </div>
                </div>

                {/* RESUMO COMPACTO QUANDO RECOLHIDO */}
                {!isExpanded && c.items.length > 0 && (
                  <div className="text-xs text-[var(--mut)] truncate pt-1 border-t border-[var(--bd)]">
                    {c.items
                      .slice(0, 3)
                      .map((it) => `${it.qty}× ${it.recipeName}`)
                      .join(' · ')}
                    {c.items.length > 3 ? ` +${c.items.length - 3} item(ns)` : ''}
                  </div>
                )}

                {/* VISÃO DETALHADA EXPANDIDA AO CLICAR NO NOME */}
                {isExpanded && (
                  <div className="space-y-2.5 pt-2.5 border-t border-[var(--bd)]">
                    {/* Ações secundárias da comanda */}
                    <div className="flex flex-wrap gap-1.5">
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
                        📤 Resumo WhatsApp
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => {
                          void projectTabToCustomerScreen(c);
                          onToast(`📺 ${c.name} projetado na 2ª Tela com Pix QR!`);
                        }}
                      >
                        📺 Projetar Resumo + QR
                      </button>
                    </div>

                    {/* Consumo individual por pessoa na mesa */}
                    {c.isTable && Object.keys(c.byMember).length > 1 && (
                      <div className="rounded-xl p-2.5 bg-[var(--s2)] border border-[var(--bd)] space-y-1 text-xs">
                        <div className="font-bold text-[var(--ac)]">
                          👥 Resumo por pessoa nesta mesa
                        </div>
                        {Object.entries(c.byMember).map(([memberName, val]) => (
                          <div key={memberName} className="flex justify-between">
                            <span>{memberName}</span>
                            <b className="tabular-nums">{money(val)}</b>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gaveta rápida: Adicionar Dose Extra / Adicional / Item Avulso */}
                    {showExtraDrawer && (
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--ac)]/50 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-[var(--ac)]">
                            ➕ Lançar Dose Extra / Adicional na conta de {c.name}
                          </div>
                          <button
                            type="button"
                            className="b g sm !py-0.5"
                            onClick={() => setExtraFormForKey(null)}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_EXTRAS.map((qx) => (
                            <button
                              key={qx.label}
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[var(--bd)] bg-[var(--s1)] text-[var(--tx)] cursor-pointer hover:border-[var(--ac)]"
                              onClick={() => {
                                setExtraName(qx.label);
                                setExtraPriceStr(String(qx.price));
                              }}
                            >
                              + {qx.label} ({money(qx.price)})
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            value={extraName}
                            onChange={(e) => setExtraName(e.target.value)}
                            placeholder="Descrição (ex: Dose extra Whisky, Red Bull)"
                            className="sm:col-span-6 !mt-0"
                          />
                          <input
                            value={extraPriceStr}
                            onChange={(e) => setExtraPriceStr(e.target.value)}
                            placeholder="Valor R$ (ex: 15)"
                            className="sm:col-span-3 !mt-0"
                          />
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={extraQty}
                            onChange={(e) => setExtraQty(Math.max(1, Number(e.target.value) || 1))}
                            placeholder="Qtd"
                            className="sm:col-span-3 !mt-0"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {c.isTable && (
                            <input
                              value={extraClientName}
                              onChange={(e) => setExtraClientName(e.target.value)}
                              placeholder="Para qual pessoa da mesa?"
                              className="!mt-0"
                            />
                          )}
                          <input
                            value={extraNote}
                            onChange={(e) => setExtraNote(e.target.value)}
                            placeholder="Observação (opcional)"
                            className="!mt-0"
                          />
                        </div>

                        <button
                          type="button"
                          className="b ok sm full"
                          disabled={savingExtra}
                          onClick={() => void handleAddExtraCharge(c)}
                        >
                          {savingExtra ? 'Lançando…' : '✓ Adicionar e cobrar nesta comanda'}
                        </button>
                      </div>
                    )}

                    {/* Lista completa de pedidos individuais da pessoa/mesa */}
                    {c.items.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">
                          Pedidos individuais ({c.items.length})
                        </div>
                        {c.items.map((it) => {
                          const stLabel =
                            it.status === 'done'
                              ? 'Entregue'
                              : it.status === 'ready'
                                ? 'Pronto'
                                : 'Preparando';
                          const stColor =
                            it.status === 'done'
                              ? 'text-[var(--ok)]'
                              : it.status === 'ready'
                                ? 'text-[var(--ac)]'
                                : 'text-[var(--mut)]';
                          return (
                            <div
                              key={it.orderId}
                              className="rounded-xl px-3 py-2 bg-[var(--s2)] border border-[var(--bd)] flex items-start justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-[var(--tx)]">
                                  {it.qty}× {it.recipeName}
                                  {hasPricing && it.qty > 1 && (
                                    <span className="font-normal text-[var(--mut)]">
                                      {' '}
                                      ({money(it.unitPrice)} un.)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[var(--mut)] mt-0.5 flex flex-wrap items-center gap-1.5">
                                  {c.isTable && <span>👤 {it.clientName}</span>}
                                  <span className={`font-semibold ${stColor}`}>· {stLabel}</span>
                                  {it.createdAt && (
                                    <span>
                                      ·{' '}
                                      {new Date(it.createdAt).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                                {it.note && (
                                  <div className="text-[11px] text-[var(--ac)] mt-0.5">
                                    📝 {it.note}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasPricing && (
                                  <b className="tabular-nums text-sm">{money(it.lineTotal)}</b>
                                )}
                                <button
                                  type="button"
                                  className="text-[11px] text-[var(--ac)] hover:opacity-80 bg-transparent border-0 cursor-pointer px-1"
                                  title="Editar quantidade (requer Senha ADM)"
                                  onClick={() => {
                                    setEditItemTarget({
                                      orderId: it.orderId,
                                      tabName: c.name,
                                      recipeName: it.recipeName,
                                      currentQty: it.qty,
                                      unitPrice: it.unitPrice,
                                    });
                                    setEditItemQtyStr(String(it.qty));
                                    setEditItemReason('');
                                    setEditItemPin('');
                                    setEditItemPinErr('');
                                  }}
                                >
                                  ✏️
                                </button>
                                {canCancel && (
                                  <button
                                    type="button"
                                    className="text-[11px] text-red-400 hover:text-red-300 bg-transparent border-0 cursor-pointer px-1"
                                    title="Cancelar item (requer Senha ADM)"
                                    onClick={() => {
                                      setCancelPin('');
                                      setCancelPinErr('');
                                      setCancelOrderTarget({
                                        orderId: it.orderId,
                                        label: `${it.qty}x ${it.recipeName} (${c.name})`,
                                      });
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mu text-[0.78rem] !mb-0">
                        Comanda aberta via QR da mesa (nenhum pedido lançado ainda). Você pode lançar um adicional acima.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="mu">
            {allCustomers.length > 0
              ? 'Nenhuma comanda encontrada com esse filtro.'
              : 'Nenhuma comanda pendente no caixa agora.'}
          </p>
        )}
      </div>

      {/* MODAL: HUB DE 2ª TELA, MONITORES SALVOS E TVs DE FILA */}
      {showDisplayHub && (
        <div className="ov !z-[60]" onClick={() => setShowDisplayHub(false)}>
          <div
            className="w narrow !max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row sp mb-2">
              <h2 className="!m-0">📺 2ª Tela, TVs de Fila & Monitores</h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => setShowDisplayHub(false)}
              >
                ✕
              </button>
            </div>
            <p className="mu text-xs">
              Exiba o resumo da compra + Pix QR ou a fila de pedidos em outro monitor, TV ou tablet — <b>somente visualização</b>, sem mostrar o resto do app. Quando não houver nada ativo, exibe automaticamente a <b>logo da sua empresa</b>.
            </p>

            <div className="panel !p-3 my-3 space-y-2">
              <div className="row sp flex-wrap gap-2">
                <div className="text-xs font-bold">🖥️ Monitores / Telas disponíveis</div>
                <button
                  type="button"
                  className="b g sm"
                  disabled={detectingMonitors}
                  onClick={() => void handleDetectMonitors()}
                >
                  {detectingMonitors ? 'Detectando…' : '🔍 Detectar monitores'}
                </button>
              </div>
              <p className="mu text-[11px] !m-0">
                Escolha abaixo qual monitor reproduz cada tela. A escolha fica salva automaticamente neste aparelho para sempre usar o mesmo monitor.
              </p>
            </div>

            <div className="space-y-3">
              {(
                [
                  {
                    mode: 'customer' as DisplayMode,
                    title: '💳 2ª Tela do Caixa (Cliente + Pix QR)',
                    desc: 'Mostra os itens, doses extras, total e QR Code Pix em tempo real. Quando ociosa, exibe a logo da empresa.',
                  },
                  {
                    mode: 'queue_client' as DisplayMode,
                    title: '📺 TV Fila para Clientes (Salão)',
                    desc: 'Painel dividido em "Em Preparo" e "Pronto!" com aviso sonoro. Exibe a logo quando a fila zera.',
                  },
                  {
                    mode: 'queue_team' as DisplayMode,
                    title: '🍳 Monitor Fila da Equipe (KDS Somente Leitura)',
                    desc: 'Tela de parede para Cozinha e Barman acompanharem pedidos, extras e tempo de espera.',
                  },
                ] as const
              ).map((cfg) => {
                const url = buildDisplayUrl(bar.id, cfg.mode);
                const savedMon = savedMonitors[cfg.mode];
                return (
                  <div
                    key={cfg.mode}
                    className="panel !p-3.5 space-y-2.5 !border-[var(--bd)]"
                  >
                    <div>
                      <div className="font-bold text-sm">{cfg.title}</div>
                      <div className="text-xs text-[var(--mut)] mt-0.5">{cfg.desc}</div>
                    </div>

                    <div>
                      <label className="!mt-0 text-[11px]">
                        Monitor salvo para esta tela:
                      </label>
                      <select
                        value={savedMon?.screenId || ''}
                        onChange={(e) => handleSelectMonitor(cfg.mode, e.target.value)}
                      >
                        <option value="">Selecionar monitor / dispositivo...</option>
                        {monitors.map((m) => (
                          <option key={m.screenId} value={m.screenId}>
                            {m.label}
                            {m.resolution ? ` (${m.resolution})` : ''}
                          </option>
                        ))}
                      </select>
                      {savedMon && (
                        <div className="text-[11px] text-[var(--ok)] font-semibold mt-1">
                          ✓ Salvo permanentemente em: {savedMon.label}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="b sm"
                        onClick={async () => {
                          const cast = await startPresentationCast(url);
                          if (cast.ok) {
                            onToast('📺 Transmitindo na segunda tela!');
                          } else {
                            onToast(cast.error || 'Copie o link ou escaneie o QR na outra tela.');
                            setDisplayQrMode(cfg.mode);
                          }
                        }}
                      >
                        📡 Transmitir p/ Monitor/TV
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => {
                          void navigator.clipboard?.writeText(url);
                          onToast('🔗 Link da tela somente visualização copiado!');
                        }}
                      >
                        🔗 Copiar link
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() =>
                          setDisplayQrMode(displayQrMode === cfg.mode ? null : cfg.mode)
                        }
                      >
                        📱 QR p/ Tablet/TV
                      </button>
                      {onOpenDisplayMode && (
                        <button
                          type="button"
                          className="b g sm"
                          onClick={() => {
                            setShowDisplayHub(false);
                            onOpenDisplayMode(cfg.mode);
                          }}
                        >
                          ⛶ Abrir aqui
                        </button>
                      )}
                    </div>

                    {displayQrMode === cfg.mode && (
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] text-center space-y-2">
                        <div className="text-xs font-bold">
                          Aponte a câmera do tablet/celular ou abra este link na Smart TV:
                        </div>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                            url
                          )}`}
                          alt="QR Segunda Tela"
                          className="mx-auto w-40 h-40 rounded-xl bg-white p-2"
                        />
                        <div className="text-[10px] text-[var(--mut)] break-all">{url}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="b g full"
                onClick={() => void clearCustomerScreenToLogo()}
              >
                🖼️ Limpar 2ª Tela do Caixa agora (Mostrar Logo da Empresa)
              </button>
            </div>
          </div>
        </div>
      )}

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

            {/* COUVERT, COMISSÃO DO GARÇOM & DESCONTO (COM SENHA ADM) */}
            {hasPricing && (
              <div className="panel !p-3 mb-3 space-y-3">
                {/* 1. COUVERT ARTÍSTICO */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="!m-0 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={includeCouvert}
                        disabled={
                          ops.couvert_enabled &&
                          ops.couvert_mode === 'mandatory' &&
                          !discountUnlockedBy
                        }
                        onChange={(e) => setIncludeCouvert(e.target.checked)}
                        className="!w-4 !h-4"
                      />
                      <span>
                        🎵 {ops.couvert_label || 'Couvert artístico'}
                        {ops.couvert_enabled && ops.couvert_mode === 'mandatory' && (
                          <span className="ml-1 text-[10px] text-amber-300 font-bold">
                            (Obrigatório)
                          </span>
                        )}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--mut)]">R$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={couvertUnitStr}
                        disabled={!includeCouvert}
                        onChange={(e) => setCouvertUnitStr(e.target.value)}
                        className="!w-20 !py-1 text-center text-xs"
                      />
                      {ops.couvert_per_person && includeCouvert && (
                        <>
                          <span className="text-[11px] text-[var(--mut)]">×</span>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={couvertPeopleCount}
                            onChange={(e) =>
                              setCouvertPeopleCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="!w-14 !py-1 text-center text-xs"
                            title="Pessoas"
                          />
                          <span className="text-[10px] text-[var(--mut)]">pess.</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. COMISSÃO DO GARÇOM (% OU R$ FIXO + 100% GARÇOM) */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="!m-0 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={includeServiceFee}
                        onChange={(e) => setIncludeServiceFee(e.target.checked)}
                        className="!w-4 !h-4"
                      />
                      🙋 Comissão do garçom (opcional)
                    </label>
                    {includeServiceFee && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={`b sm !py-0.5 !px-2 !text-[11px] ${
                            serviceFeeMode === 'pct' ? '' : 'g'
                          }`}
                          onClick={() => setServiceFeeMode('pct')}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          className={`b sm !py-0.5 !px-2 !text-[11px] ${
                            serviceFeeMode === 'fixed' ? '' : 'g'
                          }`}
                          onClick={() => setServiceFeeMode('fixed')}
                        >
                          R$ Fixo
                        </button>
                      </div>
                    )}
                  </div>

                  {includeServiceFee && (
                    <div className="space-y-1.5">
                      {serviceFeeMode === 'pct' ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            {[10, 12, 15, 20].map((p) => (
                              <button
                                key={p}
                                type="button"
                                className={`b sm !py-0.5 !px-2 !text-[11px] ${
                                  serviceFeePct === p ? '' : 'g'
                                }`}
                                onClick={() => setServiceFeePct(p)}
                              >
                                {p}%
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={serviceFeePct}
                              onChange={(e) =>
                                setServiceFeePct(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                              }
                              className="!w-16 !py-1 text-center text-xs"
                            />
                            <span className="text-xs">%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--mut)]">Valor fixo do garçom (R$):</span>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={serviceFeeFixedStr}
                            onChange={(e) => setServiceFeeFixedStr(e.target.value)}
                            placeholder="Ex: 20,00"
                            className="!w-28 !py-1 text-xs"
                          />
                        </div>
                      )}

                      {waiterOptions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--mut)] shrink-0">Garçom:</span>
                          <select
                            value={selectedWaiterName}
                            onChange={(e) => setSelectedWaiterName(e.target.value)}
                            className="!py-1 text-xs flex-1"
                          >
                            <option value="">Selecionar garçom (opcional)</option>
                            {waiterOptions.map((w) => (
                              <option key={w} value={w}>
                                👤 {w}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {ops.service_fee_100_to_waiter && (
                        <div className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/35 rounded-lg px-2.5 py-1.5">
                          💚 100% deste valor vai diretamente para a comissão do garçom
                          {selectedWaiterName ? ` (${selectedWaiterName})` : ''}!
                        </div>
                      )}
                    </div>
                  )}
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
                                    checkoutCalc.subtotal + checkoutCalc.couvert + checkoutCalc.fee
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

                {/* 3. DESCONTO / CORTESIA PROTEGIDO POR SENHA ADM (GERENTE/DONO) */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold">
                      🏷️ Desconto / Cortesia{' '}
                      {discountUnlockedBy ? (
                        <span className="text-[10px] text-emerald-300 font-bold">
                          (🔓 Liberado por {discountUnlockedBy})
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-300 font-bold">
                          (🔐 Exige Senha ADM)
                        </span>
                      )}
                    </span>
                    {discountUnlockedBy && (
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
                    )}
                  </div>

                  {!discountUnlockedBy ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="password"
                          value={discountPinInput}
                          onChange={(e) => {
                            setDiscountPinInput(e.target.value);
                            if (discountPinErr) setDiscountPinErr('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void handleUnlockDiscountWithPin();
                            }
                          }}
                          placeholder="Senha do Gerente ou Dono (ADM)"
                          className="!py-1.5 text-xs flex-1"
                        />
                        <button
                          type="button"
                          className="b sm shrink-0"
                          disabled={checkingDiscountPin}
                          onClick={() => void handleUnlockDiscountWithPin()}
                        >
                          {checkingDiscountPin ? 'Verificando…' : '🔓 Liberar'}
                        </button>
                      </div>
                      {discountPinErr && (
                        <p className="err !my-0 text-[11px]">{discountPinErr}</p>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>

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
              {checkoutCalc.couvert > 0 && (
                <div className="row sp text-xs mt-1">
                  <span>🎵 {ops.couvert_label || 'Couvert artístico'}</span>
                  <span>+ {money(checkoutCalc.couvert)}</span>
                </div>
              )}
              {checkoutCalc.fee > 0 && (
                <div className="row sp text-xs mt-1">
                  <span>
                    🙋 Comissão garçom (
                    {serviceFeeMode === 'fixed' ? 'valor fixo' : `${serviceFeePct}%`})
                  </span>
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
                    couvert: checkoutCalc.couvert,
                    couvertLabel: ops.couvert_label || 'Couvert artístico',
                    serviceFee: checkoutCalc.fee,
                    serviceFeePct: includeServiceFee && serviceFeeMode === 'pct' ? serviceFeePct : 0,
                    service100ToWaiter: Boolean(ops.service_fee_100_to_waiter),
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

      {/* MODAL: EDITAR ITEM DA COMANDA (COM SUPERVISÃO SENHA ADM) */}
      {editItemTarget && (
        <div className="ov" onClick={() => !busy && setEditItemTarget(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <h2 className="!mt-0">✏️ Editar item da comanda</h2>
            <p className="mu text-xs">
              Comanda: <b>{editItemTarget.tabName}</b> · Item: <b>{editItemTarget.recipeName}</b>
            </p>
            <label>Nova quantidade</label>
            <input
              type="number"
              min={1}
              max={99}
              value={editItemQtyStr}
              onChange={(e) => setEditItemQtyStr(e.target.value)}
            />
            <label>Motivo da alteração</label>
            <input
              value={editItemReason}
              onChange={(e) => setEditItemReason(e.target.value)}
              placeholder="Ex: Ajuste de quantidade / erro de lançamento"
            />
            {(storeHasPin || exclusiveTerminalMode || !isOwnerRole) && (
              <>
                <label>🔐 Senha ADM (Gerente ou Dono da loja)</label>
                <input
                  type="password"
                  value={editItemPin}
                  onChange={(e) => {
                    setEditItemPin(e.target.value);
                    if (editItemPinErr) setEditItemPinErr('');
                  }}
                  placeholder="Digite a Senha ADM para autorizar"
                />
              </>
            )}
            {editItemPinErr && <p className="err">{editItemPinErr}</p>}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                type="button"
                className="b g"
                onClick={() => setEditItemTarget(null)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="b ok"
                disabled={busy}
                onClick={() => void handleSaveSupervisedItemEdit()}
              >
                {busy ? 'Salvando…' : '✓ Salvar alteração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR ITEM INDIVIDUAL (COM SUPERVISÃO SENHA ADM) */}
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
            {(storeHasPin || exclusiveTerminalMode || !isOwnerRole) && (
              <>
                <label>🔐 Senha ADM (Gerente ou Dono da loja)</label>
                <input
                  type="password"
                  value={cancelPin}
                  onChange={(e) => {
                    setCancelPin(e.target.value);
                    if (cancelPinErr) setCancelPinErr('');
                  }}
                  placeholder="Digite a Senha ADM para autorizar"
                />
              </>
            )}
            {cancelPinErr && <p className="err">{cancelPinErr}</p>}
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
