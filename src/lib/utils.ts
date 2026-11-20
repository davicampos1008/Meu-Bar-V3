import qrcode from 'qrcode-generator';
import type { Bar, BarItem, MenuPreset, Recipe, StaffProfile, UserCoords } from '../types/meubar';
import { PLACES_CATALOG } from './catalog';

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

export function applyBarTheme(bar: Partial<Bar> | null): void {
  const root = document.documentElement.style;
  if (!bar) {
    ['--bg', '--s1', '--ac', '--ok', '--tx'].forEach((k) => root.removeProperty(k));
    document.body.style.background = '';
    return;
  }
  if (bar.color_bg) {
    root.setProperty('--bg', bar.color_bg);
    document.body.style.background = bar.color_bg;
  } else {
    root.removeProperty('--bg');
    document.body.style.background = '';
  }
  if (bar.color_surface) root.setProperty('--s1', bar.color_surface);
  else root.removeProperty('--s1');
  if (bar.color_accent) root.setProperty('--ac', bar.color_accent);
  else root.removeProperty('--ac');
  if (bar.color_ok) root.setProperty('--ok', bar.color_ok);
  else root.removeProperty('--ok');
  if (bar.color_text) root.setProperty('--tx', bar.color_text);
  else root.removeProperty('--tx');
}

export function recipeTags(r: Partial<Recipe>): string[] {
  if (Array.isArray(r.tags) && r.tags.length) return r.tags;
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

export function getMissingIngredientsForRecipe(recipe: Recipe, items: BarItem[]): string[] {
  const haveList = items.filter((i) => i.in_stock).map((i) => norm(i.name)).filter(Boolean);
  const missing: string[] = [];
  for (const ing of recipe.ingredients || []) {
    const raw = (ing?.n || '').trim();
    const req = norm(raw);
    if (!req || isFreeIngredient(req)) continue;
    const matched = haveList.some((h) => h === req || h.startsWith(req + ' '));
    if (!matched && !missing.includes(raw)) {
      missing.push(raw);
    }
  }
  return missing;
}

export function makeDrink(recipe: Recipe, items: BarItem[]): boolean {
  return getMissingIngredientsForRecipe(recipe, items).length === 0;
}

export function estimateRecipeCost(recipe: Recipe, items: BarItem[], bar?: Bar | null): number {
  if (Number(recipe.base_cost) > 0) return Number(recipe.base_cost);
  const costMap: Record<string, number> = {};
  items.forEach((it) => {
    costMap[norm(it.name)] = Number(it.unit_cost) || 0;
  });
  let sum = 0;
  (recipe.ingredients || []).forEach((ing) => {
    const k = norm(ing.n);
    if (costMap[k]) sum += costMap[k];
  });
  return sum > 0 ? sum : Number(bar?.base_cost) > 0 ? Number(bar?.base_cost) : 6;
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

export function getUnpricedAvailableDrinks(
  recipes: Recipe[],
  items: BarItem[],
  prices: Record<string, number>,
  bar: Partial<Bar> | null | undefined
): Recipe[] {
  if (!bar || bar.kind === 'home' || bar.kind === 'casa') return [];
  return recipes.filter((r) => makeDrink(r, items) && prices[r.id] == null);
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
  if (!profile.avatar_url || !profile.avatar_url.trim()) missing.push('Foto de rosto');
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

export function getMenuPresets(bar: Partial<Bar> | null | undefined): MenuPreset[] {
  return parseRawPresets(bar).filter((x) => x.id !== '__studio_meta__');
}

export function getBarMenuDesign(bar: Partial<Bar> | null | undefined) {
  const meta = parseRawPresets(bar).find((x) => x.id === '__studio_meta__');
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

export function getBarPromotions(bar: Partial<Bar> | null | undefined) {
  if (Array.isArray(bar?.menu_promotions) && bar.menu_promotions.length) {
    return bar.menu_promotions;
  }
  const meta = parseRawPresets(bar).find((x) => x.id === '__studio_meta__') as
    | (MenuPreset & { promotions?: import('../types/meubar').MenuPromotion[] })
    | undefined;
  return Array.isArray(meta?.promotions) ? meta.promotions : [];
}

export function getActivePromotion(bar: Partial<Bar> | null | undefined) {
  const promos = getBarPromotions(bar);
  const meta = parseRawPresets(bar).find((x) => x.id === '__studio_meta__');
  const activeId = bar?.active_promotion_id ?? meta?.active_promotion_id ?? null;
  if (activeId) {
    const found = promos.find((p) => p.id === activeId);
    if (found) return found;
  }
  return promos.find((p) => p.active) || null;
}

export function getPromoAdjustedPrice(
  basePrice: number | null | undefined,
  category: string | undefined,
  promo: import('../types/meubar').MenuPromotion | null | undefined
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

export function beep(freq = 740, duration = 0.45): void {
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
