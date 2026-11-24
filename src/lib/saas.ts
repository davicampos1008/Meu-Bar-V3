import type {
  AdminAlertItem,
  AdminBarOverview,
  AdminUserAccount,
  Bar,
  BarPlanTier,
  PartnerAdBanner,
  PlatformDelegateConfig,
  PlatformPermissionKey,
  PlatformRolePreset,
  PlatformSaaSConfig,
  Recipe,
  UserNotificationItem,
} from '../types/meubar';
import { sb } from './supabase';

export const SUPER_ADMIN_EMAIL = 'nygames92@gmail.com';

const LOCAL_CONFIG_KEY = 'meubar_platform_saas_config_v1';
const LOCAL_ADS_KEY = 'meubar_partner_ads_cache_v1';

export interface PlatformPermissionMeta {
  key: PlatformPermissionKey;
  icon: string;
  label: string;
  description: string;
  group: 'gestao' | 'catalogo' | 'comercial' | 'suporte';
}

export const PLATFORM_PERMISSIONS_META: PlatformPermissionMeta[] = [
  {
    key: 'view_accounts',
    icon: '👥',
    label: 'Ver contas criadas & alertas de cadastro',
    description: 'Lista todas as contas cadastradas e recebe alertas quando alguém cria conta.',
    group: 'gestao',
  },
  {
    key: 'manage_stores',
    icon: '🏪',
    label: 'Visualizar e gerenciar todos os bares',
    description: 'Acessa a aba Todos os Bares com métricas de pedidos, estoque e detalhes das lojas.',
    group: 'gestao',
  },
  {
    key: 'manage_vip_plans',
    icon: '👑',
    label: 'Liberar VIP Grátis e alterar planos de lojas',
    description: 'Ativa Pro +30d, Pro +1 ano, VIP cortesia ou volta loja para Grátis.',
    group: 'gestao',
  },
  {
    key: 'audit_recipes',
    icon: '🍸',
    label: 'Auditar e publicar drinks autorais',
    description: 'Recebe alertas de drinks enviados, edita marca do criador e aprova ou recusa.',
    group: 'catalogo',
  },
  {
    key: 'edit_global_recipes',
    icon: '✏️',
    label: 'Editar receitas globais e sincronizar catálogo',
    description: 'Edita textos/ingredientes de receitas públicas e sincroniza o catálogo base.',
    group: 'catalogo',
  },
  {
    key: 'search_recipe_images',
    icon: '🌐',
    label: 'Pesquisar e trocar fotos na Internet',
    description: 'Usa o buscador web de fotos profissionais (🌐 Fotos) para atualizar drinks.',
    group: 'catalogo',
  },
  {
    key: 'support_desk',
    icon: '🎧',
    label: 'Central de Atendimento / Chat Suporte',
    description: 'Visualiza e responde conversas de suporte das lojas em tempo real.',
    group: 'suporte',
  },
  {
    key: 'sales_showcase',
    icon: '💼',
    label: 'Perfil de Vendas & Apresentação Comercial',
    description: 'Acessa o Painel de Vendas para demonstrar ao cliente, calculadora de economia e links.',
    group: 'comercial',
  },
  {
    key: 'use_simulator',
    icon: '🧪',
    label: 'Simulador Demo completo (Dono, Garçom, Caixa, QR)',
    description: 'Roda a loja demonstrativa ao vivo para apresentar ou testar fluxos sem afetar dados reais.',
    group: 'comercial',
  },
  {
    key: 'manage_partner_ads',
    icon: '📣',
    label: 'Gerenciar Banners de Parceiros',
    description: 'Cria, edita, pausa ou exclui banners patrocinados exibidos no Plano Grátis.',
    group: 'comercial',
  },
  {
    key: 'manage_adsense',
    icon: '🌐',
    label: 'Configurar Google AdSense',
    description: 'Altera Publisher ID, Slots de anúncio e rotação do AdSense.',
    group: 'comercial',
  },
  {
    key: 'manage_saas_pricing',
    icon: '⚙️',
    label: 'Alterar Preços, Trial e Links de Venda SaaS',
    description: 'Edita preços mensal/anual, dias de trial, limite de mesas e links de checkout.',
    group: 'comercial',
  },
];

export const ALL_PLATFORM_PERMISSION_KEYS: PlatformPermissionKey[] =
  PLATFORM_PERMISSIONS_META.map((p) => p.key);

export function buildPresetPermissions(
  preset: 'full_admin' | 'sales' | 'support' | 'auditor' | 'empty'
): Record<PlatformPermissionKey, boolean> {
  const base = {} as Record<PlatformPermissionKey, boolean>;
  for (const k of ALL_PLATFORM_PERMISSION_KEYS) base[k] = false;

  if (preset === 'full_admin') {
    for (const k of ALL_PLATFORM_PERMISSION_KEYS) base[k] = true;
  } else if (preset === 'sales') {
    base.use_simulator = true;
    base.sales_showcase = true;
  } else if (preset === 'support') {
    base.support_desk = true;
    base.manage_stores = true;
  } else if (preset === 'auditor') {
    base.audit_recipes = true;
    base.search_recipe_images = true;
    base.edit_global_recipes = true;
  }
  return base;
}

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
  admin_delegates: {},
  bar_plan_overrides: {},
};

export function isSuperAdmin(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === SUPER_ADMIN_EMAIL);
}

export function isPrimarySuperAdmin(email?: string | null): boolean {
  return isSuperAdmin(email);
}

export function getDelegateConfig(
  email?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): PlatformDelegateConfig | null {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return null;
  const map = config.admin_delegates || {};
  const found = map[clean];
  if (!found || !found.active) return null;
  return found;
}

export function hasPlatformPermission(
  email: string | null | undefined,
  permission: PlatformPermissionKey,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): boolean {
  if (isSuperAdmin(email)) return true;
  const del = getDelegateConfig(email, config);
  if (!del) return false;
  return Boolean(del.permissions?.[permission]);
}

const ADMIN_AREA_PERMS: PlatformPermissionKey[] = [
  'view_accounts',
  'manage_vip_plans',
  'manage_stores',
  'audit_recipes',
  'edit_global_recipes',
  'search_recipe_images',
  'support_desk',
  'use_simulator',
  'manage_partner_ads',
  'manage_adsense',
  'manage_saas_pricing',
];

export function canAccessAdminArea(
  email?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): boolean {
  if (isSuperAdmin(email)) return true;
  const del = getDelegateConfig(email, config);
  if (!del) return false;
  if (del.preset === 'sales' && !ADMIN_AREA_PERMS.some((k) => Boolean(del.permissions?.[k]) && k !== 'use_simulator')) {
    return false;
  }
  return ADMIN_AREA_PERMS.some((k) => Boolean(del.permissions?.[k]));
}

export function canAccessSalesProfile(
  email?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): boolean {
  if (isSuperAdmin(email)) return true;
  const del = getDelegateConfig(email, config);
  if (!del) return false;
  return (
    del.preset === 'sales' ||
    Boolean(del.permissions?.sales_showcase) ||
    Boolean(del.permissions?.use_simulator)
  );
}

export function isSupportStaff(
  email?: string | null,
  config: PlatformSaaSConfig = DEFAULT_SAAS_CONFIG
): boolean {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return false;
  if (isSuperAdmin(clean)) return true;
  if (hasPlatformPermission(clean, 'support_desk', config)) return true;
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
  const normalizedDelegates: Record<string, PlatformDelegateConfig> = {};
  if (obj.admin_delegates && typeof obj.admin_delegates === 'object') {
    for (const [k, v] of Object.entries(obj.admin_delegates)) {
      const cleanEmail = String(v?.email || k || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || isSuperAdmin(cleanEmail)) continue;
      const preset: PlatformRolePreset =
        v?.preset === 'sales' || v?.preset === 'support' ? v.preset : 'custom_admin';
      const perms: Partial<Record<PlatformPermissionKey, boolean>> = {};
      if (v?.permissions && typeof v.permissions === 'object') {
        for (const pk of ALL_PLATFORM_PERMISSION_KEYS) {
          perms[pk] = Boolean(v.permissions[pk]);
        }
      }
      normalizedDelegates[cleanEmail] = {
        email: cleanEmail,
        name: v?.name ? String(v.name).trim() : undefined,
        preset,
        active: v?.active !== false,
        permissions: perms,
        updated_at: v?.updated_at || new Date().toISOString(),
        updated_by: v?.updated_by,
      };
    }
  }
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
    admin_delegates: normalizedDelegates,
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
  const { data: sessionData } = await sb.auth.getSession();
  const actorEmail = sessionData?.session?.user?.email;
  if (isSuperAdmin(actorEmail)) {
    const res = await sb
      .from('platform_settings')
      .upsert(
        { id: 'default', config: clean, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (!res.error) return { ok: true };
    const rpcRes = await sb.rpc('update_platform_saas_config', { p_config: clean });
    if (!rpcRes.error) return { ok: true };
    return { ok: false, error: res.error.message };
  }

  // Contas delegadas só podem atualizar os blocos para os quais têm permissão via RPC segura
  const rpcRes = await sb.rpc('update_platform_saas_config', { p_config: clean });
  if (!rpcRes.error) return { ok: true };
  return { ok: false, error: rpcRes.error.message };
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

export async function submitRecipeForAudit(params: {
  recipeId: string;
  recipeName: string;
  creatorName: string;
  barName?: string | null;
  userId?: string | null;
  userEmail?: string | null;
}): Promise<void> {
  const creator = params.creatorName.trim() || 'Bartender / Parceiro';
  try {
    await sb.rpc('submit_recipe_for_audit', {
      p_recipe_id: params.recipeId,
      p_creator_name: creator,
      p_bar_name: params.barName || null,
    });
  } catch {
    // fallback silencioso se RPC ainda não estiver criada no banco
  }

  // Dispara alerta em tempo real para o Super Admin via Realtime Broadcast
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
              event: 'recipe_audit',
              payload: {
                id: `audit-${params.recipeId}-${Date.now()}`,
                kind: 'recipe_audit',
                title: 'Novo drink aguardando auditoria',
                message: `"${params.recipeName}" enviado por ${creator}${params.barName ? ` (${params.barName})` : ''} aguarda sua autorização para publicar.`,
                user_id: params.userId || null,
                user_email: params.userEmail || null,
                recipe_id: params.recipeId,
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

export async function loadUserNotifications(userId?: string | null): Promise<UserNotificationItem[]> {
  if (!userId) return [];
  try {
    const res = await sb
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!res.error && Array.isArray(res.data)) {
      return res.data as UserNotificationItem[];
    }
  } catch {
    // table may not exist before SQL update
  }
  return [];
}

export async function markUserNotificationsRead(
  userId?: string | null,
  ids?: string[]
): Promise<void> {
  if (!userId) return;
  try {
    if (ids && ids.length > 0) {
      await sb.from('user_notifications').update({ read: true }).eq('user_id', userId).in('id', ids);
    } else {
      await sb.from('user_notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    }
  } catch {
    // ignore
  }
}

export async function adminAuditRecipe(params: {
  recipe: Recipe;
  decision: 'approved' | 'rejected';
  creatorBrand: string;
  note?: string | null;
  imageUrl?: string | null;
}): Promise<{ ok: boolean; updated?: Recipe; error?: string }> {
  const { recipe, decision, note, imageUrl } = params;
  const brand = params.creatorBrand.trim() || recipe.creator_name || recipe.author_nick || 'Autor Parceiro';
  const cleanNote = (note || '').trim() || null;

  // Tenta via RPC segura primeiro (atualiza receita + cria notificação do criador + marca alerta lido)
  const rpc = await sb.rpc('admin_audit_recipe', {
    p_recipe_id: recipe.id,
    p_decision: decision,
    p_creator_name: brand,
    p_note: cleanNote,
    p_image_url: imageUrl !== undefined ? imageUrl : recipe.image_url || null,
  });

  const existingTags = Array.isArray(recipe.tags) ? recipe.tags : [];
  const cleanedTags = existingTags.filter(
    (t) =>
      typeof t === 'string' &&
      !t.startsWith('__audit:') &&
      !t.startsWith('__creator:') &&
      !(decision === 'approved' && t.startsWith('__bar:'))
  );
  const nextTags = [
    ...cleanedTags,
    `__audit:${decision}`,
    `__creator:${brand}`,
  ];

  let updatedRow: Recipe | undefined;
  let lastErr = rpc.error?.message;

  if (!rpc.error) {
    const fetchBack = await sb.from('recipes').select('*').eq('id', recipe.id).maybeSingle();
    if (!fetchBack.error && fetchBack.data) {
      updatedRow = fetchBack.data as Recipe;
    }
  } else {
    // Fallback direto caso a RPC ainda não esteja instalada no banco
    const updateBody: Record<string, unknown> = {
      is_public: decision === 'approved',
      verified: decision === 'approved',
      author_nick: brand,
      creator_name: brand,
      audit_status: decision,
      audit_note: cleanNote,
      audited_at: new Date().toISOString(),
      tags: nextTags,
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    };

    let up = await sb.from('recipes').update(updateBody).eq('id', recipe.id).select().single();
    if (up.error && /audit_|creator_name|column .* does not exist/i.test(up.error.message || '')) {
      delete updateBody.audit_status;
      delete updateBody.audit_note;
      delete updateBody.audited_at;
      delete updateBody.creator_name;
      up = await sb.from('recipes').update(updateBody).eq('id', recipe.id).select().single();
    }
    if (up.error) {
      lastErr = up.error.message;
    } else if (up.data) {
      updatedRow = up.data as Recipe;
      lastErr = undefined;
      if (recipe.owner) {
        try {
          await sb.from('user_notifications').insert({
            user_id: recipe.owner,
            kind: decision === 'approved' ? 'recipe_approved' : 'recipe_rejected',
            title:
              decision === 'approved'
                ? 'Drink autoral publicado!'
                : 'Drink autoral não publicado',
            message:
              decision === 'approved'
                ? `Seu drink "${recipe.name}" foi autorizado pela equipe e publicado no catálogo geral com a marca "${brand}"!`
                : `Seu drink "${recipe.name}" não foi aprovado para o catálogo geral${cleanNote ? `: ${cleanNote}` : '.'}`,
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            creator_name: brand,
            read: false,
          });
        } catch {
          // ignore if user_notifications table not yet migrated
        }
      }
      try {
        await sb
          .from('admin_notifications')
          .update({ read: true })
          .eq('kind', 'recipe_audit')
          .eq('recipe_id', recipe.id);
      } catch {
        // ignore
      }
    }
  }

  if (lastErr && !updatedRow) {
    return { ok: false, error: lastErr };
  }

  // Envia broadcast em tempo real para o criador se ele estiver online
  if (recipe.owner) {
    try {
      const ch = sb.channel(`user-alerts-${recipe.owner}`);
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 700);
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            void ch
              .send({
                type: 'broadcast',
                event: 'recipe_audited',
                payload: {
                  id: `notif-${recipe.id}-${Date.now()}`,
                  user_id: recipe.owner!,
                  kind: decision === 'approved' ? 'recipe_approved' : 'recipe_rejected',
                  title:
                    decision === 'approved'
                      ? 'Drink autoral publicado!'
                      : 'Drink autoral não publicado',
                  message:
                    decision === 'approved'
                      ? `Seu drink "${recipe.name}" foi autorizado e publicado com a marca "${brand}"!`
                      : `Seu drink "${recipe.name}" não foi publicado${cleanNote ? `: ${cleanNote}` : '.'}`,
                  recipe_id: recipe.id,
                  recipe_name: recipe.name,
                  creator_name: brand,
                  read: false,
                  created_at: new Date().toISOString(),
                } satisfies UserNotificationItem,
              })
              .finally(() => {
                setTimeout(() => void sb.removeChannel(ch), 250);
                resolve();
              });
          }
        });
      });
    } catch {
      // ignore broadcast error
    }
  }

  return { ok: true, updated: updatedRow };
}
