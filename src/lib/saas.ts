import type {
  AdminBarOverview,
  Bar,
  BarPlanTier,
  PartnerAdBanner,
  PlatformSaaSConfig,
} from '../types/meubar';
import { sb } from './supabase';

export const SUPER_ADMIN_EMAIL = 'nygames92@gmail.com';

const LOCAL_CONFIG_KEY = 'meubar_platform_saas_config_v1';
const LOCAL_ADS_KEY = 'meubar_partner_ads_cache_v1';

export const DEFAULT_SAAS_CONFIG: PlatformSaaSConfig = {
  pro_price_monthly: 59.9,
  pro_price_yearly: 599.0,
  trial_days: 14,
  free_max_tables: 5,
  free_max_bars: 1,
  support_whatsapp: '',
  checkout_monthly_url: '',
  checkout_yearly_url: '',
  adsense_enabled: false,
  adsense_client_id: '',
  adsense_slot_panel: '',
  adsense_slot_explore: '',
  adsense_slot_menu_free: '',
  ads_rotation_mode: 'partner_first',
  free_user_emails: [],
};

export function isSuperAdmin(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

export function sanitizeHttpUrl(raw?: string | null): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidAdSenseClient(raw?: string | null): boolean {
  const s = (raw || '').trim();
  return /^ca-pub-\d{10,20}$/.test(s);
}

export function isValidAdSenseSlot(raw?: string | null): boolean {
  const s = (raw || '').trim();
  return /^\d{6,16}$/.test(s);
}

export function buildWhatsAppLink(phone?: string | null, message?: string): string | null {
  const digits = (phone || '').replace(/\D+/g, '');
  if (digits.length < 10) return null;
  const full = digits.startsWith('55') ? digits : `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${full}${text}`;
}

export type ProFeatureKey =
  | 'stations'
  | 'cashier_pro'
  | 'happy_hour'
  | 'loyalty'
  | 'bluetooth_print'
  | 'studio_pro'
  | 'unlimited_tables'
  | 'no_ads';

export interface BarPlanStatus {
  effectiveTier: 'free' | 'trial' | 'pro' | 'vip';
  isPro: boolean;
  showAds: boolean;
  label: string;
  daysLeft: number | null;
  expiresAt: string | null;
  note?: string | null;
}

export function getBarPlanStatus(
  bar: Partial<Bar> | null | undefined,
  userEmail?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): BarPlanStatus {
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  if (isSuperAdmin(cleanEmail)) {
    return {
      effectiveTier: 'vip',
      isPro: true,
      showAds: false,
      label: 'Admin VIP',
      daysLeft: null,
      expiresAt: null,
      note: 'Acesso total do administrador da plataforma',
    };
  }

  const vipEmails = (config.free_user_emails || []).map((e) => e.trim().toLowerCase());
  if (cleanEmail && vipEmails.includes(cleanEmail)) {
    return {
      effectiveTier: 'vip',
      isPro: true,
      showAds: false,
      label: 'Pro VIP (Cortesia)',
      daysLeft: null,
      expiresAt: null,
      note: 'Acesso completo liberado gratuitamente',
    };
  }

  if (!bar) {
    return {
      effectiveTier: 'free',
      isPro: false,
      showAds: true,
      label: 'Plano Grátis',
      daysLeft: null,
      expiresAt: null,
    };
  }

  if (bar.plan_tier === 'vip') {
    return {
      effectiveTier: 'vip',
      isPro: true,
      showAds: false,
      label: 'Pro VIP (Liberado)',
      daysLeft: null,
      expiresAt: null,
      note: bar.plan_note || 'Cortesia liberada pela administração',
    };
  }

  const nowMs = Date.now();
  if (bar.plan_tier === 'pro') {
    if (!bar.plan_expires_at) {
      return {
        effectiveTier: 'pro',
        isPro: true,
        showAds: false,
        label: 'Plano Pro',
        daysLeft: null,
        expiresAt: null,
        note: bar.plan_note,
      };
    }
    const expMs = new Date(bar.plan_expires_at).getTime();
    if (!Number.isNaN(expMs) && expMs > nowMs) {
      const daysLeft = Math.max(1, Math.ceil((expMs - nowMs) / 86400000));
      return {
        effectiveTier: 'pro',
        isPro: true,
        showAds: false,
        label: 'Plano Pro',
        daysLeft,
        expiresAt: bar.plan_expires_at,
        note: bar.plan_note,
      };
    }
  }

  // Período de teste automático (Trial Pro grátis para bares novos)
  const trialDays = Math.max(0, Number(config.trial_days ?? 14));
  let trialEndMs: number | null = null;
  if (bar.trial_ends_at) {
    const parsed = new Date(bar.trial_ends_at).getTime();
    if (!Number.isNaN(parsed)) trialEndMs = parsed;
  } else if (bar.created_at && trialDays > 0) {
    const createdMs = new Date(bar.created_at).getTime();
    if (!Number.isNaN(createdMs)) trialEndMs = createdMs + trialDays * 86400000;
  }

  if (trialEndMs && trialEndMs > nowMs) {
    const daysLeft = Math.max(1, Math.ceil((trialEndMs - nowMs) / 86400000));
    return {
      effectiveTier: 'trial',
      isPro: true,
      showAds: false,
      label: `Teste Pro (${daysLeft}d)`,
      daysLeft,
      expiresAt: new Date(trialEndMs).toISOString(),
    };
  }

  return {
    effectiveTier: 'free',
    isPro: false,
    showAds: true,
    label: 'Plano Grátis',
    daysLeft: null,
    expiresAt: bar.plan_expires_at || null,
    note: bar.plan_note,
  };
}

export function canUseFeature(status: BarPlanStatus, _feature: ProFeatureKey): boolean {
  return status.isPro;
}

export function mergeSaasConfig(raw: unknown): PlatformSaaSConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<PlatformSaaSConfig>) : {};
  return {
    ...DEFAULT_SAAS_CONFIG,
    ...obj,
    pro_price_monthly: Number(obj.pro_price_monthly ?? DEFAULT_SAAS_CONFIG.pro_price_monthly) || 59.9,
    pro_price_yearly: Number(obj.pro_price_yearly ?? DEFAULT_SAAS_CONFIG.pro_price_yearly) || 599.0,
    trial_days: Math.max(0, Number(obj.trial_days ?? DEFAULT_SAAS_CONFIG.trial_days)),
    free_max_tables: Math.max(1, Number(obj.free_max_tables ?? DEFAULT_SAAS_CONFIG.free_max_tables)),
    free_max_bars: Math.max(1, Number(obj.free_max_bars ?? DEFAULT_SAAS_CONFIG.free_max_bars)),
    free_user_emails: Array.isArray(obj.free_user_emails)
      ? obj.free_user_emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
      : [],
  };
}

export function getCachedPlatformConfig(): PlatformSaaSConfig {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return DEFAULT_SAAS_CONFIG;
    return mergeSaasConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_SAAS_CONFIG;
  }
}

export async function loadPlatformConfig(): Promise<PlatformSaaSConfig> {
  try {
    const res = await sb
      .from('platform_settings')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();
    if (!res.error && res.data && (res.data as { config?: unknown }).config) {
      const merged = mergeSaasConfig((res.data as { config?: unknown }).config);
      try {
        localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(merged));
      } catch {
        // ignore storage quota
      }
      return merged;
    }
  } catch {
    // table may not exist yet before migration
  }
  return getCachedPlatformConfig();
}

export async function savePlatformConfig(
  config: PlatformSaaSConfig
): Promise<{ ok: boolean; error?: string }> {
  const clean = mergeSaasConfig(config);
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(clean));
  } catch {
    // ignore
  }
  const res = await sb
    .from('platform_settings')
    .upsert(
      { id: 'default', config: clean, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (res.error) {
    return { ok: false, error: res.error.message };
  }
  return { ok: true };
}

export function getCachedPartnerAds(): PartnerAdBanner[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PartnerAdBanner[]) : [];
  } catch {
    return [];
  }
}

export async function loadPartnerAds(includeInactive = false): Promise<PartnerAdBanner[]> {
  try {
    let q = sb
      .from('partner_ads')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (!includeInactive) {
      q = q.eq('active', true);
    }
    const res = await q;
    if (!res.error && Array.isArray(res.data)) {
      const list = res.data as PartnerAdBanner[];
      if (!includeInactive) {
        try {
          localStorage.setItem(LOCAL_ADS_KEY, JSON.stringify(list));
        } catch {
          // ignore
        }
      }
      return list;
    }
  } catch {
    // ignore before SQL migration
  }
  return includeInactive ? [] : getCachedPartnerAds();
}

export async function trackPartnerAdEvent(
  adId: string,
  kind: 'impression' | 'click'
): Promise<void> {
  if (!adId) return;
  try {
    await sb.rpc('track_ad_event', { p_ad_id: adId, p_kind: kind });
  } catch {
    // ignore silently
  }
}

export async function adminListAllBars(): Promise<{
  bars: AdminBarOverview[];
  error?: string;
}> {
  const rpc = await sb.rpc('admin_list_bars');
  if (!rpc.error && Array.isArray(rpc.data)) {
    return { bars: rpc.data as AdminBarOverview[] };
  }
  // Fallback leitura básica caso a RPC ainda não tenha sido rodada no SQL Editor
  const fallback = await sb
    .from('bars')
    .select('id, name, handle, city, kind, owner, plan_tier, plan_expires_at, trial_ends_at, plan_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (!fallback.error && Array.isArray(fallback.data)) {
    return {
      bars: fallback.data as AdminBarOverview[],
      error: rpc.error?.message,
    };
  }
  return { bars: [], error: rpc.error?.message || fallback.error?.message };
}

export async function adminUpdateBarPlan(
  barId: string,
  tier: BarPlanTier,
  expiresAt: string | null,
  note: string | null
): Promise<{ ok: boolean; error?: string }> {
  const rpc = await sb.rpc('admin_set_bar_plan', {
    p_bar_id: barId,
    p_tier: tier,
    p_expires_at: expiresAt,
    p_note: note,
  });
  if (!rpc.error) return { ok: true };

  // Fallback direto se o bar for do próprio usuário
  const up = await sb
    .from('bars')
    .update({
      plan_tier: tier,
      plan_expires_at: expiresAt,
      plan_note: note,
    })
    .eq('id', barId);
  if (!up.error) return { ok: true };
  return { ok: false, error: rpc.error.message };
}

let adsenseInjectedClient = '';

export function ensureAdSenseScript(clientId?: string | null): boolean {
  if (typeof document === 'undefined') return false;
  const clean = (clientId || '').trim();
  if (!isValidAdSenseClient(clean)) return false;
  if (adsenseInjectedClient === clean) return true;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-meubar-adsense="true"]'
  );
  if (existing) {
    adsenseInjectedClient = clean;
    return true;
  }

  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.meubarAdsense = 'true';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    clean
  )}`;
  document.head.appendChild(s);
  adsenseInjectedClient = clean;
  return true;
}

export function buildAdsTxtLine(clientId?: string | null): string {
  const clean = (clientId || '').trim();
  if (!isValidAdSenseClient(clean)) {
    return 'google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0';
  }
  const pubOnly = clean.replace(/^ca-/, '');
  return `google.com, ${pubOnly}, DIRECT, f08c47fec0942fa0`;
}
