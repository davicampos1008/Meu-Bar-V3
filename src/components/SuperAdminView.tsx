import React, { useEffect, useMemo, useState } from 'react';
import { useAlertPrefs } from '../lib/alertPrefs';
import {
  adminListAllBars,
  adminListUsers,
  adminUpdateBarPlan,
  buildAdsTxtLine,
  getBarPlanStatus,
  isSuperAdmin,
  isValidAdSenseClient,
  isValidAdSenseSlot,
  loadPartnerAds,
  sanitizeHttpUrl,
  savePlatformConfig,
} from '../lib/saas';
import { sb } from '../lib/supabase';
import { money } from '../lib/utils';
import type {
  AdminAlertItem,
  AdminBarOverview,
  AdminUserAccount,
  BarPlanTier,
  PartnerAdBanner,
  PartnerAdPlacement,
  PlatformSaaSConfig,
} from '../types/meubar';
import { AdminSimulatorView } from './AdminSimulatorView';
import { ImageUploader } from './SharedUI';
import { SupportDeskView } from './SupportChatView';

export type AdminTab = 'accounts' | 'stores' | 'support' | 'simulator' | 'partners' | 'adsense' | 'sales';
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
  onBack,
  onToast,
}) => {
  const { prefs: alertPrefs, setPref: setAlertPref, patchPrefs: patchAlertPrefs } = useAlertPrefs();
  const adminAlertOn = alertPrefs.allEnabled && alertPrefs.adminNewAccount;
  const [internalTab, setInternalTab] = useState<AdminTab>(controlledTab || 'accounts');
  const [supportFocus, setSupportFocus] = useState<{
    barId: string;
    barName: string;
    ownerEmail?: string | null;
  } | null>(null);

  const tab: AdminTab = controlledTab ?? internalTab;
  const setTab = (next: AdminTab) => {
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

  // Config global (AdSense + Preços)
  const [draft, setDraft] = useState<PlatformSaaSConfig>(config);
  const [savingCfg, setSavingCfg] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const refreshDirectory = async () => {
    setLoadingDirectory(true);
    setStoresErr('');
    setUsersErr('');
    const [storesRes, usersRes] = await Promise.all([adminListAllBars(), adminListUsers()]);
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

  useEffect(() => {
    void refreshDirectory();
    void refreshAds();
  }, []);

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

  const unreadAlerts = adminAlerts.filter((a) => !a.read);
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
          {tab === 'support'
            ? '🎧 Central de Suporte & Equipe'
            : tab === 'stores'
              ? '🏪 Gestão de Lojas & Planos'
              : tab === 'partners' || tab === 'adsense'
                ? '📣 Anúncios & Parceiros'
                : tab === 'sales'
                  ? '⚙️ Preços, Planos & Vendas SaaS'
                  : '👑 Contas, Bares & Planos'}
        </h1>
        <p className="mu text-xs">
          Controle exclusivo da administração do Meu Bar: contas, alteração de planos das lojas, chat de suporte com equipe delegada e monetização.
        </p>
      </div>

      {/* CONTROLE DO ALERTA DE NOVAS CONTAS */}
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

      {/* ALERTA DE NOVAS CONTAS CRIADAS */}
      {adminAlertOn && unreadAlerts.length > 0 && (
        <div className="panel mt-3 !border-emerald-400/50 bg-emerald-500/10 space-y-2.5">
          <div className="row sp flex-wrap gap-2">
            <div>
              <div className="text-sm font-bold text-emerald-200">
                🔔 {unreadAlerts.length} nova(s) conta(s) criada(s) recentemente
              </div>
              <div className="text-xs text-[var(--mut)]">
                Você pode liberar Pro VIP direto por aqui ou marcar como lido.
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
            {unreadAlerts.slice(0, 6).map((al) => {
              const em = (al.user_email || '').trim().toLowerCase();
              const alreadyVip = Boolean(em && draft.free_user_emails.includes(em));
              return (
                <div
                  key={al.id}
                  className="rounded-xl bg-black/25 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--fg)] truncate">
                      {em || al.title}
                    </div>
                    <div className="text-[var(--mut)]">
                      {al.message || 'Nova conta cadastrada'} · {fmtDateTime(al.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {em && !isSuperAdmin(em) && (
                      <button
                        type="button"
                        className={`b sm ${alreadyVip ? 'g' : 'ok'}`}
                        disabled={savingCfg}
                        onClick={() => void handleToggleEmailVip(em, !alreadyVip)}
                      >
                        {alreadyVip ? 'VIP Ativo' : 'Liberar VIP'}
                      </button>
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
          <button
            type="button"
            className={`chip ${tab === 'accounts' ? 'on' : ''}`}
            onClick={() => setTab('accounts')}
          >
            Contas & Bares ({accountStats.total})
          </button>
          <button
            type="button"
            className={`chip ${tab === 'stores' ? 'on' : ''}`}
            onClick={() => setTab('stores')}
          >
            Todos os Bares ({storeStats.total})
          </button>
          <button
            type="button"
            className={`chip ${tab === 'support' ? 'on' : ''}`}
            onClick={() => setTab('support')}
          >
            💬 Suporte & Equipe
          </button>
          <button
            type="button"
            className={`chip ${tab === 'simulator' ? 'on' : ''}`}
            onClick={() => setTab('simulator')}
          >
            🧪 Simulador Demo
          </button>
          <button
            type="button"
            className={`chip ${tab === 'partners' ? 'on' : ''}`}
            onClick={() => setTab('partners')}
          >
            Parceiros ({ads.filter((a) => a.active).length})
          </button>
          <button
            type="button"
            className={`chip ${tab === 'adsense' ? 'on' : ''}`}
            onClick={() => setTab('adsense')}
          >
            Google AdSense {draft.adsense_enabled ? '· Ativo' : ''}
          </button>
          <button
            type="button"
            className={`chip ${tab === 'sales' ? 'on' : ''}`}
            onClick={() => setTab('sales')}
          >
            Preços & Vendas
          </button>
        </div>
      ) : (
        (tab === 'partners' || tab === 'adsense') && (
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
            canManageTeam
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
                            acc.isAdmin || acc.isVipEmail ? 'on' : ''
                          }`}
                        >
                          {acc.isAdmin
                            ? '👑 Admin'
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

                    {canToggleEmail && (
                      <button
                        type="button"
                        className={`b full ${acc.isVipEmail ? 'g' : 'ok'}`}
                        disabled={savingCfg}
                        onClick={() => void handleToggleEmailVip(acc.email, !acc.isVipEmail)}
                      >
                        {acc.isVipEmail
                          ? 'Remover Pro VIP desta conta'
                          : '👑 Liberar Pro VIP Grátis para esta conta'}
                      </button>
                    )}

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

                    <div className="pt-2 border-t border-[var(--bd)] flex justify-between gap-2 flex-wrap">
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
    </div>
  );
};
