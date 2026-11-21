import React from 'react';
import { safeExternalUrl } from '../lib/security';
import { externalMapUrl, getStoreProfileConfig } from '../lib/utils';
import type { Bar, JobPost, StoreProfileConfig } from '../types/meubar';
import {
  buildMenuBackgroundStyle,
  getLogoShapeStyle,
  getLogoSizePx,
  SideDetailWrapper,
  TopOrnamentView,
} from './MenuVisualRenderer';

interface StoreProfileRendererProps {
  bar: Partial<Bar>;
  profileConfig?: StoreProfileConfig;
  jobs?: JobPost[];
  appliedJobIds?: string[];
  onApplyJob?: (job: JobPost) => void;
  onOpenMenu?: (barId: string) => void;
  compact?: boolean;
}

export const StoreProfileRenderer: React.FC<StoreProfileRendererProps> = ({
  bar,
  profileConfig,
  jobs = [],
  appliedJobIds = [],
  onApplyJob,
  onOpenMenu,
  compact = false,
}) => {
  const cfg = profileConfig || getStoreProfileConfig(bar);
  const bg = bar.color_bg || '#0b0a0d';
  const surface = bar.color_surface || '#15131a';
  const accent = bar.color_accent || '#e5a93c';
  const ok = bar.color_ok || '#34d399';
  const textCol = bar.color_text || '#f5efe2';
  const fontCls = bar.name_font || 'store-font-serif';

  const bgStyle = buildMenuBackgroundStyle(
    bg,
    {
      bg_pattern: cfg.bg_pattern || 'radial',
      bg_color_2: cfg.bg_color_2 || '#1b1626',
    },
    accent
  );

  const bannerHeightCls =
    cfg.banner_height === 'lg'
      ? compact
        ? 'h-44'
        : 'h-56'
      : cfg.banner_height === 'sm'
        ? compact
          ? 'h-24'
          : 'h-32'
        : compact
          ? 'h-36'
          : 'h-44';

  const logoPx = getLogoSizePx(cfg.logo_size);

  const getCardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      background: surface,
      color: textCol,
      borderColor: `${accent}33`,
    };
    if (cfg.card_style === 'bordered') {
      return { ...base, border: `2px solid ${accent}` };
    }
    if (cfg.card_style === 'elevated') {
      return {
        ...base,
        border: `1px solid ${accent}33`,
        boxShadow: '0 14px 28px rgba(0,0,0,0.46)',
      };
    }
    if (cfg.card_style === 'neon') {
      return {
        ...base,
        border: `1.5px solid ${accent}`,
        boxShadow: `0 0 18px ${accent}55, inset 0 0 10px ${accent}1a`,
      };
    }
    if (cfg.card_style === 'ticket') {
      return {
        ...base,
        border: `2px dashed ${accent}aa`,
        borderRadius: '10px',
      };
    }
    if (cfg.card_style === 'soft-pill') {
      return {
        ...base,
        border: `1.5px solid ${accent}55`,
        borderRadius: '24px',
      };
    }
    if (cfg.card_style === 'minimal') {
      return {
        ...base,
        background: `${surface}66`,
        border: `1px solid ${accent}22`,
      };
    }
    return {
      ...base,
      background: `${surface}cc`,
      backdropFilter: 'blur(10px)',
      border: `1px solid ${accent}44`,
    };
  };

  const overlayGradient =
    cfg.banner_overlay === 'none'
      ? 'transparent'
      : cfg.banner_overlay === 'soft'
        ? `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, ${bg}cc 100%)`
        : cfg.banner_overlay === 'dark'
          ? `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, ${bg}f0 100%)`
          : `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, ${bg}ee 100%)`;

  const extraBanners = (cfg.extra_banners || []).filter((u) => !!u && u.trim().length > 0);
  const amenities = (cfg.amenities || []).filter(Boolean);
  const openJobs = jobs.filter((j) => j.is_open !== false);

  const cleanPhone = (cfg.phone || bar.phone || '').trim();
  const cleanWa = (cfg.whatsapp || '').trim();
  const cleanInsta = (cfg.instagram || bar.instagram || '').trim().replace(/^@/, '');
  const cleanSite = (cfg.website || '').trim();
  const cleanHours = (cfg.opening_hours || bar.opening_hours || '').trim();
  const cleanAbout = (cfg.about || bar.about || '').trim();

  const cardStyle = getCardStyle();

  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{
        ...bgStyle,
        color: textCol,
        borderColor: `${accent}44`,
      }}
    >
      <div className={compact ? 'p-3' : 'p-4 sm:p-5'}>
        <SideDetailWrapper sideDetail={cfg.side_detail} accent={accent}>
          <TopOrnamentView id={cfg.top_ornament} accent={accent} />

          {/* Hero Banner */}
          <div
            className={`relative rounded-2xl overflow-hidden border ${bannerHeightCls}`}
            style={{
              borderColor: `${accent}44`,
              background: bar.banner_url
                ? `url('${bar.banner_url}') center / cover no-repeat`
                : `radial-gradient(circle at 30% 20%, ${accent}38 0%, ${surface} 70%)`,
            }}
          >
            <div className="absolute inset-0" style={{ background: overlayGradient }} />

            {cfg.badge_text?.trim() && (
              <div className="absolute top-3 left-3 z-10">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase"
                  style={{
                    background: accent,
                    color: '#111014',
                  }}
                >
                  {cfg.badge_text.trim()}
                </span>
              </div>
            )}

            {bar.handle && (
              <div className="absolute top-3 right-3 z-10">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border"
                  style={{
                    background: 'rgba(0,0,0,0.52)',
                    borderColor: `${accent}55`,
                    color: textCol,
                  }}
                >
                  @{bar.handle}
                </span>
              </div>
            )}

            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end gap-3">
              <img
                src={bar.logo_url || '/logo.png'}
                alt={bar.name || 'Logo da loja'}
                style={{
                  width: `${logoPx}px`,
                  height: `${logoPx}px`,
                  flexShrink: 0,
                  ...getLogoShapeStyle(cfg.logo_shape, accent),
                }}
              />
              <div className="min-w-0 flex-1 pb-0.5">
                <h2
                  className={`${fontCls} m-0 leading-tight truncate`}
                  style={{
                    color: accent,
                    fontSize: compact ? '22px' : '28px',
                  }}
                >
                  {bar.name || 'Minha Loja'}
                </h2>
                {bar.slogan && (
                  <p className="text-xs sm:text-sm opacity-90 m-0 mt-0.5 line-clamp-2">
                    {bar.slogan}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {onOpenMenu && bar.id && (
              <button
                type="button"
                className="px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border-0"
                style={{ background: accent, color: '#111014' }}
                onClick={() => onOpenMenu(bar.id!)}
              >
                🍸 Ver cardápio digital
              </button>
            )}
            {cfg.show_map !== false && (bar.city || (bar.lat && bar.lon)) && (
              <a
                href={externalMapUrl(bar)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold border no-underline inline-flex items-center gap-1"
                style={{
                  background: `${surface}cc`,
                  borderColor: `${accent}44`,
                  color: textCol,
                }}
              >
                📍 Ver no mapa
              </a>
            )}
            {cleanInsta && (
              <a
                href={`https://instagram.com/${encodeURIComponent(cleanInsta)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold border no-underline inline-flex items-center gap-1"
                style={{
                  background: `${surface}cc`,
                  borderColor: `${accent}44`,
                  color: textCol,
                }}
              >
                📸 @{cleanInsta}
              </a>
            )}
            {cleanWa && (
              <a
                href={`https://wa.me/${cleanWa.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold border no-underline inline-flex items-center gap-1"
                style={{
                  background: `${ok}22`,
                  borderColor: `${ok}66`,
                  color: ok,
                }}
              >
                💬 WhatsApp
              </a>
            )}
          </div>

          {/* Sobre a casa */}
          {cleanAbout && (
            <div className="rounded-xl p-3.5 mt-3" style={cardStyle}>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-1"
                style={{ color: accent }}
              >
                Sobre o estabelecimento
              </div>
              <p className="text-xs sm:text-sm leading-relaxed m-0 opacity-90 whitespace-pre-line">
                {cleanAbout}
              </p>
            </div>
          )}

          {/* Informações principais */}
          {(bar.city || cleanHours || cleanPhone || cleanSite || cfg.address_details) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
              {(bar.city || cfg.address_details) && (
                <div className="rounded-xl p-3" style={cardStyle}>
                  <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                    📍 Localização
                  </div>
                  <div className="text-xs sm:text-sm font-semibold">
                    {bar.city || 'Endereço não informado'}
                  </div>
                  {cfg.address_details && (
                    <div className="text-xs opacity-75 mt-0.5">{cfg.address_details}</div>
                  )}
                </div>
              )}

              {cleanHours && (
                <div className="rounded-xl p-3" style={cardStyle}>
                  <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                    🕒 Horário de funcionamento
                  </div>
                  <div className="text-xs sm:text-sm font-semibold whitespace-pre-line">
                    {cleanHours}
                  </div>
                </div>
              )}

              {cleanPhone && (
                <div className="rounded-xl p-3" style={cardStyle}>
                  <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                    📞 Telefone / Reservas
                  </div>
                  <div className="text-xs sm:text-sm font-semibold">{cleanPhone}</div>
                </div>
              )}

              {(() => {
                const safeSite = safeExternalUrl(cleanSite);
                if (!safeSite) return null;
                return (
                  <div className="rounded-xl p-3" style={cardStyle}>
                    <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                      🌐 Site / Links
                    </div>
                    <a
                      href={safeSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs sm:text-sm font-semibold underline break-all"
                      style={{ color: accent }}
                    >
                      {cleanSite}
                    </a>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Comodidades & Estrutura */}
          {amenities.length > 0 && (
            <div className="rounded-xl p-3.5 mt-3" style={cardStyle}>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: accent }}
              >
                Estrutura & Diferenciais
              </div>
              <div className="flex flex-wrap gap-1.5">
                {amenities.map((am) => (
                  <span
                    key={am}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
                    style={{
                      background: `${accent}18`,
                      borderColor: `${accent}44`,
                      color: textCol,
                    }}
                  >
                    {am}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Galeria de Banners Extras */}
          {extraBanners.length > 0 && (
            <div className="mt-3">
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: accent }}
              >
                🖼️ Ambiente & Destaques
              </div>
              <div
                className={`grid gap-2.5 ${
                  extraBanners.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                }`}
              >
                {extraBanners.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="rounded-xl overflow-hidden border aspect-[16/9]"
                    style={{ borderColor: `${accent}33` }}
                  >
                    <img
                      src={url}
                      alt={`Destaque ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vagas Abertas */}
          {cfg.show_jobs !== false && openJobs.length > 0 && (
            <div className="rounded-xl p-3.5 mt-3" style={cardStyle}>
              <div
                className="text-[11px] font-bold uppercase tracking-wider mb-2"
                style={{ color: accent }}
              >
                💼 Vagas abertas neste estabelecimento ({openJobs.length})
              </div>
              <div className="flex flex-col gap-2">
                {openJobs.map((job) => {
                  const applied = appliedJobIds.includes(job.id);
                  return (
                    <div
                      key={job.id}
                      className="rounded-xl p-2.5 border flex items-center justify-between gap-2 flex-wrap"
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        borderColor: `${accent}33`,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm">{job.title}</div>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          {job.role_needed} · {job.contract_type}
                          {job.pay_info ? ` · ${job.pay_info}` : ''}
                        </div>
                        {job.description && (
                          <div className="text-[11px] opacity-75 mt-1">{job.description}</div>
                        )}
                      </div>
                      {onApplyJob && (
                        <button
                          type="button"
                          disabled={applied}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border-0 cursor-pointer shrink-0"
                          style={{
                            background: applied ? `${ok}33` : accent,
                            color: applied ? ok : '#111014',
                          }}
                          onClick={() => onApplyJob(job)}
                        >
                          {applied ? '✓ Candidatado' : 'Candidatar-se'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </SideDetailWrapper>
      </div>
    </div>
  );
};
