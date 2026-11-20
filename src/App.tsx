import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';
import { LoginScreen, OnboardingScreen } from './components/AuthAndOnboarding';
import {
  CashierView,
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
import { MenuPage } from './components/MenuPage';
import {
  CreateDrinkModal,
  MakeDrinkModal,
  QrModal,
  ShakersModal,
  SwitchBarModal,
} from './components/Modals';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { BrandMark } from './components/SharedUI';
import { broadcastMenuUpdate, sb } from './lib/supabase';
import { applyBarTheme, beep, getUnpricedAvailableDrinks } from './lib/utils';
import type {
  Bar,
  BarEntry,
  BarItem,
  BarMember,
  JobApplication,
  JobPost,
  Order,
  Recipe,
  ServiceRequest,
  StaffProfile,
  UserCoords,
} from './types/meubar';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const menuBarParam = params.get('bar');
  const mesaParam = params.get('mesa');
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
  const [studioInitialTab, setStudioInitialTab] = useState<'store' | 'menu' | 'promos'>('menu');
  const [seekerTab, setSeekerTab] = useState<'careers' | 'profile' | 'explore' | 'createbar'>('careers');
  const [careerMode, setCareerMode] = useState<'store' | 'personal'>('store');

  const [items, setItems] = useState<BarItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
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

  const subRef = useRef<RealtimeChannel | null>(null);
  const activeBarIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const showToast = (t: string) => {
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

  const silentSyncBarData = async (barId: string) => {
    const [r1, r2, r3] = await Promise.all([
      sb.from('bar_items').select('*').eq('bar_id', barId).order('name'),
      sb.from('recipes').select('*').order('name'),
      sb.from('bar_prices').select('recipe_id, price').eq('bar_id', barId),
    ]);

    if (!r1.error && r1.data) {
      const nextItems = r1.data as BarItem[];
      setItems((prev) =>
        JSON.stringify(prev) === JSON.stringify(nextItems) ? prev : nextItems
      );
    }
    if (!r2.error && r2.data) {
      const nextRecipes = r2.data as Recipe[];
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

    await refreshOrders(barId);
  };

  const loadJobsAndRequests = async (
    uid: string,
    currentBarId: string | null,
    managerFlag: boolean
  ) => {
    const jr = await sb
      .from('job_posts')
      .select('*, bars(name, handle, city, lat, lon)')
      .eq('is_open', true)
      .order('created_at', { ascending: false })
      .limit(80);
    const openJobs = jr.error ? [] : (jr.data as JobPost[]) || [];
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
    setRecipes((r2.data as Recipe[]) || []);
    const prMap: Record<string, number> = {};
    ((r3.data as { recipe_id: string; price: number }[]) || []).forEach((x) => {
      prMap[x.recipe_id] = Number(x.price);
    });
    setPrices(prMap);
    setMembers((r5.data as BarMember[]) || []);

    await refreshOrders(bar.id);
    const mgr = barRole === 'owner' || barRole === 'dono' || barRole === 'gerente';
    await loadJobsAndRequests(uid, bar.id, mgr);
    setTab('recipes');
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

  useEffect(() => {
    if (isMenuRoute || !activeBar) return;
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
          if (p.eventType === 'INSERT') beep();
          void refreshOrders(activeBar.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_posts' },
        () => {
          if (user) void loadJobsAndRequests(user.id, activeBar.id, isManager);
        }
      )
      .subscribe();

    subRef.current = ch;
    // Checagem silenciosa de 5 em 5 segundos para novos drinks disponíveis, estoque, preços e pedidos
    const poll = setInterval(() => void silentSyncBarData(activeBar.id), 5000);

    return () => {
      clearInterval(poll);
      void sb.removeChannel(ch);
      subRef.current = null;
    };
  }, [isMenuRoute, activeBar?.id, isManager, user?.id]);

  // Proteção do botão Voltar do Android (Capacitor APK + PWA/WebView)
  const navStateRef = useRef({
    user,
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
          if (['cashier', 'prices', 'studio', 'careers'].includes(st.tab)) {
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
        <MenuPage barId={menuBarParam || ''} mesa={mesaParam} />
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
        <LoginScreen />
      </>
    );
  }

  const queueCount = orders.filter((o) => o.status !== 'done').length;
  const unpricedCount = activeBar
    ? getUnpricedAvailableDrinks(recipes, items, prices, activeBar).length
    : 0;

  return (
    <>
      <OfflineIndicator />
      {toastMsg && <div className="toast">{toastMsg}</div>}

      {screenMode === 'onboarding' ? (
        <OnboardingScreen
          userId={user.id}
          profile={profile}
          jobs={jobs}
          userCoords={userCoords}
          hasExistingBars={bars.length > 0}
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
              <ExploreBarsView jobs={jobs} userCoords={userCoords} />
            )}
            {seekerTab === 'createbar' && (
              <div>
                <h1>Meu bar</h1>
                <p className="mu">Modo profissional sem bar ativo.</p>
                <div className="panel">
                  <button
                    type="button"
                    className="b full"
                    onClick={() => setScreenMode('onboarding')}
                  >
                    Criar ou entrar em um bar
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
            )}

            {tab === 'stock' && (
              <StockView
                bar={activeBar}
                items={items}
                recipes={recipes}
                prices={prices}
                canEditMenu={canEditMenu}
                hasPricing={hasPricing}
                onItemsChange={setItems}
                onGoPrices={() => setTab('prices')}
                onToast={showToast}
              />
            )}

            {tab === 'queue' && (
              <QueueView
                bar={activeBar}
                orders={orders}
                recipes={recipes}
                onBarUpdated={setActiveBar}
                onRefreshOrders={() => refreshOrders(activeBar.id)}
              />
            )}

            {tab === 'cashier' && (
              <CashierView
                bar={activeBar}
                orders={orders}
                recipes={recipes}
                prices={prices}
                hasPricing={hasPricing}
                settledIds={settledIds}
                onSettled={(ids) => {
                  const next = new Set(settledIds);
                  ids.forEach((id) => next.add(id));
                  setSettledIds(next);
                }}
                onRefreshOrders={() => refreshOrders(activeBar.id)}
                onBackMore={() => setTab('more')}
                onToast={showToast}
              />
            )}

            {tab === 'prices' && (
              <PricesView
                bar={activeBar}
                items={items}
                recipes={recipes}
                prices={prices}
                onBarUpdated={setActiveBar}
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
                onBarUpdated={setActiveBar}
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
              <MoreView
                bar={activeBar}
                isManager={isManager}
                canEditMenu={canEditMenu}
                hasPricing={hasPricing}
                unpricedCount={unpricedCount}
                onBarUpdated={setActiveBar}
                onOpenQr={() => setShowQr(true)}
                onOpenShakers={() => setShowShakers(true)}
                onOpenCreateDrink={(edit) => setCreateDrinkMode(edit)}
                onNavigate={(nextTab, cMode) => {
                  if (nextTab === 'studio') setStudioInitialTab('menu');
                  if (cMode) setCareerMode(cMode);
                  setTab(nextTab);
                }}
                onOpenSwitchBar={() => setShowSwitchBar(true)}
              />
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
              <span className="ico">🔔</span>
              <span>
                Fila{queueCount > 0 ? ` (${queueCount})` : ''}
              </span>
            </button>
            <button
              type="button"
              className={`bnav-btn ${
                ['more', 'cashier', 'studio', 'careers', 'prices'].includes(tab) ? 'on' : ''
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
              onBarUpdated={(updated) => setActiveBar(updated)}
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
    </>
  );
}
