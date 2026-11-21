import React, { useEffect, useMemo, useState } from 'react';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getConnectedBluetoothPrinter,
  isWebBluetoothSupported,
  printBluetoothTestPage,
  subscribeBluetoothPrinter,
} from '../lib/bluetoothPrinter';
import { getDefaultUnitForIngredient, getUnitMeta } from '../lib/catalog';
import {
  canRoleDo,
  DEFAULT_MODIFIERS,
  DEFAULT_ROLE_PERMISSIONS,
  downloadCsv,
  getBarOpsData,
  getLoyaltyConfig,
  isHappyHourActiveNow,
  logBarAudit,
  saveBarOpsData,
  WEEKDAY_SHORT,
} from '../lib/opsUtils';
import { filterRecipesForBar, money } from '../lib/utils';
import type {
  Bar,
  BarItem,
  CashSaleRecord,
  HappyHourRule,
  LoyaltyConfig,
  LoyaltyCustomerRecord,
  OrderModifierOption,
  PaymentMethod,
  PermissionKey,
  Recipe,
  ReservationEntry,
  StockLossRecord,
  SupplierEntry,
} from '../types/meubar';

export type ManagementSubTab =
  | 'dashboard'
  | 'compras'
  | 'happyhour'
  | 'fidelidade'
  | 'reservas'
  | 'modificadores'
  | 'config';

const LOSS_REASONS: { id: StockLossRecord['reason']; label: string }[] = [
  { id: 'quebra', label: '💥 Quebra / Garrafa derramada' },
  { id: 'desperdicio', label: '🗑️ Desperdício / Erro de preparo' },
  { id: 'cortesia', label: '🎁 Cortesia da casa' },
  { id: 'vencido', label: '📅 Produto vencido / estragado' },
  { id: 'equipe', label: '👥 Consumo da equipe' },
];

const PERM_LABELS: { key: PermissionKey; label: string }[] = [
  { key: 'can_cancel_order', label: 'Cancelar pedidos' },
  { key: 'can_discount', label: 'Dar descontos / cortesias' },
  { key: 'can_edit_prices', label: 'Alterar preços' },
  { key: 'can_close_shift', label: 'Fechar turno do caixa' },
  { key: 'can_manage_stock', label: 'Alterar estoque' },
  { key: 'can_view_reports', label: 'Ver relatórios financeiros' },
];

const ROLES_LIST = ['gerente', 'caixa', 'barman', 'cozinha', 'garcom'];

export const ManagementProView: React.FC<{
  bar: Bar;
  role: string | null;
  actorName: string;
  items: BarItem[];
  recipes?: Recipe[];
  initialSubTab?: ManagementSubTab;
  onBarUpdated: (bar: Bar) => void;
  onBackMore: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  role,
  actorName,
  items,
  recipes = [],
  initialSubTab = 'dashboard',
  onBarUpdated,
  onBackMore,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<ManagementSubTab>(initialSubTab);
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const ops = useMemo(() => getBarOpsData(bar), [bar]);
  const isManager =
    role === 'owner' || role === 'dono' || role === 'gerente';

  // Bluetooth ESC/POS state
  const [btStatus, setBtStatus] = useState(() => getConnectedBluetoothPrinter());
  const [btBusy, setBtBusy] = useState(false);
  useEffect(() => subscribeBluetoothPrinter(() => setBtStatus(getConnectedBluetoothPrinter())), []);

  // Happy Hour form state
  const [hhName, setHhName] = useState('');
  const [hhDays, setHhDays] = useState<number[]>([4, 5]); // Qui & Sex
  const [hhStart, setHhStart] = useState('18:00');
  const [hhEnd, setHhEnd] = useState('20:00');
  const [hhDiscType, setHhDiscType] = useState<HappyHourRule['discount_type']>('percent');
  const [hhDiscVal, setHhDiscVal] = useState('20');
  const [hhApplies, setHhApplies] = useState<HappyHourRule['applies_to']>('drink');
  const [hhRecipeIds, setHhRecipeIds] = useState<string[]>([]);
  const [hhBadge, setHhBadge] = useState('');

  // Loyalty form state
  const loyaltyCfgInitial = useMemo(() => getLoyaltyConfig(bar), [bar]);
  const [loyEnabled, setLoyEnabled] = useState(loyaltyCfgInitial.enabled);
  const [loyMode, setLoyMode] = useState<LoyaltyConfig['mode']>(loyaltyCfgInitial.mode);
  const [loyTarget, setLoyTarget] = useState(String(loyaltyCfgInitial.stamps_target));
  const [loyRewardVal, setLoyRewardVal] = useState(String(loyaltyCfgInitial.stamp_reward_value));
  const [loyRewardLabel, setLoyRewardLabel] = useState(loyaltyCfgInitial.stamp_reward_label);
  const [loyCashbackPct, setLoyCashbackPct] = useState(String(loyaltyCfgInitial.cashback_percent));
  const [loyMinRedeem, setLoyMinRedeem] = useState(String(loyaltyCfgInitial.min_redeem_value ?? 5));
  const [loySearch, setLoySearch] = useState('');
  const [newLoyName, setNewLoyName] = useState('');
  const [newLoyPhone, setNewLoyPhone] = useState('');

  const barRecipes = useMemo(
    () =>
      filterRecipesForBar(recipes, bar.id).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [recipes, bar.id]
  );

  // Loss form state
  const [lossItemId, setLossItemId] = useState('');
  const [lossQtyStr, setLossQtyStr] = useState('1');
  const [lossReason, setLossReason] = useState<StockLossRecord['reason']>('quebra');
  const [lossCostStr, setLossCostStr] = useState('');
  const [lossNote, setLossNote] = useState('');

  // Supplier form state
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCats, setSupCats] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // Reservation form state
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resParty, setResParty] = useState('4');
  const [resDateTime, setResDateTime] = useState('');
  const [resTable, setResTable] = useState('');
  const [resNotes, setResNotes] = useState('');

  // Modifier form state
  const [modName, setModName] = useState('');
  const [modPriceStr, setModPriceStr] = useState('0');
  const [modApplies, setModApplies] = useState<OrderModifierOption['applies_to']>('all');

  // Config form state
  const [pixKey, setPixKey] = useState(ops.pix_key || '');
  const [pixMerchant, setPixMerchant] = useState(ops.pix_merchant_name || bar.name);
  const [pixCity, setPixCity] = useState(ops.pix_city || bar.city || '');
  const [defaultFeePct, setDefaultFeePct] = useState(String(ops.default_service_fee_pct ?? 10));
  const [printerWidth, setPrinterWidth] = useState<'80mm' | '58mm'>(ops.printer_width || '80mm');
  const [autoDeduct, setAutoDeduct] = useState(ops.auto_deduct_stock !== false);
  const [auditSearch, setAuditSearch] = useState('');

  // Flatten all sales from shifts
  const allSales = useMemo(() => {
    const out: CashSaleRecord[] = [];
    (ops.cash_shifts || []).forEach((sh) => {
      (sh.sales || []).forEach((s) => out.push(s));
    });
    return out.sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || ''));
  }, [ops.cash_shifts]);

  const filteredSales = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return allSales.filter((s) => {
      const ts = new Date(s.paid_at).getTime();
      if (Number.isNaN(ts)) return true;
      if (period === 'today') return ts >= startOfToday.getTime();
      if (period === '7d') return now - ts <= 7 * 86400 * 1000;
      if (period === '30d') return now - ts <= 30 * 86400 * 1000;
      return true;
    });
  }, [allSales, period]);

  const filteredLosses = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return (ops.stock_losses || []).filter((l) => {
      const ts = new Date(l.at).getTime();
      if (Number.isNaN(ts)) return true;
      if (period === 'today') return ts >= startOfToday.getTime();
      if (period === '7d') return now - ts <= 7 * 86400 * 1000;
      if (period === '30d') return now - ts <= 30 * 86400 * 1000;
      return true;
    });
  }, [ops.stock_losses, period]);

  // Financial Metrics
  const metrics = useMemo(() => {
    let revenue = 0;
    let cmv = 0;
    let serviceFees = 0;
    let discounts = 0;
    const byMethod: Record<Exclude<PaymentMethod, 'misto'>, number> = {
      credito: 0,
      debito: 0,
      pix: 0,
      dinheiro: 0,
    };
    const itemRank: Record<string, { name: string; qty: number; total: number }> = {};
    const byHour: Record<number, number> = {};

    filteredSales.forEach((s) => {
      revenue += Number(s.total) || 0;
      cmv += Number(s.cmv_total) || 0;
      serviceFees += Number(s.service_fee) || 0;
      discounts += Number(s.discount) || 0;

      if (s.payment_method === 'misto' && s.splits?.length) {
        s.splits.forEach((sp) => {
          byMethod[sp.method] = (byMethod[sp.method] || 0) + Number(sp.amount || 0);
        });
      } else if (s.payment_method !== 'misto') {
        byMethod[s.payment_method] = (byMethod[s.payment_method] || 0) + Number(s.total || 0);
      }

      (s.items_summary || []).forEach((it) => {
        const k = it.name;
        if (!itemRank[k]) itemRank[k] = { name: k, qty: 0, total: 0 };
        itemRank[k].qty += Number(it.qty) || 1;
        itemRank[k].total += Number(it.total) || 0;
      });

      const dt = new Date(s.paid_at);
      if (!Number.isNaN(dt.getTime())) {
        const h = dt.getHours();
        byHour[h] = (byHour[h] || 0) + (Number(s.total) || 0);
      }
    });

    const lossesTotal = filteredLosses.reduce((acc, l) => acc + (Number(l.estimated_cost) || 0), 0);
    const netProfit = revenue - serviceFees - cmv - lossesTotal;
    const ticketAvg = filteredSales.length > 0 ? revenue / filteredSales.length : 0;
    const topItems = Object.values(itemRank)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
    const peakHours = Object.entries(byHour)
      .map(([h, val]) => ({ hour: Number(h), val }))
      .sort((a, b) => a.hour - b.hour);
    const maxHourVal = Math.max(1, ...peakHours.map((x) => x.val));

    return {
      revenue,
      cmv,
      serviceFees,
      discounts,
      lossesTotal,
      netProfit,
      ticketAvg,
      byMethod,
      topItems,
      peakHours,
      maxHourVal,
    };
  }, [filteredSales, filteredLosses]);

  // Automatic Shopping List (out of stock + low stock <= min_qty)
  const shoppingList = useMemo(() => {
    return items
      .filter((it) => {
        if (!it.in_stock) return true;
        const minQ = Number(it.min_qty || 0);
        const curQ = Number(it.qty || 0);
        return minQ > 0 && curQ <= minQ;
      })
      .map((it) => {
        const unit = getUnitMeta(it.unit || getDefaultUnitForIngredient(it.name, it.category || '').unit);
        const curQ = Number(it.qty || 0);
        const minQ = Number(it.min_qty || 0);
        const suggestedBuy = !it.in_stock
          ? Math.max(1, minQ || 2)
          : Math.max(1, minQ * 2 - curQ);
        const unitCost = Number(it.unit_cost || 0);
        return {
          ...it,
          unitShort: unit.short,
          suggestedBuy,
          estCost: suggestedBuy * unitCost,
          status: !it.in_stock ? 'Esgotado' : 'Estoque baixo',
        };
      })
      .sort((a, b) => (a.status === 'Esgotado' ? -1 : 1) - (b.status === 'Esgotado' ? -1 : 1));
  }, [items]);

  // CRM Frequent Customers (from sales history)
  const crmCustomers = useMemo(() => {
    const map: Record<string, { name: string; visits: number; totalSpent: number; lastVisit: string }> = {};
    allSales.forEach((s) => {
      const names = (s.client_name || s.tab_label || 'Cliente')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      const share = names.length > 0 ? (Number(s.total) || 0) / names.length : Number(s.total) || 0;
      names.forEach((nm) => {
        const key = nm.toLowerCase();
        if (!map[key]) {
          map[key] = { name: nm, visits: 0, totalSpent: 0, lastVisit: s.paid_at };
        }
        map[key].visits += 1;
        map[key].totalSpent += share;
        if (s.paid_at > map[key].lastVisit) map[key].lastVisit = s.paid_at;
      });
    });
    return Object.values(map)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 30);
  }, [allSales]);

  // Handlers
  const handleAddLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find((x) => x.id === lossItemId);
    if (!item) {
      onToast('Selecione um produto do estoque.');
      return;
    }
    const q = Math.max(0.1, Number(lossQtyStr.replace(',', '.')) || 1);
    const unitMeta = getUnitMeta(item.unit || getDefaultUnitForIngredient(item.name, item.category || '').unit);
    const estCost =
      lossCostStr.trim() !== ''
        ? Math.max(0, Number(lossCostStr.replace(',', '.')) || 0)
        : Math.round(q * Number(item.unit_cost || 0) * 100) / 100;

    setSaving(true);
    try {
      const rec: StockLossRecord = {
        id: 'loss_' + Date.now(),
        item_id: item.id,
        item_name: item.name,
        qty: q,
        unit: unitMeta.short,
        reason: lossReason,
        note: lossNote.trim() || undefined,
        estimated_cost: estCost,
        at: new Date().toISOString(),
        by: actorName || 'Equipe',
      };
      const updated = await saveBarOpsData(
        bar,
        { stock_losses: [rec, ...(ops.stock_losses || [])].slice(0, 150) },
        onBarUpdated
      );
      if (updated) {
        await logBarAudit(
          updated,
          'Registro de perda/cortesia',
          `${q} ${unitMeta.short} de ${item.name} (${lossReason}) — Custo est.: ${money(estCost)}`,
          actorName,
          role || 'staff',
          onBarUpdated
        );
        setLossQtyStr('1');
        setLossCostStr('');
        setLossNote('');
        onToast('Perda/quebra registrada no controle de CMV!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      onToast('Informe o nome do fornecedor.');
      return;
    }
    setSaving(true);
    try {
      const sup: SupplierEntry = {
        id: 'sup_' + Date.now(),
        name: supName.trim(),
        phone: supPhone.trim() || undefined,
        categories: supCats.trim() || undefined,
        notes: supNotes.trim() || undefined,
      };
      await saveBarOpsData(bar, { suppliers: [sup, ...(ops.suppliers || [])] }, onBarUpdated);
      setSupName('');
      setSupPhone('');
      setSupCats('');
      setSupNotes('');
      onToast('Fornecedor salvo!');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    await saveBarOpsData(
      bar,
      { suppliers: (ops.suppliers || []).filter((s) => s.id !== id) },
      onBarUpdated
    );
    onToast('Fornecedor removido.');
  };

  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resDateTime.trim()) {
      onToast('Informe nome do cliente e data/horário.');
      return;
    }
    setSaving(true);
    try {
      const entry: ReservationEntry = {
        id: 'res_' + Date.now(),
        guest_name: resName.trim(),
        phone: resPhone.trim() || undefined,
        party_size: Math.max(1, Number(resParty) || 2),
        date_time: resDateTime.trim(),
        table_label: resTable.trim() || undefined,
        notes: resNotes.trim() || undefined,
        status: 'confirmada',
        created_at: new Date().toISOString(),
      };
      await saveBarOpsData(
        bar,
        { reservations: [entry, ...(ops.reservations || [])].slice(0, 100) },
        onBarUpdated
      );
      setResName('');
      setResPhone('');
      setResNotes('');
      onToast('Reserva registrada!');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: ReservationEntry['status']) => {
    await saveBarOpsData(
      bar,
      {
        reservations: (ops.reservations || []).map((r) => (r.id === id ? { ...r, status } : r)),
      },
      onBarUpdated
    );
    onToast(`Reserva marcada como ${status}.`);
  };

  const handleAddModifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) {
      onToast('Digite o nome do adicional ou observação.');
      return;
    }
    const next: OrderModifierOption = {
      id: 'mod_' + Date.now(),
      name: modName.trim(),
      price: Math.max(0, Number(modPriceStr.replace(',', '.')) || 0),
      applies_to: modApplies,
    };
    await saveBarOpsData(
      bar,
      { modifiers: [...(ops.modifiers || DEFAULT_MODIFIERS), next] },
      onBarUpdated
    );
    setModName('');
    setModPriceStr('0');
    onToast('Adicional salvo! Já aparece no Cardápio Digital e no PDV do Garçom.');
  };

  const handleDeleteModifier = async (id: string) => {
    await saveBarOpsData(
      bar,
      { modifiers: (ops.modifiers || []).filter((m) => m.id !== id) },
      onBarUpdated
    );
    onToast('Modificador removido.');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveBarOpsData(
        bar,
        {
          pix_key: pixKey.trim(),
          pix_merchant_name: pixMerchant.trim() || bar.name,
          pix_city: pixCity.trim() || bar.city || '',
          default_service_fee_pct: Math.max(0, Math.min(30, Number(defaultFeePct) || 0)),
          printer_width: printerWidth,
          auto_deduct_stock: autoDeduct,
        },
        onBarUpdated
      );
      if (updated) {
        await logBarAudit(
          updated,
          'Configurações operacionais',
          `Pix: ${pixKey.trim() ? 'configurado' : 'vazio'} | Serviço: ${defaultFeePct}% | Impressora: ${printerWidth} | Baixa automática: ${autoDeduct ? 'ON' : 'OFF'}`,
          actorName,
          role || 'owner',
          onBarUpdated
        );
        onToast('Configurações operacionais salvas!');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePerm = async (targetRole: string, perm: PermissionKey) => {
    if (!isManager) {
      onToast('Apenas Dono/Gerente pode alterar permissões.');
      return;
    }
    const curVal = canRoleDo(bar, targetRole, perm);
    const nextPerms = { ...(ops.role_permissions || {}) };
    nextPerms[targetRole] = {
      ...(DEFAULT_ROLE_PERMISSIONS[targetRole] || {}),
      ...(nextPerms[targetRole] || {}),
      [perm]: !curVal,
    };
    await saveBarOpsData(bar, { role_permissions: nextPerms }, onBarUpdated);
  };

  const handleExportSalesCsv = () => {
    downloadCsv(
      `relatorio-vendas-${bar.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      [
        'Data/Hora',
        'Mesa/Comanda',
        'Cliente',
        'Pagamento',
        'Subtotal',
        'Taxa Servico',
        'Desconto',
        'Total',
        'CMV Est.',
        'Operador',
      ],
      filteredSales.map((s) => [
        new Date(s.paid_at).toLocaleString('pt-BR'),
        s.tab_label,
        s.client_name,
        s.payment_method,
        s.subtotal.toFixed(2),
        s.service_fee.toFixed(2),
        s.discount.toFixed(2),
        s.total.toFixed(2),
        s.cmv_total.toFixed(2),
        s.by,
      ])
    );
    onToast('Relatório CSV baixado!');
  };

  const handleCopyShoppingWhatsApp = () => {
    if (shoppingList.length === 0) {
      onToast('Estoque completo! Nenhum item na lista de compras.');
      return;
    }
    const totalEst = shoppingList.reduce((acc, x) => acc + x.estCost, 0);
    const txt = [
      `🛒 *Lista de Compras — ${bar.name}*`,
      ...shoppingList.map(
        (x) =>
          `• ${x.name} (${x.status}) — Comprar ~${x.suggestedBuy} ${x.unitShort}${
            x.estCost > 0 ? ` (${money(x.estCost)})` : ''
          }`
      ),
      ...(totalEst > 0 ? ['', `*Estimativa total: ${money(totalEst)}*`] : []),
    ].join('\n');
    void navigator.clipboard?.writeText(txt);
    onToast('Lista de compras copiada para o WhatsApp!');
  };

  const handleAddHappyHour = async (e: React.FormEvent) => {
    e.preventDefault();
    const nm = hhName.trim();
    if (!nm) {
      onToast('Dê um nome para o Happy Hour (ex: Happy Hour Quinta & Sexta).');
      return;
    }
    if (hhDays.length === 0) {
      onToast('Selecione pelo menos 1 dia da semana.');
      return;
    }
    const val = Math.max(0, Number(hhDiscVal.replace(',', '.')) || 0);
    if (val <= 0) {
      onToast('Informe o valor ou percentual do desconto.');
      return;
    }
    if (hhApplies === 'specific' && hhRecipeIds.length === 0) {
      onToast('Selecione pelo menos 1 item específico do cardápio.');
      return;
    }
    setSaving(true);
    try {
      const rule: HappyHourRule = {
        id: 'hh_' + Date.now(),
        name: nm,
        active: true,
        days: [...hhDays].sort(),
        start_time: hhStart || '18:00',
        end_time: hhEnd || '20:00',
        discount_type: hhDiscType,
        discount_value: val,
        applies_to: hhApplies,
        recipe_ids: hhApplies === 'specific' ? hhRecipeIds : undefined,
        badge: hhBadge.trim() || undefined,
      };
      const next = [rule, ...(ops.happy_hours || [])];
      const updated = await saveBarOpsData(bar, { happy_hours: next }, onBarUpdated);
      if (updated) {
        setHhName('');
        setHhBadge('');
        setHhRecipeIds([]);
        onToast('Happy Hour cadastrado! Ativará automaticamente nos dias e horários definidos.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleHappyHour = async (id: string) => {
    const next = (ops.happy_hours || []).map((r) =>
      r.id === id ? { ...r, active: !r.active } : r
    );
    await saveBarOpsData(bar, { happy_hours: next }, onBarUpdated);
  };

  const handleDeleteHappyHour = async (id: string) => {
    const next = (ops.happy_hours || []).filter((r) => r.id !== id);
    await saveBarOpsData(bar, { happy_hours: next }, onBarUpdated);
    onToast('Happy Hour removido.');
  };

  const handleSaveLoyaltyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cfg: LoyaltyConfig = {
        enabled: loyEnabled,
        mode: loyMode,
        stamps_target: Math.max(2, Number(loyTarget) || 10),
        stamp_reward_value: Math.max(1, Number(loyRewardVal.replace(',', '.')) || 25),
        stamp_reward_label: loyRewardLabel.trim() || '1 Drink Clássico grátis',
        cashback_percent: Math.min(50, Math.max(1, Number(loyCashbackPct.replace(',', '.')) || 5)),
        min_redeem_value: Math.max(0, Number(loyMinRedeem.replace(',', '.')) || 0),
      };
      const updated = await saveBarOpsData(bar, { loyalty: cfg }, onBarUpdated);
      if (updated) onToast('Programa de Fidelidade salvo!');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLoyaltyCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const nm = newLoyName.trim();
    if (nm.length < 2) {
      onToast('Informe o nome do cliente.');
      return;
    }
    setSaving(true);
    try {
      const list = [...(ops.loyalty_customers || [])];
      const existingIdx = list.findIndex((c) => c.name.toLowerCase() === nm.toLowerCase());
      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          phone: newLoyPhone.trim() || list[existingIdx].phone,
          updated_at: new Date().toISOString(),
        };
      } else {
        const rec: LoyaltyCustomerRecord = {
          id: 'loy_' + Date.now(),
          name: nm,
          phone: newLoyPhone.trim() || undefined,
          stamps: 0,
          cashback_balance: 0,
          total_redeemed: 0,
          visits: 0,
          total_spent: 0,
          updated_at: new Date().toISOString(),
        };
        list.unshift(rec);
      }
      await saveBarOpsData(bar, { loyalty_customers: list }, onBarUpdated);
      setNewLoyName('');
      setNewLoyPhone('');
      onToast('Cliente fidelidade salvo!');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustLoyalty = async (
    id: string,
    deltaStamps: number,
    deltaCashback: number
  ) => {
    const next = (ops.loyalty_customers || []).map((c) => {
      if (c.id !== id) return c;
      return {
        ...c,
        stamps: Math.max(0, c.stamps + deltaStamps),
        cashback_balance: Math.max(0, Math.round((c.cashback_balance + deltaCashback) * 100) / 100),
        updated_at: new Date().toISOString(),
      };
    });
    await saveBarOpsData(bar, { loyalty_customers: next }, onBarUpdated);
  };

  const handleConnectBt = async () => {
    setBtBusy(true);
    try {
      const res = await connectBluetoothPrinter();
      if (res.ok) {
        onToast(`Impressora Bluetooth conectada: ${res.name}`);
      } else if (res.error) {
        onToast(res.error);
      }
    } finally {
      setBtBusy(false);
    }
  };

  const handleTestBt = async () => {
    setBtBusy(true);
    try {
      const res = await printBluetoothTestPage(bar.name, printerWidth);
      if (res.ok) onToast('Página de teste enviada para a impressora Bluetooth!');
      else onToast(res.error || 'Falha no teste Bluetooth.');
    } finally {
      setBtBusy(false);
    }
  };

  const activeHhCount = (ops.happy_hours || []).filter((r) => isHappyHourActiveNow(r)).length;

  return (
    <div className="space-y-3">
      <button type="button" className="b g sm" onClick={onBackMore}>
        ← Voltar para Mais
      </button>

      <div>
        <h1 className="!mb-1">Gestão Profissional — {bar.name}</h1>
        <p className="mu text-xs !mb-0">
          Financeiro, lucro real (CMV), compras, Happy Hour automático, fidelidade/cashback,
          reservas, adicionais, Pix direto, Bluetooth ESC/POS e permissões.
        </p>
      </div>

      {/* SUB-TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['dashboard', '📊 Financeiro'],
            ['happyhour', `🍻 Happy Hour${activeHhCount > 0 ? ` (${activeHhCount} ON)` : ''}`],
            ['fidelidade', '🎁 Fidelidade'],
            ['compras', `🛒 Compras (${shoppingList.length})`],
            ['reservas', '📅 Reservas & CRM'],
            ['modificadores', '🧩 Adicionais'],
            ['config', '🛡️ Pix, Bluetooth & Permissões'],
          ] as [ManagementSubTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`b sm whitespace-nowrap ${subTab === id ? '' : 'g'}`}
            onClick={() => setSubTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. DASHBOARD FINANCEIRO & RELATÓRIOS */}
      {subTab === 'dashboard' && (
        <div className="space-y-3">
          <div className="panel">
            <div className="row sp flex-wrap gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {(
                  [
                    ['today', 'Hoje'],
                    ['7d', '7 dias'],
                    ['30d', '30 dias'],
                    ['all', 'Tudo'],
                  ] as const
                ).map(([p, lbl]) => (
                  <button
                    key={p}
                    type="button"
                    className={`b sm ${period === p ? '' : 'g'}`}
                    onClick={() => setPeriod(p)}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={handleExportSalesCsv}
                disabled={filteredSales.length === 0}
              >
                📥 Exportar CSV
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">Faturamento bruto</div>
                <div className="text-lg font-extrabold text-[var(--ok)]">
                  {money(metrics.revenue)}
                </div>
                <div className="text-[11px] text-[var(--mut)]">
                  {filteredSales.length} conta(s) · Ticket médio {money(metrics.ticketAvg)}
                </div>
              </div>
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">Lucro líquido estimado</div>
                <div
                  className={`text-lg font-extrabold ${
                    metrics.netProfit >= 0 ? 'text-[var(--ac)]' : 'text-red-400'
                  }`}
                >
                  {money(metrics.netProfit)}
                </div>
                <div className="text-[11px] text-[var(--mut)]">
                  Receita − 10% − CMV − Perdas
                </div>
              </div>
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">CMV + Perdas / Quebras</div>
                <div className="text-lg font-bold text-orange-300">
                  {money(metrics.cmv + metrics.lossesTotal)}
                </div>
                <div className="text-[11px] text-[var(--mut)]">
                  CMV {money(metrics.cmv)} · Perdas {money(metrics.lossesTotal)}
                </div>
              </div>
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">💳 Maquininha (Créd + Déb)</div>
                <div className="text-base font-bold">
                  {money(metrics.byMethod.credito + metrics.byMethod.debito)}
                </div>
                <div className="text-[11px] text-[var(--mut)]">
                  Créd {money(metrics.byMethod.credito)} · Déb {money(metrics.byMethod.debito)}
                </div>
              </div>
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">💠 Pix + 💵 Dinheiro</div>
                <div className="text-base font-bold">
                  {money(metrics.byMethod.pix + metrics.byMethod.dinheiro)}
                </div>
                <div className="text-[11px] text-[var(--mut)]">
                  Pix {money(metrics.byMethod.pix)} · Dinheiro {money(metrics.byMethod.dinheiro)}
                </div>
              </div>
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-[11px] text-[var(--mut)]">🍽️ 10% Garçons & Descontos</div>
                <div className="text-base font-bold">{money(metrics.serviceFees)}</div>
                <div className="text-[11px] text-[var(--mut)]">
                  Descontos/cortesias: {money(metrics.discounts)}
                </div>
              </div>
            </div>
          </div>

          {/* TOP ITENS + HORÁRIOS DE PICO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="panel">
              <h3 className="!mt-0">🏆 Top 10 mais vendidos</h3>
              {metrics.topItems.length === 0 ? (
                <p className="mu text-xs">
                  Feche contas no Caixa para o ranking aparecer automaticamente.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.topItems.map((it, i) => (
                    <div
                      key={it.name}
                      className="flex items-center justify-between text-xs py-1 border-b border-white/5"
                    >
                      <span>
                        <b className="text-[var(--ac)]">#{i + 1}</b> {it.name}
                      </span>
                      <span>
                        <b>{it.qty}x</b> · {money(it.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel">
              <h3 className="!mt-0">⏰ Horários de pico</h3>
              {metrics.peakHours.length === 0 ? (
                <p className="mu text-xs">Sem vendas registradas neste período.</p>
              ) : (
                <div className="space-y-1.5">
                  {metrics.peakHours.map((h) => (
                    <div key={h.hour} className="flex items-center gap-2 text-xs">
                      <span className="w-12 font-mono text-[var(--mut)]">
                        {String(h.hour).padStart(2, '0')}h
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--ac)]"
                          style={{ width: `${Math.max(8, (h.val / metrics.maxHourVal) * 100)}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-semibold">{money(h.val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* HISTÓRICO DE TURNOS FECHADOS */}
          <div className="panel">
            <h3 className="!mt-0">📒 Histórico de turnos de caixa</h3>
            {(ops.cash_shifts || []).length === 0 ? (
              <p className="mu text-xs">Nenhum turno registrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {(ops.cash_shifts || []).slice(0, 12).map((sh) => {
                  const tot = (sh.sales || []).reduce((a, b) => a + (Number(b.total) || 0), 0);
                  return (
                    <div
                      key={sh.id}
                      className="rounded-xl p-2.5 bg-white/5 border border-white/10 text-xs flex items-center justify-between gap-2 flex-wrap"
                    >
                      <div>
                        <b>
                          {sh.status === 'open' ? '🟢 Em aberto' : '🔒 Fechado'} —{' '}
                          {new Date(sh.opened_at).toLocaleString('pt-BR')}
                        </b>
                        <div className="text-[var(--mut)]">
                          Aberto por {sh.opened_by}
                          {sh.closed_by ? ` · Fechado por ${sh.closed_by}` : ''} ·{' '}
                          {(sh.sales || []).length} conta(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[var(--ok)]">{money(tot)}</div>
                        {sh.status === 'closed' && sh.cash_diff != null && (
                          <div
                            className={
                              sh.cash_diff >= 0 ? 'text-[var(--ok)]' : 'text-red-400'
                            }
                          >
                            Quebra/Sobra: {money(sh.cash_diff)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. LISTA DE COMPRAS, FORNECEDORES & PERDAS */}
      {subTab === 'compras' && (
        <div className="space-y-3">
          <div className="panel">
            <div className="row sp flex-wrap gap-2 mb-2">
              <div>
                <h3 className="!m-0">🛒 Lista de compras automática ({shoppingList.length})</h3>
                <p className="mu text-xs !mb-0">
                  Itens marcados como esgotados ou abaixo do estoque mínimo configurado.
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="b sm"
                  onClick={handleCopyShoppingWhatsApp}
                >
                  📲 Copiar p/ WhatsApp
                </button>
                <button
                  type="button"
                  className="b g sm"
                  disabled={shoppingList.length === 0}
                  onClick={() =>
                    downloadCsv(
                      `lista-compras-${bar.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
                      ['Item', 'Status', 'Atual', 'Minimo', 'Comprar', 'Unidade', 'Custo Est.'],
                      shoppingList.map((x) => [
                        x.name,
                        x.status,
                        Number(x.qty || 0),
                        Number(x.min_qty || 0),
                        x.suggestedBuy,
                        x.unitShort,
                        x.estCost.toFixed(2),
                      ])
                    )
                  }
                >
                  📥 CSV
                </button>
              </div>
            </div>

            {shoppingList.length === 0 ? (
              <p className="mu text-xs">
                Tudo abastecido! Defina um "Estoque mínimo" nos produtos do Estoque para receber
                alertas automáticos de reposição aqui.
              </p>
            ) : (
              <div className="space-y-1.5">
                {shoppingList.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl p-2.5 bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <b>{it.name}</b>{' '}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          it.status === 'Esgotado'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {it.status}
                      </span>
                      <div className="text-[var(--mut)]">
                        Atual: {it.qty ?? 0} {it.unitShort} · Mínimo: {it.min_qty ?? 0}{' '}
                        {it.unitShort}
                        {it.supplier ? ` · Forn: ${it.supplier}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[var(--ac)]">
                        Comprar +{it.suggestedBuy} {it.unitShort}
                      </div>
                      {it.estCost > 0 && (
                        <div className="text-[var(--mut)]">~{money(it.estCost)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REGISTRAR PERDA / QUEBRA / CORTESIA */}
          <form className="panel space-y-2" onSubmit={(e) => void handleAddLoss(e)}>
            <h3 className="!mt-0">📉 Registrar perda, quebra ou cortesia</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="!mt-0">Produto do estoque</label>
                <select value={lossItemId} onChange={(e) => setLossItemId(e.target.value)}>
                  <option value="">Selecione um item…</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.unit || getDefaultUnitForIngredient(it.name, it.category || '').unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="!mt-0">Motivo</label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value as StockLossRecord['reason'])}
                >
                  {LOSS_REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="!mt-0">Quantidade perdida</label>
                <input
                  value={lossQtyStr}
                  onChange={(e) => setLossQtyStr(e.target.value)}
                  placeholder="Ex: 1 ou 0.5"
                />
              </div>
              <div>
                <label className="!mt-0">Custo estimado (R$ — opcional, calcula automático)</label>
                <input
                  value={lossCostStr}
                  onChange={(e) => setLossCostStr(e.target.value)}
                  placeholder="Auto pelo preço de custo"
                />
              </div>
            </div>
            <input
              value={lossNote}
              onChange={(e) => setLossNote(e.target.value)}
              placeholder="Observação (ex: garrafa quebrou no balcão)"
            />
            <button type="submit" className="b sm" disabled={saving}>
              {saving ? 'Salvando…' : 'Registrar perda'}
            </button>

            {(ops.stock_losses || []).length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="text-xs font-bold">Últimas perdas registradas:</div>
                {(ops.stock_losses || []).slice(0, 10).map((l) => (
                  <div
                    key={l.id}
                    className="flex justify-between text-xs py-1 border-b border-white/5"
                  >
                    <span>
                      <b>
                        {l.qty} {l.unit} {l.item_name}
                      </b>{' '}
                      ({l.reason}) {l.note ? `— ${l.note}` : ''}
                    </span>
                    <span className="text-red-300 font-semibold">-{money(l.estimated_cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* FORNECEDORES */}
          <form className="panel space-y-2" onSubmit={(e) => void handleAddSupplier(e)}>
            <h3 className="!mt-0">🚚 Cadastro de fornecedores</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Nome (ex: Distribuidora Silva)"
              />
              <input
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
                placeholder="WhatsApp / Telefone"
              />
              <input
                value={supCats}
                onChange={(e) => setSupCats(e.target.value)}
                placeholder="Fornece (ex: Destilados, Gelo)"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={supNotes}
                onChange={(e) => setSupNotes(e.target.value)}
                placeholder="Observações (dia de entrega, prazo…)"
              />
              <button type="submit" className="b sm shrink-0" disabled={saving}>
                + Salvar
              </button>
            </div>
            {(ops.suppliers || []).length > 0 && (
              <div className="space-y-1.5 pt-2">
                {(ops.suppliers || []).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl p-2.5 bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <b>{s.name}</b> {s.categories ? `· ${s.categories}` : ''}
                      <div className="text-[var(--mut)]">
                        {s.phone || 'Sem telefone'} {s.notes ? `· ${s.notes}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="b d sm"
                      onClick={() => void handleDeleteSupplier(s.id)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {/* 3. RESERVAS & CRM DE CLIENTES */}
      {subTab === 'reservas' && (
        <div className="space-y-3">
          <form className="panel space-y-2" onSubmit={(e) => void handleAddReservation(e)}>
            <h3 className="!mt-0">📅 Nova reserva de mesa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={resName}
                onChange={(e) => setResName(e.target.value)}
                placeholder="Nome do cliente *"
              />
              <input
                value={resPhone}
                onChange={(e) => setResPhone(e.target.value)}
                placeholder="WhatsApp"
              />
              <input
                value={resDateTime}
                onChange={(e) => setResDateTime(e.target.value)}
                placeholder="Data e hora (ex: Sáb 20:30) *"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={resParty}
                  onChange={(e) => setResParty(e.target.value)}
                  placeholder="Pessoas"
                />
                <select value={resTable} onChange={(e) => setResTable(e.target.value)}>
                  <option value="">Qualquer mesa</option>
                  {(bar.table_names || ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5']).map(
                    (t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
            <input
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="Obs (ex: Aniversário, área externa)"
            />
            <button type="submit" className="b sm" disabled={saving}>
              + Agendar reserva
            </button>
          </form>

          <div className="panel">
            <h3 className="!mt-0">📋 Reservas agendadas ({(ops.reservations || []).length})</h3>
            {(ops.reservations || []).length === 0 ? (
              <p className="mu text-xs">Nenhuma reserva cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {(ops.reservations || []).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl p-2.5 bg-white/5 border border-white/10 flex items-center justify-between gap-2 flex-wrap text-xs"
                  >
                    <div>
                      <b>
                        {r.guest_name} ({r.party_size} pessoas)
                      </b>{' '}
                      · <span className="text-[var(--ac)]">{r.date_time}</span>
                      {r.table_label ? ` · 🪑 ${r.table_label}` : ''}
                      <div className="text-[var(--mut)]">
                        {r.phone ? `📞 ${r.phone} · ` : ''}Status: <b>{r.status}</b>
                        {r.notes ? ` · ${r.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {r.status !== 'chegou' && (
                        <button
                          type="button"
                          className="b ok sm"
                          onClick={() => void handleUpdateReservationStatus(r.id, 'chegou')}
                        >
                          ✓ Chegou
                        </button>
                      )}
                      {r.status !== 'cancelada' && (
                        <button
                          type="button"
                          className="b d sm"
                          onClick={() => void handleUpdateReservationStatus(r.id, 'cancelada')}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h3 className="!mt-0">⭐ Clientes frequentes (CRM automático)</h3>
            {crmCustomers.length === 0 ? (
              <p className="mu text-xs">
                O histórico de clientes mais fiéis é montado automaticamente conforme as contas são
                fechadas no Caixa.
              </p>
            ) : (
              <div className="space-y-1.5">
                {crmCustomers.map((c, idx) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-white/5"
                  >
                    <span>
                      <b className="text-[var(--ac)]">#{idx + 1}</b> <b>{c.name}</b> · {c.visits}{' '}
                      visita(s)
                    </span>
                    <span className="font-bold text-[var(--ok)]">{money(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODIFICADORES & ADICIONAIS */}
      {subTab === 'modificadores' && (
        <div className="space-y-3">
          <form className="panel space-y-2" onSubmit={(e) => void handleAddModifier(e)}>
            <h3 className="!mt-0">🧩 Cadastrar adicional ou observação rápida</h3>
            <p className="mu text-xs !mt-0">
              Aparece como botões de 1 toque no Cardápio Digital do cliente e no PDV do Garçom.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={modName}
                onChange={(e) => setModName(e.target.value)}
                placeholder="Ex: Dose dupla / Extra bacon"
              />
              <input
                value={modPriceStr}
                onChange={(e) => setModPriceStr(e.target.value)}
                placeholder="Adicional R$ (0 se grátis)"
              />
              <select
                value={modApplies}
                onChange={(e) =>
                  setModApplies(e.target.value as OrderModifierOption['applies_to'])
                }
              >
                <option value="all">Todos os itens</option>
                <option value="drink">Só Drinks</option>
                <option value="petisco">Só Petiscos</option>
                <option value="avulso">Só Avulsos</option>
              </select>
            </div>
            <button type="submit" className="b sm">
              + Adicionar opção
            </button>
          </form>

          <div className="panel">
            <h3 className="!mt-0">Opções ativas ({(ops.modifiers || []).length})</h3>
            <div className="space-y-1.5">
              {(ops.modifiers || DEFAULT_MODIFIERS).map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl p-2.5 bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <b>{m.name}</b>{' '}
                    <span className="text-[var(--ok)] font-bold">
                      {m.price > 0 ? `+ ${money(m.price)}` : 'Grátis'}
                    </span>{' '}
                    <span className="text-[var(--mut)]">({m.applies_to})</span>
                  </div>
                  <button
                    type="button"
                    className="b d sm"
                    onClick={() => void handleDeleteModifier(m.id)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4B. HAPPY HOUR AUTOMÁTICO POR DIA E HORÁRIO */}
      {subTab === 'happyhour' && (
        <div className="space-y-3">
          <form className="panel space-y-2.5" onSubmit={(e) => void handleAddHappyHour(e)}>
            <h3 className="!mt-0">🍻 Cadastrar Happy Hour Automático</h3>
            <p className="mu text-xs !mt-0">
              Os preços promocionais ativam sozinhos no cardápio digital, no PDV do garçom e no
              caixa durante os dias e horários configurados — e voltam ao normal automaticamente ao
              terminar.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="!mt-0">Nome da promoção</label>
                <input
                  value={hhName}
                  onChange={(e) => setHhName(e.target.value)}
                  placeholder="Ex: Happy Hour Quinta & Sexta"
                />
              </div>
              <div>
                <label className="!mt-0">Selo no cardápio (opcional)</label>
                <input
                  value={hhBadge}
                  onChange={(e) => setHhBadge(e.target.value)}
                  placeholder="Ex: 🍻 HAPPY HOUR -20%"
                />
              </div>
            </div>

            <div>
              <label className="!mt-0">Dias da semana</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {WEEKDAY_SHORT.map((label, dayIdx) => {
                  const on = hhDays.includes(dayIdx);
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`b sm !px-2.5 ${on ? '' : 'g'}`}
                      onClick={() =>
                        setHhDays((prev) =>
                          prev.includes(dayIdx)
                            ? prev.filter((x) => x !== dayIdx)
                            : [...prev, dayIdx]
                        )
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="!mt-0">Início</label>
                <input
                  type="time"
                  value={hhStart}
                  onChange={(e) => setHhStart(e.target.value)}
                />
              </div>
              <div>
                <label className="!mt-0">Término</label>
                <input type="time" value={hhEnd} onChange={(e) => setHhEnd(e.target.value)} />
              </div>
              <div>
                <label className="!mt-0">Tipo de desconto</label>
                <select
                  value={hhDiscType}
                  onChange={(e) =>
                    setHhDiscType(e.target.value as HappyHourRule['discount_type'])
                  }
                >
                  <option value="percent">% de desconto</option>
                  <option value="fixed_off">R$ de desconto</option>
                  <option value="fixed_price">Preço fixo (R$)</option>
                </select>
              </div>
              <div>
                <label className="!mt-0">
                  {hhDiscType === 'percent'
                    ? 'Percentual (%)'
                    : hhDiscType === 'fixed_price'
                      ? 'Preço único (R$)'
                      : 'Desconto (R$)'}
                </label>
                <input
                  value={hhDiscVal}
                  onChange={(e) => setHhDiscVal(e.target.value)}
                  placeholder={hhDiscType === 'percent' ? '20' : '19,90'}
                />
              </div>
            </div>

            <div>
              <label className="!mt-0">Onde aplicar</label>
              <select
                value={hhApplies}
                onChange={(e) => setHhApplies(e.target.value as HappyHourRule['applies_to'])}
              >
                <option value="drink">🍸 Somente Drinks</option>
                <option value="petisco">🍟 Somente Petiscos / Comidas</option>
                <option value="avulso">🍺 Somente Avulsos (cervejas/latas)</option>
                <option value="all">✨ Todo o cardápio</option>
                <option value="specific">🎯 Itens específicos</option>
              </select>
            </div>

            {hhApplies === 'specific' && (
              <div className="rounded-xl p-2.5 bg-white/5 border border-white/10 max-h-48 overflow-y-auto space-y-1">
                <div className="text-xs font-semibold mb-1">
                  Selecione os itens participantes ({hhRecipeIds.length}):
                </div>
                {barRecipes.map((r) => {
                  const checked = hhRecipeIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="!m-0 flex items-center gap-2 text-xs cursor-pointer py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setHhRecipeIds((prev) =>
                            prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                          )
                        }
                        className="!w-4 !h-4"
                      />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <button type="submit" className="b ok sm" disabled={saving}>
              {saving ? 'Salvando…' : '➕ Salvar Happy Hour'}
            </button>
          </form>

          <div className="panel">
            <h3 className="!mt-0">
              📅 Happy Hours cadastrados ({(ops.happy_hours || []).length})
            </h3>
            {(ops.happy_hours || []).length === 0 ? (
              <p className="mu text-xs">
                Nenhum Happy Hour cadastrado ainda. Crie acima para ativar descontos automáticos por
                dia e horário.
              </p>
            ) : (
              <div className="space-y-2">
                {(ops.happy_hours || []).map((rule) => {
                  const liveNow = isHappyHourActiveNow(rule);
                  const descVal =
                    rule.discount_type === 'percent'
                      ? `-${rule.discount_value}%`
                      : rule.discount_type === 'fixed_price'
                        ? `Preço fixo ${money(rule.discount_value)}`
                        : `-${money(rule.discount_value)}`;
                  return (
                    <div
                      key={rule.id}
                      className={`rounded-xl p-3 border ${
                        liveNow
                          ? 'bg-emerald-500/10 border-emerald-400/40'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="row sp flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <b className="text-sm">{rule.name}</b>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                liveNow
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : rule.active
                                    ? 'bg-amber-500/20 text-amber-200'
                                    : 'bg-white/10 text-[var(--mut)]'
                              }`}
                            >
                              {liveNow
                                ? '🟢 ATIVO AGORA'
                                : rule.active
                                  ? '⏳ Programado'
                                  : '⏸️ Pausado'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--mut)] mt-0.5">
                            {rule.days.map((d) => WEEKDAY_SHORT[d]).join(', ')} · {rule.start_time}{' '}
                            às {rule.end_time} · <b className="text-[var(--ac)]">{descVal}</b>
                          </div>
                        </div>
                        <div className="row gap-1.5">
                          <button
                            type="button"
                            className={`b sm ${rule.active ? 'g' : 'ok'}`}
                            onClick={() => void handleToggleHappyHour(rule.id)}
                          >
                            {rule.active ? 'Pausar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            className="b g sm !text-red-300"
                            onClick={() => void handleDeleteHappyHour(rule.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4C. CARTÃO FIDELIDADE & CASHBACK POR CLIENTE */}
      {subTab === 'fidelidade' && (
        <div className="space-y-3">
          <form className="panel space-y-2.5" onSubmit={(e) => void handleSaveLoyaltyConfig(e)}>
            <div className="row sp flex-wrap gap-2">
              <h3 className="!m-0">🎁 Programa de Fidelidade & Cashback</h3>
              <label className="!m-0 flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={loyEnabled}
                  onChange={(e) => setLoyEnabled(e.target.checked)}
                  className="!w-4 !h-4"
                />
                {loyEnabled ? '🟢 Programa Ativo' : '⚪ Desativado'}
              </label>
            </div>
            <p className="mu text-xs !mt-0">
              Cada conta fechada no Caixa acumula automaticamente carimbos ou cashback para o
              cliente — e o Caixa avisa na hora quando o cliente tiver prêmio ou saldo para
              resgatar!
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`b sm ${loyMode === 'stamps' ? '' : 'g'}`}
                onClick={() => setLoyMode('stamps')}
              >
                🎟️ Cartão Carimbo (Pontos)
              </button>
              <button
                type="button"
                className={`b sm ${loyMode === 'cashback' ? '' : 'g'}`}
                onClick={() => setLoyMode('cashback')}
              >
                💸 Cashback (% em R$)
              </button>
            </div>

            {loyMode === 'stamps' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="!mt-0">Meta de carimbos (itens)</label>
                  <input
                    type="number"
                    min={2}
                    value={loyTarget}
                    onChange={(e) => setLoyTarget(e.target.value)}
                  />
                </div>
                <div>
                  <label className="!mt-0">Desconto do prêmio (R$)</label>
                  <input
                    value={loyRewardVal}
                    onChange={(e) => setLoyRewardVal(e.target.value)}
                    placeholder="25,00"
                  />
                </div>
                <div>
                  <label className="!mt-0">Descrição do prêmio</label>
                  <input
                    value={loyRewardLabel}
                    onChange={(e) => setLoyRewardLabel(e.target.value)}
                    placeholder="Ex: 1 Drink Clássico grátis"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="!mt-0">Cashback de volta (%)</label>
                  <input
                    value={loyCashbackPct}
                    onChange={(e) => setLoyCashbackPct(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <label className="!mt-0">Saldo mínimo para resgatar (R$)</label>
                  <input
                    value={loyMinRedeem}
                    onChange={(e) => setLoyMinRedeem(e.target.value)}
                    placeholder="5,00"
                  />
                </div>
              </div>
            )}

            <button type="submit" className="b ok sm" disabled={saving}>
              {saving ? 'Salvando…' : '💾 Salvar regra de fidelidade'}
            </button>
          </form>

          <form className="panel space-y-2" onSubmit={(e) => void handleAddLoyaltyCustomer(e)}>
            <h3 className="!mt-0">➕ Cadastrar / Atualizar telefone de cliente</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={newLoyName}
                onChange={(e) => setNewLoyName(e.target.value)}
                placeholder="Nome do cliente (como aparece na comanda)"
              />
              <input
                value={newLoyPhone}
                onChange={(e) => setNewLoyPhone(e.target.value)}
                placeholder="WhatsApp opcional (ex: 11999999999)"
              />
            </div>
            <button type="submit" className="b sm" disabled={saving}>
              Salvar cliente
            </button>
          </form>

          <div className="panel">
            <div className="row sp flex-wrap gap-2 mb-2">
              <h3 className="!m-0">
                🏆 Clientes Fidelidade ({(ops.loyalty_customers || []).length})
              </h3>
              <input
                value={loySearch}
                onChange={(e) => setLoySearch(e.target.value)}
                placeholder="Buscar cliente…"
                className="!w-48 !py-1 text-xs"
              />
            </div>
            {(ops.loyalty_customers || []).length === 0 ? (
              <p className="mu text-xs">
                Ative o programa acima e feche contas no Caixa: os clientes acumulam pontos ou
                cashback automaticamente aqui.
              </p>
            ) : (
              <div className="space-y-2">
                {(ops.loyalty_customers || [])
                  .filter(
                    (c) =>
                      !loySearch.trim() ||
                      c.name.toLowerCase().includes(loySearch.toLowerCase())
                  )
                  .map((c) => {
                    const target = Number(loyTarget) || 10;
                    const readyReward =
                      loyMode === 'stamps'
                        ? c.stamps >= target
                        : c.cashback_balance >= (Number(loyMinRedeem) || 0) &&
                          c.cashback_balance > 0;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl p-2.5 border ${
                          readyReward
                            ? 'bg-amber-500/10 border-amber-400/40'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="row sp flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <b className="text-sm">{c.name}</b>
                              {readyReward && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200">
                                  🎁 PRÊMIO LIBERADO
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--mut)] mt-0.5">
                              {loyMode === 'stamps' ? (
                                <>
                                  🎟️ <b>{c.stamps}/{target}</b> carimbos
                                </>
                              ) : (
                                <>
                                  💸 Saldo: <b className="text-emerald-300">{money(c.cashback_balance)}</b>
                                </>
                              )}{' '}
                              · {c.visits} visita(s) · Total gasto: {money(c.total_spent)}
                            </div>
                          </div>
                          <div className="row gap-1 flex-wrap">
                            {loyMode === 'stamps' ? (
                              <>
                                <button
                                  type="button"
                                  className="b g sm"
                                  onClick={() => void handleAdjustLoyalty(c.id, 1, 0)}
                                >
                                  +1 carimbo
                                </button>
                                {c.stamps >= target && (
                                  <button
                                    type="button"
                                    className="b ok sm"
                                    onClick={() => {
                                      void handleAdjustLoyalty(c.id, -target, 0);
                                      onToast(`Prêmio resgatado para ${c.name}!`);
                                    }}
                                  >
                                    Resgatar
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                className="b g sm"
                                onClick={() => void handleAdjustLoyalty(c.id, 0, 5)}
                              >
                                +R$ 5
                              </button>
                            )}
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => {
                                const msg =
                                  loyMode === 'stamps'
                                    ? `Olá ${c.name}! No ${bar.name} você está com ${c.stamps}/${target} carimbos no Cartão Fidelidade (${loyRewardLabel}).`
                                    : `Olá ${c.name}! Você tem ${money(c.cashback_balance)} de cashback disponível para usar no ${bar.name}!`;
                                void navigator.clipboard?.writeText(msg);
                                onToast('Mensagem de saldo copiada para enviar no WhatsApp!');
                              }}
                            >
                              💬 Copiar aviso
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. CONFIGURAÇÕES OPERACIONAIS, PIX, BLUETOOTH, RBAC & AUDITORIA */}
      {subTab === 'config' && (
        <div className="space-y-3">
          {/* IMPRESSORA BLUETOOTH DIRETA (ESC/POS) */}
          <div className="panel space-y-2.5 !border-sky-400/35">
            <div className="row sp flex-wrap gap-2">
              <div>
                <h3 className="!m-0">🔵 Impressora Térmica Bluetooth Direta (ESC/POS)</h3>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Pareie sua mini impressora portátil (58mm ou 80mm — MPT-II, KP-1025, RPP02N,
                  Elgin, GOJPRT) para imprimir comandas e recibos direto sem abrir janela do
                  sistema.
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  btStatus.connected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-[var(--mut)]'
                }`}
              >
                {btStatus.connected ? `🟢 ${btStatus.name}` : '⚪ Desconectada'}
              </span>
            </div>
            {!isWebBluetoothSupported() && (
              <p className="text-xs text-amber-300 !m-0">
                ℹ️ Este navegador não expõe Web Bluetooth. Abra no Chrome (Android/Desktop) ou no
                APK Android para usar impressão Bluetooth direta. Enquanto isso, a impressão térmica
                padrão continua funcionando normalmente.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="b sm"
                disabled={btBusy}
                onClick={() => void handleConnectBt()}
              >
                {btBusy
                  ? 'Conectando…'
                  : btStatus.connected
                    ? '🔄 Trocar impressora Bluetooth'
                    : '🔵 Conectar impressora Bluetooth'}
              </button>
              {btStatus.connected && (
                <>
                  <button
                    type="button"
                    className="b ok sm"
                    disabled={btBusy}
                    onClick={() => void handleTestBt()}
                  >
                    🖨️ Imprimir teste Bluetooth
                  </button>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => {
                      disconnectBluetoothPrinter();
                      onToast('Impressora Bluetooth desconectada.');
                    }}
                  >
                    Desconectar
                  </button>
                </>
              )}
            </div>
          </div>

          <form className="panel space-y-2.5" onSubmit={(e) => void handleSaveConfig(e)}>
            <h3 className="!mt-0">⚙️ Pix da Loja, Impressora Térmica & Estoque</h3>
            <p className="mu text-xs !mt-0">
              O pagamento continua 100% na sua maquininha, dinheiro ou Pix próprio — zero taxas e
              zero intermediários.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="!mt-0">Chave Pix da loja (CPF/CNPJ, E-mail, Celular ou Aleatória)</label>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Ex: 11999999999 ou seu@email.com"
                />
              </div>
              <div>
                <label className="!mt-0">Nome recebedor no Pix</label>
                <input
                  value={pixMerchant}
                  onChange={(e) => setPixMerchant(e.target.value)}
                  placeholder={bar.name}
                />
              </div>
              <div>
                <label className="!mt-0">Cidade no Pix</label>
                <input
                  value={pixCity}
                  onChange={(e) => setPixCity(e.target.value)}
                  placeholder="Ex: Brasilia"
                />
              </div>
              <div>
                <label className="!mt-0">Taxa de serviço padrão (%)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={defaultFeePct}
                  onChange={(e) => setDefaultFeePct(e.target.value)}
                />
              </div>
              <div>
                <label className="!mt-0">Largura da impressora térmica</label>
                <select
                  value={printerWidth}
                  onChange={(e) => setPrinterWidth(e.target.value as '80mm' | '58mm')}
                >
                  <option value="80mm">80mm (padrão balcão/cozinha)</option>
                  <option value="58mm">58mm (mini Bluetooth portátil)</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="!m-0 flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={autoDeduct}
                    onChange={(e) => setAutoDeduct(e.target.checked)}
                    className="!w-4 !h-4"
                  />
                  Baixa automática de estoque ao preparar pedidos
                </label>
              </div>
            </div>
            <button type="submit" className="b ok sm" disabled={saving}>
              {saving ? 'Salvando…' : '💾 Salvar configurações'}
            </button>
          </form>

          {/* MATRIZ DE PERMISSÕES POR CARGO */}
          <div className="panel">
            <h3 className="!mt-0">🛡️ Permissões por cargo (RBAC)</h3>
            <p className="mu text-xs !mt-0">
              Dono sempre tem acesso total. Defina abaixo o que cada cargo pode executar:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-1.5 pr-2">Permissão</th>
                    {ROLES_LIST.map((r) => (
                      <th key={r} className="py-1.5 px-1.5 text-center capitalize">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERM_LABELS.map((p) => (
                    <tr key={p.key} className="border-b border-white/5">
                      <td className="py-1.5 pr-2">{p.label}</td>
                      {ROLES_LIST.map((r) => {
                        const checked = canRoleDo(bar, r, p.key);
                        return (
                          <td key={r} className="py-1.5 px-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!isManager}
                              onChange={() => void handleTogglePerm(r, p.key)}
                              className="!w-4 !h-4 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LOG DE AUDITORIA */}
          <div className="panel">
            <div className="row sp flex-wrap gap-2 mb-2">
              <h3 className="!m-0">🕵️ Log de Auditoria ({(ops.audit_logs || []).length})</h3>
              <input
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filtrar ação, pessoa ou motivo…"
                className="!w-56 !py-1 text-xs"
              />
            </div>
            {(ops.audit_logs || []).length === 0 ? (
              <p className="mu text-xs">
                Cancelamentos, descontos, perdas, transferências de mesa e fechamentos de caixa
                ficam registrados aqui automaticamente.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(ops.audit_logs || [])
                  .filter((a) => {
                    if (!auditSearch.trim()) return true;
                    const q = auditSearch.toLowerCase();
                    return (
                      a.action.toLowerCase().includes(q) ||
                      a.details.toLowerCase().includes(q) ||
                      a.actor.toLowerCase().includes(q)
                    );
                  })
                  .map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg p-2 bg-white/5 border border-white/10 text-xs"
                    >
                      <div className="flex justify-between gap-2">
                        <b className="text-[var(--ac)]">{a.action}</b>
                        <span className="text-[10px] text-[var(--mut)]">
                          {new Date(a.at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="mt-0.5">{a.details}</div>
                      <div className="text-[10px] text-[var(--mut)] mt-0.5">
                        Por: {a.actor} ({a.role})
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
