import React, { useEffect, useState } from 'react';
import {
  adminListAllBars,
  adminUpdateBarPlan,
  buildAdsTxtLine,
  getBarPlanStatus,
  isValidAdSenseClient,
  isValidAdSenseSlot,
  loadPartnerAds,
  sanitizeHttpUrl,
  savePlatformConfig,
} from '../lib/saas';
import { sb } from '../lib/supabase';
import { money } from '../lib/utils';
import type {
  AdminBarOverview,
  BarPlanTier,
  PartnerAdBanner,
  PartnerAdPlacement,
  PlatformSaaSConfig,
} from '../types/meubar';
import { ImageUploader } from './SharedUI';

type AdminTab = 'stores' | 'partners' | 'adsense' | 'sales';

const PLACEMENT_LABELS: Record<PartnerAdPlacement, string> = {
  panel: 'Painel Admin (Estoque/Receitas/Mais)',
  explore: 'Lojas por perto & Tela de Login',
  menu_free: 'Rodapé do Cardápio (Plano Grátis)',
  all: 'Todos os espaços permitidos',
};

export const SuperAdminView: React.FC<{
  userId: string;
  config: PlatformSaaSConfig;
  onConfigUpdated: (next: PlatformSaaSConfig) => void;
  onAdsUpdated: (ads: PartnerAdBanner[]) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({ userId, config, onConfigUpdated, onAdsUpdated, onBack, onToast }) => {
  const [tab, setTab] = useState<AdminTab>('stores');

  // Lojas & Planos
  const [stores, setStores] = useState<AdminBarOverview[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesErr, setStoresErr] = useState('');
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

  const refreshStores = async () => {
    setStoresLoading(true);
    setStoresErr('');
    const res = await adminListAllBars();
    setStores(res.bars);
    if (res.error) setStoresErr(res.error);
    setStoresLoading(false);
  };

  const refreshAds = async () => {
    setAdsLoading(true);
    const list = await loadPartnerAds(true);
    setAds(list);
    onAdsUpdated(list.filter((a) => a.active));
    setAdsLoading(false);
  };

  useEffect(() => {
    void refreshStores();
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
    const res = await adminUpdateBarPlan(barId, tier, expiresAt, note);
    setBusyBarId(null);
    if (!res.ok) {
      onToast(`Erro: ${res.error || 'Execute o schema_completo.sql atualizado no Supabase.'}`);
      return;
    }
    onToast(
      tier === 'vip'
        ? 'Acesso VIP (Pro Grátis) liberado para esta loja!'
        : tier === 'pro'
          ? `Plano Pro ativado (${daysValid ? `${daysValid} dias` : 'sem vencimento'})!`
          : 'Loja alterada para Plano Grátis.'
    );
    await refreshStores();
  };

  const handleSaveConfig = async (nextCfg: PlatformSaaSConfig, successMsg = 'Configurações salvas!') => {
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

  const handleAddVipEmail = async () => {
    const clean = newVipEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('Digite um e-mail válido.');
      return;
    }
    if (draft.free_user_emails.includes(clean)) {
      onToast('Este e-mail já está na lista VIP.');
      return;
    }
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      free_user_emails: [...draft.free_user_emails, clean],
    };
    setDraft(nextCfg);
    setNewVipEmail('');
    await handleSaveConfig(nextCfg, `E-mail ${clean} liberado como Pro VIP grátis!`);
  };

  const handleRemoveVipEmail = async (em: string) => {
    const nextCfg: PlatformSaaSConfig = {
      ...draft,
      free_user_emails: draft.free_user_emails.filter((x) => x !== em),
    };
    setDraft(nextCfg);
    await handleSaveConfig(nextCfg, `${em} removido da lista VIP.`);
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

  const adsTxtLine = buildAdsTxtLine(draft.adsense_client_id);

  return (
    <div>
      <button type="button" className="b g sm" onClick={onBack}>
        ← Voltar
      </button>

      <div className="mt-3">
        <div className="text-xs text-[var(--ac)] font-semibold">Administração da Plataforma</div>
        <h1 className="!mt-1 !mb-1">Painel SaaS · Planos & Anúncios</h1>
        <p className="mu text-xs">
          Controle assinaturas, libere VIP grátis para quem você quiser, gerencie banners de parceiros e configure o Google AdSense.
        </p>
      </div>

      {/* Navegação por abas */}
      <div className="chips !flex-wrap !overflow-visible mt-3 mb-3">
        <button
          type="button"
          className={`chip ${tab === 'stores' ? 'on' : ''}`}
          onClick={() => setTab('stores')}
        >
          Lojas & Planos ({storeStats.total})
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

      {/* ABA 1: LOJAS & LIBERAÇÃO FREEMIUM / VIP */}
      {tab === 'stores' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="panel !m-0 !p-3">
              <div className="text-[11px] text-[var(--mut)]">Total de lojas</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">{storeStats.total}</div>
            </div>
            <div className="panel !m-0 !p-3">
              <div className="text-[11px] text-[var(--mut)]">Pro pagos</div>
              <div className="text-xl font-bold tabular-nums text-[var(--ok)] mt-0.5">
                {storeStats.pro}
              </div>
            </div>
            <div className="panel !m-0 !p-3">
              <div className="text-[11px] text-[var(--mut)]">VIP cortesia</div>
              <div className="text-xl font-bold tabular-nums text-[var(--ac)] mt-0.5">
                {storeStats.vip}
              </div>
            </div>
            <div className="panel !m-0 !p-3">
              <div className="text-[11px] text-[var(--mut)]">Trial / Grátis</div>
              <div className="text-xl font-bold tabular-nums mt-0.5">
                {storeStats.trial} / {storeStats.free}
              </div>
            </div>
          </div>

          {/* Liberação por e-mail VIP */}
          <div className="panel">
            <h2 className="!mt-0">Liberar Pro Grátis por E-mail (VIP)</h2>
            <p className="mu text-xs">
              Qualquer pessoa adicionada aqui terá acesso completo ao Plano Pro e zero anúncios em todos os bares que criar ou gerenciar.
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
            {draft.free_user_emails.length > 0 && (
              <div className="list mt-3">
                {draft.free_user_emails.map((em) => (
                  <div key={em}>
                    <span className="text-sm font-medium">{em}</span>
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => void handleRemoveVipEmail(em)}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de todas as lojas */}
          <div className="panel">
            <div className="row sp flex-wrap gap-2">
              <h2 className="!m-0">Bares cadastrados</h2>
              <button
                type="button"
                className="b g sm"
                onClick={() => void refreshStores()}
              >
                Atualizar lista
              </button>
            </div>

            {storesErr && (
              <p className="warn-txt text-xs mt-2">
                Aviso: execute o arquivo <b>supabase/schema_completo.sql</b> atualizado no SQL Editor do Supabase para habilitar a listagem global com e-mail dos donos ({storesErr}).
              </p>
            )}

            <input
              type="search"
              value={storeQuery}
              onChange={(e) => setStoreQuery(e.target.value)}
              placeholder="Buscar por nome da loja, @handle, cidade ou e-mail..."
              className="mt-2.5"
            />

            {storesLoading ? (
              <p className="mu mt-3 text-xs">Carregando lojas…</p>
            ) : filteredStores.length === 0 ? (
              <p className="mu mt-3 text-xs">Nenhuma loja encontrada.</p>
            ) : (
              <div className="space-y-2.5 mt-3">
                {filteredStores.map((st) => {
                  const status = getBarPlanStatus(st, st.owner_email, draft);
                  const isBusy = busyBarId === st.id;
                  return (
                    <div
                      key={st.id}
                      className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[var(--fg)]">
                            {st.name}
                            {st.handle ? (
                              <span className="text-[var(--mut)] font-normal"> @{st.handle}</span>
                            ) : null}
                          </div>
                          <div className="text-xs text-[var(--mut)] mt-0.5">
                            {st.owner_email || 'Dono (ID ' + st.owner.slice(0, 8) + ')'}
                            {st.city ? ` · ${st.city}` : ''}
                            {typeof st.orders_count === 'number'
                              ? ` · ${st.orders_count} pedido(s)`
                              : ''}
                          </div>
                        </div>
                        <div className="text-xs font-semibold tabular-nums text-[var(--ac)]">
                          {status.label}
                          {status.expiresAt && status.effectiveTier === 'pro'
                            ? ` · até ${new Date(status.expiresAt).toLocaleDateString('pt-BR')}`
                            : ''}
                        </div>
                      </div>

                      <input
                        value={noteByBar[st.id] ?? st.plan_note ?? ''}
                        onChange={(e) =>
                          setNoteByBar((prev) => ({ ...prev, [st.id]: e.target.value }))
                        }
                        placeholder="Observação interna (ex: Pago Pix, Amigo VIP, Parceiro)..."
                        className="!text-xs !py-1.5"
                      />

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="b sm"
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(st.id, 'vip', null)}
                        >
                          Liberar VIP (Grátis)
                        </button>
                        <button
                          type="button"
                          className="b ok sm"
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(st.id, 'pro', 30)}
                        >
                          Pro +30d
                        </button>
                        <button
                          type="button"
                          className="b ok sm"
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(st.id, 'pro', 365)}
                        >
                          Pro +1 ano
                        </button>
                        <button
                          type="button"
                          className="b g sm"
                          disabled={isBusy}
                          onClick={() => void handleSetPlan(st.id, 'free', null)}
                        >
                          Voltar p/ Grátis
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

      {/* ABA 2: BANNERS DE PARCEIROS */}
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

      {/* ABA 3: GOOGLE ADSENSE */}
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

      {/* ABA 4: PREÇOS & VENDAS */}
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
    </div>
  );
};
