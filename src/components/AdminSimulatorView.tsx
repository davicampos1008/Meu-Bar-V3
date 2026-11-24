import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CAT,
  getDefaultCostBasisForUnit,
  getDefaultUnitForIngredient,
  STARTER_KITS,
} from '../lib/catalog';
import type { DisplayMode } from '../lib/displaySync';
import { getBarOpsData } from '../lib/opsUtils';
import {
  activateSimDb,
  deactivateSimDb,
  getSimSnapshot,
  SIM_BAR_ID,
  SIM_OWNER_ID,
  subscribeSimDb,
  type SimSnapshot,
} from '../lib/simDb';
import {
  hashStoreSecret,
  normalizeStaffUsername,
  STAFF_ROLE_BY_KEY,
  STAFF_ROLES,
} from '../lib/staffAuth';
import { realSb, sb } from '../lib/supabase';
import {
  getRecipeItemType,
  getUnpricedAvailableDrinks,
  makeDrink,
  money,
  norm,
  normalizeRecipe,
  today,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  BarMember,
  CashRegisterShift,
  Order,
  Recipe,
  StaffAccount,
  StaffRoleKey,
  TableCallAlert,
  TableTab,
} from '../types/meubar';
import {
  MoreView,
  PricesView,
  QueueView,
  RecipesView,
  StockView,
} from './BarViews';
import { TeamSection } from './CareersViews';
import { CashierProView } from './CashierProView';
import { CatalogItemsManager } from './CatalogItemsManager';
import { DeliveryProView } from './DeliveryProView';
import { FloatingBackButton } from './FloatingBackButton';
import { ManagementProView, type ManagementSubTab } from './ManagementProView';
import { MenuPage } from './MenuPage';
import { StoreStudioView } from './MenuStudio';
import { CreateDrinkModal, MakeDrinkModal, QrModal, ShakersModal } from './Modals';
import { OwnerSummaryView } from './OwnerSummaryView';
import { SecondScreenDisplay } from './SecondScreenDisplay';
import { StaffAccountsManagerCard } from './StaffLoginGate';
import {
  BarmanStationView,
  KitchenStationView,
  WaiterStationView,
} from './StationViews';

/* ============================================================================
 * TIPOS DO CONFIGURADOR (ESTÁGIO 1) E MODO IMERSÃO REAL (ESTÁGIO 2)
 * ============================================================================ */
type SimPerspective =
  | 'cliente'
  | 'barman'
  | 'cozinha'
  | 'garcom'
  | 'caixa'
  | 'gerente'
  | 'dono'
  | 'funcionario';

type StaffScreenId = 'barman' | 'cozinha' | 'garcom' | 'caixa' | 'gerente' | 'estoque';
type StockPresetId = 'completo' | 'gin-bar' | 'economico' | 'vazio';

interface SimTableSetup {
  id: string;
  label: string;
  guests: string[];
}

interface SimStaffSetup {
  id: string;
  name: string;
  username: string;
  password: string;
  roles: StaffRoleKey[];
}

interface SimExtraItemSetup {
  id: string;
  name: string;
  category: string;
  itemType: 'petisco' | 'avulso';
  price: number;
  cost: number;
}

interface SimConfig {
  storeName: string;
  handle: string;
  stockPreset: StockPresetId;
  couvertEnabled: boolean;
  couvertLabel: string;
  couvertPrice: number;
  couvertMandatory: boolean;
  couvertPerPerson: boolean;
  waiterTipPct: number;
  waiter100ToWaiter: boolean;
  managerPin: string;
  tables: SimTableSetup[];
  staff: SimStaffSetup[];
  extraItems: SimExtraItemSetup[];
}

const PERSPECTIVE_LIST: {
  id: Exclude<SimPerspective, 'funcionario'>;
  label: string;
  icon: string;
}[] = [
  { id: 'cliente', label: 'Cliente (Cardápio QR)', icon: '📱' },
  { id: 'garcom', label: 'Garçom', icon: '🧑‍🍳' },
  { id: 'barman', label: 'Barman', icon: '🍸' },
  { id: 'cozinha', label: 'Cozinha', icon: '🍳' },
  { id: 'caixa', label: 'Caixa', icon: '💵' },
  { id: 'gerente', label: 'Gerente', icon: '🛡️' },
  { id: 'dono', label: 'Dono (Painel Completo)', icon: '👑' },
];

const STOCK_PRESET_OPTIONS: {
  id: StockPresetId;
  label: string;
  desc: string;
}[] = [
  {
    id: 'completo',
    label: '🍸 Bar Completo (25+ drinks prontos)',
    desc: 'Gin, Vodka, Cachaça, Rum, Aperol, Campari, Limão, Tônica, Hortelã e mais.',
  },
  {
    id: 'gin-bar',
    label: '🍋 Kit Gin & Clássicos',
    desc: 'Base enxuta para Gin Tônica, Moscow Mule, Caipirinhas e tropicais.',
  },
  {
    id: 'economico',
    label: '⚡ Kit Inicial Econômico',
    desc: 'Cachaça, Vodka, Limão, Açúcar, Leite condensado, Frutas e Refrigerante.',
  },
  {
    id: 'vazio',
    label: '📦 Estoque Zerado (começar do zero)',
    desc: 'Para demonstrar o cadastro manual de itens ou o Kit Inicial dentro do Estoque.',
  },
];

const FALLBACK_RECIPES: Recipe[] = [
  {
    id: 'sim-rec-gt',
    name: 'Gin Tônica Clássico',
    category: 'Clássicos',
    item_type: 'drink',
    ingredients: [
      { n: 'Gin', q: '50 ml' },
      { n: 'Água tônica', q: '150 ml' },
      { n: 'Limão', q: '2 rodelas' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Encha a taça com bastante gelo, adicione o gin, complete com água tônica e finalize com rodelas de limão.',
    glass: 'Taça Gin',
    technique: 'Montado',
  },
  {
    id: 'sim-rec-caipirinha',
    name: 'Caipirinha Clássica',
    category: 'Brasileiríssimos',
    item_type: 'drink',
    ingredients: [
      { n: 'Cachaça', q: '50 ml (Prata)' },
      { n: 'Limão', q: '1 unidade (Taiti)' },
      { n: 'Açúcar', q: '2 colheres' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Macere o limão com o açúcar, adicione gelo e cachaça, mexa bem e sirva.',
    glass: 'Copo baixo',
    technique: 'Macerado',
  },
  {
    id: 'sim-rec-caipiroska',
    name: 'Caipiroska de Morango',
    category: 'Doces & Frutados',
    item_type: 'drink',
    ingredients: [
      { n: 'Vodka', q: '50 ml' },
      { n: 'Morango', q: '5 unidades' },
      { n: 'Açúcar', q: '2 colheres' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Macere os morangos com açúcar, adicione gelo e vodka e bata na coqueteleira.',
    glass: 'Copo baixo',
    technique: 'Batido',
  },
  {
    id: 'sim-rec-mojito',
    name: 'Mojito Clássico',
    category: 'Refrescantes',
    item_type: 'drink',
    ingredients: [
      { n: 'Rum', q: '50 ml (Branco)' },
      { n: 'Limão', q: '30 ml' },
      { n: 'Hortelã', q: '8 folhas' },
      { n: 'Açúcar', q: '2 colheres' },
      { n: 'Água com gás', q: '100 ml' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Macere levemente a hortelã com açúcar e suco de limão, junte gelo, rum e complete com água com gás.',
    glass: 'Copo longo',
    technique: 'Montado',
  },
  {
    id: 'sim-rec-aperol',
    name: 'Aperol Spritz',
    category: 'Aperitivos',
    item_type: 'drink',
    ingredients: [
      { n: 'Aperol', q: '60 ml' },
      { n: 'Prosecco', q: '90 ml' },
      { n: 'Água com gás', q: '30 ml' },
      { n: 'Laranja', q: '1 rodela' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Em taça cheia de gelo, coloque Prosecco, Aperol e um splash de água com gás. Decore com laranja.',
    glass: 'Taça vinho',
    technique: 'Montado',
  },
  {
    id: 'sim-rec-negroni',
    name: 'Negroni',
    category: 'Clássicos',
    item_type: 'drink',
    ingredients: [
      { n: 'Gin', q: '30 ml' },
      { n: 'Campari', q: '30 ml' },
      { n: 'Vermute', q: '30 ml (Tinto)' },
      { n: 'Laranja', q: '1 casca' },
      { n: 'Gelo', q: '1 cubo grande' },
    ],
    steps: 'Mexa todos os ingredientes com gelo em mixing glass e coe para copo baixo com gelo grande.',
    glass: 'Old Fashioned',
    technique: 'Mexido',
  },
  {
    id: 'sim-rec-cuba',
    name: 'Cuba Libre',
    category: 'Clássicos',
    item_type: 'drink',
    ingredients: [
      { n: 'Rum', q: '50 ml (Branco)' },
      { n: 'Coca-Cola', q: '150 ml' },
      { n: 'Limão', q: '15 ml' },
      { n: 'Gelo', q: 'à vontade' },
    ],
    steps: 'Monte em copo alto com gelo, suco de limão, rum e complete com Coca-Cola.',
    glass: 'Copo longo',
    technique: 'Montado',
  },
];

const DEFAULT_CONFIG: SimConfig = {
  storeName: 'Bar Horizonte Demo',
  handle: 'bar_horizonte_demo',
  stockPreset: 'completo',
  couvertEnabled: true,
  couvertLabel: 'Couvert Artístico (Show ao Vivo)',
  couvertPrice: 12,
  couvertMandatory: false,
  couvertPerPerson: true,
  waiterTipPct: 10,
  waiter100ToWaiter: true,
  managerPin: '1234',
  tables: [
    { id: 't1', label: 'Mesa 01', guests: ['Lucas', 'Mariana'] },
    { id: 't2', label: 'Mesa 02', guests: ['Rafael', 'Bianca', 'Pedro'] },
    { id: 't3', label: 'Mesa 03', guests: ['Carla'] },
    { id: 't4', label: 'Mesa 04', guests: ['Bruno', 'Fernanda'] },
  ],
  staff: [
    {
      id: 'st1',
      name: 'Carlos Mendes',
      username: 'carlos',
      password: '123',
      roles: ['garcom', 'barman'],
    },
    {
      id: 'st2',
      name: 'Juliana Costa',
      username: 'juliana',
      password: '123',
      roles: ['caixa', 'gerente'],
    },
    {
      id: 'st3',
      name: 'Thiago Silva',
      username: 'thiago',
      password: '123',
      roles: ['cozinha'],
    },
    {
      id: 'st4',
      name: 'Amanda Rocha',
      username: 'amanda',
      password: '123',
      roles: ['garcom', 'caixa'],
    },
  ],
  extraItems: [
    {
      id: 'ext1',
      name: 'Porção de Batata Frita com Cheddar',
      category: 'Porções',
      itemType: 'petisco',
      price: 36,
      cost: 11,
    },
    {
      id: 'ext2',
      name: 'Isca de Frango Crocante',
      category: 'Porções',
      itemType: 'petisco',
      price: 44,
      cost: 15,
    },
    {
      id: 'ext3',
      name: 'Heineken Long Neck 330ml',
      category: 'Cervejas',
      itemType: 'avulso',
      price: 16,
      cost: 6.5,
    },
    {
      id: 'ext4',
      name: 'Água Mineral sem Gás',
      category: 'Sem Álcool',
      itemType: 'avulso',
      price: 7,
      cost: 1.8,
    },
  ],
};

function findIngredientCategory(ingName: string): string {
  const n = norm(ingName);
  for (const [catName, list] of Object.entries(CAT)) {
    if (list.some((x) => norm(x) === n)) return catName;
  }
  return 'Outros';
}

function getStockIngredientsForPreset(preset: StockPresetId): string[] {
  if (preset === 'vazio') return [];
  const eco = STARTER_KITS.find((k) => k.id === 'kit-economico')?.ingredients || [];
  const gin = STARTER_KITS.find((k) => k.id === 'kit-gin-bar')?.ingredients || [];
  if (preset === 'economico') return eco;
  if (preset === 'gin-bar') return Array.from(new Set([...gin, 'Gelo', 'Açúcar']));
  // completo: une os kits principais + clássicos de bar
  const extra = [
    'Gin',
    'Vodka',
    'Cachaça',
    'Rum',
    'Tequila',
    'Whisky',
    'Aperol',
    'Campari',
    'Vermute',
    'Prosecco',
    'Cointreau',
    'Água tônica',
    'Água com gás',
    'Coca-Cola',
    'Refrigerante de limão',
    'Suco de laranja',
    'Suco de cranberry',
    'Limão',
    'Laranja',
    'Morango',
    'Maracujá',
    'Abacaxi',
    'Hortelã',
    'Gengibre',
    'Açúcar',
    'Xarope de açúcar',
    'Xarope de gengibre',
    'Leite condensado',
    'Gelo',
  ];
  return Array.from(new Set([...eco, ...gin, ...extra]));
}

function getStaffScreens(
  roles: StaffRoleKey[]
): { id: StaffScreenId; label: string; icon: string }[] {
  const out: { id: StaffScreenId; label: string; icon: string }[] = [];
  const map: Record<string, { id: StaffScreenId; label: string; icon: string }> = {
    garcom: { id: 'garcom', label: 'Garçom', icon: '🧑‍🍳' },
    barman: { id: 'barman', label: 'Barman', icon: '🍸' },
    cozinha: { id: 'cozinha', label: 'Cozinha', icon: '🍳' },
    caixa: { id: 'caixa', label: 'Caixa', icon: '💵' },
    estoque: { id: 'estoque', label: 'Estoque', icon: '🍾' },
    gerente: { id: 'gerente', label: 'Gerente', icon: '🛡️' },
  };
  roles.forEach((r) => {
    const m = map[r];
    if (m && !out.some((x) => x.id === m.id)) out.push(m);
  });
  return out;
}

export const AdminSimulatorView: React.FC<{
  onToast: (msg: string) => void;
}> = ({ onToast }) => {
  const [phase, setPhase] = useState<'setup' | 'running'>('setup');
  const [starting, setStarting] = useState(false);

  // Configuração da loja fictícia (Estágio 1)
  const [cfg, setCfg] = useState<SimConfig>(() => DEFAULT_CONFIG);
  const [setupModal, setSetupModal] = useState<
    null | 'store' | 'tables' | 'staff' | 'billing' | 'menu'
  >(null);

  // Inputs do Setup Wizard
  const [newGuestByTable, setNewGuestByTable] = useState<Record<string, string>>({});
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffRoles, setNewStaffRoles] = useState<StaffRoleKey[]>(['garcom']);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'petisco' | 'avulso'>('petisco');
  const [newItemPrice, setNewItemPrice] = useState('32');

  // Snapshot ao vivo do banco em memória (Estágio 2)
  const [snap, setSnap] = useState<SimSnapshot>(() => getSimSnapshot());
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());

  // Navegação isolada por perspectiva (Estágio 2)
  const [perspective, setPerspective] = useState<SimPerspective>('dono');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffActiveScreen, setStaffActiveScreen] = useState<StaffScreenId>('garcom');
  const [clientMesa, setClientMesa] = useState<string>('Mesa 01');
  const [cornerMenuOpen, setCornerMenuOpen] = useState(false);
  const [menuShowScreens, setMenuShowScreens] = useState(true);
  const [showStaffPickerModal, setShowStaffPickerModal] = useState(false);

  // Sub-navegação interna de cada perfil (100% dentro do perfil escolhido)
  const [ownerTab, setOwnerTab] = useState<'summary' | 'queue' | 'recipes' | 'stock' | 'more'>('summary');
  const [ownerQueueStation, setOwnerQueueStation] = useState<'all' | 'bar' | 'cozinha' | 'garcom'>('all');
  const [ownerSubView, setOwnerSubView] = useState<
    null | 'cashier' | 'prices' | 'management' | 'team' | 'catalog' | 'delivery' | 'studio'
  >(null);
  const [ownerMgmtTab, setOwnerMgmtTab] = useState<ManagementSubTab>('dashboard');

  const [managerTab, setManagerTab] = useState<'team' | 'stock' | 'management'>('team');
  const [managerSubView, setManagerSubView] = useState<null | 'prices'>(null);
  const [managerMgmtTab, setManagerMgmtTab] = useState<ManagementSubTab>('dashboard');

  const [barmanSubView, setBarmanSubView] = useState<'station' | 'stock'>('station');
  const [kitchenSubView, setKitchenSubView] = useState<'station' | 'catalog'>('station');
  const [cashierDisplayMode, setCashierDisplayMode] = useState<DisplayMode | null>(null);

  // Modais reais compartilhados dentro da simulação
  const [selectedRecipeModal, setSelectedRecipeModal] = useState<Recipe | null>(null);
  const [createDrinkModal, setCreateDrinkModal] = useState<null | { editExisting: boolean }>(null);
  const [shakersModalOpen, setShakersModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Assina mudanças do banco em memória enquanto a simulação roda
  useEffect(() => {
    if (phase !== 'running') return;
    setSnap(getSimSnapshot());
    const unsub = subscribeSimDb(() => {
      setSnap(getSimSnapshot());
    });
    return unsub;
  }, [phase]);

  // Limpa 100% dos dados simulados se o componente desmontar
  useEffect(() => {
    return () => {
      deactivateSimDb();
    };
  }, []);

  // Trava rolagem do body quando em tela cheia (Estágio 2)
  useEffect(() => {
    if (phase !== 'running') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [phase]);

  // Fecha modais do setup com ESC
  useEffect(() => {
    if (!setupModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSetupModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setupModal]);

  const resetInternalSubViews = useCallback(() => {
    setOwnerTab('summary');
    setOwnerSubView(null);
    setOwnerQueueStation('all');
    setOwnerMgmtTab('dashboard');
    setManagerTab('team');
    setManagerSubView(null);
    setManagerMgmtTab('dashboard');
    setBarmanSubView('station');
    setKitchenSubView('station');
    setCashierDisplayMode(null);
    setSelectedRecipeModal(null);
    setCreateDrinkModal(null);
    setShakersModalOpen(false);
    setQrModalOpen(false);
  }, []);

  const exitSimulation = useCallback(() => {
    setCornerMenuOpen(false);
    setShowStaffPickerModal(false);
    resetInternalSubViews();
    deactivateSimDb();
    setPhase('setup');
    onToast('Simulação encerrada. Todos os dados temporários foram apagados.');
  }, [onToast, resetInternalSubViews]);

  // ============================================================================
  // AÇÕES DO CONFIGURADOR (ESTÁGIO 1)
  // ============================================================================
  const handleSetTableCount = (count: number) => {
    const safe = Math.max(1, Math.min(20, count));
    setCfg((prev) => {
      const next = [...prev.tables];
      while (next.length < safe) {
        const idx = next.length + 1;
        next.push({
          id: `t_${Date.now()}_${idx}`,
          label: `Mesa ${String(idx).padStart(2, '0')}`,
          guests: [`Cliente ${idx}`],
        });
      }
      return { ...prev, tables: next.slice(0, safe) };
    });
  };

  const handleAddGuestToTable = (tableId: string) => {
    const g = (newGuestByTable[tableId] || '').trim();
    if (!g) return;
    setCfg((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId ? { ...t, guests: [...t.guests, g] } : t
      ),
    }));
    setNewGuestByTable((prev) => ({ ...prev, [tableId]: '' }));
  };

  const handleRemoveGuest = (tableId: string, guestIdx: number) => {
    setCfg((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === tableId
          ? { ...t, guests: t.guests.filter((_, i) => i !== guestIdx) }
          : t
      ),
    }));
  };

  const handleAddStaff = () => {
    const name = newStaffName.trim();
    if (!name) {
      onToast('Digite o nome do funcionário.');
      return;
    }
    const roles = newStaffRoles.length ? newStaffRoles : (['garcom'] as StaffRoleKey[]);
    const username = normalizeStaffUsername(newStaffUser || name);
    setCfg((prev) => ({
      ...prev,
      staff: [
        ...prev.staff,
        {
          id: `st_${Date.now()}`,
          name,
          username: username || `colab${prev.staff.length + 1}`,
          password: '123',
          roles,
        },
      ],
    }));
    setNewStaffName('');
    setNewStaffUser('');
    setNewStaffRoles(['garcom']);
    onToast(`Funcionário ${name} adicionado.`);
  };

  const handleToggleSetupStaffRole = (staffId: string, role: StaffRoleKey) => {
    setCfg((prev) => ({
      ...prev,
      staff: prev.staff.map((st) => {
        if (st.id !== staffId) return st;
        const has = st.roles.includes(role);
        const nextRoles = has ? st.roles.filter((r) => r !== role) : [...st.roles, role];
        return { ...st, roles: nextRoles.length ? nextRoles : [role] };
      }),
    }));
  };

  const handleRemoveSetupStaff = (staffId: string) => {
    setCfg((prev) => ({
      ...prev,
      staff: prev.staff.filter((s) => s.id !== staffId),
    }));
  };

  const handleAddExtraItem = () => {
    const name = newItemName.trim();
    const price = Number(newItemPrice.replace(',', '.')) || 0;
    if (!name || price <= 0) {
      onToast('Informe nome e preço válido.');
      return;
    }
    setCfg((prev) => ({
      ...prev,
      extraItems: [
        ...prev.extraItems,
        {
          id: `ext_${Date.now()}`,
          name,
          category: newItemType === 'petisco' ? 'Porções' : 'Bebidas',
          itemType: newItemType,
          price,
          cost: Math.round(price * 0.35 * 100) / 100,
        },
      ],
    }));
    setNewItemName('');
    onToast(`${name} adicionado à simulação.`);
  };

  const handleRemoveExtraItem = (id: string) => {
    setCfg((prev) => ({
      ...prev,
      extraItems: prev.extraItems.filter((x) => x.id !== id),
    }));
  };

  // ============================================================================
  // INICIAR SIMULAÇÃO REAL EM MEMÓRIA (ZERO GRAVAÇÃO NO BANCO)
  // ============================================================================
  const startSimulation = async () => {
    setStarting(true);
    try {
      // 1) Lê catálogo real de receitas (somente leitura!) antes de ativar sandbox
      let globalRecipes: Recipe[] = [];
      try {
        const res = await realSb.from('recipes').select('*').order('name');
        if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
          globalRecipes = (res.data as Recipe[]).filter((r) => r.is_public !== false);
        }
      } catch {
        // usa fallback se offline
      }
      if (globalRecipes.length === 0) {
        globalRecipes = FALLBACK_RECIPES.map((r) => ({ ...r }));
      }
      globalRecipes = globalRecipes.map((r) => normalizeRecipe(r));

      // 2) Constrói petiscos e avulsos da loja simulada
      const customRecipes: Recipe[] = cfg.extraItems.map((it) => ({
        id: `sim_rec_${it.id}`,
        owner: SIM_OWNER_ID,
        name: it.name,
        category: it.category,
        item_type: it.itemType,
        ingredients: [],
        base_cost: it.cost,
        price: it.price,
        description:
          it.itemType === 'petisco'
            ? 'Preparado na hora pela cozinha da casa.'
            : 'Servido bem gelado.',
      }));
      const allRecipes = [...globalRecipes, ...customRecipes];

      // 3) Estoque inicial real (BarItem[]) conforme preset escolhido
      const presetIngs = getStockIngredientsForPreset(cfg.stockPreset);
      const seededItems: BarItem[] = presetIngs.map((ingName, idx) => {
        const def = getDefaultUnitForIngredient(ingName);
        const unit = def.unit;
        const costBasis = getDefaultCostBasisForUnit(unit);
        const isBottle = unit === 'garrafa';
        const isKg = unit === 'kg' || unit === 'g';
        return {
          id: `sim_item_${idx + 1}`,
          bar_id: SIM_BAR_ID,
          category: findIngredientCategory(ingName),
          name: ingName,
          in_stock: true,
          unit,
          cost_basis: costBasis,
          size_ml: def.defaultSize ?? (isBottle ? 750 : 1000),
          qty: isBottle ? 4 : isKg ? 3 : 10,
          min_qty: isBottle ? 1 : 2,
          unit_cost: isBottle ? 68 : isKg ? 18 : 9,
          created_at: new Date().toISOString(),
        };
      });

      // 4) Preços iniciais para todos os drinks disponíveis + petiscos/avulsos
      const seededPrices: Record<string, number> = {};
      const makeableDrinks = allRecipes.filter(
        (r) => getRecipeItemType(r) === 'drink' && makeDrink(r, seededItems)
      );
      makeableDrinks.forEach((r, idx) => {
        seededPrices[r.id] = 24 + (idx % 5) * 3; // R$ 24 a R$ 36
      });
      cfg.extraItems.forEach((it) => {
        seededPrices[`sim_rec_${it.id}`] = it.price;
      });

      // 5) Hash real de PIN do gerente e contas dos funcionários
      const pinHash = await hashStoreSecret(cfg.managerPin || '1234');
      const staffAccounts: StaffAccount[] = [];
      const barMembers: BarMember[] = [
        {
          id: 'sim_mem_owner',
          bar_id: SIM_BAR_ID,
          user_id: SIM_OWNER_ID,
          role: 'owner',
          name: 'Dono (Você)',
        },
      ];
      for (const st of cfg.staff) {
        const pwHash = await hashStoreSecret(st.password || '123');
        staffAccounts.push({
          id: st.id,
          name: st.name,
          username: normalizeStaffUsername(st.username || st.name),
          password_hash: pwHash.hash,
          password_salt: pwHash.salt,
          roles: st.roles,
          active: true,
          created_at: new Date().toISOString(),
        });
        barMembers.push({
          id: `sim_mem_${st.id}`,
          bar_id: SIM_BAR_ID,
          user_id: `sim_uid_${st.id}`,
          role: st.roles[0] || 'garcom',
          name: st.name,
        });
      }

      // 6) Turno de caixa aberto para o Caixa funcionar imediatamente
      const openShift: CashRegisterShift = {
        id: 'sim_shift_01',
        opened_by: staffAccounts.find((s) => s.roles.includes('caixa'))?.name || 'Caixa Demo',
        opened_at: new Date(Date.now() - 45 * 60000).toISOString(),
        opening_float: 200,
        status: 'open',
        movements: [],
        sales: [],
      };

      const simBar: Bar = {
        id: SIM_BAR_ID,
        owner: SIM_OWNER_ID,
        name: cfg.storeName.trim() || 'Bar Horizonte Demo',
        handle: cfg.handle.trim() || 'bar_horizonte_demo',
        kind: 'bar',
        plan_tier: 'pro',
        accepting_orders: true,
        shakers: [750, 500],
        table_names: cfg.tables.map((t) => t.label),
        slogan: 'Simulação interativa em tempo real',
        created_at: new Date().toISOString(),
        ops_data: {
          couvert_enabled: cfg.couvertEnabled,
          couvert_label: cfg.couvertLabel,
          couvert_price: cfg.couvertPrice,
          couvert_mode: cfg.couvertMandatory ? 'mandatory' : 'optional',
          couvert_per_person: cfg.couvertPerPerson,
          default_service_fee_pct: cfg.waiterTipPct,
          service_fee_allow_custom: true,
          service_fee_100_to_waiter: cfg.waiter100ToWaiter,
          manager_pin_hash: pinHash.hash,
          manager_pin_salt: pinHash.salt,
          staff_login_enabled: true,
          staff_accounts: staffAccounts,
          cash_shifts: [openShift],
          audit_logs: [
            {
              id: 'sim_aud_1',
              action: 'Simulação iniciada',
              details: `${cfg.tables.length} mesa(s), ${cfg.staff.length} funcionário(s), ${seededItems.length} itens no estoque`,
              actor: 'Simulador',
              role: 'owner',
              at: new Date().toISOString(),
            },
          ],
        },
      };

      // 7) Comandas abertas por mesa (TableTab[])
      const nowIso = new Date().toISOString();
      const seededTabs: TableTab[] = cfg.tables.map((t, idx) => ({
        id: `sim_tab_${t.id}`,
        bar_id: SIM_BAR_ID,
        table_label: t.label,
        code: String(1000 + ((idx + 1) * 137) % 8999),
        opened_by: t.guests[0] || 'Cliente',
        members: t.guests.length ? [...t.guests] : ['Cliente'],
        status: 'open',
        created_at: nowIso,
      }));

      // 8) Pedidos iniciais reais (Bar + Cozinha + Pronto p/ Garçom)
      const seededOrders: Order[] = [];
      const firstDrink = makeableDrinks[0] || allRecipes[0];
      const secondDrink = makeableDrinks[1] || firstDrink;
      const firstPetisco = customRecipes.find((r) => getRecipeItemType(r) === 'petisco');

      const tab1 = seededTabs[0];
      const tab2 = seededTabs[1] || tab1;
      if (tab1 && firstDrink) {
        const p1 = seededPrices[firstDrink.id] || 28;
        seededOrders.push({
          id: 'sim_ord_1',
          bar_id: SIM_BAR_ID,
          recipe_id: firstDrink.id,
          recipe_name: firstDrink.name,
          client_name: tab1.members[0] || 'Lucas',
          customer_name: tab1.members[0] || 'Lucas',
          qty: 2,
          note: 'Bastante gelo',
          price: p1,
          unit_price: p1,
          table_label: tab1.table_label,
          table_tab_id: tab1.id,
          station: 'bar',
          status: 'pending',
          paid: false,
          created_at: new Date(Date.now() - 4 * 60000).toISOString(),
        });
      }
      if (tab1 && firstPetisco) {
        const pp = seededPrices[firstPetisco.id] || 36;
        seededOrders.push({
          id: 'sim_ord_2',
          bar_id: SIM_BAR_ID,
          recipe_id: firstPetisco.id,
          recipe_name: firstPetisco.name,
          client_name: tab1.members[1] || tab1.members[0] || 'Mariana',
          customer_name: tab1.members[1] || tab1.members[0] || 'Mariana',
          qty: 1,
          note: 'Bem crocante',
          price: pp,
          unit_price: pp,
          table_label: tab1.table_label,
          table_tab_id: tab1.id,
          station: 'cozinha',
          status: 'pending',
          paid: false,
          created_at: new Date(Date.now() - 6 * 60000).toISOString(),
        });
      }
      if (tab2 && secondDrink) {
        const p2 = seededPrices[secondDrink.id] || 26;
        seededOrders.push({
          id: 'sim_ord_3',
          bar_id: SIM_BAR_ID,
          recipe_id: secondDrink.id,
          recipe_name: secondDrink.name,
          client_name: tab2.members[0] || 'Rafael',
          customer_name: tab2.members[0] || 'Rafael',
          qty: 1,
          note: null,
          price: p2,
          unit_price: p2,
          table_label: tab2.table_label,
          table_tab_id: tab2.id,
          station: 'bar',
          status: 'ready',
          paid: false,
          created_at: new Date(Date.now() - 9 * 60000).toISOString(),
        });
      }

      // 9) Chamado inicial de garçom
      const seededCalls: TableCallAlert[] = tab2
        ? [
            {
              id: 'sim_call_1',
              bar_id: SIM_BAR_ID,
              table_label: tab2.table_label,
              client_name: tab2.members[0] || 'Rafael',
              kind: 'waiter',
              note: 'Guardanapos e mais gelo, por favor',
              status: 'open',
              created_at: new Date(Date.now() - 2 * 60000).toISOString(),
            },
          ]
        : [];

      // 10) Ativa sandbox em memória (ZERO escrita no banco real!)
      activateSimDb({
        bar: simBar,
        items: seededItems,
        recipes: allRecipes,
        prices: seededPrices,
        orders: seededOrders,
        tableTabs: seededTabs,
        tableCalls: seededCalls,
        members: barMembers,
      });

      // Pré-conecta sessão local da Mesa 01 para o Cardápio QR do Cliente abrir direto pronto para pedir
      if (tab1 && typeof window !== 'undefined') {
        const mesaKey = `table_tab_${SIM_BAR_ID}_${norm(tab1.table_label)}`;
        try {
          window.localStorage.setItem(
            mesaKey,
            JSON.stringify({
              tabId: tab1.id,
              tableLabel: tab1.table_label,
              code: tab1.code,
              name: tab1.members[0] || 'Lucas',
              openedBy: tab1.opened_by,
              members: tab1.members,
              d: today(),
            })
          );
          const initialMine = seededOrders
            .filter((o) => o.table_tab_id === tab1.id)
            .map((o) => ({
              id: o.id,
              recipe_id: o.recipe_id,
              name: o.recipe_name || 'Item',
              qty: o.qty,
              price: o.unit_price ?? o.price ?? 0,
              status: o.status,
              d: today(),
              tableTabId: tab1.id,
            }));
          window.localStorage.setItem('mine' + SIM_BAR_ID, JSON.stringify(initialMine));
        } catch {
          // ignore storage errors
        }
        setClientMesa(tab1.table_label);
      }

      setSettledIds(new Set());
      setSnap(getSimSnapshot());
      setSelectedStaffId(null);
      setPerspective('dono');
      resetInternalSubViews();
      setCornerMenuOpen(false);
      setPhase('running');
      onToast('Simulação real iniciada em memória! Nenhum dado será salvo no banco.');
    } finally {
      setStarting(false);
    }
  };

  // ============================================================================
  // HELPERS EM MEMÓRIA PARA OS COMPONENTES REAIS (ESTÁGIO 2)
  // ============================================================================
  const simBar = snap.bar;
  const simItems = snap.items;
  const simRecipes = snap.recipes;
  const simPrices = snap.prices;
  const simOrders = snap.orders;
  const simTableTabs = snap.tableTabs;
  const simTableCalls = snap.tableCalls;
  const simMembers = snap.members;

  const liveStaffAccounts = useMemo(() => {
    if (!simBar) return [];
    return getBarOpsData(simBar).staff_accounts || [];
  }, [simBar]);

  const activeStaffLive = useMemo(
    () => liveStaffAccounts.find((s) => s.id === selectedStaffId) || null,
    [liveStaffAccounts, selectedStaffId]
  );

  const activeStaffScreens = useMemo(
    () => (activeStaffLive ? getStaffScreens(activeStaffLive.roles) : []),
    [activeStaffLive]
  );

  const effectiveStaffScreen: StaffScreenId | null = useMemo(() => {
    if (!activeStaffScreens.length) return null;
    if (activeStaffScreens.some((s) => s.id === staffActiveScreen)) return staffActiveScreen;
    return activeStaffScreens[0].id;
  }, [activeStaffScreens, staffActiveScreen]);

  const refreshSnap = useCallback(async () => {
    setSnap(getSimSnapshot());
  }, []);

  const handleSetOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    await sb.from('orders').update({ status }).eq('id', orderId);
    setSnap(getSimSnapshot());
  }, []);

  const handleCancelOrder = useCallback(async (order: Order, reason: string) => {
    await sb.from('orders').delete().eq('id', order.id);
    setSnap(getSimSnapshot());
    onToast(`Pedido de ${order.recipe_name || 'item'} cancelado (${reason || 'sem motivo'}).`);
  }, [onToast]);

  const handleResolveCall = useCallback(async (callId: string) => {
    await sb.from('table_calls').delete().eq('id', callId);
    setSnap(getSimSnapshot());
    onToast('Chamado atendido.');
  }, [onToast]);

  const handleSelectClientMesa = useCallback(
    (mesaLabel: string) => {
      const tab = simTableTabs.find(
        (t) => t.status === 'open' && norm(t.table_label) === norm(mesaLabel)
      );
      if (tab && typeof window !== 'undefined') {
        const mesaKey = `table_tab_${SIM_BAR_ID}_${norm(tab.table_label)}`;
        try {
          window.localStorage.setItem(
            mesaKey,
            JSON.stringify({
              tabId: tab.id,
              tableLabel: tab.table_label,
              code: tab.code,
              name: tab.members[0] || tab.opened_by || 'Cliente',
              openedBy: tab.opened_by,
              members: tab.members,
              d: today(),
            })
          );
          const tabOrders = simOrders
            .filter((o) => !o.paid && o.table_tab_id === tab.id)
            .map((o) => ({
              id: o.id,
              recipe_id: o.recipe_id,
              name: o.recipe_name || 'Item',
              qty: o.qty,
              price: o.unit_price ?? o.price ?? 0,
              status: o.status,
              d: today(),
              tableTabId: tab.id,
            }));
          window.localStorage.setItem('mine' + SIM_BAR_ID, JSON.stringify(tabOrders));
        } catch {
          // ignore
        }
      }
      setClientMesa(mesaLabel);
      setCornerMenuOpen(false);
    },
    [simOrders, simTableTabs]
  );

  // ============================================================================
  // ESTÁGIO 1: CONFIGURADOR EM BLOCOS (MODAIS LIMPOS)
  // ============================================================================
  if (phase === 'setup' || !simBar) {
    const totalGuests = cfg.tables.reduce((acc, t) => acc + t.guests.length, 0);
    const presetMeta =
      STOCK_PRESET_OPTIONS.find((p) => p.id === cfg.stockPreset) || STOCK_PRESET_OPTIONS[0];

    return (
      <div className="space-y-4">
        {/* Cabeçalho */}
        <div className="panel !p-5 space-y-3 border-[var(--ac)]/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-[var(--ac)]">
                🧪 Simulador Real em Memória (Exclusivo ADM)
              </div>
              <h2 className="!m-0 text-2xl font-extrabold">{cfg.storeName}</h2>
              <p className="mu text-sm !mt-1 !mb-0">
                Roda <b>todas as telas reais do app</b> (Cardápio & Receitas, Estoque, QR do Cliente,
                Barman, Cozinha, Garçom, Caixa, Gerente e Dono) com dados fictícios —{' '}
                <b>nada é salvo no banco</b> e tudo é apagado ao sair.
              </p>
            </div>
          </div>
        </div>

        {/* 5 Blocos clicáveis para configurar a loja fictícia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setSetupModal('store')}
            className="text-left rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--ac)] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                🏪 Loja & Estoque Base
              </span>
              <span className="text-xs font-bold text-[var(--ac)]">Editar →</span>
            </div>
            <div className="text-lg font-extrabold truncate">{cfg.storeName}</div>
            <div className="text-sm text-[var(--mut)] truncate">{presetMeta.label}</div>
          </button>

          <button
            type="button"
            onClick={() => setSetupModal('tables')}
            className="text-left rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--ac)] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                🪑 Mesas & Clientes
              </span>
              <span className="text-xs font-bold text-[var(--ac)]">Editar →</span>
            </div>
            <div className="text-lg font-extrabold">
              {cfg.tables.length} mesas · {totalGuests} clientes
            </div>
            <div className="text-sm text-[var(--mut)]">
              Comandas abertas prontas para testar pedidos e caixa
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSetupModal('staff')}
            className="text-left rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--ac)] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                👥 Equipe & Multi-Funções
              </span>
              <span className="text-xs font-bold text-[var(--ac)]">Editar →</span>
            </div>
            <div className="text-lg font-extrabold">{cfg.staff.length} funcionários</div>
            <div className="text-sm text-[var(--mut)]">
              Cargos únicos ou combinados testáveis em tempo real
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSetupModal('billing')}
            className="text-left rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--ac)] transition-all cursor-pointer space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                💵 Couvert, Comissão & PIN
              </span>
              <span className="text-xs font-bold text-[var(--ac)]">Editar →</span>
            </div>
            <div className="text-lg font-extrabold">
              {cfg.couvertEnabled ? `Couvert ${money(cfg.couvertPrice)}` : 'Sem couvert'} ·{' '}
              {cfg.waiterTipPct}%
            </div>
            <div className="text-sm text-[var(--mut)]">
              Senha ADM/Gerente: <b>{cfg.managerPin}</b>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSetupModal('menu')}
            className="text-left rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--ac)] transition-all cursor-pointer space-y-1.5 sm:col-span-2 lg:col-span-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                🍟 Petiscos & Avulsos Extras
              </span>
              <span className="text-xs font-bold text-[var(--ac)]">Editar →</span>
            </div>
            <div className="text-lg font-extrabold">
              {cfg.extraItems.length} itens configurados (+ catálogo completo de drinks)
            </div>
            <div className="text-sm text-[var(--mut)]">
              Você também poderá adicionar/editar drinks, petiscos e estoque dentro das telas reais
            </div>
          </button>
        </div>

        {/* Botão principal Rodar Simulação */}
        <div className="panel !p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-emerald-500/40 bg-emerald-500/5">
          <div>
            <div className="font-extrabold text-base">Tudo pronto para demonstrar ao vivo?</div>
            <div className="text-xs text-[var(--mut)]">
              As telas reais abrem em tela cheia com apenas um menu discreto <b>☰</b> no topo
              direito. Ao sair, tudo volta ao zero.
            </div>
          </div>
          <button
            type="button"
            disabled={starting}
            onClick={() => void startSimulation()}
            className="b !py-3 !px-6 !text-base font-extrabold w-full sm:w-auto shrink-0"
          >
            {starting ? 'Preparando telas reais...' : '🚀 Rodar Simulação'}
          </button>
        </div>

        {/* MODAL: LOJA & ESTOQUE BASE */}
        {setupModal === 'store' && (
          <div className="ov" onClick={() => setSetupModal(null)}>
            <div className="modal !max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
                <h3 className="!m-0 text-lg font-extrabold">🏪 Loja & Estoque Base</h3>
                <button type="button" className="b g sm" onClick={() => setSetupModal(null)}>
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label>Nome do bar / restaurante fictício</label>
                  <input
                    value={cfg.storeName}
                    onChange={(e) => setCfg((p) => ({ ...p, storeName: e.target.value }))}
                    placeholder="Ex.: Bar Horizonte Demo"
                  />
                </div>
                <div>
                  <label>@ da loja (handle)</label>
                  <input
                    value={cfg.handle}
                    onChange={(e) => setCfg((p) => ({ ...p, handle: e.target.value }))}
                    placeholder="bar_horizonte_demo"
                  />
                </div>
                <div className="space-y-2">
                  <label>Estoque inicial da simulação</label>
                  {STOCK_PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCfg((p) => ({ ...p, stockPreset: opt.id }))}
                      className={`w-full text-left rounded-xl p-3 border cursor-pointer transition-colors ${
                        cfg.stockPreset === opt.id
                          ? 'border-[var(--ac)] bg-[var(--ac)]/10'
                          : 'border-[var(--bd)] bg-[var(--s2)]'
                      }`}
                    >
                      <div className="font-bold text-sm">{opt.label}</div>
                      <div className="text-xs text-[var(--mut)] mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="b full"
                onClick={() => setSetupModal(null)}
              >
                Concluir
              </button>
            </div>
          </div>
        )}

        {/* MODAL: MESAS & CLIENTES */}
        {setupModal === 'tables' && (
          <div className="ov" onClick={() => setSetupModal(null)}>
            <div className="modal !max-w-xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
                <h3 className="!m-0 text-lg font-extrabold">🪑 Mesas & Clientes</h3>
                <button type="button" className="b g sm" onClick={() => setSetupModal(null)}>
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                <span className="font-bold text-sm">Quantidade de mesas</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => handleSetTableCount(cfg.tables.length - 1)}
                  >
                    −
                  </button>
                  <span className="font-extrabold text-base w-8 text-center">
                    {cfg.tables.length}
                  </span>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => handleSetTableCount(cfg.tables.length + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto">
                {cfg.tables.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--s2)] space-y-2"
                  >
                    <div className="font-extrabold text-sm">🪑 {t.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {t.guests.map((g, gi) => (
                        <span key={`${t.id}_${gi}`} className="chip on !py-1 !px-2.5 !text-xs">
                          👤 {g}
                          {t.guests.length > 1 && (
                            <button
                              type="button"
                              className="ml-1.5 text-rose-300 font-bold cursor-pointer"
                              onClick={() => handleRemoveGuest(t.id, gi)}
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newGuestByTable[t.id] || ''}
                        onChange={(e) =>
                          setNewGuestByTable((p) => ({ ...p, [t.id]: e.target.value }))
                        }
                        placeholder="Adicionar cliente nesta mesa..."
                        className="flex-1"
                      />
                      <button
                        type="button"
                        className="b sm"
                        onClick={() => handleAddGuestToTable(t.id)}
                      >
                        + Pessoa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="b full" onClick={() => setSetupModal(null)}>
                Concluir
              </button>
            </div>
          </div>
        )}

        {/* MODAL: EQUIPE & MULTI-FUNÇÕES */}
        {setupModal === 'staff' && (
          <div className="ov" onClick={() => setSetupModal(null)}>
            <div className="modal !max-w-xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
                <h3 className="!m-0 text-lg font-extrabold">👥 Funcionários & Multi-Funções</h3>
                <button type="button" className="b g sm" onClick={() => setSetupModal(null)}>
                  ✕
                </button>
              </div>
              <div className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--s2)] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Nome (ex.: Fernanda Lima)"
                  />
                  <input
                    value={newStaffUser}
                    onChange={(e) => setNewStaffUser(e.target.value)}
                    placeholder="Usuário (opcional)"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STAFF_ROLES.filter((r) => r.key !== 'delivery').map((r) => {
                    const on = newStaffRoles.includes(r.key);
                    return (
                      <button
                        key={r.key}
                        type="button"
                        className={`chip ${on ? 'on' : ''}`}
                        onClick={() =>
                          setNewStaffRoles((prev) =>
                            prev.includes(r.key)
                              ? prev.filter((x) => x !== r.key)
                              : [...prev, r.key]
                          )
                        }
                      >
                        {r.icon} {r.shortLabel}
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="b sm" onClick={handleAddStaff}>
                  + Adicionar funcionário
                </button>
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {cfg.staff.map((st) => (
                  <div
                    key={st.id}
                    className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--s2)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm">
                        👤 {st.name}{' '}
                        <span className="text-xs font-normal text-[var(--mut)]">
                          @{st.username}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="b g sm text-rose-300"
                        onClick={() => handleRemoveSetupStaff(st.id)}
                      >
                        Remover
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STAFF_ROLES.filter((r) => r.key !== 'delivery').map((r) => {
                        const on = st.roles.includes(r.key);
                        return (
                          <button
                            key={r.key}
                            type="button"
                            className={`chip ${on ? 'on' : ''}`}
                            onClick={() => handleToggleSetupStaffRole(st.id, r.key)}
                          >
                            {r.icon} {r.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="b full" onClick={() => setSetupModal(null)}>
                Concluir
              </button>
            </div>
          </div>
        )}

        {/* MODAL: COUVERT, COMISSÃO & PIN */}
        {setupModal === 'billing' && (
          <div className="ov" onClick={() => setSetupModal(null)}>
            <div className="modal !max-w-lg space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
                <h3 className="!m-0 text-lg font-extrabold">💵 Couvert, Comissão & PIN ADM</h3>
                <button type="button" className="b g sm" onClick={() => setSetupModal(null)}>
                  ✕
                </button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.couvertEnabled}
                    onChange={(e) =>
                      setCfg((p) => ({ ...p, couvertEnabled: e.target.checked }))
                    }
                  />
                  <span className="font-bold text-sm">Cobrar Couvert artístico</span>
                </label>
                {cfg.couvertEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label>Descrição</label>
                      <input
                        value={cfg.couvertLabel}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, couvertLabel: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label>Valor (R$)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={cfg.couvertPrice}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, couvertPrice: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={cfg.couvertMandatory}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, couvertMandatory: e.target.checked }))
                        }
                      />
                      Obrigatório na comanda
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={cfg.couvertPerPerson}
                        onChange={(e) =>
                          setCfg((p) => ({ ...p, couvertPerPerson: e.target.checked }))
                        }
                      />
                      Cobrar por pessoa
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[var(--bd)]">
                  <div>
                    <label>Taxa de serviço / garçom (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={cfg.waiterTipPct}
                      onChange={(e) =>
                        setCfg((p) => ({ ...p, waiterTipPct: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div>
                    <label>Senha ADM / Gerente (para descontos)</label>
                    <input
                      value={cfg.managerPin}
                      onChange={(e) => setCfg((p) => ({ ...p, managerPin: e.target.value }))}
                      placeholder="1234"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.waiter100ToWaiter}
                    onChange={(e) =>
                      setCfg((p) => ({ ...p, waiter100ToWaiter: e.target.checked }))
                    }
                  />
                  Exibir alerta de 100% repassado ao garçom
                </label>
              </div>
              <button type="button" className="b full" onClick={() => setSetupModal(null)}>
                Concluir
              </button>
            </div>
          </div>
        )}

        {/* MODAL: PETISCOS & AVULSOS */}
        {setupModal === 'menu' && (
          <div className="ov" onClick={() => setSetupModal(null)}>
            <div className="modal !max-w-xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
                <h3 className="!m-0 text-lg font-extrabold">🍟 Petiscos & Avulsos</h3>
                <button type="button" className="b g sm" onClick={() => setSetupModal(null)}>
                  ✕
                </button>
              </div>
              <div className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--s2)] space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Nome do item"
                    className="sm:col-span-2"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Preço R$"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className={`chip ${newItemType === 'petisco' ? 'on' : ''}`}
                      onClick={() => setNewItemType('petisco')}
                    >
                      🍟 Petisco (Cozinha)
                    </button>
                    <button
                      type="button"
                      className={`chip ${newItemType === 'avulso' ? 'on' : ''}`}
                      onClick={() => setNewItemType('avulso')}
                    >
                      🍺 Avulso (Bar)
                    </button>
                  </div>
                  <button type="button" className="b sm" onClick={handleAddExtraItem}>
                    + Adicionar
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-[45vh] overflow-y-auto">
                {cfg.extraItems.map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--s2)] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-sm">
                        {it.itemType === 'petisco' ? '🍟' : '🍺'} {it.name}
                      </div>
                      <div className="text-xs text-[var(--mut)]">
                        {it.category} · {money(it.price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="b g sm text-rose-300"
                      onClick={() => handleRemoveExtraItem(it.id)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="b full" onClick={() => setSetupModal(null)}>
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // ESTÁGIO 2: TELAS 100% REAIS DO APP RODANDO NO SANDBOX EM MEMÓRIA
  // ============================================================================
  const unpricedCount = getUnpricedAvailableDrinks(simRecipes, simItems, simPrices, simBar).length;
  const openOrdersCount = simOrders.filter((o) => !o.paid && o.status !== 'done').length;

  const renderTopBar = (badge?: string) => (
    <header className="top !pr-16">
      <div className="brand">
        <div className="w-9 h-9 rounded-xl bg-[var(--ac)] text-[#120d0c] flex items-center justify-center text-lg font-extrabold shrink-0 shadow-sm">
          🍸
        </div>
        <div className="min-w-0">
          <div className="bn">{simBar.name}</div>
        </div>
      </div>
      {badge && <span className="chip on !py-1 !px-2.5 !text-xs shrink-0">{badge}</span>}
    </header>
  );

  // Botão Voltar contextual para cada perfil (sempre navega APENAS dentro do perfil atual)
  const simBackAction = (() => {
    if (perspective === 'dono') {
      if (ownerSubView) {
        return {
          show: true,
          label: ownerTab === 'more' ? 'Voltar para Mais' : 'Voltar',
          onBack: () => setOwnerSubView(null),
        };
      }
      if (ownerTab !== 'summary') {
        return {
          show: true,
          label: 'Voltar ao Resumo',
          onBack: () => setOwnerTab('summary'),
        };
      }
      return { show: false, label: 'Voltar', onBack: () => {} };
    }
    if (perspective === 'gerente') {
      if (managerSubView) {
        return {
          show: true,
          label: 'Voltar para Estoque',
          onBack: () => setManagerSubView(null),
        };
      }
      if (managerTab !== 'team') {
        return {
          show: true,
          label: 'Voltar para Equipe',
          onBack: () => setManagerTab('team'),
        };
      }
      return { show: false, label: 'Voltar', onBack: () => {} };
    }
    if (perspective === 'barman' || (perspective === 'funcionario' && effectiveStaffScreen === 'barman')) {
      if (barmanSubView === 'stock') {
        return {
          show: true,
          label: 'Voltar para Fila do Bar',
          onBack: () => setBarmanSubView('station'),
        };
      }
      return { show: false, label: 'Voltar', onBack: () => {} };
    }
    if (perspective === 'cozinha' || (perspective === 'funcionario' && effectiveStaffScreen === 'cozinha')) {
      if (kitchenSubView === 'catalog') {
        return {
          show: true,
          label: 'Voltar para Cozinha',
          onBack: () => setKitchenSubView('station'),
        };
      }
      return { show: false, label: 'Voltar', onBack: () => {} };
    }
    if (perspective === 'caixa' || (perspective === 'funcionario' && effectiveStaffScreen === 'caixa')) {
      if (cashierDisplayMode) {
        return {
          show: true,
          label: 'Fechar 2ª Tela',
          onBack: () => setCashierDisplayMode(null),
        };
      }
      return { show: false, label: 'Voltar', onBack: () => {} };
    }
    if (perspective === 'funcionario' && effectiveStaffScreen === 'gerente') {
      if (managerSubView) {
        return {
          show: true,
          label: 'Voltar para Estoque',
          onBack: () => setManagerSubView(null),
        };
      }
      if (managerTab !== 'team') {
        return {
          show: true,
          label: 'Voltar para Equipe',
          onBack: () => setManagerTab('team'),
        };
      }
    }
    return { show: false, label: 'Voltar', onBack: () => {} };
  })();

  // --- RENDERIZADORES DAS TELAS REAIS ---
  const renderRealBarmanContent = (actorName = 'Barman') => (
    <>
      {barmanSubView === 'stock' ? (
        <StockView
          bar={simBar}
          items={simItems}
          recipes={simRecipes}
          prices={simPrices}
          canEditMenu={false}
          hasPricing={true}
          onItemsChange={() => setSnap(getSimSnapshot())}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onGoPrices={() => onToast('A precificação é feita pelo Dono ou Gerente.')}
          onToast={onToast}
        />
      ) : (
        <BarmanStationView
          bar={simBar}
          role="barman"
          actorName={actorName}
          orders={simOrders}
          recipes={simRecipes}
          onSetOrderStatus={handleSetOrderStatus}
          onCancelOrder={handleCancelOrder}
          onSelectRecipe={(rec) => setSelectedRecipeModal(rec)}
          onGoStock={() => setBarmanSubView('stock')}
          onRefresh={refreshSnap}
        />
      )}
    </>
  );

  const renderRealKitchenContent = () => (
    <>
      {kitchenSubView === 'catalog' ? (
        <CatalogItemsManager
          bar={simBar}
          userId={SIM_OWNER_ID}
          recipes={simRecipes}
          prices={simPrices}
          initialType="petisco"
          onChanged={refreshSnap}
          onToast={onToast}
          onBack={() => setKitchenSubView('station')}
        />
      ) : (
        <KitchenStationView
          bar={simBar}
          role="cozinha"
          orders={simOrders}
          recipes={simRecipes}
          onSetOrderStatus={handleSetOrderStatus}
          onCancelOrder={handleCancelOrder}
          onSelectRecipe={(rec) => setSelectedRecipeModal(rec)}
          onRecipesUpdated={refreshSnap}
          onOpenCatalog={() => setKitchenSubView('catalog')}
          onRefresh={refreshSnap}
          onToast={onToast}
        />
      )}
    </>
  );

  const renderRealWaiterContent = (actorName = 'Garçom') => (
    <WaiterStationView
      bar={simBar}
      role="garcom"
      actorName={actorName}
      members={simMembers}
      orders={simOrders}
      recipes={simRecipes}
      items={simItems}
      prices={simPrices}
      tableTabs={simTableTabs}
      tableCalls={simTableCalls}
      onResolveCall={handleResolveCall}
      onSetOrderStatus={handleSetOrderStatus}
      onBarUpdated={() => setSnap(getSimSnapshot())}
      onRefreshAll={refreshSnap}
      onToast={onToast}
    />
  );

  const renderRealCashierContent = (actorName = 'Caixa', role = 'caixa') => (
    <>
      {cashierDisplayMode ? (
        <SecondScreenDisplay
          barId={SIM_BAR_ID}
          mode={cashierDisplayMode}
          onExit={() => setCashierDisplayMode(null)}
        />
      ) : (
        <CashierProView
          bar={simBar}
          role={role}
          actorName={actorName}
          orders={simOrders}
          tableTabs={simTableTabs}
          tableCalls={simTableCalls}
          recipes={simRecipes}
          items={simItems}
          prices={simPrices}
          hasPricing={true}
          settledIds={settledIds}
          onSettled={(ids) =>
            setSettledIds((prev) => {
              const next = new Set(prev);
              ids.forEach((id) => next.add(id));
              return next;
            })
          }
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onRefreshOrders={refreshSnap}
          onRefreshTableTabs={refreshSnap}
          onResolveCall={handleResolveCall}
          onOpenDisplayMode={(m) => setCashierDisplayMode(m)}
          onBackMore={() => {
            if (perspective === 'dono') setOwnerSubView(null);
          }}
          onToast={onToast}
        />
      )}
    </>
  );

  const renderRealGerenteContent = (embedded = false, actorName = 'Gerente') => (
    <div className="space-y-4">
      {embedded && (
        <div className="seg">
          <button
            type="button"
            className={managerTab === 'team' ? 'on' : ''}
            onClick={() => {
              setManagerSubView(null);
              setManagerTab('team');
            }}
          >
            👥 Equipe
          </button>
          <button
            type="button"
            className={managerTab === 'stock' ? 'on' : ''}
            onClick={() => {
              setManagerSubView(null);
              setManagerTab('stock');
            }}
          >
            🍾 Estoque
          </button>
          <button
            type="button"
            className={managerTab === 'management' ? 'on' : ''}
            onClick={() => {
              setManagerSubView(null);
              setManagerTab('management');
            }}
          >
            📊 Gestão
          </button>
        </div>
      )}

      {managerSubView === 'prices' ? (
        <PricesView
          bar={simBar}
          items={simItems}
          recipes={simRecipes}
          prices={simPrices}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onPricesUpdated={() => setSnap(getSimSnapshot())}
          onItemsChange={() => setSnap(getSimSnapshot())}
          onGoStock={() => {
            setManagerSubView(null);
            setManagerTab('stock');
          }}
          onBack={() => setManagerSubView(null)}
          onToast={onToast}
        />
      ) : managerTab === 'team' ? (
        <div className="space-y-4">
          <StaffAccountsManagerCard
            bar={simBar}
            actorName={actorName}
            role="gerente"
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onToast={onToast}
          />
          <TeamSection
            bar={simBar}
            members={simMembers}
            onMembersUpdated={() => setSnap(getSimSnapshot())}
            onToast={onToast}
          />
        </div>
      ) : managerTab === 'stock' ? (
        <StockView
          bar={simBar}
          items={simItems}
          recipes={simRecipes}
          prices={simPrices}
          canEditMenu={true}
          hasPricing={true}
          onItemsChange={() => setSnap(getSimSnapshot())}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onGoPrices={() => setManagerSubView('prices')}
          onOpenCompras={() => {
            setManagerMgmtTab('compras');
            setManagerTab('management');
          }}
          onToast={onToast}
        />
      ) : (
        <ManagementProView
          bar={simBar}
          role="gerente"
          actorName={actorName}
          items={simItems}
          recipes={simRecipes}
          orders={simOrders}
          members={simMembers}
          prices={simPrices}
          tableTabs={simTableTabs}
          initialSubTab={managerMgmtTab}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onBackMore={() => setManagerTab('team')}
          onToast={onToast}
        />
      )}
    </div>
  );

  const renderRealDonoScreen = () => (
    <div className="min-h-dvh pb-24">
      {renderTopBar()}
      <FloatingBackButton
        visible={simBackAction.show}
        label={simBackAction.label}
        onBack={simBackAction.onBack}
      />
      <div className="w">
        {ownerSubView === 'cashier' ? (
          renderRealCashierContent('Dono', 'owner')
        ) : ownerSubView === 'prices' ? (
          <PricesView
            bar={simBar}
            items={simItems}
            recipes={simRecipes}
            prices={simPrices}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onPricesUpdated={() => setSnap(getSimSnapshot())}
            onItemsChange={() => setSnap(getSimSnapshot())}
            onGoStock={() => {
              setOwnerSubView(null);
              setOwnerTab('stock');
            }}
            onBack={() => setOwnerSubView(null)}
            onToast={onToast}
          />
        ) : ownerSubView === 'management' ? (
          <ManagementProView
            bar={simBar}
            role="owner"
            actorName="Dono"
            items={simItems}
            recipes={simRecipes}
            orders={simOrders}
            members={simMembers}
            prices={simPrices}
            tableTabs={simTableTabs}
            initialSubTab={ownerMgmtTab}
            onOpenDelivery={() => setOwnerSubView('delivery')}
            onOpenWaiterStation={() => {
              setOwnerSubView(null);
              setOwnerQueueStation('garcom');
              setOwnerTab('queue');
            }}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onBackMore={() => setOwnerSubView(null)}
            onToast={onToast}
          />
        ) : ownerSubView === 'team' ? (
          <div className="space-y-4">
            <StaffAccountsManagerCard
              bar={simBar}
              actorName="Dono"
              role="owner"
              onBarUpdated={() => setSnap(getSimSnapshot())}
              onToast={onToast}
            />
            <TeamSection
              bar={simBar}
              members={simMembers}
              onMembersUpdated={() => setSnap(getSimSnapshot())}
              onToast={onToast}
            />
          </div>
        ) : ownerSubView === 'catalog' ? (
          <CatalogItemsManager
            bar={simBar}
            userId={SIM_OWNER_ID}
            recipes={simRecipes}
            prices={simPrices}
            initialType="petisco"
            onChanged={refreshSnap}
            onToast={onToast}
            onBack={() => setOwnerSubView(null)}
          />
        ) : ownerSubView === 'delivery' ? (
          <DeliveryProView
            bar={simBar}
            role="owner"
            actorName="Dono"
            orders={simOrders}
            recipes={simRecipes}
            prices={simPrices}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onRefreshOrders={refreshSnap}
            onBackMore={() => setOwnerSubView(null)}
            onToast={onToast}
          />
        ) : ownerSubView === 'studio' ? (
          <StoreStudioView
            bar={simBar}
            items={simItems}
            recipes={simRecipes}
            prices={simPrices}
            hasPricing={true}
            userCoords={null}
            onDetectCoords={async () => null}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onGoPrices={() => setOwnerSubView('prices')}
            onBackMore={() => setOwnerSubView(null)}
            onToast={onToast}
          />
        ) : ownerTab === 'summary' ? (
          <OwnerSummaryView
            bar={simBar}
            orders={simOrders}
            recipes={simRecipes}
            items={simItems}
            prices={simPrices}
            tableTabs={simTableTabs}
            tableCalls={simTableCalls}
            hasPricing={true}
            uiThemeMode="dark"
            onToggleTheme={() => onToast('Tema alterado na simulação.')}
            onRefresh={refreshSnap}
            onGoQueue={(st) => {
              setOwnerQueueStation(st || 'all');
              setOwnerTab('queue');
            }}
            onGoCashier={() => setOwnerSubView('cashier')}
            onGoDelivery={() => setOwnerSubView('delivery')}
            onGoStock={() => setOwnerTab('stock')}
            onGoPrices={() => setOwnerSubView('prices')}
            onGoReports={() => {
              setOwnerMgmtTab('dashboard');
              setOwnerSubView('management');
            }}
            onOpenQr={() => setQrModalOpen(true)}
          />
        ) : ownerTab === 'queue' ? (
          <QueueView
            bar={simBar}
            role="owner"
            actorName="Dono"
            members={simMembers}
            orders={simOrders}
            recipes={simRecipes}
            items={simItems}
            prices={simPrices}
            tableTabs={simTableTabs}
            tableCalls={simTableCalls}
            defaultStation={ownerQueueStation}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onItemsChange={() => setSnap(getSimSnapshot())}
            onRefreshOrders={refreshSnap}
            onRefreshTableTabs={refreshSnap}
            onResolveCall={handleResolveCall}
            onRecipesUpdated={refreshSnap}
            onSelectRecipe={(rec) => setSelectedRecipeModal(rec)}
            onGoStock={() => setOwnerTab('stock')}
            onOpenCatalog={() => setOwnerSubView('catalog')}
            onToast={onToast}
          />
        ) : ownerTab === 'recipes' ? (
          <RecipesView
            bar={simBar}
            items={simItems}
            recipes={simRecipes}
            prices={simPrices}
            hasPricing={true}
            unpricedCount={unpricedCount}
            canEditMenu={true}
            userId={SIM_OWNER_ID}
            onGoPrices={() => setOwnerSubView('prices')}
            onOpenCreateDrink={(editExisting) => setCreateDrinkModal({ editExisting })}
            onOpenCatalog={() => setOwnerSubView('catalog')}
            onOpenShakers={() => setShakersModalOpen(true)}
            onSelectRecipe={(rec) => setSelectedRecipeModal(rec)}
            onRecipeUpdated={() => setSnap(getSimSnapshot())}
            onToast={onToast}
          />
        ) : ownerTab === 'stock' ? (
          <StockView
            bar={simBar}
            items={simItems}
            recipes={simRecipes}
            prices={simPrices}
            canEditMenu={true}
            hasPricing={true}
            onItemsChange={() => setSnap(getSimSnapshot())}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onGoPrices={() => setOwnerSubView('prices')}
            onOpenCompras={() => {
              setOwnerMgmtTab('compras');
              setOwnerSubView('management');
            }}
            onToast={onToast}
          />
        ) : (
          <MoreView
            bar={simBar}
            isManager={true}
            canEditMenu={true}
            hasPricing={true}
            unpricedCount={unpricedCount}
            planLabel="Plano Pro (Simulação)"
            isProPlan={true}
            isPlatformAdmin={false}
            onBarUpdated={() => setSnap(getSimSnapshot())}
            onOpenQr={() => setQrModalOpen(true)}
            onOpenShakers={() => setShakersModalOpen(true)}
            onOpenCreateDrink={(editExisting) => setCreateDrinkModal({ editExisting })}
            onOpenStation={(st) => {
              setOwnerQueueStation(st);
              setOwnerTab('queue');
            }}
            onOpenManagement={(sub) => {
              setOwnerMgmtTab(sub);
              setOwnerSubView('management');
            }}
            onNavigate={(t) => {
              if (t === 'cashier') setOwnerSubView('cashier');
              else if (t === 'prices') setOwnerSubView('prices');
              else if (t === 'catalog') setOwnerSubView('catalog');
              else if (t === 'delivery') setOwnerSubView('delivery');
              else if (t === 'studio' || t === 'menuStudio') setOwnerSubView('studio');
              else if (t === 'careers' || t === 'team') setOwnerSubView('team');
              else if (t === 'management') {
                setOwnerMgmtTab('dashboard');
                setOwnerSubView('management');
              } else {
                onToast('Esta opção está disponível no app principal.');
              }
            }}
            onOpenSwitchBar={() => onToast('Use o menu ☰ no topo direito para trocar de tela.')}
            onToast={onToast}
          />
        )}
      </div>

      {/* Menu inferior real do Dono */}
      <nav className="bnav !z-[125]">
        <button
          type="button"
          className={`bnav-btn ${!ownerSubView && ownerTab === 'summary' ? 'on' : ''}`}
          onClick={() => {
            setOwnerSubView(null);
            setOwnerTab('summary');
          }}
        >
          <span className="ico">📊</span>
          <span>Resumo</span>
        </button>
        <button
          type="button"
          className={`bnav-btn ${!ownerSubView && ownerTab === 'queue' ? 'on' : ''}`}
          onClick={() => {
            setOwnerSubView(null);
            setOwnerTab('queue');
          }}
        >
          <span className="ico">🔔</span>
          <span>Pedidos{openOrdersCount > 0 ? ` (${openOrdersCount})` : ''}</span>
        </button>
        <button
          type="button"
          className={`bnav-btn ${!ownerSubView && ownerTab === 'recipes' ? 'on' : ''}`}
          onClick={() => {
            setOwnerSubView(null);
            setOwnerTab('recipes');
          }}
        >
          <span className="ico">🍸</span>
          <span>Cardápio</span>
        </button>
        <button
          type="button"
          className={`bnav-btn ${!ownerSubView && ownerTab === 'stock' ? 'on' : ''}`}
          onClick={() => {
            setOwnerSubView(null);
            setOwnerTab('stock');
          }}
        >
          <span className="ico">🍾</span>
          <span>Estoque</span>
        </button>
        <button
          type="button"
          className={`bnav-btn ${ownerSubView || ownerTab === 'more' ? 'on' : ''}`}
          onClick={() => {
            setOwnerSubView(null);
            setOwnerTab('more');
          }}
        >
          <span className="ico">⋯</span>
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );

  const renderStaffScreen = () => {
    if (!activeStaffLive) {
      return (
        <div className="min-h-dvh pb-10">
          {renderTopBar('🧑‍🍳 Garçom')}
          <div className="w">{renderRealWaiterContent()}</div>
        </div>
      );
    }
    const cur = effectiveStaffScreen || 'garcom';
    const hasMulti = activeStaffScreens.length > 1;

    return (
      <div className={`min-h-dvh ${hasMulti ? 'pb-24' : 'pb-10'}`}>
        {renderTopBar(`👤 ${activeStaffLive.name}`)}
        <FloatingBackButton
          visible={simBackAction.show}
          label={simBackAction.label}
          onBack={simBackAction.onBack}
        />
        <div className="w">
          {cur === 'barman' && renderRealBarmanContent(activeStaffLive.name)}
          {cur === 'cozinha' && renderRealKitchenContent()}
          {cur === 'garcom' && renderRealWaiterContent(activeStaffLive.name)}
          {cur === 'caixa' && renderRealCashierContent(activeStaffLive.name, 'caixa')}
          {cur === 'estoque' && (
            <StockView
              bar={simBar}
              items={simItems}
              recipes={simRecipes}
              prices={simPrices}
              canEditMenu={activeStaffLive.roles.includes('gerente')}
              hasPricing={true}
              onItemsChange={() => setSnap(getSimSnapshot())}
              onBarUpdated={() => setSnap(getSimSnapshot())}
              onGoPrices={() => onToast('A precificação é feita pelo Dono ou Gerente.')}
              onToast={onToast}
            />
          )}
          {cur === 'gerente' && renderRealGerenteContent(true, activeStaffLive.name)}
        </div>
        {hasMulti && (
          <nav className="bnav !z-[125]">
            {activeStaffScreens.map((sc) => (
              <button
                key={sc.id}
                type="button"
                className={`bnav-btn ${cur === sc.id ? 'on' : ''}`}
                onClick={() => {
                  setBarmanSubView('station');
                  setKitchenSubView('station');
                  setCashierDisplayMode(null);
                  setManagerSubView(null);
                  setStaffActiveScreen(sc.id);
                }}
              >
                <span className="ico">{sc.icon}</span>
                <span>{sc.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[var(--bg)] overflow-y-auto">
      {/* TELA REAL IMERSIVA ISOLADA POR PERFIL */}
      {perspective === 'cliente' && (
        <div className="min-h-dvh">
          <MenuPage key={clientMesa} barId={SIM_BAR_ID} mesa={clientMesa} />
        </div>
      )}

      {perspective === 'barman' && (
        <div className="min-h-dvh pb-10">
          {renderTopBar('🍸 Barman')}
          <FloatingBackButton
            visible={simBackAction.show}
            label={simBackAction.label}
            onBack={simBackAction.onBack}
          />
          <div className="w">{renderRealBarmanContent('Barman')}</div>
        </div>
      )}

      {perspective === 'cozinha' && (
        <div className="min-h-dvh pb-10">
          {renderTopBar('🍳 Cozinha')}
          <FloatingBackButton
            visible={simBackAction.show}
            label={simBackAction.label}
            onBack={simBackAction.onBack}
          />
          <div className="w">{renderRealKitchenContent()}</div>
        </div>
      )}

      {perspective === 'garcom' && (
        <div className="min-h-dvh pb-10">
          {renderTopBar('🧑‍🍳 Garçom')}
          <div className="w">{renderRealWaiterContent('Garçom')}</div>
        </div>
      )}

      {perspective === 'caixa' && (
        <div className="min-h-dvh pb-10">
          {!cashierDisplayMode && renderTopBar('💵 Caixa')}
          <FloatingBackButton
            visible={simBackAction.show}
            label={simBackAction.label}
            topOffset={cashierDisplayMode ? 0 : 58}
            onBack={simBackAction.onBack}
          />
          <div className={cashierDisplayMode ? '' : 'w'}>
            {renderRealCashierContent('Caixa', 'caixa')}
          </div>
        </div>
      )}

      {perspective === 'gerente' && (
        <div className="min-h-dvh pb-24">
          {renderTopBar('🛡️ Gerente')}
          <FloatingBackButton
            visible={simBackAction.show}
            label={simBackAction.label}
            onBack={simBackAction.onBack}
          />
          <div className="w">{renderRealGerenteContent(false, 'Gerente')}</div>
          <nav className="bnav !z-[125]">
            <button
              type="button"
              className={`bnav-btn ${!managerSubView && managerTab === 'team' ? 'on' : ''}`}
              onClick={() => {
                setManagerSubView(null);
                setManagerTab('team');
              }}
            >
              <span className="ico">👥</span>
              <span>Equipe</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${!managerSubView && managerTab === 'stock' ? 'on' : ''}`}
              onClick={() => {
                setManagerSubView(null);
                setManagerTab('stock');
              }}
            >
              <span className="ico">🍾</span>
              <span>Estoque</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${!managerSubView && managerTab === 'management' ? 'on' : ''}`}
              onClick={() => {
                setManagerSubView(null);
                setManagerTab('management');
              }}
            >
              <span className="ico">📊</span>
              <span>Gestão</span>
            </button>
          </nav>
        </div>
      )}

      {perspective === 'dono' && renderRealDonoScreen()}

      {perspective === 'funcionario' && renderStaffScreen()}

      {/* MODAIS REAIS DA LOJA (TODOS RODANDO EM MEMÓRIA) */}
      {selectedRecipeModal && (
        <MakeDrinkModal
          recipe={selectedRecipeModal}
          bar={simBar}
          items={simItems}
          prices={simPrices}
          orders={simOrders}
          tableTabs={simTableTabs}
          userId={SIM_OWNER_ID}
          onClose={() => setSelectedRecipeModal(null)}
          onOrderCreated={refreshSnap}
          onRecipeUpdated={(updated) => {
            setSelectedRecipeModal(updated);
            setSnap(getSimSnapshot());
          }}
          onToast={onToast}
        />
      )}

      {createDrinkModal && (
        <CreateDrinkModal
          editExisting={createDrinkModal.editExisting}
          recipes={simRecipes}
          userId={SIM_OWNER_ID}
          onRecipeSaved={() => {
            setSnap(getSimSnapshot());
            setCreateDrinkModal(null);
          }}
          onClose={() => setCreateDrinkModal(null)}
          onToast={onToast}
        />
      )}

      {shakersModalOpen && (
        <ShakersModal
          bar={simBar}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onClose={() => setShakersModalOpen(false)}
          onToast={onToast}
        />
      )}

      {qrModalOpen && (
        <QrModal
          bar={simBar}
          items={simItems}
          recipes={simRecipes}
          prices={simPrices}
          onItemsChange={() => setSnap(getSimSnapshot())}
          onGoPrices={() => {
            setQrModalOpen(false);
            setOwnerSubView('prices');
          }}
          onGoStock={() => {
            setQrModalOpen(false);
            setOwnerSubView(null);
            setOwnerTab('stock');
          }}
          onGoQrStudio={() => {
            setQrModalOpen(false);
            setOwnerSubView('studio');
          }}
          onBarUpdated={() => setSnap(getSimSnapshot())}
          onClose={() => setQrModalOpen(false)}
          onToast={onToast}
        />
      )}

      {/* ÚNICO CONTROLE DA SIMULAÇÃO: MENU DE 3 TRAÇOS DISCRETO NO TOPO DIREITO */}
      <div
        className="fixed right-3 z-[140]"
        style={{ top: 'max(8px, env(safe-area-inset-top, 8px))' }}
      >
        <button
          type="button"
          aria-label="Menu da simulação"
          onClick={() => setCornerMenuOpen((v) => !v)}
          className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer border border-[var(--bd)] bg-[var(--s1)]/92 backdrop-blur-md shadow-lg hover:border-[var(--ac)] transition-colors"
        >
          <span className="block w-5 h-0.5 rounded-full bg-[var(--tx)]" />
          <span className="block w-5 h-0.5 rounded-full bg-[var(--tx)]" />
          <span className="block w-5 h-0.5 rounded-full bg-[var(--tx)]" />
        </button>

        {cornerMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[138]"
              onClick={() => setCornerMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-[min(288px,calc(100vw-24px))] rounded-2xl border border-[var(--bd-strong)] bg-[var(--s1)] shadow-2xl p-2.5 space-y-1.5 max-h-[82dvh] overflow-y-auto z-[142]">
              {/* 1. Escolher tela */}
              <button
                type="button"
                className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-extrabold bg-[var(--s2)] text-[var(--tx)] border border-[var(--bd)] flex items-center justify-between cursor-pointer"
                onClick={() => setMenuShowScreens((v) => !v)}
              >
                <span>📱 Escolher tela</span>
                <span className="text-xs text-[var(--mut)]">{menuShowScreens ? '▴' : '▾'}</span>
              </button>

              {menuShowScreens && (
                <div className="space-y-1 pl-1">
                  {PERSPECTIVE_LIST.map((p) => {
                    const isActive = perspective === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPerspective(p.id);
                          setSelectedStaffId(null);
                          resetInternalSubViews();
                          setCornerMenuOpen(false);
                        }}
                        className={`w-full text-left rounded-xl px-3 py-2 text-sm font-bold flex items-center justify-between gap-2 border cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[var(--ac)] text-[#120d0c] border-transparent'
                            : 'bg-transparent text-[var(--tx)] border-transparent hover:bg-[var(--s2)]'
                        }`}
                      >
                        <span>
                          {p.icon} {p.label}
                        </span>
                        {isActive && <span>●</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Trocar mesa quando na tela Cliente */}
              {perspective === 'cliente' && simTableTabs.length > 1 && (
                <div className="pt-1.5 border-t border-[var(--bd)] space-y-1">
                  <div className="px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--mut)]">
                    🪑 Mesa no Cardápio QR
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {simTableTabs.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectClientMesa(t.table_label)}
                        className={`chip !py-1 !px-2.5 !text-xs ${
                          norm(clientMesa) === norm(t.table_label) ? 'on' : ''
                        }`}
                      >
                        {t.table_label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Escolher funcionário */}
              <div className="pt-1.5 border-t border-[var(--bd)] space-y-1.5">
                <button
                  type="button"
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold bg-[var(--s2)] text-[var(--tx)] border border-[var(--bd)] hover:border-[var(--ac)] cursor-pointer flex items-center justify-between"
                  onClick={() => {
                    setCornerMenuOpen(false);
                    setShowStaffPickerModal(true);
                  }}
                >
                  <span>👤 Escolher funcionário</span>
                  <span className="text-xs text-[var(--ac)]">→</span>
                </button>

                {/* 3. Sair do modo simulação */}
                <button
                  type="button"
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 cursor-pointer"
                  onClick={exitSimulation}
                >
                  🚪 Sair do modo simulação
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL ESCOLHER FUNCIONÁRIO (LÊ OS CARGOS AO VIVO DA SIMULAÇÃO) */}
      {showStaffPickerModal && (
        <div className="ov !z-[150]" onClick={() => setShowStaffPickerModal(false)}>
          <div className="modal !max-w-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--bd)]">
              <h3 className="!m-0 text-lg font-extrabold">👤 Escolher Funcionário</h3>
              <button
                type="button"
                className="b g sm"
                onClick={() => setShowStaffPickerModal(false)}
              >
                ✕
              </button>
            </div>
            <p className="mu text-sm !m-0">
              Abra o app exatamente como aparece para o colaborador selecionado — sem menu inferior
              se tiver 1 função, ou com multi-telas se tiver 2 ou mais funções.
            </p>
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {liveStaffAccounts.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    resetInternalSubViews();
                    setSelectedStaffId(st.id);
                    const sc = getStaffScreens(st.roles);
                    if (sc[0]) setStaffActiveScreen(sc[0].id);
                    setPerspective('funcionario');
                    setShowStaffPickerModal(false);
                    onToast(`Visualizando como ${st.name}`);
                  }}
                  className="w-full text-left rounded-2xl p-3.5 border border-[var(--bd)] bg-[var(--s2)] hover:border-[var(--ac)] cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-base">👤 {st.name}</span>
                    <span className="text-xs font-bold text-[var(--ac)]">Abrir →</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {st.roles.map((rk) => {
                      const meta = STAFF_ROLE_BY_KEY[rk];
                      return (
                        <span key={rk} className="chip on !py-0.5 !px-2.5 !text-xs">
                          {meta ? `${meta.icon} ${meta.shortLabel}` : rk}
                        </span>
                      );
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
