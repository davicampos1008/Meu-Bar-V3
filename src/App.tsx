import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { AdSlot } from './components/AdSlot';
import { AlertSettingsView } from './components/AlertSettingsView';
import { LoginScreen, OnboardingScreen } from './components/AuthAndOnboarding';
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
import { LegalDocsModal, PlansView, ProGateCard } from './components/PlansAndLegalModal';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { BrandMark } from './components/SharedUI';
import { SuperAdminView } from './components/SuperAdminView';
import {
  canShowToast,
  getAlertPrefsSummary,
  isAlertEnabled,
  useAlertPrefs,
  type AlertCategoryKey,
} from './lib/alertPrefs';
import {
  flushOfflineOrders,
  loadOpenTableCalls,
  parseDeliveryOrderMeta,
  playStationAlert,
  resolveTableCall,
} from './lib/opsUtils';
import { EXTENDED_RECIPES } from './lib/recipesSeed';
import {
  buildWhatsAppLink,
  getBarPlanStatus,
  getCachedPartnerAds,
  getCachedPlatformConfig,
  isSuperAdmin,
  loadAdminNotifications,
  loadPartnerAds,
  loadPlatformConfig,
  markAdminNotificationsRead,
} from './lib/saas';
import { broadcastMenuUpdate, sb } from './lib/supabase';
import { applyBarTheme, getUnpricedAvailableDrinks, norm } from './lib/utils';
import type {
  AdminAlertItem,
  Bar,
  BarEntry,
  BarItem,
  BarMember,
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

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const menuBarParam = params.get('bar');
  const mesaParam = params.get('mesa');
  const modeParam = params.get('mode');
  const isMenuRoute =
    Boolean(menuBarParam) || window.location.pathname.endsWith('/menu.html');

  const [booting, setBooting] = useState(!isMenuRoute);
  const [user, setUser] = useState<User | null>(null);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [bars, setBars] = useState<BarEntry[]>([]);
  const [activeBar, setActiveBar] = useState<Bar | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [screenMode, setScreenMode] = useState<'bar' | 'seeker' | 'onboarding'>('seeker');

  const [tab, setTab] = useState<string>('recipes');
  const [studioInitialTab, setStudioInitialTab] = useState<StudioTab>('menu');
  const [mgmtSubTab, setMgmtSubTab] = useState<ManagementSubTab>('dashboard');
  const [queueStation, setQueueStation] = useState<'all' | 'bar' | 'cozinha' | 'garcom'>('all');
  const [seekerTab, setSeekerTab] = useState<'careers' | 'profile' | 'explore' | 'createbar'>('careers');
  const [careerMode, setCareerMode] = useState<'store' | 'personal'>('store');

  const [items, setItems] = useState<BarItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableTabs, setTableTabs] = useState<TableTab[]>([]);
  const [tableCalls, setTableCalls] = useState<TableCallAlert[]>([]);
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<BarMember[]>([]);

  const [publicBars, setPublicBars] = useState<Bar[]>([]);
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
  const [seekerOverlay, setSeekerOverlay] = useState<null | 'superadmin' | 'plans' | 'alerts'>(null);

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
        applyBarTheme(nextBar);
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
    let jr = await sb
      .from('job_posts')
      .select('*, bars(*)')
      .eq('is_open', true)
      .order('created_at', { ascending: false })
      .limit(80);
    if (jr.error) {
      jr = await sb
        .from('job_posts')
        .select('*, bars(name, handle, city, lat, lon)')
        .eq('is_open', true)
        .order('created_at', { ascending: false })
        .limit(80);
    }
    const openJobs = jr.error ? [] : (jr.data as JobPost[]) || [];
    setJobs(openJobs);

    const pb = await sb.from('bars').select('*').order('created_at', { ascending: false }).limit(80);
    if (!pb.error && pb.data) {
      const nextPublic = pb.data as Bar[];
      setPublicBars((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextPublic) ? prev : nextPublic
      );
    }

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
      const barJobIds = openJobs.filter((j) => j.bar_id === currentBarId).map((j) => j.id);
      if (barJobIds.length) {
        const ra = await sb
          .from('job_applications')
          .select('*, job_posts(id, title, role_needed), staff_profiles(*)')
          .in('job_id', barJobIds)
          .order('created_at', { ascending: false });
        setReceivedApps((ra.data as JobApplication[]) || []);
      } else {
        setReceivedApps([]);
      }
    } else {
      setReceivedApps([]);
    }
  };

  const openBar = async (bar: Bar, barRole: string, uid: string) => {
    setActiveBar(bar);
    activeBarIdRef.current = bar.id;
    setRole(barRole);
    setSettledIds(new Set());
    localStorage.setItem('last_bar_' + uid, bar.id);
    applyBarTheme(bar);

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
      setTab('recipes');
    }
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
    ((own.data as Bar[]) || []).forEach((b) => {
      map[b.id] = { bar: b, role: 'owner' };
    });
    (
      ((mem.data as unknown as { role: string; bars: Bar | null }[]) || [])
    ).forEach((m) => {
      if (m.bars && !map[m.bars.id]) {
        map[m.bars.id] = { bar: m.bars, role: m.role };
      }
    });

    const list = Object.values(map);
    setBars(list);

    if (list.length > 0) {
      const savedBar = localStorage.getItem('last_bar_' + u.id);
      const pick = list.find((x) => x.bar.id === savedBar) || list[0];
      await openBar(pick.bar, pick.role, u.id);
    } else {
      applyBarTheme(null);
      setActiveBar(null);
      activeBarIdRef.current = null;
      setRole(null);
      await loadJobsAndRequests(u.id, null, false);
      setSeekerTab('careers');
      setScreenMode('seeker');
    }
    setBooting(false);
  };

  useEffect(() => {
    if (isMenuRoute) return;
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
        applyBarTheme(null);
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
          applyBarTheme(null);
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
  }, [isMenuRoute]);

  // Alertas em tempo real para o Super Admin quando uma nova conta é criada
  useEffect(() => {
    if (isMenuRoute || !user || !isSuperAdmin(user.email)) {
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
  }, [isMenuRoute, user?.id, user?.email]);

  useEffect(() => {
    if (isMenuRoute || !user) return;
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
  }, [isMenuRoute, activeBar?.id, isManager, user?.id, screenMode, role]);

  // Proteção do botão Voltar do Android (Capacitor APK + PWA/WebView)
  const navStateRef = useRef({
    user,
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

  useEffect(() => {
    if (isMenuRoute) return;

    try {
      if (!window.history.state || !window.history.state.meubarGuard) {
        window.history.pushState({ meubarGuard: true }, '');
      }
    } catch {
      // ignore history errors
    }

    const handleAndroidBack = (fromPopState: boolean) => {
      if (exitingAppRef.current) return;
      const now = Date.now();
      if (now - lastBackTriggerRef.current < 80) return;
      lastBackTriggerRef.current = now;

      const keepGuard = () => {
        if (!fromPopState) return;
        try {
          window.history.pushState({ meubarGuard: true }, '');
        } catch {
          // ignore
        }
      };

      // 1. Overlays internos (ex: Modo Canva)
      const ev = new CustomEvent('meubar:back-intercept', { cancelable: true });
      if (!window.dispatchEvent(ev)) {
        keepGuard();
        return;
      }

      const st = navStateRef.current;

      // 2. Modais abertos
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

      // 3. Telas secundárias -> volta até a página inicial
      if (st.user) {
        if (st.screenMode === 'onboarding') {
          if (st.activeBar) {
            applyBarTheme(st.activeBar);
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
            ].includes(st.tab)
          ) {
            setTab('more');
            keepGuard();
            return;
          }
          if (st.tab !== 'recipes') {
            setTab('recipes');
            keepGuard();
            return;
          }
        }
      }

      // 4. Já está na página inicial: exige duplo clique para sair
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
      showToast('Pressione voltar novamente para sair');
      keepGuard();
    };

    const onPopState = () => handleAndroidBack(true);
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
      const handle = capApp.addListener('backButton', () => handleAndroidBack(false));
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
  }, [isMenuRoute]);

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

  if (!user) {
    return (
      <>
        <OfflineIndicator />
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <LoginScreen
          saasConfig={saasConfig}
          partnerAds={partnerAds}
          onOpenLegal={(t) => setLegalModal(t)}
        />
        {legalModal && (
          <LegalDocsModal initialTab={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </>
    );
  }

  const queueCount = orders.filter((o) => o.status !== 'done').length;
  const unpricedCount = activeBar
    ? getUnpricedAvailableDrinks(recipes, items, prices, activeBar).length
    : 0;
  const actorName = profile.display_name || user.email?.split('@')[0] || 'Equipe';
  const isPlatformAdmin = isSuperAdmin(user.email);
  const adminNewAccountAlertOn = isAlertEnabled('adminNewAccount', alertPrefs);
  const unreadAdminAlerts = adminNewAccountAlertOn
    ? adminAlerts.filter((a) => !a.read).length
    : 0;
  const visibleTableCalls = isAlertEnabled('tableCalls', alertPrefs) ? tableCalls : [];
  const seekerAlertSummary = getAlertPrefsSummary(alertPrefs, isPlatformAdmin);
  const planStatus = getBarPlanStatus(activeBar, user.email, saasConfig);
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

  return (
    <>
      <OfflineIndicator />
      {toastMsg && <div className="toast">{toastMsg}</div>}

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
            applyBarTheme(null);
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
                  applyBarTheme(activeBar);
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
                  className="bar-switcher-pill"
                  onClick={() => setSeekerOverlay('superadmin')}
                >
                  👑 Admin{unreadAdminAlerts > 0 ? ` (${unreadAdminAlerts})` : ''}
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

          <div className="w">
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
                  publicBars={[
                    ...publicBars,
                    ...bars
                      .map((x) => x.bar)
                      .filter((b) => !publicBars.some((pb) => pb.id === b.id)),
                  ]}
                  myApps={myApps}
                  profile={profile}
                  userId={user.id}
                  userCoords={userCoords}
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
              <span className="ico">📍</span>
              <span>Bares</span>
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
      ) : (
        <div>
          <div className="top">
            <BrandMark bar={activeBar} />
            <div className="row">
              <PWAInstallButton variant="pill" />
              <button
                type="button"
                className="bar-switcher-pill"
                onClick={() => setShowSwitchBar(true)}
              >
                🏠 Trocar bar
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

          <div className="w">
            {tab === 'recipes' && (
              <>
                <RecipesView
                  bar={activeBar}
                  items={items}
                  recipes={recipes}
                  prices={prices}
                  hasPricing={hasPricing}
                  unpricedCount={unpricedCount}
                  onGoPrices={() => setTab('prices')}
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
              (planStatus.isPro || mgmtSubTab === 'config' ? (
                <ManagementProView
                  bar={activeBar}
                  role={role}
                  actorName={actorName}
                  items={items}
                  recipes={recipes}
                  initialSubTab={mgmtSubTab}
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
                onBack={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'superadmin' && isPlatformAdmin && (
              <SuperAdminView
                userId={user.id}
                config={saasConfig}
                adminAlerts={adminAlerts}
                onMarkAlertsRead={handleMarkAdminAlertsRead}
                onOpenAlertSettings={() => setTab('alerts')}
                onConfigUpdated={setSaasConfig}
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
                  applyBarTheme(null);
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
                  unreadAdminAlerts={unreadAdminAlerts}
                  activeDeliveryCount={
                    new Set(
                      orders
                        .filter((o) => o.status !== 'done')
                        .map((o) => parseDeliveryOrderMeta(o)?.code)
                        .filter(Boolean)
                    ).size
                  }
                  supportWhatsAppHref={supportWhatsAppHref}
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
                  onOpenSuperAdmin={() => setTab('superadmin')}
                  onOpenLegal={(t) => setLegalModal(t)}
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
              className={`bnav-btn ${tab === 'recipes' ? 'on' : ''}`}
              onClick={() => setTab('recipes')}
            >
              <span className="ico">🍸</span>
              <span>Receitas</span>
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
                    : role === 'barman'
                      ? 'Barman'
                      : 'Fila'}
                {queueCount > 0 ? ` (${queueCount})` : ''}
              </span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${
                [
                  'more',
                  'cashier',
                  'studio',
                  'careers',
                  'prices',
                  'catalog',
                  'management',
                  'plans',
                  'superadmin',
                ].includes(tab)
                  ? 'on'
                  : ''
              }`}
              onClick={() => setTab('more')}
            >
              <span className="ico">•••</span>
              <span>Mais{hasPricing && unpricedCount > 0 ? ` (${unpricedCount})` : ''}</span>
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
                  applyBarTheme(updated);
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
          <div className="w">
            <SuperAdminView
              userId={user.id}
              config={saasConfig}
              adminAlerts={adminAlerts}
              onMarkAlertsRead={handleMarkAdminAlertsRead}
              onOpenAlertSettings={() => setSeekerOverlay('alerts')}
              onConfigUpdated={setSaasConfig}
              onAdsUpdated={setPartnerAds}
              onBack={() => setSeekerOverlay(null)}
              onToast={showToast}
            />
          </div>
        </div>
      )}

      {seekerOverlay === 'alerts' && (
        <div className="ov">
          <div className="w">
            <AlertSettingsView
              isPlatformAdmin={isPlatformAdmin}
              onBack={() => setSeekerOverlay(null)}
            />
          </div>
        </div>
      )}

      {seekerOverlay === 'plans' && (
        <div className="ov">
          <div className="w">
            <PlansView
              bar={activeBar}
              userEmail={user.email}
              planStatus={planStatus}
              config={saasConfig}
              onOpenLegal={(t) => setLegalModal(t)}
              onBack={() => setSeekerOverlay(null)}
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
