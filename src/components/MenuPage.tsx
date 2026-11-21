import React, { useEffect, useRef, useState } from 'react';
import { ALL_TAGS, CATS } from '../lib/catalog';
import {
  getActiveHappyHours,
  getBarOpsData,
  getEffectiveItemPrice,
  sendTableCall,
} from '../lib/opsUtils';
import { sb } from '../lib/supabase';
import {
  applyBarTheme,
  beep,
  getActivePromotion,
  getBarMenuDesign,
  getMissingIngredientsForRecipe,
  getPromoAdjustedPrice,
  getRecipeItemType,
  makeDrink,
  money,
  norm,
  recipeTags,
  today,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  ClientOrderLocal,
  ItemType,
  MenuBlockId,
  Recipe,
} from '../types/meubar';
import {
  buildMenuBackgroundStyle,
  FooterOrnamentView,
  MenuDrinksCatalog,
  MenuHeaderCard,
  MenuPromoBanner,
  normalizeBlockOrder,
  SideDetailWrapper,
} from './MenuVisualRenderer';
import { PWAInstallButton } from './PWAControls';
import { BrandMark } from './SharedUI';

interface MenuBarData extends Partial<Bar> {
  name: string;
  kind: string;
  open: boolean;
}

interface MenuItem extends Recipe {
  price?: number | null;
}

interface TableSession {
  tabId: string;
  code: string;
  name: string;
  table: string;
  openedBy: string;
  members: string[];
  d: string;
}

interface TableServerState {
  open: boolean;
  tab_id?: string;
  table_label?: string;
  opened_by?: string;
  members?: string[];
}

export const MenuPage: React.FC<{ barId: string; mesa?: string | null }> = ({
  barId,
  mesa,
}) => {
  const cleanMesa = (mesa || '').trim();
  const isTableQr = Boolean(cleanMesa);
  const tableStorageKey = `table_tab_${barId}_${norm(cleanMesa)}`;

  const [loading, setLoading] = useState(true);
  const [errTitle, setErrTitle] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [bar, setBar] = useState<MenuBarData | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [ownerDiag, setOwnerDiag] = useState<string[]>([]);
  const [activeClients, setActiveClients] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [gateInput, setGateInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [gateErr, setGateErr] = useState('');
  const [checkingName, setCheckingName] = useState(false);
  const [tableState, setTableState] = useState<TableServerState | null>(null);
  const [tableSession, setTableSession] = useState<TableSession | null>(null);
  const [menuSection, setMenuSection] = useState<ItemType>('drink');
  const [cat, setCat] = useState('Todas');
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [showTags, setShowTags] = useState(false);
  const [mine, setMine] = useState<ClientOrderLocal[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<MenuItem | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [readyAlert, setReadyAlert] = useState<ClientOrderLocal[] | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // Order form state
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [orderErr, setOrderErr] = useState('');
  const [sending, setSending] = useState(false);

  // Call Waiter / Request Bill state
  const [callModal, setCallModal] = useState<null | 'waiter' | 'bill'>(null);
  const [callNote, setCallNote] = useState('');
  const [callingStaff, setCallingStaff] = useState(false);
  const [lastCallAt, setLastCallAt] = useState(0);
  const [hhTick, setHhTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setHhTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const tableSessionRef = useRef<TableSession | null>(null);
  tableSessionRef.current = tableSession;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? '' : prev)), 2400);
  };

  const saveMine = (next: ClientOrderLocal[]) => {
    setMine(next);
    try {
      localStorage.setItem('mine' + barId, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const saveTableSession = (sess: TableSession | null) => {
    setTableSession(sess);
    try {
      if (sess) {
        localStorage.setItem(tableStorageKey, JSON.stringify(sess));
      } else {
        localStorage.removeItem(tableStorageKey);
      }
    } catch {
      // ignore storage errors
    }
  };

  const syncTableTab = async (silent = false) => {
    if (!isTableQr || !barId) return;

    let currentSess = tableSessionRef.current;
    if (!silent && !currentSess) {
      try {
        const raw = localStorage.getItem(tableStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as TableSession;
          if (parsed && parsed.tabId && parsed.code && parsed.d === today()) {
            currentSess = parsed;
          } else {
            localStorage.removeItem(tableStorageKey);
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    if (currentSess) {
      const vr = await sb.rpc('verify_table_tab_member', {
        p_tab_id: currentSess.tabId,
        p_code: currentSess.code,
      });
      if (!vr.error && vr.data) {
        const vd = vr.data as {
          valid?: boolean;
          status?: string;
          members?: string[];
          opened_by?: string;
        };
        if (vd.valid) {
          const updated: TableSession = {
            ...currentSess,
            openedBy: vd.opened_by || currentSess.openedBy,
            members: Array.isArray(vd.members) ? vd.members : currentSess.members,
          };
          if (JSON.stringify(updated) !== JSON.stringify(tableSessionRef.current)) {
            saveTableSession(updated);
          }
          setName((prev) => prev || updated.name);
        } else {
          // A comanda da mesa foi fechada no caixa -> libera para a próxima pessoa
          saveTableSession(null);
          setName('');
          setCodeInput('');
          setMine((prev) => {
            const cleaned = prev.filter((o) => o.tableTabId !== currentSess?.tabId);
            try {
              localStorage.setItem('mine' + barId, JSON.stringify(cleaned));
            } catch {
              // ignore
            }
            return cleaned;
          });
          if (silent) {
            showToast(`Comanda da ${cleanMesa} encerrada no caixa.`);
          }
        }
      }
    }

    const st = await sb.rpc('get_table_tab_state', {
      p_bar: barId,
      p_table: cleanMesa,
    });
    if (!st.error && st.data) {
      setTableState(st.data as TableServerState);
    }
  };

  const loadMenu = async (silent = false) => {
    if (!barId) {
      setErrTitle('Link inválido');
      setErrMsg('Falta o código do bar na URL. Abra pelo QR ou pelo link completo.');
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setErrTitle('');
      setErrMsg('');
    }

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo esgotado ao falar com o servidor (12s).')), 12000)
      );
      const res = await Promise.race([
        sb.rpc('get_menu', { p_bar: barId }),
        timeout,
      ]);

      if (res.error) {
        if (!silent) {
          setErrTitle('Erro no cardápio');
          setErrMsg(res.error.message || String(res.error));
          setLoading(false);
        }
        return;
      }

      const data = res.data as {
        bar?: MenuBarData;
        items?: MenuItem[];
        stock_items?: BarItem[];
        active_clients?: string[];
      } | null;
      if (!data || !data.bar) {
        if (!silent) {
          setErrTitle('Bar não encontrado');
          setErrMsg('Peça um novo QR para quem está no bar. Confira se o id na URL está certo.');
          setLoading(false);
        }
        return;
      }

      setBar((prev) => ({ ...(prev || {}), ...data.bar! }));
      applyBarTheme(data.bar);
      setActiveClients(Array.isArray(data.active_clients) ? data.active_clients : []);

      let resolvedItems: MenuItem[] = Array.isArray(data.items) ? data.items : [];
      let liveStock: BarItem[] | null = Array.isArray(data.stock_items) ? data.stock_items : null;
      const diag: string[] = [];

      // Tenta ler bar_items (se público ou autenticado) para dupla checagem em tempo real do estoque
      if (!liveStock) {
        try {
          const riCheck = await sb.from('bar_items').select('*').eq('bar_id', barId);
          if (!riCheck.error && Array.isArray(riCheck.data)) {
            liveStock = riCheck.data as BarItem[];
          }
        } catch {
          // sem permissão anônima direta — confia no get_menu
        }
      }

      if (liveStock && resolvedItems.length > 0) {
        resolvedItems = resolvedItems.filter((r) => makeDrink(r, liveStock!));
      }

      // Fallback autenticado: garante que receitas/preços recém-criados apareçam e mostra diagnóstico claro para o dono se algo faltar
      if (resolvedItems.length === 0) {
        const { data: sessData } = await sb.auth.getSession();
        if (sessData?.session) {
          const isHome = data.bar.kind === 'home' || data.bar.kind === 'casa';
          const [ri, rp, rr] = await Promise.all([
            sb.from('bar_items').select('*').eq('bar_id', barId),
            sb.from('bar_prices').select('recipe_id, price').eq('bar_id', barId),
            sb.from('recipes').select('*').order('name'),
          ]);
          const barItems = (ri.data as BarItem[]) || [];
          const prMap: Record<string, number> = {};
          ((rp.data as { recipe_id: string; price: number }[]) || []).forEach((x) => {
            prMap[x.recipe_id] = Number(x.price);
          });
          const allRecs = (rr.data as Recipe[]) || [];
          resolvedItems = allRecs
            .filter((r) => makeDrink(r, barItems) && (isHome || prMap[r.id] != null))
            .map((r) => ({ ...r, price: prMap[r.id] ?? null }));

          if (resolvedItems.length === 0) {
            const stockedCount = barItems.filter((i) => i.in_stock && (i.qty == null || i.qty > 0)).length;
            const makeable = allRecs.filter((r) => makeDrink(r, barItems));
            const pricedRecs = allRecs.filter((r) => prMap[r.id] != null);

            diag.push(
              `Estoque ativo: ${stockedCount} item(ns) · Drinks possíveis pelo estoque: ${makeable.length} · Drinks precificados: ${pricedRecs.length}`
            );

            if (!isHome && makeable.length > 0) {
              diag.push(
                `Falta preço para liberar: ${makeable
                  .slice(0, 5)
                  .map((r) => r.name)
                  .join(', ')}`
              );
            }
            if (pricedRecs.length > 0) {
              const firstPriced = pricedRecs.slice(0, 3).map((r) => {
                const miss = getMissingIngredientsForRecipe(r, barItems);
                return `${r.name} (falta no estoque: ${miss.join(', ') || 'nada'})`;
              });
              diag.push(`Precificados sem estoque completo: ${firstPriced.join(' · ')}`);
            }
          }
        }
      }

      setOwnerDiag(diag);
      setItems(resolvedItems);
      document.title = data.bar.name;

      if (!silent) {
        if (!isTableQr) {
          const nm = localStorage.getItem('nm');
          if (nm && localStorage.getItem('nmd') === today()) {
            setName(nm);
          }
        }
        try {
          const stored = JSON.parse(localStorage.getItem('mine' + barId) || '[]') as ClientOrderLocal[];
          setMine(stored.filter((o) => o.d === today()));
        } catch {
          setMine([]);
        }
      }

      if (isTableQr) {
        await syncTableTab(silent);
      }
    } catch (e) {
      if (!silent) {
        setErrTitle('Falha ao carregar');
        setErrMsg(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (cat !== 'Todas' && items.length > 0 && !items.some((i) => i.category === cat)) {
      setCat('Todas');
    }
  }, [items, cat]);

  useEffect(() => {
    void loadMenu(false);

    if (!barId) return () => applyBarTheme(null);

    // Atualiza o cardápio automaticamente ao vivo sem apagar nome ou pedidos do cliente
    const ch = sb
      .channel('menu-live-' + barId)
      .on('broadcast', { event: 'menu-updated' }, (payload) => {
        const incoming = (payload?.payload as { bar?: Partial<Bar> | null } | undefined)?.bar;
        if (incoming) {
          setBar((prev) => {
            if (!prev) return prev;
            const merged = { ...prev, ...incoming };
            applyBarTheme(merged);
            return merged;
          });
        }
        void loadMenu(true);
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bars', filter: 'id=eq.' + barId },
        () => {
          void loadMenu(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bar_items', filter: 'bar_id=eq.' + barId },
        () => {
          void loadMenu(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bar_prices', filter: 'bar_id=eq.' + barId },
        () => {
          void loadMenu(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_tabs', filter: 'bar_id=eq.' + barId },
        () => {
          if (isTableQr) void syncTableTab(true);
        }
      )
      .subscribe();

    // Checagem silenciosa a cada 5 segundos para conferir novos drinks disponíveis e estado da mesa
    const syncInterval = setInterval(() => {
      void loadMenu(true);
    }, 5000);

    return () => {
      clearInterval(syncInterval);
      void sb.removeChannel(ch);
      applyBarTheme(null);
    };
  }, [barId, cleanMesa]);

  useEffect(() => {
    if (!bar) return;
    const id = setInterval(async () => {
      const activeIds = mine.filter((o) => o.status !== 'done').map((o) => o.id);
      if (!activeIds.length) return;
      const res = await sb.rpc('order_status', { p_ids: activeIds });
      if (!res.data) return;

      const statusRows = res.data as { id: string; status: string }[];
      let changed = false;
      const freshReady: ClientOrderLocal[] = [];

      const next = mine.map((o) => {
        const found = statusRows.find((d) => d.id === o.id);
        if (!found) return o;
        const updated = { ...o, status: found.status };
        if (updated.status !== o.status) changed = true;
        if (updated.status === 'ready' && !updated.ack) {
          updated.ack = true;
          changed = true;
          freshReady.push(updated);
        }
        return updated;
      });

      if (changed) saveMine(next);
      if (freshReady.length) {
        beep(880, 0.6);
        if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
        document.title = '🍸 Seu drink está pronto!';
        setReadyAlert(freshReady);
      }
    }, 5000);

    return () => clearInterval(id);
  }, [bar, mine]);

  const menuNavRef = useRef({
    readyAlert,
    selectedRecipe,
    showOrders,
    showTags,
  });
  menuNavRef.current = {
    readyAlert,
    selectedRecipe,
    showOrders,
    showTags,
  };
  const lastBackExitRef = useRef(0);
  const lastBackTriggerRef = useRef(0);
  const exitingRef = useRef(false);

  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.meubarMenuGuard) {
        window.history.pushState({ meubarMenuGuard: true }, '');
      }
    } catch {
      // ignore
    }

    const handleMenuBack = (fromPopState: boolean) => {
      if (exitingRef.current) return;
      const now = Date.now();
      if (now - lastBackTriggerRef.current < 80) return;
      lastBackTriggerRef.current = now;

      const keepGuard = () => {
        if (!fromPopState) return;
        try {
          window.history.pushState({ meubarMenuGuard: true }, '');
        } catch {
          // ignore
        }
      };

      const st = menuNavRef.current;
      if (st.readyAlert) {
        setReadyAlert(null);
        keepGuard();
        return;
      }
      if (st.selectedRecipe) {
        setSelectedRecipe(null);
        keepGuard();
        return;
      }
      if (st.showOrders) {
        setShowOrders(false);
        keepGuard();
        return;
      }
      if (st.showTags) {
        setShowTags(false);
        keepGuard();
        return;
      }

      if (now - lastBackExitRef.current < 2200) {
        exitingRef.current = true;
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

    const onPopState = () => handleMenuBack(true);
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
      const handle = capApp.addListener('backButton', () => handleMenuBack(false));
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
  }, []);

  if (loading) {
    return (
      <div className="gate">
        <p className="mu">Carregando cardápio…</p>
      </div>
    );
  }

  if (errTitle || !bar) {
    return (
      <div className="gate">
        <h1 className="mt-6">{errTitle || 'Erro'}</h1>
        <p className="mu">{errMsg}</p>
        <p className="mu mt-4 break-all">{window.location.href}</p>
        <button type="button" className="b mt-4.5" onClick={() => void loadMenu(false)}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const priced = bar.kind !== 'home' && bar.kind !== 'casa';
  const totalCount = mine.reduce((s, o) => s + o.qty, 0);
  const totalPay = mine.reduce((s, o) => s + o.qty * (o.price || 0), 0);

  if (isTableQr && (!name || !tableSession)) {
    const enterTableMenu = async () => {
      const n = gateInput.trim();
      if (n.length < 2) {
        setGateErr('Digite seu nome (pelo menos 2 letras).');
        return;
      }
      if (tableState?.open && !codeInput.trim()) {
        setGateErr('Esta mesa já tem comanda aberta. Digite o código de 4 dígitos da mesa.');
        return;
      }

      setCheckingName(true);
      setGateErr('');

      const res = await sb.rpc('open_or_join_table_tab', {
        p_bar: barId,
        p_table: cleanMesa,
        p_name: n,
        p_code: codeInput.trim() || null,
      });

      setCheckingName(false);

      if (res.error) {
        const msg = String(res.error.message || '');
        if (msg.includes('open_or_join_table_tab') || msg.includes('does not exist')) {
          setGateErr(
            'A função de comanda automática por mesa ainda precisa ser atualizada no SQL do Supabase (schema_completo.sql).'
          );
        } else {
          setGateErr(msg);
        }
        return;
      }

      const d = res.data as {
        ok?: boolean;
        is_new?: boolean;
        needs_code?: boolean;
        tab_id?: string;
        table_label?: string;
        code?: string;
        opened_by?: string;
        members?: string[];
        error?: string;
      } | null;

      if (!d || !d.ok || !d.tab_id || !d.code) {
        if (d?.needs_code) {
          setTableState({
            open: true,
            tab_id: d.tab_id,
            table_label: cleanMesa,
            opened_by: d.opened_by,
          });
        }
        setGateErr(d?.error || 'Não foi possível abrir ou entrar na comanda da mesa.');
        return;
      }

      const sess: TableSession = {
        tabId: d.tab_id,
        code: d.code,
        name: n,
        table: d.table_label || cleanMesa,
        openedBy: d.opened_by || n,
        members: Array.isArray(d.members) ? d.members : [n],
        d: today(),
      };
      saveTableSession(sess);
      setTableState({
        open: true,
        tab_id: d.tab_id,
        table_label: sess.table,
        opened_by: sess.openedBy,
        members: sess.members,
      });
      setName(n);
      setGateErr('');
      showToast(
        d.is_new
          ? `Comanda da ${sess.table} aberta! Código: ${sess.code}`
          : `Você entrou na comanda da ${sess.table}!`
      );
    };

    const isOpenTable = Boolean(tableState?.open);

    return (
      <div className="gate">
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <BrandMark bar={bar} big />
        <p className="mu mt-6">Bem-vindo ao</p>
        <h1>{bar.name}</h1>
        <p className="tag mt-1">🪑 {cleanMesa}</p>

        {isOpenTable ? (
          <div className="alert-box mt-3 text-left max-w-[380px] w-full">
            <b>🔒 Comanda já aberta nesta mesa</b>
            <p className="mu mt-1">
              Aberta por <b>{tableState?.opened_by || 'outro cliente'}</b>. Para evitar comandas
              duplicadas, peça o código de 4 dígitos exibido no cardápio da mesa e informe seu nome
              abaixo.
            </p>
            {Array.isArray(tableState?.members) && tableState.members.length > 0 && (
              <p className="mu mt-1 text-[0.78rem]">
                Na comanda: {tableState.members.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <p className="mu my-2.5 mb-4 max-w-[380px]">
            Ao entrar pelo QR da mesa, sua comanda é aberta automaticamente para evitar duplicidade e
            gera um código para seus amigos entrarem na mesma mesa.
          </p>
        )}

        <input
          value={gateInput}
          onChange={(e) => {
            setGateInput(e.target.value);
            if (gateErr) setGateErr('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isOpenTable) void enterTableMenu();
          }}
          placeholder="Seu nome (ex: João Silva)"
          maxLength={40}
          autoComplete="given-name"
          autoFocus
        />

        {isOpenTable && (
          <input
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.replace(/\s+/g, ''));
              if (gateErr) setGateErr('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void enterTableMenu();
            }}
            placeholder="Código da mesa (4 dígitos)"
            inputMode="numeric"
            maxLength={8}
            className="mt-2 text-center tracking-widest font-bold"
          />
        )}

        <button
          type="button"
          className="b mt-2"
          disabled={checkingName}
          onClick={() => void enterTableMenu()}
        >
          {checkingName
            ? 'Verificando…'
            : isOpenTable
            ? 'Entrar na comanda da mesa'
            : 'Abrir comanda da mesa'}
        </button>
        {gateErr && <p className="err">{gateErr}</p>}
      </div>
    );
  }

  if (!isTableQr && !name) {
    const enterMenu = async () => {
      const n = gateInput.trim();
      if (n.length < 2) {
        setGateErr('Digite pelo menos 2 letras.');
        return;
      }
      setCheckingName(true);
      let serverActive = activeClients;
      try {
        const rpc = await Promise.race([
          sb.rpc('active_client_names', { p_bar: barId }),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 4000)
          ),
        ]);
        if (!rpc.error && Array.isArray(rpc.data)) {
          serverActive = rpc.data as string[];
        }
      } catch {
        // fallback to already fetched activeClients
      }
      setCheckingName(false);

      const savedLocal = localStorage.getItem('nm');
      const isMyExistingTab =
        Boolean(savedLocal && norm(savedLocal) === norm(n)) &&
        mine.some((o) => o.status !== 'done');

      const duplicate = serverActive.find((x) => norm(x) === norm(n));
      if (duplicate && !isMyExistingTab) {
        setGateErr(
          `Já existe um cliente ativo com o nome "${duplicate}" agora. Use nome + sobrenome (ex: ${n} Silva).`
        );
        return;
      }

      setGateErr('');
      setName(n);
      localStorage.setItem('nm', n);
      localStorage.setItem('nmd', today());
    };

    return (
      <div className="gate">
        {toastMsg && <div className="toast">{toastMsg}</div>}
        <BrandMark bar={bar} big />
        <p className="mu mt-6">Bem-vindo ao</p>
        <h1>{bar.name}</h1>
        <p className="mu my-2.5 mb-5.5">
          Você pode olhar o cardápio livremente; sua comanda abre apenas quando fizer seu primeiro
          pedido.
        </p>
        <input
          value={gateInput}
          onChange={(e) => {
            setGateInput(e.target.value);
            if (gateErr) setGateErr('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void enterMenu();
          }}
          placeholder="Seu nome (ex: João Silva)"
          maxLength={40}
          autoComplete="given-name"
          autoFocus
        />
        <button
          type="button"
          className="b"
          disabled={checkingName}
          onClick={() => void enterMenu()}
        >
          {checkingName ? 'Verificando…' : 'Ver cardápio'}
        </button>
        {gateErr && <p className="err">{gateErr}</p>}
      </div>
    );
  }

  const design = getBarMenuDesign(bar);
  const activePromo = getActivePromotion(bar);
  const blockOrder = normalizeBlockOrder(design.block_order);
  const accent = bar.color_accent || '#e5a93c';
  const surface = bar.color_surface || '#141218';
  const colorBg = bar.color_bg || '#0b0a0d';
  const colorText = bar.color_text || '#f6f1ea';
  const bgStyle = buildMenuBackgroundStyle(colorBg, design, accent);

  const drinksItems = items.filter((i) => getRecipeItemType(i) === 'drink');
  const petiscosItems = items.filter((i) => getRecipeItemType(i) === 'petisco');
  const avulsosItems = items.filter((i) => getRecipeItemType(i) === 'avulso');
  const sectionItems =
    menuSection === 'petisco'
      ? petiscosItems
      : menuSection === 'avulso'
        ? avulsosItems
        : drinksItems;

  const cats = ['Todas', ...Array.from(new Set(sectionItems.map((i) => i.category)))];
  const filtered = sectionItems.filter((i) => {
    if (cat !== 'Todas' && i.category !== cat) return false;
    if (menuSection === 'drink' && tags.size > 0) {
      const t = new Set(recipeTags(i));
      for (const x of tags) {
        if (!t.has(x)) return false;
      }
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const inName = (i.name || '').toLowerCase().includes(q);
      const inDesc = (i.story || i.description || '').toLowerCase().includes(q);
      const inIng = (i.ingredients || []).some((x) => (x.n || '').toLowerCase().includes(q));
      if (!inName && !inIng && !inDesc) return false;
    }
    return true;
  });

  const displayMode = bar.menu_display_mode || 'grid-classic';
  const okColor = bar.color_ok || '#34d399';

  const openRecipeDetail = (r: MenuItem) => {
    setSelectedRecipe(r);
    setNote('');
    setQty(1);
    setOrderErr('');
  };

  const nowForHh = new Date(Date.now() + hhTick * 0);
  const activeHappyHours = getActiveHappyHours(bar, nowForHh);

  const getItemFinalPrice = (r: MenuItem) => {
    const promoRes = getPromoAdjustedPrice(r.price, r.category, activePromo);
    const hhRes = getEffectiveItemPrice(r.price, r, bar, nowForHh);
    if (
      hhRes.discounted &&
      hhRes.finalPrice != null &&
      (promoRes.finalPrice == null || hhRes.finalPrice <= promoRes.finalPrice)
    ) {
      return {
        finalPrice: hhRes.finalPrice,
        originalPrice: hhRes.originalPrice,
        discounted: true,
        badge: hhRes.badge,
        happyHourName: hhRes.ruleName,
      };
    }
    return {
      finalPrice: promoRes.finalPrice,
      originalPrice: promoRes.originalPrice,
      discounted: promoRes.discounted,
      badge: undefined as string | undefined,
      happyHourName: undefined as string | undefined,
    };
  };

  const filteredWithHappyHour = filtered.map((r) => {
    const eff = getEffectiveItemPrice(r.price, r, bar, nowForHh);
    if (eff.discounted && eff.finalPrice != null) {
      return { ...r, price: eff.finalPrice };
    }
    return r;
  });

  const handlePlaceOrder = async (recipe: MenuItem, orderQty: number, orderNote: string) => {
    setSending(true);
    setOrderErr('');
    const priceInfo = getItemFinalPrice(recipe);
    const hhNote = priceInfo.happyHourName ? `[${priceInfo.happyHourName}]` : '';
    const joinedNote = [hhNote, orderNote.trim()].filter(Boolean).join(' · ');
    const finalNote = cleanMesa
      ? joinedNote
        ? `${cleanMesa} · ${joinedNote}`
        : cleanMesa
      : joinedNote;

    let res = await sb.rpc('place_order', {
      p_bar: barId,
      p_name: name,
      p_recipe: recipe.id,
      p_qty: orderQty,
      p_note: finalNote,
      p_table: cleanMesa || null,
      p_tab_id: tableSession?.tabId || null,
    });

    if (res.error && String(res.error.message || '').includes('place_order')) {
      res = await sb.rpc('place_order', {
        p_bar: barId,
        p_name: name,
        p_recipe: recipe.id,
        p_qty: orderQty,
        p_note: finalNote,
      });
    }

    setSending(false);
    if (res.error) {
      if (String(res.error.message || '').includes('já foi fechada')) {
        saveTableSession(null);
        setName('');
        setSelectedRecipe(null);
        showToast('A comanda desta mesa foi fechada no caixa.');
        return;
      }
      setOrderErr(res.error.message);
      return;
    }

    const next = [
      ...mine,
      {
        id: String(res.data),
        recipe_id: recipe.id,
        name: recipe.name,
        qty: orderQty,
        price: priceInfo.finalPrice ?? recipe.price,
        status: 'pending',
        d: today(),
        tableTabId: tableSession?.tabId,
      },
    ];
    saveMine(next);
    setSelectedRecipe(null);
    showToast(`Pedido enviado, ${name}!`);
  };

  const handleSendStaffCall = async (kind: 'waiter' | 'bill', customNote: string) => {
    const elapsed = Date.now() - lastCallAt;
    if (elapsed < 20000) {
      const waitSec = Math.ceil((20000 - elapsed) / 1000);
      showToast(`Aguarde ${waitSec}s antes de chamar novamente.`);
      return;
    }
    setCallingStaff(true);
    try {
      await sendTableCall(barId, {
        table_label: tableSession?.table || cleanMesa || null,
        client_name: name || 'Cliente',
        kind,
        note: customNote.trim() || null,
      });
      setLastCallAt(Date.now());
      setCallModal(null);
      setCallNote('');
      showToast(
        kind === 'bill'
          ? '🧾 Conta solicitada! O garçom já foi avisado.'
          : '🙋 Garçom chamado! Já avisamos a equipe.'
      );
    } finally {
      setCallingStaff(false);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'Preparando',
    ready: 'Pronto, pode buscar',
    done: 'Entregue',
  };

  const renderSection = (blockId: MenuBlockId) => {
    if (blockId === 'header') {
      return <MenuHeaderCard bar={bar} design={design} mesa={mesa} />;
    }

    if (blockId === 'promo') {
      return activePromo ? (
        <MenuPromoBanner promo={activePromo} accent={accent} surface={surface} />
      ) : null;
    }

    if (blockId === 'filters') {
      const tabBtns: { id: ItemType; emoji: string; label: string; count: number }[] = [
        { id: 'drink', emoji: '🍸', label: 'Drinks', count: drinksItems.length },
        { id: 'petisco', emoji: '🍟', label: 'Petiscos', count: petiscosItems.length },
        { id: 'avulso', emoji: '🍺', label: 'Avulsos', count: avulsosItems.length },
      ];
      return (
        <div>
          {!bar.open && (
            <p className="err !text-base mt-2">
              Pedidos pausados no momento. Tente de novo em instantes.
            </p>
          )}

          {/* 3 Abas Principais do Cardápio: Drinks | Petiscos | Avulsos */}
          <div
            className="grid grid-cols-3 gap-1.5 mt-3 p-1 rounded-2xl border"
            style={{
              background: `${surface}dd`,
              borderColor: `${accent}44`,
            }}
          >
            {tabBtns.map((tb) => {
              const active = menuSection === tb.id;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => {
                    setMenuSection(tb.id);
                    setCat('Todas');
                    if (tb.id !== 'drink') {
                      setShowTags(false);
                      setTags(new Set());
                    }
                  }}
                  className="py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold border-0 cursor-pointer transition-all flex items-center justify-center gap-1"
                  style={
                    active
                      ? {
                          background: accent,
                          color: '#121015',
                          boxShadow: `0 4px 14px ${accent}44`,
                        }
                      : {
                          background: 'transparent',
                          color: colorText,
                          opacity: 0.78,
                        }
                  }
                >
                  <span>{tb.emoji}</span>
                  <span>{tb.label}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold"
                    style={{
                      background: active ? 'rgba(0,0,0,0.18)' : `${accent}24`,
                      color: active ? '#121015' : accent,
                    }}
                  >
                    {tb.count}
                  </span>
                </button>
              );
            })}
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              menuSection === 'petisco'
                ? 'Buscar petisco, porção ou lanche…'
                : menuSection === 'avulso'
                  ? 'Buscar cerveja, energético ou refrigerante…'
                  : 'Buscar drink ou ingrediente…'
            }
            className="mt-3"
          />

          {menuSection === 'drink' && (
            <div className="row mt-2.5">
              <button
                type="button"
                className="b g sm"
                onClick={() => setShowTags((s) => !s)}
              >
                ✨ O que tomar?
              </button>
            </div>
          )}

          {cats.length > 2 && (
            <div className="chips">
              {cats.map((c) => (
                <span
                  key={c}
                  className={`chip ${cat === c ? 'on' : ''}`}
                  onClick={() => setCat(c)}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {menuSection === 'drink' && showTags && (
            <>
              <div className="chips !flex-wrap !overflow-visible">
                {ALL_TAGS.map((t) => (
                  <span
                    key={t}
                    className={`chip ${tags.has(t) ? 'on' : ''}`}
                    onClick={() => {
                      const next = new Set(tags);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      setTags(next);
                    }}
                  >
                    {t}
                  </span>
                ))}
                {tags.size > 0 && (
                  <span
                    className="chip border-dashed"
                    onClick={() => setTags(new Set())}
                  >
                    Limpar filtros
                  </span>
                )}
              </div>
              {tags.size > 0 && (
                <p className="mu">
                  {tags.size} filtro(s) · {filtered.length} opção(ões)
                </p>
              )}
            </>
          )}
        </div>
      );
    }

    if (blockId === 'drinks') {
      if (sectionItems.length === 0) {
        return (
          <div className="panel mt-3">
            <p className="mu">
              {menuSection === 'petisco'
                ? '🍟 Nenhum petisco disponível no cardápio agora.'
                : menuSection === 'avulso'
                  ? '🍺 Nenhuma bebida avulsa disponível no cardápio agora.'
                  : '🍸 Nenhum drink disponível no cardápio agora.'}
            </p>
            {menuSection === 'drink' && priced && (
              <p className="mu mt-1 text-[0.78rem]">
                Assim que houver ingredientes no estoque e preço salvo para o drink, ele aparece aqui
                automaticamente em segundos.
              </p>
            )}
            {menuSection !== 'drink' && (
              <p className="mu mt-1 text-[0.78rem]">
                Assim que o estabelecimento cadastrar itens nesta aba, eles aparecem aqui
                automaticamente.
              </p>
            )}
            {menuSection === 'drink' && ownerDiag.length > 0 && (
              <div className="alert-box mt-2.5 text-left">
                <b>🔍 Diagnóstico da loja (visível só para quem gerencia):</b>
                {ownerDiag.map((line, i) => (
                  <p key={i} className="mu mt-1 text-[0.78rem]">
                    • {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      }
      if (filtered.length === 0) {
        return (
          <div className="panel mt-3">
            <p className="mu">Nenhum item encontrado com esse filtro.</p>
            <button
              type="button"
              className="b g sm mt-2"
              onClick={() => {
                setCat('Todas');
                setQuery('');
                setTags(new Set());
              }}
            >
              Limpar filtros
            </button>
          </div>
        );
      }
      return (
        <MenuDrinksCatalog
          recipes={filteredWithHappyHour}
          displayMode={displayMode}
          design={design}
          accent={accent}
          surface={surface}
          okColor={okColor}
          textColor={colorText}
          activePromo={activePromo}
          onSelectDrink={(r) => {
            const orig = items.find((x) => x.id === r.id) || (r as MenuItem);
            openRecipeDetail(orig);
          }}
        />
      );
    }

    return (
      <FooterOrnamentView
        id={design.footer_ornament}
        accent={accent}
        barName={bar.name}
        footerText={design.footer_text}
      />
    );
  };

  const selectedPriceInfo = selectedRecipe ? getItemFinalPrice(selectedRecipe) : null;

  return (
    <div style={{ ...bgStyle, color: colorText, minHeight: '100dvh' }}>
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <div className="top">
        <BrandMark bar={bar} />
        <div className="row">
          <PWAInstallButton variant="pill" />
          <button
            type="button"
            className="lnk"
            onClick={() => {
              if (isTableQr) {
                saveTableSession(null);
              } else {
                localStorage.removeItem('nm');
              }
              setName('');
            }}
          >
            {name} · trocar
          </button>
        </div>
      </div>

      <div className="w">
        {isTableQr && tableSession && (
          <div className="panel mb-3 !border-[var(--ac)]">
            <div className="row sp flex-wrap gap-2">
              <div>
                <b className="text-[0.98rem]">
                  🪑 {tableSession.table} · Comanda aberta
                </b>
                <p className="mu mt-0.5 text-[0.78rem]">
                  Código para quem entrar nesta mesa:{' '}
                  <b className="text-[var(--ac)] text-[1.05rem] tracking-widest">
                    {tableSession.code}
                  </b>
                </p>
                <p className="mu mt-0.5 text-[0.75rem]">
                  Na comanda: <b>{tableSession.members.join(', ')}</b> (seu nome vai nos seus
                  drinks para facilitar a entrega).
                </p>
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(tableSession.code);
                  showToast(`Código ${tableSession.code} copiado!`);
                }}
              >
                Copiar código
              </button>
            </div>
          </div>
        )}
        {activeHappyHours.length > 0 && (
          <div
            className="panel mb-3 !py-2.5"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.22), rgba(234,88,12,0.16))',
              borderColor: 'rgba(251,191,36,0.55)',
            }}
          >
            <div className="row sp flex-wrap gap-2">
              <div>
                <b className="text-sm text-amber-200">
                  🍻 Happy Hour Ativo Agora — {activeHappyHours[0].name}
                </b>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Preços promocionais aplicados automaticamente até às{' '}
                  <b>{activeHappyHours[0].end_time}</b>!
                </p>
              </div>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-400/25 text-amber-100">
                {activeHappyHours[0].badge ||
                  (activeHappyHours[0].discount_type === 'percent'
                    ? `-${activeHappyHours[0].discount_value}% OFF`
                    : activeHappyHours[0].discount_type === 'fixed_price'
                      ? `Por ${money(activeHappyHours[0].discount_value)}`
                      : `-${money(activeHappyHours[0].discount_value)}`)}
              </span>
            </div>
          </div>
        )}

        {/* BOTÕES RÁPIDOS DE ATENDIMENTO: CHAMAR GARÇOM & PEDIR A CONTA */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            className="b g sm !py-2.5"
            onClick={() => {
              setCallNote('');
              setCallModal('waiter');
            }}
          >
            🙋 Chamar Garçom
          </button>
          <button
            type="button"
            className="b sm !py-2.5"
            onClick={() => {
              setCallNote('Trazer maquininha (Crédito/Débito)');
              setCallModal('bill');
            }}
          >
            🧾 Pedir a Conta
          </button>
        </div>

        <SideDetailWrapper sideDetail={design.side_detail} accent={accent}>
          {blockOrder.map((blockId) => {
            const node = renderSection(blockId);
            return node ? <div key={blockId}>{node}</div> : null;
          })}
        </SideDetailWrapper>
      </div>

      {mine.length > 0 && (
        <button type="button" className="cart" onClick={() => setShowOrders(true)}>
          <span>
            🍸 {totalCount} {totalCount === 1 ? 'item pedido' : 'itens pedidos'}
          </span>
          {priced && <b>{money(totalPay)}</b>}
        </button>
      )}

      {selectedRecipe && (
        <div className="ov">
          <div
            className={`hero c${Math.max(0, CATS.indexOf(selectedRecipe.category))}`}
            style={
              selectedRecipe.image_url
                ? { backgroundImage: `url('${selectedRecipe.image_url}')` }
                : undefined
            }
          >
            {selectedRecipe.image_url
              ? null
              : getRecipeItemType(selectedRecipe) === 'petisco'
                ? '🍟'
                : getRecipeItemType(selectedRecipe) === 'avulso'
                  ? '🍺'
                  : '🍸'}
          </div>
          <div className="w">
            <button
              type="button"
              className="b g"
              onClick={() => setSelectedRecipe(null)}
            >
              ← Voltar
            </button>
            <h1 className="mt-4">{selectedRecipe.name}</h1>
            {selectedPriceInfo?.finalPrice != null && (
              <p className="text-[1.4rem] text-[var(--ok)] font-bold flex items-center gap-2 flex-wrap">
                {selectedPriceInfo.discounted && selectedPriceInfo.originalPrice != null && (
                  <span className="text-base line-through opacity-55">
                    {money(selectedPriceInfo.originalPrice)}
                  </span>
                )}
                <span>{money(selectedPriceInfo.finalPrice)}</span>
                {selectedPriceInfo.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 font-bold">
                    {selectedPriceInfo.badge}
                  </span>
                )}
              </p>
            )}
            {selectedRecipe.description && <p className="desc">{selectedRecipe.description}</p>}

            {(selectedRecipe.ingredients || []).length > 0 && (
              <>
                <h2 className="mt-5.5 mb-1">O que leva</h2>
                <div className="chips !flex-wrap !overflow-visible">
                  {(selectedRecipe.ingredients || []).map((i, idx) => (
                    <span key={`${i.n}-${idx}`} className="chip st1">
                      {i.n}
                    </span>
                  ))}
                </div>
              </>
            )}

            {selectedRecipe.story && (
              <>
                <h2 className="mt-4.5 mb-1.5">
                  {getRecipeItemType(selectedRecipe) === 'drink' ? 'A história' : 'Descrição'}
                </h2>
                <p className="mu story">{selectedRecipe.story}</p>
              </>
            )}

            {mesa && (
              <p className="tag mt-3">
                🪑 Pedido vinculado automaticamente à <b>{mesa}</b>
              </p>
            )}

            {(() => {
              const itemType = getRecipeItemType(selectedRecipe);
              const mods = (getBarOpsData(bar).modifiers || []).filter(
                (m) => m.applies_to === 'all' || m.applies_to === itemType
              );
              if (mods.length === 0) return null;
              return (
                <div className="mt-3">
                  <label className="!mt-0">Opções rápidas / Adicionais</label>
                  <div className="chips !flex-wrap !overflow-visible mt-1">
                    {mods.map((m) => {
                      const token = m.price > 0 ? `${m.name} (+${money(m.price)})` : m.name;
                      const isOn = note.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`chip cursor-pointer ${isOn ? 'on' : ''}`}
                          onClick={() => {
                            if (isOn) {
                              setNote((prev) =>
                                prev
                                  .split(' · ')
                                  .filter((p) => !p.includes(m.name))
                                  .join(' · ')
                              );
                            } else {
                              setNote((prev) => (prev.trim() ? `${prev.trim()} · ${token}` : token));
                            }
                          }}
                        >
                          {isOn ? '✓ ' : '+ '}
                          {token}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <label>Observação (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={140}
              placeholder="Ex: sem açúcar, pouco gelo"
            />

            <label>Quantidade</label>
            <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="b full mt-4"
              disabled={!bar.open || sending}
              onClick={() => void handlePlaceOrder(selectedRecipe, qty, note)}
            >
              {sending
                ? 'Enviando...'
                : `Pedir${
                    selectedPriceInfo?.finalPrice != null
                      ? ` · ${money(selectedPriceInfo.finalPrice)}`
                      : ''
                  }`}
            </button>
            {orderErr && <p className="err">{orderErr}</p>}
          </div>
        </div>
      )}

      {showOrders && (
        <div className="ov">
          <div className="w">
            <button type="button" className="b g" onClick={() => setShowOrders(false)}>
              ← Voltar
            </button>
            <h1 className="mt-3.5 mb-1">Meus pedidos</h1>
            <p className="mu">
              {name} · hoje{mesa ? ` · ${mesa}` : ''}
            </p>
            <div className="list mt-2.5">
              {mine.map((x) => {
                const matchRecipe = items.find(
                  (it) => it.id === x.recipe_id || it.name === x.name
                );
                return (
                  <div key={x.id}>
                    <span>
                      <b>
                        {x.qty}× {x.name}
                      </b>
                      <br />
                      <span className="mu">{statusLabels[x.status] || ''}</span>
                    </span>
                    <div className="row">
                      {priced && x.price != null && <b>{money(x.qty * x.price)}</b>}
                      {matchRecipe && bar.open && (
                        <button
                          type="button"
                          className="b g sm"
                          onClick={() => {
                            setShowOrders(false);
                            openRecipeDetail(matchRecipe);
                          }}
                        >
                          Repetir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pay mt-4.5">
              <div className="row sp">
                <span>Total de itens</span>
                <b>{totalCount}</b>
              </div>
              {priced && (
                <>
                  <div className="row sp mt-1.5">
                    <span>Total a pagar</span>
                    <span className="tt">{money(totalPay)}</span>
                  </div>
                  <p className="mu mt-2">O pagamento é feito direto no caixa.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {callModal && (
        <div className="ov !z-40" onClick={() => !callingStaff && setCallModal(null)}>
          <div className="w narrow" onClick={(e) => e.stopPropagation()}>
            <div className="row sp mb-2">
              <h2 className="!m-0">
                {callModal === 'bill' ? '🧾 Pedir a Conta' : '🙋 Chamar Garçom'}
              </h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => setCallModal(null)}
              >
                ✕
              </button>
            </div>
            <p className="mu text-xs mb-3">
              {cleanMesa ? `Mesa: ${cleanMesa} · ` : ''}Cliente: <b>{name}</b>
              {callModal === 'bill' && priced && totalPay > 0
                ? ` · Consumo estimado: ${money(totalPay)}`
                : ''}
            </p>

            {callModal === 'bill' ? (
              <div className="space-y-2 mb-3">
                <label className="!mt-0">Como prefere pagar presencialmente?</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    'Trazer maquininha (Crédito/Débito)',
                    'Pagar no Pix (mostrar QR na mesa)',
                    'Pagar em Dinheiro',
                    'Dividir a conta na mesa',
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`b sm !justify-start ${callNote === opt ? '' : 'g'}`}
                      onClick={() => setCallNote(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <label className="!mt-0">O que você precisa? (opcional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Atendimento na mesa', 'Guardanapos / Talheres', 'Mais gelo / Limão', 'Limpar a mesa'].map(
                    (opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`b sm ${callNote === opt ? '' : 'g'}`}
                        onClick={() => setCallNote(opt)}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <input
              value={callNote}
              onChange={(e) => setCallNote(e.target.value)}
              placeholder={
                callModal === 'bill'
                  ? 'Ex: Troco para R$ 100 ou dividir em 2x'
                  : 'Algum recado para o garçom?'
              }
              maxLength={120}
            />

            <button
              type="button"
              className="b ok full mt-3"
              disabled={callingStaff}
              onClick={() => void handleSendStaffCall(callModal, callNote)}
            >
              {callingStaff
                ? 'Avisando equipe…'
                : callModal === 'bill'
                  ? '🧾 Enviar pedido de conta'
                  : '🙋 Chamar garçom agora'}
            </button>
          </div>
        </div>
      )}

      {readyAlert && (
        <div className="ov !z-40">
          <div className="call">
            Seu drink está pronto!
            <br />
            <span className="text-[var(--ok)]">{name}</span>
          </div>
          <div className="w">
            <p className="mu text-center mb-2">
              {readyAlert.map((x) => `${x.qty}× ${x.name}`).join(', ')}
            </p>
            <button
              type="button"
              className="b ok full"
              onClick={() => {
                setReadyAlert(null);
                document.title = bar.name;
              }}
            >
              Vou buscar no bar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
