import React from 'react';
import { CREST_BASES, CREST_ICONS, CREST_ORNAMENTS, MENU_BLOCK_LABELS } from '../lib/catalog';
import {
  DEFAULT_MENU_DESIGN,
  getPromoAdjustedPrice,
  money,
  recipeTags,
} from '../lib/utils';
import type { Bar, MenuBlockId, MenuDesignConfig, MenuPromotion, Recipe } from '../types/meubar';
import { RecipeTile } from './SharedUI';

export function buildMenuBackgroundStyle(
  colorBg: string,
  design: MenuDesignConfig,
  colorAccent: string
): React.CSSProperties {
  const c1 = colorBg || '#0b0a0d';
  const c2 = design.bg_color_2 || '#1b1626';
  const ac = colorAccent || '#e5a93c';
  switch (design.bg_pattern) {
    case 'solid':
      return { background: c1 };
    case 'aurora':
      return {
        background: `radial-gradient(circle at 18% 12%, ${ac}30 0%, transparent 45%), radial-gradient(circle at 86% 24%, ${c2} 0%, transparent 55%), linear-gradient(165deg, ${c2} 0%, ${c1} 72%)`,
      };
    case 'chalkboard':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), radial-gradient(circle at 50% 0%, ${c2}aa 0%, ${c1} 76%)`,
        backgroundSize: '20px 20px, 100% 100%',
      };
    case 'parchment':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 20% 20%, ${c2}88 0%, transparent 55%), radial-gradient(circle at 80% 80%, ${c2}88 0%, transparent 55%), repeating-linear-gradient(0deg, rgba(120,85,35,0.03) 0px, rgba(120,85,35,0.03) 1px, transparent 1px, transparent 4px)`,
      };
    case 'marble-light':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(125deg, ${c1} 0%, ${c2}55 45%, ${c1} 70%, ${c2}44 100%)`,
      };
    case 'grunge':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 15% 15%, ${ac}22 0%, transparent 42%), radial-gradient(circle at 85% 85%, ${c2}cc 0%, transparent 50%), repeating-radial-gradient(circle at 0 0, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 9px)`,
      };
    case 'velvet':
      return {
        background: `radial-gradient(ellipse at 50% 10%, ${ac}24 0%, ${c2} 42%, ${c1} 85%)`,
      };
    case 'diagonal':
      return {
        backgroundColor: c1,
        backgroundImage: `repeating-linear-gradient(135deg, ${c2}66 0px, ${c2}66 12px, transparent 12px, transparent 28px)`,
      };
    case 'grid':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(${ac}14 1px, transparent 1px), linear-gradient(90deg, ${ac}14 1px, transparent 1px)`,
        backgroundSize: '26px 26px',
      };
    case 'dots':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(${ac}28 1.5px, transparent 1.5px)`,
        backgroundSize: '18px 18px',
      };
    case 'checker':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(45deg, ${c2}44 25%, transparent 25%), linear-gradient(-45deg, ${c2}44 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${c2}44 75%), linear-gradient(-45deg, transparent 75%, ${c2}44 75%)`,
        backgroundSize: '28px 28px',
        backgroundPosition: '0 0, 0 14px, 14px -14px, -14px 0px',
      };
    case 'spotlight':
      return {
        background: `radial-gradient(ellipse at 50% 0%, ${ac}3a 0%, ${c2}88 38%, ${c1} 80%)`,
      };
    case 'radial':
    default:
      return {
        background: `radial-gradient(circle at top, ${c2} 0%, ${c1} 60%)`,
      };
  }
}

export function getLogoSizePx(size?: MenuDesignConfig['logo_size']): number {
  if (size === 'sm') return 48;
  if (size === 'lg') return 88;
  if (size === 'xl') return 112;
  return 68;
}

export function getLogoShapeStyle(
  shape: string | undefined,
  accent: string
): React.CSSProperties {
  const base: React.CSSProperties = {
    objectFit: 'cover',
    transition: 'all .18s ease',
  };
  switch (shape) {
    case 'circle':
      return { ...base, borderRadius: '9999px', border: `2px solid ${accent}` };
    case 'square':
      return { ...base, borderRadius: '6px', border: `2px solid ${accent}88` };
    case 'double-ring':
      return {
        ...base,
        borderRadius: '9999px',
        border: `3px double ${accent}`,
        padding: '3px',
        background: 'rgba(0,0,0,.35)',
      };
    case 'shield':
      return {
        ...base,
        borderRadius: '14px 14px 36px 36px',
        border: `2px solid ${accent}`,
        boxShadow: `0 6px 18px ${accent}33`,
      };
    case 'diamond':
      return {
        ...base,
        borderRadius: '26px 8px 26px 8px',
        border: `2px solid ${accent}`,
      };
    case 'glow':
      return {
        ...base,
        borderRadius: '18px',
        border: `2px solid ${accent}`,
        boxShadow: `0 0 22px ${accent}66`,
      };
    case 'none':
      return { ...base, borderRadius: '12px', border: 'none' };
    case 'rounded':
    default:
      return { ...base, borderRadius: '16px', border: `2px solid ${accent}99` };
  }
}

const CornerFiligreeSvg: React.FC<{ accent: string; flipX?: boolean; flipY?: boolean }> = ({
  accent,
  flipX,
  flipY,
}) => (
  <svg
    width="34"
    height="34"
    viewBox="0 0 40 40"
    fill="none"
    style={{
      transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
      display: 'block',
    }}
  >
    <path
      d="M2 30V6C2 3.8 3.8 2 6 2H30"
      stroke={accent}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M7 22C7 13 13 7 22 7"
      stroke={accent}
      strokeWidth="1.3"
      strokeDasharray="2 2"
    />
    <path
      d="M6 14C10 14 14 10 14 6C11 6 6 11 6 14Z"
      fill={accent}
      fillOpacity="0.45"
    />
    <circle cx="9" cy="9" r="2.2" fill={accent} />
  </svg>
);

export const TopOrnamentView: React.FC<{ id?: string; accent: string }> = ({ id, accent }) => {
  if (!id || id === 'none') return null;

  if (id === 'victorian-corners') {
    return (
      <div className="flex items-center justify-between gap-2 py-1 opacity-90" style={{ color: accent }}>
        <CornerFiligreeSvg accent={accent} />
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="h-[1px] flex-1 opacity-55" style={{ background: accent }} />
          <span className="text-[11px] tracking-[0.22em]">⚜ ◆ ⚜</span>
          <span className="h-[1px] flex-1 opacity-55" style={{ background: accent }} />
        </div>
        <CornerFiligreeSvg accent={accent} flipX />
      </div>
    );
  }

  if (id === 'speakeasy-double') {
    return (
      <div className="py-1.5 flex flex-col gap-1">
        <div className="h-[1px] w-full opacity-75" style={{ background: accent }} />
        <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.28em] uppercase opacity-80" style={{ color: accent }}>
          <span>───</span>
          <span>BAR & COCKTAILS</span>
          <span>───</span>
        </div>
        <div className="h-[1px] w-full opacity-75" style={{ background: accent }} />
      </div>
    );
  }

  if (id === 'sport-banner') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5" style={{ color: accent }}>
        <span className="text-xs">★</span>
        <span
          className="px-3.5 py-0.5 text-[11px] font-bold tracking-[0.22em] uppercase rounded-sm"
          style={{ background: accent, color: '#14110b' }}
        >
          ★ CARDÁPIO OFICIAL ★
        </span>
        <span className="text-xs">★</span>
      </div>
    );
  }

  if (id === 'boteco-seal') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5" style={{ color: accent }}>
        <span className="h-[2px] flex-1 opacity-50" style={{ background: accent }} />
        <span
          className="px-3 py-0.5 text-[11px] font-semibold tracking-wider rounded-full border-2"
          style={{ borderColor: accent, background: `${accent}20` }}
        >
          ⚜ SABOR & TRADIÇÃO ⚜
        </span>
        <span className="h-[2px] flex-1 opacity-50" style={{ background: accent }} />
      </div>
    );
  }

  if (id === 'cyber-orbitals') {
    return (
      <div className="flex items-center justify-center gap-3 py-1.5">
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs"
          style={{ borderColor: '#34d399', color: accent, boxShadow: `0 0 10px ${accent}88` }}
        >
          ✦
        </span>
        <span className="h-[2px] flex-1 rounded-full" style={{ background: `linear-gradient(90deg, #34d399, ${accent})` }} />
        <span className="text-xs font-extrabold tracking-[0.25em]" style={{ color: accent }}>
          ✦ MENU ✦
        </span>
        <span className="h-[2px] flex-1 rounded-full" style={{ background: `linear-gradient(270deg, #34d399, ${accent})` }} />
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs"
          style={{ borderColor: '#34d399', color: accent, boxShadow: `0 0 10px ${accent}88` }}
        >
          ✦
        </span>
      </div>
    );
  }

  if (id === 'classic-filigree') {
    return (
      <div className="flex items-center justify-center gap-2 py-2 opacity-90" style={{ color: accent }}>
        <span className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
        <span className="text-xs tracking-[0.25em]">✦ ⚜ ✦</span>
        <span className="h-[1px] flex-1" style={{ background: `linear-gradient(270deg, transparent, ${accent})` }} />
      </div>
    );
  }

  if (id === 'artdeco') {
    return (
      <div className="flex items-center justify-center gap-1.5 py-2" style={{ color: accent }}>
        <span className="h-[2px] flex-1" style={{ background: accent, opacity: 0.4 }} />
        <span className="border px-2 py-0.5 text-[10px] tracking-[0.2em]" style={{ borderColor: accent }}>
          ◆ ◇ ◆
        </span>
        <span className="h-[2px] flex-1" style={{ background: accent, opacity: 0.4 }} />
      </div>
    );
  }

  if (id === 'botanical') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5 text-sm" style={{ color: accent }}>
        <span className="h-[1px] flex-1 opacity-40" style={{ background: accent }} />
        <span>🌿 ✦ 🍋 ✦ 🌿</span>
        <span className="h-[1px] flex-1 opacity-40" style={{ background: accent }} />
      </div>
    );
  }

  if (id === 'stars') {
    return (
      <div className="text-center py-1.5 tracking-[0.35em] text-xs" style={{ color: accent }}>
        ✧ ✦ ⋆ ★ ⋆ ✦ ✧
      </div>
    );
  }

  if (id === 'crown') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5" style={{ color: accent }}>
        <span className="h-[2px] w-10 rounded-full" style={{ background: accent, opacity: 0.6 }} />
        <span className="text-base">👑</span>
        <span className="h-[2px] w-10 rounded-full" style={{ background: accent, opacity: 0.6 }} />
      </div>
    );
  }

  if (id === 'neon-bar') {
    return (
      <div className="py-2 flex flex-col gap-1">
        <div
          className="h-[2px] w-full rounded-full"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
        <div
          className="h-[1px] w-2/3 mx-auto rounded-full opacity-60"
          style={{ background: accent }}
        />
      </div>
    );
  }

  if (id === 'citrus-line') {
    return (
      <div className="flex items-center justify-center gap-3 py-1.5 text-sm" style={{ color: accent }}>
        <span className="h-[1px] flex-1 opacity-35" style={{ background: accent }} />
        <span>🍸 · 🍋 · 🥃 · 🍹</span>
        <span className="h-[1px] flex-1 opacity-35" style={{ background: accent }} />
      </div>
    );
  }

  return null;
};

export const FooterOrnamentView: React.FC<{
  id?: string;
  accent: string;
  barName: string;
  footerText?: string;
}> = ({ id, accent, barName, footerText }) => {
  const txt = footerText?.trim();
  if ((!id || id === 'none') && !txt) return null;

  return (
    <div className="mt-4 pt-3 text-center">
      {id === 'divider-gold' && (
        <div className="flex items-center justify-center gap-2 mb-2" style={{ color: accent }}>
          <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
          <span className="text-xs">❖</span>
          <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
        </div>
      )}
      {id === 'seal' && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-2 text-xs font-semibold" style={{ borderColor: accent, color: accent }}>
          <span>⚜</span>
          <span>{barName}</span>
          <span>⚜</span>
        </div>
      )}
      {id === 'artdeco-footer' && (
        <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: accent }}>
          <span className="h-[2px] w-12" style={{ background: accent, opacity: 0.5 }} />
          <span className="text-[11px] tracking-[0.25em]">▲ ◆ ▲</span>
          <span className="h-[2px] w-12" style={{ background: accent, opacity: 0.5 }} />
        </div>
      )}
      {id === 'wave' && (
        <div className="text-xs tracking-[0.3em] mb-1.5 opacity-80" style={{ color: accent }}>
          〜 ✦ 〜 ✦ 〜
        </div>
      )}
      {id === 'coaster' && (
        <div
          className="w-10 h-10 mx-auto mb-2 rounded-full border-2 border-dashed flex items-center justify-center text-base"
          style={{ borderColor: accent, color: accent }}
        >
          🍸
        </div>
      )}
      {txt && <p className="text-xs opacity-70">{txt}</p>}
    </div>
  );
};

export const SideDetailWrapper: React.FC<{
  sideDetail?: string;
  accent: string;
  children: React.ReactNode;
}> = ({ sideDetail, accent, children }) => {
  let wrapperStyle: React.CSSProperties = { position: 'relative' };
  let showCorners = false;
  let showVictorianCorners = false;

  switch (sideDetail) {
    case 'double-hairline':
      wrapperStyle = {
        ...wrapperStyle,
        border: `1px solid ${accent}88`,
        outline: `1px solid ${accent}44`,
        outlineOffset: '-6px',
        padding: '14px',
        borderRadius: '10px',
      };
      break;
    case 'gold-bars':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `6px solid ${accent}`,
        borderRight: `6px solid ${accent}`,
        boxShadow: `inset 2px 0 0 ${accent}55, inset -2px 0 0 ${accent}55`,
        paddingLeft: '14px',
        paddingRight: '14px',
      };
      break;
    case 'victorian-scroll':
      wrapperStyle = {
        ...wrapperStyle,
        border: `1px solid ${accent}44`,
        padding: '14px',
        borderRadius: '12px',
      };
      showVictorianCorners = true;
      break;
    case 'vintage-arch':
      wrapperStyle = {
        ...wrapperStyle,
        border: `6px solid #181410`,
        outline: `2px dashed ${accent}88`,
        outlineOffset: '-10px',
        padding: '14px',
        borderRadius: '16px',
      };
      break;
    case 'neon-frame':
      wrapperStyle = {
        ...wrapperStyle,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 18px ${accent}55, inset 0 0 14px ${accent}22`,
        padding: '12px',
        borderRadius: '16px',
      };
      break;
    case 'thin-gold':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `2px solid ${accent}66`,
        borderRight: `2px solid ${accent}66`,
        paddingLeft: '10px',
        paddingRight: '10px',
      };
      break;
    case 'double-pillars':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `4px double ${accent}99`,
        borderRight: `4px double ${accent}99`,
        paddingLeft: '12px',
        paddingRight: '12px',
      };
      break;
    case 'ornate-brackets':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `1px solid ${accent}44`,
        borderRight: `1px solid ${accent}44`,
        paddingLeft: '12px',
        paddingRight: '12px',
      };
      showCorners = true;
      break;
    case 'dashed-stitch':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `2px dashed ${accent}77`,
        borderRight: `2px dashed ${accent}77`,
        paddingLeft: '10px',
        paddingRight: '10px',
      };
      break;
    case 'glow-rails':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `2px solid ${accent}`,
        borderRight: `2px solid ${accent}`,
        boxShadow: `inset 8px 0 18px -12px ${accent}, inset -8px 0 18px -12px ${accent}`,
        paddingLeft: '12px',
        paddingRight: '12px',
      };
      break;
    default:
      break;
  }

  return (
    <div style={wrapperStyle}>
      {showCorners && (
        <>
          <span
            className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2"
            style={{ borderColor: accent }}
          />
        </>
      )}
      {showVictorianCorners && (
        <>
          <span className="pointer-events-none absolute top-1 left-1 z-[2]">
            <CornerFiligreeSvg accent={accent} />
          </span>
          <span className="pointer-events-none absolute top-1 right-1 z-[2]">
            <CornerFiligreeSvg accent={accent} flipX />
          </span>
          <span className="pointer-events-none absolute bottom-1 left-1 z-[2]">
            <CornerFiligreeSvg accent={accent} flipY />
          </span>
          <span className="pointer-events-none absolute bottom-1 right-1 z-[2]">
            <CornerFiligreeSvg accent={accent} flipX flipY />
          </span>
        </>
      )}
      {children}
    </div>
  );
};

export const SectionHeadingRibbon: React.FC<{
  title: string;
  styleId?: string;
  accent: string;
  surface: string;
  text: string;
}> = ({ title, styleId, accent, surface, text }) => {
  switch (styleId) {
    case 'ribbon-vintage':
      return (
        <div className="my-2 flex items-center justify-center">
          <div
            className="px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] rounded-sm shadow"
            style={{
              background: '#1c1712',
              color: '#f8eed9',
              border: `1.5px solid ${accent}`,
            }}
          >
            ✦ {title} ✦
          </div>
        </div>
      );
    case 'gold-plate':
      return (
        <div className="my-2 flex items-center gap-2">
          <span
            className="px-3 py-1 rounded text-xs font-extrabold uppercase tracking-[0.14em]"
            style={{ background: accent, color: '#14110b' }}
          >
            {title}
          </span>
          <span className="h-[2px] flex-1 opacity-55" style={{ background: accent }} />
        </div>
      );
    case 'neon-pill':
      return (
        <div className="my-2">
          <span
            className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{
              background: `${accent}26`,
              color: accent,
              border: `1.5px solid ${accent}`,
              boxShadow: `0 0 12px ${accent}44`,
            }}
          >
            ⚡ {title}
          </span>
        </div>
      );
    case 'speakeasy-rule':
      return (
        <div className="my-2.5 flex items-center gap-2.5" style={{ color: accent }}>
          <span className="text-xs font-serif font-bold uppercase tracking-[0.2em]">{title}</span>
          <span className="h-[1px] flex-1 opacity-60" style={{ background: accent }} />
        </div>
      );
    case 'clean':
    default:
      return (
        <div
          className="my-2 font-bold text-sm tracking-wide"
          style={{ color: accent || text, background: 'transparent' }}
        >
          {title}
        </div>
      );
  }
  void surface;
};

export const PriceTagBadge: React.FC<{
  price: number | null;
  originalPrice: number | null;
  discounted: boolean;
  priceStyle?: string;
  accent: string;
  okColor: string;
}> = ({ price, originalPrice, discounted, priceStyle, accent, okColor }) => {
  if (price == null) return null;

  const formatted = money(price);

  if (priceStyle === 'gold-pill') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="inline-block px-2.5 py-0.5 rounded-md text-xs font-extrabold whitespace-nowrap shadow-sm"
          style={{ background: accent || '#f5b301', color: '#14110b' }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  if (priceStyle === 'outlined-chip') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="inline-block px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border"
          style={{ borderColor: accent, color: okColor || accent }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  if (priceStyle === 'dotted-badge') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="text-sm font-bold whitespace-nowrap font-serif"
          style={{ color: okColor || accent }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  return (
    <div className="text-right shrink-0">
      {discounted && originalPrice != null && (
        <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
      )}
      <span className="tag pr" style={{ color: okColor }}>
        {formatted}
      </span>
    </div>
  );
};

export interface MenuDisplayRecipe extends Recipe {
  price?: number | null;
}

export const MenuDrinksCatalog: React.FC<{
  recipes: MenuDisplayRecipe[];
  displayMode: string;
  design: MenuDesignConfig;
  accent: string;
  surface: string;
  okColor: string;
  textColor: string;
  activePromo: MenuPromotion | null | undefined;
  pricesMap?: Record<string, number>;
  previewFallbackPrice?: number | null;
  onSelectDrink?: (recipe: MenuDisplayRecipe) => void;
}> = ({
  recipes,
  displayMode,
  design,
  accent,
  surface,
  okColor,
  textColor,
  activePromo,
  pricesMap,
  previewFallbackPrice,
  onSelectDrink,
}) => {
  const mode = displayMode || 'grid-classic';
  const cardExtraCls =
    design.card_style === 'bordered'
      ? '!border-2'
      : design.card_style === 'elevated'
      ? 'shadow-lg'
      : design.card_style === 'minimal'
      ? '!border-transparent !bg-transparent'
      : '';

  const effectivePriceStyle =
    mode === 'mode-gold-pills' && (!design.price_style || design.price_style === 'clean')
      ? 'gold-pill'
      : mode === 'mode-dotted-menu' && (!design.price_style || design.price_style === 'clean')
      ? 'dotted-badge'
      : design.price_style;

  const renderSingleCard = (r: MenuDisplayRecipe) => {
    const rawPrice =
      r.price != null
        ? r.price
        : pricesMap && pricesMap[r.id] != null
        ? pricesMap[r.id]
        : previewFallbackPrice ?? null;

    const { finalPrice, originalPrice, discounted } = getPromoAdjustedPrice(
      rawPrice,
      r.category,
      activePromo
    );

    const tg = recipeTags(r).slice(0, 2);
    const ingLine = (r.ingredients || [])
      .map((i) => i.n)
      .filter(Boolean)
      .slice(0, 4)
      .join(' · ');

    const isHorizontalDotted = mode === 'mode-dotted-menu';
    const isGoldPills = mode === 'mode-gold-pills';
    const isMagazine = mode === 'mode-magazine';
    const isPolaroid = mode === 'mode-polaroid';

    const cardStyleObj: React.CSSProperties = {
      background:
        design.card_style === 'minimal'
          ? 'transparent'
          : isPolaroid
          ? surface
          : surface,
      borderColor: design.card_style === 'bordered' ? accent : `${accent}2b`,
      color: textColor,
    };

    const content = (
      <>
        <RecipeTile recipe={r} />

        {isHorizontalDotted ? (
          <div className="flex-1 min-w-0 pr-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm truncate">{r.name}</span>
              <span
                className="flex-1 border-b border-dotted opacity-45"
                style={{ borderColor: accent }}
              />
              <PriceTagBadge
                price={finalPrice}
                originalPrice={originalPrice}
                discounted={discounted}
                priceStyle={effectivePriceStyle}
                accent={accent}
                okColor={okColor}
              />
            </div>
            {(ingLine || r.category) && (
              <div className="text-[11px] opacity-70 truncate mt-0.5">
                {ingLine || r.category}
              </div>
            )}
          </div>
        ) : isGoldPills ? (
          <div className="flex-1 min-w-0 p-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{r.name}</div>
              {ingLine && <div className="text-[11px] opacity-70 truncate mt-0.5">{ingLine}</div>}
              {tg.length > 0 && <span className="pill-tag">{tg.join(' · ')}</span>}
            </div>
            <PriceTagBadge
              price={finalPrice}
              originalPrice={originalPrice}
              discounted={discounted}
              priceStyle={effectivePriceStyle}
              accent={accent}
              okColor={okColor}
            />
          </div>
        ) : isMagazine ? (
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-base leading-tight">{r.name}</div>
                <span className="pill-tag">{r.category}</span>
              </div>
              <PriceTagBadge
                price={finalPrice}
                originalPrice={originalPrice}
                discounted={discounted}
                priceStyle={effectivePriceStyle}
                accent={accent}
                okColor={okColor}
              />
            </div>
            {(r.description || ingLine) && (
              <div className="text-xs opacity-75 line-clamp-2">
                {r.description || `Com ${ingLine}`}
              </div>
            )}
          </div>
        ) : (
          <div className="t">
            <div className="min-w-0">
              <div className={`${isPolaroid ? 'font-serif text-sm' : ''} leading-tight`}>
                {r.name}
              </div>
              {tg.length > 0 && <span className="pill-tag">{tg.join(' · ')}</span>}
            </div>
            <PriceTagBadge
              price={finalPrice}
              originalPrice={originalPrice}
              discounted={discounted}
              priceStyle={effectivePriceStyle}
              accent={accent}
              okColor={okColor}
            />
          </div>
        )}
      </>
    );

    if (onSelectDrink) {
      return (
        <button
          key={r.id}
          type="button"
          className={`card ${cardExtraCls}`}
          style={cardStyleObj}
          onClick={() => onSelectDrink(r)}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={r.id} className={`card !cursor-default ${cardExtraCls}`} style={cardStyleObj}>
        {content}
      </div>
    );
  };

  if (recipes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs opacity-75 mt-2">
        Nenhum drink disponível exibido agora.
      </div>
    );
  }

  if (mode === 'mode-grouped-sections') {
    const groups = new Map<string, MenuDisplayRecipe[]>();
    recipes.forEach((r) => {
      const cat = r.category || 'Drinks';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(r);
    });

    return (
      <div className="menu-grouped-wrap">
        {Array.from(groups.entries()).map(([cat, list]) => (
          <div key={cat}>
            <SectionHeadingRibbon
              title={cat}
              styleId={design.section_style}
              accent={accent}
              surface={surface}
              text={textColor}
            />
            <div className="menu-items mode-grouped-sections">{list.map(renderSingleCard)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <div className={`menu-items ${mode} mt-2.5`}>{recipes.map(renderSingleCard)}</div>;
};

export const MenuPromoBanner: React.FC<{
  promo: MenuPromotion | null | undefined;
  accent: string;
  surface: string;
}> = ({ promo, accent, surface }) => {
  if (!promo) return null;
  const color = promo.accent_color || accent || '#e5a93c';
  return (
    <div
      className="rounded-2xl p-3.5 my-2.5 flex items-center justify-between gap-3"
      style={{
        background: `linear-gradient(135deg, ${color}28, ${surface || '#141218'})`,
        border: `1.5px solid ${color}`,
      }}
    >
      <div className="min-w-0 flex-1">
        {promo.badge && (
          <span
            className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-1"
            style={{ background: color, color: '#141218' }}
          >
            {promo.badge}
          </span>
        )}
        <div className="font-bold text-sm leading-tight">{promo.title}</div>
        {promo.subtitle && <div className="text-xs opacity-80 mt-0.5">{promo.subtitle}</div>}
        {promo.type === 'discount_pct' && promo.discount_pct ? (
          <div className="text-[11px] font-semibold mt-1" style={{ color }}>
            {promo.discount_pct}% OFF{' '}
            {promo.target_category && promo.target_category !== 'Todas'
              ? `em ${promo.target_category}`
              : 'em todo o cardápio'}
          </div>
        ) : null}
      </div>
      <div className="text-2xl shrink-0">🏷️</div>
    </div>
  );
};

export const MenuHeaderCard: React.FC<{
  bar: Partial<Bar>;
  design: MenuDesignConfig;
  mesa?: string | null;
  interactiveLogoDrag?: boolean;
  onLogoOffsetChange?: (x: number, y: number) => void;
}> = ({ bar, design, mesa, interactiveLogoDrag, onLogoOffsetChange }) => {
  const accent = bar.color_accent || '#e5a93c';
  const surface = bar.color_surface || '#141218';
  const text = bar.color_text || '#f6f1ea';
  const borderCls = bar.crest_border || 'crest-border-gold';
  const fontCls = bar.name_font || 'store-font-serif';
  const alignMap: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };
  const textAlignMap: Record<string, 'left' | 'center' | 'right'> = {
    left: 'left',
    center: 'center',
    right: 'right',
  };

  const be = CREST_BASES.find((x) => x.id === (bar.crest_base || 'circle'))?.emoji || '';
  const ie = CREST_ICONS.find((x) => x.id === (bar.crest_icon || 'glass'))?.emoji || '🍸';
  const oe = CREST_ORNAMENTS.find((x) => x.id === (bar.crest_ornament || 'none'))?.emoji || '';
  const crestSymbol = `${oe ? oe + ' ' : ''}${ie}${be ? ' ' + be : ''}`;

  const logoPx = getLogoSizePx(design.logo_size);
  const offsetX = design.logo_offset_x || 0;
  const offsetY = design.logo_offset_y || 0;

  const handleLogoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactiveLogoDrag || !onLogoOffsetChange) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = offsetX;
    const origY = offsetY;

    const onMove = (mv: PointerEvent) => {
      const dx = Math.max(-90, Math.min(90, Math.round(origX + (mv.clientX - startX))));
      const dy = Math.max(-45, Math.min(45, Math.round(origY + (mv.clientY - startY))));
      onLogoOffsetChange(dx, dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const hasBanner = Boolean(bar.banner_url);
  const frameStyle: React.CSSProperties = {
    background: surface,
    color: text,
    border: borderCls === 'crest-border-none' ? 'none' : undefined,
    backgroundImage: hasBanner ? `url('${bar.banner_url}')` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div className={`crest-frame ${borderCls !== 'crest-border-none' ? borderCls : ''}`} style={frameStyle}>
      {hasBanner && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(180deg, rgba(11,10,13,.55), ${surface}ee)`,
          }}
        />
      )}
      <div className="relative z-[1]">
        <TopOrnamentView id={design.top_ornament} accent={accent} />

        <div
          style={{
            display: 'flex',
            justifyContent: alignMap[bar.logo_pos || 'left'] || 'flex-start',
            marginTop: '6px',
          }}
        >
          <div
            onPointerDown={handleLogoPointerDown}
            title={interactiveLogoDrag ? 'Arraste para posicionar a logo' : undefined}
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px)`,
              cursor: interactiveLogoDrag ? 'grab' : 'default',
              touchAction: interactiveLogoDrag ? 'none' : undefined,
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {bar.logo_url ? (
              <img
                key={bar.logo_url}
                src={bar.logo_url}
                alt={bar.name || 'Logo'}
                style={{
                  width: `${logoPx}px`,
                  height: `${logoPx}px`,
                  ...getLogoShapeStyle(design.logo_shape, accent),
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                style={{
                  width: `${logoPx}px`,
                  height: `${logoPx}px`,
                  background: `${accent}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: logoPx >= 80 ? '2rem' : '1.45rem',
                  ...getLogoShapeStyle(design.logo_shape, accent),
                }}
              >
                {crestSymbol}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            textAlign: textAlignMap[bar.name_pos || 'left'] || 'left',
            marginTop: '10px',
          }}
        >
          {mesa && (
            <div className="text-xs font-semibold mb-0.5" style={{ color: accent }}>
              🪑 {mesa}
            </div>
          )}
          <h1 className={`${fontCls} !m-0 leading-tight`} style={{ color: accent }}>
            {bar.name || 'Meu Bar'}
          </h1>
          {bar.slogan && <p className="text-sm opacity-80 mt-1">{bar.slogan}</p>}
          {bar.city && <p className="text-xs opacity-65 mt-1">📍 {bar.city}</p>}
        </div>
      </div>
    </div>
  );
};

export const CanvaBlockShell: React.FC<{
  blockId: MenuBlockId;
  active: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDragStartBlock: (id: MenuBlockId) => void;
  onDropOnBlock: (targetId: MenuBlockId) => void;
  children: React.ReactNode;
}> = ({
  blockId,
  active,
  onSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDragStartBlock,
  onDropOnBlock,
  children,
}) => {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', blockId);
        onDragStartBlock(blockId);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropOnBlock(blockId);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`canvas-block ${active ? 'selected' : ''}`}
    >
      <div className="canvas-block-bar">
        <span className="text-[11px] font-semibold opacity-90">
          ⠿ {MENU_BLOCK_LABELS[blockId] || blockId}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className="canvas-mini-btn"
            disabled={!canMoveUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
          >
            ↑
          </button>
          <button
            type="button"
            className="canvas-mini-btn"
            disabled={!canMoveDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
          >
            ↓
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

export function normalizeBlockOrder(order?: MenuBlockId[]): MenuBlockId[] {
  const def = DEFAULT_MENU_DESIGN.block_order;
  if (!Array.isArray(order) || !order.length) return def;
  const seen = new Set<MenuBlockId>();
  const out: MenuBlockId[] = [];
  for (const b of order) {
    if (def.includes(b) && !seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  for (const b of def) {
    if (!seen.has(b)) out.push(b);
  }
  return out;
}
