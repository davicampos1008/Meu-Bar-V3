import type {
  AdminAlertItem,
  AdminBarOverview,
  AdminUserAccount,
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
  support_agent_emails: [],
  bar_plan_overrides: {},
};

export function isSuperAdmin(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

export function isSupportStaff(
  email?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): boolean {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return false;
  if (isSuperAdmin(clean)) return true;
  const list = (config.support_agent_emails || []).map((e) => e.trim().toLowerCase());
  return list.includes(clean);
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
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG,
  options?: { ignoreAdminAutoVip?: boolean; ignoreEmailVip?: boolean }
): BarPlanStatus {
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  if (!options?.ignoreAdminAutoVip && isSuperAdmin(cleanEmail)) {
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
  if (!options?.ignoreEmailVip && cleanEmail && vipEmails.includes(cleanEmail)) {
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

  // Mescla eventual override salvo em platform_settings (garante efeito imediato mesmo antes de rodar SQL novo)
  const override = bar.id ? config.bar_plan_overrides?.[bar.id] : undefined;
  const effTier = override?.tier ?? bar.plan_tier ?? 'free';
  const effExpiresAt = override ? override.expires_at ?? null : bar.plan_expires_at ?? null;
  const effTrialEndsAt = override ? override.trial_ends_at ?? null : bar.trial_ends_at ?? null;
  const effNote = override ? override.note ?? bar.plan_note ?? null : bar.plan_note ?? null;

  if (effTier === 'vip') {
    return {
      effectiveTier: 'vip',
      isPro: true,
      showAds: false,
      label: 'Pro VIP (Liberado)',
      daysLeft: null,
      expiresAt: null,
      note: effNote || 'Cortesia liberada pela administração',
    };
  }

  const nowMs = Date.now();
  if (effTier === 'pro') {
    if (!effExpiresAt) {
      return {
        effectiveTier: 'pro',
        isPro: true,
        showAds: false,
        label: 'Plano Pro',
        daysLeft: null,
        expiresAt: null,
        note: effNote,
      };
    }
    const expMs = new Date(effExpiresAt).getTime();
    if (!Number.isNaN(expMs) && expMs > nowMs) {
      const daysLeft = Math.max(1, Math.ceil((expMs - nowMs) / 86400000));
      return {
        effectiveTier: 'pro',
        isPro: true,
        showAds: false,
        label: 'Plano Pro',
        daysLeft,
        expiresAt: effExpiresAt,
        note: effNote,
      };
    }
  }

  // Período de teste automático (Trial Pro grátis para bares novos)
  // Se o admin definiu explicitamente como 'free' (trial_ends_at no passado ou override 'free'), respeita Grátis!
  const trialDays = Math.max(0, Number(config.trial_days ?? 14));
  let trialEndMs: number | null = null;
  if (effTrialEndsAt) {
    const parsed = new Date(effTrialEndsAt).getTime();
    if (!Number.isNaN(parsed)) trialEndMs = parsed;
  } else if (override?.tier === 'free') {
    trialEndMs = 0;
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
    expiresAt: effExpiresAt,
    note: effNote,
  };
}

export function canUseFeature(status: BarPlanStatus, _feature: ProFeatureKey): boolean {
  return status.isPro;
}

export function mergeSaasConfig(raw: unknown): PlatformSaaSConfig {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<PlatformSaaSConfig>) : {};
  const rawOverrides =
    obj.bar_plan_overrides && typeof obj.bar_plan_overrides === 'object'
      ? obj.bar_plan_overrides
      : {};
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
    support_agent_emails: Array.isArray(obj.support_agent_emails)
      ? Array.from(
          new Set(
            obj.support_agent_emails
              .map((e) => String(e || '').trim().toLowerCase())
              .filter(Boolean)
          )
        )
      : [],
    bar_plan_overrides: rawOverrides,
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
  note: string | null,
  currentConfig?: PlatformSaaSConfig
): Promise<{ ok: boolean; error?: string; nextConfig?: PlatformSaaSConfig; trialEndsAt: string | null }> {
  const trialEndsAt = tier === 'free' ? new Date(Date.now() - 60000).toISOString() : null;
  let dbSaved = false;
  let lastErr: string | undefined;

  const rpc = await sb.rpc('admin_set_bar_plan', {
    p_bar_id: barId,
    p_tier: tier,
    p_expires_at: expiresAt,
    p_note: note,
  });
  if (!rpc.error) {
    dbSaved = true;
  } else {
    lastErr = rpc.error.message;
  }

  // Garante também trial_ends_at no passado ao mudar explicitamente para Grátis (mesmo se a RPC antiga ainda estiver no banco)
  const up = await sb
    .from('bars')
    .update({
      plan_tier: tier,
      plan_expires_at: tier === 'pro' ? expiresAt : null,
      trial_ends_at: trialEndsAt,
      plan_note: note,
    })
    .eq('id', barId);
  if (!up.error) {
    dbSaved = true;
  }

  // Persiste também em platform_settings.bar_plan_overrides para sincronização imediata entre todas as telas
  let nextConfig: PlatformSaaSConfig | undefined;
  if (currentConfig) {
    nextConfig = {
      ...currentConfig,
      bar_plan_overrides: {
        ...(currentConfig.bar_plan_overrides || {}),
        [barId]: {
          tier,
          expires_at: tier === 'pro' ? expiresAt : null,
          trial_ends_at: trialEndsAt,
          note,
          updated_at: new Date().toISOString(),
        },
      },
    };
    const cfgSave = await savePlatformConfig(nextConfig);
    if (cfgSave.ok) dbSaved = true;
  }

  if (dbSaved) {
    return { ok: true, nextConfig, trialEndsAt };
  }
  return { ok: false, error: lastErr || up.error?.message, nextConfig, trialEndsAt };
}

export async function adminListUsers(): Promise<{
  users: AdminUserAccount[];
  error?: string;
}> {
  const rpc = await sb.rpc('admin_list_users');
  if (!rpc.error && Array.isArray(rpc.data)) {
    return { users: rpc.data as AdminUserAccount[] };
  }
  return { users: [], error: rpc.error?.message };
}

export async function loadAdminNotifications(): Promise<AdminAlertItem[]> {
  try {
    const res = await sb
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);
    if (!res.error && Array.isArray(res.data)) {
      return res.data as AdminAlertItem[];
    }
  } catch {
    // ignore before SQL migration
  }
  return [];
}

export async function markAdminNotificationsRead(ids?: string[]): Promise<void> {
  try {
    if (ids && ids.length > 0) {
      await sb.from('admin_notifications').update({ read: true }).in('id', ids);
    } else {
      await sb.from('admin_notifications').update({ read: true }).eq('read', false);
    }
  } catch {
    // ignore
  }
}

export async function broadcastNewUserSignup(email: string): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return;
  try {
    const ch = sb.channel('platform-admin-alerts');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 900);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          void ch
            .send({
              type: 'broadcast',
              event: 'new_user',
              payload: {
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                kind: 'new_user',
                title: 'Nova conta criada',
                message: `${cleanEmail} acabou de criar conta no Meu Bar`,
                user_email: cleanEmail,
                read: false,
                created_at: new Date().toISOString(),
              } satisfies AdminAlertItem,
            })
            .finally(() => {
              setTimeout(() => void sb.removeChannel(ch), 300);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore broadcast issues
  }
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
