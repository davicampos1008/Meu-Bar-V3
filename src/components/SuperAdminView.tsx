import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAlertPrefs } from '../lib/alertPrefs';
import {
  adminAuditRecipe,
  adminListAllBars,
  adminListUsers,
  adminUpdateBarPlan,
  ALL_PLATFORM_PERMISSION_KEYS,
  buildAdsTxtLine,
  buildPresetPermissions,
  getBarPlanStatus,
  getDelegateConfig,
  hasPlatformPermission,
  isPrimarySuperAdmin,
  isSuperAdmin,
  isValidAdSenseClient,
  isValidAdSenseSlot,
  loadPartnerAds,
  PLATFORM_PERMISSIONS_META,
  sanitizeHttpUrl,
  savePlatformConfig,
} from '../lib/saas';
import { CATS, EMO } from '../lib/catalog';
import { buildResetRecipesSql } from '../lib/recipesResetSql';
import { EXTENDED_RECIPES } from '../lib/recipesSeed';
import {
  broadcastGlobalRecipeUpdate,
  RECIPE_BUCKET,
  saveRecipeImageGlobally,
  sb,
  uploadAndSaveRecipePhoto,
  uploadMediaFile,
} from '../lib/supabase';
import {
  getRecipeAuditStatus,
  getRecipeCreatorBrand,
  getRecipeItemType,
  money,
  norm,
  normalizeRecipeCategory,
  normalizeRecipeIngredients,
} from '../lib/utils';
import type {
  AdminAlertItem,
  AdminBarOverview,
  AdminUserAccount,
  BarPlanTier,
  PartnerAdBanner,
  PartnerAdPlacement,
  PlatformDelegateConfig,
  PlatformPermissionKey,
  PlatformRolePreset,
  PlatformSaaSConfig,
  Recipe,
} from '../types/meubar';
import { AdminSimulatorView } from './AdminSimulatorView';
import { DrinkImageSearchModal } from './DrinkImageSearchModal';
import { ImageUploader } from './SharedUI';
import { SupportDeskView } from './SupportChatView';

export type AdminTab =
  | 'accounts'
  | 'stores'
  | 'recipes_audit'
  | 'support'
  | 'simulator'
  | 'partners'
  | 'adsense'
  | 'sales'
  | 'team_access';
type AccountFilter = 'all' | 'recent' | 'with_bars' | 'no_bars' | 'vip_pro';

const PLACEMENT_LABELS: Record<PartnerAdPlacement, string> = {
  panel: 'Painel Admin (Estoque/Receitas/Mais)',
  explore: 'Lojas por perto & Tela de Login',
  menu_free: 'Rodapé do Cardápio (Plano Grátis)',
  all: 'Todos os espaços permitidos',
};

function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SuperAdminView: React.FC<{
  userId: string;
  userEmail?: string | null;
  actorName?: string;
  config: PlatformSaaSConfig;
  adminAlerts?: AdminAlertItem[];
  controlledTab?: AdminTab;
  hideInternalNav?: boolean;
  onTabChange?: (next: AdminTab) => void;
  onMarkAlertsRead?: (ids?: string[]) => Promise<void> | void;
  onOpenAlertSettings?: () => void;
  onConfigUpdated: (next: PlatformSaaSConfig) => void;
  onBarPlanChanged?: (
    barId: string,
    tier: BarPlanTier,
    expiresAt: string | null,
    trialEndsAt: string | null,
    note: string | null
  ) => void;
  onAdsUpdated: (ads: PartnerAdBanner[]) => void;
  onRecipeUpdated?: (updated: Recipe) => void;
  onBack?: () => void;
  onToast: (msg: string) => void;
}> = ({
  userId,
  userEmail,
  actorName = 'Admin Suporte',
  config,
  adminAlerts = [],
  controlledTab,
  hideInternalNav = false,
  onTabChange,
  onMarkAlertsRead,
  onOpenAlertSettings,
  onConfigUpdated,
  onBarPlanChanged,
  onAdsUpdated,
  onRecipeUpdated,
  onBack,
  onToast,
}) => {
  const { prefs: alertPrefs, setPref: setAlertPref, patchPrefs: patchAlertPrefs } = useAlertPrefs();
  const adminAlertOn = alertPrefs.allEnabled && alertPrefs.adminNewAccount;

  const isPrimaryOwner = isPrimarySuperAdmin(userEmail);
  const canViewAccounts = hasPlatformPermission(userEmail, 'view_accounts', config);
  const canManageVip = hasPlatformPermission(userEmail, 'manage_vip_plans', config);
  const canManageStores = hasPlatformPermission(userEmail, 'manage_stores', config);
  const canAuditRecipes = hasPlatformPermission(userEmail, 'audit_recipes', config);
  const canEditGlobalRecipes = hasPlatformPermission(userEmail, 'edit_global_recipes', config);
  const canSearchImages = hasPlatformPermission(userEmail, 'search_recipe_images', config);
  const canSupport = hasPlatformPermission(userEmail, 'support_desk', config);
  const canSimulator = hasPlatformPermission(userEmail, 'use_simulator', config);
  const canPartnerAds = hasPlatformPermission(userEmail, 'manage_partner_ads', config);
  const canAdSense = hasPlatformPermission(userEmail, 'manage_adsense', config);
  const canSaasPricing = hasPlatformPermission(userEmail, 'manage_saas_pricing', config);

  const isTabAllowed = (t: AdminTab): boolean => {
    switch (t) {
      case 'accounts':
        return canViewAccounts || canManageVip;
      case 'stores':
        return canManageStores || canManageVip;
      case 'recipes_audit':
        return canAuditRecipes || canSearchImages || canEditGlobalRecipes;
      case 'support':
        return canSupport;
      case 'simulator':
        return canSimulator;
      case 'partners':
        return canPartnerAds;
      case 'adsense':
        return canAdSense;
      case 'sales':
        return canSaasPricing;
      case 'team_access':
        return isPrimaryOwner;
      default:
        return false;
    }
  };

  const tabPriorityOrder: AdminTab[] = [
    'accounts',
    'recipes_audit',
    'stores',
    'support',
    'partners',
    'adsense',
    'simulator',
    'sales',
    'team_access',
  ];
  const firstAllowedTab: AdminTab =
    tabPriorityOrder.find((t) => isTabAllowed(t)) || 'accounts';

  const [internalTab, setInternalTab] = useState<AdminTab>(
    controlledTab && isTabAllowed(controlledTab) ? controlledTab : firstAllowedTab
  );
  const [supportFocus, setSupportFocus] = useState<{
    barId: string;
    barName: string;
    ownerEmail?: string | null;
  } | null>(null);

  const rawTab: AdminTab = controlledTab ?? internalTab;
  const tab: AdminTab = isTabAllowed(rawTab) ? rawTab : firstAllowedTab;
  const setTab = (next: AdminTab) => {
    if (!isTabAllowed(next)) return;
    setActiveModal(null);
    setInternalTab(next);
    onTabChange?.(next);
  };

  // Modal exclusivo de detalhes (ao abrir outro fecha o anterior; clicar fora fecha todos)
  const [activeModal, setActiveModal] = useState<
    | null
    | { kind: 'account'; id: string }
    | { kind: 'store'; id: string }
    | { kind: 'kpi'; topic: 'accounts' | 'stores' | 'vip' | 'alerts' }
  >(null);
  const [sqlModalText, setSqlModalText] = useState<string | null>(null);

  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeModal]);

  // Contas & Lojas
  const [users, setUsers] = useState<AdminUserAccount[]>([]);
  const [usersErr, setUsersErr] = useState('');
  const [stores, setStores] = useState<AdminBarOverview[]>([]);
  const [storesErr, setStoresErr] = useState('');
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  const [accountQuery, setAccountQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
  const [storeQuery, setStoreQuery] = useState('');
  const [busyBarId, setBusyBarId] = useState<string | null>(null);
  const [noteByBar, setNoteByBar] = useState<Record<string, string>>({});
  const [newVipEmail, setNewVipEmail] = useState('');

  // Banners de Parceiros
  const [ads, setAds] = useState<PartnerAdBanner[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adTitle, setAdTitle] = useState('');
  const [adSubtitle, setAdSubtitle] = useState('');
  const [adCta, setAdCta] = useState('Conhecer');
  const [adImage, setAdImage] = useState('');
  const [adUrl, setAdUrl] = useState('');
  const [adPlacement, setAdPlacement] = useState<PartnerAdPlacement>('panel');
  const [adBadge, setAdBadge] = useState('Parceiro');
  const [adAccent, setAdAccent] = useState('#e5a93c');
  const [adPriority, setAdPriority] = useState('10');
  const [savingAd, setSavingAd] = useState(false);

  // Config global (AdSense + Preços + Delegação ADM/Vendas)
  const [draft, setDraft] = useState<PlatformSaaSConfig>(config);
  const [savingCfg, setSavingCfg] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  // Delegação de ADM & Perfil de Vendas (exclusivo do dono principal)
  const [delegateEmail, setDelegateEmail] = useState('');
  const [delegateName, setDelegateName] = useState('');
  const [delegatePreset, setDelegatePreset] = useState<PlatformRolePreset>('custom_admin');
  const [delegateActive, setDelegateActive] = useState(true);
  const [delegatePerms, setDelegatePerms] = useState<Record<PlatformPermissionKey, boolean>>(() =>
    buildPresetPermissions('auditor')
  );

  // Auditoria de Receitas Autorais + Imagens do Catálogo
  const [auditRecipes, setAuditRecipes] = useState<Recipe[]>([]);
  const [loadingAuditRecipes, setLoadingAuditRecipes] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'pending' | 'approved_custom' | 'rejected' | 'all'>('pending');
  const [reviewRecipe, setReviewRecipe] = useState<Recipe | null>(null);
  const [reviewBrand, setReviewBrand] = useState('');
  const [reviewImage, setReviewImage] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [auditingBusy, setAuditingBusy] = useState(false);
  const [uploadingReviewPhoto, setUploadingReviewPhoto] = useState(false);
  const [showReviewPhotoSearch, setShowReviewPhotoSearch] = useState(false);
  const [showCatalogPhotoSearch, setShowCatalogPhotoSearch] = useState(false);
  const [quickPhotoRecipe, setQuickPhotoRecipe] = useState<Recipe | null>(null);
  const reviewPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const refreshDirectory = async () => {
    if (!canViewAccounts && !canManageStores && !canManageVip && !isPrimaryOwner) {
      setLoadingDirectory(false);
      return;
    }
    setLoadingDirectory(true);
    setStoresErr('');
    setUsersErr('');
    const needStores = canManageStores || canManageVip || canViewAccounts || isPrimaryOwner;
    const needUsers = canViewAccounts || canManageVip || isPrimaryOwner;
    const [storesRes, usersRes] = await Promise.all([
      needStores ? adminListAllBars() : Promise.resolve({ bars: [], error: undefined }),
      needUsers ? adminListUsers() : Promise.resolve({ users: [], error: undefined }),
    ]);
    setStores(storesRes.bars);
    if (storesRes.error) setStoresErr(storesRes.error);
    setUsers(usersRes.users);
    if (usersRes.error) setUsersErr(usersRes.error);
    setLoadingDirectory(false);
  };

  const refreshAds = async () => {
    setAdsLoading(true);
    const list = await loadPartnerAds(true);
    setAds(list);
    onAdsUpdated(list.filter((a) => a.active));
    setAdsLoading(false);
  };

  const refreshAuditRecipes = async () => {
    setLoadingAuditRecipes(true);
    try {
      let res = await sb
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      if (res.error) {
        res = await sb.from('recipes').select('*').order('name');
      }
      if (!res.error && Array.isArray(res.data)) {
        const drinks = (res.data as Recipe[]).filter((r) => getRecipeItemType(r) === 'drink');
        setAuditRecipes(drinks);
      }
    } finally {
      setLoadingAuditRecipes(false);
    }
  };

  const openRecipeAuditModal = (r: Recipe) => {
    setReviewRecipe(r);
    setReviewBrand(getRecipeCreatorBrand(r) || '');
    setReviewImage(r.image_url || '');
    setReviewNote(r.audit_note || '');
  };

  const openAuditByAlert = async (al: AdminAlertItem) => {
    setTab('recipes_audit');
    const existing = al.recipe_id ? auditRecipes.find((r) => r.id === al.recipe_id) : undefined;
    if (existing) {
      openRecipeAuditModal(existing);
      return;
    }
    if (al.recipe_id) {
      const fetchOne = await sb.from('recipes').select('*').eq('id', al.recipe_id).maybeSingle();
      if (!fetchOne.error && fetchOne.data) {
        const rec = fetchOne.data as Recipe;
        setAuditRecipes((prev) =>
          prev.some((x) => x.id === rec.id) ? prev : [rec, ...prev]
        );
        openRecipeAuditModal(rec);
        return;
      }
    }
    void refreshAuditRecipes();
  };

  const handleAuditDecision = async (decision: 'approved' | 'rejected') => {
    if (!reviewRecipe) return;
    const cleanBrand = reviewBrand.trim();
    if (decision === 'approved' && cleanBrand.length < 2) {
      onToast('Informe o nome ou marca do criador que aparecerá dentro do drink publicado.');
      return;
    }
    setAuditingBusy(true);
    const res = await adminAuditRecipe({
      recipe: reviewRecipe,
      decision,
      creatorBrand: cleanBrand || getRecipeCreatorBrand(reviewRecipe) || 'Autor Parceiro',
      note: reviewNote,
      imageUrl: reviewImage.trim() || null,
    });
    setAuditingBusy(false);

    if (!res.ok) {
      onToast(`Erro ao auditar receita: ${res.error || 'verifique as permissões no Supabase.'}`);
      return;
    }

    const updatedRec: Recipe = res.updated || {
      ...reviewRecipe,
      is_public: decision === 'approved',
      verified: decision === 'approved',
      audit_status: decision,
      creator_name: cleanBrand || getRecipeCreatorBrand(reviewRecipe),
      author_nick: cleanBrand || getRecipeCreatorBrand(reviewRecipe),
      audit_note: reviewNote.trim() || null,
      image_url: reviewImage.trim() || null,
    };

    setAuditRecipes((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)));
    onRecipeUpdated?.(updatedRec);
    void broadcastGlobalRecipeUpdate(updatedRec);

    const relatedAlertIds = adminAlerts
      .filter((al) => !al.read && al.kind === 'recipe_audit' && al.recipe_id === reviewRecipe.id)
      .map((al) => al.id);
    if (relatedAlertIds.length > 0) {
      await onMarkAlertsRead?.(relatedAlertIds);
    }

    onToast(
      decision === 'approved'
        ? `✓ "${reviewRecipe.name}" autorizado e publicado com a marca "${cleanBrand}"! Criador notificado.`
        : `✕ "${reviewRecipe.name}" marcado como recusado e criador notificado.`
    );
    setReviewRecipe(null);
  };

  useEffect(() => {
    void refreshDirectory();
    if (canPartnerAds || isPrimaryOwner) void refreshAds();
    if (canAuditRecipes || canSearchImages || canEditGlobalRecipes) void refreshAuditRecipes();
  }, []);

  useEffect(() => {
    if (tab === 'recipes_audit' && (canAuditRecipes || canSearchImages || canEditGlobalRecipes)) {
      void refreshAuditRecipes();
    }
  }, [tab]);

  useEffect(() => {
    if (canAuditRecipes && adminAlerts.some((a) => !a.read && a.kind === 'recipe_audit')) {
      void refreshAuditRecipes();
    }
  }, [adminAlerts.length]);

  const handleSetPlan = async (
    barId: string,
    tier: BarPlanTier,
    daysValid: number | null
  ) => {
    setBusyBarId(barId);
    const expiresAt =
      tier === 'pro' && daysValid
        ? new Date(Date.now() + daysValid * 86400000).toISOString()
        : null;
    const note = (noteByBar[barId] || '').trim() || null;
    const res = await adminUpdateBarPlan(barId, tier, expiresAt, note, draft);
    setBusyBarId(null);
    if (!res.ok) {
      onToast(`Erro: ${res.error || 'Execute o schema_completo.sql atualizado no Supabase.'}`);
      return;
    }
    if (res.nextConfig) {
      setDraft(res.nextConfig);
      onConfigUpdated(res.nextConfig);
    }
    setStores((prev) =>
      prev.map((s) =>
        s.id === barId
          ? {
              ...s,
              plan_tier: tier,
              plan_expires_at: tier === 'pro' ? expiresAt : null,
              trial_ends_at: res.trialEndsAt,
              plan_note: note,
            }
          : s
      )
    );
    onBarPlanChanged?.(barId, tier, tier === 'pro' ? expiresAt : null, res.trialEndsAt, note);
    onToast(
      tier === 'vip'
        ? '✓ Acesso VIP (Pro Grátis) liberado para esta loja!'
        : tier === 'pro'
          ? `✓ Plano Pro ativado (${daysValid ? `${daysValid} dias` : 'sem vencimento'})!`
          : '✓ Loja alterada para Plano Grátis.'
    );
    void refreshDirectory();
  };

  const openChatWithBar = (barId: string, barName: string, ownerEmail?: string | null) => {
    setSupportFocus({ barId, barName, ownerEmail });
    setTab('support');
  };

  const handleSaveConfig = async (
    nextCfg: PlatformSaaSConfig,
    successMsg = 'Configurações salvas!'
  ) => {
    setSavingCfg(true);
    const res = await savePlatformConfig(nextCfg);
    setSavingCfg(false);
    onConfigUpdated(nextCfg);
    if (!res.ok) {
      onToast(
        `Salvo localmente. Para sincronizar na nuvem, rode o schema_completo.sql (${res.error}).`
      );
      return;
    }
    onToast(successMsg);
  };

  const handleToggleEmailVip = async (rawEmail: string, grant: boolean) => {
    const clean = rawEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('E-mail inválido.');
      return;
    }
    const exists = draft.free_user_emails.includes(clean);
    if (grant && exists) {
      onToast(`${clean} já possui Pro VIP liberado!`);
      return;
    }
    const nextEmails = grant
      ? [...draft.free_user_emails, clean]
      : draft.free_user_emails.filter((x) => x !== clean);
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      free_user_emails: nextEmails,
    };
    setDraft(nextCfg);
    await handleSaveConfig(
      nextCfg,
      grant
        ? `Pro VIP (Grátis) liberado para ${clean}!`
        : `${clean} removido da lista Pro VIP.`
    );
  };

  const handleAddVipEmail = async () => {
    const clean = newVipEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('Digite um e-mail válido.');
      return;
    }
    setNewVipEmail('');
    await handleToggleEmailVip(clean, true);
  };

  const loadDelegateIntoEditor = (rawEmail: string, suggestedName?: string) => {
    const clean = rawEmail.trim().toLowerCase();
    setDelegateEmail(clean);
    const existing = draft.admin_delegates?.[clean];
    if (existing) {
      setDelegateName(existing.name || suggestedName || '');
      setDelegatePreset(existing.preset || 'custom_admin');
      setDelegateActive(existing.active !== false);
      const nextPerms = buildPresetPermissions('empty');
      for (const k of ALL_PLATFORM_PERMISSION_KEYS) {
        nextPerms[k] = Boolean(existing.permissions?.[k]);
      }
      setDelegatePerms(nextPerms);
    } else {
      setDelegateName(suggestedName || '');
      setDelegateActive(true);
    }
  };

  const applyDelegateTemplate = (
    mode: 'full_admin' | 'sales' | 'support' | 'auditor' | 'empty'
  ) => {
    setDelegatePerms(buildPresetPermissions(mode));
    if (mode === 'sales') setDelegatePreset('sales');
    else if (mode === 'support') setDelegatePreset('support');
    else setDelegatePreset('custom_admin');
  };

  const handleSaveDelegate = async () => {
    if (!isPrimaryOwner) {
      onToast('Somente o proprietário principal pode delegar acessos.');
      return;
    }
    const clean = delegateEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('Selecione uma conta ou digite um e-mail válido.');
      return;
    }
    if (isSuperAdmin(clean)) {
      onToast('O proprietário principal já possui acesso total permanente.');
      return;
    }
    const enabledCount = ALL_PLATFORM_PERMISSION_KEYS.filter((k) => delegatePerms[k]).length;
    if (enabledCount === 0 && delegatePreset !== 'sales') {
      onToast('Ative ao menos uma permissão ou escolha o Perfil de Vendas.');
      return;
    }
    const cleanPerms: Partial<Record<PlatformPermissionKey, boolean>> = {};
    for (const k of ALL_PLATFORM_PERMISSION_KEYS) {
      if (delegatePerms[k]) cleanPerms[k] = true;
    }
    if (delegatePreset === 'sales' && enabledCount === 0) {
      cleanPerms.sales_showcase = true;
      cleanPerms.use_simulator = true;
    }

    const entry: PlatformDelegateConfig = {
      email: clean,
      name: delegateName.trim() || undefined,
      preset: delegatePreset,
      active: delegateActive,
      permissions: cleanPerms,
      updated_at: new Date().toISOString(),
      updated_by: (userEmail || '').trim().toLowerCase() || undefined,
    };

    const nextDelegates = {
      ...(draft.admin_delegates || {}),
      [clean]: entry,
    };
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      admin_delegates: nextDelegates,
    };
    setDraft(nextCfg);
    await handleSaveConfig(
      nextCfg,
      delegatePreset === 'sales'
        ? `✓ Perfil de Vendas salvo para ${clean}!`
        : `✓ Permissões de ADM salvas para ${clean}!`
    );
  };

  const handleToggleDelegateActive = async (email: string) => {
    if (!isPrimaryOwner) return;
    const clean = email.trim().toLowerCase();
    const cur = draft.admin_delegates?.[clean];
    if (!cur) return;
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      admin_delegates: {
        ...(draft.admin_delegates || {}),
        [clean]: {
          ...cur,
          active: !cur.active,
          updated_at: new Date().toISOString(),
        },
      },
    };
    setDraft(nextCfg);
    if (delegateEmail.trim().toLowerCase() === clean) {
      setDelegateActive(!cur.active);
    }
    await handleSaveConfig(
      nextCfg,
      !cur.active ? `Acesso reativado para ${clean}.` : `Acesso pausado para ${clean}.`
    );
  };

  const handleRemoveDelegate = async (email: string) => {
    if (!isPrimaryOwner) return;
    const clean = email.trim().toLowerCase();
    const nextDelegates = { ...(draft.admin_delegates || {}) };
    delete nextDelegates[clean];
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      admin_delegates: nextDelegates,
    };
    setDraft(nextCfg);
    if (delegateEmail.trim().toLowerCase() === clean) {
      setDelegateEmail('');
      setDelegateName('');
    }
    await handleSaveConfig(nextCfg, `Acesso delegado removido para ${clean}.`);
  };

  const handleSyncCatalog = async () => {
    setSyncingCatalog(true);
    try {
      const existingRes = await sb
        .from('recipes')
        .select('id, name, owner, image_url, item_type');
      if (existingRes.error) {
        onToast('Erro ao ler catálogo: ' + existingRes.error.message);
        return;
      }
      const existingRows = (existingRes.data || []) as {
        id: string;
        name: string;
        owner?: string | null;
        image_url?: string | null;
        item_type?: string | null;
      }[];
      const byName = new Map<string, typeof existingRows[number]>();
      existingRows.forEach((row) => {
        if (!row.owner && (!row.item_type || row.item_type === 'drink')) {
          const k = norm(row.name);
          if (k && !byName.has(k)) byName.set(k, row);
        }
      });

      const toInsert: Record<string, unknown>[] = [];
      let updatedCount = 0;

      for (const sr of EXTENDED_RECIPES) {
        const hit = byName.get(norm(sr.name));
        if (hit) {
          const upd = await sb
            .from('recipes')
            .update({
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
              is_public: true,
            })
            .eq('id', hit.id);
          if (!upd.error) updatedCount++;
        } else {
          toInsert.push({
            owner: null,
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
            item_type: 'drink',
          });
        }
      }

      let insertedCount = 0;
      let firstErr = '';
      const CHUNK = 30;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const slice = toInsert.slice(i, i + CHUNK);
        const ins = await sb.from('recipes').insert(slice);
        if (ins.error) {
          if (!firstErr) firstErr = ins.error.message;
        } else {
          insertedCount += slice.length;
        }
      }

      if (firstErr) {
        onToast(
          `Inseridos ${insertedCount}, mas houve erro do banco: ${firstErr}. Use o SQL Reset no Supabase.`
        );
      } else {
        onToast(
          `✓ Catálogo sincronizado: ${insertedCount} novo(s) drink(s) e ${updatedCount} atualizado(s)!`
        );
      }
    } finally {
      setSyncingCatalog(false);
    }
  };

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdTitle('');
    setAdSubtitle('');
    setAdCta('Conhecer');
    setAdImage('');
    setAdUrl('');
    setAdPlacement('panel');
    setAdBadge('Parceiro');
    setAdAccent('#e5a93c');
    setAdPriority('10');
  };

  const handleEditAd = (ad: PartnerAdBanner) => {
    setEditingAdId(ad.id);
    setAdTitle(ad.title || '');
    setAdSubtitle(ad.subtitle || '');
    setAdCta(ad.cta_label || 'Conhecer');
    setAdImage(ad.image_url || '');
    setAdUrl(ad.click_url || '');
    setAdPlacement(ad.placement || 'panel');
    setAdBadge(ad.badge_text || 'Parceiro');
    setAdAccent(ad.accent_color || '#e5a93c');
    setAdPriority(String(ad.priority ?? 10));
  };

  const handleSaveAd = async () => {
    const title = adTitle.trim();
    if (title.length < 3) {
      onToast('Informe o título do anúncio (mínimo 3 letras).');
      return;
    }
    const cleanUrl = adUrl.trim();
    if (cleanUrl && !sanitizeHttpUrl(cleanUrl)) {
      onToast('O link de destino deve começar com https:// ou http://');
      return;
    }
    setSavingAd(true);
    const payload = {
      title,
      subtitle: adSubtitle.trim() || null,
      cta_label: adCta.trim() || 'Conhecer',
      image_url: adImage.trim() || null,
      click_url: cleanUrl || null,
      placement: adPlacement,
      badge_text: adBadge.trim() || 'Parceiro',
      accent_color: adAccent || '#e5a93c',
      priority: Math.max(0, Math.min(100, parseInt(adPriority, 10) || 10)),
      active: true,
    };

    const res = editingAdId
      ? await sb.from('partner_ads').update(payload).eq('id', editingAdId)
      : await sb.from('partner_ads').insert(payload);

    setSavingAd(false);
    if (res.error) {
      onToast(`Erro ao salvar banner: ${res.error.message} (rode o schema_completo.sql).`);
      return;
    }
    resetAdForm();
    onToast(editingAdId ? 'Banner atualizado!' : 'Banner de parceiro criado e publicado!');
    await refreshAds();
  };

  const handleToggleAd = async (ad: PartnerAdBanner) => {
    const res = await sb.from('partner_ads').update({ active: !ad.active }).eq('id', ad.id);
    if (res.error) {
      onToast('Erro: ' + res.error.message);
      return;
    }
    await refreshAds();
  };

  const handleDeleteAd = async (adId: string) => {
    const res = await sb.from('partner_ads').delete().eq('id', adId);
    if (res.error) {
      onToast('Erro: ' + res.error.message);
      return;
    }
    if (editingAdId === adId) resetAdForm();
    onToast('Banner removido.');
    await refreshAds();
  };

  // Unifica contas vindas de auth.users + donos de bares + alertas recentes (fallback caso SQL ainda não tenha sido rodado)
  const organizedAccounts = useMemo(() => {
    const byId = new Map<
      string,
      AdminUserAccount & { ownedBars: AdminBarOverview[]; isVipEmail: boolean; isAdmin: boolean }
    >();
    const emailToId = new Map<string, string>();
    const vipSet = new Set(draft.free_user_emails.map((e) => e.trim().toLowerCase()));

    users.forEach((u) => {
      const em = (u.email || '').trim().toLowerCase();
      byId.set(u.id, {
        ...u,
        email: em || u.email,
        ownedBars: [],
        isVipEmail: Boolean(em && vipSet.has(em)),
        isAdmin: isSuperAdmin(em),
      });
      if (em) emailToId.set(em, u.id);
    });

    stores.forEach((b) => {
      const em = (b.owner_email || '').trim().toLowerCase();
      const targetId = byId.has(b.owner) ? b.owner : (em && emailToId.get(em)) || b.owner;
      if (!byId.has(targetId)) {
        byId.set(targetId, {
          id: targetId,
          email: em || `conta-${targetId.slice(0, 8)}`,
          display_name: null,
          location: b.city || null,
          created_at: b.created_at || null,
          last_sign_in_at: null,
          bars_count: 0,
          member_bars_count: 0,
          ownedBars: [],
          isVipEmail: Boolean(em && vipSet.has(em)),
          isAdmin: isSuperAdmin(em),
        });
      }
      const acc = byId.get(targetId)!;
      acc.ownedBars.push(b);
      acc.bars_count = acc.ownedBars.length;
    });

    // Inclui e-mails vindos de alertas ao vivo caso ainda não estejam na lista
    adminAlerts.forEach((al) => {
      const em = (al.user_email || '').trim().toLowerCase();
      if (!em || emailToId.has(em)) return;
      const syntheticId = al.user_id || `email:${em}`;
      if (byId.has(syntheticId)) return;
      byId.set(syntheticId, {
        id: syntheticId,
        email: em,
        display_name: null,
        location: null,
        created_at: al.created_at,
        last_sign_in_at: null,
        bars_count: 0,
        member_bars_count: 0,
        ownedBars: [],
        isVipEmail: vipSet.has(em),
        isAdmin: isSuperAdmin(em),
      });
      emailToId.set(em, syntheticId);
    });

    return Array.from(byId.values()).sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [users, stores, adminAlerts, draft.free_user_emails]);

  const nowMs = Date.now();
  const sevenDaysMs = 7 * 86400000;

  const accountStats = useMemo(() => {
    let recent = 0;
    let withBars = 0;
    let vipOrPro = 0;
    organizedAccounts.forEach((acc) => {
      if (acc.created_at && nowMs - new Date(acc.created_at).getTime() <= sevenDaysMs) recent++;
      if (acc.ownedBars.length > 0) withBars++;
      const hasProBar = acc.ownedBars.some(
        (b) => getBarPlanStatus(b, acc.email, draft).effectiveTier === 'pro' || b.plan_tier === 'vip'
      );
      if (acc.isAdmin || acc.isVipEmail || hasProBar) vipOrPro++;
    });
    return {
      total: organizedAccounts.length,
      recent,
      withBars,
      noBars: organizedAccounts.length - withBars,
      vipOrPro,
    };
  }, [organizedAccounts, draft, nowMs]);

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase();
    return organizedAccounts.filter((acc) => {
      const hasProBar = acc.ownedBars.some((b) => {
        const st = getBarPlanStatus(b, acc.email, draft);
        return st.effectiveTier === 'pro' || st.effectiveTier === 'vip';
      });
      if (accountFilter === 'recent') {
        if (!acc.created_at || nowMs - new Date(acc.created_at).getTime() > sevenDaysMs) {
          return false;
        }
      } else if (accountFilter === 'with_bars' && acc.ownedBars.length === 0) {
        return false;
      } else if (accountFilter === 'no_bars' && acc.ownedBars.length > 0) {
        return false;
      } else if (accountFilter === 'vip_pro' && !acc.isAdmin && !acc.isVipEmail && !hasProBar) {
        return false;
      }

      if (!q) return true;
      const matchUser =
        (acc.email || '').toLowerCase().includes(q) ||
        (acc.display_name || '').toLowerCase().includes(q) ||
        (acc.location || '').toLowerCase().includes(q);
      const matchBar = acc.ownedBars.some(
        (b) =>
          (b.name || '').toLowerCase().includes(q) ||
          (b.handle || '').toLowerCase().includes(q) ||
          (b.city || '').toLowerCase().includes(q)
      );
      return matchUser || matchBar;
    });
  }, [organizedAccounts, accountQuery, accountFilter, draft, nowMs]);

  // KPIs das lojas
  const storeStats = stores.reduce(
    (acc, s) => {
      const st = getBarPlanStatus(s, s.owner_email, draft);
      acc.total++;
      if (st.effectiveTier === 'pro') acc.pro++;
      else if (st.effectiveTier === 'vip') acc.vip++;
      else if (st.effectiveTier === 'trial') acc.trial++;
      else acc.free++;
      return acc;
    },
    { total: 0, pro: 0, vip: 0, trial: 0, free: 0 }
  );

  const filteredStores = stores.filter((s) => {
    const q = storeQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.handle || '').toLowerCase().includes(q) ||
      (s.city || '').toLowerCase().includes(q) ||
      (s.owner_email || '').toLowerCase().includes(q)
    );
  });

  const unreadAlerts = adminAlerts.filter((a) => {
    if (a.read) return false;
    if (a.kind === 'recipe_audit') return canAuditRecipes;
    return canViewAccounts;
  });
  const pendingAuditCount = auditRecipes.filter((r) => getRecipeAuditStatus(r) === 'pending').length;
  const approvedCustomRecipes = auditRecipes.filter(
    (r) =>
      getRecipeAuditStatus(r) === 'approved' &&
      Boolean(r.owner || getRecipeCreatorBrand(r))
  );
  const rejectedAuditRecipes = auditRecipes.filter(
    (r) => getRecipeAuditStatus(r) === 'rejected'
  );
  const filteredAuditRecipes = useMemo(() => {
    if (auditFilter === 'pending') {
      return auditRecipes.filter((r) => getRecipeAuditStatus(r) === 'pending');
    }
    if (auditFilter === 'approved_custom') {
      return approvedCustomRecipes;
    }
    if (auditFilter === 'rejected') {
      return rejectedAuditRecipes;
    }
    return auditRecipes;
  }, [auditRecipes, auditFilter, approvedCustomRecipes, rejectedAuditRecipes]);
  const adsTxtLine = buildAdsTxtLine(draft.adsense_client_id);

  return (
    <div>
      {onBack && !hideInternalNav && (
        <button type="button" className="b g sm" onClick={onBack}>
          ← Voltar
        </button>
      )}

      <div className={hideInternalNav ? 'mt-0' : 'mt-3'}>
        <div className="text-xs text-[var(--ac)] font-semibold">
          Administração da Plataforma
        </div>
        <h1 className="!mt-1 !mb-1">
          {tab === 'team_access'
            ? '🔑 Delegar ADM & Perfil de Vendas'
            : tab === 'support'
              ? '🎧 Central de Suporte & Equipe'
              : tab === 'stores'
                ? '🏪 Gestão de Lojas & Planos'
                : tab === 'recipes_audit'
                  ? '🍸 Auditoria de Receitas & Imagens'
                  : tab === 'partners' || tab === 'adsense'
                    ? '📣 Anúncios & Parceiros'
                    : tab === 'sales'
                      ? '⚙️ Preços, Planos & Vendas SaaS'
                      : tab === 'simulator'
                        ? '🧪 Simulador Interativo Demo'
                        : '👑 Contas, Bares & Planos'}
        </h1>
        <p className="mu text-xs">
          {isPrimaryOwner
            ? 'Controle completo da plataforma: contas, delegação de acessos ADM/Vendas, auditoria de drinks, fotos, planos e suporte.'
            : 'Painel administrativo delegado conforme as permissões liberadas pelo proprietário.'}
        </p>
      </div>

      {/* CONTROLE DO ALERTA DE NOVAS CONTAS */}
      {canViewAccounts && (
        <div className="panel mt-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[var(--fg)]">
              {adminAlertOn ? '🔔 Alerta de nova conta: Ativado' : '🔕 Alerta de nova conta: Desativado'}
            </div>
            <div className="text-[11px] text-[var(--mut)]">
              {adminAlertOn
                ? 'Você recebe som, aviso na tela, contador e banner sempre que uma nova conta for criada.'
                : 'Os alertas de novos cadastros estão pausados neste aparelho (você ainda pode ver todas as contas abaixo).'}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenAlertSettings && (
              <button
                type="button"
                className="b g sm"
                onClick={onOpenAlertSettings}
              >
                Todos os alertas
              </button>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={adminAlertOn}
              aria-label="Ativar ou desativar alerta de nova conta criada"
              onClick={() => {
                if (!adminAlertOn) {
                  if (!alertPrefs.allEnabled) {
                    patchAlertPrefs({ allEnabled: true, adminNewAccount: true });
                  } else {
                    setAlertPref('adminNewAccount', true);
                  }
                } else {
                  setAlertPref('adminNewAccount', false);
                }
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${
                adminAlertOn
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'bg-white/10 border-white/15'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  adminAlertOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ALERTAS DA PLATAFORMA (NOVAS CONTAS E AUDITORIAS DE DRINKS) */}
      {(adminAlertOn || unreadAlerts.some((a) => a.kind === 'recipe_audit')) && unreadAlerts.length > 0 && (
        <div className="panel mt-3 !border-emerald-400/50 bg-emerald-500/10 space-y-2.5">
          <div className="row sp flex-wrap gap-2">
            <div>
              <div className="text-sm font-bold text-emerald-200">
                🔔 {unreadAlerts.length} alerta(s) pendente(s) para o ADM
              </div>
              <div className="text-xs text-[var(--mut)]">
                Novos cadastros e drinks autorais enviados para revisão e autorização de publicação.
              </div>
            </div>
            {onMarkAlertsRead && (
              <button
                type="button"
                className="b g sm"
                onClick={() => void onMarkAlertsRead()}
              >
                Marcar tudo como lido
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {unreadAlerts.slice(0, 8).map((al) => {
              const em = (al.user_email || '').trim().toLowerCase();
              const alreadyVip = Boolean(em && draft.free_user_emails.includes(em));
              const isAuditAlert = al.kind === 'recipe_audit';
              return (
                <div
                  key={al.id}
                  className="rounded-xl bg-black/25 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[var(--fg)] truncate">
                      {isAuditAlert ? `🍸 ${al.title}` : em || al.title}
                    </div>
                    <div className="text-[var(--mut)]">
                      {al.message || 'Nova notificação'} · {fmtDateTime(al.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAuditAlert && canAuditRecipes ? (
                      <button
                        type="button"
                        className="b ok sm"
                        onClick={() => void openAuditByAlert(al)}
                      >
                        Revisar e Autorizar →
                      </button>
                    ) : (
                      !isAuditAlert &&
                      canManageVip &&
                      em &&
                      !isSuperAdmin(em) && (
                        <button
                          type="button"
                          className={`b sm ${alreadyVip ? 'g' : 'ok'}`}
                          disabled={savingCfg}
                          onClick={() => void handleToggleEmailVip(em, !alreadyVip)}
                        >
                          {alreadyVip ? 'VIP Ativo' : 'Liberar VIP'}
                        </button>
                      )
                    )}
                    {onMarkAlertsRead && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => void onMarkAlertsRead([al.id])}
                      >
                        OK
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navegação por abas */}
      {!hideInternalNav ? (
        <div className="chips !flex-wrap !overflow-visible mt-3 mb-3">
          {isTabAllowed('accounts') && (
            <button
              type="button"
              className={`chip ${tab === 'accounts' ? 'on' : ''}`}
              onClick={() => setTab('accounts')}
            >
              Contas & Bares ({accountStats.total})
            </button>
          )}
          {isPrimaryOwner && (
            <button
              type="button"
              className={`chip ${tab === 'team_access' ? 'on' : ''}`}
              onClick={() => setTab('team_access')}
            >
              🔑 Equipe ADM & Vendas ({Object.keys(draft.admin_delegates || {}).length})
            </button>
          )}
          {isTabAllowed('stores') && (
            <button
              type="button"
              className={`chip ${tab === 'stores' ? 'on' : ''}`}
              onClick={() => setTab('stores')}
            >
              Todos os Bares ({storeStats.total})
            </button>
          )}
          {isTabAllowed('recipes_audit') && (
            <button
              type="button"
              className={`chip ${tab === 'recipes_audit' ? 'on' : ''}`}
              onClick={() => setTab('recipes_audit')}
            >
              🍸 Auditoria Receitas{pendingAuditCount > 0 ? ` (${pendingAuditCount})` : ''}
            </button>
          )}
          {isTabAllowed('support') && (
            <button
              type="button"
              className={`chip ${tab === 'support' ? 'on' : ''}`}
              onClick={() => setTab('support')}
            >
              💬 Suporte & Equipe
            </button>
          )}
          {isTabAllowed('simulator') && (
            <button
              type="button"
              className={`chip ${tab === 'simulator' ? 'on' : ''}`}
              onClick={() => setTab('simulator')}
            >
              🧪 Simulador Demo
            </button>
          )}
          {isTabAllowed('partners') && (
            <button
              type="button"
              className={`chip ${tab === 'partners' ? 'on' : ''}`}
              onClick={() => setTab('partners')}
            >
              Parceiros ({ads.filter((a) => a.active).length})
            </button>
          )}
          {isTabAllowed('adsense') && (
            <button
              type="button"
              className={`chip ${tab === 'adsense' ? 'on' : ''}`}
              onClick={() => setTab('adsense')}
            >
              Google AdSense {draft.adsense_enabled ? '· Ativo' : ''}
            </button>
          )}
          {isTabAllowed('sales') && (
            <button
              type="button"
              className={`chip ${tab === 'sales' ? 'on' : ''}`}
              onClick={() => setTab('sales')}
            >
              Preços & Vendas
            </button>
          )}
        </div>
      ) : (
        (tab === 'partners' || tab === 'adsense') &&
        isTabAllowed('partners') &&
        isTabAllowed('adsense') && (
          <div className="chips !flex-wrap !overflow-visible mt-3 mb-3">
            <button
              type="button"
              className={`chip ${tab === 'partners' ? 'on' : ''}`}
              onClick={() => setTab('partners')}
            >
              🤝 Banners de Parceiros ({ads.filter((a) => a.active).length})
            </button>
            <button
              type="button"
              className={`chip ${tab === 'adsense' ? 'on' : ''}`}
              onClick={() => setTab('adsense')}
            >
              🌐 Google AdSense {draft.adsense_enabled ? '· Ativo' : ''}
            </button>
          </div>
        )
      )}

      {/* ABA DELEGAÇÃO DE ADM & PERFIL DE VENDAS (EXCLUSIVO PROPRIETÁRIO PRINCIPAL) */}
      {tab === 'team_access' && isPrimaryOwner && (
        <div className="space-y-4 mt-3">
          <div className="panel !border-[var(--ac)]/50 space-y-3">
            <div className="row sp flex-wrap gap-2">
              <div>
                <h2 className="!m-0 text-lg font-extrabold">
                  🔑 Selecionar Conta & Definir Permissões
                </h2>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Escolha qualquer conta cadastrada para liberar acesso ADM personalizado ou Perfil de Vendas com acesso ao simulador.
                </p>
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={() => void refreshDirectory()}
              >
                🔄 Atualizar contas
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className="!mt-0 text-xs">Selecionar conta cadastrada</label>
                <select
                  value={delegateEmail}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (!chosen) {
                      setDelegateEmail('');
                      return;
                    }
                    const foundAcc = organizedAccounts.find(
                      (a) => (a.email || '').trim().toLowerCase() === chosen
                    );
                    loadDelegateIntoEditor(chosen, foundAcc?.display_name || undefined);
                  }}
                >
                  <option value="">— Selecione uma conta ou digite abaixo —</option>
                  {organizedAccounts
                    .filter((a) => a.email && a.email.includes('@') && !isSuperAdmin(a.email))
                    .map((a) => {
                      const em = a.email.trim().toLowerCase();
                      const ex = draft.admin_delegates?.[em];
                      const tag = ex
                        ? ex.preset === 'sales'
                          ? ' [Vendas]'
                          : ' [ADM Delegado]'
                        : '';
                      return (
                        <option key={a.id} value={em}>
                          {a.display_name ? `${a.display_name} (${em})` : em}
                          {tag}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div>
                <label className="!mt-0 text-xs">Ou digitar e-mail da conta *</label>
                <input
                  type="email"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                  placeholder="pessoa@gmail.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="!mt-0 text-xs">Nome / Identificação na equipe (opcional)</label>
                <input
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  placeholder="Ex: Lucas · Consultor Comercial"
                  maxLength={60}
                />
              </div>
              <div>
                <label className="!mt-0 text-xs">Tipo de perfil principal</label>
                <select
                  value={delegatePreset}
                  onChange={(e) => {
                    const nextPreset = e.target.value as PlatformRolePreset;
                    setDelegatePreset(nextPreset);
                    if (nextPreset === 'sales') {
                      setDelegatePerms(buildPresetPermissions('sales'));
                    } else if (nextPreset === 'support') {
                      setDelegatePerms(buildPresetPermissions('support'));
                    }
                  }}
                >
                  <option value="custom_admin">👑 ADM Delegado (painel personalizado)</option>
                  <option value="sales">💼 Perfil de Vendas (Simulador & Apresentação)</option>
                  <option value="support">🎧 Perfil Suporte (Atendimento)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[var(--mut)]">Modelos rápidos de seleção:</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => applyDelegateTemplate('full_admin')}
                >
                  👑 Admin Completo (tudo)
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => applyDelegateTemplate('sales')}
                >
                  💼 Perfil de Vendas (Simulador + Roteiro)
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => applyDelegateTemplate('auditor')}
                >
                  🍸 Auditoria de Receitas & Fotos
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => applyDelegateTemplate('support')}
                >
                  🎧 Suporte & Lojas
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => applyDelegateTemplate('empty')}
                >
                  🧹 Desmarcar tudo
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[var(--bd)]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-extrabold">
                    Permissões detalhadas (o que esta pessoa pode ou não fazer)
                  </div>
                  <div className="text-[11px] text-[var(--mut)]">
                    Marque exatamente cada função exclusiva do ADM que você deseja liberar para esta conta.
                  </div>
                </div>
                <label className="!m-0 flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={delegateActive}
                    onChange={(e) => setDelegateActive(e.target.checked)}
                    className="!w-4 !h-4"
                  />
                  Acesso ativo
                </label>
              </div>

              {(
                [
                  { id: 'gestao', title: 'Gestão de Contas, Lojas & Planos' },
                  { id: 'catalogo', title: 'Catálogo, Auditoria de Receitas & Pesquisa de Fotos' },
                  { id: 'comercial', title: 'Vendas, Simulador Demo & Monetização' },
                  { id: 'suporte', title: 'Atendimento às Lojas' },
                ] as const
              ).map((grp) => {
                const itemsInGroup = PLATFORM_PERMISSIONS_META.filter((p) => p.group === grp.id);
                return (
                  <div key={grp.id} className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--ac)]">
                      {grp.title}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {itemsInGroup.map((perm) => {
                        const checked = Boolean(delegatePerms[perm.key]);
                        return (
                          <button
                            key={perm.key}
                            type="button"
                            onClick={() =>
                              setDelegatePerms((prev) => ({
                                ...prev,
                                [perm.key]: !prev[perm.key],
                              }))
                            }
                            className={`text-left rounded-xl border p-3 flex items-start justify-between gap-2.5 cursor-pointer transition-colors ${
                              checked
                                ? 'border-[var(--ok)]/60 bg-emerald-500/10'
                                : 'border-[var(--bd)] bg-[var(--s2)]/60 hover:border-[var(--ac)]/50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[var(--fg)]">
                                {perm.icon} {perm.label}
                              </div>
                              <div className="text-[11px] text-[var(--mut)] mt-0.5 leading-snug">
                                {perm.description}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                checked
                                  ? 'bg-emerald-500 text-[#09180f] border-emerald-400'
                                  : 'bg-black/25 text-[var(--mut)] border-white/15'
                              }`}
                            >
                              {checked ? 'SIM' : 'NÃO'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="b ok full"
              disabled={savingCfg}
              onClick={() => void handleSaveDelegate()}
            >
              {savingCfg ? 'Salvando permissões...' : '💾 Salvar Acesso & Permissões desta Conta'}
            </button>
          </div>

          <div className="panel space-y-3">
            <h2 className="!m-0 text-lg font-extrabold">
              Contas com Acesso Delegado ({Object.keys(draft.admin_delegates || {}).length})
            </h2>
            {Object.keys(draft.admin_delegates || {}).length === 0 ? (
              <p className="mu text-xs !m-0">
                Nenhuma conta delegada ainda. Selecione uma conta acima para delegar funções ADM ou criar um Perfil de Vendas.
              </p>
            ) : (
              <div className="space-y-2.5">
                {Object.values(draft.admin_delegates || {}).map((del) => {
                  const enabledPerms = PLATFORM_PERMISSIONS_META.filter(
                    (p) => Boolean(del.permissions?.[p.key])
                  );
                  return (
                    <div
                      key={del.email}
                      className="rounded-2xl border border-[var(--bd)] bg-[var(--s2)]/70 p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-[var(--fg)] truncate">
                            {del.preset === 'sales'
                              ? '💼'
                              : del.preset === 'support'
                                ? '🎧'
                                : '👑'}{' '}
                            {del.name || del.email}
                          </div>
                          <div className="text-xs text-[var(--mut)] truncate">{del.email}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`chip !text-[11px] ${del.active ? 'on' : ''}`}
                          >
                            {del.preset === 'sales'
                              ? 'Perfil de Vendas'
                              : del.preset === 'support'
                                ? 'Suporte'
                                : 'ADM Delegado'}
                            {del.active ? ' · Ativo' : ' · Pausado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {enabledPerms.length > 0 ? (
                          enabledPerms.map((p) => (
                            <span
                              key={p.key}
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/25 border border-white/10 text-[var(--fg)]"
                            >
                              {p.icon} {p.label.split(' ')[0]} {p.label.split(' ')[1] || ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-[var(--mut)]">
                            Sem permissões extras marcadas
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[var(--bd)]">
                        <button
                          type="button"
                          className="b sm"
                          onClick={() => {
                            loadDelegateIntoEditor(del.email, del.name);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          ✏️ Editar permissões
                        </button>
                        <button
                          type="button"
                          className="b g sm"
                          disabled={savingCfg}
                          onClick={() => void handleToggleDelegateActive(del.email)}
                        >
                          {del.active ? '⏸️ Pausar acesso' : '▶️ Reativar'}
                        </button>
                        <button
                          type="button"
                          className="b g sm !text-[var(--dn)]"
                          disabled={savingCfg}
                          onClick={() => void handleRemoveDelegate(del.email)}
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA AUDITORIA DE RECEITAS AUTORAIS & IMAGENS (EXCLUSIVO ADM) */}
      {tab === 'recipes_audit' && (
        <div className="space-y-4 mt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setAuditFilter('pending')}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">⏳ Pendentes</div>
              <div className="text-2xl font-extrabold tabular-nums text-amber-400 mt-1">
                {pendingAuditCount}
              </div>
              <div className="text-xs text-[var(--mut)] mt-1">Aguardando revisão</div>
            </button>
            <button
              type="button"
              onClick={() => setAuditFilter('approved_custom')}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ok)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">✦ Autorais publicadas</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--ok)] mt-1">
                {approvedCustomRecipes.length}
              </div>
              <div className="text-xs text-[var(--mut)] mt-1">Com marca do criador</div>
            </button>
            <button
              type="button"
              onClick={() => setAuditFilter('rejected')}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--dn)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">✕ Recusadas</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--dn)] mt-1">
                {rejectedAuditRecipes.length}
              </div>
              <div className="text-xs text-[var(--mut)] mt-1">Mantidas fora do geral</div>
            </button>
            <button
              type="button"
              onClick={() => setAuditFilter('all')}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">🍹 Total catálogo</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{auditRecipes.length}</div>
              <div className="text-xs text-[var(--ac)] font-semibold mt-1">
                {auditRecipes.filter((r) => !r.image_url).length} sem foto
              </div>
            </button>
          </div>

          <div className="panel space-y-3">
            <div className="row sp flex-wrap gap-2">
              <div>
                <h2 className="!m-0 text-lg font-extrabold">Fila de Auditoria & Catálogo</h2>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Leia as receitas autorais enviadas pelos usuários, ajuste foto/marca e autorize ou recuse a publicação global.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => void refreshAuditRecipes()}
                >
                  🔄 Atualizar
                </button>
                {canSearchImages && (
                  <button
                    type="button"
                    className="b sm"
                    onClick={() => setShowCatalogPhotoSearch(true)}
                  >
                    🌐 Buscar fotos no catálogo
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'pending', label: `⏳ Pendentes (${pendingAuditCount})` },
                  { id: 'approved_custom', label: `✦ Autorais publicadas (${approvedCustomRecipes.length})` },
                  { id: 'rejected', label: `✕ Recusadas (${rejectedAuditRecipes.length})` },
                  { id: 'all', label: `Todas (${auditRecipes.length})` },
                ] as { id: typeof auditFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAuditFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                    auditFilter === f.id
                      ? 'bg-[var(--ac)] text-[#120d0c] border-transparent'
                      : 'bg-black/20 text-[var(--mut)] border-white/10 hover:text-[var(--fg)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loadingAuditRecipes ? (
              <p className="mu text-sm mt-2">Carregando receitas para auditoria…</p>
            ) : filteredAuditRecipes.length === 0 ? (
              <p className="mu text-sm mt-2">
                {auditFilter === 'pending'
                  ? 'Nenhuma receita autoral aguardando auditoria no momento.'
                  : 'Nenhuma receita encontrada neste filtro.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAuditRecipes.map((r) => {
                  const status = getRecipeAuditStatus(r);
                  const creator = getRecipeCreatorBrand(r);
                  const ings = normalizeRecipeIngredients(r.ingredients).filter(
                    (i) => !i.n.startsWith('__')
                  );
                  const catIdx = Math.max(0, CATS.indexOf(normalizeRecipeCategory(r.category)));
                  return (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-[var(--bd)] bg-[var(--s2)]/70 p-3.5 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-16 h-16 rounded-xl shrink-0 bg-cover bg-center flex items-center justify-center text-2xl c${catIdx}`}
                          style={r.image_url ? { backgroundImage: `url('${r.image_url}')` } : undefined}
                        >
                          {r.image_url ? null : EMO[catIdx] || '🍸'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-base text-[var(--fg)] truncate">
                              {r.name}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                status === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : status === 'rejected'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {status === 'pending'
                                ? '⏳ Pendente'
                                : status === 'rejected'
                                  ? '✕ Recusado'
                                  : '✓ Publicado'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--mut)] mt-0.5">
                            {normalizeRecipeCategory(r.category)}
                            {creator ? ` · ✦ Marca: ${creator}` : ''}
                          </div>
                          <div className="text-xs text-[var(--tx)] opacity-85 mt-1 line-clamp-2">
                            {ings.map((i) => i.n).join(' · ') || 'Sem ingredientes'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--bd)]">
                        <span className="text-[11px] text-[var(--mut)]">
                          {r.created_at ? fmtDateTime(r.created_at) : 'Catálogo'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {canSearchImages && (
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => setQuickPhotoRecipe(r)}
                            >
                              🌐 Foto
                            </button>
                          )}
                          <button
                            type="button"
                            className={`b sm ${status === 'pending' ? 'ok' : 'g'}`}
                            onClick={() => openRecipeAuditModal(r)}
                          >
                            {status === 'pending' ? '👁️ Ler e Autorizar' : '👁️ Revisar / Foto'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA SIMULADOR DE LOJA FICTÍCIA (EXCLUSIVO ADM) */}
      {tab === 'simulator' && (
        <div className="mt-3">
          <AdminSimulatorView onToast={onToast} />
        </div>
      )}

      {/* ABA SUPORTE DIRETO + EQUIPE DE SUPORTE */}
      {tab === 'support' && (
        <div className="mt-3">
          <SupportDeskView
            userId={userId}
            userEmail={userEmail}
            actorName={actorName}
            config={draft}
            canManageTeam={isPrimaryOwner}
            focusBarId={supportFocus?.barId}
            focusBarName={supportFocus?.barName}
            focusOwnerEmail={supportFocus?.ownerEmail}
            onConfigUpdated={(next) => {
              setDraft(next);
              onConfigUpdated(next);
            }}
            onToast={onToast}
          />
        </div>
      )}

      {/* ABA 1: CONTAS CRIADAS + BARES DE CADA CONTA */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveModal({ kind: 'kpi', topic: 'accounts' })}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">👥 Contas criadas</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{accountStats.total}</div>
              <div className="text-xs text-[var(--ac)] font-semibold mt-1">Ver resumo →</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilter('recent');
                setActiveModal(null);
              }}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ok)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">✨ Novas (7 dias)</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--ok)] mt-1">
                {accountStats.recent}
              </div>
              <div className="text-xs text-[var(--mut)] mt-1">Filtrar recentes</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountFilter('with_bars');
                setActiveModal(null);
              }}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">🏪 Com bar criado</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{accountStats.withBars}</div>
              <div className="text-xs text-[var(--mut)] mt-1">Filtrar com bar</div>
            </button>
            <button
              type="button"
              onClick={() => setActiveModal({ kind: 'kpi', topic: 'vip' })}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">👑 Contas VIP / Pro</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--ac)] mt-1">
                {accountStats.vipOrPro}
              </div>
              <div className="text-xs text-[var(--ac)] font-semibold mt-1">Ver detalhes →</div>
            </button>
          </div>

          {/* Atalho rápido para liberar qualquer e-mail manualmente */}
          {canManageVip && (
            <div className="panel">
              <h2 className="!mt-0">Liberar Pro VIP Grátis por E-mail</h2>
              <p className="mu text-xs">
                Libere o Plano Pro gratuito para qualquer pessoa mesmo antes de ela criar um bar. Todas as lojas dela já nascem Pro e sem anúncios.
              </p>
              <div className="row mt-2">
                <input
                  type="email"
                  value={newVipEmail}
                  onChange={(e) => setNewVipEmail(e.target.value)}
                  placeholder="email.da.pessoa@gmail.com"
                  className="grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleAddVipEmail();
                  }}
                />
                <button
                  type="button"
                  className="b sm shrink-0"
                  disabled={savingCfg}
                  onClick={() => void handleAddVipEmail()}
                >
                  Liberar VIP
                </button>
              </div>
            </div>
          )}

          {canEditGlobalRecipes && (
            <div className="panel row sp flex-wrap gap-2">
              <div className="min-w-[200px] flex-1">
                <h2 className="!m-0">Catálogo Global de Receitas ({EXTENDED_RECIPES.length} drinks)</h2>
                <p className="mu text-xs !mt-1 !mb-0">
                  Atualiza categorias, ingredientes padronizados e histórias dos drinks públicos preservando as fotos já salvas.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="b g sm"
                  onClick={async () => {
                    const sql = buildResetRecipesSql();
                    try {
                      if (!navigator.clipboard?.writeText) throw new Error('no-clipboard');
                      await navigator.clipboard.writeText(sql);
                      onToast(`SQL completo (${EXTENDED_RECIPES.length} receitas) copiado! Cole no SQL Editor do Supabase e clique Run.`);
                    } catch {
                      setSqlModalText(sql);
                    }
                  }}
                >
                  📋 Copiar SQL Reset
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setSqlModalText(buildResetRecipesSql())}
                >
                  👁️ Ver SQL
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => {
                    const sql = buildResetRecipesSql();
                    const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `reset_receitas_${EXTENDED_RECIPES.length}_drinks.sql`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    onToast('Arquivo SQL baixado!');
                  }}
                >
                  📥 Baixar .sql
                </button>
                <button
                  type="button"
                  className="b g sm"
                  disabled={syncingCatalog}
                  onClick={() => void handleSyncCatalog()}
                >
                  {syncingCatalog
                    ? 'Sincronizando…'
                    : `🔄 Sincronizar Catálogo (${EXTENDED_RECIPES.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Diretório organizado de Contas + seus Bares */}
          <div className="panel">
            <div className="row sp flex-wrap gap-2">
              <h2 className="!m-0">Todas as Contas & Bares dos Usuários</h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => void refreshDirectory()}
              >
                Atualizar
              </button>
            </div>

            {(usersErr || storesErr) && (
              <p className="warn-txt text-xs mt-2">
                Execute o arquivo <b>supabase/schema_completo.sql</b> atualizado no SQL Editor do Supabase para listar todas as contas cadastradas (inclusive quem ainda não criou bar) e ativar os alertas automáticos no banco.
              </p>
            )}

            <input
              type="search"
              value={accountQuery}
              onChange={(e) => setAccountQuery(e.target.value)}
              placeholder="Buscar por e-mail, nome da pessoa, cidade ou nome do bar..."
              className="mt-2.5"
            />

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {(
                [
                  { id: 'all', label: `Todas (${accountStats.total})` },
                  { id: 'recent', label: `Novas 7d (${accountStats.recent})` },
                  { id: 'with_bars', label: `Com bar (${accountStats.withBars})` },
                  { id: 'no_bars', label: `Sem bar (${accountStats.noBars})` },
                  { id: 'vip_pro', label: `VIP / Pro (${accountStats.vipOrPro})` },
                ] as { id: AccountFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAccountFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                    accountFilter === f.id
                      ? 'bg-[var(--ac)] text-[#120d0c] border-transparent'
                      : 'bg-black/20 text-[var(--mut)] border-white/10 hover:text-[var(--fg)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {loadingDirectory ? (
              <p className="mu mt-3 text-sm">Carregando contas e bares…</p>
            ) : filteredAccounts.length === 0 ? (
              <p className="mu mt-3 text-sm">Nenhuma conta encontrada com esse filtro.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {filteredAccounts.map((acc) => {
                  const isNewAccount =
                    Boolean(acc.created_at) &&
                    nowMs - new Date(acc.created_at!).getTime() <= 48 * 3600000;
                  const isSelected = activeModal?.kind === 'account' && activeModal.id === acc.id;
                  const delCfg = getDelegateConfig(acc.email, draft);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setActiveModal({ kind: 'account', id: acc.id })}
                      className={`text-left rounded-2xl border p-4 space-y-2.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--ac)] bg-[var(--s2)] ring-1 ring-[var(--ac)]'
                          : 'border-[var(--bd)] bg-[var(--s2)]/70 hover:border-[var(--ac)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-base text-[var(--fg)] truncate">
                            {acc.display_name || (acc.email || '').split('@')[0] || 'Usuário'}
                          </div>
                          <div className="text-sm text-[var(--mut)] truncate mt-0.5">
                            {acc.email}
                          </div>
                        </div>
                        <span
                          className={`chip shrink-0 !text-xs ${
                            acc.isAdmin || acc.isVipEmail || delCfg ? 'on' : ''
                          }`}
                        >
                          {acc.isAdmin
                            ? '👑 Admin'
                            : delCfg
                              ? delCfg.preset === 'sales'
                                ? '💼 Vendas'
                                : delCfg.preset === 'support'
                                  ? '🎧 Suporte'
                                  : '🔑 ADM Delegado'
                              : acc.isVipEmail
                                ? '✨ Pro VIP'
                                : isNewAccount
                                  ? '🆕 Nova'
                                  : 'Conta'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--bd)] text-xs">
                        <span className="font-semibold text-[var(--fg)]">
                          🏪 {acc.ownedBars.length} bar(es) criado(s)
                        </span>
                        <span className="font-bold text-[var(--ac)]">Abrir detalhes →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: TODOS OS BARES (VISÃO POR LOJA EM BLOCOS) */}
      {tab === 'stores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setActiveModal({ kind: 'kpi', topic: 'stores' })}
              className="panel !m-0 !p-4 text-left cursor-pointer hover:border-[var(--ac)] transition-colors"
            >
              <div className="text-xs font-semibold text-[var(--mut)]">🏪 Total de lojas</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{storeStats.total}</div>
              <div className="text-xs text-[var(--ac)] font-semibold mt-1">Ver resumo →</div>
            </button>
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">✅ Pro pagos</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--ok)] mt-1">
                {storeStats.pro}
              </div>
            </div>
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">👑 VIP cortesia</div>
              <div className="text-2xl font-extrabold tabular-nums text-[var(--ac)] mt-1">
                {storeStats.vip}
              </div>
            </div>
            <div className="panel !m-0 !p-4">
              <div className="text-xs font-semibold text-[var(--mut)]">🆓 Trial / Grátis</div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">
                {storeStats.trial} / {storeStats.free}
              </div>
            </div>
          </div>

          <div className="panel !p-4">
            <div className="row sp flex-wrap gap-2">
              <div>
                <h2 className="!m-0 text-lg font-extrabold">Bares cadastrados</h2>
                <p className="mu text-xs !mt-0.5 !mb-0">
                  Toque em qualquer bloco de loja para abrir o painel completo de planos e suporte.
                </p>
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={() => void refreshDirectory()}
              >
                🔄 Atualizar lista
              </button>
            </div>

            <input
              type="search"
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              placeholder="Buscar por nome da loja, @handle, cidade ou e-mail..."
              className="mt-3"
            />

            {loadingDirectory ? (
              <p className="mu mt-3 text-sm">Carregando lojas…</p>
            ) : filteredStores.length === 0 ? (
              <p className="mu mt-3 text-sm">Nenhuma loja encontrada.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {filteredStores.map((st) => {
                  const status = getBarPlanStatus(st, st.owner_email, draft, {
                    ignoreAdminAutoVip: true,
                    ignoreEmailVip: true,
                  });
                  const isSelected = activeModal?.kind === 'store' && activeModal.id === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveModal({ kind: 'store', id: st.id })}
                      className={`text-left rounded-2xl border p-4 space-y-2.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[var(--ac)] bg-[var(--s2)] ring-1 ring-[var(--ac)]'
                          : 'border-[var(--bd)] bg-[var(--s2)]/70 hover:border-[var(--ac)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-base text-[var(--fg)] truncate">
                            🏪 {st.name}
                          </div>
                          <div className="text-sm text-[var(--mut)] truncate mt-0.5">
                            {st.handle ? `@${st.handle}` : st.owner_email || 'Sem @handle'}
                          </div>
                        </div>
                        <span
                          className={`chip shrink-0 !text-xs ${
                            status.effectiveTier === 'vip' || status.effectiveTier === 'pro'
                              ? 'on'
                              : ''
                          }`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--bd)] text-xs">
                        <span className="text-[var(--mut)] truncate">
                          {st.city || 'Sem cidade'}
                          {typeof st.orders_count === 'number'
                            ? ` · ${st.orders_count} pedido(s)`
                            : ''}
                        </span>
                        <span className="font-bold text-[var(--ac)] shrink-0">
                          Gerenciar →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: BANNERS DE PARCEIROS */}
      {tab === 'partners' && (
        <div className="space-y-3">
          <div className="panel">
            <h2 className="!mt-0">
              {editingAdId ? 'Editar Banner de Parceiro' : 'Novo Banner de Parceiro'}
            </h2>
            <p className="mu text-xs">
              Venda espaço direto para distribuidoras de bebidas, fábricas de gelo, fornecedores de insumos ou maquininhas. Exibido apenas em contas no Plano Grátis.
            </p>

            <label>Título do anúncio *</label>
            <input
              value={adTitle}
              onChange={(e) => setAdTitle(e.target.value)}
              placeholder="Ex: Distribuidora Sul — Gin e Energéticos no Atacado"
              maxLength={90}
            />

            <label>Subtítulo / Oferta (opcional)</label>
            <input
              value={adSubtitle}
              onChange={(e) => setAdSubtitle(e.target.value)}
              placeholder="Ex: Entrega no mesmo dia para bares cadastrados · 10% OFF no 1º pedido"
              maxLength={120}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label>Link de destino (WhatsApp ou site)</label>
                <input
                  value={adUrl}
                  onChange={(e) => setAdUrl(e.target.value)}
                  placeholder="https://wa.me/55..."
                />
              </div>
              <div>
                <label>Texto do botão (CTA)</label>
                <input
                  value={adCta}
                  onChange={(e) => setAdCta(e.target.value)}
                  placeholder="Ex: Pedir cotação"
                  maxLength={24}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label>Onde exibir</label>
                <select
                  value={adPlacement}
                  onChange={(e) => setAdPlacement(e.target.value as PartnerAdPlacement)}
                >
                  {(Object.keys(PLACEMENT_LABELS) as PartnerAdPlacement[]).map((k) => (
                    <option key={k} value={k}>
                      {PLACEMENT_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Selo discreto</label>
                <input
                  value={adBadge}
                  onChange={(e) => setAdBadge(e.target.value)}
                  placeholder="Ex: Fornecedor"
                  maxLength={24}
                />
              </div>
              <div>
                <label>Prioridade (0 a 100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={adPriority}
                  onChange={(e) => setAdPriority(e.target.value)}
                />
              </div>
            </div>

            <div className="row mt-2">
              <label className="!m-0">Cor do botão</label>
              <input
                type="color"
                value={adAccent}
                onChange={(e) => setAdAccent(e.target.value)}
                className="!w-12 !h-9 !p-1"
              />
            </div>

            <ImageUploader
              label="Imagem / Logo do parceiro (quadrada ou horizontal)"
              value={adImage}
              folder="partner-ads"
              entityId={editingAdId ? `ad-${editingAdId}` : undefined}
              imagePreset="banner"
              userId={userId}
              onChange={setAdImage}
              onToast={onToast}
            />

            <div className="row mt-3">
              <button
                type="button"
                className="b grow"
                disabled={savingAd}
                onClick={() => void handleSaveAd()}
              >
                {savingAd
                  ? 'Salvando...'
                  : editingAdId
                    ? 'Atualizar banner'
                    : 'Publicar banner de parceiro'}
              </button>
              {editingAdId && (
                <button type="button" className="b g" onClick={resetAdForm}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="panel">
            <h2 className="!mt-0">Banners cadastrados ({ads.length})</h2>
            {adsLoading ? (
              <p className="mu text-xs">Carregando banners…</p>
            ) : ads.length === 0 ? (
              <p className="mu text-xs">
                Nenhum banner de parceiro cadastrado ainda. Crie o primeiro acima!
              </p>
            ) : (
              <div className="space-y-2.5 mt-2">
                {ads.map((ad) => {
                  const views = Number(ad.impressions || 0);
                  const clicks = Number(ad.clicks || 0);
                  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0';
                  return (
                    <div
                      key={ad.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[var(--fg)]">
                            {ad.title}
                          </div>
                          <div className="text-xs text-[var(--mut)] mt-0.5">
                            {PLACEMENT_LABELS[ad.placement] || ad.placement} ·{' '}
                            {ad.active ? 'Ativo' : 'Pausado'} · Prioridade {ad.priority ?? 10}
                          </div>
                          <div className="text-xs text-[var(--ok)] tabular-nums mt-1">
                            {views} visualizações · {clicks} cliques · CTR {ctr}%
                          </div>
                        </div>
                        {ad.image_url && (
                          <img
                            src={ad.image_url}
                            alt={ad.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="b g sm"
                          onClick={() => handleEditAd(ad)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="b g sm"
                          onClick={() => void handleToggleAd(ad)}
                        >
                          {ad.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="b g sm"
                          onClick={() => void handleDeleteAd(ad.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: GOOGLE ADSENSE */}
      {tab === 'adsense' && (
        <div className="space-y-3">
          <div className="panel">
            <h2 className="!mt-0">Configuração do Google AdSense (PWA / Web)</h2>
            <p className="mu text-xs">
              Os blocos do AdSense aparecem somente em contas no Plano Grátis e nunca interrompem Garçom, Barman, Cozinha ou Caixa.
            </p>

            <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.adsense_enabled}
                onChange={(e) =>
                  setDraft({ ...draft, adsense_enabled: e.target.checked })
                }
                className="!w-4 !h-4"
              />
              <span className="text-sm font-semibold text-[var(--fg)]">
                Ativar anúncios Google AdSense na versão Grátis
              </span>
            </label>

            <label>Publisher ID (Código do editor AdSense)</label>
            <input
              value={draft.adsense_client_id}
              onChange={(e) =>
                setDraft({ ...draft, adsense_client_id: e.target.value.trim() })
              }
              placeholder="ca-pub-1234567890123456"
            />
            {draft.adsense_client_id && !isValidAdSenseClient(draft.adsense_client_id) && (
              <p className="err text-xs mt-1">
                Formato esperado: ca-pub- seguido de 10 a 20 números.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
              <div>
                <label>Slot ID — Painel Admin</label>
                <input
                  value={draft.adsense_slot_panel}
                  onChange={(e) =>
                    setDraft({ ...draft, adsense_slot_panel: e.target.value.trim() })
                  }
                  placeholder="Ex: 4829103847"
                />
                {draft.adsense_slot_panel && !isValidAdSenseSlot(draft.adsense_slot_panel) && (
                  <p className="err text-xs mt-1">Use apenas números (6 a 16 dígitos).</p>
                )}
              </div>
              <div>
                <label>Slot ID — Login / Lojas</label>
                <input
                  value={draft.adsense_slot_explore}
                  onChange={(e) =>
                    setDraft({ ...draft, adsense_slot_explore: e.target.value.trim() })
                  }
                  placeholder="Ex: 9182736455"
                />
              </div>
              <div>
                <label>Slot ID — Rodapé Cardápio Grátis</label>
                <input
                  value={draft.adsense_slot_menu_free}
                  onChange={(e) =>
                    setDraft({ ...draft, adsense_slot_menu_free: e.target.value.trim() })
                  }
                  placeholder="Ex: 5564738291"
                />
              </div>
            </div>

            <label>Ordem de exibição (Parceiros vs AdSense)</label>
            <select
              value={draft.ads_rotation_mode}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  ads_rotation_mode: e.target.value as PlatformSaaSConfig['ads_rotation_mode'],
                })
              }
            >
              <option value="partner_first">
                Parceiros primeiro (AdSense entra quando não há parceiro)
              </option>
              <option value="rotate">Alternar 50% Parceiros / 50% AdSense</option>
              <option value="adsense_first">AdSense primeiro</option>
            </select>

            <button
              type="button"
              className="b full mt-4"
              disabled={savingCfg}
              onClick={() => void handleSaveConfig(draft, 'Configuração do AdSense salva!')}
            >
              {savingCfg ? 'Salvando...' : 'Salvar configuração do AdSense'}
            </button>
          </div>

          <div className="panel">
            <h2 className="!mt-0">Linha ads.txt pronta para o seu domínio</h2>
            <p className="mu text-xs">
              Ao publicar o app no seu domínio próprio (ex: <b>app.seumeubar.com.br</b>), coloque um arquivo chamado <b>ads.txt</b> na raiz com a linha abaixo para o Google autorizar seus pagamentos:
            </p>
            <div className="rounded-xl bg-black/30 border border-white/10 p-2.5 text-xs font-mono break-all mt-2">
              {adsTxtLine}
            </div>
            <button
              type="button"
              className="b g sm mt-2"
              onClick={() => {
                void navigator.clipboard?.writeText(adsTxtLine);
                onToast('Linha ads.txt copiada!');
              }}
            >
              Copiar linha ads.txt
            </button>
          </div>
        </div>
      )}

      {/* ABA 5: PREÇOS & VENDAS */}
      {tab === 'sales' && (
        <div className="panel space-y-2">
          <h2 className="!mt-0">Preços, Trial & Links de Venda</h2>
          <p className="mu text-xs">
            Defina o valor exibido na tela de Upgrade, dias de teste grátis e o link de pagamento (Asaas, Kiwify, Mercado Pago, Stripe) ou WhatsApp comercial.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label>Preço Mensal Pro (R$)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={draft.pro_price_monthly}
                onChange={(e) =>
                  setDraft({ ...draft, pro_price_monthly: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <label>Preço Anual Pro (R$)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={draft.pro_price_yearly}
                onChange={(e) =>
                  setDraft({ ...draft, pro_price_yearly: Number(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label>Dias de Teste Pro grátis (Trial)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={draft.trial_days}
                onChange={(e) =>
                  setDraft({ ...draft, trial_days: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
              />
            </div>
            <div>
              <label>Limite de mesas no Plano Grátis</label>
              <input
                type="number"
                min="1"
                max="50"
                value={draft.free_max_tables}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    free_max_tables: Math.max(1, parseInt(e.target.value, 10) || 5),
                  })
                }
              />
            </div>
          </div>

          <label>WhatsApp Comercial / Suporte (DDD + número)</label>
          <input
            value={draft.support_whatsapp}
            onChange={(e) => setDraft({ ...draft, support_whatsapp: e.target.value })}
            placeholder="Ex: 61999998888"
          />

          <label>Link de Checkout Mensal (opcional — Asaas / Kiwify / Mercado Pago)</label>
          <input
            value={draft.checkout_monthly_url}
            onChange={(e) => setDraft({ ...draft, checkout_monthly_url: e.target.value })}
            placeholder="https://..."
          />

          <label>Link de Checkout Anual (opcional)</label>
          <input
            value={draft.checkout_yearly_url}
            onChange={(e) => setDraft({ ...draft, checkout_yearly_url: e.target.value })}
            placeholder="https://..."
          />

          <div className="pt-2 text-xs text-[var(--mut)]">
            Prévia atual: Mensal {money(draft.pro_price_monthly)} · Anual {money(draft.pro_price_yearly)} · Trial {draft.trial_days} dias.
          </div>

          <button
            type="button"
            className="b full mt-2"
            disabled={savingCfg}
            onClick={() => void handleSaveConfig(draft, 'Preços e links comerciais salvos!')}
          >
            {savingCfg ? 'Salvando...' : 'Salvar configurações comerciais'}
          </button>
        </div>
      )}

      {/* MODAL EXCLUSIVO DE DETALHES (ao abrir outro fecha o anterior; clicar fora fecha todos) */}
      {activeModal && (
        <div className="ov" onClick={() => setActiveModal(null)}>
          <div
            className="modal !max-w-2xl !w-full max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {activeModal.kind === 'account' &&
              (() => {
                const acc = filteredAccounts.find((a) => a.id === activeModal.id);
                if (!acc) return null;
                const canToggleEmail = Boolean(
                  acc.email && acc.email.includes('@') && !acc.isAdmin
                );
                return (
                  <>
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--bd)]">
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                          👤 Detalhes da Conta
                        </span>
                        <h3 className="!m-0 text-xl font-extrabold mt-0.5">
                          {acc.display_name || (acc.email || '').split('@')[0] || 'Usuário'}
                        </h3>
                        <div className="text-sm text-[var(--mut)] break-all mt-0.5">
                          {acc.email}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="b g sm shrink-0"
                        onClick={() => setActiveModal(null)}
                      >
                        ✕ Fechar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Criada em</div>
                        <div className="text-sm font-bold mt-0.5 tabular-nums">
                          {fmtDateTime(acc.created_at)}
                        </div>
                      </div>
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Último acesso</div>
                        <div className="text-sm font-bold mt-0.5 tabular-nums">
                          {acc.last_sign_in_at ? fmtDateTime(acc.last_sign_in_at) : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Status da conta</div>
                        <div className="text-sm font-bold mt-0.5 text-[var(--ac)]">
                          {acc.isAdmin ? '👑 Super Admin' : acc.isVipEmail ? '✨ Pro VIP' : 'Padrão'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canToggleEmail && canManageVip && (
                        <button
                          type="button"
                          className={`b flex-1 ${acc.isVipEmail ? 'g' : 'ok'}`}
                          disabled={savingCfg}
                          onClick={() => void handleToggleEmailVip(acc.email, !acc.isVipEmail)}
                        >
                          {acc.isVipEmail
                            ? 'Remover Pro VIP desta conta'
                            : '👑 Liberar Pro VIP Grátis para esta conta'}
                        </button>
                      )}
                      {isPrimaryOwner && canToggleEmail && (
                        <button
                          type="button"
                          className="b g flex-1 !border-[var(--ac)]/60 text-[var(--ac)]"
                          onClick={() => {
                            loadDelegateIntoEditor(acc.email, acc.display_name || undefined);
                            setActiveModal(null);
                            setTab('team_access');
                          }}
                        >
                          🔑 Delegar ADM / Perfil de Vendas
                        </button>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[var(--bd)]">
                      <h4 className="!m-0 text-base font-bold">
                        🏪 Bares desta conta ({acc.ownedBars.length})
                      </h4>
                      {acc.ownedBars.length === 0 ? (
                        <p className="mu text-sm !m-0">
                          Nenhum bar criado por esta conta ainda
                          {acc.member_bars_count && acc.member_bars_count > 0
                            ? ` (atua como equipe em ${acc.member_bars_count} bar(es))`
                            : '.'}
                        </p>
                      ) : (
                        acc.ownedBars.map((b) => {
                          const barOwnStatus = getBarPlanStatus(b, acc.email, draft, {
                            ignoreAdminAutoVip: true,
                            ignoreEmailVip: true,
                          });
                          const isBusy = busyBarId === b.id;
                          const isVip = barOwnStatus.effectiveTier === 'vip';
                          const isPro30 =
                            barOwnStatus.effectiveTier === 'pro' &&
                            (barOwnStatus.daysLeft ?? 0) <= 60;
                          const isProYear =
                            barOwnStatus.effectiveTier === 'pro' &&
                            (barOwnStatus.daysLeft ?? 0) > 60;
                          const isFree = barOwnStatus.effectiveTier === 'free';
                          return (
                            <div
                              key={b.id}
                              className="rounded-2xl p-4 border border-[var(--bd)] bg-[var(--s2)] space-y-3"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="font-extrabold text-base">
                                    {b.name}{' '}
                                    {b.handle && (
                                      <span className="text-sm font-normal text-[var(--mut)]">
                                        @{b.handle}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-[var(--mut)] mt-0.5">
                                    {b.city || 'Sem cidade'}
                                    {typeof b.orders_count === 'number'
                                      ? ` · ${b.orders_count} pedido(s)`
                                      : ''}
                                    {typeof b.items_count === 'number'
                                      ? ` · ${b.items_count} item(ns) no estoque`
                                      : ''}
                                  </div>
                                </div>
                                <span className="chip on !text-xs">
                                  {barOwnStatus.label}
                                  {barOwnStatus.expiresAt && barOwnStatus.effectiveTier === 'pro'
                                    ? ` · até ${new Date(barOwnStatus.expiresAt).toLocaleDateString('pt-BR')}`
                                    : ''}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {canManageVip && (
                                  <>
                                    <button
                                      type="button"
                                      className={`b sm ${isVip ? '' : 'g'}`}
                                      disabled={isBusy}
                                      onClick={() => void handleSetPlan(b.id, 'vip', null)}
                                    >
                                      {isVip ? '✓ Bar VIP' : 'Bar VIP'}
                                    </button>
                                    <button
                                      type="button"
                                      className={`b sm ${isPro30 ? 'ok' : 'g'}`}
                                      disabled={isBusy}
                                      onClick={() => void handleSetPlan(b.id, 'pro', 30)}
                                    >
                                      {isPro30 ? '✓ Pro +30d' : 'Pro +30d'}
                                    </button>
                                    <button
                                      type="button"
                                      className={`b sm ${isProYear ? 'ok' : 'g'}`}
                                      disabled={isBusy}
                                      onClick={() => void handleSetPlan(b.id, 'pro', 365)}
                                    >
                                      {isProYear ? '✓ Pro +1 ano' : 'Pro +1 ano'}
                                    </button>
                                    <button
                                      type="button"
                                      className={`b sm ${isFree ? '' : 'g'}`}
                                      disabled={isBusy}
                                      onClick={() => void handleSetPlan(b.id, 'free', null)}
                                    >
                                      {isFree ? '✓ Grátis' : 'Grátis'}
                                    </button>
                                  </>
                                )}
                                {canSupport && (
                                  <button
                                    type="button"
                                    className="b g sm"
                                    onClick={() => {
                                      setActiveModal(null);
                                      openChatWithBar(b.id, b.name, acc.email);
                                    }}
                                  >
                                    💬 Abrir Chat
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}

            {activeModal.kind === 'store' &&
              (() => {
                const st = stores.find((s) => s.id === activeModal.id);
                if (!st) return null;
                const status = getBarPlanStatus(st, st.owner_email, draft, {
                  ignoreAdminAutoVip: true,
                  ignoreEmailVip: true,
                });
                const isBusy = busyBarId === st.id;
                const isVip = status.effectiveTier === 'vip';
                const isPro30 = status.effectiveTier === 'pro' && (status.daysLeft ?? 0) <= 60;
                const isProYear = status.effectiveTier === 'pro' && (status.daysLeft ?? 0) > 60;
                const isFree = status.effectiveTier === 'free';
                return (
                  <>
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--bd)]">
                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                          🏪 Gestão da Loja
                        </span>
                        <h3 className="!m-0 text-xl font-extrabold mt-0.5">
                          {st.name}
                          {st.handle ? (
                            <span className="text-sm font-normal text-[var(--mut)]">
                              {' '}
                              @{st.handle}
                            </span>
                          ) : null}
                        </h3>
                        <div className="text-sm text-[var(--mut)] mt-0.5">
                          {st.owner_email || `Dono (ID ${st.owner.slice(0, 8)})`}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="b g sm shrink-0"
                        onClick={() => setActiveModal(null)}
                      >
                        ✕ Fechar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Plano atual</div>
                        <div className="text-base font-extrabold text-[var(--ac)] mt-0.5">
                          {status.label}
                        </div>
                        {status.expiresAt && status.effectiveTier === 'pro' && (
                          <div className="text-xs text-[var(--mut)] mt-0.5">
                            Até {new Date(status.expiresAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Cidade</div>
                        <div className="text-base font-bold mt-0.5">
                          {st.city || 'Não informada'}
                        </div>
                      </div>
                      <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)]">
                        <div className="text-xs text-[var(--mut)]">Pedidos registrados</div>
                        <div className="text-base font-extrabold mt-0.5 tabular-nums">
                          {typeof st.orders_count === 'number' ? st.orders_count : 0}
                        </div>
                      </div>
                    </div>

                    {canManageVip && (
                      <>
                        <div>
                          <label className="!mt-0 text-sm">Observação interna da assinatura</label>
                          <input
                            value={noteByBar[st.id] ?? st.plan_note ?? ''}
                            onChange={(e) =>
                              setNoteByBar((prev) => ({ ...prev, [st.id]: e.target.value }))
                            }
                            placeholder="Ex: Pago Pix, Amigo VIP, Parceiro..."
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-bold">Alterar plano desta loja</div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                              type="button"
                              className={`b sm ${isVip ? '' : 'g'}`}
                              disabled={isBusy}
                              onClick={() => void handleSetPlan(st.id, 'vip', null)}
                            >
                              {isVip ? '✓ VIP Ativo' : 'Liberar VIP'}
                            </button>
                            <button
                              type="button"
                              className={`b sm ${isPro30 ? 'ok' : 'g'}`}
                              disabled={isBusy}
                              onClick={() => void handleSetPlan(st.id, 'pro', 30)}
                            >
                              {isPro30 ? '✓ Pro +30d' : 'Pro +30d'}
                            </button>
                            <button
                              type="button"
                              className={`b sm ${isProYear ? 'ok' : 'g'}`}
                              disabled={isBusy}
                              onClick={() => void handleSetPlan(st.id, 'pro', 365)}
                            >
                              {isProYear ? '✓ Pro +1 ano' : 'Pro +1 ano'}
                            </button>
                            <button
                              type="button"
                              className={`b sm ${isFree ? '' : 'g'}`}
                              disabled={isBusy}
                              onClick={() => void handleSetPlan(st.id, 'free', null)}
                            >
                              {isFree ? '✓ Grátis' : 'Voltar Grátis'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-2 border-t border-[var(--bd)] flex justify-between gap-2 flex-wrap">
                      {canSupport && (
                        <button
                          type="button"
                          className="b g"
                          onClick={() => {
                            setActiveModal(null);
                            openChatWithBar(st.id, st.name, st.owner_email);
                          }}
                        >
                          💬 Abrir Chat de Suporte com esta Loja
                        </button>
                      )}
                      <button
                        type="button"
                        className="b"
                        onClick={() => setActiveModal(null)}
                      >
                        Concluir
                      </button>
                    </div>
                  </>
                );
              })()}

            {activeModal.kind === 'kpi' && (
              <>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--bd)]">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                      📊 Visão Geral da Plataforma
                    </span>
                    <h3 className="!m-0 text-xl font-extrabold mt-0.5">
                      {activeModal.topic === 'stores'
                        ? 'Distribuição de Lojas'
                        : activeModal.topic === 'vip'
                          ? 'Contas VIP & Pro'
                          : 'Resumo das Contas Cadastradas'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => setActiveModal(null)}
                  >
                    ✕ Fechar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Total de contas</div>
                    <div className="text-2xl font-extrabold mt-1">{accountStats.total}</div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Novas nos últimos 7 dias</div>
                    <div className="text-2xl font-extrabold text-[var(--ok)] mt-1">
                      {accountStats.recent}
                    </div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Lojas Pro / VIP</div>
                    <div className="text-2xl font-extrabold text-[var(--ac)] mt-1">
                      {storeStats.pro} Pro · {storeStats.vip} VIP
                    </div>
                  </div>
                  <div className="rounded-xl p-4 bg-[var(--s2)] border border-[var(--bd)]">
                    <div className="text-xs text-[var(--mut)]">Lojas Trial / Grátis</div>
                    <div className="text-2xl font-extrabold mt-1">
                      {storeStats.trial} Trial · {storeStats.free} Grátis
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {sqlModalText !== null && (
        <div className="ov" onClick={() => setSqlModalText(null)}>
          <div className="modal !max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="row sp items-center mb-2">
              <h3 className="!m-0">SQL Completo ({EXTENDED_RECIPES.length} drinks)</h3>
              <button
                type="button"
                className="b g sm"
                onClick={() => setSqlModalText(null)}
              >
                ✕ Fechar
              </button>
            </div>
            <p className="mu text-xs mb-2">
              Já inclui desativação temporária de triggers (<code>orders_guard</code>) na transação para rodar sem erro no SQL Editor do Supabase.
            </p>
            <textarea
              readOnly
              value={sqlModalText}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full h-64 font-mono text-[11px] leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                className="b ok sm flex-1"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(sqlModalText);
                    onToast('SQL copiado! Cole no SQL Editor do Supabase e clique Run.');
                  } catch {
                    onToast('Selecione o texto acima (Ctrl+A / Ctrl+C) ou clique em Baixar .sql.');
                  }
                }}
              >
                📋 Copiar SQL
              </button>
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  const blob = new Blob([sqlModalText], { type: 'application/sql;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `reset_receitas_${EXTENDED_RECIPES.length}_drinks.sql`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  onToast('Arquivo SQL baixado!');
                }}
              >
                📥 Baixar .sql
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LEITURA E AUDITORIA DE RECEITA AUTORAL (EXCLUSIVO ADM) */}
      {reviewRecipe && (
        <div className="ov" onClick={() => !auditingBusy && setReviewRecipe(null)}>
          <div
            className="modal !max-w-2xl !w-full max-h-[88vh] overflow-y-auto space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--bd)]">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                  🍸 Auditoria de Receita Autoral
                </span>
                <h3 className="!m-0 text-xl font-extrabold mt-0.5">{reviewRecipe.name}</h3>
                <div className="text-xs text-[var(--mut)] mt-0.5">
                  {normalizeRecipeCategory(reviewRecipe.category)}
                  {reviewRecipe.glass ? ` · ${reviewRecipe.glass}` : ''}
                  {reviewRecipe.technique ? ` · ${reviewRecipe.technique}` : ''}
                  {reviewRecipe.garnish ? ` · Guarnição: ${reviewRecipe.garnish}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="b g sm shrink-0"
                disabled={auditingBusy}
                onClick={() => setReviewRecipe(null)}
              >
                ✕ Fechar
              </button>
            </div>

            {reviewRecipe.description && (
              <p className="text-sm text-[var(--fg)] !m-0">{reviewRecipe.description}</p>
            )}

            <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                Ingredientes
              </div>
              {normalizeRecipeIngredients(reviewRecipe.ingredients)
                .filter((i) => !i.n.startsWith('__'))
                .map((ing, idx) => (
                  <div
                    key={`${ing.n}-${idx}`}
                    className="flex items-center justify-between text-xs py-1 border-b border-[var(--bd)] last:border-b-0"
                  >
                    <span className="font-semibold">{ing.n}</span>
                    <span className="text-[var(--mut)]">{ing.q || 'a gosto'}</span>
                  </div>
                ))}
            </div>

            {(reviewRecipe.instructions || reviewRecipe.steps) && (
              <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                  Modo de preparo
                </div>
                <p className="text-xs whitespace-pre-line text-[var(--fg)] !m-0">
                  {reviewRecipe.instructions || reviewRecipe.steps}
                </p>
              </div>
            )}

            {reviewRecipe.story && (
              <div className="rounded-xl p-3 bg-[var(--s2)] border border-[var(--bd)] space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--mut)]">
                  História do drink
                </div>
                <p className="text-xs text-[var(--mut)] !m-0">{reviewRecipe.story}</p>
              </div>
            )}

            <div className="panel space-y-2.5 !border-[var(--ac)]/40">
              {canAuditRecipes && (
                <div>
                  <label className="!mt-0 text-xs font-bold">
                    Nome / Marca do criador dentro do drink publicado *
                  </label>
                  <input
                    value={reviewBrand}
                    onChange={(e) => setReviewBrand(e.target.value)}
                    placeholder="Ex: Lucas Mixology · Bar do Centro"
                    maxLength={60}
                  />
                  <p className="mu text-[11px] mt-1 !mb-0">
                    Ao autorizar, o drink aparecerá para todos os bares com a assinatura:{' '}
                    <b>✦ Criação de {reviewBrand.trim() || '...'}</b>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {reviewImage ? (
                  <img
                    src={reviewImage}
                    alt={reviewRecipe.name}
                    className="w-16 h-16 rounded-xl object-cover border border-[var(--bd)] shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[var(--s2)] border border-[var(--bd)] flex items-center justify-center text-2xl shrink-0">
                    🍸
                  </div>
                )}
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <div className="text-xs font-bold">Foto oficial do drink (equipe autorizada)</div>
                  <div className="flex flex-wrap gap-2">
                    {(canSearchImages || canAuditRecipes || canEditGlobalRecipes) && (
                      <>
                        <button
                          type="button"
                          className="b g sm"
                          disabled={uploadingReviewPhoto}
                          onClick={() => reviewPhotoInputRef.current?.click()}
                        >
                          {uploadingReviewPhoto ? 'Otimizando…' : '📷 Enviar do aparelho'}
                        </button>
                        <input
                          ref={reviewPhotoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file || !reviewRecipe) return;
                            setUploadingReviewPhoto(true);
                            try {
                              if (getRecipeAuditStatus(reviewRecipe) === 'approved') {
                                const res = await uploadAndSaveRecipePhoto(reviewRecipe, file, userId);
                                if (!res.ok) {
                                  onToast(res.error);
                                  return;
                                }
                                setReviewImage(res.url);
                                setReviewRecipe(res.recipe);
                                setAuditRecipes((prev) =>
                                  prev.map((r) => (r.id === res.recipe.id ? res.recipe : r))
                                );
                                onRecipeUpdated?.(res.recipe);
                                onToast(`✓ Foto de "${res.recipe.name}" salva para todas as lojas!`);
                              } else {
                                const up = await uploadMediaFile(file, 'recipes', userId, {
                                  preset: 'recipe',
                                  bucket: RECIPE_BUCKET,
                                  entityId: `drink-${reviewRecipe.id}`,
                                });
                                if (up.error || !up.url) {
                                  onToast(up.error || 'Erro ao enviar foto.');
                                  return;
                                }
                                setReviewImage(up.url);
                                onToast('Foto otimizada! Clique em Autorizar para publicar.');
                              }
                            } finally {
                              setUploadingReviewPhoto(false);
                            }
                          }}
                        />
                      </>
                    )}
                    {canSearchImages && (
                      <button
                        type="button"
                        className="b sm"
                        onClick={() => setShowReviewPhotoSearch(true)}
                      >
                        🌐 {reviewImage ? 'Trocar foto (Internet)' : 'Buscar foto na Internet'}
                      </button>
                    )}
                    {(canSearchImages || canAuditRecipes) && reviewImage && (
                      <button
                        type="button"
                        className="b g sm"
                        onClick={() => setReviewImage('')}
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {canAuditRecipes && (
                <div>
                  <label className="!mt-0 text-xs">
                    Mensagem para o criador (opcional — enviada na notificação)
                  </label>
                  <input
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Ex: Ótima criação! / Ajuste as medidas e reenvie."
                    maxLength={140}
                  />
                </div>
              )}
            </div>

            {canAuditRecipes && getRecipeAuditStatus(reviewRecipe) === 'approved' ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="b ok flex-1 min-w-[200px]"
                  disabled={auditingBusy}
                  onClick={async () => {
                    if (!reviewRecipe) return;
                    setAuditingBusy(true);
                    const res = await saveRecipeImageGlobally(reviewRecipe, reviewImage.trim() || null);
                    setAuditingBusy(false);
                    if (!res.ok) {
                      onToast(res.error);
                      return;
                    }
                    setAuditRecipes((prev) =>
                      prev.map((r) => (r.id === res.recipe.id ? res.recipe : r))
                    );
                    onRecipeUpdated?.(res.recipe);
                    onToast(`✓ Foto de "${res.recipe.name}" atualizada para todas as lojas!`);
                    setReviewRecipe(null);
                  }}
                >
                  {auditingBusy ? 'Salvando foto…' : '💾 Salvar foto no catálogo global'}
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setReviewRecipe(null)}
                >
                  Fechar
                </button>
              </div>
            ) : canAuditRecipes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  className="b ok"
                  disabled={auditingBusy}
                  onClick={() => void handleAuditDecision('approved')}
                >
                  {auditingBusy ? 'Processando…' : '✓ Autorizar, Publicar e Notificar Criador'}
                </button>
                <button
                  type="button"
                  className="b g !border-[var(--dn)]/50 !text-[var(--dn)]"
                  disabled={auditingBusy}
                  onClick={() => void handleAuditDecision('rejected')}
                >
                  ✕ Recusar publicação pública
                </button>
              </div>
            ) : (
              canSearchImages && (
                <button
                  type="button"
                  className="b ok full"
                  disabled={auditingBusy}
                  onClick={async () => {
                    if (!reviewRecipe) return;
                    setAuditingBusy(true);
                    const res = await saveRecipeImageGlobally(reviewRecipe, reviewImage.trim() || null);
                    setAuditingBusy(false);
                    if (!res.ok) {
                      onToast(res.error);
                      return;
                    }
                    setAuditRecipes((prev) =>
                      prev.map((r) => (r.id === res.recipe.id ? res.recipe : r))
                    );
                    onRecipeUpdated?.(res.recipe);
                    onToast('Foto oficial atualizada para todas as lojas!');
                    setReviewRecipe(null);
                  }}
                >
                  {auditingBusy ? 'Salvando foto…' : '✓ Salvar foto do drink'}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {canSearchImages && showReviewPhotoSearch && reviewRecipe && (
        <DrinkImageSearchModal
          mode="single"
          initialRecipe={getRecipeAuditStatus(reviewRecipe) === 'approved' ? reviewRecipe : null}
          initialQuery={reviewRecipe.name}
          userId={userId}
          onSelectUrl={(url) => setReviewImage(url)}
          onRecipeUpdated={(updated) => {
            setReviewImage(updated.image_url || '');
            setReviewRecipe(updated);
            setAuditRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            onRecipeUpdated?.(updated);
          }}
          onClose={() => setShowReviewPhotoSearch(false)}
          onToast={onToast}
        />
      )}

      {canSearchImages && quickPhotoRecipe && (
        <DrinkImageSearchModal
          mode="single"
          initialRecipe={quickPhotoRecipe}
          initialQuery={quickPhotoRecipe.name}
          userId={userId}
          onRecipeUpdated={(updated) => {
            setAuditRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            onRecipeUpdated?.(updated);
          }}
          onClose={() => setQuickPhotoRecipe(null)}
          onToast={onToast}
        />
      )}

      {canSearchImages && showCatalogPhotoSearch && (
        <DrinkImageSearchModal
          mode="catalog"
          recipes={auditRecipes}
          userId={userId}
          onRecipeUpdated={(updated) => {
            setAuditRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            onRecipeUpdated?.(updated);
          }}
          onClose={() => setShowCatalogPhotoSearch(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
};
