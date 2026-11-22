import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  readStoredCustomerDisplay,
  subscribeCustomerDisplay,
  type CustomerDisplayPayload,
  type DisplayMode,
} from '../lib/displaySync';
import { parseDeliveryOrderMeta, playStationAlert } from '../lib/opsUtils';
import { sb } from '../lib/supabase';
import {
  getContrastingAccentColor,
  getContrastingTextColor,
  getRecipeItemType,
  isColorLight,
  menuUrl,
  money,
} from '../lib/utils';
import type { Bar, Order, Recipe } from '../types/meubar';

function fmtClock(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function minutesSince(iso?: string): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export const SecondScreenDisplay: React.FC<{
  barId: string;
  mode: DisplayMode;
  initialStation?: 'all' | 'bar' | 'cozinha';
  onExit?: () => void;
}> = ({ barId, mode, initialStation = 'all', onExit }) => {
  const [bar, setBar] = useState<Partial<Bar> | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customerPayload, setCustomerPayload] = useState<CustomerDisplayPayload | null>(() =>
    readStoredCustomerDisplay(barId)
  );
  const [stationFilter, setStationFilter] = useState<'all' | 'bar' | 'cozinha'>(initialStation);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevReadyIdsRef = useRef<Set<string>>(new Set());

  // Relógio ao vivo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // Volta automaticamente para a logo após 6s da confirmação de pagamento
  useEffect(() => {
    if (customerPayload?.mode !== 'paid') return;
    const t = setTimeout(() => {
      setCustomerPayload({
        mode: 'idle',
        barId,
        updatedAt: new Date().toISOString(),
      });
    }, 6000);
    return () => clearTimeout(t);
  }, [customerPayload?.mode, customerPayload?.updatedAt, barId]);

  const loadBarAndOrders = async () => {
    // 1. Dados públicos do bar (funciona mesmo sem login via get_menu)
    const menuRes = await sb.rpc('get_menu', { p_bar: barId });
    if (!menuRes.error && menuRes.data) {
      const dataObj = menuRes.data as { bar?: Partial<Bar>; recipes?: Recipe[] };
      if (dataObj.bar) setBar(dataObj.bar);
      if (Array.isArray(dataObj.recipes)) setRecipes(dataObj.recipes);
    } else {
      const bRes = await sb.from('bars').select('*').eq('id', barId).maybeSingle();
      if (!bRes.error && bRes.data) setBar(bRes.data as Bar);
    }

    if (mode !== 'customer') {
      const oRes = await sb
        .from('orders')
        .select('*')
        .eq('bar_id', barId)
        .neq('status', 'done')
        .order('created_at', { ascending: true });
      if (!oRes.error && Array.isArray(oRes.data)) {
        const list = oRes.data as Order[];
        setOrders(list);

        const nextReadyIds = new Set(list.filter((o) => o.status === 'ready').map((o) => o.id));
        if (
          mode === 'queue_client' &&
          soundEnabled &&
          prevReadyIdsRef.current.size > 0 &&
          Array.from(nextReadyIds).some((id) => !prevReadyIdsRef.current.has(id))
        ) {
          playStationAlert('garcom', 'orderReady');
        }
        prevReadyIdsRef.current = nextReadyIds;
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!barId) return;
    void loadBarAndOrders();

    // Assina eventos em tempo real da 2ª tela do caixa
    const unsubCustomer = subscribeCustomerDisplay(barId, (payload) => {
      setCustomerPayload(payload);
    });

    // Assina pedidos em tempo real para filas (cliente e equipe)
    const orderCh =
      mode !== 'customer'
        ? sb
            .channel(`display-orders-${barId}-${mode}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `bar_id=eq.${barId}`,
              },
              () => {
                void loadBarAndOrders();
              }
            )
            .subscribe()
        : null;

    const poll =
      mode !== 'customer'
        ? setInterval(() => {
            if (!document.hidden) void loadBarAndOrders();
          }, 4000)
        : null;

    return () => {
      unsubCustomer();
      if (orderCh) void sb.removeChannel(orderCh);
      if (poll) clearInterval(poll);
    };
  }, [barId, mode]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore fullscreen denial
    }
  };

  const bg = bar?.color_bg || '#0b0a0d';
  const surface = bar?.color_surface || '#15131a';
  const accent = getContrastingAccentColor(bar?.color_accent || '#e5a93c', bg);
  const ok = bar?.color_ok || '#34d399';
  const textCol = getContrastingTextColor(bg, bar?.color_text);
  const cardTextCol = getContrastingTextColor(surface, bar?.color_text);
  const lightBg = isColorLight(bg);
  const borderCol = lightBg ? 'rgba(17,17,20,0.14)' : 'rgba(255,255,255,0.12)';

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  // Agrupamento para TV de Clientes (por Cliente / Mesa / Delivery)
  const clientQueueBuckets = useMemo(() => {
    const preparingMap = new Map<
      string,
      { key: string; label: string; badge: string; itemsCount: number; since: string }
    >();
    const readyMap = new Map<
      string,
      { key: string; label: string; badge: string; itemsCount: number; since: string }
    >();

    orders.forEach((o) => {
      const dlv = parseDeliveryOrderMeta(o);
      const client = (o.client_name || o.customer_name || 'Cliente').trim();
      const label = dlv
        ? `#${dlv.code} · ${client}`
        : o.table_label
          ? `${o.table_label} · ${client}`
          : client;
      const badge = dlv
        ? dlv.mode === 'pickup'
          ? '🛍️ Retirada'
          : '🛵 Delivery'
        : o.table_label
          ? '🪑 Mesa'
          : '🍸 Balcão';
      const key = `${label.toLowerCase()}`;
      const target = o.status === 'ready' ? readyMap : preparingMap;
      const prev = target.get(key);
      if (prev) {
        prev.itemsCount += Number(o.qty) || 1;
      } else {
        target.set(key, {
          key,
          label,
          badge,
          itemsCount: Number(o.qty) || 1,
          since: o.created_at || '',
        });
      }
    });

    return {
      preparing: Array.from(preparingMap.values()),
      ready: Array.from(readyMap.values()),
    };
  }, [orders]);

  // Pedidos filtrados para TV da Equipe (KDS somente leitura)
  const teamOrders = useMemo(() => {
    return orders.filter((o) => {
      if (stationFilter === 'all') return true;
      const rec = recipeMap.get(o.recipe_id);
      const st = o.station || (rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar');
      return st === stationFilter;
    });
  }, [orders, stationFilter, recipeMap]);

  const showIdleLogo =
    (mode === 'customer' && (!customerPayload || customerPayload.mode === 'idle')) ||
    (mode === 'queue_client' &&
      clientQueueBuckets.preparing.length === 0 &&
      clientQueueBuckets.ready.length === 0) ||
    (mode === 'queue_team' && teamOrders.length === 0);

  const publicMenuLink = menuUrl(barId);

  return (
    <div
      className="min-h-dvh w-full flex flex-col justify-between p-5 sm:p-8 select-none"
      style={{
        background: bg,
        color: textCol,
      }}
    >
      {/* Topbar ultra limpa da 2ª tela */}
      <header
        className="flex items-center justify-between gap-4 pb-4 border-b"
        style={{ borderColor: borderCol }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={bar?.logo_url || '/logo.png'}
            alt={bar?.name || 'Logo'}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border-2 shrink-0"
            style={{ borderColor: accent }}
          />
          <div className="min-w-0">
            <div
              className="font-extrabold text-xl sm:text-2xl truncate leading-tight"
              style={{ color: accent }}
            >
              {bar?.name || 'Meu Bar'}
            </div>
            <div className="text-xs sm:text-sm opacity-75 truncate">
              {mode === 'customer'
                ? 'Resumo da Compra & Pagamento'
                : mode === 'queue_client'
                  ? 'Acompanhe seu Pedido ao Vivo'
                  : 'Painel de Pedidos da Equipe (Somente Visualização)'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'queue_team' && (
            <div className="hidden sm:flex items-center gap-1">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'bar', label: '🍸 Bar' },
                  { id: 'cozinha', label: '🍳 Cozinha' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStationFilter(st.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer"
                  style={{
                    background: stationFilter === st.id ? accent : 'transparent',
                    color: stationFilter === st.id ? '#111014' : textCol,
                    borderColor: borderCol,
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}

          {mode === 'queue_client' && (
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-transparent"
              style={{ borderColor: borderCol, color: textCol }}
              title="Ligar/desligar aviso sonoro de pedido pronto"
            >
              {soundEnabled ? '🔔 Som' : '🔕 Mudo'}
            </button>
          )}

          <div
            className="px-3 py-1.5 rounded-lg text-sm sm:text-base font-extrabold tabular-nums border"
            style={{ borderColor: borderCol, background: surface, color: cardTextCol }}
          >
            {fmtClock(now)}
          </div>

          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-transparent"
            style={{ borderColor: borderCol, color: textCol }}
            title="Tela cheia"
          >
            {isFullscreen ? '⤢ Sair' : '⛶ Tela Cheia'}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer bg-transparent"
              style={{ borderColor: borderCol, color: textCol }}
            >
              ✕ Fechar
            </button>
          )}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {loading ? (
          <div className="text-center opacity-70 text-lg">Conectando tela em tempo real…</div>
        ) : showIdleLogo ? (
          /* TELA DE ESPERA COM A LOGO DA EMPRESA */
          <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 py-8">
            <div
              className="w-40 h-40 sm:w-52 sm:h-52 rounded-[36px] overflow-hidden border-4 shadow-2xl flex items-center justify-center"
              style={{
                borderColor: accent,
                background: surface,
                boxShadow: `0 20px 60px ${accent}33`,
              }}
            >
              <img
                src={bar?.logo_url || '/logo.png'}
                alt={bar?.name || 'Logo da empresa'}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <h1
                className="text-4xl sm:text-6xl font-extrabold tracking-tight m-0"
                style={{ color: accent }}
              >
                {bar?.name || 'Meu Bar'}
              </h1>
              {bar?.slogan && (
                <p className="text-lg sm:text-2xl opacity-85 m-0">{bar.slogan}</p>
              )}
              <p className="text-sm sm:text-base opacity-65 pt-2">
                {mode === 'customer'
                  ? 'Seja bem-vindo! O resumo da sua compra aparecerá aqui.'
                  : mode === 'queue_client'
                    ? 'Nenhum pedido em preparo no momento. Faça seu pedido pelo QR Code!'
                    : 'Fila zerada — todos os pedidos da equipe estão em dia!'}
              </p>
            </div>

            {mode !== 'queue_team' && barId && (
              <div
                className="rounded-2xl p-4 border flex items-center gap-4 text-left"
                style={{ background: surface, color: cardTextCol, borderColor: borderCol }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    publicMenuLink
                  )}`}
                  alt="QR Cardápio"
                  className="w-24 h-24 rounded-xl bg-white p-1.5 shrink-0"
                />
                <div>
                  <div className="text-xs uppercase font-bold tracking-wider opacity-70">
                    Cardápio Digital
                  </div>
                  <div className="text-base sm:text-lg font-extrabold mt-0.5">
                    Aponte a câmera e peça direto da mesa
                  </div>
                  {bar?.handle && (
                    <div className="text-xs opacity-75 mt-1">@{bar.handle}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : mode === 'customer' && customerPayload ? (
          /* MODO 1: TELA DO CLIENTE (RESUMO DA COMPRA + QR PIX) */
          customerPayload.mode === 'paid' ? (
            <div className="flex flex-col items-center justify-center text-center space-y-5 max-w-xl mx-auto">
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-6xl font-black border-4"
                style={{ borderColor: ok, color: ok, background: `${ok}18` }}
              >
                ✓
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold m-0" style={{ color: ok }}>
                Pagamento Confirmado!
              </h1>
              <p className="text-lg sm:text-xl opacity-85 m-0">
                Obrigado, <b>{customerPayload.customerName || 'Cliente'}</b>! Volte sempre ao{' '}
                <b>{bar?.name || 'nosso bar'}</b>.
              </p>
              {typeof customerPayload.total === 'number' && (
                <div
                  className="text-2xl sm:text-3xl font-extrabold tabular-nums px-6 py-3 rounded-2xl border"
                  style={{ background: surface, color: cardTextCol, borderColor: `${ok}66` }}
                >
                  Total pago: {money(customerPayload.total)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-6xl w-full mx-auto">
              {/* Esquerda: Itens da compra detalhados */}
              <div
                className="lg:col-span-7 rounded-3xl p-6 border flex flex-col justify-between"
                style={{ background: surface, color: cardTextCol, borderColor: borderCol }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 border-b" style={{ borderColor: borderCol }}>
                    <div>
                      <div className="text-xs uppercase tracking-wider font-bold opacity-70">
                        Resumo da Conta
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold m-0 mt-1" style={{ color: accent }}>
                        {customerPayload.isTable ? '🪑 ' : '👤 '}
                        {customerPayload.customerName || 'Cliente'}
                      </h2>
                    </div>
                    {customerPayload.tableCode && (
                      <span
                        className="px-3 py-1 rounded-xl text-sm font-bold border"
                        style={{ borderColor: accent, color: accent }}
                      >
                        Cód {customerPayload.tableCode}
                      </span>
                    )}
                  </div>

                  <div className="divide-y mt-3 max-h-[48vh] overflow-y-auto pr-1" style={{ borderColor: borderCol }}>
                    {(customerPayload.items || []).map((it, idx) => (
                      <div
                        key={`${it.label}-${idx}`}
                        className="py-3 flex items-start justify-between gap-3"
                        style={{ borderColor: borderCol }}
                      >
                        <div className="min-w-0">
                          <div className="text-base sm:text-lg font-bold leading-snug">
                            <span style={{ color: accent }}>{it.qty}×</span> {it.label}
                          </div>
                          {it.note && (
                            <div className="text-xs sm:text-sm opacity-75 mt-0.5">
                              + {it.note}
                            </div>
                          )}
                          {customerPayload.isTable && it.clientName && (
                            <div className="text-xs opacity-65 mt-0.5">
                              Pedido por: {it.clientName}
                            </div>
                          )}
                        </div>
                        <div className="text-base sm:text-lg font-extrabold tabular-nums shrink-0">
                          {money(it.lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotais */}
                <div className="pt-4 mt-4 border-t space-y-1.5 text-sm sm:text-base" style={{ borderColor: borderCol }}>
                  <div className="flex justify-between opacity-80">
                    <span>Subtotal</span>
                    <span className="tabular-nums font-semibold">
                      {money(customerPayload.subtotal || 0)}
                    </span>
                  </div>
                  {(customerPayload.couvert || 0) > 0 && (
                    <div className="flex justify-between opacity-85">
                      <span>🎵 {customerPayload.couvertLabel || 'Couvert artístico'}</span>
                      <span className="tabular-nums font-semibold">
                        + {money(customerPayload.couvert || 0)}
                      </span>
                    </div>
                  )}
                  {(customerPayload.serviceFee || 0) > 0 && (
                    <div className="space-y-0.5">
                      <div className="flex justify-between opacity-85">
                        <span>
                          Serviço / Garçom
                          {(customerPayload.serviceFeePct || 0) > 0
                            ? ` (${customerPayload.serviceFeePct}%)`
                            : ' (valor personalizado)'}
                        </span>
                        <span className="tabular-nums font-semibold">
                          + {money(customerPayload.serviceFee || 0)}
                        </span>
                      </div>
                      {customerPayload.service100ToWaiter && (
                        <div className="text-xs font-bold" style={{ color: ok }}>
                          💚 100% deste valor vai diretamente para o garçom
                        </div>
                      )}
                    </div>
                  )}
                  {(customerPayload.discount || 0) > 0 && (
                    <div className="flex justify-between" style={{ color: ok }}>
                      <span>Desconto / Fidelidade</span>
                      <span className="tabular-nums font-semibold">
                        - {money(customerPayload.discount || 0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direita: Total gigante + QR Code Pix */}
              <div
                className="lg:col-span-5 rounded-3xl p-6 border flex flex-col items-center justify-center text-center space-y-5"
                style={{
                  background: surface,
                  color: cardTextCol,
                  borderColor: `${accent}66`,
                }}
              >
                <div className="space-y-1">
                  <div className="text-xs sm:text-sm uppercase tracking-widest font-bold opacity-75">
                    Total a Pagar
                  </div>
                  <div
                    className="text-5xl sm:text-6xl font-black tabular-nums leading-none"
                    style={{ color: accent }}
                  >
                    {money(customerPayload.total || 0)}
                  </div>
                  {(customerPayload.splitPeople || 1) > 1 && (
                    <div className="text-sm sm:text-base font-bold pt-1" style={{ color: ok }}>
                      Dividido em {customerPayload.splitPeople}x:{' '}
                      {money((customerPayload.total || 0) / (customerPayload.splitPeople || 1))} / pessoa
                    </div>
                  )}
                </div>

                {customerPayload.pixPayload ? (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="bg-white p-3.5 rounded-3xl shadow-xl">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                          customerPayload.pixPayload
                        )}`}
                        alt="QR Code Pix"
                        className="w-56 h-56 sm:w-64 sm:h-64 block"
                      />
                    </div>
                    <div className="text-sm sm:text-base font-bold" style={{ color: ok }}>
                      💠 Aponte a câmera do app do banco para pagar via Pix
                    </div>
                    {customerPayload.pixKey && (
                      <div className="text-xs opacity-75">
                        Chave Pix: <b>{customerPayload.pixKey}</b>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl p-5 border w-full space-y-2"
                    style={{ borderColor: borderCol }}
                  >
                    <div className="text-3xl">💳</div>
                    <div className="text-lg font-bold">
                      {customerPayload.paymentMethodLabel || 'Pagamento no Caixa'}
                    </div>
                    <div className="text-xs opacity-75">
                      Confira os itens ao lado e finalize com o atendente.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        ) : mode === 'queue_client' ? (
          /* MODO 2: TV DE FILA PARA CLIENTES (EM PREPARO vs PRONTO) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full mx-auto h-full">
            {/* Em Preparo */}
            <div
              className="rounded-3xl p-6 border space-y-4"
              style={{ background: surface, color: cardTextCol, borderColor: borderCol }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: borderCol }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold m-0" style={{ color: accent }}>
                  🔥 Em Preparo
                </h2>
                <span className="text-xl font-black tabular-nums opacity-75">
                  {clientQueueBuckets.preparing.length}
                </span>
              </div>
              {clientQueueBuckets.preparing.length === 0 ? (
                <p className="opacity-65 text-base py-8 text-center">
                  Nenhum pedido em preparo agora.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientQueueBuckets.preparing.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl p-4 border"
                      style={{ borderColor: borderCol, background: `${bg}aa` }}
                    >
                      <div className="text-xs font-bold opacity-70">{item.badge}</div>
                      <div className="text-xl sm:text-2xl font-extrabold mt-0.5 truncate">
                        {item.label}
                      </div>
                      <div className="text-xs opacity-75 mt-1">
                        {item.itemsCount} item(ns)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prontos para Retirar */}
            <div
              className="rounded-3xl p-6 border-2 space-y-4"
              style={{
                background: `${ok}15`,
                color: textCol,
                borderColor: ok,
              }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: `${ok}44` }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold m-0" style={{ color: ok }}>
                  ✅ Pronto!
                </h2>
                <span className="text-xl font-black tabular-nums" style={{ color: ok }}>
                  {clientQueueBuckets.ready.length}
                </span>
              </div>
              {clientQueueBuckets.ready.length === 0 ? (
                <p className="opacity-70 text-base py-8 text-center">
                  Assim que seu pedido ficar pronto, seu nome aparece em destaque aqui!
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {clientQueueBuckets.ready.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-2xl p-5 border-2 flex items-center justify-between gap-3"
                      style={{
                        background: surface,
                        color: cardTextCol,
                        borderColor: ok,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold" style={{ color: ok }}>
                          {item.badge} · PRONTO PARA RETIRADA / ENTREGA
                        </div>
                        <div className="text-2xl sm:text-3xl font-black truncate mt-0.5">
                          {item.label}
                        </div>
                      </div>
                      <div
                        className="px-3.5 py-2 rounded-xl font-black text-lg shrink-0"
                        style={{ background: ok, color: '#0c1610' }}
                      >
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO 3: KDS / FILA SOMENTE VISUALIZAÇÃO PARA EQUIPE (COZINHA / BAR) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl w-full mx-auto">
            {teamOrders.map((o) => {
              const rec = recipeMap.get(o.recipe_id);
              const dlv = parseDeliveryOrderMeta(o);
              const mins = minutesSince(o.created_at);
              const isReady = o.status === 'ready';
              const isLate = !isReady && mins >= 12;
              const isWarn = !isReady && mins >= 6 && mins < 12;
              const cardBorder = isReady
                ? ok
                : isLate
                  ? '#f87171'
                  : isWarn
                    ? accent
                    : borderCol;
              const noteText = dlv ? dlv.cleanItemNote : o.note;

              return (
                <div
                  key={o.id}
                  className="rounded-2xl p-4 border-2 flex flex-col justify-between gap-3"
                  style={{
                    background: surface,
                    color: cardTextCol,
                    borderColor: cardBorder,
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs font-bold">
                      <span
                        className="px-2 py-0.5 rounded-md"
                        style={{
                          background: isReady ? `${ok}25` : `${accent}25`,
                          color: isReady ? ok : accent,
                        }}
                      >
                        {isReady ? '✓ PRONTO' : '⏳ PREPARAR'}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{ color: isLate ? '#f87171' : isWarn ? accent : undefined }}
                      >
                        ⏱ {mins} min
                      </span>
                    </div>

                    <div className="text-xl sm:text-2xl font-black mt-2 leading-tight">
                      <span style={{ color: accent }}>{o.qty || 1}×</span>{' '}
                      {o.recipe_name || rec?.name || 'Item'}
                    </div>

                    <div className="text-sm font-semibold opacity-85 mt-1">
                      {dlv
                        ? `${dlv.mode === 'pickup' ? '🛍️ RETIRADA' : '🛵 DELIVERY'} #${dlv.code} · ${o.client_name || o.customer_name || 'Cliente'}`
                        : o.table_label
                          ? `🪑 ${o.table_label} · ${o.client_name || o.customer_name || 'Cliente'}`
                          : `👤 ${o.client_name || o.customer_name || 'Cliente'}`}
                    </div>

                    {noteText && (
                      <div
                        className="mt-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold border"
                        style={{
                          borderColor: `${accent}66`,
                          background: `${accent}18`,
                          color: cardTextCol,
                        }}
                      >
                        ⚠️ Obs / Extra: {noteText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Rodapé discreto */}
      <footer
        className="pt-3 border-t flex items-center justify-between text-xs opacity-60"
        style={{ borderColor: borderCol }}
      >
        <span>Modo somente visualização · Sincronizado em tempo real</span>
        <span>{bar?.handle ? `@${bar.handle}` : bar?.name || 'Meu Bar'}</span>
      </footer>
    </div>
  );
};
