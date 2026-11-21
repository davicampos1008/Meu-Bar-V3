import React from 'react';
import { CREST_ICONS, CREST_ORNAMENTS, MENU_BLOCK_LABELS } from '../lib/catalog';
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
      return { backgroundColor: c1, backgroundImage: 'none' };
    case 'aurora':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 14% 12%, ${ac}4a 0%, transparent 48%), radial-gradient(circle at 86% 24%, ${c2} 0%, transparent 56%), radial-gradient(circle at 50% 92%, ${ac}2b 0%, transparent 52%), linear-gradient(160deg, ${c2} 0%, ${c1} 74%)`,
      };
    case 'sunset-glow':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(ellipse at 50% 100%, ${ac}58 0%, transparent 60%), linear-gradient(180deg, ${c1} 0%, ${c2} 52%, ${ac}36 100%)`,
      };
    case 'chalkboard':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(ellipse at 50% 15%, rgba(255,255,255,0.09) 0%, transparent 65%)`,
        backgroundSize: '18px 18px, 31px 31px, 100% 100%',
        backgroundPosition: '0 0, 9px 12px, 0 0',
      };
    case 'parchment':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 12% 14%, ${ac}28 0%, transparent 50%), radial-gradient(circle at 88% 86%, ${ac}24 0%, transparent 50%), repeating-linear-gradient(0deg, ${ac}1a 0px, ${ac}1a 1px, transparent 1px, transparent 6px)`,
      };
    case 'marble-light':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(125deg, transparent 0%, rgba(255,255,255,0.11) 24%, transparent 32%, ${ac}22 52%, transparent 60%, rgba(255,255,255,0.09) 80%, transparent 100%), linear-gradient(35deg, ${c2}66 0%, transparent 55%, ${ac}18 100%)`,
      };
    case 'grunge':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 16% 18%, ${ac}32 0%, transparent 45%), radial-gradient(circle at 84% 80%, ${c2}dd 0%, transparent 52%), repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.065) 0, rgba(255,255,255,0.065) 1.5px, transparent 1.5px, transparent 10px)`,
      };
    case 'velvet':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(ellipse at 50% 8%, ${ac}3c 0%, ${c2} 42%, ${c1} 88%), linear-gradient(90deg, rgba(0,0,0,0.38) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.38) 100%)`,
      };
    case 'carbon':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(27deg, rgba(255,255,255,0.09) 5px, transparent 5px), linear-gradient(207deg, rgba(255,255,255,0.09) 5px, transparent 5px), linear-gradient(27deg, ${ac}26 5px, transparent 5px), linear-gradient(207deg, ${ac}26 5px, transparent 5px)`,
        backgroundSize: '18px 18px',
        backgroundPosition: '0 2px, 9px 7px, 0 11px, 9px -2px',
      };
    case 'diagonal':
      return {
        backgroundColor: c1,
        backgroundImage: `repeating-linear-gradient(135deg, ${ac}24 0px, ${ac}24 10px, rgba(255,255,255,0.04) 10px, rgba(255,255,255,0.04) 12px, transparent 12px, transparent 28px)`,
      };
    case 'chevron':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(135deg, ${ac}28 25%, transparent 25%), linear-gradient(225deg, ${ac}28 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.08) 25%, transparent 25%)`,
        backgroundPosition: '12px 0, 12px 0, 0 0, 0 0',
        backgroundSize: '24px 24px',
      };
    case 'bamboo-lines':
      return {
        backgroundColor: c1,
        backgroundImage: `repeating-linear-gradient(90deg, ${ac}2c 0px, ${ac}2c 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px, transparent 4px, transparent 20px), radial-gradient(circle at 50% 0%, ${ac}26 0%, transparent 62%)`,
      };
    case 'grid':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(${ac}2e 1px, transparent 1px), linear-gradient(90deg, ${ac}2e 1px, transparent 1px)`,
        backgroundSize: '22px 22px',
      };
    case 'dots':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(${ac}4f 2px, transparent 2px)`,
        backgroundSize: '16px 16px',
      };
    case 'terrazzo':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(${ac}55 2.5px, transparent 2.5px), radial-gradient(rgba(255,255,255,0.22) 2px, transparent 2px), radial-gradient(${ac}2e 3.5px, transparent 3.5px)`,
        backgroundSize: '30px 30px, 22px 22px, 44px 44px',
        backgroundPosition: '0 0, 11px 14px, 20px 6px',
      };
    case 'checker':
      return {
        backgroundColor: c1,
        backgroundImage: `linear-gradient(45deg, ${ac}22 25%, transparent 25%), linear-gradient(-45deg, ${ac}22 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${ac}22 75%), linear-gradient(-45deg, transparent 75%, ${ac}22 75%)`,
        backgroundSize: '26px 26px',
        backgroundPosition: '0 0, 0 13px, 13px -13px, -13px 0px',
      };
    case 'spotlight':
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(ellipse 80% 45% at 50% 0%, ${ac}58 0%, ${c2}aa 42%, ${c1} 84%)`,
      };
    case 'radial':
    default:
      return {
        backgroundColor: c1,
        backgroundImage: `radial-gradient(circle at 50% 0%, ${ac}26 0%, ${c2} 32%, ${c1} 72%)`,
      };
  }
}

export function getLogoSizePx(size?: MenuDesignConfig['logo_size']): number {
  if (size === 'xs') return 38;
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
    case 'hexagon':
      return {
        ...base,
        clipPath: 'polygon(28% 2%, 72% 2%, 98% 28%, 98% 72%, 72% 98%, 28% 98%, 2% 72%, 2% 28%)',
        border: `2px solid ${accent}`,
        filter: `drop-shadow(0 0 8px ${accent}88)`,
      };
    case 'arch':
      return {
        ...base,
        borderRadius: '9999px 9999px 10px 10px',
        border: `2px solid ${accent}`,
      };
    case 'pill':
      return {
        ...base,
        borderRadius: '9999px',
        border: `2.5px solid ${accent}`,
        padding: '3px',
        boxShadow: `0 0 0 3px ${accent}44`,
      };
    case 'polaroid':
      return {
        ...base,
        borderRadius: '6px',
        padding: '4px 4px 11px 4px',
        background: '#fafaf9',
        border: `1px solid ${accent}`,
        boxShadow: '0 8px 22px rgba(0,0,0,0.45)',
      };
    case 'glow':
      return {
        ...base,
        borderRadius: '18px',
        border: `2px solid ${accent}`,
        boxShadow: `0 0 24px ${accent}88`,
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

  if (id === 'speakeasy-crest') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5" style={{ color: accent }}>
        <span className="h-[1px] flex-1 opacity-55" style={{ background: accent }} />
        <span
          className="px-3 py-0.5 text-[10px] font-semibold tracking-[0.22em] uppercase border rounded-sm"
          style={{ borderColor: accent }}
        >
          🍸 COQUETELARIA PRIVÊ
        </span>
        <span className="h-[1px] flex-1 opacity-55" style={{ background: accent }} />
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

  if (id === 'tropical-bar') {
    return (
      <div className="flex items-center justify-center gap-2.5 py-1.5 text-xs tracking-[0.18em] uppercase" style={{ color: accent }}>
        <span>🌴</span>
        <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
        <span>SUNSET & DRINKS</span>
        <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
        <span>🍹</span>
      </div>
    );
  }

  if (id === 'rooftop-horizon') {
    return (
      <div className="flex items-center justify-center gap-2.5 py-1.5 text-xs tracking-[0.22em]" style={{ color: accent }}>
        <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
        <span>🌒 ✦ 🌕 ✦ 🌘</span>
        <span className="h-[1px] flex-1 opacity-45" style={{ background: accent }} />
      </div>
    );
  }

  if (id === 'jazz-vinyl') {
    return (
      <div className="flex items-center justify-center gap-2 py-1.5 text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>
        <span className="h-[1px] flex-1 opacity-40" style={{ background: accent }} />
        <span>🎷 SOM & COQUETÉIS 🥃</span>
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
      {id === 'cheers-badge' && (
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-lg border mb-2 text-xs font-bold uppercase tracking-wider" style={{ borderColor: `${accent}88`, background: `${accent}18`, color: accent }}>
          <span>🥂 Saúde · {barName}</span>
        </div>
      )}
      {id === 'neon-underline' && (
        <div
          className="h-[2px] w-2/3 mx-auto mb-2.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
      )}
      {id === 'botanical-footer' && (
        <div className="flex items-center justify-center gap-2 mb-2 text-xs" style={{ color: accent }}>
          <span className="h-[1px] w-12 opacity-40" style={{ background: accent }} />
          <span>🌿 ✦ 🍋 ✦ 🌿</span>
          <span className="h-[1px] w-12 opacity-40" style={{ background: accent }} />
        </div>
      )}
      {id === 'vinyl-spin' && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-2 text-[11px] uppercase tracking-[0.16em]" style={{ borderColor: `${accent}66`, color: accent }}>
          <span>💿 BOA MÚSICA & BONS DRINKS</span>
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
  let showBambooRails = false;
  let showLaserRails = false;

  switch (sideDetail) {
    case 'double-hairline':
      wrapperStyle = {
        ...wrapperStyle,
        border: `2px solid ${accent}`,
        outline: `1px solid ${accent}99`,
        outlineOffset: '-7px',
        padding: '15px',
        borderRadius: '12px',
      };
      break;
    case 'gold-bars':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `6px solid ${accent}`,
        borderRight: `6px solid ${accent}`,
        boxShadow: `inset 3px 0 0 ${accent}66, inset -3px 0 0 ${accent}66`,
        padding: '6px 14px',
        borderRadius: '8px',
      };
      break;
    case 'victorian-scroll':
      wrapperStyle = {
        ...wrapperStyle,
        border: `1.5px solid ${accent}99`,
        padding: '16px',
        borderRadius: '14px',
      };
      showVictorianCorners = true;
      break;
    case 'vintage-arch':
      wrapperStyle = {
        ...wrapperStyle,
        border: `3px solid ${accent}`,
        outline: `2px dashed ${accent}bb`,
        outlineOffset: '-9px',
        padding: '16px',
        borderRadius: '18px',
        boxShadow: `inset 0 0 24px ${accent}22`,
      };
      break;
    case 'neon-frame':
      wrapperStyle = {
        ...wrapperStyle,
        border: `2.5px solid ${accent}`,
        boxShadow: `0 0 22px ${accent}99, inset 0 0 18px ${accent}44`,
        padding: '14px',
        borderRadius: '18px',
      };
      break;
    case 'thin-gold':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `3px solid ${accent}`,
        borderRight: `3px solid ${accent}`,
        padding: '4px 12px',
      };
      break;
    case 'double-pillars':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `6px double ${accent}`,
        borderRight: `6px double ${accent}`,
        padding: '4px 14px',
      };
      break;
    case 'ornate-brackets':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `1.5px solid ${accent}88`,
        borderRight: `1.5px solid ${accent}88`,
        padding: '12px 14px',
      };
      showCorners = true;
      break;
    case 'dashed-stitch':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `3px dashed ${accent}`,
        borderRight: `3px dashed ${accent}`,
        padding: '6px 13px',
      };
      break;
    case 'glow-rails':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `3px solid ${accent}`,
        borderRight: `3px solid ${accent}`,
        boxShadow: `inset 14px 0 22px -10px ${accent}cc, inset -14px 0 22px -10px ${accent}cc`,
        padding: '6px 14px',
        borderRadius: '10px',
      };
      break;
    case 'minimal-dots':
      wrapperStyle = {
        ...wrapperStyle,
        borderLeft: `4px dotted ${accent}`,
        borderRight: `4px dotted ${accent}`,
        padding: '6px 14px',
      };
      break;
    case 'bamboo-sides':
      wrapperStyle = {
        ...wrapperStyle,
        padding: '8px 18px',
      };
      showBambooRails = true;
      break;
    case 'laser-edges':
      wrapperStyle = {
        ...wrapperStyle,
        padding: '8px 16px',
      };
      showLaserRails = true;
      break;
    case 'editorial-frame':
      wrapperStyle = {
        ...wrapperStyle,
        border: `2px solid ${accent}`,
        padding: '15px',
        borderRadius: '3px',
      };
      break;
    default:
      break;
  }

  return (
    <div style={wrapperStyle}>
      {showBambooRails && (
        <>
          <span
            className="pointer-events-none absolute top-1 bottom-1 left-0 w-2 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, ${accent} 0px, ${accent} 18px, transparent 18px, transparent 22px)`,
              opacity: 0.9,
            }}
          />
          <span
            className="pointer-events-none absolute top-1 bottom-1 right-0 w-2 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(180deg, ${accent} 0px, ${accent} 18px, transparent 18px, transparent 22px)`,
              opacity: 0.9,
            }}
          />
        </>
      )}
      {showLaserRails && (
        <>
          <span
            className="pointer-events-none absolute top-0 bottom-0 left-0 w-1.5 rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${accent} 25%, #34d399 50%, ${accent} 75%, transparent 100%)`,
              boxShadow: `0 0 14px ${accent}`,
            }}
          />
          <span
            className="pointer-events-none absolute top-0 bottom-0 right-0 w-1.5 rounded-full"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${accent} 25%, #34d399 50%, ${accent} 75%, transparent 100%)`,
              boxShadow: `0 0 14px ${accent}`,
            }}
          />
        </>
      )}
      {showCorners && (
        <>
          <span
            className="pointer-events-none absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px]"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px]"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px]"
            style={{ borderColor: accent }}
          />
          <span
            className="pointer-events-none absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px]"
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
  void surface;
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
    case 'editorial-center':
      return (
        <div className="my-2.5 flex items-center justify-center gap-3" style={{ color: accent }}>
          <span className="h-[1px] w-8 opacity-55" style={{ background: accent }} />
          <span className="text-xs font-serif italic font-semibold tracking-[0.16em] uppercase">
            {title}
          </span>
          <span className="h-[1px] w-8 opacity-55" style={{ background: accent }} />
        </div>
      );
    case 'boteco-chalk':
      return (
        <div className="my-2">
          <span
            className="inline-block text-sm font-bold pb-1 border-b-2 border-dashed tracking-wide"
            style={{ color: accent, borderColor: accent }}
          >
            🍺 {title}
          </span>
        </div>
      );
    case 'minimal-bar':
      return (
        <div
          className="my-2 pl-2.5 py-0.5 text-sm font-bold uppercase tracking-wider"
          style={{ borderLeft: `4px solid ${accent}`, color: text }}
        >
          {title}
        </div>
      );
    case 'tropical-leaf':
      return (
        <div className="my-2 flex items-center gap-2">
          <span
            className="px-3 py-0.5 rounded-full text-xs font-bold tracking-wide"
            style={{
              background: `${accent}24`,
              color: accent,
              border: `1px solid ${accent}66`,
            }}
          >
            🌿 {title}
          </span>
          <span className="h-[1px] flex-1 opacity-35" style={{ background: accent }} />
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

  if (priceStyle === 'ribbon-tag') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="inline-block px-2.5 py-0.5 text-xs font-bold whitespace-nowrap"
          style={{
            background: okColor || accent,
            color: '#0e0c0a',
            borderRadius: '2px 10px 2px 10px',
          }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  if (priceStyle === 'dark-stamp') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="inline-block px-2 py-0.5 rounded text-xs font-extrabold whitespace-nowrap border"
          style={{
            background: 'rgba(0,0,0,0.55)',
            borderColor: `${accent}aa`,
            color: okColor || accent,
          }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  if (priceStyle === 'neon-glow') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="inline-block px-2 py-0.5 rounded-md text-xs font-extrabold whitespace-nowrap border"
          style={{
            borderColor: okColor || accent,
            color: okColor || accent,
            boxShadow: `0 0 10px ${(okColor || accent)}66`,
          }}
        >
          {formatted}
        </span>
      </div>
    );
  }

  if (priceStyle === 'luxury-serif') {
    return (
      <div className="text-right shrink-0">
        {discounted && originalPrice != null && (
          <div className="text-[10px] line-through opacity-60">{money(originalPrice)}</div>
        )}
        <span
          className="text-sm font-bold italic whitespace-nowrap font-serif tracking-wide"
          style={{ color: accent || okColor }}
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
      <span className="pr text-sm font-bold whitespace-nowrap" style={{ color: okColor }}>
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

  const getCardStyleObj = (isPolaroid: boolean): React.CSSProperties => {
    const base: React.CSSProperties = {
      background: surface,
      borderColor: `${accent}2b`,
      color: textColor,
    };

    switch (design.card_style) {
      case 'glass':
        return {
          ...base,
          background: `${surface}99`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${accent}44`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 20px rgba(0,0,0,0.22)',
        };
      case 'bordered':
        return {
          ...base,
          border: `2px solid ${accent}`,
        };
      case 'elevated':
        return {
          ...base,
          border: `1px solid ${accent}33`,
          boxShadow: '0 14px 30px rgba(0,0,0,0.46), 0 2px 6px rgba(0,0,0,0.28)',
        };
      case 'minimal':
        return {
          ...base,
          background: isPolaroid ? surface : 'transparent',
          border: '1px solid transparent',
          boxShadow: 'none',
        };
      case 'neon':
        return {
          ...base,
          border: `1.5px solid ${accent}`,
          boxShadow: `0 0 15px ${accent}52, inset 0 0 10px ${accent}1a`,
        };
      case 'ticket':
        return {
          ...base,
          border: `2px dashed ${accent}88`,
          borderRadius: '10px',
        };
      case 'soft-pill':
        return {
          ...base,
          border: `1px solid ${accent}44`,
          borderRadius: '24px',
        };
      default:
        return base;
    }
  };

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
    const isBistro = mode === 'mode-bistro-cards';
    const isSpotlight = mode === 'mode-spotlight-cards';
    const isPolaroid = mode === 'mode-polaroid';
    const isWideRow = mode === 'mode-single' || mode === 'mode-list';
    const isSmallBlocks = mode === 'mode-small-blocks';

    const cardStyleObj = getCardStyleObj(isPolaroid);

    const content = (
      <>
        <RecipeTile recipe={r} />

        {isHorizontalDotted ? (
          <div className="flex-1 min-w-0 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm min-w-0 truncate">{r.name}</span>
              <span
                className="flex-1 min-w-[10px] border-b border-dotted opacity-45"
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
          <div className="flex-1 min-w-0 p-2.5 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm leading-snug break-words">{r.name}</div>
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
        ) : isBistro ? (
          <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between gap-1.5">
            <div>
              <div className="font-bold text-sm leading-snug break-words">{r.name}</div>
              {ingLine && (
                <div className="text-[11px] opacity-75 line-clamp-2 mt-0.5">{ingLine}</div>
              )}
            </div>
            <div
              className="flex items-center justify-between gap-2 pt-1.5 border-t"
              style={{ borderColor: `${accent}26` }}
            >
              <span className="text-[11px] opacity-70 truncate">{r.category}</span>
              <PriceTagBadge
                price={finalPrice}
                originalPrice={originalPrice}
                discounted={discounted}
                priceStyle={effectivePriceStyle}
                accent={accent}
                okColor={okColor}
              />
            </div>
          </div>
        ) : isMagazine || isSpotlight ? (
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-base leading-snug break-words">{r.name}</div>
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
        ) : isWideRow ? (
          <div className="t">
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug break-words">{r.name}</div>
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
        ) : (
          <div className="t">
            <div className="min-w-0 w-full">
              <div
                className={`${isPolaroid ? 'font-serif text-sm' : ''} ${
                  isSmallBlocks ? 'text-xs' : 'text-sm'
                } font-semibold leading-snug break-words`}
              >
                {r.name}
              </div>
              {!isSmallBlocks && tg.length > 0 && (
                <span className="pill-tag">{tg.join(' · ')}</span>
              )}
            </div>
            <div
              className={`flex items-center ${
                isSmallBlocks ? 'justify-start' : 'justify-between'
              } gap-2 w-full mt-auto pt-1`}
            >
              {!isSmallBlocks && (
                <span className="text-[10px] opacity-60 truncate">{r.category}</span>
              )}
              <PriceTagBadge
                price={finalPrice}
                originalPrice={originalPrice}
                discounted={discounted}
                priceStyle={effectivePriceStyle}
                accent={accent}
                okColor={okColor}
              />
            </div>
          </div>
        )}
      </>
    );

    if (onSelectDrink) {
      return (
        <button
          key={r.id}
          type="button"
          className="card"
          style={cardStyleObj}
          onClick={() => onSelectDrink(r)}
        >
          {content}
        </button>
      );
    }

    return (
      <div key={r.id} className="card !cursor-default" style={cardStyleObj}>
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

  return (
    <div className="mt-2">
      {design.section_style && design.section_style !== 'clean' && (
        <SectionHeadingRibbon
          title="Carta de Drinks"
          styleId={design.section_style}
          accent={accent}
          surface={surface}
          text={textColor}
        />
      )}
      <div className={`menu-items ${mode} mt-2`}>{recipes.map(renderSingleCard)}</div>
    </div>
  );
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

function getCrestBasePedestalStyle(baseId: string | undefined, accent: string): React.CSSProperties {
  switch (baseId) {
    case 'none':
      return { padding: '0px', border: 'none', background: 'transparent' };
    case 'square':
      return {
        padding: '7px',
        borderRadius: '6px',
        border: `2.5px solid ${accent}`,
        outline: `1px solid ${accent}88`,
        outlineOffset: '-5px',
        background: `${accent}18`,
        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
      };
    case 'rounded':
      return {
        padding: '7px',
        borderRadius: '22px',
        border: `2px solid ${accent}`,
        background: `${accent}1c`,
        boxShadow: `0 8px 20px rgba(0,0,0,0.35), inset 0 0 10px ${accent}22`,
      };
    case 'ring':
      return {
        padding: '8px',
        borderRadius: '9999px',
        border: `4px double ${accent}`,
        background: `${accent}18`,
        boxShadow: `0 0 20px ${accent}77, inset 0 0 12px ${accent}33`,
      };
    case 'shield':
      return {
        padding: '8px 10px 14px 10px',
        borderRadius: '14px 14px 46% 46%',
        border: `2.5px solid ${accent}`,
        background: `linear-gradient(180deg, ${accent}38 0%, ${accent}14 100%)`,
        boxShadow: `0 8px 20px ${accent}44`,
      };
    case 'starburst':
      return {
        padding: '9px',
        borderRadius: '18px',
        border: `2px solid ${accent}`,
        background: `${accent}26`,
        boxShadow: `0 0 22px ${accent}66`,
      };
    case 'crown':
      return {
        padding: '8px',
        marginTop: '10px',
        borderRadius: '9999px',
        border: `2.5px solid ${accent}`,
        background: `radial-gradient(circle, ${accent}33 0%, ${accent}12 100%)`,
        boxShadow: `0 -4px 18px ${accent}66`,
      };
    case 'ribbon':
      return {
        padding: '7px 7px 14px 7px',
        borderRadius: '18px',
        border: `2px solid ${accent}`,
        background: `${accent}1c`,
        boxShadow: '0 6px 16px rgba(0,0,0,0.35)',
      };
    case 'circle':
    default:
      return {
        padding: '7px',
        borderRadius: '9999px',
        border: `2.5px solid ${accent}`,
        background: `${accent}1a`,
        boxShadow: `0 4px 14px ${accent}33`,
      };
  }
}

function getHeaderBorderInlineStyle(borderCls: string, accent: string): React.CSSProperties {
  switch (borderCls) {
    case 'crest-border-none':
      return { border: 'none', boxShadow: 'none', outline: 'none' };
    case 'crest-border-double':
      return { border: `4px double ${accent}`, borderRadius: '14px' };
    case 'crest-border-dashed':
      return { border: `2.5px dashed ${accent}`, borderRadius: '14px' };
    case 'crest-border-emblem':
      return { border: `2.5px solid ${accent}`, borderRadius: '28px 8px 28px 8px' };
    case 'crest-border-neon':
      return {
        border: `2px solid ${accent}`,
        borderRadius: '16px',
        boxShadow: `0 0 20px ${accent}88, inset 0 0 16px ${accent}33`,
      };
    case 'crest-border-royal':
      return {
        border: `3px ridge ${accent}`,
        outline: `1.5px solid ${accent}99`,
        outlineOffset: '4px',
        borderRadius: '14px',
      };
    case 'crest-border-clean-glow':
      return {
        border: `1.5px solid ${accent}88`,
        borderRadius: '16px',
        boxShadow: '0 14px 32px rgba(0,0,0,0.5)',
      };
    case 'crest-border-minimal-line':
      return {
        border: 'none',
        borderTop: `3.5px solid ${accent}`,
        borderBottom: `3.5px solid ${accent}`,
        borderRadius: '4px',
      };
    case 'crest-border-gold':
    default:
      return {
        border: `2px solid ${accent}`,
        borderRadius: '14px',
        boxShadow: `inset 0 0 0 3px ${accent}26`,
      };
  }
}

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

  const baseId = bar.crest_base || 'circle';
  const ie = CREST_ICONS.find((x) => x.id === (bar.crest_icon || 'glass'))?.emoji || '🍸';
  const oe = CREST_ORNAMENTS.find((x) => x.id === (bar.crest_ornament || 'none'))?.emoji || '';

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
  const borderInline = getHeaderBorderInlineStyle(borderCls, accent);
  const frameStyle: React.CSSProperties = {
    background: surface,
    color: text,
    position: 'relative',
    ...borderInline,
  };

  const pedestalStyle = getCrestBasePedestalStyle(baseId, accent);

  return (
    <div className="crest-frame" style={frameStyle}>
      {hasBanner && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: borderInline.borderRadius || '14px' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${bar.banner_url}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(11,10,13,.52), ${surface}ee)`,
            }}
          />
        </div>
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
            {baseId === 'starburst' && (
              <span
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  transform: 'rotate(45deg) scale(0.94)',
                  border: `2px solid ${accent}`,
                  background: `${accent}24`,
                  boxShadow: `0 0 18px ${accent}55`,
                }}
                aria-hidden
              />
            )}

            {baseId === 'crown' && (
              <span
                className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 text-base z-[4] drop-shadow"
                aria-hidden
              >
                👑
              </span>
            )}

            <div
              className="relative z-[2] inline-flex items-center justify-center transition-all"
              style={pedestalStyle}
            >
              {bar.logo_url ? (
                <img
                  key={bar.logo_url}
                  src={bar.logo_url}
                  alt={bar.name || 'Logo'}
                  style={{
                    width: `${logoPx}px`,
                    height: `${logoPx}px`,
                    display: 'block',
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
                  <span>{ie}</span>
                </div>
              )}
            </div>

            {baseId === 'ribbon' && (
              <span
                className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-sm text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap z-[4] shadow"
                style={{
                  background: accent,
                  color: '#141115',
                }}
              >
                ✦ OFICIAL ✦
              </span>
            )}

            {/* Emblema / Ornamento do Brasão visível mesmo com logo própria */}
            {(oe || (bar.logo_url && (ie || baseId !== 'none'))) && (
              <span
                className="pointer-events-none absolute -bottom-1.5 -right-2 px-1.5 py-0.5 rounded-full text-[11px] font-bold shadow-md flex items-center gap-0.5 z-[5]"
                style={{
                  background: surface,
                  border: `1.5px solid ${accent}`,
                  color: text,
                }}
              >
                {oe && <span>{oe}</span>}
                {bar.logo_url && <span>{ie}</span>}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            textAlign: textAlignMap[bar.name_pos || 'left'] || 'left',
            marginTop: baseId === 'ribbon' ? '14px' : '10px',
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
