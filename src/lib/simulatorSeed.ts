import type { StaffRoleKey } from '../types/meubar';

export interface SimTableConfig {
  id: string;
  label: string;
  guests: string[];
}

export interface SimStaffMember {
  id: string;
  name: string;
  username: string;
  password: string;
  roles: StaffRoleKey[];
  active: boolean;
}

export type SimItemStation = 'bar' | 'cozinha';

export interface SimMenuItem {
  id: string;
  name: string;
  category: 'Drinks' | 'Petiscos' | 'Avulsos';
  station: SimItemStation;
  price: number;
  cost: number;
  stockQty: number;
  unit: string;
  inStock: boolean;
}

export interface SimOrder {
  id: string;
  tableId: string;
  tableLabel: string;
  clientName: string;
  waiterName: string;
  menuItemId: string;
  itemName: string;
  station: SimItemStation;
  qty: number;
  unitPrice: number;
  unitCost: number;
  note?: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  paid: boolean;
  createdAt: string;
}

export interface SimTableCall {
  id: string;
  tableId: string;
  tableLabel: string;
  clientName: string;
  kind: 'waiter' | 'bill';
  note?: string;
  createdAt: string;
}

export interface SimSale {
  id: string;
  tableLabel: string;
  subtotal: number;
  couvert: number;
  serviceFee: number;
  discount: number;
  total: number;
  cmv: number;
  waiterName: string;
  service100ToWaiter: boolean;
  paymentMethod: string;
  approvedBy?: string;
  paidAt: string;
}

export interface SimAuditEntry {
  id: string;
  action: string;
  detail: string;
  actor: string;
  at: string;
}

export interface SimStoreConfig {
  storeName: string;
  handle: string;
  kind: 'bar' | 'pub' | 'balada' | 'restaurante';
  accent: string;
  managerPin: string;
  staffLoginEnabled: boolean;
  couvertEnabled: boolean;
  couvertPrice: number;
  couvertLabel: string;
  couvertMandatory: boolean;
  couvertPerPerson: boolean;
  waiterDefaultPct: number;
  waiter100ToWaiter: boolean;
  seedInitialOrders: boolean;
  tables: SimTableConfig[];
  staff: SimStaffMember[];
  menuItems: SimMenuItem[];
}

const SAMPLE_GUEST_NAMES = [
  'Lucas',
  'Marina',
  'Rafael',
  'Camila',
  'Bruno',
  'Carla',
  'Diego',
  'Juliana',
  'Thiago',
  'Beatriz',
  'Felipe',
  'Larissa',
  'Gustavo',
  'Amanda',
  'Pedro',
  'Fernanda',
  'Matheus',
  'Patrícia',
  'Vitor',
  'Letícia',
];

export function buildSimTables(count: number, guestsPerTable: number): SimTableConfig[] {
  const safeTables = Math.max(1, Math.min(30, Math.round(count) || 1));
  const safeGuests = Math.max(1, Math.min(12, Math.round(guestsPerTable) || 1));
  const out: SimTableConfig[] = [];
  let cursor = 0;
  for (let i = 1; i <= safeTables; i += 1) {
    const guests: string[] = [];
    for (let g = 0; g < safeGuests; g += 1) {
      const base = SAMPLE_GUEST_NAMES[cursor % SAMPLE_GUEST_NAMES.length];
      cursor += 1;
      guests.push(guests.includes(base) ? `${base} ${g + 1}` : base);
    }
    out.push({
      id: `tbl_${i}`,
      label: `Mesa ${String(i).padStart(2, '0')}`,
      guests,
    });
  }
  return out;
}

export function createDefaultSimConfig(preset: 'padrao' | 'cheio' | 'enxuto' = 'padrao'): SimStoreConfig {
  const tableCount = preset === 'cheio' ? 8 : preset === 'enxuto' ? 3 : 5;
  const guestsPerTable = preset === 'cheio' ? 3 : 2;

  return {
    storeName:
      preset === 'cheio'
        ? 'Boteco Prime Sunset (Demo)'
        : preset === 'enxuto'
          ? 'Bar Express Demo'
          : 'Bar Horizonte Demo',
    handle: preset === 'cheio' ? 'botecoprime' : preset === 'enxuto' ? 'barexpress' : 'barhorizonte',
    kind: preset === 'cheio' ? 'pub' : 'bar',
    accent: '#e5a93c',
    managerPin: '1234',
    staffLoginEnabled: true,
    couvertEnabled: true,
    couvertPrice: 12,
    couvertLabel: 'Couvert Artístico (Show ao Vivo)',
    couvertMandatory: false,
    couvertPerPerson: true,
    waiterDefaultPct: 10,
    waiter100ToWaiter: true,
    seedInitialOrders: true,
    tables: buildSimTables(tableCount, guestsPerTable),
    staff: [
      {
        id: 'sf_1',
        name: 'Lucas Mendes',
        username: 'lucas',
        password: '123',
        roles: ['garcom', 'barman'],
        active: true,
      },
      {
        id: 'sf_2',
        name: 'Carla Souza',
        username: 'carla',
        password: '123',
        roles: ['caixa', 'garcom'],
        active: true,
      },
      {
        id: 'sf_3',
        name: 'Diego Lima',
        username: 'diego',
        password: '123',
        roles: ['barman'],
        active: true,
      },
      {
        id: 'sf_4',
        name: 'Fernanda Alves',
        username: 'fernanda',
        password: '123',
        roles: ['cozinha'],
        active: true,
      },
      {
        id: 'sf_5',
        name: 'Mariana Costa',
        username: 'mariana',
        password: '123',
        roles: ['gerente', 'caixa', 'estoque'],
        active: true,
      },
    ],
    menuItems: [
      {
        id: 'mi_1',
        name: 'Gin Tônica Clássico',
        category: 'Drinks',
        station: 'bar',
        price: 32,
        cost: 8.5,
        stockQty: 18,
        unit: 'un',
        inStock: true,
      },
      {
        id: 'mi_2',
        name: 'Caipirinha de Limão',
        category: 'Drinks',
        station: 'bar',
        price: 24,
        cost: 5.2,
        stockQty: 25,
        unit: 'un',
        inStock: true,
      },
      {
        id: 'mi_3',
        name: 'Moscow Mule',
        category: 'Drinks',
        station: 'bar',
        price: 36,
        cost: 10.4,
        stockQty: 14,
        unit: 'un',
        inStock: true,
      },
      {
        id: 'mi_4',
        name: 'Heineken Long Neck',
        category: 'Avulsos',
        station: 'bar',
        price: 16,
        cost: 6.8,
        stockQty: 48,
        unit: 'un',
        inStock: true,
      },
      {
        id: 'mi_5',
        name: 'Água com Gás',
        category: 'Avulsos',
        station: 'bar',
        price: 8,
        cost: 2.1,
        stockQty: 30,
        unit: 'un',
        inStock: true,
      },
      {
        id: 'mi_6',
        name: 'Batata Rústica c/ Cheddar e Bacon',
        category: 'Petiscos',
        station: 'cozinha',
        price: 38,
        cost: 11.5,
        stockQty: 15,
        unit: 'porção',
        inStock: true,
      },
      {
        id: 'mi_7',
        name: 'Isca de Tilápia Crocante',
        category: 'Petiscos',
        station: 'cozinha',
        price: 49,
        cost: 17.0,
        stockQty: 12,
        unit: 'porção',
        inStock: true,
      },
      {
        id: 'mi_8',
        name: 'Mini Hambúrguer Artesanal (4 un)',
        category: 'Petiscos',
        station: 'cozinha',
        price: 54,
        cost: 18.5,
        stockQty: 10,
        unit: 'porção',
        inStock: true,
      },
    ],
  };
}

export function buildInitialSimOrders(cfg: SimStoreConfig): SimOrder[] {
  if (!cfg.seedInitialOrders || cfg.tables.length === 0 || cfg.menuItems.length === 0) {
    return [];
  }
  const available = cfg.menuItems.filter((m) => m.inStock);
  if (available.length === 0) return [];
  const barItems = available.filter((m) => m.station === 'bar');
  const kitchenItems = available.filter((m) => m.station === 'cozinha');
  const waiter = cfg.staff.find((s) => s.active && s.roles.includes('garcom'))?.name || 'Lucas Mendes';

  const now = Date.now();
  const out: SimOrder[] = [];
  const t1 = cfg.tables[0];
  const t2 = cfg.tables[1];

  if (t1) {
    const g1 = t1.guests[0] || 'Cliente 1';
    const g2 = t1.guests[1] || g1;
    const drink1 = barItems[0] || available[0];
    const food1 = kitchenItems[0] || available[available.length - 1];
    out.push({
      id: `so_${now}_1`,
      tableId: t1.id,
      tableLabel: t1.label,
      clientName: g1,
      waiterName: waiter,
      menuItemId: drink1.id,
      itemName: drink1.name,
      station: drink1.station,
      qty: 2,
      unitPrice: drink1.price,
      unitCost: drink1.cost,
      status: 'delivered',
      paid: false,
      createdAt: new Date(now - 14 * 60000).toISOString(),
    });
    if (food1 && food1.id !== drink1.id) {
      out.push({
        id: `so_${now}_2`,
        tableId: t1.id,
        tableLabel: t1.label,
        clientName: g2,
        waiterName: waiter,
        menuItemId: food1.id,
        itemName: food1.name,
        station: food1.station,
        qty: 1,
        unitPrice: food1.price,
        unitCost: food1.cost,
        note: 'Bem crocante',
        status: 'pending',
        paid: false,
        createdAt: new Date(now - 4 * 60000).toISOString(),
      });
    }
  }

  if (t2) {
    const g1 = t2.guests[0] || 'Cliente 1';
    const drink2 = barItems[1] || barItems[0] || available[0];
    out.push({
      id: `so_${now}_3`,
      tableId: t2.id,
      tableLabel: t2.label,
      clientName: g1,
      waiterName: waiter,
      menuItemId: drink2.id,
      itemName: drink2.name,
      station: drink2.station,
      qty: 1,
      unitPrice: drink2.price,
      unitCost: drink2.cost,
      status: 'ready',
      paid: false,
      createdAt: new Date(now - 7 * 60000).toISOString(),
    });
  }

  return out;
}
