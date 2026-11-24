import React, { useEffect, useMemo, useRef, useState } from 'react';
import { optimizeImageFile } from '../lib/imageOptimizer';
import {
  getCachedPlatformConfig,
  hasPlatformPermission,
  isSuperAdmin,
  loadPlatformConfig,
} from '../lib/saas';
import {
  RECIPE_BUCKET,
  realSb,
  uploadAndSaveRecipePhoto,
  uploadMediaFile,
} from '../lib/supabase';
import { slugHandle } from '../lib/utils';
import type { Recipe } from '../types/meubar';

interface SearchCandidate {
  id: string;
  title: string;
  source: string;
  domain: string;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  score: number;
  badge: string;
}

type QualityFilter = 'hd' | 'ultra' | 'studio' | 'all';
type OrientationFilter = 'any' | 'square' | 'landscape' | 'portrait';

function dataUrlToFile(dataUrl: string, fileName: string, contentType: string): File {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binStr = atob(base64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: contentType || 'image/jpeg' });
}

function formatDrinkSearchQuery(rawName: string): string {
  const clean = rawName.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  return /^drink\b/i.test(clean) ? clean : `drink ${clean}`;
}

async function parseJsonSafe<T>(res: Response): Promise<{ okJson: boolean; data: T | null; rawText: string }> {
  const rawText = await res.text();
  if (!rawText || !rawText.trim()) {
    return { okJson: false, data: null, rawText: '' };
  }
  try {
    return { okJson: true, data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { okJson: false, data: null, rawText };
  }
}

async function searchClientFallbackImages(
  searchText: string,
  quality: QualityFilter,
  orientation: OrientationFilter,
  proOnly: boolean
): Promise<SearchCandidate[]> {
  const stripped = searchText.replace(/^drink\s+/i, '').trim() || searchText;
  const shortName = stripped.split(/\s+/).slice(0, 3).join(' ');
  const blockedRe =
    /(garrafa|garrafas|bottle|bottles|packshot|lata|propaganda|anuncio|anúncio|banner|watermark|shutterstock|istock|alamy|123rf|depositphotos|dreamstime|gettyimages|vecteezy|cleanpng|pngtree|pngwing|mercadolivre|amazon|shopee|supermercado|\.svg)/i;

  const fetchCocktailDbClient = async (): Promise<SearchCandidate[]> => {
    if (quality === 'ultra' || (orientation !== 'any' && orientation !== 'square')) return [];
    try {
      const res = await fetch(
        `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(shortName)}`
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        drinks?: Array<{ idDrink?: string; strDrink?: string; strDrinkThumb?: string }> | null;
      };
      const list = Array.isArray(json.drinks) ? json.drinks : [];
      return list
        .filter((d) => d.strDrinkThumb)
        .slice(0, 10)
        .map((d) => ({
          id: `cdb-${d.idDrink || Math.random()}`,
          title: d.strDrink || shortName,
          source: 'TheCocktailDB',
          domain: 'thecocktaildb.com',
          imageUrl: String(d.strDrinkThumb),
          thumbUrl: `${d.strDrinkThumb}/preview`,
          width: 700,
          height: 700,
          score: 82,
          badge: '700×700 · Estúdio',
        }));
    } catch {
      return [];
    }
  };

  const fetchWikimediaClient = async (queryStr: string): Promise<SearchCandidate[]> => {
    try {
      const url =
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6` +
        `&gsrsearch=${encodeURIComponent(queryStr)}&gsrlimit=14` +
        `&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=900&format=json&origin=*`;
      const res = await fetch(url);
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
      const out: SearchCandidate[] = [];
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
        if (proOnly && blockedRe.test(`${info.url} ${cleanTitle}`)) continue;

        out.push({
          id: `wiki-${out.length}-${cleanTitle.slice(0, 12)}`,
          title: cleanTitle,
          source: 'Wikimedia Commons',
          domain: 'wikimedia.org',
          imageUrl: info.url,
          thumbUrl: info.thumburl || info.url,
          width: w,
          height: h,
          score: w >= 1200 ? 75 : 60,
          badge: w > 0 ? `${w}×${h} · HD` : 'Alta Definição',
        });
      }
      return out;
    } catch {
      return [];
    }
  };

  const [cdb, wikiMain] = await Promise.all([
    fetchCocktailDbClient(),
    fetchWikimediaClient(`drink ${shortName} cocktail`),
  ]);
  let wikiExtra: SearchCandidate[] = [];
  if (cdb.length + wikiMain.length < 4) {
    wikiExtra = await fetchWikimediaClient(`${shortName} drink`);
  }

  const seen = new Set<string>();
  const combined: SearchCandidate[] = [];
  for (const item of [...cdb, ...wikiMain, ...wikiExtra]) {
    const key = item.imageUrl.split('?')[0].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }
  return combined.sort((a, b) => b.score - a.score);
}

export const DrinkImageSearchModal: React.FC<{
  mode?: 'single' | 'catalog';
  initialQuery?: string;
  initialRecipe?: Recipe | null;
  recipes?: Recipe[];
  userId?: string;
  onSelectUrl?: (url: string) => void;
  onRecipeUpdated?: (updated: Recipe) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({
  mode = 'single',
  initialQuery = '',
  initialRecipe = null,
  recipes = [],
  userId,
  onSelectUrl,
  onRecipeUpdated,
  onClose,
  onToast,
}) => {
  const isCatalog = mode === 'catalog' && recipes.length > 0;

  const [catalogFilter, setCatalogFilter] = useState<'missing' | 'all'>('missing');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(() => {
    if (initialRecipe?.id) return initialRecipe.id;
    const firstMissing = recipes.find((r) => !r.image_url);
    return firstMissing?.id || recipes[0]?.id || '';
  });

  const activeRecipe = useMemo(() => {
    if (initialRecipe && !isCatalog) return initialRecipe;
    return recipes.find((r) => r.id === selectedRecipeId) || initialRecipe || null;
  }, [initialRecipe, isCatalog, recipes, selectedRecipeId]);

  const [query, setQuery] = useState<string>(() => {
    if (initialQuery.trim()) return formatDrinkSearchQuery(initialQuery);
    if (initialRecipe?.name) return formatDrinkSearchQuery(initialRecipe.name);
    const firstMissing = recipes.find((r) => !r.image_url);
    return formatDrinkSearchQuery(firstMissing?.name || recipes[0]?.name || 'Negroni');
  });

  const [quality, setQuality] = useState<QualityFilter>('hd');
  const [orientation, setOrientation] = useState<OrientationFilter>('any');
  const [proOnly, setProOnly] = useState<boolean>(true);
  const [enhanceQuery, setEnhanceQuery] = useState<boolean>(true);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploadingLocal, setUploadingLocal] = useState(false);
  const [previewItem, setPreviewItem] = useState<SearchCandidate | null>(null);
  const localUploadRef = useRef<HTMLInputElement>(null);

  const catalogQueue = useMemo(() => {
    return catalogFilter === 'missing' ? recipes.filter((r) => !r.image_url) : recipes;
  }, [recipes, catalogFilter]);

  const missingCount = useMemo(() => recipes.filter((r) => !r.image_url).length, [recipes]);

  const [authChecked, setAuthChecked] = useState(false);
  const [allowedAdmin, setAllowedAdmin] = useState(false);

  const getAdminToken = async (): Promise<string> => {
    const { data } = await realSb.auth.getSession();
    const session = data.session;
    const email = session?.user?.email;
    let isAllowed = isSuperAdmin(email);
    if (!isAllowed && email) {
      const cached = getCachedPlatformConfig();
      isAllowed = hasPlatformPermission(email, 'search_recipe_images', cached);
      if (!isAllowed) {
        const fresh = await loadPlatformConfig();
        isAllowed = hasPlatformPermission(email, 'search_recipe_images', fresh);
      }
    }
    setAllowedAdmin(isAllowed);
    setAuthChecked(true);
    if (!isAllowed || !session?.access_token) {
      return '';
    }
    return session.access_token;
  };

  const runSearch = async (searchText: string) => {
    const rawClean = searchText.trim();
    if (rawClean.length < 2) {
      setErr('Digite o nome de um drink (mínimo 2 caracteres).');
      return;
    }
    const clean = formatDrinkSearchQuery(rawClean);
    if (clean !== query) {
      setQuery(clean);
    }
    setLoading(true);
    setErr('');
    try {
      const token = await getAdminToken();
      if (!token) {
        setErr('Pesquisa de imagens disponível apenas no perfil de Administrador.');
        setResults([]);
        return;
      }
      const params = new URLSearchParams({
        q: clean,
        quality,
        orientation,
        proOnly: String(proOnly),
        enhance: String(enhanceQuery),
      });

      let serverUnavailable = false;
      try {
        const res = await fetch(`/api/image-search?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = await parseJsonSafe<{ results?: SearchCandidate[]; error?: string }>(res);
        if (!parsed.okJson || res.status === 404) {
          serverUnavailable = true;
        } else if (!res.ok) {
          setErr(parsed.data?.error || 'Não foi possível pesquisar imagens agora.');
          setResults([]);
          return;
        } else {
          const list = Array.isArray(parsed.data?.results) ? parsed.data.results : [];
          setResults(list);
          if (!list.length) {
            setErr('Nenhuma foto com esse filtro. Tente mudar para "Todas as resoluções" ou ajustar o nome.');
          }
          return;
        }
      } catch {
        serverUnavailable = true;
      }

      if (serverUnavailable) {
        const fallbackList = await searchClientFallbackImages(clean, quality, orientation, proOnly);
        setResults(fallbackList);
        if (!fallbackList.length) {
          setErr(
            'Nenhuma foto encontrada com esse filtro nesta hospedagem. Tente mudar o filtro para "Todas as resoluções", buscar um termo mais amplo ou usar "Enviar do aparelho".'
          );
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro de conexão com o servidor de busca.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim().length >= 2) {
      void runSearch(query);
    } else {
      void getAdminToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality, orientation, proOnly, enhanceQuery]);

  const handleSelectRecipeFromCatalog = (recId: string) => {
    setSelectedRecipeId(recId);
    const rec = recipes.find((r) => r.id === recId);
    if (rec?.name) {
      const nextQuery = formatDrinkSearchQuery(rec.name);
      setQuery(nextQuery);
      void runSearch(nextQuery);
    }
  };

  const goNextMissing = (excludeId?: string) => {
    const next = recipes.find((r) => !r.image_url && r.id !== excludeId);
    if (next) {
      handleSelectRecipeFromCatalog(next.id);
    } else {
      onToast('Todas as receitas visíveis já estão com foto!');
    }
  };

  const fetchViaServer = async (cand: SearchCandidate) => {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('Pesquisa e download de imagens permitidos apenas no perfil ADM.');
    }
    const slugBase = activeRecipe?.name || query.replace(/^drink\s+/i, '');
    const slug = slugHandle(slugBase) || 'drink';

    let proxyMissing = false;
    try {
      const res = await fetch('/api/image-fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: cand.imageUrl, recipeName: query }),
      });
      const parsed = await parseJsonSafe<{
        ok?: boolean;
        dataUrl?: string;
        contentType?: string;
        ext?: string;
        error?: string;
      }>(res);

      if (!parsed.okJson || res.status === 404) {
        proxyMissing = true;
      } else if (!res.ok || !parsed.data?.dataUrl) {
        throw new Error(parsed.data?.error || 'Falha ao baixar a foto selecionada.');
      } else {
        const file = dataUrlToFile(
          parsed.data.dataUrl,
          `${slug}.${parsed.data.ext || 'jpg'}`,
          parsed.data.contentType || 'image/jpeg'
        );
        return { file, dataUrl: parsed.data.dataUrl };
      }
    } catch (err) {
      if (err instanceof Error && !/failed to fetch|network/i.test(err.message)) {
        throw err;
      }
      proxyMissing = true;
    }

    if (proxyMissing) {
      for (const candidateUrl of [cand.imageUrl, cand.thumbUrl].filter(Boolean)) {
        try {
          const directRes = await fetch(candidateUrl, { mode: 'cors' });
          if (!directRes.ok) continue;
          const blob = await directRes.blob();
          const mime = (blob.type || 'image/jpeg').toLowerCase();
          if (!mime.startsWith('image/') || mime.includes('svg')) continue;
          const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
          const file = new File([blob], `${slug}.${ext}`, { type: mime });
          return { file, dataUrl: '' };
        } catch {
          // tenta próximo link
        }
      }
      throw new Error(
        'Este site bloqueou o download direto nesta hospedagem. Escolha uma foto do Wikimedia/TheCocktailDB ou clique em "Enviar do aparelho".'
      );
    }

    throw new Error('Falha ao baixar a foto selecionada.');
  };

  const handleApplyImage = async (cand: SearchCandidate, autoAdvance = false) => {
    setApplyingId(cand.id);
    setErr('');
    try {
      const { file } = await fetchViaServer(cand);

      if (activeRecipe) {
        const res = await uploadAndSaveRecipePhoto(activeRecipe, file, userId);
        if (!res.ok) {
          throw new Error(res.error);
        }
        onRecipeUpdated?.(res.recipe);
        onSelectUrl?.(res.url);
        onToast(`✓ Foto salva globalmente para "${activeRecipe.name}"!`);
        if (isCatalog && autoAdvance) {
          goNextMissing(activeRecipe.id);
        } else if (!isCatalog) {
          onClose();
        }
        return;
      }

      const up = await uploadMediaFile(file, 'recipes', userId, {
        preset: 'recipe',
        bucket: RECIPE_BUCKET,
      });
      if (up.error || !up.url) {
        throw new Error(up.error || 'Erro ao enviar foto para o armazenamento do catálogo.');
      }
      if (onSelectUrl) {
        onSelectUrl(up.url);
        onToast('✓ Foto otimizada e aplicada!');
        onClose();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível aplicar esta foto.';
      setErr(msg);
      onToast(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const handleLocalFileForRecipe = async (file?: File | null) => {
    if (!file) return;
    setUploadingLocal(true);
    setErr('');
    try {
      if (activeRecipe) {
        const res = await uploadAndSaveRecipePhoto(activeRecipe, file, userId);
        if (!res.ok) {
          throw new Error(res.error);
        }
        onRecipeUpdated?.(res.recipe);
        onSelectUrl?.(res.url);
        onToast(`✓ Foto enviada e salva globalmente para "${activeRecipe.name}"!`);
        if (isCatalog) {
          goNextMissing(activeRecipe.id);
        } else {
          onClose();
        }
        return;
      }
      const up = await uploadMediaFile(file, 'recipes', userId, {
        preset: 'recipe',
        bucket: RECIPE_BUCKET,
      });
      if (up.error || !up.url) {
        throw new Error(up.error || 'Falha ao enviar foto.');
      }
      onSelectUrl?.(up.url);
      onToast('✓ Foto otimizada e aplicada!');
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao enviar foto.';
      setErr(msg);
      onToast(msg);
    } finally {
      setUploadingLocal(false);
    }
  };

  const handleDownloadLocal = async (cand: SearchCandidate) => {
    setDownloadingId(cand.id);
    setErr('');
    try {
      const { file } = await fetchViaServer(cand);
      const optimized = await optimizeImageFile(file, 'recipe');
      const objUrl = URL.createObjectURL(optimized);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = optimized.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 2500);
      onToast(`⬇️ "${optimized.name}" baixada no seu dispositivo!`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao baixar arquivo.';
      setErr(msg);
      onToast(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  if (authChecked && !allowedAdmin) {
    return (
      <div
        className="ov"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w max-w-md space-y-3">
          <h1 className="!m-0 text-lg">🔒 Área restrita ao Administrador</h1>
          <p className="mu text-sm">
            A pesquisa e atualização de fotos do catálogo de drinks ficam disponíveis apenas no perfil de Administrador.
          </p>
          <button type="button" className="b w-full" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ov"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w max-w-4xl">
        <div className="row sp flex-wrap gap-2">
          <div>
            <h1 className="!m-0 text-xl">🌐 Pesquisa de Fotos na Internet</h1>
            <p className="mu text-xs mt-0.5">
              Busca real de fotos de drinks e coquetéis em bares (sem garrafas, latas, propagandas, marcas d&apos;água ou IA) com upload direto para o catálogo.
            </p>
          </div>
          <button type="button" className="b g sm" onClick={onClose}>
            ✕ Fechar
          </button>
        </div>

        {isCatalog && (
          <div className="panel mt-3 !border-[var(--ac)]/45 space-y-2.5">
            <div className="row sp flex-wrap gap-2">
              <div className="chips !m-0">
                <button
                  type="button"
                  className={`chip ${catalogFilter === 'missing' ? 'on' : ''}`}
                  onClick={() => setCatalogFilter('missing')}
                >
                  Sem foto ({missingCount})
                </button>
                <button
                  type="button"
                  className={`chip ${catalogFilter === 'all' ? 'on' : ''}`}
                  onClick={() => setCatalogFilter('all')}
                >
                  Todas ({recipes.length})
                </button>
              </div>
              <button
                type="button"
                className="b g sm"
                onClick={() => goNextMissing(activeRecipe?.id)}
              >
                Próximo sem foto →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
              <select
                value={selectedRecipeId}
                onChange={(e) => handleSelectRecipeFromCatalog(e.target.value)}
                className="!mt-0"
              >
                {catalogQueue.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.image_url ? '🖼️ ' : '⚪ '}
                    {r.name} ({r.category})
                  </option>
                ))}
              </select>
              {activeRecipe && (
                <div className="flex items-center gap-2 text-xs">
                  {activeRecipe.image_url ? (
                    <img
                      src={activeRecipe.image_url}
                      alt={activeRecipe.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[var(--ok)]"
                    />
                  ) : (
                    <span className="chip !m-0">Sem foto atual</span>
                  )}
                  <button
                    type="button"
                    className="b g sm"
                    disabled={uploadingLocal || Boolean(applyingId)}
                    onClick={() => localUploadRef.current?.click()}
                  >
                    {uploadingLocal ? 'Enviando…' : '🖼️ Enviar do aparelho'}
                  </button>
                  <input
                    ref={localUploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleLocalFileForRecipe(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Barra de pesquisa + filtros profissionais */}
        <div className="panel mt-3 space-y-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runSearch(query);
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: drink Negroni, drink Mojito, drink Caipirinha..."
              className="!mt-0 flex-1"
            />
            <button type="submit" className="b shrink-0" disabled={loading}>
              {loading ? 'Pesquisando…' : '🔍 Pesquisar'}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="!mt-0 text-xs">Filtro de definição</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as QualityFilter)}
                className="!mt-1 text-sm"
              >
                <option value="hd">Alta Definição Pro (≥ 750px, recomendado)</option>
                <option value="ultra">Ultra HD / Máxima Nitidez (≥ 1100px)</option>
                <option value="studio">Estúdio / Editorial de Coquetelaria</option>
                <option value="all">Todas as resoluções</option>
              </select>
            </div>
            <div>
              <label className="!mt-0 text-xs">Formato / Enquadramento</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as OrientationFilter)}
                className="!mt-1 text-sm"
              >
                <option value="any">Qualquer proporção</option>
                <option value="square">Quadrada (1:1 · ideal para ícones)</option>
                <option value="landscape">Horizontal (4:3 · ideal para cards)</option>
                <option value="portrait">Vertical (3:4 · copos altos)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <label className="!mt-0 flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={proOnly}
                onChange={(e) => setProOnly(e.target.checked)}
                className="!w-auto !m-0"
              />
              Somente fotos reais de drinks/coquetéis de bar (bloquear garrafas, propagandas, marcas d&apos;água e IA)
            </label>
            <label className="!mt-0 flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={enhanceQuery}
                onChange={(e) => setEnhanceQuery(e.target.checked)}
                className="!w-auto !m-0"
              />
              Focar em coquetéis servidos em bar (taça/copo)
            </label>
          </div>
        </div>

        {err && <p className="err mt-2">{err}</p>}

        {/* Grade de resultados */}
        <div className="mt-3">
          {loading ? (
            <div className="panel text-center py-8">
              <p className="mu">🔎 Buscando fotografias profissionais de &quot;{query}&quot;…</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {results.map((cand) => {
                const isBusy = applyingId === cand.id;
                const isDl = downloadingId === cand.id;
                return (
                  <div
                    key={cand.id}
                    className="rounded-xl border border-[var(--bd)] bg-[var(--s1)] overflow-hidden flex flex-col"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewItem(cand)}
                      className="relative aspect-[4/3] w-full bg-[var(--s2)] overflow-hidden cursor-zoom-in p-0 border-0"
                    >
                      <img
                        src={cand.thumbUrl || cand.imageUrl}
                        alt={cand.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src !== cand.imageUrl) img.src = cand.imageUrl;
                        }}
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white">
                        {cand.badge}
                      </span>
                    </button>

                    <div className="p-2 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold line-clamp-2 leading-tight">
                          {cand.title}
                        </div>
                        <div className="text-[10px] text-[var(--mut)] truncate mt-0.5">
                          {cand.domain || cand.source}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="b ok sm w-full !text-[11px]"
                          disabled={Boolean(applyingId || downloadingId)}
                          onClick={() => void handleApplyImage(cand, isCatalog)}
                        >
                          {isBusy
                            ? 'Baixando…'
                            : isCatalog
                              ? '✓ Aplicar e Próximo'
                              : '✓ Usar esta foto'}
                        </button>
                        <button
                          type="button"
                          className="b g sm w-full !text-[11px]"
                          disabled={Boolean(applyingId || downloadingId)}
                          onClick={() => void handleDownloadLocal(cand)}
                        >
                          {isDl ? 'Baixando…' : '⬇️ Baixar WebP'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !err && (
              <div className="panel text-center py-6">
                <p className="mu">Digite o nome do drink acima e clique em Pesquisar.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Lightbox rápida de prévia */}
      {previewItem && (
        <div
          className="fixed inset-0 z-[1200] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="max-w-xl w-full rounded-2xl bg-[var(--s1)] border border-[var(--bd)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewItem.imageUrl}
              alt={previewItem.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[60vh] object-contain bg-black"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = previewItem.thumbUrl;
              }}
            />
            <div className="p-3 space-y-2">
              <div className="text-sm font-bold">{previewItem.title}</div>
              <div className="text-xs text-[var(--mut)]">
                {previewItem.badge} · {previewItem.domain || previewItem.source}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="b ok sm"
                  disabled={Boolean(applyingId)}
                  onClick={() => {
                    const target = previewItem;
                    setPreviewItem(null);
                    void handleApplyImage(target, isCatalog);
                  }}
                >
                  ✓ {isCatalog ? 'Aplicar no catálogo' : 'Usar esta foto'}
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => void handleDownloadLocal(previewItem)}
                >
                  ⬇️ Baixar WebP
                </button>
                <button
                  type="button"
                  className="b g sm ml-auto"
                  onClick={() => setPreviewItem(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
