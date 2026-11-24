import dns from 'node:dns/promises';
import net from 'node:net';

const SUPER_ADMIN_EMAIL = 'nygames92@gmail.com';
const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://ikyxhwyqbknwjugwdlfp.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_bs4eqPwTL4LEMi2ZiB-ROA_eTVoX1ll';

export type QualityPreset = 'hd' | 'ultra' | 'studio' | 'all';
export type OrientationPreset = 'any' | 'square' | 'landscape' | 'portrait';

export interface ImageSearchResult {
  id: string;
  title: string;
  source: 'Web Pro' | 'Wikimedia Commons' | 'TheCocktailDB';
  domain: string;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  score: number;
  badge: string;
}

const BLOCKED_IMAGE_DOMAINS = [
  'shutterstock.com',
  'istockphoto.com',
  'alamy.com',
  '123rf.com',
  'depositphotos.com',
  'dreamstime.com',
  'gettyimages.com',
  'vecteezy.com',
  'ftcdn.net',
  'stock.adobe.com',
  'canstockphoto.com',
  'bigstockphoto.com',
  'pond5.com',
  'cleanpng.com',
  'pngtree.com',
  'pngwing.com',
  'klipartz.com',
  'clipartmax.com',
  'kindpng.com',
  'freepik.com/premium',
  'fbsbx.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
];

const TRUSTED_DRINK_DOMAINS = [
  'liquor.com',
  'diffordsguide.com',
  'punchdrink.com',
  'imbibemagazine.com',
  'bonappetit.com',
  'seriouseats.com',
  'foodandwine.com',
  'nytimes.com',
  'bbcgoodfood.com',
  'delish.com',
  'thespruceeats.com',
  'acouplecooks.com',
  'cocktailpartyapp.com',
  'upload.wikimedia.org',
  'images.unsplash.com',
  'images.pexels.com',
  'thecocktaildb.com',
  'tasteofhome.com',
  'supercall.com',
  'receiteria.com.br',
  'tudogostoso.com.br',
  'panelinha.com.br',
];

const BLOCKED_AD_AND_PRODUCT_DOMAINS = [
  'mercadolivre.com',
  'mercadolibre.com',
  'amazon.com',
  'shopee.com',
  'magazineluiza.com',
  'magalu.com',
  'americanas.com',
  'submarino.com',
  'casasbahia.com',
  'carrefour.com',
  'paodeacucar.com',
  'extra.com.br',
  'walmart.com',
  'target.com',
  'ebay.com',
  'aliexpress.com',
  'imigrantesbebidas.com',
  'bebidasfamosas.com',
  'totalwine.com',
  'drizly.com',
  'reservebar.com',
  'wine.com',
  'evino.com',
  'divvino.com',
  'clubedomalte.com',
  'ze.delivery',
  'rappi.com',
  'ifood.com',
  'canva.com',
  'postermywall.com',
  'behance.net/gallery',
];

export async function verifySuperAdminBearerToken(
  authHeaderRaw?: string | string[]
): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  const authHeader = String(Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw || '').trim();
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || '';
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'Acesso restrito: faça login como administrador autorizado para pesquisar imagens.',
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const baseUrl = SUPABASE_URL.replace(/\/$/, '');
    const res = await fetch(`${baseUrl}/auth/v1/user`, {
      signal: ctrl.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        status: 401,
        error: 'Sessão inválida ou expirada. Faça login novamente.',
      };
    }
    const user = (await res.json()) as { email?: string; aud?: string; role?: string };
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) {
      return {
        ok: false,
        status: 403,
        error: 'Conta sem e-mail verificado para pesquisa de imagens.',
      };
    }
    if (email === SUPER_ADMIN_EMAIL) {
      return { ok: true, email };
    }

    // Verifica delegação granular em platform_settings
    const cfgRes = await fetch(
      `${baseUrl}/rest/v1/platform_settings?id=eq.default&select=config`,
      {
        signal: ctrl.signal,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (cfgRes.ok) {
      const rows = (await cfgRes.json()) as Array<{
        config?: {
          admin_delegates?: Record<
            string,
            { active?: boolean; permissions?: Record<string, boolean> }
          >;
        };
      }>;
      const delegate = rows?.[0]?.config?.admin_delegates?.[email];
      if (delegate && delegate.active !== false && delegate.permissions?.search_recipe_images) {
        return { ok: true, email };
      }
    }

    return {
      ok: false,
      status: 403,
      error: 'Pesquisa e atualização de imagens permitidas apenas para contas ADM autorizadas.',
    };
  } catch {
    return {
      ok: false,
      status: 503,
      error: 'Não foi possível validar a permissão de administrador agora.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function isBlockedProUrl(rawUrl: string, titleAndPage: string, proOnly: boolean): boolean {
  const u = rawUrl.toLowerCase();
  const t = titleAndPage.toLowerCase();
  const combined = `${u} ${t}`;
  if (!u.startsWith('http://') && !u.startsWith('https://')) return true;
  if (u.endsWith('.svg') || u.includes('.svg?') || u.includes('data:image/svg')) return true;
  if (!proOnly) return false;

  for (const dom of BLOCKED_IMAGE_DOMAINS) {
    if (u.includes(dom)) return true;
  }
  for (const dom of BLOCKED_AD_AND_PRODUCT_DOMAINS) {
    if (u.includes(dom)) return true;
  }
  if (
    /\/ai-image\/|ai-generated|generated-by-ai|midjourney|dall-e|stable-diffusion|freepik\.com\/.*(premium-ai|psd|vetores)|vector|clipart|cartoon|illustration|ilustracao|coloring-page|desenho|watermark/i.test(
      combined
    )
  ) {
    return true;
  }
  // Bloquear fotos de garrafas, latas, embalagens de bebida, propagandas e anúncios de loja
  if (
    /\b(garrafa|garrafas|bottle|bottles|bottled|packshot|engradado|fardo|embalagem|caixa com|lata de|em lata|canned|beverage can|soda can|beer can|oferta|ofertas|promocao|promocoes|promoção|promoções|desconto|frete gratis|frete grátis|compre|comprar|atacado|varejo|supermercado|distribuidora|propaganda|anuncio|anúncio|banner|flyer|panfleto|cartaz|mockup|template|rotulo|rótulo|label design|750ml|700ml|900ml|1000ml|350ml|269ml|473ml)\b/i.test(
      combined
    )
  ) {
    return true;
  }
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }
  if (net.isIPv6(clean)) {
    const lower = clean.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
    return false;
  }
  return true;
}

export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Protocolo não permitido');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    throw new Error('Host não permitido');
  }
  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) throw new Error('Endereço IP privado bloqueado');
    return parsed;
  }
  const records = await dns.lookup(host, { all: true });
  if (!records.length || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new Error('Destino de rede não permitido');
  }
  return parsed;
}

function normalizeDrinkQuery(raw: string, enhancePro: boolean): string {
  const q = raw.trim().replace(/\s+/g, ' ');
  if (!q) return '';
  const withPrefix = /^drink\b/i.test(q) ? q : `drink ${q}`;
  if (!enhancePro) return withPrefix;
  return `${withPrefix} coquetel cocktail bar`;
}

function getHostname(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function scoreImageCandidate(
  width: number,
  height: number,
  domain: string,
  source: ImageSearchResult['source'],
  title: string,
  queryWords: string[]
): number {
  let score = 0;
  const minSide = Math.min(width || 0, height || 0);
  const maxSide = Math.max(width || 0, height || 0);

  if (maxSide >= 1600 && minSide >= 1000) score += 35;
  else if (maxSide >= 1000 && minSide >= 750) score += 28;
  else if (maxSide >= 700 && minSide >= 550) score += 16;

  const lt = title.toLowerCase();
  const hasDrinkCue =
    /(cocktail|drink|coquetel|bartender|mixolog|caipir|negroni|mojito|spritz|martini|\bsour\b|highball|\btiki\b|mocktail|\bshot\b|\bpunch\b|\bfizz\b|\bmule\b|\bbar\b|taça|copo|glass|garnish|wikilovescocktails)/.test(
      lt
    );
  const hasBarPhotoCue = /(bar|glass|taça|copo|garnish|ice|gelo|bartender|cocktail|coquetel)/.test(lt);
  if (TRUSTED_DRINK_DOMAINS.some((d) => domain.includes(d))) score += 38;
  if (source === 'TheCocktailDB') score += 32;
  if (source === 'Wikimedia Commons') score += hasDrinkCue ? 18 : -40;

  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio >= 0.65 && ratio <= 1.75) score += 12;
    else if (ratio < 0.45 || ratio > 2.4) score -= 25;
  }

  if (hasDrinkCue) score += 35;
  if (hasBarPhotoCue) score += 15;
  if (
    /(edific|building|architecture|airport|birdwatching|wildlife|aves|ornitholog|map of|station|football|soccer|shirt|t-shirt|logo|bottle|garrafa|propaganda|anuncio|promo|supermercado|loja|price|preço|preco|shop|buy)/.test(
      lt
    ) ||
    (!hasDrinkCue && /\b(bird|birds|parrot|feather|horse|horses|aircraft|airplane|origami|kalbarri|zoo)\b/.test(lt))
  ) {
    score -= 90;
  }
  for (const w of queryWords) {
    if (w.length >= 3 && lt.includes(w)) score += 6;
  }
  return score;
}

async function runSingleBingQuery(
  searchQuery: string,
  quality: QualityPreset,
  orientation: OrientationPreset,
  proOnly: boolean
): Promise<ImageSearchResult[]> {
  let qft = '';
  if (quality === 'ultra') qft += '+filterui:imagesize-wallpaper';
  else if (quality === 'hd' || quality === 'studio') qft += '+filterui:imagesize-large';

  if (proOnly) qft += '+filterui:photo-photo';
  if (orientation === 'square') qft += '+filterui:aspect-square';
  else if (orientation === 'landscape') qft += '+filterui:aspect-wide';
  else if (orientation === 'portrait') qft += '+filterui:aspect-tall';

  const url =
    `https://www.bing.com/images/async?q=${encodeURIComponent(searchQuery)}` +
    (qft ? `&qft=${encodeURIComponent(qft)}` : '') +
    `&first=1&count=35`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const parts = html.split('<li ');
    const out: ImageSearchResult[] = [];
    const qWords = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    for (const part of parts) {
      const mMatch = part.match(/class="iusc"[^>]*m="([^"]+)"/);
      if (!mMatch) continue;
      const rawM = mMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'");
      let parsed: { murl?: string; turl?: string; t?: string; purl?: string };
      try {
        parsed = JSON.parse(rawM) as { murl?: string; turl?: string; t?: string; purl?: string };
      } catch {
        continue;
      }
      const imageUrl = String(parsed.murl || '').trim();
      const thumbUrl = String(parsed.turl || imageUrl).trim();
      const title = String(parsed.t || '').trim();
      const pageUrl = String(parsed.purl || '').trim();

      if (!imageUrl) continue;
      if (isBlockedProUrl(imageUrl, title + ' ' + pageUrl, proOnly)) continue;

      const dimMatch = part.match(/(\d{3,4})\s*(?:x|×|&times;)\s*(\d{3,4})/i);
      const width = dimMatch ? Number(dimMatch[1]) : 0;
      const height = dimMatch ? Number(dimMatch[2]) : 0;

      if (quality === 'ultra' && width > 0 && height > 0) {
        if (Math.max(width, height) < 1100 || Math.min(width, height) < 750) continue;
      } else if ((quality === 'hd' || quality === 'studio') && width > 0 && height > 0) {
        if (Math.max(width, height) < 750 || Math.min(width, height) < 520) continue;
      }

      const domain = getHostname(imageUrl) || getHostname(pageUrl);
      const score = scoreImageCandidate(width, height, domain, 'Web Pro', title, qWords);
      const badge =
        width >= 1600 && height >= 1000
          ? `${width}×${height} · Ultra HD`
          : width > 0
            ? `${width}×${height} · HD`
            : 'Alta Definição';

      out.push({
        id: `bing-${out.length}-${Buffer.from(imageUrl).toString('base64url').slice(0, 12)}`,
        title: title || 'Foto profissional',
        source: 'Web Pro',
        domain,
        imageUrl,
        thumbUrl,
        width,
        height,
        score,
        badge,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchBingImages(
  primaryQuery: string,
  baseDrinkQuery: string,
  quality: QualityPreset,
  orientation: OrientationPreset,
  proOnly: boolean
): Promise<ImageSearchResult[]> {
  const firstBatch = await runSingleBingQuery(primaryQuery, quality, orientation, proOnly);
  if (firstBatch.length >= 6 || primaryQuery.trim().toLowerCase() === baseDrinkQuery.trim().toLowerCase()) {
    return firstBatch;
  }
  const secondBatch = await runSingleBingQuery(baseDrinkQuery, quality, orientation, proOnly);
  return [...firstBatch, ...secondBatch];
}

async function searchWikimediaImages(
  rawQuery: string,
  quality: QualityPreset,
  orientation: OrientationPreset,
  proOnly: boolean
): Promise<ImageSearchResult[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6` +
    `&gsrsearch=${encodeURIComponent(`drink ${rawQuery} cocktail`)}&gsrlimit=12` +
    `&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=900&format=json`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'MeuBarCatalog/1.0' },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              width?: number;
              height?: number;
              mime?: string;
            }>;
          }
        >;
      };
    };
    const pages = Object.values(json.query?.pages || {});
    const out: ImageSearchResult[] = [];
    const qWords = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);

    for (const pg of pages) {
      const info = pg.imageinfo?.[0];
      if (!info?.url) continue;
      if (!info.mime || !/^image\/(jpeg|jpg|png|webp)$/i.test(info.mime)) continue;
      const w = Number(info.width || 0);
      const h = Number(info.height || 0);
      if (quality === 'ultra' && (w < 1100 || h < 800)) continue;
      if ((quality === 'hd' || quality === 'studio') && (w < 750 || h < 550)) continue;
      if (orientation === 'square' && w > 0 && h > 0 && Math.abs(w / h - 1) > 0.25) continue;
      if (orientation === 'landscape' && w <= h) continue;
      if (orientation === 'portrait' && h <= w) continue;

      const cleanTitle = String(pg.title || 'Wikimedia Photo')
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ');
      const imageUrl = info.url;
      if (isBlockedProUrl(imageUrl, cleanTitle, proOnly)) continue;
      const thumbUrl = info.thumburl || info.url;
      const score = scoreImageCandidate(w, h, 'upload.wikimedia.org', 'Wikimedia Commons', cleanTitle, qWords);
      if (proOnly && score < 10) continue;
      out.push({
        id: `wiki-${out.length}-${Buffer.from(imageUrl).toString('base64url').slice(0, 12)}`,
        title: cleanTitle,
        source: 'Wikimedia Commons',
        domain: 'wikimedia.org',
        imageUrl,
        thumbUrl,
        width: w,
        height: h,
        score,
        badge: w >= 1600 ? `${w}×${h} · Ultra HD` : `${w}×${h} · HD`,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchCocktailDb(rawQuery: string): Promise<ImageSearchResult[]> {
  const url = `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(rawQuery)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      drinks?: Array<{ idDrink?: string; strDrink?: string; strDrinkThumb?: string }> | null;
    };
    const drinks = Array.isArray(json.drinks) ? json.drinks : [];
    return drinks
      .filter((d) => d.strDrinkThumb)
      .slice(0, 8)
      .map((d) => ({
        id: `cdb-${d.idDrink || Math.random()}`,
        title: d.strDrink || rawQuery,
        source: 'TheCocktailDB',
        domain: 'thecocktaildb.com',
        imageUrl: String(d.strDrinkThumb),
        thumbUrl: `${d.strDrinkThumb}/preview`,
        width: 700,
        height: 700,
        score: 72,
        badge: '700×700 · Estúdio',
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function executeImageSearch(params: {
  rawQuery: string;
  quality?: string;
  orientation?: string;
  proOnly?: boolean;
  enhancePro?: boolean;
}): Promise<
  | { ok: true; query: string; total: number; results: ImageSearchResult[] }
  | { ok: false; status: number; error: string }
> {
  const rawQuery = String(params.rawQuery || '').trim();
  if (rawQuery.length < 2) {
    return { ok: false, status: 400, error: 'Digite ao menos 2 caracteres para pesquisar.' };
  }

  const quality = (['hd', 'ultra', 'studio', 'all'].includes(String(params.quality))
    ? String(params.quality)
    : 'hd') as QualityPreset;
  const orientation = (['any', 'square', 'landscape', 'portrait'].includes(String(params.orientation))
    ? String(params.orientation)
    : 'any') as OrientationPreset;
  const proOnly = params.proOnly !== false;
  const enhancePro = params.enhancePro !== false;

  const effectiveQuery = normalizeDrinkQuery(rawQuery, enhancePro);
  const strippedDrinkName = rawQuery.replace(/^drink\s+/i, '').trim() || rawQuery;
  const baseDrinkQuery = /^drink\b/i.test(rawQuery) ? rawQuery : `drink ${strippedDrinkName}`;
  const shortDrinkName = strippedDrinkName.split(/\s+/).slice(0, 3).join(' ');

  const [bingRes, wikiRes, cdbRes] = await Promise.all([
    searchBingImages(effectiveQuery, baseDrinkQuery, quality, orientation, proOnly),
    orientation === 'any' || quality !== 'all'
      ? searchWikimediaImages(shortDrinkName, quality, orientation, proOnly)
      : Promise.resolve([]),
    quality !== 'ultra' && (orientation === 'any' || orientation === 'square')
      ? searchCocktailDb(shortDrinkName)
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const combined: ImageSearchResult[] = [];
  for (const item of [...cdbRes, ...wikiRes, ...bingRes]) {
    const key = item.imageUrl.split('?')[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  combined.sort((a, b) => b.score - a.score);
  return {
    ok: true,
    query: effectiveQuery,
    total: combined.length,
    results: combined.slice(0, 36),
  };
}

export async function executeImageFetch(rawUrlInput: string): Promise<
  | {
      ok: true;
      contentType: string;
      byteLength: number;
      ext: string;
      dataUrl: string;
    }
  | { ok: false; status: number; error: string }
> {
  const rawUrl = String(rawUrlInput || '').trim();
  if (!rawUrl) {
    return { ok: false, status: 400, error: 'Informe a URL da imagem.' };
  }

  let currentUrl: URL;
  try {
    currentUrl = await assertPublicHttpUrl(rawUrl);
  } catch (e) {
    return { ok: false, status: 400, error: e instanceof Error ? e.message : 'URL inválida.' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    let response: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(currentUrl.toString(), {
        signal: ctrl.signal,
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
          Referer: `${currentUrl.origin}/`,
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const loc = response.headers.get('location');
        if (!loc) break;
        currentUrl = await assertPublicHttpUrl(new URL(loc, currentUrl).toString());
        continue;
      }
      break;
    }

    if (!response || !response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Não foi possível baixar a imagem (HTTP ${response?.status || 'erro'}). Escolha outra foto.`,
      };
    }

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!contentType.startsWith('image/') || contentType.includes('svg')) {
      return { ok: false, status: 415, error: 'O link selecionado não retornou uma foto válida.' };
    }

    const arrBuf = await response.arrayBuffer();
    const maxBytes = 8 * 1024 * 1024;
    if (arrBuf.byteLength === 0 || arrBuf.byteLength > maxBytes) {
      return { ok: false, status: 413, error: 'Imagem vazia ou maior que 8 MB.' };
    }

    const ext =
      contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
    const base64 = Buffer.from(arrBuf).toString('base64');
    return {
      ok: true,
      contentType,
      byteLength: arrBuf.byteLength,
      ext,
      dataUrl: `data:${contentType};base64,${base64}`,
    };
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? `Falha ao baixar imagem: ${e.message}` : 'Falha ao baixar imagem.',
    };
  } finally {
    clearTimeout(timer);
  }
}
