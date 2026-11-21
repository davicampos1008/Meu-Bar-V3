import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SAAS_CONFIG,
  ensureAdSenseScript,
  isValidAdSenseClient,
  isValidAdSenseSlot,
  sanitizeHttpUrl,
  trackPartnerAdEvent,
} from '../lib/saas';
import type { PartnerAdBanner, PlatformSaaSConfig } from '../types/meubar';

export type AdSlotPlacement = 'panel' | 'explore' | 'menu_free';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AdSenseUnit: React.FC<{
  clientId: string;
  slotId: string;
  compact?: boolean;
}> = ({ clientId, slotId, compact }) => {
  const pushedRef = useRef(false);

  useEffect(() => {
    const ok = ensureAdSenseScript(clientId);
    if (!ok || pushedRef.current) return;
    pushedRef.current = true;
    const t = setTimeout(() => {
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        // AdSense ignores duplicate or blocked fills cleanly
      }
    }, 150);
    return () => clearTimeout(t);
  }, [clientId, slotId]);

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 px-2.5 py-2 ${
        compact ? 'min-h-[64px]' : 'min-h-[82px]'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] text-[var(--mut)] mb-1">
        <span>Publicidade</span>
        <span>Google AdSense</span>
      </div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: compact ? '52px' : '64px' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export const AdSlot: React.FC<{
  placement: AdSlotPlacement;
  showAds: boolean;
  config?: PlatformSaaSConfig;
  partnerAds?: PartnerAdBanner[];
  onUpgradeClick?: () => void;
  className?: string;
}> = ({
  placement,
  showAds,
  config = DEFAULT_SAAS_CONFIG,
  partnerAds = [],
  onUpgradeClick,
  className = '',
}) => {
  const [rotateSeed] = useState(() => Math.floor(Math.random() * 100));
  const trackedRef = useRef<string | null>(null);

  const matchingPartners = useMemo(() => {
    return partnerAds
      .filter((ad) => ad.active && (ad.placement === 'all' || ad.placement === placement))
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  }, [partnerAds, placement]);

  const chosenPartner = useMemo(() => {
    if (matchingPartners.length === 0) return null;
    // Prioridade mais alta tem maior peso; em empate alterna de forma suave
    const topPriority = Number(matchingPartners[0].priority || 0);
    const topTier = matchingPartners.filter((a) => Number(a.priority || 0) === topPriority);
    return topTier[rotateSeed % topTier.length] || matchingPartners[0];
  }, [matchingPartners, rotateSeed]);

  const slotId =
    placement === 'panel'
      ? config.adsense_slot_panel
      : placement === 'explore'
        ? config.adsense_slot_explore
        : config.adsense_slot_menu_free;

  const canShowAdSense =
    Boolean(config.adsense_enabled) &&
    isValidAdSenseClient(config.adsense_client_id) &&
    isValidAdSenseSlot(slotId);

  const renderMode = useMemo<'partner' | 'adsense' | 'house' | 'none'>(() => {
    if (!showAds) return 'none';
    if (chosenPartner && canShowAdSense) {
      if (config.ads_rotation_mode === 'adsense_first') return 'adsense';
      if (config.ads_rotation_mode === 'rotate') {
        return rotateSeed % 2 === 0 ? 'partner' : 'adsense';
      }
      return 'partner';
    }
    if (chosenPartner) return 'partner';
    if (canShowAdSense) return 'adsense';
    if (placement === 'panel' && onUpgradeClick) return 'house';
    return 'none';
  }, [showAds, chosenPartner, canShowAdSense, config.ads_rotation_mode, rotateSeed, placement, onUpgradeClick]);

  useEffect(() => {
    if (renderMode === 'partner' && chosenPartner && trackedRef.current !== chosenPartner.id) {
      trackedRef.current = chosenPartner.id;
      void trackPartnerAdEvent(chosenPartner.id, 'impression');
    }
  }, [renderMode, chosenPartner]);

  if (renderMode === 'none') return null;

  if (renderMode === 'adsense') {
    return (
      <aside aria-label="Espaço publicitário" className={`mt-4 ${className}`}>
        <AdSenseUnit
          clientId={config.adsense_client_id.trim()}
          slotId={slotId.trim()}
          compact={placement === 'menu_free'}
        />
        {onUpgradeClick && placement !== 'menu_free' && (
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={onUpgradeClick}
              className="bg-transparent border-0 text-[11px] text-[var(--mut)] hover:text-[var(--ac)] cursor-pointer p-0"
            >
              Remover anúncios com o Plano Pro →
            </button>
          </div>
        )}
      </aside>
    );
  }

  if (renderMode === 'partner' && chosenPartner) {
    const safeClick = sanitizeHttpUrl(chosenPartner.click_url);
    const safeImg = sanitizeHttpUrl(chosenPartner.image_url);
    const accent = chosenPartner.accent_color || 'var(--ac)';
    const bg = chosenPartner.bg_color || 'var(--bg2)';

    const content = (
      <div
        className="w-full rounded-2xl border border-white/12 p-3 transition-transform active:scale-[0.99] flex items-center gap-3"
        style={{ background: bg }}
      >
        {safeImg ? (
          <img
            src={safeImg}
            alt={chosenPartner.title}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-base font-bold border border-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', color: accent }}
          >
            ★
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--mut)]">
            <span>{chosenPartner.badge_text || 'Parceiro'}</span>
            <span aria-hidden="true">·</span>
            <span>Patrocinado</span>
          </div>
          <div className="text-sm font-bold text-[var(--fg)] truncate mt-0.5">
            {chosenPartner.title}
          </div>
          {chosenPartner.subtitle && (
            <div className="text-xs text-[var(--mut)] truncate mt-0.5">
              {chosenPartner.subtitle}
            </div>
          )}
        </div>

        <span
          className="text-xs font-bold px-3 py-2 rounded-xl shrink-0 whitespace-nowrap"
          style={{ background: accent, color: '#120d0c' }}
        >
          {chosenPartner.cta_label || 'Conhecer'}
        </span>
      </div>
    );

    return (
      <aside aria-label="Anúncio de parceiro" className={`mt-4 ${className}`}>
        {safeClick ? (
          <a
            href={safeClick}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block no-underline"
            onClick={() => void trackPartnerAdEvent(chosenPartner.id, 'click')}
          >
            {content}
          </a>
        ) : (
          content
        )}
        {onUpgradeClick && placement !== 'menu_free' && (
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={onUpgradeClick}
              className="bg-transparent border-0 text-[11px] text-[var(--mut)] hover:text-[var(--ac)] cursor-pointer p-0"
            >
              Remover anúncios com o Plano Pro →
            </button>
          </div>
        )}
      </aside>
    );
  }

  // Fallback house card limpo apenas no painel administrativo da versão Grátis
  return (
    <aside aria-label="Plano Pro" className={`mt-4 ${className}`}>
      <div className="rounded-2xl border border-white/10 bg-[var(--bg2)] p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-[var(--mut)]">Plano Grátis · Espaço reservado para parceiros / AdSense</div>
          <div className="text-sm font-bold text-[var(--fg)] truncate mt-0.5">
            Libere Happy Hour, Fidelidade, Equipe e zero anúncios no Pro
          </div>
        </div>
        {onUpgradeClick && (
          <button
            type="button"
            className="b sm shrink-0 whitespace-nowrap"
            onClick={onUpgradeClick}
          >
            Ver Pro
          </button>
        )}
      </div>
    </aside>
  );
};
