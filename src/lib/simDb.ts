import type {
  Bar,
  BarItem,
  BarMember,
  BarServicePassword,
  Order,
  Recipe,
  ServiceRequest,
  TableCallAlert,
  TableTab,
} from '../types/meubar';
import { getRecipeItemType, isRecipeManuallyUnavailable, makeDrink, norm } from './utils';

export const SIM_BAR_ID = 'sim-bar-001';
export const SIM_OWNER_ID = 'sim-owner-001';

export interface SimPriceRow {
  id: string;
  bar_id: string;
  recipe_id: string;
  price: number;
}

export interface SimSeedData {
  bar: Bar;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  orders: Order[];
  tableTabs: TableTab[];
  tableCalls: TableCallAlert[];
  members: BarMember[];
}

export interface SimSnapshot {
  bar: Bar | null;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  orders: Order[];
  tableTabs: TableTab[];
  tableCalls: TableCallAlert[];
  members: BarMember[];
}

type TableRow = Record<string, unknown>;

interface SimTables {
  bars: Bar[];
  bar_items: BarItem[];
  recipes: Recipe[];
  bar_prices: SimPriceRow[];
  orders: Order[];
  table_tabs: TableTab[];
  table_calls: TableCallAlert[];
  bar_members: BarMember[];
  bar_service_passwords: BarServicePassword[];
  bar_service_requests: ServiceRequest[];
  job_applications: TableRow[];
  job_posts: TableRow[];
}

const emptyTables = (): SimTables => ({
  bars: [],
  bar_items: [],
  recipes: [],
  bar_prices: [],
  orders: [],
  table_tabs: [],
  table_calls: [],
  bar_members: [],
  bar_service_passwords: [],
  bar_service_requests: [],
  job_applications: [],
  job_posts: [],
});

let simActive = false;
let tables: SimTables = emptyTables();
const listeners = new Set<() => void>();
const blobUrls: string[] = [];
let savedThemeVars: Record<string, string> | null = null;

const THEME_CSS_KEYS = ['--bg', '--s1', '--s2', '--ac', '--ok', '--tx'];

function snapshotRootTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const snap: Record<string, string> = {};
  THEME_CSS_KEYS.forEach((k) => {
    snap[k] = root.style.getPropertyValue(k);
  });
  savedThemeVars = snap;
}

function restoreRootTheme() {
  if (typeof document === 'undefined' || !savedThemeVars) return;
  const root = document.documentElement;
  THEME_CSS_KEYS.forEach((k) => {
    const val = savedThemeVars?.[k] || '';
    if (val) root.style.setProperty(k, val);
    else root.style.removeProperty(k);
  });
  savedThemeVars = null;
}

function clearSimLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.includes(SIM_BAR_ID)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore storage errors
  }
}

export function isSimDbActive(): boolean {
  return simActive;
}

export function notifySimDbChange(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeSimDb(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function registerSimBlobUrl(file: File): string {
  const url = URL.createObjectURL(file);
  blobUrls.push(url);
  return url;
}

export function activateSimDb(seed: SimSeedData): void {
  clearSimLocalStorage();
  snapshotRootTheme();

  const priceRows: SimPriceRow[] = Object.entries(seed.prices).map(([recipe_id, price]) => ({
    id: `sim_pr_${recipe_id}`,
    bar_id: seed.bar.id,
    recipe_id,
    price: Number(price),
  }));

  tables = {
    bars: [{ ...seed.bar }],
    bar_items: seed.items.map((x) => ({ ...x })),
    recipes: seed.recipes.map((x) => ({ ...x })),
    bar_prices: priceRows,
    orders: seed.orders.map((x) => ({ ...x })),
    table_tabs: seed.tableTabs.map((x) => ({ ...x })),
    table_calls: seed.tableCalls.map((x) => ({ ...x })),
    bar_members: seed.members.map((x) => ({ ...x })),
    bar_service_passwords: [],
    bar_service_requests: [],
    job_applications: [],
    job_posts: [],
  };

  simActive = true;
  notifySimDbChange();
}

export function deactivateSimDb(): void {
  simActive = false;
  tables = emptyTables();
  blobUrls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {
      // ignore
    }
  });
  blobUrls.length = 0;
  clearSimLocalStorage();
  restoreRootTheme();
  notifySimDbChange();
}

export function getSimSnapshot(): SimSnapshot {
  const prices: Record<string, number> = {};
  tables.bar_prices.forEach((p) => {
    if (p.bar_id === SIM_BAR_ID) prices[p.recipe_id] = Number(p.price);
  });
  return {
    bar: tables.bars[0] ? { ...tables.bars[0] } : null,
    items: tables.bar_items.map((x) => ({ ...x })),
    recipes: tables.recipes.map((x) => ({ ...x })),
    prices,
    orders: tables.orders.map((x) => ({ ...x })),
    tableTabs: tables.table_tabs.map((x) => ({ ...x })),
    tableCalls: tables.table_calls.map((x) => ({ ...x })),
    members: tables.bar_members.map((x) => ({ ...x })),
  };
}

function makeSimId(prefix: string): string {
  return `sim_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function getTableArray(table: string): TableRow[] | null {
  if (table in tables) {
    return (tables as unknown as Record<string, TableRow[]>)[table];
  }
  return null;
}

function setTableArray(table: string, next: TableRow[]): void {
  if (table in tables) {
    (tables as unknown as Record<string, TableRow[]>)[table] = next;
  }
}

interface FilterCond {
  op: 'eq' | 'neq' | 'in' | 'is' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike' | 'like';
  col: string;
  val: unknown;
}

function matchesFilters(row: TableRow, filters: FilterCond[]): boolean {
  for (const f of filters) {
    const v = row[f.col];
    switch (f.op) {
      case 'eq':
        if (v !== f.val) return false;
        break;
      case 'neq':
        if (v === f.val) return false;
        break;
      case 'in':
        if (!Array.isArray(f.val) || !f.val.includes(v)) return false;
        break;
      case 'is':
        if (f.val === null) {
          if (v !== null && v !== undefined) return false;
        } else if (v !== f.val) {
          return false;
        }
        break;
      case 'gt':
        if (!(Number(v) > Number(f.val))) return false;
        break;
      case 'gte':
        if (typeof v === 'string' && typeof f.val === 'string') {
          if (v < f.val) return false;
        } else if (!(Number(v) >= Number(f.val))) {
          return false;
        }
        break;
      case 'lt':
        if (!(Number(v) < Number(f.val))) return false;
        break;
      case 'lte':
        if (typeof v === 'string' && typeof f.val === 'string') {
          if (v > f.val) return false;
        } else if (!(Number(v) <= Number(f.val))) {
          return false;
        }
        break;
      case 'ilike': {
        const needle = String(f.val || '').replace(/%/g, '').toLowerCase();
        if (!String(v || '').toLowerCase().includes(needle)) return false;
        break;
      }
      case 'like': {
        const needle = String(f.val || '').replace(/%/g, '');
        if (!String(v || '').includes(needle)) return false;
        break;
      }
    }
  }
  return true;
}

class SimQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null }> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: unknown = null;
  private upsertConflict: string | null = null;
  private filters: FilterCond[] = [];
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private expectSingle: 'none' | 'single' | 'maybeSingle' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  select(_cols?: string) {
    return this;
  }

  insert(rows: TableRow | TableRow[]) {
    this.action = 'insert';
    this.payload = rows;
    return this;
  }

  update(patch: TableRow) {
    this.action = 'update';
    this.payload = patch;
    return this;
  }

  upsert(rows: TableRow | TableRow[], opts?: { onConflict?: string }) {
    this.action = 'upsert';
    this.payload = rows;
    this.upsertConflict = opts?.onConflict || null;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ op: 'eq', col, val });
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push({ op: 'neq', col, val });
    return this;
  }

  in(col: string, val: unknown[]) {
    this.filters.push({ op: 'in', col, val });
    return this;
  }

  is(col: string, val: unknown) {
    this.filters.push({ op: 'is', col, val });
    return this;
  }

  gt(col: string, val: unknown) {
    this.filters.push({ op: 'gt', col, val });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ op: 'gte', col, val });
    return this;
  }

  lt(col: string, val: unknown) {
    this.filters.push({ op: 'lt', col, val });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ op: 'lte', col, val });
    return this;
  }

  ilike(col: string, val: string) {
    this.filters.push({ op: 'ilike', col, val });
    return this;
  }

  like(col: string, val: string) {
    this.filters.push({ op: 'like', col, val });
    return this;
  }

  or(_expr: string) {
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  range(_from: number, to: number) {
    this.limitN = to + 1;
    return this;
  }

  single() {
    this.expectSingle = 'single';
    return this;
  }

  maybeSingle() {
    this.expectSingle = 'maybeSingle';
    return this;
  }

  private execute(): { data: unknown; error: { message: string } | null } {
    const arr = getTableArray(this.table);
    if (!arr) {
      // Tabelas fora da simulação (ex.: platform_config, partner_ads, admin_notifications)
      if (this.expectSingle !== 'none') return { data: null, error: null };
      return { data: [], error: null };
    }

    const nowIso = new Date().toISOString();

    if (this.action === 'insert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload as TableRow];
      const inserted: TableRow[] = incoming.map((raw) => {
        const row: TableRow = { ...raw };
        if (!row.id && this.table !== 'bar_members') {
          row.id = makeSimId(this.table);
        }
        if (!row.created_at) {
          row.created_at = nowIso;
        }
        return row;
      });
      setTableArray(this.table, [...inserted, ...arr]);
      notifySimDbChange();
      if (this.expectSingle !== 'none') {
        return { data: inserted[0] ? { ...inserted[0] } : null, error: null };
      }
      return { data: inserted.map((r) => ({ ...r })), error: null };
    }

    if (this.action === 'upsert') {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload as TableRow];
      const conflictCols = this.upsertConflict
        ? this.upsertConflict.split(',').map((s) => s.trim())
        : ['id'];
      const next = [...arr];
      const touched: TableRow[] = [];

      for (const raw of incoming) {
        const idx = next.findIndex((existing) =>
          conflictCols.every((c) => existing[c] !== undefined && existing[c] === raw[c])
        );
        if (idx >= 0) {
          const updated = { ...next[idx], ...raw };
          next[idx] = updated;
          touched.push(updated);
        } else {
          const row: TableRow = { ...raw };
          if (!row.id && this.table !== 'bar_members') row.id = makeSimId(this.table);
          if (!row.created_at) row.created_at = nowIso;
          next.unshift(row);
          touched.push(row);
        }
      }
      setTableArray(this.table, next);
      notifySimDbChange();
      if (this.expectSingle !== 'none') {
        return { data: touched[0] ? { ...touched[0] } : null, error: null };
      }
      return { data: touched.map((r) => ({ ...r })), error: null };
    }

    if (this.action === 'update') {
      const patch = (this.payload || {}) as TableRow;
      const updatedRows: TableRow[] = [];
      const next = arr.map((row) => {
        if (matchesFilters(row, this.filters)) {
          const merged = { ...row, ...patch };
          updatedRows.push(merged);
          return merged;
        }
        return row;
      });
      setTableArray(this.table, next);
      notifySimDbChange();
      if (this.expectSingle !== 'none') {
        return { data: updatedRows[0] ? { ...updatedRows[0] } : null, error: null };
      }
      return { data: updatedRows.map((r) => ({ ...r })), error: null };
    }

    if (this.action === 'delete') {
      const removed: TableRow[] = [];
      const kept: TableRow[] = [];
      for (const row of arr) {
        if (matchesFilters(row, this.filters)) removed.push(row);
        else kept.push(row);
      }
      setTableArray(this.table, kept);
      notifySimDbChange();
      if (this.expectSingle !== 'none') {
        return { data: removed[0] ? { ...removed[0] } : null, error: null };
      }
      return { data: removed.map((r) => ({ ...r })), error: null };
    }

    // SELECT
    let out = arr.filter((r) => matchesFilters(r, this.filters)).map((r) => ({ ...r }));
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      out.sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), 'pt-BR');
        return ascending ? cmp : -cmp;
      });
    }
    if (this.limitN != null) {
      out = out.slice(0, this.limitN);
    }
    if (this.expectSingle === 'single') {
      return out[0]
        ? { data: out[0], error: null }
        : { data: null, error: { message: 'Row not found' } };
    }
    if (this.expectSingle === 'maybeSingle') {
      return { data: out[0] || null, error: null };
    }
    return { data: out, error: null };
  }

  then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const res = this.execute();
    return Promise.resolve(res).then(onfulfilled, onrejected);
  }
}

export function simFrom(table: string): SimQueryBuilder {
  return new SimQueryBuilder(table);
}

export async function simRpc(
  fn: string,
  args: Record<string, unknown> = {}
): Promise<{ data: unknown; error: { message: string } | null }> {
  const bar = tables.bars[0] || null;

  if (fn === 'get_menu') {
    if (!bar) return { data: null, error: { message: 'Bar simulado não encontrado.' } };
    const barItems = tables.bar_items.filter((i) => i.bar_id === bar.id);
    const priceMap: Record<string, number> = {};
    tables.bar_prices
      .filter((p) => p.bar_id === bar.id)
      .forEach((p) => {
        priceMap[p.recipe_id] = Number(p.price);
      });

    const isHome = bar.kind === 'home' || bar.kind === 'casa';
    const menuItems = tables.recipes
      .filter((r) => {
        if (r.owner && r.owner !== bar.owner) return false;
        const type = getRecipeItemType(r);
        if (type === 'drink') {
          if (!makeDrink(r, barItems)) return false;
          return isHome || priceMap[r.id] != null;
        }
        if (isRecipeManuallyUnavailable(r)) return false;
        return isHome || priceMap[r.id] != null;
      })
      .map((r) => ({
        ...r,
        price: priceMap[r.id] ?? r.price ?? null,
      }));

    const activeClients = Array.from(
      new Set(
        tables.orders
          .filter((o) => !o.paid)
          .map((o) => String(o.client_name || o.customer_name || '').trim())
          .filter(Boolean)
      )
    );

    return {
      data: {
        bar: { ...bar },
        items: menuItems,
        stock_items: barItems.map((i) => ({ ...i })),
        active_clients: activeClients,
      },
      error: null,
    };
  }

  if (fn === 'place_order') {
    const recipeId = String(args.p_recipe || '');
    const rec = tables.recipes.find((r) => r.id === recipeId);
    const priceRow = tables.bar_prices.find((p) => p.recipe_id === recipeId);
    const tabId = args.p_tab_id ? String(args.p_tab_id) : null;
    if (tabId) {
      const tab = tables.table_tabs.find((t) => t.id === tabId);
      if (tab && tab.status === 'closed') {
        return { data: null, error: { message: 'A comanda desta mesa já foi fechada no caixa.' } };
      }
    }
    const id = makeSimId('ord');
    const unitPrice = priceRow ? Number(priceRow.price) : Number(rec?.price || 0);
    const station: 'bar' | 'cozinha' =
      rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar';
    const newOrder: Order = {
      id,
      bar_id: String(args.p_bar || SIM_BAR_ID),
      recipe_id: recipeId,
      recipe_name: rec?.name || 'Item',
      client_name: String(args.p_name || 'Cliente'),
      customer_name: String(args.p_name || 'Cliente'),
      qty: Math.max(1, Number(args.p_qty || 1)),
      note: args.p_note ? String(args.p_note) : null,
      price: unitPrice,
      unit_price: unitPrice,
      table_label: args.p_table ? String(args.p_table) : null,
      table_tab_id: tabId,
      station,
      status: 'pending',
      paid: false,
      created_at: new Date().toISOString(),
    };
    tables.orders = [newOrder, ...tables.orders];
    notifySimDbChange();
    return { data: id, error: null };
  }

  if (fn === 'call_waiter') {
    const id = makeSimId('call');
    const call: TableCallAlert = {
      id,
      bar_id: String(args.p_bar || SIM_BAR_ID),
      table_label: args.p_table ? String(args.p_table) : null,
      client_name: String(args.p_client || 'Cliente'),
      kind: args.p_kind === 'bill' ? 'bill' : 'waiter',
      note: args.p_note ? String(args.p_note) : null,
      status: 'open',
      created_at: new Date().toISOString(),
    };
    tables.table_calls = [call, ...tables.table_calls];
    notifySimDbChange();
    return { data: id, error: null };
  }

  if (fn === 'order_status') {
    const ids = Array.isArray(args.p_ids) ? (args.p_ids as string[]) : [];
    const matched = tables.orders
      .filter((o) => ids.includes(o.id))
      .map((o) => ({ id: o.id, status: o.status, paid: Boolean(o.paid) }));
    return { data: matched, error: null };
  }

  if (fn === 'get_table_tab_state') {
    const lbl = norm(String(args.p_table || ''));
    const openTab = tables.table_tabs.find(
      (t) => t.status === 'open' && norm(t.table_label) === lbl
    );
    if (!openTab) {
      return { data: { open: false, table_label: String(args.p_table || '') }, error: null };
    }
    return {
      data: {
        open: true,
        tab_id: openTab.id,
        table_label: openTab.table_label,
        opened_by: openTab.opened_by,
      },
      error: null,
    };
  }

  if (fn === 'verify_table_tab_member') {
    const tabId = String(args.p_tab_id || '');
    const code = String(args.p_code || '').trim();
    const tab = tables.table_tabs.find((t) => t.id === tabId);
    if (!tab || tab.status !== 'open' || tab.code !== code) {
      return { data: { valid: false, status: tab?.status || 'closed' }, error: null };
    }
    return {
      data: {
        valid: true,
        status: tab.status,
        members: tab.members,
        opened_by: tab.opened_by,
      },
      error: null,
    };
  }

  if (fn === 'open_or_join_table_tab') {
    const tableLabel = String(args.p_table || '').trim();
    const guestName = String(args.p_name || '').trim();
    const codeIn = String(args.p_code || '').trim();
    const existing = tables.table_tabs.find(
      (t) => t.status === 'open' && norm(t.table_label) === norm(tableLabel)
    );
    if (existing) {
      if (!codeIn || codeIn !== existing.code) {
        return {
          data: {
            ok: false,
            needs_code: true,
            tab_id: existing.id,
            opened_by: existing.opened_by,
            error: `Código da mesa incorreto. Dica da simulação: ${existing.code}`,
          },
          error: null,
        };
      }
      if (!existing.members.some((m) => norm(m) === norm(guestName))) {
        existing.members = [...existing.members, guestName];
        notifySimDbChange();
      }
      return {
        data: {
          ok: true,
          is_new: false,
          tab_id: existing.id,
          table_label: existing.table_label,
          code: existing.code,
          opened_by: existing.opened_by,
          members: existing.members,
        },
        error: null,
      };
    }
    const newCode = String(Math.floor(1000 + Math.random() * 9000));
    const newTab: TableTab = {
      id: makeSimId('tab'),
      bar_id: String(args.p_bar || SIM_BAR_ID),
      table_label: tableLabel,
      code: newCode,
      opened_by: guestName,
      members: [guestName],
      status: 'open',
      created_at: new Date().toISOString(),
    };
    tables.table_tabs = [newTab, ...tables.table_tabs];
    notifySimDbChange();
    return {
      data: {
        ok: true,
        is_new: true,
        tab_id: newTab.id,
        table_label: newTab.table_label,
        code: newTab.code,
        opened_by: newTab.opened_by,
        members: newTab.members,
      },
      error: null,
    };
  }

  if (fn === 'active_client_names') {
    const names = Array.from(
      new Set(
        tables.orders
          .filter((o) => !o.paid)
          .map((o) => String(o.client_name || o.customer_name || '').trim())
          .filter(Boolean)
      )
    );
    return { data: names, error: null };
  }

  return { data: null, error: null };
}

export function simChannel(_name: string) {
  const ch = {
    on: () => ch,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) setTimeout(() => cb('SUBSCRIBED'), 0);
      return ch;
    },
    send: async () => 'ok',
    unsubscribe: async () => 'ok',
  };
  return ch;
}
