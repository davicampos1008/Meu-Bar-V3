import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { AdSlot } from './components/AdSlot';
import { AlertSettingsView } from './components/AlertSettingsView';
import { LoginScreen, OnboardingScreen, QuickLockScreen } from './components/AuthAndOnboarding';
import {
  MoreView,
  PricesView,
  QueueView,
  RecipesView,
  StockView,
  StoreStudioView,
} from './components/BarViews';
import {
  CareersView,
  ExploreBarsView,
  JobsSection,
  ProfileSection,
} from './components/CareersViews';
import { CashierProView } from './components/CashierProView';
import { CatalogItemsManager } from './components/CatalogItemsManager';
import { DeliveryProView } from './components/DeliveryProView';
import { FloatingBackButton } from './components/FloatingBackButton';
import { ManagementProView, type ManagementSubTab } from './components/ManagementProView';
import { MenuPage } from './components/MenuPage';
import type { StudioTab } from './components/MenuStudio';
import {
  CreateDrinkModal,
  MakeDrinkModal,
  QrModal,
  ShakersModal,
  SwitchBarModal,
} from './components/Modals';
import { OwnerSummaryView } from './components/OwnerSummaryView';
import { LegalDocsModal, PlansView, ProGateCard } from './components/PlansAndLegalModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { SalesLandingPage } from './components/SalesLandingPage';
import { SecondScreenDisplay } from './components/SecondScreenDisplay';
import { BrandMark } from './components/SharedUI';
import { StaffLoginGate } from './components/StaffLoginGate';
import { SuperAdminView, type AdminTab } from './components/SuperAdminView';
import { StoreSupportChatView, SupportDeskView } from './components/SupportChatView';
import {
  canShowToast,
  getAlertPrefsSummary,
  isAlertEnabled,
  useAlertPrefs,
  type AlertCategoryKey,
} from './lib/alertPrefs';
import type { DisplayMode } from './lib/displaySync';
import {
  flushOfflineOrders,
  getBarOpsData,
  loadOpenTableCalls,
  parseDeliveryOrderMeta,
  playStationAlert,
  resolveTableCall,
} from './lib/opsUtils';
import {
  getSavedQuickProfile,
  isQuickLockActive,
  saveQuickProfile,
  setQuickLockActive,
  type SavedQuickProfile,
} from './lib/quickAuth';
import {
  clearActiveStaffSession,
  getActiveStaffSession,
  getAllowedViewsForRoles,
  hasStoreManagerPin,
  setActiveStaffSession,
  STAFF_ROLE_BY_KEY,
  verifyStoreManagerPin,
  type ActiveStaffSession,
} from './lib/staffAuth';
import { EXTENDED_RECIPES } from './lib/recipesSeed';
import {
  buildWhatsAppLink,
  getBarPlanStatus,
  getCachedPartnerAds,
  getCachedPlatformConfig,
  isSuperAdmin,
  isSupportStaff,
  loadAdminNotifications,
  loadPartnerAds,
  loadPlatformConfig,
  markAdminNotificationsRead,
} from './lib/saas';
import { broadcastMenuUpdate, sb } from './lib/supabase';
import { fetchStoreThreads, subscribeSupportRealtime } from './lib/supportChat';
import {
  applyBarTheme,
  getStoredUiThemeMode,
  getUnpricedAvailableDrinks,
  norm,
  setStoredUiThemeMode,
  type UiThemeMode,
} from './lib/utils';
import type {
  AdminAlertItem,
  Bar,
  BarEntry,
  BarItem,
  BarMember,
  BarPlanTier,
  JobApplication,
  JobPost,
  Order,
  PartnerAdBanner,
  PlatformSaaSConfig,
  Recipe,
  ServiceRequest,
  StaffProfile,
  TableCallAlert,
  TableTab,
  UserCoords,
} from './types/meubar';

interface PersistedNavState {
  screenMode: 'bar' | 'seeker' | 'onboarding';
  workspaceMode: 'normal' | 'admin' | 'support';
  adminAreaTab: AdminTab;
  tab: string;
  seekerTab: 'careers' | 'profile' | 'explore' | 'createbar';
  queueStation: 'all' | 'bar' | 'cozinha' | 'garcom';
  mgmtSubTab: ManagementSubTab;
  studioInitialTab: StudioTab;
  careerMode: 'store' | 'personal';
  showSalesSite: boolean;
}

const NAV_STORAGE_KEY = 'meubar_nav_state_v1';

const VALID_BAR_TABS = new Set([
  'dashboard',
  'recipes',
  'stock',
  'queue',
  'catalog',
  'delivery',
  'cashier',
  'management',
  'plans',
  'superadmin',
  'alerts',
  'prices',
  'studio',
  'careers',
  'support',
  'more',
]);

function loadPersistedNavState(): Partial<PersistedNavState> {
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedNavState>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const menuBarParam = params.get('bar');
  const mesaParam = params.get('mesa');
  const modeParam = params.get('mode');
  const displayParam = params.get('display');
  const stationParam = params.get('station');
  const isDisplayRoute = Boolean(
    menuBarParam &&
      (displayParam === 'customer' ||
        displayParam === 'queue_client' ||
        displayParam === 'queue_team')
  );
  const isMenuRoute =
    !isDisplayRoute &&
    (Boolean(menuBarParam) || window.location.pathname.endsWith('/menu.html'));
  const isPublicStandaloneRoute = isMenuRoute || isDisplayRoute;
  const wantsSalesSite =
    !isPublicStandaloneRoute && (params.get('site') === '1' || params.get('vendas') === '1');

  const initialNavRef = useRef<Partial<PersistedNavState> | null>(null);
  if (initialNavRef.current === null) {
    initialNavRef.current = loadPersistedNavState();
  }
  const savedNav = initialNavRef.current;

  const [uiThemeMode, setUiThemeMode] = useState<UiThemeMode>(() => getStoredUiThemeMode());
  const uiThemeModeRef = useRef<UiThemeMode>(uiThemeMode);
  uiThemeModeRef.current = uiThemeMode;

  const [showSalesSite, setShowSalesSite] = useState(
    wantsSalesSite || Boolean(!isPublicStandaloneRoute && savedNav.showSalesSite)
  );
  const [previewDisplayMode, setPreviewDisplayMode] = useState<DisplayMode | null>(null);
  const [booting, setBooting] = useState(!isPublicStandaloneRoute);
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [bars, setBars] = useState<BarEntry[]>([]);
  const [activeBar, setActiveBar] = useState<Bar | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState<'bar' | 'seeker' | 'onboarding'>(
    savedNav.screenMode === 'bar' || savedNav.screenMode === 'onboarding'
      ? savedNav.screenMode
      : 'seeker'
  );
  const [workspaceMode, setWorkspaceMode] = useState<'normal' | 'admin' | 'support'>(
    savedNav.workspaceMode === 'admin' || savedNav.workspaceMode === 'support'
      ? savedNav.workspaceMode
      : 'normal'
  );
  const [adminAreaTab, setAdminAreaTab] = useState<AdminTab>(
    savedNav.adminAreaTab || 'accounts'
  );

  const [tab, setTab] = useState<string>(
    savedNav.tab && VALID_BAR_TABS.has(savedNav.tab) ? savedNav.tab : 'dashboard'
  );
  const [studioInitialTab, setStudioInitialTab] = useState<StudioTab>(
    savedNav.studioInitialTab || 'menu'
  );
  const [mgmtSubTab, setMgmtSubTab] = useState<ManagementSubTab>(
    savedNav.mgmtSubTab || 'dashboard'
  );
  const [queueStation, setQueueStation] = useState<'all' | 'bar' | 'cozinha' | 'garcom'>(
    savedNav.queueStation || 'all'
  );
  const [seekerTab, setSeekerTab] = useState<'careers' | 'profile' | 'explore' | 'createbar'>(
    savedNav.seekerTab || 'careers'
  );
  const [careerMode, setCareerMode] = useState<'store' | 'personal'>(
    savedNav.careerMode || 'store'
  );

  // Login rápido & bloqueio por biometria/PIN
  const [quickProfile, setQuickProfile] = useState<SavedQuickProfile | null>(() =>
    getSavedQuickProfile()
  );
  const [appLocked, setAppLocked] = useState<boolean>(() => isQuickLockActive());

  // Login de funcionários da loja (multi-função em tempo real) + Terminal Exclusivo do Caixa
  const [activeStaffSession, setActiveStaffSessionState] = useState<ActiveStaffSession | null>(null);
  const [ownerBypassStaffGate, setOwnerBypassStaffGate] = useState<boolean>(false);
  const [staffViewId, setStaffViewId] = useState<string>('');
  const [exclusiveCashierMode, setExclusiveCashierMode] = useState<boolean>(false);
  const [showExitTerminalPin, setShowExitTerminalPin] = useState<boolean>(false);
  const [exitTerminalPin, setExitTerminalPin] = useState<string>('');
  const [exitTerminalErr, setExitTerminalErr] = useState<string>('');

  // Chat de suporte no app
  const [supportPrefill, setSupportPrefill] = useState<string>('');
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);

  const [items, setItems] = useState<BarItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableTabs, setTableTabs] = useState<TableTab[]>([]);
  const [tableCalls, setTableCalls] = useState<TableCallAlert[]>([]);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<BarMember[]>([]);

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [myApps, setMyApps] = useState<JobApplication[]>([]);
  const [receivedApps, setReceivedApps] = useState<JobApplication[]>([]);
  const [serviceReqs, setServiceReqs] = useState<ServiceRequest[]>([]);
  const [profile, setProfile] = useState<StaffProfile>({ user_id: '' });

  const [toastMsg, setToastMsg] = useState('');
  const [loadErr, setLoadErr] = useState('');

  // Modal states
  const [showSwitchBar, setShowSwitchBar] = useState(false);
  const [makeDrinkRecipe, setMakeDrinkRecipe] = useState<Recipe | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showShakers, setShowShakers] = useState(false);
  const [createDrinkMode, setCreateDrinkMode] = useState<null | boolean>(null);
  const [standaloneModal, setStandaloneModal] = useState<null | 'jobs' | 'profile'>(null);
  const [legalModal, setLegalModal] = useState<null | 'terms' | 'privacy'>(null);
  const [seekerOverlay, setSeekerOverlay] = useState<
    null | 'superadmin' | 'plans' | 'alerts' | 'support'
  >(null);

  // Pilha real de histórico de telas para botão Voltar retrátil e botão Voltar do celular
  const navHistoryRef = useRef<
    Array<{
      screenMode: 'bar' | 'seeker' | 'onboarding';
      tab: string;
      seekerTab: 'careers' | 'profile' | 'explore' | 'createbar';
    }>
  >([]);
  const prevRouteRef = useRef<{
    screenMode: 'bar' | 'seeker' | 'onboarding';
    tab: string;
    seekerTab: 'careers' | 'profile' | 'explore' | 'createbar';
  }>({
    screenMode:
      savedNav.screenMode === 'bar' || savedNav.screenMode === 'onboarding'
        ? savedNav.screenMode
        : 'seeker',
    tab: savedNav.tab && VALID_BAR_TABS.has(savedNav.tab) ? savedNav.tab : 'dashboard',
    seekerTab: savedNav.seekerTab || 'careers',
  });
  const poppingHistoryRef = useRef(false);

  // SaaS Planos & Anúncios
  const [saasConfig, setSaasConfig] = useState<PlatformSaaSConfig>(() => getCachedPlatformConfig());
  const [partnerAds, setPartnerAds] = useState<PartnerAdBanner[]>(() => getCachedPartnerAds());
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertItem[]>([]);
  const { prefs: alertPrefs } = useAlertPrefs();
  const alertPrefsRef = useRef(alertPrefs);
  alertPrefsRef.current = alertPrefs;

  const subRef = useRef<RealtimeChannel | null>(null);
  const activeBarIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const seedingRecipesRef = useRef(false);

  const dedupeRecipes = (list: Recipe[]): Recipe[] => {
    const seen = new Map<string, Recipe>();
    for (const r of list) {
      const k = norm(r.name);
      if (!k) continue;
      const prev = seen.get(k);
      if (!prev || (!prev.image_url && r.image_url)) {
        seen.set(k, r);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const ensureExtendedRecipesSeeded = async (
    currentRecipes: Recipe[],
    uid: string
  ): Promise<Recipe[]> => {
    const cleanCurrent = dedupeRecipes(currentRecipes);
    if (seedingRecipesRef.current) return cleanCurrent;

    const existingNames = new Set(cleanCurrent.map((r) => norm(r.name)));
    const missing = EXTENDED_RECIPES.filter((sr) => !existingNames.has(norm(sr.name)));
    if (missing.length === 0) return cleanCurrent;

    seedingRecipesRef.current = true;
    const inserted: Recipe[] = [];
    try {
      const CHUNK = 30;
      for (let i = 0; i < missing.length; i += CHUNK) {
        const slice = missing.slice(i, i + CHUNK);
        const buildRows = (ownerId: string | null) =>
          slice.map((sr) => ({
            owner: ownerId,
            name: sr.name,
            category: sr.category,
            ingredients: sr.ingredients,
            steps: sr.steps,
            instructions: sr.steps,
            description: sr.description,
            story: sr.story,
            glass: sr.glass,
            technique: sr.technique,
            garnish: sr.garnish,
            shaken: sr.shaken,
            tags: sr.tags,
            author_nick: 'Meu Bar',
            is_public: true,
            verified: true,
          }));

        let res = await sb.from('recipes').insert(buildRows(null)).select('*');
        if (res.error) {
          res = await sb.from('recipes').insert(buildRows(uid)).select('*');
        }
        if (!res.error && res.data) {
          inserted.push(...(res.data as Recipe[]));
        }
      }
    } finally {
      seedingRecipesRef.current = false;
    }

    return inserted.length > 0 ? dedupeRecipes([...cleanCurrent, ...inserted]) : cleanCurrent;
  };

  const showToast = (t: string, category?: AlertCategoryKey) => {
    if (!canShowToast(category, alertPrefsRef.current)) return;
    setToastMsg(t);
    setTimeout(() => setToastMsg((prev) => (prev === t ? '' : prev)), 2500);
  };

  const toggleUiThemeMode = () => {
    const next: UiThemeMode = uiThemeModeRef.current === 'dark' ? 'light' : 'dark';
    setStoredUiThemeMode(next);
    uiThemeModeRef.current = next;
    setUiThemeMode(next);
    applyBarTheme(screenMode === 'bar' ? activeBar : null, next);
    showToast(next === 'light' ? '☀️ Modo diurno ativado' : '🌙 Modo noturno ativado');
  };

  useEffect(() => {
    if (isPublicStandaloneRoute || booting) return;
    try {
      const payload: PersistedNavState = {
        screenMode,
        workspaceMode,
        adminAreaTab,
        tab,
        seekerTab,
        queueStation,
        mgmtSubTab,
        studioInitialTab,
        careerMode,
        showSalesSite,
      };
      localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }
  }, [
    isPublicStandaloneRoute,
    booting,
    screenMode,
    workspaceMode,
    adminAreaTab,
    tab,
    seekerTab,
    queueStation,
    mgmtSubTab,
    studioInitialTab,
    careerMode,
    showSalesSite,
  ]);

  // Registra histórico de abas/telas visitadas para o botão Voltar retrátil e botão do celular
  useEffect(() => {
    if (isPublicStandaloneRoute || booting || !user) return;
    const prev = prevRouteRef.current;
    const changed =
      prev.screenMode !== screenMode ||
      prev.tab !== tab ||
      prev.seekerTab !== seekerTab;

    if (changed) {
      if (!poppingHistoryRef.current) {
        const stack = navHistoryRef.current;
        const last = stack[stack.length - 1];
        if (
          !last ||
          last.screenMode !== prev.screenMode ||
          last.tab !== prev.tab ||
          last.seekerTab !== prev.seekerTab
        ) {
          stack.push({ ...prev });
          if (stack.length > 30) stack.shift();
        }
      }
      poppingHistoryRef.current = false;
      prevRouteRef.current = { screenMode, tab, seekerTab };
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [isPublicStandaloneRoute, booting, user?.id, screenMode, tab, seekerTab]);

  // Atualiza perfil salvo de acesso rápido (nunca armazena senha!)
  useEffect(() => {
    if (isPublicStandaloneRoute || !user?.email) return;
    const next = saveQuickProfile({
      userId: user.id,
      email: user.email,
      displayName: profile.display_name || user.email.split('@')[0] || 'Usuário',
      avatarUrl: profile.avatar_url || undefined,
      barName: activeBar?.name || undefined,
    });
    setQuickProfile(next);
  }, [isPublicStandaloneRoute, user?.id, user?.email, profile.display_name, profile.avatar_url, activeBar?.name]);

  // Sincroniza contador de mensagens não lidas do Chat de Suporte
  useEffect(() => {
    if (isPublicStandaloneRoute || !user?.id) {
      setUnreadSupportCount(0);
      return;
    }
    const syncUnread = async () => {
      const res = await fetchStoreThreads(user.id, activeBar?.id || null);
      const total = res.threads.reduce((sum, t) => sum + (t.unread_for_store || 0), 0);
      setUnreadSupportCount(total);
    };
    void syncUnread();
    const unsub = subscribeSupportRealtime({
      onMessage: (m) => {
        if (m.sender_role === 'support') void syncUnread();
      },
      onThreadChange: () => void syncUnread(),
    });
    return unsub;
  }, [isPublicStandaloneRoute, user?.id, activeBar?.id]);

  const detectCurrentCoords = (force = false): Promise<UserCoords | null> => {
    if (!navigator.geolocation) return Promise.resolve(userCoords);
    if (userCoords && !force) return Promise.resolve(userCoords);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setUserCoords(next);
          resolve(next);
        },
        () => resolve(userCoords),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 60000 }
      );
    });
  };

  const isManager = role === 'owner' || role === 'dono' || role === 'gerente';
  const canEditMenu = role === 'owner' || role === 'dono' || role === 'gerente';
  const hasPricing = Boolean(activeBar && activeBar.kind !== 'home' && activeBar.kind !== 'casa');

  const refreshOrders = async (barId = activeBarIdRef.current) => {
    if (!barId) return;
    // Busca pedidos ativos OU ainda não pagos (para que pedidos entregues continuem no Caixa até serem pagos)
    let r = await sb
      .from('orders')
      .select('*')
      .eq('bar_id', barId)
      .or('status.neq.done,paid.eq.false')
      .order('created_at');

    if (r.error) {
      r = await sb
        .from('orders')
        .select('*')
        .eq('bar_id', barId)
        .neq('status', 'done')
        .order('created_at');
    }
    if (!r.error && r.data) {
      setOrders(r.data as Order[]);
    }
  };

  const refreshTableTabs = async (barId = activeBarIdRef.current) => {
    if (!barId) return;
    const r = await sb
      .from('table_tabs')
      .select('*')
      .eq('bar_id', barId)
      .eq('status', 'open')
      .order('created_at');
    if (!r.error && r.data) {
      const nextTabs = r.data as TableTab[];
      setTableTabs((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextTabs) ? prev : nextTabs
      );
    }
  };

  const silentSyncBarData = async (barId: string, uid?: string, mgr?: boolean) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const [r0, r1, r2, r3, r4] = await Promise.all([
      sb.from('bars').select('*').eq('id', barId).maybeSingle(),
      sb.from('bar_items').select('*').eq('bar_id', barId).order('name'),
      sb.from('recipes').select('*').order('name'),
      sb.from('bar_prices').select('recipe_id, price').eq('bar_id', barId),
      sb.from('bar_members').select('*').eq('bar_id', barId),
    ]);

    if (!r0.error && r0.data) {
      const nextBar = r0.data as Bar;
      setActiveBar((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(nextBar)) return prev;
        applyBarTheme(nextBar, uiThemeModeRef.current);
        return nextBar;
      });
    }
    if (!r1.error && r1.data) {
      const nextItems = r1.data as BarItem[];
      setItems((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextItems) ? prev : nextItems
      );
    }
    if (!r2.error && r2.data) {
      const nextRecipes = dedupeRecipes(r2.data as Recipe[]);
      setRecipes((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextRecipes) ? prev : nextRecipes
      );
    }
    if (!r3.error && r3.data) {
      const prMap: Record<string, number> = {};
      (r3.data as { recipe_id: string; price: number }[]).forEach((x) => {
        prMap[x.recipe_id] = Number(x.price);
      });
      setPrices((prev) =>
        JSON.stringify(prev) === JSON.stringify(prMap) ? prev : prMap
      );
    }
    if (!r4.error && r4.data) {
      const nextMem = r4.data as BarMember[];
      setMembers((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextMem) ? prev : nextMem
      );
    }

    await Promise.all([refreshOrders(barId), refreshTableTabs(barId)]);
    if (uid) {
      await loadJobsAndRequests(uid, barId, Boolean(mgr));
    }
  };

  const loadJobsAndRequests = async (
    uid: string,
    currentBarId: string | null,
    managerFlag: boolean
  ) => {
    // Dados públicos apenas para enriquecer nomes de vagas abertas (nunca exibidos no perfil de lojas do usuário)
    const PUBLIC_BAR_COLS =
      'id,name,handle,city,lat,lon,kind,logo_url,banner_url,slogan,phone,instagram,opening_hours,about,store_profile_data,color_bg,color_surface,color_accent,color_ok,color_text,name_font,crest_border,crest_base,crest_icon,crest_ornament,accepting_orders,created_at';
    let nextPublic: Bar[] = [];
    const rpcPub = await sb.rpc('list_public_bars');
    if (!rpcPub.error && Array.isArray(rpcPub.data)) {
      nextPublic = rpcPub.data as Bar[];
    } else {
      const pb = await sb
        .from('bars')
        .select(PUBLIC_BAR_COLS)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!pb.error && pb.data) {
        nextPublic = pb.data as Bar[];
      }
    }

    const publicById: Record<string, Bar> = {};
    nextPublic.forEach((b) => {
      publicById[b.id] = b;
    });

    const jr = await sb
      .from('job_posts')
      .select('*')
      .eq('is_open', true)
      .order('created_at', { ascending: false })
      .limit(80);
    const openJobs: JobPost[] = jr.error
      ? []
      : ((jr.data as JobPost[]) || []).map((j) => ({
          ...j,
          bars: publicById[j.bar_id] || j.bars || null,
        }));
    setJobs(openJobs);

    const ar = await sb.from('job_applications').select('*').eq('applicant_id', uid);
    setMyApps(ar.error ? [] : (ar.data as JobApplication[]) || []);

    const sr = await sb
      .from('service_requests')
      .select('*, bars(name, handle)')
      .eq('requester_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    setServiceReqs(sr.error ? [] : (sr.data as ServiceRequest[]) || []);

    if (currentBarId && managerFlag) {
      // Busca TODAS as vagas desta loja diretamente (abertas ou fechadas) sem limitar por 80 globais
      const bj = await sb
        .from('job_posts')
        .select('id, title, role_needed, is_open')
        .eq('bar_id', currentBarId);
      const barJobsList =
        (bj.data as { id: string; title: string; role_needed: string }[]) || [];
      const barJobIds = barJobsList.map((j) => j.id);
      const jobById: Record<string, { id: string; title: string; role_needed: string }> = {};
      barJobsList.forEach((j) => {
        jobById[j.id] = j;
      });

      if (barJobIds.length) {
        // Evita join PostgREST inválido entre job_applications e staff_profiles (sem FK direta)
        const ra = await sb
          .from('job_applications')
          .select('*')
          .in('job_id', barJobIds)
          .order('created_at', { ascending: false });
        const rawApps = (ra.data as JobApplication[]) || [];

        const applicantIds = Array.from(
          new Set(rawApps.map((a) => a.applicant_id).filter(Boolean))
        );
        const profById: Record<string, StaffProfile> = {};
        if (applicantIds.length) {
          const sp = await sb
            .from('staff_profiles')
            .select('*')
            .in('user_id', applicantIds);
          ((sp.data as StaffProfile[]) || []).forEach((p) => {
            profById[p.user_id] = p;
          });
        }

        const enrichedApps: JobApplication[] = rawApps.map((app) => ({
          ...app,
          job_posts: jobById[app.job_id] || app.job_posts || null,
          staff_profiles: profById[app.applicant_id] || app.staff_profiles || null,
        }));
        setReceivedApps(enrichedApps);
      } else {
        setReceivedApps([]);
      }
    } else {
      setReceivedApps([]);
    }
  };

  const openBar = async (
    bar: Bar,
    barRole: string,
    uid: string,
    preserveTab = false
  ) => {
    setActiveBar(bar);
    activeBarIdRef.current = bar.id;
    setRole(barRole);
    setItems([]);
    setOrders([]);
    setPrices({});
    setTableTabs([]);
    setSettledIds(new Set());
    localStorage.setItem('last_bar_' + uid, bar.id);
    applyBarTheme(bar, uiThemeModeRef.current);

    const [r1, r2, r3, r5] = await Promise.all([
      sb.from('bar_items').select('*').eq('bar_id', bar.id).order('name'),
      sb.from('recipes').select('*').order('name'),
      sb.from('bar_prices').select('recipe_id, price').eq('bar_id', bar.id),
      sb.from('bar_members').select('*').eq('bar_id', bar.id),
    ]);

    setItems((r1.data as BarItem[]) || []);
    const initialRecipes = dedupeRecipes((r2.data as Recipe[]) || []);
    setRecipes(initialRecipes);
    void ensureExtendedRecipesSeeded(initialRecipes, uid).then((seeded) => {
      setRecipes((prev) =>
        JSON.stringify(prev) === JSON.stringify(seeded) ? prev : seeded
      );
    });
    const prMap: Record<string, number> = {};
    ((r3.data as { recipe_id: string; price: number }[]) || []).forEach((x) => {
      prMap[x.recipe_id] = Number(x.price);
    });
    setPrices(prMap);
    setMembers((r5.data as BarMember[]) || []);

    await Promise.all([refreshOrders(bar.id), refreshTableTabs(bar.id)]);
    const mgr = barRole === 'owner' || barRole === 'dono' || barRole === 'gerente';
    await loadJobsAndRequests(uid, bar.id, mgr);

    if (!preserveTab) {
      if (barRole === 'cozinha') {
        setQueueStation('cozinha');
        setTab('queue');
      } else if (barRole === 'garcom') {
        setQueueStation('garcom');
        setTab('queue');
      } else if (barRole === 'barman') {
        setQueueStation('bar');
        setTab('queue');
      } else if (barRole === 'caixa') {
        setQueueStation('all');
        setTab('cashier');
      } else {
        setQueueStation('all');
        setTab('dashboard');
      }
    }
    setOwnerBypassStaffGate(false);
    setExclusiveCashierMode(false);
    setShowExitTerminalPin(false);
    setActiveStaffSessionState(getActiveStaffSession(bar.id));
    setScreenMode('bar');
  };

  const loadUserWorkspace = async (u: User) => {
    setLoadErr('');
    const profRes = await sb
      .from('staff_profiles')
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle();

    setProfile(
      (profRes.data as StaffProfile) || {
        user_id: u.id,
        display_name: (u.email || '').split('@')[0] || 'Profissional',
        avatar_url: '',
        resume_pdf_url: '',
        location: '',
        skills: [],
        work_mode: 'ambos',
        experience_years: 0,
        bio: '',
        availability: '',
      }
    );

    const own = await sb.from('bars').select('*').eq('owner', u.id);
    if (own.error) {
      setLoadErr(own.error.message);
      setBooting(false);
      return;
    }
    const mem = await sb.from('bar_members').select('role, name, bars(*)').eq('user_id', u.id);
    const map: Record<string, BarEntry> = {};
    // Garante estritamente que apenas lojas do próprio dono ou onde é membro apareçam
    ((own.data as Bar[]) || [])
      .filter((b) => b && b.owner === u.id)
      .forEach((b) => {
        map[b.id] = { bar: b, role: 'owner' };
      });
    (
      ((mem.data as unknown as { role: string; bars: Bar | null }[]) || [])
    ).forEach((m) => {
      if (m.bars && m.bars.id && !map[m.bars.id]) {
        map[m.bars.id] = { bar: m.bars, role: m.role };
      }
    });

    const list = Object.values(map);
    setBars(list);

    const persisted = loadPersistedNavState();
    const hasSavedTab = Boolean(persisted.tab && VALID_BAR_TABS.has(persisted.tab));

    if (list.length > 0 && persisted.screenMode !== 'seeker') {
      const savedBar = localStorage.getItem('last_bar_' + u.id);
      const pick = list.find((x) => x.bar.id === savedBar) || list[0];
      await openBar(pick.bar, pick.role, u.id, hasSavedTab);
      if (persisted.screenMode === 'onboarding') {
        setScreenMode('onboarding');
      }
    } else {
      applyBarTheme(null, uiThemeModeRef.current);
      setActiveBar(null);
      activeBarIdRef.current = null;
      setRole(null);
      await loadJobsAndRequests(u.id, null, false);
      setSeekerTab(persisted.seekerTab || 'careers');
      setScreenMode(persisted.screenMode === 'onboarding' ? 'onboarding' : 'seeker');
    }
    setBooting(false);
  };

  useEffect(() => {
    if (isPublicStandaloneRoute) return;
    void detectCurrentCoords();
    void Promise.all([loadPlatformConfig(), loadPartnerAds(false)]).then(([cfg, ads]) => {
      setSaasConfig(cfg);
      setPartnerAds(ads);
    });

    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      userIdRef.current = u?.id || null;
      if (!u) {
        applyBarTheme(null, uiThemeModeRef.current);
        setBooting(false);
      } else {
        void loadUserWorkspace(u);
      }
    });

    const { data: listener } = sb.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user || null;
      if ((u?.id || null) !== userIdRef.current) {
        userIdRef.current = u?.id || null;
        setUser(u);
        if (!u) {
          if (subRef.current) void sb.removeChannel(subRef.current);
          subRef.current = null;
          setActiveBar(null);
          activeBarIdRef.current = null;
          setBars([]);
          setWorkspaceMode('normal');
          setQuickLockActive(false);
          setAppLocked(false);
          applyBarTheme(null, uiThemeModeRef.current);
          setBooting(false);
        } else {
          setBooting(true);
          void loadUserWorkspace(u);
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      if (subRef.current) void sb.removeChannel(subRef.current);
    };
  }, [isPublicStandaloneRoute]);

  // Alertas em tempo real para o Super Admin quando uma nova conta é criada
  useEffect(() => {
    if (isPublicStandaloneRoute || !user || !isSuperAdmin(user.email)) {
      setAdminAlerts([]);
      return;
    }

    let mounted = true;
    void loadAdminNotifications().then((list) => {
      if (!mounted) return;
      setAdminAlerts(list);
      const unreadCount = list.filter((a) => !a.read).length;
      if (unreadCount > 0 && isAlertEnabled('adminNewAccount', alertPrefsRef.current)) {
        showToast(
          `🔔 ${unreadCount} nova(s) conta(s) criada(s) no Meu Bar!`,
          'adminNewAccount'
        );
      }
    });

    const handleIncomingAlert = (incoming: AdminAlertItem) => {
      if (!mounted || !incoming) return;
      setAdminAlerts((prev) => {
        if (
          prev.some(
            (x) =>
              x.id === incoming.id ||
              (incoming.user_email &&
                x.user_email === incoming.user_email &&
                Math.abs(
                  new Date(x.created_at).getTime() - new Date(incoming.created_at).getTime()
                ) < 15000)
          )
        ) {
          return prev;
        }
        if (isAlertEnabled('adminNewAccount', alertPrefsRef.current)) {
          playStationAlert('garcom', 'adminNewAccount');
          showToast(
            `🆕 Nova conta criada: ${incoming.user_email || incoming.title}!`,
            'adminNewAccount'
          );
        }
        return [incoming, ...prev].slice(0, 40);
      });
    };

    const adminCh = sb
      .channel('platform-admin-alerts')
      .on('broadcast', { event: 'new_user' }, (msg) => {
        const payload = msg?.payload as AdminAlertItem | undefined;
        if (payload) handleIncomingAlert(payload);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (p) => {
          const row = p.new as AdminAlertItem | undefined;
          if (row) handleIncomingAlert(row);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void sb.removeChannel(adminCh);
    };
  }, [isPublicStandaloneRoute, user?.id, user?.email]);

  useEffect(() => {
    if (isPublicStandaloneRoute || !user) return;
    if (!activeBar || screenMode === 'seeker') {
      const seekerPoll = setInterval(() => {
        if (document.hidden) return;
        void loadJobsAndRequests(user.id, null, false);
      }, 5000);
      return () => clearInterval(seekerPoll);
    }
    if (subRef.current) void sb.removeChannel(subRef.current);

    const ch = sb
      .channel('bar-' + activeBar.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'bar_id=eq.' + activeBar.id,
        },
        (p) => {
          if (p.eventType === 'INSERT') {
            playStationAlert(role === 'cozinha' ? 'cozinha' : 'bar', 'newOrders');
          } else if (
            p.eventType === 'UPDATE' &&
            (p.new as Order | undefined)?.status === 'ready'
          ) {
            playStationAlert('garcom', 'orderReady');
          }
          void refreshOrders(activeBar.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_tabs',
          filter: 'bar_id=eq.' + activeBar.id,
        },
        () => {
          void refreshTableTabs(activeBar.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_posts' },
        () => {
          void loadJobsAndRequests(user.id, activeBar.id, isManager);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_applications' },
        () => {
          void loadJobsAndRequests(user.id, activeBar.id, isManager);
        }
      )
      .subscribe();

    subRef.current = ch;

    const syncOffline = async () => {
      const sentCount = await flushOfflineOrders(activeBar.id);
      if (sentCount > 0) {
        showToast(
          `${sentCount} pedido(s) offline sincronizado(s) automaticamente!`,
          'offlineSync'
        );
        void refreshOrders(activeBar.id);
      }
    };
    void syncOffline();
    const onOnline = () => void syncOffline();
    window.addEventListener('online', onOnline);

    // Carrega chamados abertos de mesa (Chamar Garçom / Pedir a Conta) e ouve em tempo real
    void loadOpenTableCalls(activeBar.id).then((list) => setTableCalls(list));
    const callCh = sb
      .channel(`bar-calls-${activeBar.id}`)
      .on('broadcast', { event: 'table_call' }, (msg) => {
        const incoming = msg?.payload as TableCallAlert | undefined;
        if (!incoming || !incoming.id) return;
        if (isAlertEnabled('tableCalls', alertPrefsRef.current)) {
          playStationAlert('garcom', 'tableCalls');
          showToast(
            incoming.kind === 'bill'
              ? `🧾 ${incoming.table_label || incoming.client_name} pediu a conta${incoming.note ? ` (${incoming.note})` : ''}!`
              : `🙋 ${incoming.table_label || incoming.client_name} chamou o garçom!`,
            'tableCalls'
          );
        }
        setTableCalls((prev) =>
          prev.some((x) => x.id === incoming.id) ? prev : [incoming, ...prev]
        );
      })
      .on('broadcast', { event: 'table_call_resolved' }, (msg) => {
        const resolvedId = (msg?.payload as { id?: string } | undefined)?.id;
        if (!resolvedId) return;
        setTableCalls((prev) => prev.filter((x) => x.id !== resolvedId));
      })
      .on('broadcast', { event: 'bar_ops_sync' }, () => {
        void sb
          .from('bars')
          .select('*')
          .eq('id', activeBar.id)
          .single()
          .then((r) => {
            if (!r.error && r.data) {
              const fresh = r.data as Bar;
              setActiveBar(fresh);
              setBars((prev) =>
                prev.map((x) => (x.bar.id === fresh.id ? { ...x, bar: fresh } : x))
              );
            }
          });
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_calls',
          filter: 'bar_id=eq.' + activeBar.id,
        },
        (p) => {
          if (p.eventType === 'INSERT' && isAlertEnabled('tableCalls', alertPrefsRef.current)) {
            const c = p.new as TableCallAlert;
            playStationAlert('garcom', 'tableCalls');
            showToast(
              c.kind === 'bill'
                ? `🧾 ${c.table_label || c.client_name} pediu a conta!`
                : `🙋 ${c.table_label || c.client_name} chamou o garçom!`,
              'tableCalls'
            );
          }
          void loadOpenTableCalls(activeBar.id).then((list) => setTableCalls(list));
        }
      )
      .subscribe();

    // Checagem silenciosa de 5 em 5 segundos para todas as telas do bar
    const poll = setInterval(
      () => void silentSyncBarData(activeBar.id, user.id, isManager),
      5000
    );

    return () => {
      clearInterval(poll);
      window.removeEventListener('online', onOnline);
      void sb.removeChannel(ch);
      void sb.removeChannel(callCh);
      subRef.current = null;
    };
  }, [isPublicStandaloneRoute, activeBar?.id, isManager, user?.id, screenMode, role]);

  // Atualização em tempo real do perfil/funções do funcionário logado na loja
  const activeBarOpsForStaff = activeBar ? getBarOpsData(activeBar) : null;
  const liveStaffAccount =
    activeBar && activeStaffSession && activeBarOpsForStaff?.staff_login_enabled
      ? (activeBarOpsForStaff.staff_accounts || []).find(
          (a) => a.id === activeStaffSession.staffId && a.active
        ) || null
      : null;
  const liveStaffRolesKey = liveStaffAccount ? (liveStaffAccount.roles || []).join(',') : '';

  useEffect(() => {
    if (!activeBar || !activeStaffSession) return;
    if (!activeBarOpsForStaff?.staff_login_enabled) {
      clearActiveStaffSession(activeBar.id);
      setActiveStaffSessionState(null);
      return;
    }
    if (!liveStaffAccount) {
      clearActiveStaffSession(activeBar.id);
      setActiveStaffSessionState(null);
      showToast('Seu acesso de funcionário foi encerrado ou desativado pelo gerente.');
      return;
    }
    const allowed = getAllowedViewsForRoles(liveStaffAccount.roles || []);
    if (allowed.length === 0) {
      clearActiveStaffSession(activeBar.id);
      setActiveStaffSessionState(null);
      showToast('Nenhuma função ativa no seu perfil. Fale com o gerente.');
      return;
    }
    if (!allowed.some((v) => v.id === staffViewId)) {
      setStaffViewId(allowed[0].id);
    }
  }, [
    activeBar?.id,
    activeStaffSession?.staffId,
    activeBarOpsForStaff?.staff_login_enabled,
    liveStaffAccount?.id,
    liveStaffRolesKey,
    staffViewId,
  ]);

  // Proteção unificada do botão Voltar (Celular Android/iOS/PWA + Botão Voltar retrátil fixo)
  const navStateRef = useRef({
    user,
    showSalesSite,
    previewDisplayMode,
    workspaceMode,
    legalModal,
    seekerOverlay,
    standaloneModal,
    createDrinkMode,
    showShakers,
    showQr,
    makeDrinkRecipe,
    showSwitchBar,
    screenMode,
    activeBar,
    seekerTab,
    tab,
  });
  navStateRef.current = {
    user,
    showSalesSite,
    previewDisplayMode,
    workspaceMode,
    legalModal,
    seekerOverlay,
    standaloneModal,
    createDrinkMode,
    showShakers,
    showQr,
    makeDrinkRecipe,
    showSwitchBar,
    screenMode,
    activeBar,
    seekerTab,
    tab,
  };
  const lastBackExitRef = useRef(0);
  const lastBackTriggerRef = useRef(0);
  const exitingAppRef = useRef(false);

  const closeSalesSiteCleanly = () => {
    setShowSalesSite(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('site');
      url.searchParams.delete('vendas');
      window.history.replaceState({ meubarGuard: true }, '', url.toString());
    } catch {
      // ignore
    }
  };

  const triggerUnifiedBack = (fromPopState: boolean, allowExitPrompt: boolean) => {
    if (exitingAppRef.current) return;
    const now = Date.now();
    if (fromPopState && now - lastBackTriggerRef.current < 80) return;
    lastBackTriggerRef.current = now;

    const keepGuard = () => {
      if (!fromPopState) return;
      try {
        window.history.pushState({ meubarGuard: true }, '');
      } catch {
        // ignore
      }
    };

    // 1. Overlays internos (ex: Modo Canva, modal de loja ou caixa)
    const ev = new CustomEvent('meubar:back-intercept', { cancelable: true });
    if (!window.dispatchEvent(ev)) {
      keepGuard();
      return;
    }

    const st = navStateRef.current;

    // 2. Prévia em tela cheia da 2ª Tela / TV
    if (st.previewDisplayMode) {
      setPreviewDisplayMode(null);
      keepGuard();
      return;
    }

    // 3. Site de apresentação ("Conhecer o Meu Bar")
    if (st.showSalesSite) {
      closeSalesSiteCleanly();
      keepGuard();
      return;
    }

    // 4. Modais abertos
    if (st.legalModal) {
      setLegalModal(null);
      keepGuard();
      return;
    }
    if (st.seekerOverlay) {
      setSeekerOverlay(null);
      keepGuard();
      return;
    }
    if (st.standaloneModal) {
      setStandaloneModal(null);
      keepGuard();
      return;
    }
    if (st.createDrinkMode !== null) {
      setCreateDrinkMode(null);
      keepGuard();
      return;
    }
    if (st.showShakers) {
      setShowShakers(false);
      keepGuard();
      return;
    }
    if (st.showQr) {
      setShowQr(false);
      keepGuard();
      return;
    }
    if (st.makeDrinkRecipe) {
      setMakeDrinkRecipe(null);
      keepGuard();
      return;
    }
    if (st.showSwitchBar) {
      setShowSwitchBar(false);
      keepGuard();
      return;
    }

    // 5. Área ADM ou Central de Suporte -> volta ao Modo Normal
    if (st.workspaceMode !== 'normal') {
      setWorkspaceMode('normal');
      keepGuard();
      return;
    }

    // 6. Pilha real de navegação interna (volta exatamente para a tela anterior)
    if (st.user) {
      while (navHistoryRef.current.length > 0) {
        const prev = navHistoryRef.current.pop()!;
        const isSame =
          prev.screenMode === st.screenMode &&
          prev.tab === st.tab &&
          prev.seekerTab === st.seekerTab;
        if (isSame) continue;
        if (prev.screenMode === 'bar' && !st.activeBar) continue;
        poppingHistoryRef.current = true;
        if (prev.screenMode === 'bar' && st.activeBar) {
          applyBarTheme(st.activeBar, uiThemeModeRef.current);
        } else if (prev.screenMode === 'seeker') {
          applyBarTheme(null, uiThemeModeRef.current);
        }
        setScreenMode(prev.screenMode);
        setTab(prev.tab);
        setSeekerTab(prev.seekerTab);
        keepGuard();
        return;
      }

      // 7. Fallback hierárquico -> garante que nunca sai do app se não estiver na raiz
      if (st.screenMode === 'onboarding') {
        if (st.activeBar) {
          applyBarTheme(st.activeBar, uiThemeModeRef.current);
          setScreenMode('bar');
        } else {
          setScreenMode('seeker');
        }
        keepGuard();
        return;
      }
      if (st.screenMode === 'seeker' && st.seekerTab !== 'careers') {
        setSeekerTab('careers');
        keepGuard();
        return;
      }
      if (st.screenMode === 'bar') {
        if (
          [
            'cashier',
            'delivery',
            'prices',
            'studio',
            'careers',
            'catalog',
            'management',
            'plans',
            'superadmin',
            'alerts',
            'support',
          ].includes(st.tab)
        ) {
          setTab('more');
          keepGuard();
          return;
        }
        if (st.tab !== 'dashboard') {
          setTab('dashboard');
          keepGuard();
          return;
        }
      }
    }

    if (!allowExitPrompt) return;

    // 8. Já está na tela raiz: exige duplo clique para sair (sem risco de fechar sem querer)
    if (now - lastBackExitRef.current < 2200) {
      exitingAppRef.current = true;
      const capApp = (
        window as unknown as {
          Capacitor?: { Plugins?: { App?: { exitApp?: () => void } } };
        }
      ).Capacitor?.Plugins?.App;
      if (capApp?.exitApp) {
        capApp.exitApp();
      } else {
        window.history.back();
      }
      return;
    }

    lastBackExitRef.current = now;
    showToast('Pressione voltar novamente para sair do Meu Bar');
    keepGuard();
  };

  useEffect(() => {
    if (isPublicStandaloneRoute) return;

    try {
      if (!window.history.state || !window.history.state.meubarGuard) {
        window.history.pushState({ meubarGuard: true }, '');
      }
    } catch {
      // ignore history errors
    }

    const onPopState = () => triggerUnifiedBack(true, true);
    window.addEventListener('popstate', onPopState);

    let capRemove: (() => void) | null = null;
    const capApp = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener?: (
                ev: string,
                cb: () => void
              ) => Promise<{ remove: () => void }> | { remove: () => void };
            };
          };
        };
      }
    ).Capacitor?.Plugins?.App;

    if (capApp?.addListener) {
      const handle = capApp.addListener('backButton', () => triggerUnifiedBack(false, true));
      if (handle && typeof (handle as Promise<{ remove: () => void }>).then === 'function') {
        void (handle as Promise<{ remove: () => void }>).then((l) => {
          capRemove = () => l.remove();
        });
      } else if (handle && typeof (handle as { remove: () => void }).remove === 'function') {
        capRemove = () => (handle as { remove: () => void }).remove();
      }
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (capRemove) capRemove();
    };
  }, [isPublicStandaloneRoute]);

  if (isDisplayRoute) {
    return (
      <>
        <OfflineIndicator />
        <SecondScreenDisplay
          barId={menuBarParam || ''}
          mode={displayParam as DisplayMode}
          initialStation={
            stationParam === 'bar' || stationParam === 'cozinha' ? stationParam : 'all'
          }
        />
      </>
    );
  }

  if (isMenuRoute) {
    return (
      <>
        <OfflineIndicator />
        <MenuPage barId={menuBarParam || ''} mesa={mesaParam} initialMode={modeParam} />
      </>
    );
  }

  if (booting) {
    return (
      <>
        <OfflineIndicator />
        <div className="gate">
          <p className="mu">Carregando Meu Bar…</p>
        </div>
      </>
    );
  }

  if (loadErr) {
    return (
      <>
        <OfflineIndicator />
        <div className="gate">
          <h1>Erro ao carregar seus bares</h1>
          <p className="mu">{loadErr}</p>
          <button
            type="button"
            className="b mt-4.5"
            onClick={() => user && void loadUserWorkspace(user)}
          >
            Tentar de novo
          </button>
        </div>
      </>
    );
  }

  if (showSalesSite) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <FloatingBackButton
          visible={true}
          darkSurface={true}
          topOffset={74}
          label={user ? 'Voltar ao painel' : 'Voltar ao login'}
          onBack={closeSalesSiteCleanly}
        />
        <SalesLandingPage
          saasConfig={saasConfig}
          isLoggedIn={Boolean(user)}
          onEnterApp={closeSalesSiteCleanly}
          onOpenLegal={(t) => setLegalModal(t)}
        />
        {legalModal && (
          <LegalDocsModal initialTab={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </>
    );
  }

  if (!user) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <LoginScreen
          saasConfig={saasConfig}
          partnerAds={partnerAds}
          onOpenLegal={(t) => setLegalModal(t)}
          onOpenSalesSite={() => setShowSalesSite(true)}
        />
        {legalModal && (
          <LegalDocsModal initialTab={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </>
    );
  }

  // Tela de desbloqueio rápido por biometria / PIN (quando bloqueado)
  const handleLockApp = () => {
    setQuickLockActive(true);
    setAppLocked(true);
  };
  const handleUnlockApp = () => {
    setQuickLockActive(false);
    setAppLocked(false);
  };

  if (appLocked && quickProfile) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <QuickLockScreen
          profile={quickProfile}
          onUnlocked={handleUnlockApp}
          onSwitchAccount={async () => {
            setQuickLockActive(false);
            setAppLocked(false);
            await sb.auth.signOut();
          }}
        />
      </>
    );
  }

  // Prévia em tela cheia de Segunda Tela / TV de Fila aberta pelo Caixa
  if (previewDisplayMode && activeBar) {
    return (
      <>
        <OfflineIndicator />
        <SecondScreenDisplay
          barId={activeBar.id}
          mode={previewDisplayMode}
          onExit={() => setPreviewDisplayMode(null)}
        />
      </>
    );
  }

  const queueCount = orders.filter((o) => o.status !== 'done').length;
  const unpricedCount = activeBar
    ? getUnpricedAvailableDrinks(recipes, items, prices, activeBar).length
    : 0;
  const actorName = profile.display_name || user.email?.split('@')[0] || 'Equipe';
  const isPlatformAdmin = isSuperAdmin(user.email);
  const isSupportAgent = isSupportStaff(user.email, saasConfig);
  const adminNewAccountAlertOn = isAlertEnabled('adminNewAccount', alertPrefs);
  const unreadAdminAlerts = adminNewAccountAlertOn
    ? adminAlerts.filter((a) => !a.read).length
    : 0;
  const visibleTableCalls = isAlertEnabled('tableCalls', alertPrefs) ? tableCalls : [];
  const seekerAlertSummary = getAlertPrefsSummary(alertPrefs, isPlatformAdmin);
  const hasExplicitBarOverride = Boolean(
    activeBar?.id && saasConfig.bar_plan_overrides?.[activeBar.id]
  );
  const planStatus = getBarPlanStatus(activeBar, user.email, saasConfig, {
    ignoreAdminAutoVip: hasExplicitBarOverride,
  });

  const handleBarPlanChanged = (
    barId: string,
    tier: BarPlanTier,
    expiresAt: string | null,
    trialEndsAt: string | null,
    note: string | null
  ) => {
    const patch = (b: Bar): Bar =>
      b.id === barId
        ? {
            ...b,
            plan_tier: tier,
            plan_expires_at: expiresAt,
            trial_ends_at: trialEndsAt,
            plan_note: note,
          }
        : b;
    setActiveBar((prev) => (prev ? patch(prev) : prev));
    setBars((prev) => prev.map((x) => ({ ...x, bar: patch(x.bar) })));
  };

  const openSupportChat = (prefill?: string) => {
    if (prefill) setSupportPrefill(prefill);
    if (screenMode === 'bar' && activeBar) {
      setWorkspaceMode('normal');
      setTab('support');
    } else {
      setWorkspaceMode('normal');
      setSeekerOverlay('support');
    }
  };

  const handleMarkAdminAlertsRead = async (ids?: string[]) => {
    setAdminAlerts((prev) =>
      prev.map((a) => (!ids || ids.includes(a.id) ? { ...a, read: true } : a))
    );
    await markAdminNotificationsRead(ids);
  };
  const supportWhatsAppHref = buildWhatsAppLink(
    saasConfig.support_whatsapp,
    `Olá! Preciso de ajuda no Meu Bar${activeBar ? ` (${activeBar.name})` : ''}.`
  );

  // ÁREA ADM SEPARADA (somente Super Admin)
  if (workspaceMode === 'admin' && isPlatformAdmin) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <FloatingBackButton
          visible={true}
          label="Voltar ao Modo Normal"
          onBack={() => setWorkspaceMode('normal')}
        />
        <div>
          <div className="top">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-extrabold tracking-tight truncate">
                👑 Área ADM · Meu Bar
              </span>
            </div>
            <div className="row">
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              {quickProfile?.biometricEnabled && (
                <button
                  type="button"
                  className="bar-switcher-pill"
                  title="Bloquear aplicativo"
                  onClick={handleLockApp}
                >
                  🔒
                </button>
              )}
              <button
                type="button"
                className="bar-switcher-pill !border-[var(--ok)]/60"
                onClick={() => setWorkspaceMode('normal')}
              >
                🍸 Modo Normal
              </button>
              <button
                type="button"
                className="lnk"
                onClick={() => void sb.auth.signOut()}
              >
                Sair
              </button>
            </div>
          </div>

          <div className="w pt-12">
            <SuperAdminView
              userId={user.id}
              userEmail={user.email}
              actorName={actorName}
              config={saasConfig}
              adminAlerts={adminAlerts}
              controlledTab={adminAreaTab}
              hideInternalNav={true}
              onTabChange={setAdminAreaTab}
              onMarkAlertsRead={handleMarkAdminAlertsRead}
              onOpenAlertSettings={() => {
                setWorkspaceMode('normal');
                if (activeBar) setTab('alerts');
                else setSeekerOverlay('alerts');
              }}
              onConfigUpdated={setSaasConfig}
              onBarPlanChanged={handleBarPlanChanged}
              onAdsUpdated={setPartnerAds}
              onToast={showToast}
            />
          </div>

          <nav className="bnav">
            <button
              type="button"
              className={`bnav-btn ${adminAreaTab === 'accounts' ? 'on' : ''}`}
              onClick={() => setAdminAreaTab('accounts')}
            >
              <span className="ico">👥</span>
              <span>Contas{unreadAdminAlerts > 0 ? ` (${unreadAdminAlerts})` : ''}</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${adminAreaTab === 'stores' ? 'on' : ''}`}
              onClick={() => setAdminAreaTab('stores')}
            >
              <span className="ico">🏪</span>
              <span>Lojas</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${adminAreaTab === 'support' ? 'on' : ''}`}
              onClick={() => setAdminAreaTab('support')}
            >
              <span className="ico">💬</span>
              <span>Suporte</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${
                adminAreaTab === 'partners' || adminAreaTab === 'adsense' ? 'on' : ''
              }`}
              onClick={() =>
                setAdminAreaTab(adminAreaTab === 'partners' ? 'adsense' : 'partners')
              }
            >
              <span className="ico">📣</span>
              <span>Anúncios</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${adminAreaTab === 'simulator' ? 'on' : ''}`}
              onClick={() => setAdminAreaTab('simulator')}
            >
              <span className="ico">🧪</span>
              <span>Simulador</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${adminAreaTab === 'sales' ? 'on' : ''}`}
              onClick={() => setAdminAreaTab('sales')}
            >
              <span className="ico">⚙️</span>
              <span>SaaS</span>
            </button>
          </nav>
        </div>
      </>
    );
  }

  // CENTRAL DE SUPORTE SEPARADA (Equipe delegada de suporte)
  if (workspaceMode === 'support' && isSupportAgent) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <FloatingBackButton
          visible={true}
          label="Voltar ao Modo Normal"
          onBack={() => setWorkspaceMode('normal')}
        />
        <div>
          <div className="top">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-extrabold tracking-tight truncate">
                🎧 Central de Suporte · Meu Bar
              </span>
            </div>
            <div className="row">
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              {quickProfile?.biometricEnabled && (
                <button
                  type="button"
                  className="bar-switcher-pill"
                  title="Bloquear aplicativo"
                  onClick={handleLockApp}
                >
                  🔒
                </button>
              )}
              <button
                type="button"
                className="bar-switcher-pill !border-[var(--ok)]/60"
                onClick={() => setWorkspaceMode('normal')}
              >
                🍸 Modo Normal
              </button>
              <button
                type="button"
                className="lnk"
                onClick={() => void sb.auth.signOut()}
              >
                Sair
              </button>
            </div>
          </div>

          <div className="w pt-12">
            <SupportDeskView
              userId={user.id}
              userEmail={user.email}
              actorName={actorName}
              config={saasConfig}
              canManageTeam={isPlatformAdmin}
              onConfigUpdated={setSaasConfig}
              onToast={showToast}
            />
          </div>
        </div>
      </>
    );
  }

  // Determina quando o botão Voltar retrátil fixo deve aparecer e qual rótulo contextual usar
  const floatingBackInfo = (() => {
    if (legalModal) return { show: true, label: 'Fechar documento' };
    if (seekerOverlay) return { show: true, label: 'Voltar' };
    if (standaloneModal) return { show: true, label: 'Voltar' };
    if (
      createDrinkMode !== null ||
      showShakers ||
      showQr ||
      makeDrinkRecipe ||
      showSwitchBar
    ) {
      return { show: true, label: 'Fechar' };
    }
    if (screenMode === 'onboarding') {
      return { show: true, label: activeBar ? `Voltar p/ ${activeBar.name}` : 'Voltar' };
    }
    if (screenMode === 'seeker' || !activeBar) {
      if (seekerTab !== 'careers') return { show: true, label: 'Voltar para Vagas' };
      return { show: false, label: 'Voltar' };
    }
    if (tab !== 'dashboard') {
      const moreSubTabs = new Set([
        'cashier',
        'delivery',
        'prices',
        'studio',
        'careers',
        'catalog',
        'management',
        'plans',
        'superadmin',
        'alerts',
        'support',
      ]);
      return {
        show: true,
        label: moreSubTabs.has(tab) ? 'Voltar para Mais' : 'Voltar ao Resumo',
      };
    }
    return { show: false, label: 'Voltar' };
  })();

  return (
    <>
      <OfflineIndicator />
      {toastMsg && <div className="toast">{toastMsg}</div>}
      <FloatingBackButton
        visible={floatingBackInfo.show}
        label={floatingBackInfo.label}
        onBack={() => triggerUnifiedBack(false, false)}
      />

      {screenMode === 'onboarding' ? (
        <OnboardingScreen
          userId={user.id}
          profile={profile}
          jobs={jobs}
          bars={bars}
          userCoords={userCoords}
          hasExistingBars={bars.length > 0}
          onPickBar={async (b, r) => {
            await openBar(b, r, user.id);
          }}
          onDetectCoords={() => detectCurrentCoords(true)}
          onGoSeeker={() => {
            applyBarTheme(null, uiThemeModeRef.current);
            setActiveBar(null);
            activeBarIdRef.current = null;
            setSeekerTab('careers');
            setScreenMode('seeker');
          }}
          onBarCreated={async () => {
            await loadUserWorkspace(user);
          }}
          onOpenStandalone={(jobsFirst) =>
            setStandaloneModal(jobsFirst ? 'jobs' : 'profile')
          }
          onRefreshJobs={() => loadJobsAndRequests(user.id, null, false)}
          onBackToApp={
            activeBar
              ? () => {
                  applyBarTheme(activeBar, uiThemeModeRef.current);
                  setScreenMode('bar');
                }
              : undefined
          }
          onToast={showToast}
        />
      ) : screenMode === 'seeker' || !activeBar ? (
        <div>
          <div className="top">
            <BrandMark />
            <div className="row">
              {isPlatformAdmin && (
                <button
                  type="button"
                  className="bar-switcher-pill !border-[var(--ac)]/60"
                  onClick={() => {
                    setAdminAreaTab('accounts');
                    setWorkspaceMode('admin');
                  }}
                >
                  👑 Área ADM{unreadAdminAlerts > 0 ? ` (${unreadAdminAlerts})` : ''}
                </button>
              )}
              {!isPlatformAdmin && isSupportAgent && (
                <button
                  type="button"
                  className="bar-switcher-pill !border-[var(--ok)]/60"
                  onClick={() => setWorkspaceMode('support')}
                >
                  🎧 Suporte
                </button>
              )}
              <button
                type="button"
                className="bar-switcher-pill"
                title="Chat direto com o suporte"
                onClick={() => openSupportChat()}
              >
                💬{unreadSupportCount > 0 ? ` ${unreadSupportCount}` : ''}
              </button>
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              {quickProfile?.biometricEnabled && (
                <button
                  type="button"
                  className="bar-switcher-pill"
                  title="Bloquear aplicativo"
                  onClick={handleLockApp}
                >
                  🔒
                </button>
              )}
              <button
                type="button"
                className="bar-switcher-pill"
                title="Configurar alertas do app"
                onClick={() => setSeekerOverlay('alerts')}
              >
                {seekerAlertSummary.isMuted ? '🔕' : '🔔'}
              </button>
              <PWAInstallButton variant="pill" />
              <button
                type="button"
                className="lnk"
                onClick={() => void sb.auth.signOut()}
              >
                Sair
              </button>
            </div>
          </div>

          <div className={`w ${floatingBackInfo.show ? 'pt-12' : ''}`}>
            {seekerTab === 'careers' && (
              <CareersView
                mode="personal"
                isManager={false}
                activeBar={null}
                bars={bars}
                members={members}
                jobs={jobs}
                myApps={myApps}
                receivedApps={receivedApps}
                serviceReqs={serviceReqs}
                profile={profile}
                userId={user.id}
                userCoords={userCoords}
                onDetectCoords={() => detectCurrentCoords(true)}
                onMembersUpdated={setMembers}
                onProfileSaved={setProfile}
                onRefreshJobs={() => loadJobsAndRequests(user.id, null, false)}
                onUsePersonal={() => setSeekerTab('careers')}
                onOpenBar={async (b, r) => {
                  await openBar(b, r, user.id);
                }}
                onGoStudio={() => {}}
                onBack={() => {}}
                onToast={showToast}
              />
            )}
            {seekerTab === 'profile' && (
              <div>
                <h1>Meu currículo</h1>
                <ProfileSection
                  profile={profile}
                  userId={user.id}
                  userCoords={userCoords}
                  onDetectCoords={() => detectCurrentCoords(true)}
                  onProfileSaved={setProfile}
                  onToast={showToast}
                />
              </div>
            )}
            {seekerTab === 'explore' && (
              <>
                <ExploreBarsView
                  jobs={jobs}
                  publicBars={bars.map((x) => x.bar)}
                  myApps={myApps}
                  profile={profile}
                  userId={user.id}
                  userCoords={userCoords}
                  onOpenBar={(selected) => {
                    const found = bars.find((x) => x.bar.id === selected.id);
                    if (found) void openBar(found.bar, found.role, user.id);
                  }}
                  onRefreshJobs={() => loadJobsAndRequests(user.id, null, false)}
                  onGoProfile={() => setSeekerTab('profile')}
                  onToast={showToast}
                />
                <AdSlot
                  placement="explore"
                  showAds={!isPlatformAdmin}
                  config={saasConfig}
                  partnerAds={partnerAds}
                  onUpgradeClick={() => setSeekerOverlay('plans')}
                />
              </>
            )}
            {seekerTab === 'createbar' && (
              <div>
                <h1>Meu bar</h1>
                <p className="mu">
                  Entre direto em um dos seus bares conectados ou crie/solicite acesso a um novo bar.
                </p>

                {bars.length > 0 && (
                  <div className="panel" style={{ marginBottom: 14 }}>
                    <h2 style={{ marginTop: 0 }}>🏪 Meus bares conectados ({bars.length})</h2>
                    <p className="mu text-[12px] mb-2">
                      Toque em um bar para entrar direto no painel operacional.
                    </p>
                    <div className="list">
                      {bars.map((x) => (
                        <div key={x.bar.id} className="item">
                          <div className="row" style={{ gap: 10 }}>
                            {x.bar.logo_url ? (
                              <img
                                src={x.bar.logo_url}
                                alt={x.bar.name}
                                className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg shrink-0">
                                🍸
                              </div>
                            )}
                            <div>
                              <b>{x.bar.name}</b>
                              <small>
                                {x.bar.handle ? `@${x.bar.handle} · ` : ''}
                                {x.role === 'owner' ? 'Dono' : x.role}
                                {x.bar.city ? ` · ${x.bar.city}` : ''}
                              </small>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="b sm"
                            onClick={() => void openBar(x.bar, x.role, user.id)}
                          >
                            Entrar →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="panel">
                  <h2 style={{ marginTop: 0 }}>➕ Novo bar ou conectar por @</h2>
                  <p className="mu text-[12px] mb-3">
                    Crie um novo estabelecimento ou entre em outra loja usando @handle e senha de serviço.
                  </p>
                  <button
                    type="button"
                    className="b full"
                    onClick={() => setScreenMode('onboarding')}
                  >
                    Criar bar ou entrar com @ + senha
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav className="bnav">
            <button
              type="button"
              className={`bnav-btn ${seekerTab === 'careers' ? 'on' : ''}`}
              onClick={() => setSeekerTab('careers')}
            >
              <span className="ico">💼</span>
              <span>Vagas</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${seekerTab === 'profile' ? 'on' : ''}`}
              onClick={() => setSeekerTab('profile')}
            >
              <span className="ico">📄</span>
              <span>Currículo</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${seekerTab === 'explore' ? 'on' : ''}`}
              onClick={() => setSeekerTab('explore')}
            >
              <span className="ico">🏪</span>
              <span>Minhas lojas</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${seekerTab === 'createbar' ? 'on' : ''}`}
              onClick={() => setSeekerTab('createbar')}
            >
              <span className="ico">🏠</span>
              <span>Meu bar</span>
            </button>
          </nav>
        </div>
      ) : activeBarOpsForStaff?.staff_login_enabled &&
        !liveStaffAccount &&
        !ownerBypassStaffGate ? (
        <div>
          <div className="top">
            <BrandMark bar={activeBar} />
            <div className="row">
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                type="button"
                className="lnk"
                onClick={() => void sb.auth.signOut()}
              >
                Sair
              </button>
            </div>
          </div>
          <StaffLoginGate
            bar={activeBar}
            isAccountOwnerOrManager={isManager}
            onStaffAuthenticated={(staff) => {
              const sess = setActiveStaffSession(activeBar.id, staff);
              setActiveStaffSessionState(sess);
              const allowed = getAllowedViewsForRoles(staff.roles || []);
              if (allowed[0]) setStaffViewId(allowed[0].id);
            }}
            onEnterOwnerPanel={() => setOwnerBypassStaffGate(true)}
            onSwitchBar={() => setShowSwitchBar(true)}
            onToast={showToast}
          />
          {showSwitchBar && (
            <SwitchBarModal
              bars={bars}
              activeBar={activeBar}
              userCoords={userCoords}
              onDetectCoords={() => detectCurrentCoords(true)}
              onPickBar={async (b, r) => {
                await openBar(b, r, user.id);
              }}
              onBarUpdated={(updated) => {
                if (activeBar?.id === updated.id) {
                  setActiveBar(updated);
                  applyBarTheme(updated, uiThemeModeRef.current);
                }
                setBars((prev) =>
                  prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                );
              }}
              onNewBar={() => setScreenMode('onboarding')}
              onClose={() => setShowSwitchBar(false)}
              onToast={showToast}
            />
          )}
        </div>
      ) : liveStaffAccount && !liveStaffAccount.roles.includes('gerente') ? (
        (() => {
          const allowedViews = getAllowedViewsForRoles(liveStaffAccount.roles || []);
          const currentView =
            allowedViews.find((v) => v.id === staffViewId) || allowedViews[0] || null;
          const staffDisplayName = `${liveStaffAccount.name} (@${liveStaffAccount.username})`;
          const handleBarPatch = (updated: Bar) => {
            setActiveBar(updated);
            setBars((prev) =>
              prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
            );
          };

          return (
            <div>
              <div className="top">
                <div className="flex items-center gap-2 min-w-0">
                  <BrandMark bar={activeBar} />
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--s2)] border border-[var(--bd)] truncate">
                    👤 {liveStaffAccount.name}
                  </span>
                </div>
                <div className="row">
                  <button
                    type="button"
                    className="bar-switcher-pill"
                    title={
                      uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'
                    }
                    onClick={toggleUiThemeMode}
                  >
                    {uiThemeMode === 'dark' ? '☀️' : '🌙'}
                  </button>
                  <button
                    type="button"
                    className="bar-switcher-pill !border-[var(--ac)]/60"
                    onClick={() => {
                      clearActiveStaffSession(activeBar.id);
                      setActiveStaffSessionState(null);
                      setOwnerBypassStaffGate(false);
                      showToast('Sessão do funcionário encerrada.');
                    }}
                  >
                    🔄 Trocar funcionário
                  </button>
                </div>
              </div>

              <div className="w">
                <div className="panel !py-2.5 !px-3 mb-3 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="mu">Suas funções ativas:</span>
                    {liveStaffAccount.roles.map((rk) => {
                      const meta = STAFF_ROLE_BY_KEY[rk];
                      return (
                        <span key={rk} className="chip on !py-0.5 !px-2 !text-[11px]">
                          {meta ? `${meta.icon} ${meta.shortLabel}` : rk}
                        </span>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    ● Sincronizado em tempo real
                  </span>
                </div>

                {currentView?.id === 'station_garcom' && (
                  <QueueView
                    bar={activeBar}
                    role="garcom"
                    actorName={staffDisplayName}
                    members={members}
                    orders={orders}
                    recipes={recipes}
                    items={items}
                    prices={prices}
                    tableTabs={tableTabs}
                    tableCalls={visibleTableCalls}
                    defaultStation="garcom"
                    lockedStation="garcom"
                    onItemsChange={setItems}
                    onResolveCall={async (callId) => {
                      setTableCalls((prev) => prev.filter((x) => x.id !== callId));
                      await resolveTableCall(activeBar.id, callId);
                      showToast('Chamado marcado como atendido!');
                    }}
                    onBarUpdated={handleBarPatch}
                    onRefreshOrders={() => refreshOrders(activeBar.id)}
                    onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                    onSelectRecipe={setMakeDrinkRecipe}
                    onToast={showToast}
                  />
                )}

                {currentView?.id === 'station_bar' && (
                  <QueueView
                    bar={activeBar}
                    role="barman"
                    actorName={staffDisplayName}
                    members={members}
                    orders={orders}
                    recipes={recipes}
                    items={items}
                    prices={prices}
                    tableTabs={tableTabs}
                    tableCalls={visibleTableCalls}
                    defaultStation="bar"
                    lockedStation="bar"
                    onItemsChange={setItems}
                    onBarUpdated={handleBarPatch}
                    onRefreshOrders={() => refreshOrders(activeBar.id)}
                    onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                    onSelectRecipe={setMakeDrinkRecipe}
                    onToast={showToast}
                  />
                )}

                {currentView?.id === 'station_cozinha' && (
                  <QueueView
                    bar={activeBar}
                    role="cozinha"
                    actorName={staffDisplayName}
                    members={members}
                    orders={orders}
                    recipes={recipes}
                    items={items}
                    prices={prices}
                    tableTabs={tableTabs}
                    tableCalls={visibleTableCalls}
                    defaultStation="cozinha"
                    lockedStation="cozinha"
                    onItemsChange={setItems}
                    onBarUpdated={handleBarPatch}
                    onRefreshOrders={() => refreshOrders(activeBar.id)}
                    onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                    onSelectRecipe={setMakeDrinkRecipe}
                    onToast={showToast}
                  />
                )}

                {currentView?.id === 'terminal_caixa' && (
                  <CashierProView
                    bar={activeBar}
                    role="caixa"
                    actorName={staffDisplayName}
                    orders={orders}
                    tableTabs={tableTabs}
                    tableCalls={visibleTableCalls}
                    recipes={recipes}
                    items={items}
                    prices={prices}
                    hasPricing={hasPricing}
                    settledIds={settledIds}
                    exclusiveTerminalMode={true}
                    onSettled={(ids) => {
                      const next = new Set(settledIds);
                      ids.forEach((id) => next.add(id));
                      setSettledIds(next);
                    }}
                    onBarUpdated={handleBarPatch}
                    onRefreshOrders={() => refreshOrders(activeBar.id)}
                    onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                    onResolveCall={async (callId) => {
                      setTableCalls((prev) => prev.filter((x) => x.id !== callId));
                      await resolveTableCall(activeBar.id, callId);
                      showToast('Chamado marcado como atendido!');
                    }}
                    onOpenDisplayMode={(m) => setPreviewDisplayMode(m)}
                    onBackMore={() => {}}
                    onToast={showToast}
                  />
                )}

                {currentView?.id === 'delivery' && (
                  <DeliveryProView
                    bar={activeBar}
                    role="garcom"
                    actorName={staffDisplayName}
                    orders={orders}
                    recipes={recipes}
                    prices={prices}
                    onBarUpdated={handleBarPatch}
                    onRefreshOrders={() => refreshOrders(activeBar.id)}
                    onBackMore={() => {}}
                    onToast={showToast}
                  />
                )}

                {currentView?.id === 'stock' && (
                  <StockView
                    bar={activeBar}
                    items={items}
                    recipes={recipes}
                    prices={prices}
                    canEditMenu={false}
                    hasPricing={hasPricing}
                    onItemsChange={setItems}
                    onBarUpdated={handleBarPatch}
                    onGoPrices={() => showToast('Preços são gerenciados pelo Dono/Gerente.')}
                    onToast={showToast}
                  />
                )}
              </div>

              {allowedViews.length > 1 && (
                <nav className="bnav">
                  {allowedViews.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`bnav-btn ${currentView?.id === v.id ? 'on' : ''}`}
                      onClick={() => setStaffViewId(v.id)}
                    >
                      <span className="ico">{v.icon}</span>
                      <span>{v.label}</span>
                    </button>
                  ))}
                </nav>
              )}

              {makeDrinkRecipe && (
                <MakeDrinkModal
                  recipe={makeDrinkRecipe}
                  bar={activeBar}
                  items={items}
                  prices={prices}
                  orders={orders}
                  tableTabs={tableTabs}
                  onClose={() => setMakeDrinkRecipe(null)}
                  onOrderCreated={() => refreshOrders(activeBar.id)}
                  onToast={showToast}
                />
              )}
            </div>
          );
        })()
      ) : exclusiveCashierMode ? (
        <div>
          <div className="top">
            <div className="flex items-center gap-2 min-w-0">
              <BrandMark bar={activeBar} />
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0">
                💵 Terminal Caixa
              </span>
            </div>
            <div className="row">
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                type="button"
                className="bar-switcher-pill !border-amber-400/60"
                onClick={() => {
                  if (hasStoreManagerPin(activeBar)) {
                    setExitTerminalPin('');
                    setExitTerminalErr('');
                    setShowExitTerminalPin(true);
                  } else {
                    setExclusiveCashierMode(false);
                  }
                }}
              >
                🔓 Sair do Terminal
              </button>
            </div>
          </div>

          <div className="w">
            <CashierProView
              bar={activeBar}
              role={role}
              actorName={actorName}
              orders={orders}
              tableTabs={tableTabs}
              tableCalls={visibleTableCalls}
              recipes={recipes}
              items={items}
              prices={prices}
              hasPricing={hasPricing}
              settledIds={settledIds}
              exclusiveTerminalMode={true}
              onSettled={(ids) => {
                const next = new Set(settledIds);
                ids.forEach((id) => next.add(id));
                setSettledIds(next);
              }}
              onBarUpdated={(updated) => {
                setActiveBar(updated);
                setBars((prev) =>
                  prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                );
              }}
              onRefreshOrders={() => refreshOrders(activeBar.id)}
              onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
              onResolveCall={async (callId) => {
                setTableCalls((prev) => prev.filter((x) => x.id !== callId));
                await resolveTableCall(activeBar.id, callId);
                showToast('Chamado marcado como atendido!');
              }}
              onOpenDisplayMode={(m) => setPreviewDisplayMode(m)}
              onBackMore={() => setExclusiveCashierMode(false)}
              onToast={showToast}
            />
          </div>

          {showExitTerminalPin && (
            <div className="ov" onClick={() => setShowExitTerminalPin(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>🔐 Senha ADM para sair do Terminal Caixa</h3>
                <p className="mu text-xs mb-3">
                  Digite a senha de gerente/dono da loja para voltar ao painel completo.
                </p>
                <input
                  type="password"
                  value={exitTerminalPin}
                  onChange={(e) => {
                    setExitTerminalPin(e.target.value);
                    setExitTerminalErr('');
                  }}
                  placeholder="Senha ADM da loja"
                  autoFocus
                />
                {exitTerminalErr && <p className="err">{exitTerminalErr}</p>}
                <div className="row mt-3">
                  <button
                    type="button"
                    className="b g flex-1"
                    onClick={() => setShowExitTerminalPin(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="b flex-1"
                    onClick={async () => {
                      const res = await verifyStoreManagerPin(activeBar, exitTerminalPin);
                      if (!res.ok) {
                        setExitTerminalErr(res.reason || 'Senha ADM incorreta.');
                        return;
                      }
                      setShowExitTerminalPin(false);
                      setExclusiveCashierMode(false);
                      showToast('Painel completo liberado.');
                    }}
                  >
                    Liberar painel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="top">
            <BrandMark bar={activeBar} />
            <div className="row">
              {activeBarOpsForStaff?.staff_login_enabled && (
                <button
                  type="button"
                  className="bar-switcher-pill !border-sky-400/60"
                  title="Voltar para tela de login de funcionários"
                  onClick={() => {
                    clearActiveStaffSession(activeBar.id);
                    setActiveStaffSessionState(null);
                    setOwnerBypassStaffGate(false);
                    showToast('Tela de login de funcionários ativada.');
                  }}
                >
                  👤 Equipe
                </button>
              )}
              {isPlatformAdmin && (
                <button
                  type="button"
                  className="bar-switcher-pill !border-[var(--ac)]/60"
                  title="Abrir área exclusiva de administração"
                  onClick={() => {
                    setAdminAreaTab('accounts');
                    setWorkspaceMode('admin');
                  }}
                >
                  👑 ADM{unreadAdminAlerts > 0 ? ` (${unreadAdminAlerts})` : ''}
                </button>
              )}
              {!isPlatformAdmin && isSupportAgent && (
                <button
                  type="button"
                  className="bar-switcher-pill !border-[var(--ok)]/60"
                  title="Central de atendimento do suporte"
                  onClick={() => setWorkspaceMode('support')}
                >
                  🎧 Suporte
                </button>
              )}
              <button
                type="button"
                className="bar-switcher-pill"
                title={uiThemeMode === 'dark' ? 'Mudar para modo diurno' : 'Mudar para modo noturno'}
                onClick={toggleUiThemeMode}
              >
                {uiThemeMode === 'dark' ? '☀️' : '🌙'}
              </button>
              {quickProfile?.biometricEnabled && (
                <button
                  type="button"
                  className="bar-switcher-pill"
                  title="Bloquear aplicativo"
                  onClick={handleLockApp}
                >
                  🔒
                </button>
              )}
              <PWAInstallButton variant="pill" />
              <button
                type="button"
                className="bar-switcher-pill"
                onClick={() => setShowSwitchBar(true)}
              >
                🏠 Trocar
              </button>
              <button
                type="button"
                className="lnk"
                onClick={() => void sb.auth.signOut()}
              >
                Sair
              </button>
            </div>
          </div>

          <div className={`w ${floatingBackInfo.show ? 'pt-12' : ''}`}>
            {tab === 'dashboard' && (
              <>
                <OwnerSummaryView
                  bar={activeBar}
                  orders={orders}
                  recipes={recipes}
                  items={items}
                  prices={prices}
                  tableTabs={tableTabs}
                  tableCalls={visibleTableCalls}
                  hasPricing={hasPricing}
                  uiThemeMode={uiThemeMode}
                  onToggleTheme={toggleUiThemeMode}
                  onRefresh={async () => {
                    await silentSyncBarData(activeBar.id, user.id, isManager);
                    showToast('Resumo atualizado em tempo real!');
                  }}
                  onGoQueue={(station) => {
                    setQueueStation(station || 'all');
                    setTab('queue');
                  }}
                  onGoCashier={() => setTab('cashier')}
                  onGoStock={() => setTab('stock')}
                  onGoDelivery={() => setTab('delivery')}
                  onGoPrices={() => setTab('prices')}
                  onGoReports={() => {
                    setMgmtSubTab('dashboard');
                    setTab('management');
                  }}
                  onOpenQr={() => setShowQr(true)}
                />
                <AdSlot
                  placement="panel"
                  showAds={planStatus.showAds}
                  config={saasConfig}
                  partnerAds={partnerAds}
                  onUpgradeClick={() => setTab('plans')}
                />
              </>
            )}

            {tab === 'recipes' && (
              <>
                <RecipesView
                  bar={activeBar}
                  items={items}
                  recipes={recipes}
                  prices={prices}
                  hasPricing={hasPricing}
                  unpricedCount={unpricedCount}
                  canEditMenu={canEditMenu}
                  onGoPrices={() => setTab('prices')}
                  onOpenCreateDrink={(edit) => setCreateDrinkMode(edit)}
                  onOpenCatalog={() => setTab('catalog')}
                  onOpenShakers={() => setShowShakers(true)}
                  onSelectRecipe={setMakeDrinkRecipe}
                />
                <AdSlot
                  placement="panel"
                  showAds={planStatus.showAds}
                  config={saasConfig}
                  partnerAds={partnerAds}
                  onUpgradeClick={() => setTab('plans')}
                />
              </>
            )}

            {tab === 'stock' && (
              <>
                <StockView
                  bar={activeBar}
                  items={items}
                  recipes={recipes}
                  prices={prices}
                  canEditMenu={canEditMenu}
                  hasPricing={hasPricing}
                  onItemsChange={setItems}
                  onBarUpdated={(updated) => {
                    setActiveBar(updated);
                    setBars((prev) =>
                      prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                    );
                  }}
                  onGoPrices={() => setTab('prices')}
                  onOpenCompras={() => {
                    setMgmtSubTab('compras');
                    setTab('management');
                  }}
                  onToast={showToast}
                />
                <AdSlot
                  placement="panel"
                  showAds={planStatus.showAds}
                  config={saasConfig}
                  partnerAds={partnerAds}
                  onUpgradeClick={() => setTab('plans')}
                />
              </>
            )}

            {tab === 'queue' && (
              <QueueView
                bar={activeBar}
                role={role}
                actorName={actorName}
                members={members}
                orders={orders}
                recipes={recipes}
                items={items}
                prices={prices}
                tableTabs={tableTabs}
                tableCalls={visibleTableCalls}
                defaultStation={queueStation}
                onItemsChange={setItems}
                onResolveCall={async (callId) => {
                  setTableCalls((prev) => prev.filter((x) => x.id !== callId));
                  await resolveTableCall(activeBar.id, callId);
                  showToast('Chamado marcado como atendido!');
                }}
                onBarUpdated={(updated) => {
                  setActiveBar(updated);
                  setBars((prev) =>
                    prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                  );
                }}
                onRefreshOrders={() => refreshOrders(activeBar.id)}
                onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                onRecipesUpdated={async () => {
                  const r = await sb.from('recipes').select('*').order('name');
                  if (!r.error && r.data) setRecipes(dedupeRecipes(r.data as Recipe[]));
                }}
                onSelectRecipe={setMakeDrinkRecipe}
                onGoStock={() => setTab('stock')}
                onOpenCatalog={() => setTab('catalog')}
                onToast={showToast}
              />
            )}

            {tab === 'catalog' && (
              <CatalogItemsManager
                bar={activeBar}
                userId={user.id}
                recipes={recipes}
                prices={prices}
                onChanged={async () => {
                  const [rRec, rPr] = await Promise.all([
                    sb.from('recipes').select('*').order('name'),
                    sb.from('bar_prices').select('recipe_id, price').eq('bar_id', activeBar.id),
                  ]);
                  if (!rRec.error && rRec.data) {
                    setRecipes(dedupeRecipes(rRec.data as Recipe[]));
                  }
                  if (!rPr.error && rPr.data) {
                    const prMap: Record<string, number> = {};
                    (rPr.data as { recipe_id: string; price: number }[]).forEach((x) => {
                      prMap[x.recipe_id] = Number(x.price);
                    });
                    setPrices(prMap);
                  }
                }}
                onToast={showToast}
                onBack={() => setTab('more')}
              />
            )}

            {tab === 'delivery' && (
              <DeliveryProView
                bar={activeBar}
                role={role}
                actorName={actorName}
                orders={orders}
                recipes={recipes}
                prices={prices}
                onBarUpdated={(updated) => {
                  setActiveBar(updated);
                  setBars((prev) =>
                    prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                  );
                }}
                onRefreshOrders={() => refreshOrders(activeBar.id)}
                onBackMore={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'cashier' &&
              (planStatus.isPro ? (
                <CashierProView
                  bar={activeBar}
                  role={role}
                  actorName={actorName}
                  orders={orders}
                  tableTabs={tableTabs}
                  tableCalls={visibleTableCalls}
                  recipes={recipes}
                  items={items}
                  prices={prices}
                  hasPricing={hasPricing}
                  settledIds={settledIds}
                  onSettled={(ids) => {
                    const next = new Set(settledIds);
                    ids.forEach((id) => next.add(id));
                    setSettledIds(next);
                  }}
                  onBarUpdated={(updated) => {
                    setActiveBar(updated);
                    setBars((prev) =>
                      prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                    );
                  }}
                  onRefreshOrders={() => refreshOrders(activeBar.id)}
                  onRefreshTableTabs={() => refreshTableTabs(activeBar.id)}
                  onResolveCall={async (callId) => {
                    setTableCalls((prev) => prev.filter((x) => x.id !== callId));
                    await resolveTableCall(activeBar.id, callId);
                    showToast('Chamado marcado como atendido!');
                  }}
                  onOpenDisplayMode={(m) => setPreviewDisplayMode(m)}
                  onEnterExclusiveTerminal={() => setExclusiveCashierMode(true)}
                  onGoManagement={(st) => {
                    if (st) setMgmtSubTab(st);
                    setTab('management');
                  }}
                  onBackMore={() => setTab('more')}
                  onToast={showToast}
                />
              ) : (
                <ProGateCard
                  featureTitle="Caixa Completo, Turno & Divisão de Conta"
                  description="Controle abertura e fechamento de turno, sangria, suprimento, taxa de 10%, divisão de conta, pré-conta térmica e resgate de fidelidade no Plano Pro."
                  onOpenPlans={() => setTab('plans')}
                  onBack={() => setTab('more')}
                />
              ))}

            {tab === 'management' &&
              (planStatus.isPro || mgmtSubTab === 'config' || mgmtSubTab === 'garcons' ? (
                <ManagementProView
                  bar={activeBar}
                  role={role}
                  actorName={actorName}
                  items={items}
                  recipes={recipes}
                  orders={orders}
                  members={members}
                  prices={prices}
                  tableTabs={tableTabs}
                  initialSubTab={mgmtSubTab}
                  onOpenDelivery={() => setTab('delivery')}
                  onOpenWaiterStation={() => {
                    setQueueStation('garcom');
                    setTab('queue');
                  }}
                  onBarUpdated={(updated) => {
                    setActiveBar(updated);
                    setBars((prev) =>
                      prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                    );
                  }}
                  onBackMore={() => setTab('more')}
                  onToast={showToast}
                />
              ) : (
                <ProGateCard
                  featureTitle={
                    mgmtSubTab === 'happyhour'
                      ? 'Happy Hour Automático'
                      : mgmtSubTab === 'fidelidade'
                        ? 'Cartão Fidelidade & Cashback'
                        : mgmtSubTab === 'compras'
                          ? 'Lista de Compras, Fornecedores & Perdas'
                          : mgmtSubTab === 'reservas'
                            ? 'Reservas de Mesa & CRM de Clientes'
                            : 'Relatórios Financeiros, CMV & Lucro Líquido'
                  }
                  description="Este módulo avançado faz parte do Plano Pro. Ative o Pro para remover anúncios e liberar toda a gestão profissional do seu bar."
                  onOpenPlans={() => setTab('plans')}
                  onBack={() => setTab('more')}
                />
              ))}

            {tab === 'plans' && (
              <PlansView
                bar={activeBar}
                userEmail={user.email}
                planStatus={planStatus}
                config={saasConfig}
                onOpenLegal={(t) => setLegalModal(t)}
                onOpenSupportChat={openSupportChat}
                onBack={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'support' && (
              <StoreSupportChatView
                userId={user.id}
                userEmail={user.email}
                actorName={actorName}
                bar={activeBar}
                initialMessage={supportPrefill}
                onUnreadChange={setUnreadSupportCount}
                onBack={() => {
                  setSupportPrefill('');
                  setTab('more');
                }}
                onToast={showToast}
              />
            )}

            {tab === 'superadmin' && isPlatformAdmin && (
              <SuperAdminView
                userId={user.id}
                userEmail={user.email}
                actorName={actorName}
                config={saasConfig}
                adminAlerts={adminAlerts}
                onMarkAlertsRead={handleMarkAdminAlertsRead}
                onOpenAlertSettings={() => setTab('alerts')}
                onConfigUpdated={setSaasConfig}
                onBarPlanChanged={handleBarPlanChanged}
                onAdsUpdated={setPartnerAds}
                onBack={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'alerts' && (
              <AlertSettingsView
                isPlatformAdmin={isPlatformAdmin}
                onBack={() => setTab('more')}
              />
            )}

            {tab === 'prices' && (
              <PricesView
                bar={activeBar}
                items={items}
                recipes={recipes}
                prices={prices}
                onBarUpdated={(updated) => {
                  setActiveBar(updated);
                  setBars((prev) =>
                    prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                  );
                }}
                onPricesUpdated={setPrices}
                onItemsChange={setItems}
                onGoStock={() => setTab('stock')}
                onBack={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'studio' && (
              <StoreStudioView
                bar={activeBar}
                items={items}
                recipes={recipes}
                prices={prices}
                hasPricing={hasPricing}
                initialTab={studioInitialTab}
                userCoords={userCoords}
                onDetectCoords={() => detectCurrentCoords(true)}
                onBarUpdated={(updated) => {
                  setActiveBar(updated);
                  setBars((prev) =>
                    prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                  );
                }}
                onGoPrices={() => setTab('prices')}
                onBackMore={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'careers' && (
              <CareersView
                mode={careerMode}
                isManager={isManager}
                activeBar={activeBar}
                bars={bars}
                members={members}
                jobs={jobs}
                myApps={myApps}
                receivedApps={receivedApps}
                serviceReqs={serviceReqs}
                profile={profile}
                userId={user.id}
                userCoords={userCoords}
                onDetectCoords={() => detectCurrentCoords(true)}
                onMembersUpdated={setMembers}
                onProfileSaved={setProfile}
                onRefreshJobs={() => loadJobsAndRequests(user.id, activeBar.id, isManager)}
                onUsePersonal={() => {
                  applyBarTheme(null, uiThemeModeRef.current);
                  setActiveBar(null);
                  activeBarIdRef.current = null;
                  setRole(null);
                  setSeekerTab('careers');
                  setScreenMode('seeker');
                }}
                onOpenBar={async (b, r) => {
                  await openBar(b, r, user.id);
                }}
                onGoStudio={() => {
                  setStudioInitialTab('store');
                  setTab('studio');
                }}
                onBack={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'more' && (
              <>
                <MoreView
                  bar={activeBar}
                  isManager={isManager}
                  canEditMenu={canEditMenu}
                  hasPricing={hasPricing}
                  unpricedCount={unpricedCount}
                  planLabel={planStatus.label}
                  isProPlan={planStatus.isPro}
                  isPlatformAdmin={isPlatformAdmin}
                  isSupportAgent={isSupportAgent}
                  unreadAdminAlerts={unreadAdminAlerts}
                  unreadSupportCount={unreadSupportCount}
                  activeDeliveryCount={
                    new Set(
                      orders
                        .filter((o) => o.status !== 'done')
                        .map((o) => parseDeliveryOrderMeta(o)?.code)
                        .filter(Boolean)
                    ).size
                  }
                  supportWhatsAppHref={supportWhatsAppHref}
                  uiThemeMode={uiThemeMode}
                  quickProfile={quickProfile}
                  onToggleTheme={toggleUiThemeMode}
                  onBarUpdated={(updated) => {
                    setActiveBar(updated);
                    setBars((prev) =>
                      prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                    );
                  }}
                  onOpenQr={() => setShowQr(true)}
                  onOpenShakers={() => setShowShakers(true)}
                  onOpenCreateDrink={(edit) => setCreateDrinkMode(edit)}
                  onOpenStation={(st) => {
                    if (!planStatus.isPro) {
                      showToast('Estações dedicadas da equipe fazem parte do Plano Pro.');
                      setTab('plans');
                      return;
                    }
                    setQueueStation(st);
                    setTab('queue');
                  }}
                  onNavigate={(nextTab, cMode) => {
                    if (nextTab === 'studio') setStudioInitialTab('menu');
                    if (cMode) setCareerMode(cMode);
                    setTab(nextTab);
                  }}
                  onOpenManagement={(st) => {
                    setMgmtSubTab(st);
                    setTab('management');
                  }}
                  onOpenSwitchBar={() => setShowSwitchBar(true)}
                  onOpenAlertSettings={() => setTab('alerts')}
                  onOpenPlans={() => setTab('plans')}
                  onOpenSuperAdmin={() => {
                    setAdminAreaTab('accounts');
                    setWorkspaceMode('admin');
                  }}
                  onOpenSupportDesk={() => setWorkspaceMode('support')}
                  onOpenSupportChat={() => openSupportChat()}
                  onQuickProfileChanged={setQuickProfile}
                  onLockApp={handleLockApp}
                  onOpenSalesSite={() => setShowSalesSite(true)}
                  onOpenLegal={(t) => setLegalModal(t)}
                  onToast={showToast}
                />
                <AdSlot
                  placement="panel"
                  showAds={planStatus.showAds}
                  config={saasConfig}
                  partnerAds={partnerAds}
                  onUpgradeClick={() => setTab('plans')}
                />
              </>
            )}
          </div>

          <nav className="bnav">
            <button
              type="button"
              className={`bnav-btn ${tab === 'dashboard' ? 'on' : ''}`}
              onClick={() => setTab('dashboard')}
            >
              <span className="ico">📊</span>
              <span>Resumo</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${tab === 'queue' ? 'on' : ''}`}
              onClick={() => setTab('queue')}
            >
              <span className="ico">
                {role === 'cozinha' ? '🍳' : role === 'garcom' ? '🍽️' : '🔔'}
              </span>
              <span>
                {role === 'cozinha'
                  ? 'Cozinha'
                  : role === 'garcom'
                    ? 'Garçom'
                    : 'Pedidos'}
                {queueCount > 0 ? ` (${queueCount})` : ''}
              </span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${tab === 'recipes' || tab === 'catalog' ? 'on' : ''}`}
              onClick={() => setTab('recipes')}
            >
              <span className="ico">🍸</span>
              <span>Cardápio</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${tab === 'stock' ? 'on' : ''}`}
              onClick={() => setTab('stock')}
            >
              <span className="ico">🍾</span>
              <span>Estoque</span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${
                [
                  'more',
                  'cashier',
                  'delivery',
                  'studio',
                  'careers',
                  'prices',
                  'management',
                  'plans',
                  'superadmin',
                  'alerts',
                  'support',
                ].includes(tab)
                  ? 'on'
                  : ''
              }`}
              onClick={() => setTab('more')}
            >
              <span className="ico">•••</span>
              <span>
                Mais
                {hasPricing && unpricedCount > 0
                  ? ` (${unpricedCount})`
                  : unreadSupportCount > 0
                    ? ` (${unreadSupportCount})`
                    : ''}
              </span>
            </button>
          </nav>

          {showSwitchBar && (
            <SwitchBarModal
              bars={bars}
              activeBar={activeBar}
              userCoords={userCoords}
              onDetectCoords={() => detectCurrentCoords(true)}
              onPickBar={async (b, r) => {
                await openBar(b, r, user.id);
              }}
              onBarUpdated={(updated) => {
                if (activeBar?.id === updated.id) {
                  setActiveBar(updated);
                  applyBarTheme(updated, uiThemeModeRef.current);
                }
                setBars((prev) =>
                  prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                );
              }}
              onNewBar={() => setScreenMode('onboarding')}
              onClose={() => setShowSwitchBar(false)}
              onToast={showToast}
            />
          )}

          {makeDrinkRecipe && (
            <MakeDrinkModal
              recipe={makeDrinkRecipe}
              bar={activeBar}
              items={items}
              prices={prices}
              orders={orders}
              tableTabs={tableTabs}
              onClose={() => setMakeDrinkRecipe(null)}
              onOrderCreated={() => refreshOrders(activeBar.id)}
              onToast={showToast}
            />
          )}

          {showQr && (
            <QrModal
              bar={activeBar}
              items={items}
              recipes={recipes}
              prices={prices}
              onItemsChange={setItems}
              onGoPrices={() => setTab('prices')}
              onGoStock={() => setTab('stock')}
              onGoQrStudio={() => {
                setShowQr(false);
                setStudioInitialTab('qr');
                setTab('studio');
              }}
              onBarUpdated={(updated) => {
                setActiveBar(updated);
                setBars((prev) =>
                  prev.map((x) => (x.bar.id === updated.id ? { ...x, bar: updated } : x))
                );
              }}
              onClose={() => setShowQr(false)}
              onToast={showToast}
            />
          )}

          {showShakers && (
            <ShakersModal
              bar={activeBar}
              onBarUpdated={(updated) => setActiveBar(updated)}
              onClose={() => setShowShakers(false)}
              onToast={showToast}
            />
          )}

          {createDrinkMode !== null && (
            <CreateDrinkModal
              editExisting={createDrinkMode}
              recipes={recipes}
              userId={user.id}
              onRecipeSaved={(saved) => {
                setRecipes((prev) => {
                  const idx = prev.findIndex((x) => x.id === saved.id);
                  if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = saved;
                    return next;
                  }
                  return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
                });
                if (activeBar) void broadcastMenuUpdate(activeBar.id);
              }}
              onClose={() => setCreateDrinkMode(null)}
              onToast={showToast}
            />
          )}
        </div>
      )}

      {standaloneModal && (
        <div className="ov">
          <div className="w narrow">
            <button
              type="button"
              className="b g sm mb-3"
              onClick={() => setStandaloneModal(null)}
            >
              ← Voltar
            </button>
            {standaloneModal === 'jobs' ? (
              <JobsSection
                jobs={jobs}
                myApps={myApps}
                profile={profile}
                userId={user.id}
                userCoords={userCoords}
                onDetectCoords={() => detectCurrentCoords(true)}
                onRefreshJobs={() => loadJobsAndRequests(user.id, null, false)}
                onGoProfile={() => setStandaloneModal('profile')}
                onToast={showToast}
              />
            ) : (
              <ProfileSection
                profile={profile}
                userId={user.id}
                userCoords={userCoords}
                onDetectCoords={() => detectCurrentCoords(true)}
                onProfileSaved={setProfile}
                onToast={showToast}
              />
            )}
          </div>
        </div>
      )}
      {seekerOverlay === 'superadmin' && isPlatformAdmin && (
        <div className="ov">
          <div className="w pt-12">
            <SuperAdminView
              userId={user.id}
              userEmail={user.email}
              actorName={actorName}
              config={saasConfig}
              adminAlerts={adminAlerts}
              onMarkAlertsRead={handleMarkAdminAlertsRead}
              onOpenAlertSettings={() => setSeekerOverlay('alerts')}
              onConfigUpdated={setSaasConfig}
              onBarPlanChanged={handleBarPlanChanged}
              onAdsUpdated={setPartnerAds}
              onBack={() => setSeekerOverlay(null)}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      {seekerOverlay === 'alerts' && (
        <div className="ov">
          <div className="w pt-12">
            <AlertSettingsView
              isPlatformAdmin={isPlatformAdmin}
              onBack={() => setSeekerOverlay(null)}
            />
          </div>
        </div>
      )}

      {seekerOverlay === 'plans' && (
        <div className="ov">
          <div className="w pt-12">
            <PlansView
              bar={activeBar}
              userEmail={user.email}
              planStatus={planStatus}
              config={saasConfig}
              onOpenLegal={(t) => setLegalModal(t)}
              onOpenSupportChat={openSupportChat}
              onBack={() => setSeekerOverlay(null)}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      {seekerOverlay === 'support' && (
        <div className="ov">
          <div className="w pt-12">
            <StoreSupportChatView
              userId={user.id}
              userEmail={user.email}
              actorName={actorName}
              bar={activeBar}
              initialMessage={supportPrefill}
              onUnreadChange={setUnreadSupportCount}
              onBack={() => {
                setSupportPrefill('');
                setSeekerOverlay(null);
              }}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      {legalModal && (
        <LegalDocsModal initialTab={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </>
  );
}
