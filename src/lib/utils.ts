import qrcode from 'qrcode-generator';
import type {
  Bar,
  BarItem,
  ItemType,
  MenuDesignConfig,
  MenuPreset,
  MenuPromotion,
  QrDesignConfig,
  Recipe,
  StaffProfile,
  StoreProfileConfig,
  StoreProfilePreset,
  UserCoords,
} from '../types/meubar';
import { canPlayAlertSound, type AlertCategoryKey } from './alertPrefs';
import { AVULSO_CATS, PETISCO_CATS, PLACES_CATALOG, QR_DESIGN_TEMPLATES } from './catalog';

export const money = (v: number | null | undefined): string =>
  'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');

export const norm = (s: string | null | undefined): string =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const today = (): string => new Date().toLocaleDateString('sv-SE');

export function slugHandle(raw: string): string {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28);
}

export function haversineKm(a: { lat: number; lon: number } | null | undefined, b: { lat: number; lon: number } | null | undefined): number {
  if (!a || !b || a.lat == null || b.lat == null) return 99999;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function reverseGeocodeExact(lat: number, lon: number): Promise<string> {
  const fallbackCoord = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&accept-language=pt-BR&addressdetails=1`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (res.ok) {
      const json = (await res.json()) as {
        display_name?: string;
        address?: Record<string, string>;
      };
      const a = json.address || {};
      const street = [a.road || a.pedestrian || a.footway, a.house_number]
        .filter(Boolean)
        .join(', ');
      const hood = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
      const city = a.city || a.town || a.village || a.municipality || '';
      const state = a.state_code || a.state || '';
      const parts = [street, hood, city, state].filter(Boolean);
      if (parts.length >= 2) return parts.join(', ');
      if (json.display_name) {
        return json.display_name
          .split(',')
          .slice(0, 4)
          .map((s) => s.trim())
          .filter(Boolean)
          .join(', ');
      }
    }
  } catch {
    // ignore network/abort errors and use local catalog/coords fallback
  }

  let closest = null as (typeof PLACES_CATALOG)[number] | null;
  let bestKm = 99999;
  for (const p of PLACES_CATALOG) {
    const km = haversineKm({ lat, lon }, p);
    if (km < bestKm) {
      bestKm = km;
      closest = p;
    }
  }
  if (closest && bestKm <= 5) {
    return `${closest.label} (${fallbackCoord})`;
  }
  return fallbackCoord;
}

export function getProximitySuggestions(queryText: string, extraCoords?: UserCoords | null) {
  const origin = extraCoords || { lat: -15.7942, lon: -47.8822 };
  const q = String(queryText || '').trim().toLowerCase();
  let list = PLACES_CATALOG.map((p) => ({
    label: p.label,
    lat: p.lat,
    lon: p.lon,
    km: haversineKm(origin, p),
  }));
  if (q) {
    const matching = list.filter((item) => item.label.toLowerCase().includes(q));
    if (matching.length) list = matching;
  }
  list.sort((a, b) => a.km - b.km);
  return list.slice(0, 6);
}

export function externalMapUrl(placeOrBar?: { lat?: number | null; lon?: number | null; city?: string | null; name?: string | null } | null): string {
  const b = placeOrBar || {};
  if (b.lat != null && b.lon != null) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${Number(b.lat)},${Number(b.lon)}`);
  }
  const q = b.city || b.name || 'Brasil';
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

export function menuUrl(barId: string, tableVal?: string): string {
  const base = window.location.origin + '/menu.html';
  let q = '?bar=' + encodeURIComponent(barId);
  if (tableVal) q += '&mesa=' + encodeURIComponent(tableVal);
  return base + q;
}

export type UiThemeMode = 'dark' | 'light';

const UI_THEME_STORAGE_KEY = 'meubar_ui_theme_mode';

export function getStoredUiThemeMode(): UiThemeMode {
  try {
    const v = localStorage.getItem(UI_THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

export function setStoredUiThemeMode(mode: UiThemeMode): void {
  try {
    localStorage.setItem(UI_THEME_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function parseHexColor(color?: string | null): { r: number; g: number; b: number } | null {
  if (!color) return null;
  const raw = String(color).trim();
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const num = parseInt(h, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(raw);
  if (rgbMatch) {
    return {
      r: Math.min(255, Number(rgbMatch[1])),
      g: Math.min(255, Number(rgbMatch[2])),
      b: Math.min(255, Number(rgbMatch[3])),
    };
  }
  return null;
}

export function getRelativeLuminance(color?: string | null): number {
  const rgb = parseHexColor(color);
  if (!rgb) return 0.05;
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
}

export function isColorLight(color?: string | null): boolean {
  return getRelativeLuminance(color) > 0.38;
}

export function getContrastRatio(c1?: string | null, c2?: string | null): number {
  const l1 = getRelativeLuminance(c1);
  const l2 = getRelativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Garante contraste alto: tema claro -> fonte preta; tema escuro -> fonte branca.
 * Se a cor solicitada já tiver contraste >= 4.5:1 contra o fundo, preserva; caso contrário força o oposto.
 */
export function getContrastingTextColor(
  bgColor?: string | null,
  preferredTextColor?: string | null
): string {
  const bgIsLight = isColorLight(bgColor);
  if (preferredTextColor && parseHexColor(preferredTextColor)) {
    const ratio = getContrastRatio(bgColor, preferredTextColor);
    const prefIsLight = isColorLight(preferredTextColor);
    if (ratio >= 4.5 && bgIsLight !== prefIsLight) {
      return preferredTextColor;
    }
  }
  return bgIsLight ? '#111114' : '#f6f1ea';
}

export function getContrastingMutedColor(bgColor?: string | null): string {
  return isColorLight(bgColor) ? '#4b5563' : '#b2a8ba';
}

export function getContrastingAccentColor(
  accentColor?: string | null,
  bgColor?: string | null
): string {
  const fallback = isColorLight(bgColor) ? '#b45309' : '#e5a93c';
  if (!accentColor || !parseHexColor(accentColor)) return fallback;
  if (getContrastRatio(bgColor, accentColor) >= 3.1) return accentColor;
  return fallback;
}

function rgbaFromColor(color: string, alpha: number, fallback: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return fallback;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function applyBarTheme(bar: Partial<Bar> | null, forcedMode?: UiThemeMode): void {
  const docEl = document.documentElement;
  const root = docEl.style;

  const setTokens = (params: {
    light: boolean;
    bg: string;
    s1: string;
    s2: string;
    tx: string;
    mu: string;
    ac: string;
    ok: string;
    bodyBg: string;
  }) => {
    docEl.classList.toggle('theme-light', params.light);
    docEl.classList.toggle('dark', !params.light);
    root.setProperty('--bg', params.bg);
    root.setProperty('--bg2', params.s2);
    root.setProperty('--s1', params.s1);
    root.setProperty('--s2', params.s2);
    root.setProperty('--sf', params.s1);
    root.setProperty('--sf2', params.s2);
    root.setProperty('--tx', params.tx);
    root.setProperty('--txt', params.tx);
    root.setProperty('--fg', params.tx);
    root.setProperty('--mu', params.mu);
    root.setProperty('--mut', params.mu);
    root.setProperty('--ac', params.ac);
    root.setProperty('--ok', params.ok);
    root.setProperty('--dn', params.light ? '#b91c1c' : '#f87171');
    root.setProperty('--on-ac', isColorLight(params.ac) ? '#111114' : '#ffffff');
    root.setProperty(
      '--bd',
      params.light ? 'rgba(17, 17, 20, 0.14)' : 'rgba(246, 241, 234, 0.12)'
    );
    root.setProperty(
      '--bd-strong',
      rgbaFromColor(params.ac, params.light ? 0.48 : 0.38, 'rgba(229, 169, 60, 0.38)')
    );
    root.setProperty(
      '--top-bg',
      rgbaFromColor(params.bg, 0.9, params.light ? 'rgba(246, 244, 239, 0.92)' : 'rgba(11, 10, 13, 0.88)')
    );
    root.setProperty(
      '--bnav-bg',
      rgbaFromColor(params.s1, 0.96, params.light ? 'rgba(255, 255, 255, 0.96)' : 'rgba(16, 14, 19, 0.95)')
    );
    root.setProperty(
      '--pill-bg',
      params.light ? 'rgba(17, 17, 20, 0.06)' : 'rgba(255, 255, 255, 0.07)'
    );
    root.setProperty(
      '--pill-hover',
      params.light ? 'rgba(17, 17, 20, 0.11)' : 'rgba(255, 255, 255, 0.13)'
    );
    document.body.style.background = params.bodyBg;
  };

  if (forcedMode === 'light') {
    const bg = '#f6f4ef';
    const ac = getContrastingAccentColor(bar?.color_accent, bg);
    const ok = bar?.color_ok && getContrastRatio(bg, bar.color_ok) >= 3.2 ? bar.color_ok : '#047857';
    setTokens({
      light: true,
      bg,
      s1: '#ffffff',
      s2: '#ebe7df',
      tx: '#111114',
      mu: '#4b5563',
      ac,
      ok,
      bodyBg: 'linear-gradient(180deg, #faf8f4 0%, #f3efe8 100%)',
    });
    return;
  }

  if (forcedMode === 'dark') {
    const bg = '#0b0a0d';
    const ac = getContrastingAccentColor(bar?.color_accent, bg);
    const ok = bar?.color_ok && getContrastRatio(bg, bar.color_ok) >= 3.2 ? bar.color_ok : '#34d399';
    setTokens({
      light: false,
      bg,
      s1: '#141218',
      s2: '#1d1a24',
      tx: '#f6f1ea',
      mu: '#b2a8ba',
      ac,
      ok,
      bodyBg: 'radial-gradient(circle at top, #181421 0%, #0b0a0d 52%)',
    });
    return;
  }

  if (!bar) {
    const stored = getStoredUiThemeMode();
    applyBarTheme(null, stored);
    return;
  }

  // Modo automático do bar (ex: Cardápio Público ou Preview no Editor)
  const bg = bar.color_bg || '#0b0a0d';
  const bgIsLight = isColorLight(bg);
  const s1 =
    bar.color_surface && isColorLight(bar.color_surface) === bgIsLight
      ? bar.color_surface
      : bgIsLight
        ? '#ffffff'
        : '#141218';
  const s2 = bgIsLight ? '#eae5dc' : '#1d1a24';
  // Contraste garantido: fundo claro -> fonte preta; fundo escuro -> fonte branca
  const tx = getContrastingTextColor(s1, bar.color_text);
  const mu = getContrastingMutedColor(s1);
  const ac = getContrastingAccentColor(bar.color_accent, s1);
  const ok =
    bar.color_ok && getContrastRatio(s1, bar.color_ok) >= 3.2
      ? bar.color_ok
      : bgIsLight
        ? '#047857'
        : '#34d399';

  setTokens({
    light: bgIsLight,
    bg,
    s1,
    s2,
    tx,
    mu,
    ac,
    ok,
    bodyBg: bg,
  });
}

export function getRecipeItemType(r: Partial<Recipe>): ItemType {
  if (r.item_type === 'petisco' || r.item_type === 'avulso' || r.item_type === 'drink') {
    return r.item_type;
  }
  const tags = Array.isArray(r.tags) ? r.tags : [];
  if (tags.includes('__type:petisco')) return 'petisco';
  if (tags.includes('__type:avulso')) return 'avulso';
  if (r.category && PETISCO_CATS.includes(r.category)) return 'petisco';
  if (r.category && AVULSO_CATS.includes(r.category)) return 'avulso';
  return 'drink';
}

export function getRecipeBarScope(r: Partial<Recipe>): string | null {
  const tags = Array.isArray(r.tags) ? r.tags : [];
  const found = tags.find((t) => typeof t === 'string' && t.startsWith('__bar:'));
  return found ? found.slice(6) : null;
}

export function isRecipeManuallyUnavailable(r: Partial<Recipe>): boolean {
  const tags = Array.isArray(r.tags) ? r.tags : [];
  if (tags.includes('__avail:0')) return true;
  if ((r.ingredients || []).some((i) => i?.n === '__INDISPONIVEL__')) return true;
  return false;
}

export function filterRecipesForBar(recipes: Recipe[], barId?: string | null): Recipe[] {
  return recipes.filter((r) => {
    const scope = getRecipeBarScope(r);
    if (scope && barId && scope !== barId) return false;
    return true;
  });
}

export function recipeTags(r: Partial<Recipe>): string[] {
  if (Array.isArray(r.tags) && r.tags.length) {
    const visible = r.tags.filter((x) => typeof x === 'string' && !x.startsWith('__'));
    if (visible.length) return visible;
  }
  const t: string[] = [];
  if (r.category === 'Refrescantes') t.push('Refrescante', 'Longo');
  if (r.category === 'Fortes') t.push('Forte', 'Curto');
  if (r.category === 'Cítricos') t.push('Ácido');
  if (r.category === 'Tropicais') t.push('Tropical');
  if (r.category === 'Doces & Frutados') t.push('Doce', 'Frutado');
  if (r.category === 'Aperitivos') t.push('Aperitivo');
  return t;
}

export function matchRecipeTags(r: Recipe, selectedTags: Set<string>): boolean {
  if (!selectedTags.size) return true;
  const t = new Set(recipeTags(r));
  for (const x of selectedTags) {
    if (!t.has(x)) return false;
  }
  return true;
}

export function isFreeIngredient(raw: string | null | undefined): boolean {
  const n = norm(raw);
  if (!n) return true;
  if (
    n === 'gelo' ||
    n === 'agua' ||
    n === 'agua gelada' ||
    n === 'agua filtrada' ||
    n === 'agua mineral'
  ) {
    return true;
  }
  return n.startsWith('gelo ') || n.startsWith('agua gelada');
}

export function stockMatch(stockName: string, ingredientName: string): boolean {
  const h = norm(stockName);
  const req = norm(ingredientName);
  if (!h || !req) return false;
  return (
    h === req ||
    h.startsWith(req + ' ') ||
    h.startsWith(req + '-') ||
    h.startsWith(req + '/') ||
    h.startsWith(req + '(') ||
    h.startsWith(req + ' (')
  );
}

export function isStockItemAvailable(item: BarItem): boolean {
  if (!item.in_stock) return false;
  if (item.qty != null && Number(item.qty) <= 0) return false;
  return true;
}

export function getMissingIngredientsForRecipe(recipe: Recipe, items: BarItem[]): string[] {
  if (isRecipeManuallyUnavailable(recipe)) return ['Indisponível'];
  const activeItems = items.filter((i) => isStockItemAvailable(i));
  const haveList = activeItems.map((i) => norm(i.name)).filter(Boolean);
  const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  // Se for um item cadastrado sem lista de ingredientes (ex.: Chopp / Cerveja avulsa),
  // verifica se existe item correspondente no estoque marcado como esgotado/zerado.
  if (ings.length === 0 && recipe.name) {
    const relatedStock = items.filter(
      (i) => stockMatch(i.name, recipe.name) || stockMatch(recipe.name, i.name)
    );
    if (relatedStock.length > 0 && !relatedStock.some((i) => isStockItemAvailable(i))) {
      return [recipe.name];
    }
    return [];
  }

  const missing: string[] = [];
  for (const ing of ings) {
    const raw = (ing?.n || '').trim();
    const req = norm(raw);
    if (!req || isFreeIngredient(req)) continue;
    const matched = haveList.some(
      (h) =>
        h === req ||
        h.startsWith(req + ' ') ||
        h.startsWith(req + '-') ||
        h.startsWith(req + '/') ||
        h.startsWith(req + '(') ||
        h.startsWith(req + ' (')
    );
    if (!matched && !missing.includes(raw)) {
      missing.push(raw);
    }
  }
  return missing;
}

export function makeDrink(recipe: Recipe, items: BarItem[]): boolean {
  if (isRecipeManuallyUnavailable(recipe)) return false;
  return getMissingIngredientsForRecipe(recipe, items).length === 0;
}

export function estimateRecipeCost(recipe: Recipe, items: BarItem[], bar?: Bar | null): number {
  if (Number(recipe.base_cost) > 0) return Number(recipe.base_cost);
  const itemMap: Record<string, BarItem> = {};
  const costBasisMap = bar?.ops_data?.stock_cost_basis || {};
  items.forEach((it) => {
    itemMap[norm(it.name)] = it;
  });
  let sum = 0;
  (recipe.ingredients || []).forEach((ing) => {
    const k = norm(ing.n);
    const it = itemMap[k];
    if (!it || !(Number(it.unit_cost) > 0)) return;
    const rawCost = Number(it.unit_cost);
    const basis = it.cost_basis || costBasisMap[it.id] || it.unit || '';
    const qStr = norm(ing.q || '');
    const mlMatch = qStr.match(/(\d+(?:[.,]\d+)?)\s*ml/);
    const mlUsed = mlMatch ? Number(mlMatch[1].replace(',', '.')) : 0;

    if ((basis === 'garrafa' || basis === 'lata' || (!basis && (it.size_ml || 0) >= 150)) && (it.size_ml || 750) > 0) {
      const bottleMl = Number(it.size_ml) || (basis === 'lata' ? 350 : 750);
      const portion = mlUsed > 0 ? mlUsed : qStr.includes('completar') ? 150 : 50;
      sum += (rawCost * Math.min(portion, bottleMl)) / bottleMl;
    } else if (basis === 'litro') {
      const portion = mlUsed > 0 ? mlUsed : 120;
      sum += (rawCost * portion) / 1000;
    } else if (basis === '100ml') {
      const portion = mlUsed > 0 ? mlUsed : 50;
      sum += (rawCost * portion) / 100;
    } else if (basis === 'kg') {
      sum += rawCost * (k.includes('acucar') || k === 'sal' ? 0.03 : 0.09);
    } else if (basis === '100g') {
      sum += rawCost * 0.5;
    } else if (basis === 'maco') {
      sum += rawCost * 0.15;
    } else if (basis === 'unidade') {
      sum += rawCost * (k.includes('abacaxi') || k.includes('melancia') ? 0.12 : 0.35);
    } else if (basis === 'pote' || basis === 'pacote' || basis === 'bandeja' || basis === 'g') {
      sum += rawCost * 0.12;
    } else {
      sum += rawCost;
    }
  });
  return sum > 0 ? Math.round(sum * 100) / 100 : Number(bar?.base_cost) > 0 ? Number(bar?.base_cost) : 6;
}

export function suggestedPrice(recipe: Recipe, items: BarItem[], bar: Bar | null, markup: number): number {
  const cost = estimateRecipeCost(recipe, items, bar);
  return Math.ceil(cost * Math.max(1.2, Number(markup) || 2.8) * 2) / 2;
}

export const DEFAULT_MENU_DESIGN = {
  bg_pattern: 'radial',
  bg_color_2: '#1b1626',
  logo_size: 'md' as const,
  logo_shape: 'rounded',
  logo_offset_x: 0,
  logo_offset_y: 0,
  top_ornament: 'classic-filigree',
  footer_ornament: 'divider-gold',
  footer_text: 'Feito na hora · Peça pelo celular',
  side_detail: 'thin-gold',
  section_style: 'clean',
  price_style: 'clean',
  card_style: 'glass' as const,
  block_order: ['header', 'promo', 'filters', 'drinks', 'footer'] as (
    | 'header'
    | 'promo'
    | 'filters'
    | 'drinks'
    | 'footer'
  )[],
};

export const DEFAULT_STORE_PROFILE: StoreProfileConfig = {
  about: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  website: '',
  opening_hours: '',
  address_details: '',
  amenities: [],
  extra_banners: [],
  bg_pattern: 'radial',
  bg_color_2: '#1b1626',
  banner_height: 'md',
  banner_overlay: 'gradient',
  logo_shape: 'rounded',
  logo_size: 'md',
  card_style: 'glass',
  top_ornament: 'classic-filigree',
  side_detail: 'thin-gold',
  badge_text: 'BAR & COQUETELARIA',
  show_jobs: true,
  show_map: true,
};

export function getUnpricedAvailableDrinks(
  recipes: Recipe[],
  items: BarItem[],
  prices: Record<string, number>,
  bar: Partial<Bar> | null | undefined
): Recipe[] {
  if (!bar || bar.kind === 'home' || bar.kind === 'casa') return [];
  return filterRecipesForBar(recipes, bar.id).filter(
    (r) => makeDrink(r, items) && prices[r.id] == null
  );
}

export function getMissingBarFields(bar: Partial<Bar> | null | undefined): string[] {
  if (!bar) return ['Dados da loja'];
  const missing: string[] = [];
  if (!bar.name || bar.name.trim().length < 2) missing.push('Nome da loja');
  if (!bar.handle || bar.handle.trim().length < 3) missing.push('@ único da loja');
  if (!bar.city || !bar.city.trim()) missing.push('Localização exata da loja');
  if (!bar.slogan || !bar.slogan.trim()) missing.push('Slogan / descrição curta');
  if (!bar.logo_url || !bar.logo_url.trim()) missing.push('Logo da loja');
  return missing;
}

export function getMissingProfileFields(profile: Partial<StaffProfile> | null | undefined): string[] {
  if (!profile) return ['Currículo completo'];
  const missing: string[] = [];
  if (!profile.display_name || profile.display_name.trim().length < 2) missing.push('Nome profissional');
  if (!profile.location || !profile.location.trim()) missing.push('Localidade exata');
  if (!profile.availability || !profile.availability.trim()) missing.push('Disponibilidade');
  if (!Array.isArray(profile.skills) || profile.skills.length === 0) missing.push('Qualidades / funções');
  if (!profile.bio || !profile.bio.trim()) missing.push('Resumo profissional');
  return missing;
}

function parseRawPresets(bar: Partial<Bar> | null | undefined): MenuPreset[] {
  const p = bar?.menu_presets;
  if (!p) return [];
  if (typeof p === 'string') {
    try {
      const parsed = JSON.parse(p);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(p) ? p : [];
}

export function getStudioMeta(bar: Partial<Bar> | null | undefined): MenuPreset | undefined {
  return parseRawPresets(bar).find((x) => x.id === '__studio_meta__');
}

export function getMenuPresets(bar: Partial<Bar> | null | undefined): MenuPreset[] {
  return parseRawPresets(bar).filter(
    (x) => x.id !== '__studio_meta__' && x.id !== '__ops_meta__'
  );
}

export function getBarMenuDesign(bar: Partial<Bar> | null | undefined) {
  const meta = getStudioMeta(bar);
  const raw = bar?.menu_design || meta?.menu_design || {};
  return {
    ...DEFAULT_MENU_DESIGN,
    ...raw,
    block_order:
      Array.isArray(raw.block_order) && raw.block_order.length
        ? raw.block_order
        : DEFAULT_MENU_DESIGN.block_order,
  };
}

export function getBarPromotions(bar: Partial<Bar> | null | undefined): MenuPromotion[] {
  if (Array.isArray(bar?.menu_promotions) && bar.menu_promotions.length) {
    return bar.menu_promotions;
  }
  const meta = getStudioMeta(bar);
  return Array.isArray(meta?.promotions) ? meta.promotions : [];
}

export function getActivePromotion(bar: Partial<Bar> | null | undefined) {
  const promos = getBarPromotions(bar);
  const meta = getStudioMeta(bar);
  const activeId = bar?.active_promotion_id ?? meta?.active_promotion_id ?? null;
  if (activeId) {
    const found = promos.find((p) => p.id === activeId);
    if (found) return found;
  }
  return promos.find((p) => p.active) || null;
}

export function getStoreProfileConfig(bar: Partial<Bar> | null | undefined): StoreProfileConfig {
  const meta = getStudioMeta(bar);
  const raw = bar?.store_profile_data || meta?.store_profile_data || {};
  return {
    ...DEFAULT_STORE_PROFILE,
    ...raw,
    about: raw.about ?? bar?.about ?? '',
    phone: raw.phone ?? bar?.phone ?? '',
    instagram: raw.instagram ?? bar?.instagram ?? '',
    opening_hours: raw.opening_hours ?? bar?.opening_hours ?? '',
    amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
    extra_banners: Array.isArray(raw.extra_banners) ? raw.extra_banners : [],
  };
}

export function getStoreProfiles(bar: Partial<Bar> | null | undefined): StoreProfilePreset[] {
  if (Array.isArray(bar?.store_profiles) && bar.store_profiles.length) {
    return bar.store_profiles;
  }
  const meta = getStudioMeta(bar);
  return Array.isArray(meta?.store_profiles) ? meta.store_profiles : [];
}

export function getActiveStoreProfileId(bar: Partial<Bar> | null | undefined): string {
  const meta = getStudioMeta(bar);
  return bar?.active_store_profile || meta?.active_store_profile || '';
}

export function getQrDesigns(bar: Partial<Bar> | null | undefined): QrDesignConfig[] {
  if (Array.isArray(bar?.qr_designs) && bar.qr_designs.length) {
    return bar.qr_designs;
  }
  const meta = getStudioMeta(bar);
  return Array.isArray(meta?.qr_designs) ? meta.qr_designs : [];
}

export function getActiveQrDesign(bar: Partial<Bar> | null | undefined): QrDesignConfig {
  const list = getQrDesigns(bar);
  const meta = getStudioMeta(bar);
  const activeId = bar?.active_qr_design || meta?.active_qr_design || '';
  if (activeId) {
    const found = list.find((d) => d.id === activeId);
    if (found) return found;
    const tpl = QR_DESIGN_TEMPLATES.find((t) => t.id === activeId);
    if (tpl) return tpl;
  }
  if (list.length > 0) return list[0];
  const sp = getStoreProfileConfig(bar);
  return {
    ...QR_DESIGN_TEMPLATES[0],
    bg_color: bar?.color_bg || '#0b090e',
    card_color: bar?.color_surface || '#16131c',
    accent_color: bar?.color_accent || '#e5b84b',
    text_color: bar?.color_text || '#f8f2e4',
    phone_text: sp.phone || sp.whatsapp || '',
    instagram_text: sp.instagram || (bar?.handle ? `@${bar.handle}` : ''),
  };
}

export function buildUnifiedStudioPresets(
  bar: Partial<Bar> | null | undefined,
  overrides: {
    userPresets?: MenuPreset[];
    menu_design?: MenuDesignConfig;
    promotions?: MenuPromotion[];
    active_promotion_id?: string | null;
    store_profile_data?: StoreProfileConfig;
    store_profiles?: StoreProfilePreset[];
    active_store_profile?: string | null;
    qr_designs?: QrDesignConfig[];
    active_qr_design?: string | null;
  }
): MenuPreset[] {
  const userPresets = (overrides.userPresets ?? getMenuPresets(bar)).filter(
    (x) => x.id !== '__studio_meta__' && x.id !== '__ops_meta__'
  );
  const existingOps = parseRawPresets(bar).find((x) => x.id === '__ops_meta__');
  const meta: MenuPreset = {
    id: '__studio_meta__',
    preset_name: '__studio_meta__',
    menu_design: overrides.menu_design ?? getBarMenuDesign(bar),
    promotions: overrides.promotions ?? getBarPromotions(bar),
    active_promotion_id:
      overrides.active_promotion_id !== undefined
        ? overrides.active_promotion_id
        : getActivePromotion(bar)?.id ?? null,
    store_profile_data: overrides.store_profile_data ?? getStoreProfileConfig(bar),
    store_profiles: overrides.store_profiles ?? getStoreProfiles(bar),
    active_store_profile:
      overrides.active_store_profile !== undefined
        ? overrides.active_store_profile
        : getActiveStoreProfileId(bar) || null,
    qr_designs: overrides.qr_designs ?? getQrDesigns(bar),
    active_qr_design:
      overrides.active_qr_design !== undefined
        ? overrides.active_qr_design
        : bar?.active_qr_design ?? getStudioMeta(bar)?.active_qr_design ?? null,
  };
  return existingOps ? [...userPresets, meta, existingOps] : [...userPresets, meta];
}

export function getPromoAdjustedPrice(
  basePrice: number | null | undefined,
  category: string | undefined,
  promo: MenuPromotion | null | undefined
): { finalPrice: number | null; originalPrice: number | null; discounted: boolean } {
  if (basePrice == null) return { finalPrice: null, originalPrice: null, discounted: false };
  const num = Number(basePrice);
  if (!promo || promo.type !== 'discount_pct' || !promo.discount_pct || promo.discount_pct <= 0) {
    return { finalPrice: num, originalPrice: null, discounted: false };
  }
  if (
    promo.target_category &&
    promo.target_category !== 'Todas' &&
    promo.target_category !== category
  ) {
    return { finalPrice: num, originalPrice: null, discounted: false };
  }
  const pct = Math.min(90, Math.max(1, Number(promo.discount_pct)));
  const finalPrice = Math.max(0.5, Math.round(num * (1 - pct / 100) * 100) / 100);
  return { finalPrice, originalPrice: num, discounted: finalPrice < num };
}

export function parseShakers(raw: number[] | number | null | undefined): number[] {
  if (Array.isArray(raw) && raw.length) {
    return raw.map((n) => Number(n)).filter((n) => n > 0);
  }
  if (typeof raw === 'number' && raw > 0) {
    if (raw <= 20) {
      return Array.from({ length: raw }, (_, idx) => (idx % 2 === 0 ? 750 : 500));
    }
    return [raw];
  }
  return [750, 500];
}

export function formatShakers(raw: number[] | number | null | undefined): string {
  const list = parseShakers(raw);
  return list.map((s) => `${s} ml`).join(', ');
}

export function beep(freq = 740, duration = 0.45, category?: AlertCategoryKey): void {
  if (!canPlayAlertSound(category)) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const c = new AudioCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.22, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.start();
    o.stop(c.currentTime + duration);
  } catch {
    // ignore audio restriction errors
  }
}

export function generateQrDataUrl(text: string, cellSize = 6, margin = 2): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(cellSize, margin);
}

export function generatePrintableQrPng(text: string, title: string, subtitle?: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const size = 560;
  const pad = 48;
  const qrSize = size - pad * 2;
  const cell = qrSize / count;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return qr.createDataURL(6, 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#111111';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(Math.floor(pad + c * cell), Math.floor(pad + r * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
  }

  ctx.fillStyle = '#141218';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, size / 2, size + 32, size - 40);

  if (subtitle) {
    ctx.fillStyle = '#555555';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(subtitle, size / 2, size + 70, size - 40);
  }

  ctx.fillStyle = '#888888';
  ctx.font = '15px sans-serif';
  ctx.fillText('Aponte a câmera para ver o cardápio', size / 2, size + 102);

  return canvas.toDataURL('image/png');
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImageSafe(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const tid = setTimeout(() => resolve(null), 4000);
    img.onload = () => {
      clearTimeout(tid);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(tid);
      resolve(null);
    };
    img.src = src;
  });
}

export async function generateCustomQrPosterPng(
  url: string,
  bar: Partial<Bar>,
  design: QrDesignConfig,
  tableLabel?: string
): Promise<string> {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();

  const W = 900;
  const H = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return generatePrintableQrPng(url, bar.name || 'Meu Bar', tableLabel);

  const bg1 = design.bg_color || '#0b090e';
  const bg2 = design.bg_color_2 || '#1e1624';
  const accent = design.accent_color || '#e5b84b';
  const textCol = design.text_color || '#f8f2e4';
  const cardCol = design.card_color || '#16131c';
  const qrFg = design.qr_fg_color || '#111111';
  const qrBg = design.qr_bg_color || '#ffffff';

  // 1. Background
  if (design.bg_pattern === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, bg1);
    g.addColorStop(1, bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else if (design.bg_pattern === 'radial') {
    const g = ctx.createRadialGradient(W / 2, H * 0.36, 60, W / 2, H * 0.45, W * 0.85);
    g.addColorStop(0, bg2);
    g.addColorStop(1, bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = bg1;
    ctx.fillRect(0, 0, W, H);
  }

  if (design.bg_pattern === 'dots') {
    ctx.fillStyle = `${accent}22`;
    for (let y = 32; y < H; y += 44) {
      for (let x = 32; x < W; x += 44) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (design.bg_pattern === 'stripes') {
    ctx.strokeStyle = `${accent}18`;
    ctx.lineWidth = 14;
    for (let i = -H; i < W + H; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
  }

  // 2. Frame around poster
  if (design.frame_style !== 'none') {
    ctx.save();
    if (design.frame_style === 'neon') {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 5;
      drawRoundedRect(ctx, 38, 38, W - 76, H - 76, 36);
      ctx.stroke();
    } else if (design.frame_style === 'double' || design.frame_style === 'gold') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, 36, 36, W - 72, H - 72, 24);
      ctx.stroke();
      ctx.strokeStyle = `${accent}88`;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 54, 54, W - 108, H - 108, 18);
      ctx.stroke();
    } else if (design.frame_style === 'vintage') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 2;
      ctx.strokeRect(58, 58, W - 116, H - 116);
    } else if (design.frame_style === 'rounded') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      drawRoundedRect(ctx, 42, 42, W - 84, H - 84, 56);
      ctx.stroke();
    } else {
      ctx.strokeStyle = `${accent}66`;
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 44, 44, W - 88, H - 88, 20);
      ctx.stroke();
    }
    ctx.restore();
  }

  let curY = 104;

  // 3. Top badge
  if (design.badge_text?.trim()) {
    const bTxt = design.badge_text.trim().toUpperCase();
    ctx.font = 'bold 20px sans-serif';
    const tw = Math.min(W - 200, ctx.measureText(bTxt).width + 56);
    ctx.fillStyle = accent;
    drawRoundedRect(ctx, (W - tw) / 2, curY - 26, tw, 40, 20);
    ctx.fill();
    ctx.fillStyle = '#121015';
    ctx.textAlign = 'center';
    ctx.fillText(bTxt, W / 2, curY + 1, tw - 24);
    curY += 54;
  }

  // 4. Logo
  if (design.show_logo && bar.logo_url) {
    const logoImg = await loadImageSafe(bar.logo_url);
    if (logoImg) {
      const logoSize = 116;
      const lx = (W - logoSize) / 2;
      const ly = curY;
      ctx.save();
      drawRoundedRect(ctx, lx, ly, logoSize, logoSize, 26);
      ctx.clip();
      ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
      ctx.restore();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      drawRoundedRect(ctx, lx, ly, logoSize, logoSize, 26);
      ctx.stroke();
      curY += logoSize + 34;
    }
  }

  // 5. Store Name
  ctx.textAlign = 'center';
  if (design.show_name) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 54px Georgia, serif';
    ctx.fillText(bar.name || 'Meu Bar', W / 2, curY + 22, W - 140);
    curY += 52;
  }

  // 6. Slogan
  if (design.show_slogan && bar.slogan) {
    ctx.fillStyle = `${textCol}cc`;
    ctx.font = 'italic 24px Georgia, serif';
    ctx.fillText(bar.slogan, W / 2, curY + 18, W - 160);
    curY += 44;
  }

  // 7. Headline & Subheadline
  curY += 12;
  if (design.headline?.trim()) {
    ctx.fillStyle = textCol;
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(design.headline.trim(), W / 2, curY + 16, W - 140);
    curY += 44;
  }
  if (design.subheadline?.trim()) {
    ctx.fillStyle = `${textCol}b8`;
    ctx.font = '22px sans-serif';
    ctx.fillText(design.subheadline.trim(), W / 2, curY + 12, W - 150);
    curY += 38;
  }

  // 8. QR Card + QR Square
  const qrOuterSize = 460;
  const qrPad = 30;
  const qrBoxX = (W - qrOuterSize) / 2;
  const qrBoxY = Math.max(curY + 16, 440);

  ctx.save();
  ctx.fillStyle = qrBg;
  if (design.frame_style === 'neon') {
    ctx.shadowColor = accent;
    ctx.shadowBlur = 22;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
  }
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrOuterSize, qrOuterSize, 28);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrOuterSize, qrOuterSize, 28);
  ctx.stroke();

  const qrDrawSize = qrOuterSize - qrPad * 2;
  const cell = qrDrawSize / count;
  ctx.fillStyle = qrFg;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(
          Math.floor(qrBoxX + qrPad + c * cell),
          Math.floor(qrBoxY + qrPad + r * cell),
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }
  }

  let belowY = qrBoxY + qrOuterSize + 44;

  // 9. Table pill
  if (design.show_table) {
    const tblText = tableLabel?.trim() ? `🪑 ${tableLabel.trim()}` : '📱 CARDÁPIO GERAL';
    ctx.font = 'bold 28px sans-serif';
    const pillW = Math.min(W - 180, Math.max(260, ctx.measureText(tblText).width + 64));
    ctx.fillStyle = cardCol;
    drawRoundedRect(ctx, (W - pillW) / 2, belowY - 32, pillW, 52, 26);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, (W - pillW) / 2, belowY - 32, pillW, 52, 26);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillText(tblText, W / 2, belowY + 3, pillW - 24);
    belowY += 56;
  }

  // 10. Info lines (Phone, Instagram, Wi-Fi, Custom Note)
  const sp = getStoreProfileConfig(bar);
  const infoLines: string[] = [];
  const phoneVal = (design.phone_text || sp.phone || sp.whatsapp || '').trim();
  const instaVal = (design.instagram_text || sp.instagram || (bar.handle ? `@${bar.handle}` : '')).trim();

  if (design.show_phone && phoneVal) infoLines.push(`📞 ${phoneVal}`);
  if (design.show_instagram && instaVal) {
    infoLines.push(`📸 ${instaVal.startsWith('@') ? instaVal : '@' + instaVal}`);
  }
  if (design.show_wifi && (design.wifi_name || design.wifi_pass)) {
    infoLines.push(
      `📶 Wi-Fi: ${design.wifi_name || 'Rede do Bar'}${design.wifi_pass ? ` · Senha: ${design.wifi_pass}` : ''}`
    );
  }

  if (infoLines.length > 0) {
    ctx.fillStyle = textCol;
    ctx.font = 'bold 24px sans-serif';
    infoLines.forEach((line) => {
      ctx.fillText(line, W / 2, belowY + 12, W - 140);
      belowY += 38;
    });
  }

  if (design.custom_note?.trim()) {
    ctx.fillStyle = accent;
    ctx.font = '600 22px sans-serif';
    ctx.fillText(design.custom_note.trim(), W / 2, belowY + 12, W - 140);
    belowY += 36;
  }

  // 11. Footer
  if (design.footer_text?.trim()) {
    ctx.fillStyle = `${textCol}99`;
    ctx.font = '20px sans-serif';
    ctx.fillText(design.footer_text.trim(), W / 2, Math.min(H - 74, belowY + 26), W - 140);
  }

  return canvas.toDataURL('image/png');
}
