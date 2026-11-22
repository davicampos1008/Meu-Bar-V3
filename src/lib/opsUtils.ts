import type {
  AuditLogEntry,
  Bar,
  BarItem,
  BarOperationalData,
  CashRegisterShift,
  DeliveryConfig,
  DeliveryDispatchRecord,
  DeliveryPaymentOption,
  HappyHourRule,
  LoyaltyConfig,
  LoyaltyCustomerRecord,
  MenuPreset,
  Order,
  OrderModifierOption,
  PaymentMethod,
  PermissionKey,
  Recipe,
  TableCallAlert,
  WaiterModeConfig,
  WaiterOperationMode,
} from '../types/meubar';
import {
  buildEscPosBytes,
  getConnectedBluetoothPrinter,
  writeEscPosBluetooth,
} from './bluetoothPrinter';
import {
  canPlayAlertSound,
  canVibrateAlert,
  type AlertCategoryKey,
} from './alertPrefs';
import { getDefaultUnitForIngredient } from './catalog';
import { broadcastMenuUpdate, sb, writeBarSafe } from './supabase';
import {
  getMenuPresets,
  getRecipeItemType,
  getStudioMeta,
  money,
  norm,
  stockMatch,
} from './utils';

export const OPS_META_ID = '__ops_meta__';

export const DEFAULT_MODIFIERS: OrderModifierOption[] = [
  { id: 'mod-sem-gelo', name: 'Sem gelo', price: 0, applies_to: 'drink' },
  { id: 'mod-menos-gelo', name: 'Pouco gelo', price: 0, applies_to: 'drink' },
  { id: 'mod-sem-acucar', name: 'Sem açúcar', price: 0, applies_to: 'drink' },
  { id: 'mod-borda-sal', name: 'Borda de sal / açúcar', price: 0, applies_to: 'drink' },
  { id: 'mod-limao-parte', name: 'Limão à parte', price: 0, applies_to: 'all' },
  { id: 'mod-dose-extra', name: 'Dose extra de destilado', price: 10, applies_to: 'drink' },
  { id: 'mod-molho-extra', name: 'Molho extra', price: 4, applies_to: 'petisco' },
  { id: 'mod-bem-passado', name: 'Bem passado / crocante', price: 0, applies_to: 'petisco' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<PermissionKey, boolean>> = {
  owner: {
    can_cancel_order: true,
    can_discount: true,
    can_edit_prices: true,
    can_close_shift: true,
    can_manage_stock: true,
    can_view_reports: true,
  },
  dono: {
    can_cancel_order: true,
    can_discount: true,
    can_edit_prices: true,
    can_close_shift: true,
    can_manage_stock: true,
    can_view_reports: true,
  },
  gerente: {
    can_cancel_order: true,
    can_discount: true,
    can_edit_prices: true,
    can_close_shift: true,
    can_manage_stock: true,
    can_view_reports: true,
  },
  caixa: {
    can_cancel_order: true,
    can_discount: true,
    can_edit_prices: false,
    can_close_shift: true,
    can_manage_stock: false,
    can_view_reports: true,
  },
  barman: {
    can_cancel_order: true,
    can_discount: false,
    can_edit_prices: false,
    can_close_shift: false,
    can_manage_stock: true,
    can_view_reports: false,
  },
  cozinha: {
    can_cancel_order: true,
    can_discount: false,
    can_edit_prices: false,
    can_close_shift: false,
    can_manage_stock: true,
    can_view_reports: false,
  },
  garcom: {
    can_cancel_order: false,
    can_discount: false,
    can_edit_prices: false,
    can_close_shift: false,
    can_manage_stock: false,
    can_view_reports: false,
  },
};

export function getRawMenuPresets(bar?: Partial<Bar> | null): MenuPreset[] {
  if (!bar?.menu_presets) return [];
  if (Array.isArray(bar.menu_presets)) return bar.menu_presets;
  if (typeof bar.menu_presets === 'string') {
    try {
      const parsed = JSON.parse(bar.menu_presets);
      return Array.isArray(parsed) ? (parsed as MenuPreset[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getBarOpsData(bar?: Partial<Bar> | null): BarOperationalData {
  const raw = getRawMenuPresets(bar);
  const metaEntry = raw.find((p) => p?.id === OPS_META_ID);
  const fromPreset = metaEntry?.ops_data || {};
  const fromCol = bar?.ops_data || {};
  const merged: BarOperationalData = {
    default_service_fee_pct: 10,
    service_fee_allow_custom: true,
    service_fee_100_to_waiter: false,
    couvert_enabled: false,
    couvert_price: 0,
    couvert_mode: 'optional',
    couvert_label: 'Couvert artístico',
    couvert_per_person: false,
    staff_login_enabled: false,
    printer_width: '80mm',
    auto_deduct_stock: true,
    ...fromPreset,
    ...fromCol,
  };
  if (!merged.modifiers || merged.modifiers.length === 0) {
    merged.modifiers = DEFAULT_MODIFIERS;
  }
  return merged;
}

export async function saveBarOpsData(
  bar: Bar,
  patch: Partial<BarOperationalData>,
  onBarUpdated?: (updated: Bar) => void
): Promise<Bar | null> {
  const current = getBarOpsData(bar);
  const nextOps: BarOperationalData = {
    ...current,
    ...patch,
  };
  // Trim audit log to last 200 entries so JSON stays fast
  if (nextOps.audit_logs && nextOps.audit_logs.length > 200) {
    nextOps.audit_logs = nextOps.audit_logs.slice(0, 200);
  }
  if (nextOps.cash_shifts && nextOps.cash_shifts.length > 60) {
    nextOps.cash_shifts = nextOps.cash_shifts.slice(0, 60);
  }

  const normalPresets = getMenuPresets(bar);
  const studioMeta = getStudioMeta(bar);
  const unified: MenuPreset[] = [...normalPresets];
  if (studioMeta) unified.push(studioMeta);
  unified.push({
    id: OPS_META_ID,
    preset_name: '__ops_meta__',
    ops_data: nextOps,
  });

  const res = await writeBarSafe(
    'update',
    {
      ops_data: nextOps,
      menu_presets: unified,
    },
    bar.id
  );

  if (res.error || !res.data) {
    return null;
  }

  const updated: Bar = {
    ...bar,
    ...res.data,
    ops_data: nextOps,
    menu_presets: unified,
  };
  if (onBarUpdated) onBarUpdated(updated);
  void broadcastMenuUpdate(bar.id, updated);
  void broadcastBarOpsSync(bar.id);
  return updated;
}

export async function logBarAudit(
  bar: Bar,
  action: string,
  details: string,
  actor: string,
  role: string,
  onBarUpdated?: (updated: Bar) => void
): Promise<Bar | null> {
  const ops = getBarOpsData(bar);
  const entry: AuditLogEntry = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    action,
    details,
    actor: actor || 'Equipe',
    role: role || 'staff',
    at: new Date().toISOString(),
  };
  return saveBarOpsData(
    bar,
    { audit_logs: [entry, ...(ops.audit_logs || [])].slice(0, 200) },
    onBarUpdated
  );
}

export function canRoleDo(
  bar: Partial<Bar> | null | undefined,
  role: string | null | undefined,
  perm: PermissionKey
): boolean {
  const r = (role || 'owner').toLowerCase();
  if (r === 'owner' || r === 'dono') return true;
  const ops = getBarOpsData(bar);
  const custom = ops.role_permissions?.[r]?.[perm];
  if (typeof custom === 'boolean') return custom;
  return Boolean(DEFAULT_ROLE_PERMISSIONS[r]?.[perm] ?? false);
}

export function getActiveCashShift(bar?: Partial<Bar> | null): CashRegisterShift | null {
  const ops = getBarOpsData(bar);
  return (ops.cash_shifts || []).find((s) => s.status === 'open') || null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string }> = {
  pix: { label: 'Pix (direto da loja)', icon: '💠' },
  credito: { label: 'Cartão Crédito (maquininha)', icon: '💳' },
  debito: { label: 'Cartão Débito (maquininha)', icon: '💳' },
  dinheiro: { label: 'Dinheiro', icon: '💵' },
  misto: { label: 'Pagamento Misto', icon: '🔀' },
};

/* ============================================================
 * GERADOR OFICIAL DE PIX BR CODE (EMVCo + CRC16-CCITT)
 * 100% local, sem gateway/intermediário — cai direto na chave Pix da loja!
 * ============================================================ */
function emvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function cleanAscii(str: string, maxLen: number): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .\-@/+]/g, '')
    .trim()
    .slice(0, maxLen);
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixBrCode(params: {
  key: string;
  merchantName: string;
  city?: string;
  amount?: number;
  txid?: string;
}): string {
  const key = params.key.trim();
  if (!key) return '';
  const merchantName = cleanAscii(params.merchantName || 'MEU BAR', 25).toUpperCase() || 'MEU BAR';
  const city = cleanAscii(params.city || 'BRASIL', 15).toUpperCase() || 'BRASIL';
  const txid = cleanAscii(params.txid || 'MEUBAR', 20).replace(/\s+/g, '') || '***';

  const gui = emvField('00', 'br.gov.bcb.pix');
  const pixKeyField = emvField('01', key);
  const merchantAccount = emvField('26', gui + pixKeyField);

  let payload = '';
  payload += emvField('00', '01'); // Payload Format Indicator
  payload += merchantAccount;
  payload += emvField('52', '0000'); // Merchant Category Code
  payload += emvField('53', '986'); // BRL
  if (params.amount && params.amount > 0) {
    payload += emvField('54', params.amount.toFixed(2));
  }
  payload += emvField('58', 'BR');
  payload += emvField('59', merchantName);
  payload += emvField('60', city);
  payload += emvField('62', emvField('05', txid));
  payload += '6304';

  return payload + crc16Ccitt(payload);
}

/* ============================================================
 * IMPRESSÃO TÉRMICA (58mm / 80mm) SEM window.open (via iframe oculto)
 * ============================================================ */
function printHtmlViaIframe(html: string): boolean {
  try {
    const existing = document.getElementById('meubar-print-frame');
    if (existing) existing.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'meubar-print-frame';
    // Bloqueia execução de scripts dentro do documento de impressão (defesa em profundidade contra XSS)
    iframe.setAttribute('sandbox', 'allow-modals allow-same-origin');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return false;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        // ignore
      }
      setTimeout(() => iframe.remove(), 4000);
    }, 220);
    return true;
  } catch {
    return false;
  }
}

export function escHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function printKitchenOrBarTicket(params: {
  bar: Bar;
  order: Order;
  recipeName: string;
  station: 'bar' | 'cozinha';
}): boolean {
  const ops = getBarOpsData(params.bar);
  const widthMm = ops.printer_width === '58mm' ? '58mm' : '80mm';
  const nowStr = new Date().toLocaleString('pt-BR');
  const who = params.order.client_name || params.order.customer_name || 'Cliente';
  const stationLabel = params.station === 'cozinha' ? 'COZINHA' : 'BAR / DRINKS';

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${widthMm} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace; width: ${widthMm}; margin: 0 auto; color: #000; font-size: 12px; line-height: 1.35; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .big { font-size: 17px; font-weight: bold; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
  </style></head><body>
    <div class="c b">${escHtml(params.bar.name.toUpperCase())}</div>
    <div class="c">COMANDA DE ${stationLabel}</div>
    <div class="c">${escHtml(nowStr)}</div>
    <div class="hr"></div>
    <div class="b">Destino: ${escHtml(params.order.table_label || 'BALCÃO')}</div>
    <div>Cliente: ${escHtml(who)}</div>
    <div class="hr"></div>
    <div class="big">${params.order.qty || 1}x ${escHtml(params.recipeName)}</div>
    ${params.order.note ? `<div style="margin-top:6px;padding:4px;border:1px solid #000;"><b>OBS:</b> ${escHtml(params.order.note)}</div>` : ''}
    <div class="hr"></div>
    <div class="c">Pedido #${escHtml(params.order.id.slice(0, 6).toUpperCase())}</div>
  </body></html>`;

  if (getConnectedBluetoothPrinter().connected) {
    const bytes = buildEscPosBytes(
      [
        { text: params.bar.name.toUpperCase(), align: 'center', bold: true },
        { text: `COMANDA DE ${stationLabel}`, align: 'center', bold: true },
        { text: nowStr, align: 'center' },
        { text: '', hr: true },
        { text: `Destino: ${params.order.table_label || 'BALCAO'}`, bold: true },
        { text: `Cliente: ${who}` },
        { text: '', hr: true },
        { text: `${params.order.qty || 1}x ${params.recipeName}`, bold: true, doubleSize: true },
        ...(params.order.note ? [{ text: `OBS: ${params.order.note}`, bold: true }] : []),
        { text: '', hr: true },
        { text: `Pedido #${params.order.id.slice(0, 6).toUpperCase()}`, align: 'center' },
      ],
      widthMm
    );
    void writeEscPosBluetooth(bytes).then((ok) => {
      if (!ok) printHtmlViaIframe(html);
    });
    return true;
  }

  return printHtmlViaIframe(html);
}

export function printCustomerBill(params: {
  bar: Bar;
  title: string;
  subtitle?: string;
  lines: { label: string; amount: number }[];
  subtotal: number;
  couvert?: number;
  couvertLabel?: string;
  serviceFee: number;
  serviceFeePct: number;
  service100ToWaiter?: boolean;
  discount: number;
  total: number;
  paymentInfo?: string;
  splitCount?: number;
  isPreBill?: boolean;
}): boolean {
  const ops = getBarOpsData(params.bar);
  const widthMm = ops.printer_width === '58mm' ? '58mm' : '80mm';
  const nowStr = new Date().toLocaleString('pt-BR');
  const couvertAmt = Number(params.couvert) || 0;
  const couvertLbl = params.couvertLabel || ops.couvert_label || 'Couvert artístico';

  const rowsHtml = params.lines
    .map(
      (l) =>
        `<div class="row"><span>${escHtml(l.label)}</span><span>${escHtml(money(l.amount))}</span></div>`
    )
    .join('');

  const serviceLabel =
    params.serviceFeePct > 0 ? `Comissão Garçom (${params.serviceFeePct}%)` : 'Comissão Garçom';

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${widthMm} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace; width: ${widthMm}; margin: 0 auto; color: #000; font-size: 12px; line-height: 1.35; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .row { display: flex; justify-content: space-between; gap: 6px; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
    .tot { font-size: 15px; font-weight: bold; }
  </style></head><body>
    <div class="c b">${escHtml(params.bar.name.toUpperCase())}</div>
    ${params.bar.city ? `<div class="c">${escHtml(params.bar.city)}</div>` : ''}
    <div class="c b">${params.isPreBill ? 'CONFERÊNCIA DE CONTA' : 'RECIBO DE PAGAMENTO'}</div>
    <div class="c">${escHtml(nowStr)}</div>
    <div class="hr"></div>
    <div class="b">${escHtml(params.title)}</div>
    ${params.subtitle ? `<div>${escHtml(params.subtitle)}</div>` : ''}
    <div class="hr"></div>
    ${rowsHtml || '<div>Sem itens lançados</div>'}
    <div class="hr"></div>
    <div class="row"><span>Subtotal</span><span>${escHtml(money(params.subtotal))}</span></div>
    ${couvertAmt > 0 ? `<div class="row"><span>${escHtml(couvertLbl)}</span><span>${escHtml(money(couvertAmt))}</span></div>` : ''}
    ${params.serviceFee > 0 ? `<div class="row"><span>${escHtml(serviceLabel)}</span><span>${escHtml(money(params.serviceFee))}</span></div>` : ''}
    ${params.serviceFee > 0 && params.service100ToWaiter ? `<div class="c" style="font-size:10px;margin-top:2px;">* 100% da comissão repassada ao garçom *</div>` : ''}
    ${params.discount > 0 ? `<div class="row"><span>Desconto</span><span>- ${escHtml(money(params.discount))}</span></div>` : ''}
    <div class="hr"></div>
    <div class="row tot"><span>TOTAL</span><span>${escHtml(money(params.total))}</span></div>
    ${params.splitCount && params.splitCount > 1 ? `<div class="row"><span>Dividido (${params.splitCount}x)</span><span>${escHtml(money(params.total / params.splitCount))}/pessoa</span></div>` : ''}
    ${params.paymentInfo ? `<div style="margin-top:6px;"><b>Pagamento:</b> ${escHtml(params.paymentInfo)}</div>` : ''}
    <div class="hr"></div>
    <div class="c">Documento sem valor fiscal</div>
    <div class="c">Obrigado pela preferência!</div>
  </body></html>`;

  if (getConnectedBluetoothPrinter().connected) {
    const btLines: Parameters<typeof buildEscPosBytes>[0] = [
      { text: params.bar.name.toUpperCase(), align: 'center', bold: true },
      ...(params.bar.city ? [{ text: params.bar.city, align: 'center' as const }] : []),
      {
        text: params.isPreBill ? 'CONFERENCIA DE CONTA' : 'RECIBO DE PAGAMENTO',
        align: 'center',
        bold: true,
      },
      { text: nowStr, align: 'center' },
      { text: '', hr: true },
      { text: params.title, bold: true },
      ...(params.subtitle ? [{ text: params.subtitle }] : []),
      { text: '', hr: true },
      ...(params.lines.length > 0
        ? params.lines.map((l) => ({ text: '', pair: [l.label, money(l.amount)] as [string, string] }))
        : [{ text: 'Sem itens lancados' }]),
      { text: '', hr: true },
      { text: '', pair: ['Subtotal', money(params.subtotal)] },
      ...(couvertAmt > 0
        ? [{ text: '', pair: [couvertLbl.slice(0, 20), money(couvertAmt)] as [string, string] }]
        : []),
      ...(params.serviceFee > 0
        ? [{ text: '', pair: [serviceLabel.slice(0, 20), money(params.serviceFee)] as [string, string] }]
        : []),
      ...(params.serviceFee > 0 && params.service100ToWaiter
        ? [{ text: '100% repassado ao garcom', align: 'center' as const }]
        : []),
      ...(params.discount > 0
        ? [{ text: '', pair: ['Desconto', `- ${money(params.discount)}`] as [string, string] }]
        : []),
      { text: '', hr: true },
      { text: '', pair: ['TOTAL', money(params.total)], bold: true },
      ...(params.splitCount && params.splitCount > 1
        ? [
            {
              text: '',
              pair: [
                `Dividido (${params.splitCount}x)`,
                `${money(params.total / params.splitCount)}/p`,
              ] as [string, string],
            },
          ]
        : []),
      ...(params.paymentInfo ? [{ text: `Pagamento: ${params.paymentInfo}`, bold: true }] : []),
      { text: '', hr: true },
      { text: 'Documento sem valor fiscal', align: 'center' },
      { text: 'Obrigado pela preferencia!', align: 'center' },
    ];
    const bytes = buildEscPosBytes(btLines, widthMm);
    void writeEscPosBluetooth(bytes).then((ok) => {
      if (!ok) printHtmlViaIframe(html);
    });
    return true;
  }

  return printHtmlViaIframe(html);
}

/* ============================================================
 * BAIXA AUTOMÁTICA DE ESTOQUE AO PREPARAR/FINALIZAR PEDIDO
 * ============================================================ */
function parseIngredientUsage(qtyStr?: string): { amount: number; isMl: boolean } {
  const s = String(qtyStr || '').toLowerCase();
  const numMatch = s.match(/(\d+(?:[.,]\d+)?)/);
  const n = numMatch ? Number(numMatch[1].replace(',', '.')) : 1;
  if (s.includes('ml')) return { amount: n, isMl: true };
  if (s.includes('completar') || s.includes('top')) return { amount: 120, isMl: true };
  if (s.includes('dash') || s.includes('gotas')) return { amount: 3, isMl: true };
  if (s.includes('1/2') || s.includes('meia') || s.includes('meio')) return { amount: 0.5, isMl: false };
  return { amount: Math.max(0.1, n), isMl: false };
}

export async function autoDeductStockForOrder(
  bar: Bar,
  recipe: Recipe | undefined,
  orderQty: number,
  items: BarItem[],
  onItemsChange?: (next: BarItem[]) => void
): Promise<{ deductedCount: number; lowStockNames: string[] }> {
  const ops = getBarOpsData(bar);
  if (ops.auto_deduct_stock === false || !recipe || !Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
    return { deductedCount: 0, lowStockNames: [] };
  }

  let updatedItems = [...items];
  let deductedCount = 0;
  const lowStockNames: string[] = [];

  for (const ing of recipe.ingredients) {
    const ingName = String(ing.n || '').trim();
    if (!ingName || norm(ingName).startsWith('gelo') || norm(ingName) === 'agua') continue;

    const idx = updatedItems.findIndex((it) => it.in_stock && stockMatch(it.name, ingName));
    if (idx < 0) continue;

    const item = updatedItems[idx];
    const currentQty = Number(item.qty || 0);
    if (currentQty <= 0) continue;

    const unit = item.unit || getDefaultUnitForIngredient(item.name, item.category || '').unit;
    const parsed = parseIngredientUsage(ing.q);
    const totalUsed = parsed.amount * Math.max(1, orderQty);

    let decrement = 0;
    if (unit === 'garrafa' || unit === 'lata' || unit === 'litro') {
      const packMl = Number(item.size_ml || (unit === 'lata' ? 350 : unit === 'litro' ? 1000 : 750));
      decrement = parsed.isMl ? totalUsed / packMl : totalUsed * 0.08;
    } else if (unit === 'kg') {
      decrement = parsed.isMl ? totalUsed / 1000 : totalUsed * 0.08;
    } else if (unit === 'maco') {
      decrement = totalUsed * 0.06;
    } else {
      decrement = Math.min(currentQty, parsed.isMl ? 0.1 : totalUsed * 0.5);
    }

    const nextQty = Math.max(0, Math.round((currentQty - decrement) * 100) / 100);
    // Keep integer in DB if column is int, or store rounded ceiling so we never break integer column
    const dbQty = Math.max(0, Math.round(nextQty));
    const minQty = Number(item.min_qty || 0);

    if (dbQty !== currentQty) {
      const nextInStock = dbQty > 0 ? item.in_stock : false;
      const nextItem: BarItem = { ...item, qty: dbQty, in_stock: nextInStock };
      updatedItems[idx] = nextItem;
      deductedCount++;
      await sb.from('bar_items').update({ qty: dbQty, in_stock: nextInStock }).eq('id', item.id);
    }
    if (dbQty <= 0 || (minQty > 0 && dbQty <= minQty)) {
      lowStockNames.push(dbQty <= 0 ? `${item.name} (ESGOTADO)` : item.name);
    }
  }

  if (deductedCount > 0) {
    if (onItemsChange) onItemsChange(updatedItems);
    void broadcastMenuUpdate(bar.id);
  }
  return { deductedCount, lowStockNames };
}

/* ============================================================
 * FILA OFFLINE DE PEDIDOS DO GARÇOM (RESILIÊNCIA A QUEDA DE WI-FI)
 * ============================================================ */
const OFFLINE_ORDERS_KEY = 'meubar_offline_orders_v1';

export interface OfflineQueuedOrder {
  id: string;
  bar_id: string;
  payload: Record<string, unknown>;
  label: string;
  created_at: string;
}

export function getOfflineQueuedOrders(barId?: string): OfflineQueuedOrder[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ORDERS_KEY);
    const list: OfflineQueuedOrder[] = raw ? JSON.parse(raw) : [];
    return barId ? list.filter((x) => x.bar_id === barId) : list;
  } catch {
    return [];
  }
}

export function enqueueOfflineOrder(barId: string, payload: Record<string, unknown>, label: string): void {
  const all = getOfflineQueuedOrders();
  all.push({
    id: 'off_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    bar_id: barId,
    payload,
    label,
    created_at: new Date().toISOString(),
  });
  try {
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(all));
  } catch {
    // ignore storage errors
  }
}

export async function flushOfflineOrders(barId?: string): Promise<number> {
  const all = getOfflineQueuedOrders();
  if (all.length === 0) return 0;
  const remaining: OfflineQueuedOrder[] = [];
  let sent = 0;

  for (const item of all) {
    if (barId && item.bar_id !== barId) {
      remaining.push(item);
      continue;
    }
    let res = await sb.from('orders').insert(item.payload);
    if (res.error && /column .* does not exist/i.test(res.error.message || '')) {
      const p = item.payload;
      res = await sb.from('orders').insert({
        bar_id: p.bar_id,
        recipe_id: p.recipe_id,
        client_name: p.client_name,
        qty: p.qty,
        note: p.note,
        price: p.price,
        table_label: p.table_label,
        table_tab_id: p.table_tab_id,
        status: 'pending',
        paid: false,
      });
    }
    if (res.error) {
      remaining.push(item);
    } else {
      sent++;
    }
  }

  try {
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(remaining));
  } catch {
    // ignore
  }
  return sent;
}

/* ============================================================
 * ALERTAS SONOROS E VIBRAÇÃO DIFERENCIADOS POR ESTAÇÃO
 * ============================================================ */
export function playStationAlert(
  station: 'bar' | 'cozinha' | 'garcom',
  category?: AlertCategoryKey
): void {
  if (canVibrateAlert(category)) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (station === 'garcom') navigator.vibrate([120, 80, 120, 80, 180]);
        else if (station === 'cozinha') navigator.vibrate([200, 100, 200]);
        else navigator.vibrate([150]);
      }
    } catch {
      // ignore
    }
  }

  if (!canPlayAlertSound(category)) return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs =
      station === 'garcom'
        ? [880, 1174, 1318] // Sininho alegre de pedido pronto
        : station === 'cozinha'
          ? [520, 660] // Som encorpado para cozinha
          : [740, 987]; // Som agudo para bar

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = station === 'cozinha' ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const start = ctx.currentTime + idx * 0.13;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  } catch {
    // ignore audio autoplay restrictions
  }
}

/* ============================================================
 * EXPORTAÇÃO CSV
 * ============================================================ */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ============================================================
 * HAPPY HOUR AUTOMÁTICO POR DIA E HORÁRIO
 * ============================================================ */
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function timeToMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || '00:00').split(':').map((x) => Number(x) || 0);
  return h * 60 + m;
}

export function isHappyHourActiveNow(rule: HappyHourRule, now: Date = new Date()): boolean {
  if (!rule || !rule.active) return false;
  const days = Array.isArray(rule.days) ? rule.days : [];
  if (days.length === 0) return false;

  const startMin = timeToMinutes(rule.start_time);
  const endMin = timeToMinutes(rule.end_time);
  const curMin = now.getHours() * 60 + now.getMinutes();
  const todayDow = now.getDay();
  const prevDow = (todayDow + 6) % 7;

  if (startMin <= endMin) {
    // Janela no mesmo dia (ex: 18:00 - 20:30)
    return days.includes(todayDow) && curMin >= startMin && curMin < endMin;
  }
  // Janela que vira meia-noite (ex: 22:00 - 02:00)
  return (days.includes(todayDow) && curMin >= startMin) || (days.includes(prevDow) && curMin < endMin);
}

export function getActiveHappyHours(
  bar?: Partial<Bar> | null,
  now: Date = new Date()
): HappyHourRule[] {
  const ops = getBarOpsData(bar);
  return (ops.happy_hours || []).filter((r) => isHappyHourActiveNow(r, now));
}

export function doesHappyHourApplyToRecipe(rule: HappyHourRule, recipe: Partial<Recipe>): boolean {
  if (rule.applies_to === 'all') return true;
  if (rule.applies_to === 'specific') {
    return Boolean(recipe.id && Array.isArray(rule.recipe_ids) && rule.recipe_ids.includes(recipe.id));
  }
  return getRecipeItemType(recipe) === rule.applies_to;
}

export function getEffectiveItemPrice(
  basePrice: number | null | undefined,
  recipe: Partial<Recipe>,
  bar?: Partial<Bar> | null,
  now: Date = new Date()
): {
  finalPrice: number | null;
  originalPrice: number | null;
  discounted: boolean;
  ruleName?: string;
  badge?: string;
  rule?: HappyHourRule;
} {
  if (basePrice == null || !Number.isFinite(Number(basePrice))) {
    return { finalPrice: null, originalPrice: null, discounted: false };
  }
  const orig = Number(basePrice);
  const activeRules = getActiveHappyHours(bar, now).filter((r) =>
    doesHappyHourApplyToRecipe(r, recipe)
  );
  if (activeRules.length === 0) {
    return { finalPrice: orig, originalPrice: orig, discounted: false };
  }

  let bestPrice = orig;
  let bestRule: HappyHourRule | undefined;

  for (const r of activeRules) {
    const val = Math.max(0, Number(r.discount_value) || 0);
    let candidate = orig;
    if (r.discount_type === 'percent') {
      candidate = orig * (1 - Math.min(95, val) / 100);
    } else if (r.discount_type === 'fixed_off') {
      candidate = Math.max(0.5, orig - val);
    } else if (r.discount_type === 'fixed_price') {
      candidate = val > 0 ? Math.min(orig, val) : orig;
    }
    candidate = Math.round(candidate * 100) / 100;
    if (candidate < bestPrice) {
      bestPrice = candidate;
      bestRule = r;
    }
  }

  if (!bestRule || bestPrice >= orig) {
    return { finalPrice: orig, originalPrice: orig, discounted: false };
  }

  return {
    finalPrice: bestPrice,
    originalPrice: orig,
    discounted: true,
    ruleName: bestRule.name,
    badge:
      bestRule.badge ||
      (bestRule.discount_type === 'percent'
        ? `🍻 -${bestRule.discount_value}% HH`
        : bestRule.discount_type === 'fixed_price'
          ? `🍻 HH ${money(bestPrice)}`
          : `🍻 -${money(bestRule.discount_value)} HH`),
    rule: bestRule,
  };
}

/* ============================================================
 * CARTÃO FIDELIDADE & CASHBACK POR CLIENTE
 * ============================================================ */
export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  enabled: false,
  mode: 'stamps',
  stamps_target: 10,
  stamp_reward_value: 25,
  stamp_reward_label: '1 Drink Clássico grátis',
  cashback_percent: 5,
  min_redeem_value: 5,
};

export function getLoyaltyConfig(bar?: Partial<Bar> | null): LoyaltyConfig {
  const ops = getBarOpsData(bar);
  return {
    ...DEFAULT_LOYALTY_CONFIG,
    ...(ops.loyalty || {}),
  };
}

export function findLoyaltyCustomer(
  bar: Partial<Bar> | null | undefined,
  clientName: string
): LoyaltyCustomerRecord | null {
  const target = norm(clientName);
  if (!target) return null;
  const list = getBarOpsData(bar).loyalty_customers || [];
  return list.find((c) => norm(c.name) === target) || null;
}

export function applyLoyaltyOnSale(
  ops: BarOperationalData,
  params: {
    clientNames: string[];
    itemsCount: number;
    saleTotal: number;
    redeemClientName?: string;
    redeemedCashback?: number;
    redeemedStamps?: number;
  }
): LoyaltyCustomerRecord[] {
  const cfg: LoyaltyConfig = { ...DEFAULT_LOYALTY_CONFIG, ...(ops.loyalty || {}) };
  const list = [...(ops.loyalty_customers || [])];
  if (!cfg.enabled) return list;

  const cleanNames = Array.from(
    new Set(
      params.clientNames
        .map((n) => n.trim())
        .filter((n) => n.length >= 2 && norm(n) !== 'cliente' && norm(n) !== 'balcao')
    )
  );
  if (cleanNames.length === 0) return list;

  const nowIso = new Date().toISOString();
  const shareTotal = params.saleTotal / cleanNames.length;
  const shareItems = Math.max(1, Math.round(params.itemsCount / cleanNames.length));

  for (const rawName of cleanNames) {
    const key = norm(rawName);
    const idx = list.findIndex((c) => norm(c.name) === key);
    const existing: LoyaltyCustomerRecord =
      idx >= 0
        ? { ...list[idx] }
        : {
            id: 'loy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: rawName,
            stamps: 0,
            cashback_balance: 0,
            total_redeemed: 0,
            visits: 0,
            total_spent: 0,
            updated_at: nowIso,
          };

    // Debita eventual resgate deste cliente antes de somar a nova compra
    if (params.redeemClientName && norm(params.redeemClientName) === key) {
      if (params.redeemedStamps && params.redeemedStamps > 0) {
        existing.stamps = Math.max(0, existing.stamps - params.redeemedStamps);
        existing.total_redeemed += cfg.stamp_reward_value || 0;
      }
      if (params.redeemedCashback && params.redeemedCashback > 0) {
        existing.cashback_balance = Math.max(
          0,
          Math.round((existing.cashback_balance - params.redeemedCashback) * 100) / 100
        );
        existing.total_redeemed =
          Math.round((existing.total_redeemed + params.redeemedCashback) * 100) / 100;
      }
    }

    // Credita novos pontos/cashback
    if (cfg.mode === 'stamps') {
      existing.stamps += shareItems;
    } else {
      const earned = Math.round(shareTotal * (Math.max(0, cfg.cashback_percent) / 100) * 100) / 100;
      existing.cashback_balance = Math.round((existing.cashback_balance + earned) * 100) / 100;
    }

    existing.visits += 1;
    existing.total_spent = Math.round((existing.total_spent + shareTotal) * 100) / 100;
    existing.updated_at = nowIso;

    if (idx >= 0) list[idx] = existing;
    else list.unshift(existing);
  }

  return list.slice(0, 400);
}

/* ============================================================
 * CHAMAR GARÇOM & PEDIR A CONTA (CARDÁPIO DIGITAL -> EQUIPE)
 * ============================================================ */
export async function sendTableCall(
  barId: string,
  payload: {
    table_label?: string | null;
    client_name: string;
    kind: 'waiter' | 'bill';
    note?: string | null;
  }
): Promise<{ ok: boolean; call: TableCallAlert }> {
  let id = 'call_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const createdAt = new Date().toISOString();

  // 1) Tenta gravar no banco via RPC dedicada (se schema_completo.sql já foi rodado)
  try {
    const rpc = await sb.rpc('call_waiter', {
      p_bar: barId,
      p_table: payload.table_label || null,
      p_client: payload.client_name,
      p_kind: payload.kind,
      p_note: payload.note || null,
    });
    if (!rpc.error && rpc.data) {
      id = String(rpc.data);
    }
  } catch {
    // fallback silencioso para broadcast em tempo real
  }

  const call: TableCallAlert = {
    id,
    bar_id: barId,
    table_label: payload.table_label || null,
    client_name: payload.client_name,
    kind: payload.kind,
    note: payload.note || null,
    status: 'open',
    created_at: createdAt,
  };

  // 2) Dispara Realtime Broadcast imediato (funciona mesmo sem migração SQL)
  try {
    const ch = sb.channel(`bar-calls-${barId}`);
    await new Promise<void>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          resolve();
        }
      }, 1500);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED' && !done) {
          done = true;
          clearTimeout(timer);
          void ch
            .send({
              type: 'broadcast',
              event: 'table_call',
              payload: call,
            })
            .finally(() => {
              setTimeout(() => void sb.removeChannel(ch), 400);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore broadcast error
  }

  return { ok: true, call };
}

export async function loadOpenTableCalls(barId: string): Promise<TableCallAlert[]> {
  try {
    const res = await sb
      .from('table_calls')
      .select('*')
      .eq('bar_id', barId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30);
    if (!res.error && Array.isArray(res.data)) {
      return res.data as TableCallAlert[];
    }
  } catch {
    // tabela opcional ainda não criada
  }
  return [];
}

export async function resolveTableCall(barId: string, callId: string): Promise<void> {
  // 1) Atualiza no banco se for UUID real da tabela table_calls
  if (!callId.startsWith('call_')) {
    try {
      await sb
        .from('table_calls')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', callId);
    } catch {
      // ignore
    }
  }
  // 2) Avisa todos os aparelhos da equipe via broadcast para limpar o alerta na hora
  try {
    const ch = sb.channel(`bar-calls-${barId}`);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void ch
          .send({
            type: 'broadcast',
            event: 'table_call_resolved',
            payload: { id: callId },
          })
          .finally(() => {
            setTimeout(() => void sb.removeChannel(ch), 300);
          });
      }
    });
  } catch {
    // ignore
  }
}

/* ============================================================
 * MULTI-GARÇOM (MODO, PRAÇAS/SETORES, RESPONSÁVEL & CLAIM) + DELIVERY DIRETO
 * ============================================================ */
export const WAITER_MODE_META: Record<
  WaiterOperationMode,
  { label: string; shortLabel: string; description: string }
> = {
  hybrid: {
    label: '🔄 Híbrido (Recomendado)',
    shortLabel: '🔄 Modo Híbrido',
    description:
      'O 1º garçom que atender a mesa vira o responsável oficial, mas qualquer colega livre pode ajudar usando a trava "✋ Vou levar" ou "✋ Indo atender".',
  },
  fixed: {
    label: '👤 Mesa Fixa / Praças',
    shortLabel: '👤 Praças Fixas',
    description:
      'Cada garçom cuida das suas mesas ou da sua praça/setor do salão. Os alertas destacam as mesas do responsável.',
  },
  open_queue: {
    label: '⚡ Fila Livre (Quem pegar 1º)',
    shortLabel: '⚡ Fila Livre',
    description:
      'Sem mesa fixa: todos os pedidos prontos e chamados aparecem para a equipe e o 1º garçom que tocar em "✋ Vou levar" trava o atendimento.',
  },
};

export const DEFAULT_WAITER_CONFIG: WaiterModeConfig = {
  mode: 'hybrid',
  auto_assign_on_first_order: true,
  waiter_commission_pct: 10,
  zones: [],
};

export function getWaiterConfig(bar?: Partial<Bar> | null): WaiterModeConfig {
  const ops = getBarOpsData(bar);
  return {
    ...DEFAULT_WAITER_CONFIG,
    ...(ops.waiter_config || {}),
    zones: Array.isArray(ops.waiter_config?.zones) ? ops.waiter_config.zones : [],
  };
}

export function tableOwnerKey(tableLabel?: string | null): string {
  return norm(tableLabel || '');
}

export function getTableZoneForLabel(
  bar: Partial<Bar> | null | undefined,
  tableLabel?: string | null
): { zoneName: string; waiterName: string } | null {
  const k = tableOwnerKey(tableLabel);
  if (!k) return null;
  const cfg = getWaiterConfig(bar);
  for (const z of cfg.zones || []) {
    if ((z.table_labels || []).some((lbl) => tableOwnerKey(lbl) === k)) {
      return { zoneName: z.name, waiterName: z.waiter_name };
    }
  }
  return null;
}

export function getEffectiveTableOwner(
  bar: Partial<Bar> | null | undefined,
  tableLabel?: string | null
): { waiterName: string; source: 'explicit' | 'zone' | 'none'; zoneName?: string } {
  const k = tableOwnerKey(tableLabel);
  if (!k) return { waiterName: '', source: 'none' };
  const ops = getBarOpsData(bar);
  const explicit = ops.table_waiters?.[k]?.waiter_name?.trim();
  const zone = getTableZoneForLabel(bar, tableLabel);
  if (explicit) {
    return { waiterName: explicit, source: 'explicit', zoneName: zone?.zoneName };
  }
  if (zone && zone.waiterName.trim()) {
    return { waiterName: zone.waiterName.trim(), source: 'zone', zoneName: zone.zoneName };
  }
  return { waiterName: '', source: 'none', zoneName: zone?.zoneName };
}

export async function broadcastBarOpsSync(barId: string): Promise<void> {
  try {
    const ch = sb.channel(`bar-calls-${barId}`);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void ch
          .send({
            type: 'broadcast',
            event: 'bar_ops_sync',
            payload: { at: Date.now() },
          })
          .finally(() => {
            setTimeout(() => void sb.removeChannel(ch), 300);
          });
      }
    });
  } catch {
    // ignore
  }
}

export const DELIVERY_PAYMENT_LABELS: Record<DeliveryPaymentOption, string> = {
  maquininha_credito: '💳 Maquininha Crédito',
  maquininha_debito: '💳 Maquininha Débito',
  pix_entrega: '💠 Pix na entrega',
  dinheiro: '💵 Dinheiro',
};

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  enabled: false,
  allow_pickup: true,
  delivery_fee: 8,
  free_delivery_above: 0,
  min_order_value: 20,
  eta_minutes: '35-50 min',
  schedule_text: '',
  areas_note: 'Consulte bairros atendidos ao finalizar o pedido.',
  whatsapp_phone: '',
  payment_methods: ['maquininha_credito', 'maquininha_debito', 'pix_entrega', 'dinheiro'],
  zones: [],
};

export function getDeliveryConfig(bar?: Partial<Bar> | null): DeliveryConfig {
  const ops = getBarOpsData(bar);
  return {
    ...DEFAULT_DELIVERY_CONFIG,
    ...(ops.delivery_config || {}),
    payment_methods:
      ops.delivery_config?.payment_methods && ops.delivery_config.payment_methods.length > 0
        ? ops.delivery_config.payment_methods
        : DEFAULT_DELIVERY_CONFIG.payment_methods,
    zones: Array.isArray(ops.delivery_config?.zones) ? ops.delivery_config.zones : [],
  };
}

export function deliveryMenuUrl(barId: string, mode: 'delivery' | 'pickup' = 'delivery'): string {
  if (typeof window === 'undefined') return `?bar=${encodeURIComponent(barId)}&mode=${mode}`;
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?bar=${encodeURIComponent(barId)}&mode=${mode}`;
}

export interface ParsedDeliveryMeta {
  isDelivery: boolean;
  code: string;
  mode: 'delivery' | 'pickup';
  phone: string;
  address: string;
  payment: string;
  changeFor: string;
  fee: number;
  cleanItemNote: string;
}

function sanitizePipeField(v: string): string {
  return String(v || '')
    .replace(/[\r\n|[\]]+/g, ' ')
    .trim();
}

export function formatDeliveryOrderNote(
  meta: {
    code: string;
    mode: 'delivery' | 'pickup';
    phone: string;
    address: string;
    payment: string;
    changeFor?: string;
    fee: number;
  },
  itemNote?: string
): string {
  const parts = [
    `code=${sanitizePipeField(meta.code)}`,
    `mode=${meta.mode}`,
    `phone=${sanitizePipeField(meta.phone)}`,
    `pay=${sanitizePipeField(meta.payment)}`,
    `chg=${sanitizePipeField(meta.changeFor || '')}`,
    `fee=${Number(meta.fee || 0).toFixed(2)}`,
    `addr=${sanitizePipeField(meta.address)}`,
  ];
  const header = `[DLV|${parts.join('|')}]`;
  const cleanObs = String(itemNote || '').trim();
  return cleanObs ? `${header} ${cleanObs}` : header;
}

export function parseDeliveryOrderMeta(order: Pick<Order, 'note' | 'table_label' | 'id'>): ParsedDeliveryMeta | null {
  const note = String(order.note || '');
  const tableLabel = String(order.table_label || '').toUpperCase();
  const match = note.match(/\[DLV\|([^\]]+)\]\s*(.*)/);
  if (match) {
    const kv: Record<string, string> = {};
    match[1].split('|').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > 0) {
        kv[pair.slice(0, idx)] = pair.slice(idx + 1);
      }
    });
    const mode: 'delivery' | 'pickup' = kv.mode === 'pickup' ? 'pickup' : 'delivery';
    return {
      isDelivery: true,
      code: kv.code || order.id.slice(0, 4).toUpperCase(),
      mode,
      phone: kv.phone || '',
      address: kv.addr || (mode === 'pickup' ? 'Retirada no balcão' : ''),
      payment: kv.pay || 'Combinar na entrega',
      changeFor: kv.chg || '',
      fee: Number(kv.fee || 0) || 0,
      cleanItemNote: (match[2] || '').trim(),
    };
  }
  if (tableLabel.startsWith('DELIVERY') || tableLabel.startsWith('RETIRADA')) {
    const mode: 'delivery' | 'pickup' = tableLabel.startsWith('RETIRADA') ? 'pickup' : 'delivery';
    const codeMatch = tableLabel.match(/#([A-Z0-9]+)/i);
    return {
      isDelivery: true,
      code: codeMatch ? codeMatch[1] : order.id.slice(0, 4).toUpperCase(),
      mode,
      phone: '',
      address: mode === 'pickup' ? 'Retirada no balcão' : 'Endereço informado no pedido',
      payment: 'Combinar na entrega',
      changeFor: '',
      fee: 0,
      cleanItemNote: note,
    };
  }
  return null;
}

export function isDeliveryOrder(order: Pick<Order, 'note' | 'table_label' | 'id'>): boolean {
  return parseDeliveryOrderMeta(order) !== null;
}

export function cleanWhatsAppDigits(phone: string): string {
  const digits = String(phone || '').replace(/\D+/g, '');
  if (!digits) return '';
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
}

export function buildMapsSearchUrl(address: string, city?: string | null): string {
  const q = [address, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export interface DeliveryOrderGroup {
  code: string;
  mode: 'delivery' | 'pickup';
  clientName: string;
  phone: string;
  address: string;
  payment: string;
  changeFor: string;
  fee: number;
  subtotal: number;
  total: number;
  createdAt: string;
  orders: Order[];
  dispatch?: DeliveryDispatchRecord;
}

export function buildMotoboyWhatsAppLink(
  courierPhone: string,
  bar: Pick<Bar, 'name' | 'city'>,
  group: DeliveryOrderGroup,
  recipeNames: Record<string, string>
): string {
  const digits = cleanWhatsAppDigits(courierPhone);
  const itemsText = group.orders
    .map((o) => `• ${o.qty || 1}x ${o.recipe_name || recipeNames[o.recipe_id] || 'Item'}`)
    .join('\n');
  const mapsUrl = buildMapsSearchUrl(group.address, bar.city);
  const lines = [
    `🛵 *NOVA ENTREGA — ${bar.name}*`,
    `Pedido: *#${group.code}*`,
    `Cliente: *${group.clientName}*${group.phone ? ` (${group.phone})` : ''}`,
    `📍 Endereço: *${group.address}*`,
    `🗺️ Rota Google Maps: ${mapsUrl}`,
    '',
    `📦 *Itens:*`,
    itemsText,
    '',
    `💰 *Total a cobrar: ${money(group.total)}* (Taxa: ${money(group.fee)})`,
    `💳 Pagamento: *${group.payment}*${group.changeFor ? ` · Levar troco para *${group.changeFor}*` : ''}`,
  ];
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildCustomerDeliveryWhatsAppLink(
  customerPhone: string,
  bar: Pick<Bar, 'name'>,
  group: DeliveryOrderGroup,
  statusText: string
): string {
  const digits = cleanWhatsAppDigits(customerPhone);
  const msg = [
    `Olá ${group.clientName}! 👋`,
    `Atualização do seu pedido *#${group.code}* no *${bar.name}*:`,
    `${statusText}`,
    group.mode === 'delivery' ? `📍 Destino: ${group.address}` : '🛍️ Retirada no balcão',
    `💰 Total: ${money(group.total)} (${group.payment})`,
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function printDeliveryTicket(params: {
  bar: Bar;
  group: DeliveryOrderGroup;
  recipeNames: Record<string, string>;
}): boolean {
  const { bar, group, recipeNames } = params;
  const ops = getBarOpsData(bar);
  const widthMm = ops.printer_width === '58mm' ? '58mm' : '80mm';
  const nowStr = new Date().toLocaleString('pt-BR');
  const itemsHtml = group.orders
    .map((o) => {
      const meta = parseDeliveryOrderMeta(o);
      const name = o.recipe_name || recipeNames[o.recipe_id] || 'Item';
      return `<div><b>${o.qty || 1}x ${escHtml(name)}</b>${meta?.cleanItemNote ? `<br/><small>Obs: ${escHtml(meta.cleanItemNote)}</small>` : ''}</div>`;
    })
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${widthMm} auto; margin: 2mm; }
    body { font-family: 'Courier New', monospace; width: ${widthMm}; margin: 0 auto; color: #000; font-size: 12px; line-height: 1.35; }
    .c { text-align: center; }
    .b { font-weight: bold; }
    .big { font-size: 16px; font-weight: bold; }
    .row { display: flex; justify-content: space-between; }
    .hr { border-top: 1px dashed #000; margin: 6px 0; }
  </style></head><body>
    <div class="c b">${escHtml(bar.name.toUpperCase())}</div>
    <div class="c big">${group.mode === 'pickup' ? 'RETIRADA' : 'DELIVERY'} #${escHtml(group.code)}</div>
    <div class="c">${escHtml(nowStr)}</div>
    <div class="hr"></div>
    <div class="b">Cliente: ${escHtml(group.clientName)}</div>
    ${group.phone ? `<div>Tel: ${escHtml(group.phone)}</div>` : ''}
    <div><b>Endereço:</b> ${escHtml(group.address)}</div>
    ${group.dispatch?.courier_name ? `<div><b>Motoboy:</b> ${escHtml(group.dispatch.courier_name)}</div>` : ''}
    <div class="hr"></div>
    ${itemsHtml}
    <div class="hr"></div>
    <div class="row"><span>Subtotal</span><span>${escHtml(money(group.subtotal))}</span></div>
    ${group.fee > 0 ? `<div class="row"><span>Taxa Entrega</span><span>${escHtml(money(group.fee))}</span></div>` : ''}
    <div class="row big"><span>TOTAL</span><span>${escHtml(money(group.total))}</span></div>
    <div style="margin-top:6px;"><b>Pagto:</b> ${escHtml(group.payment)}${group.changeFor ? ` (Troco p/ ${escHtml(group.changeFor)})` : ''}</div>
    <div class="hr"></div>
    <div class="c">Bom apetite!</div>
  </body></html>`;

  if (getConnectedBluetoothPrinter().connected) {
    const btLines: Parameters<typeof buildEscPosBytes>[0] = [
      { text: bar.name.toUpperCase(), align: 'center', bold: true },
      {
        text: `${group.mode === 'pickup' ? 'RETIRADA' : 'DELIVERY'} #${group.code}`,
        align: 'center',
        bold: true,
        doubleSize: true,
      },
      { text: nowStr, align: 'center' },
      { text: '', hr: true },
      { text: `Cliente: ${group.clientName}`, bold: true },
      ...(group.phone ? [{ text: `Tel: ${group.phone}` }] : []),
      { text: `End: ${group.address}`, bold: true },
      ...(group.dispatch?.courier_name ? [{ text: `Motoboy: ${group.dispatch.courier_name}` }] : []),
      { text: '', hr: true },
      ...group.orders.map((o) => ({
        text: `${o.qty || 1}x ${o.recipe_name || recipeNames[o.recipe_id] || 'Item'}`,
        bold: true,
      })),
      { text: '', hr: true },
      { text: '', pair: ['Subtotal', money(group.subtotal)] },
      ...(group.fee > 0 ? [{ text: '', pair: ['Entrega', money(group.fee)] as [string, string] }] : []),
      { text: '', pair: ['TOTAL', money(group.total)], bold: true },
      { text: `Pagto: ${group.payment}${group.changeFor ? ` (Troco p/ ${group.changeFor})` : ''}`, bold: true },
      { text: '', hr: true },
    ];
    const bytes = buildEscPosBytes(btLines, widthMm);
    void writeEscPosBluetooth(bytes).then((ok) => {
      if (!ok) printHtmlViaIframe(html);
    });
    return true;
  }

  return printHtmlViaIframe(html);
}

