import type { RealtimeChannel } from '@supabase/supabase-js';
import { sb } from './supabase';

export type DisplayMode = 'customer' | 'queue_client' | 'queue_team';

export interface CustomerDisplayLine {
  label: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  clientName?: string;
}

export interface CustomerDisplayPayload {
  mode: 'idle' | 'checkout' | 'paid';
  barId: string;
  customerName?: string;
  isTable?: boolean;
  tableCode?: string;
  items?: CustomerDisplayLine[];
  subtotal?: number;
  couvert?: number;
  couvertLabel?: string;
  serviceFee?: number;
  serviceFeePct?: number;
  service100ToWaiter?: boolean;
  discount?: number;
  total?: number;
  splitPeople?: number;
  paymentMethodLabel?: string;
  pixPayload?: string;
  pixKey?: string;
  updatedAt: string;
}

export interface MonitorOption {
  screenId: string;
  label: string;
  resolution?: string;
  isPrimary?: boolean;
  isPhysical?: boolean;
}

export type SavedMonitorMap = Partial<Record<DisplayMode, MonitorOption>>;

const MONITOR_PREFS_KEY = 'meubar_saved_monitors_v1';

function displayStateKey(barId: string): string {
  return `meubar_display_state_${barId}`;
}

export function getSavedMonitors(): SavedMonitorMap {
  try {
    const raw = localStorage.getItem(MONITOR_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedMonitorMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveMonitorForMode(mode: DisplayMode, monitor: MonitorOption | null): SavedMonitorMap {
  const cur = getSavedMonitors();
  const next: SavedMonitorMap = { ...cur };
  if (monitor) {
    next[mode] = monitor;
  } else {
    delete next[mode];
  }
  try {
    localStorage.setItem(MONITOR_PREFS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota
  }
  return next;
}

export function getDefaultMonitorPresets(): MonitorOption[] {
  const curRes =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}×${window.screen.height}`
      : undefined;
  return [
    {
      screenId: 'preset-hdmi-2',
      label: 'Monitor 2 (Balcão / HDMI)',
      resolution: 'Tela secundária',
    },
    {
      screenId: 'preset-tv-salao',
      label: 'TV Salão (Fila de Clientes)',
      resolution: 'Smart TV / HDMI',
    },
    {
      screenId: 'preset-tv-equipe',
      label: 'TV Cozinha / Bar (Equipe KDS)',
      resolution: 'Monitor de parede',
    },
    {
      screenId: 'preset-tablet',
      label: 'Tablet / 2º Celular no Balcão',
      resolution: 'Wi-Fi / Link direto',
    },
    {
      screenId: 'preset-main',
      label: 'Tela Atual deste Aparelho',
      resolution: curRes,
      isPrimary: true,
    },
  ];
}

interface ScreenDetailLike {
  label?: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  isPrimary?: boolean;
}

/**
 * Tenta detectar monitores físicos conectados via Window Management API (Chrome/Edge desktop).
 * Sempre combina com perfis prontos para funcionar também em tablets, celulares e Smart TVs.
 */
export async function detectAvailableMonitors(): Promise<{
  monitors: MonitorOption[];
  detectedPhysical: number;
}> {
  const physical: MonitorOption[] = [];
  try {
    const win = window as unknown as {
      getScreenDetails?: () => Promise<{ screens?: ScreenDetailLike[] }>;
    };
    if (typeof win.getScreenDetails === 'function') {
      const details = await win.getScreenDetails();
      const screens = Array.isArray(details?.screens) ? details.screens : [];
      screens.forEach((sc, idx) => {
        const res = sc.width && sc.height ? `${sc.width}×${sc.height}` : undefined;
        const name = sc.label?.trim() || `Monitor ${idx + 1}`;
        physical.push({
          screenId: `phys-${idx}-${sc.width || 0}x${sc.height || 0}-${sc.left || 0}`,
          label: `${name}${sc.isPrimary ? ' (Principal)' : ' (Secundário)'}`,
          resolution: res,
          isPrimary: Boolean(sc.isPrimary),
          isPhysical: true,
        });
      });
    }
  } catch {
    // Permission denied or unsupported browser — fallback gracefully to presets
  }

  return {
    monitors: [...physical, ...getDefaultMonitorPresets()],
    detectedPhysical: physical.length,
  };
}

export function buildDisplayUrl(
  barId: string,
  mode: DisplayMode,
  station?: 'all' | 'bar' | 'cozinha'
): string {
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://meubar.app/';
  const u = new URL(base);
  u.searchParams.set('bar', barId);
  u.searchParams.set('display', mode);
  if (mode === 'queue_team' && station && station !== 'all') {
    u.searchParams.set('station', station);
  }
  return u.toString();
}

export function readStoredCustomerDisplay(barId: string): CustomerDisplayPayload | null {
  try {
    const raw = localStorage.getItem(displayStateKey(barId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerDisplayPayload;
    if (!parsed || parsed.barId !== barId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function publishCustomerDisplay(
  barId: string,
  payload: CustomerDisplayPayload
): Promise<void> {
  try {
    localStorage.setItem(displayStateKey(barId), JSON.stringify(payload));
  } catch {
    // ignore storage quota
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`meubar_display_${barId}`);
      bc.postMessage(payload);
      setTimeout(() => bc.close(), 120);
    }
  } catch {
    // ignore
  }

  try {
    const ch = sb.channel(`bar-display-${barId}`);
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 750);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(t);
          void ch
            .send({ type: 'broadcast', event: 'customer_display', payload })
            .finally(() => {
              setTimeout(() => void sb.removeChannel(ch), 250);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore realtime errors
  }
}

export function subscribeCustomerDisplay(
  barId: string,
  onPayload: (payload: CustomerDisplayPayload) => void
): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(`meubar_display_${barId}`);
      bc.onmessage = (ev) => {
        const data = ev.data as CustomerDisplayPayload | undefined;
        if (data && data.barId === barId) onPayload(data);
      };
    }
  } catch {
    // ignore
  }

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== displayStateKey(barId) || !ev.newValue) return;
    try {
      const data = JSON.parse(ev.newValue) as CustomerDisplayPayload;
      if (data && data.barId === barId) onPayload(data);
    } catch {
      // ignore
    }
  };
  window.addEventListener('storage', onStorage);

  const ch: RealtimeChannel = sb
    .channel(`bar-display-${barId}`)
    .on('broadcast', { event: 'customer_display' }, (msg) => {
      const data = msg?.payload as CustomerDisplayPayload | undefined;
      if (data && data.barId === barId) onPayload(data);
    })
    .subscribe();

  return () => {
    window.removeEventListener('storage', onStorage);
    if (bc) bc.close();
    void sb.removeChannel(ch);
  };
}

/**
 * Tenta transmitir a URL para uma segunda tela/TV via W3C Presentation API (Chromecast / Monitor externo).
 */
export async function startPresentationCast(
  url: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const PresentationCtor = (
      window as unknown as {
        PresentationRequest?: new (urls: string[]) => { start: () => Promise<unknown> };
      }
    ).PresentationRequest;
    if (!PresentationCtor) {
      return {
        ok: false,
        error:
          'Transmissão direta (Cast/HDMI) não disponível neste navegador. Copie o link ou escaneie o QR na outra tela.',
      };
    }
    const req = new PresentationCtor([url]);
    await req.start();
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        'Nenhuma tela externa selecionada. Você pode copiar o link ou escanear o QR no tablet/TV.',
    };
  }
}
