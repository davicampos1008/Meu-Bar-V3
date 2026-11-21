import { useCallback, useEffect, useState } from 'react';

export type AlertCategoryKey =
  | 'newOrders'
  | 'orderReady'
  | 'tableCalls'
  | 'lowStock'
  | 'offlineSync'
  | 'clientOrderReady'
  | 'adminNewAccount';

export interface AlertPreferences {
  /** Interruptor geral (mestre) de todos os alertas do app */
  allEnabled: boolean;
  /** Sons / bipes de notificação */
  soundEnabled: boolean;
  /** Vibração no celular */
  vibrationEnabled: boolean;
  /** Avisos flutuantes na tela (pop-ups / toasts) */
  toastEnabled: boolean;
  /** Novos pedidos no Bar e na Cozinha */
  newOrders: boolean;
  /** Pedido pronto para entrega (Garçom) */
  orderReady: boolean;
  /** Chamados de mesa (Chamar Garçom / Pedir a Conta) */
  tableCalls: boolean;
  /** Avisos de estoque baixo e itens aguardando preço */
  lowStock: boolean;
  /** Aviso de sincronização de pedidos offline */
  offlineSync: boolean;
  /** Aviso de "Seu drink está pronto" no cardápio do cliente */
  clientOrderReady: boolean;
  /** Alerta para o Super Admin quando uma nova conta é criada */
  adminNewAccount: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPreferences = {
  allEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  toastEnabled: true,
  newOrders: true,
  orderReady: true,
  tableCalls: true,
  lowStock: true,
  offlineSync: true,
  clientOrderReady: true,
  adminNewAccount: true,
};

const STORAGE_KEY = 'meubar_alert_prefs_v1';
const CHANGE_EVENT = 'meubar:alert-prefs-changed';

export function loadAlertPrefs(): AlertPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ALERT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AlertPreferences> | null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_ALERT_PREFS };
    return {
      allEnabled: parsed.allEnabled !== false,
      soundEnabled: parsed.soundEnabled !== false,
      vibrationEnabled: parsed.vibrationEnabled !== false,
      toastEnabled: parsed.toastEnabled !== false,
      newOrders: parsed.newOrders !== false,
      orderReady: parsed.orderReady !== false,
      tableCalls: parsed.tableCalls !== false,
      lowStock: parsed.lowStock !== false,
      offlineSync: parsed.offlineSync !== false,
      clientOrderReady: parsed.clientOrderReady !== false,
      adminNewAccount: parsed.adminNewAccount !== false,
    };
  } catch {
    return { ...DEFAULT_ALERT_PREFS };
  }
}

export function saveAlertPrefs(next: AlertPreferences): AlertPreferences {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<AlertPreferences>(CHANGE_EVENT, { detail: next }));
  }
  return next;
}

export function updateAlertPrefs(patch: Partial<AlertPreferences>): AlertPreferences {
  const current = loadAlertPrefs();
  return saveAlertPrefs({ ...current, ...patch });
}

export function resetAlertPrefs(): AlertPreferences {
  return saveAlertPrefs({ ...DEFAULT_ALERT_PREFS });
}

export function isAlertEnabled(category: AlertCategoryKey, prefs?: AlertPreferences): boolean {
  const p = prefs || loadAlertPrefs();
  return Boolean(p.allEnabled && p[category]);
}

export function canPlayAlertSound(category?: AlertCategoryKey, prefs?: AlertPreferences): boolean {
  const p = prefs || loadAlertPrefs();
  if (!p.allEnabled || !p.soundEnabled) return false;
  if (category && !p[category]) return false;
  return true;
}

export function canVibrateAlert(category?: AlertCategoryKey, prefs?: AlertPreferences): boolean {
  const p = prefs || loadAlertPrefs();
  if (!p.allEnabled || !p.vibrationEnabled) return false;
  if (category && !p[category]) return false;
  return true;
}

export function canShowToast(category?: AlertCategoryKey, prefs?: AlertPreferences): boolean {
  const p = prefs || loadAlertPrefs();
  if (!p.allEnabled || !p.toastEnabled) return false;
  if (category && !p[category]) return false;
  return true;
}

export function getAlertPrefsSummary(
  prefs: AlertPreferences,
  includeAdmin = false
): { activeCount: number; totalCount: number; label: string; isMuted: boolean } {
  const keys: AlertCategoryKey[] = [
    'newOrders',
    'orderReady',
    'tableCalls',
    'lowStock',
    'offlineSync',
    'clientOrderReady',
    ...(includeAdmin ? (['adminNewAccount'] as AlertCategoryKey[]) : []),
  ];
  const totalCount = keys.length;
  if (!prefs.allEnabled) {
    return { activeCount: 0, totalCount, label: 'Silenciado', isMuted: true };
  }
  const activeCount = keys.filter((k) => prefs[k]).length;
  if (activeCount === 0) {
    return { activeCount: 0, totalCount, label: 'Desativados', isMuted: true };
  }
  if (activeCount === totalCount && prefs.soundEnabled && prefs.toastEnabled) {
    return { activeCount, totalCount, label: 'Todos ativos', isMuted: false };
  }
  return {
    activeCount,
    totalCount,
    label: `${activeCount}/${totalCount} ativos`,
    isMuted: false,
  };
}

export function useAlertPrefs(): {
  prefs: AlertPreferences;
  setPref: <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) => void;
  patchPrefs: (patch: Partial<AlertPreferences>) => void;
  enableAll: () => void;
  disableAll: () => void;
} {
  const [prefs, setPrefs] = useState<AlertPreferences>(() => loadAlertPrefs());

  useEffect(() => {
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<AlertPreferences>).detail;
      setPrefs(detail || loadAlertPrefs());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(loadAlertPrefs());
    };
    window.addEventListener(CHANGE_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setPref = useCallback(
    <K extends keyof AlertPreferences>(key: K, value: AlertPreferences[K]) => {
      setPrefs(updateAlertPrefs({ [key]: value } as Partial<AlertPreferences>));
    },
    []
  );

  const patchPrefs = useCallback((patch: Partial<AlertPreferences>) => {
    setPrefs(updateAlertPrefs(patch));
  }, []);

  const enableAll = useCallback(() => {
    setPrefs(resetAlertPrefs());
  }, []);

  const disableAll = useCallback(() => {
    setPrefs(
      saveAlertPrefs({
        allEnabled: false,
        soundEnabled: false,
        vibrationEnabled: false,
        toastEnabled: false,
        newOrders: false,
        orderReady: false,
        tableCalls: false,
        lowStock: false,
        offlineSync: false,
        clientOrderReady: false,
        adminNewAccount: false,
      })
    );
  }, []);

  return { prefs, setPref, patchPrefs, enableAll, disableAll };
}
