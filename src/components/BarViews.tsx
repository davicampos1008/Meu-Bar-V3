import React, { useEffect, useState } from 'react';
import {
  getAlertPrefsSummary,
  isAlertEnabled,
  useAlertPrefs,
} from '../lib/alertPrefs';
import {
  ALL_TAGS,
  CAT,
  CATS,
  EMO,
  getCostBasisMeta,
  getCostBasisOptionsForUnit,
  getDefaultCostBasisForUnit,
  getDefaultUnitForIngredient,
  getUnitMeta,
  STARTER_KITS,
  STOCK_UNITS,
  TAG_GROUPS,
  type StockCostBasisId,
  type StockUnitId,
} from '../lib/catalog';
import {
  autoDeductStockForOrder,
  getActiveHappyHours,
  getBarOpsData,
  getDeliveryConfig,
  logBarAudit,
  parseDeliveryOrderMeta,
  playStationAlert,
  saveBarOpsData,
} from '../lib/opsUtils';
import {
  getSavedQuickProfile,
  registerDeviceBiometricUnlock,
  saveQuickPin,
  saveQuickProfile,
  type SavedQuickProfile,
} from '../lib/quickAuth';
import { broadcastMenuUpdate, sb } from '../lib/supabase';
import {
  canonicalIngredientKey,
  estimateRecipeCost,
  externalMapUrl,
  filterRecipesForBar,
  getMissingIngredientsForRecipe,
  getRecipeAuditStatus,
  getRecipeCreatorBrand,
  getRecipeItemType,
  getUnpricedAvailableDrinks,
  makeDrink,
  matchRecipeTags,
  money,
  norm,
  normalizeRecipeCategory,
  normalizeRecipeIngredients,
  recipeTags,
  suggestedPrice,
  type UiThemeMode,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  BarMember,
  Order,
  Recipe,
  TableCallAlert,
  TableTab,
  UserNotificationItem,
} from '../types/meubar';
import { DrinkImageSearchModal } from './DrinkImageSearchModal';
import { PWAInstallButton } from './PWAControls';
import { RecipeTile } from './SharedUI';
import { BarmanStationView, KitchenStationView, WaiterStationView } from './StationViews';
export { StoreStudioView } from './MenuStudio';

export const RecipesView: React.FC<{
  bar: Bar;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  hasPricing: boolean;
  unpricedCount?: number;
  canEditMenu?: boolean;
  isPlatformAdmin?: boolean;
  canEditGlobalRecipes?: boolean;
  canSearchImages?: boolean;
  userId?: string;
  userNotifications?: UserNotificationItem[];
  onDismissUserNotifications?: (ids?: string[]) => void;
  onGoPrices?: () => void;
  onOpenCreateDrink?: (editExisting: boolean) => void;
  onOpenCatalog?: () => void;
  onOpenShakers?: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  onRecipeUpdated?: (updated: Recipe) => void;
  onToast?: (msg: string) => void;
}> = ({
  bar,
  items,
  recipes,
  prices,
  hasPricing,
  unpricedCount = 0,
  canEditMenu = false,
  isPlatformAdmin = false,
  canEditGlobalRecipes,
  canSearchImages,
  userId,
  userNotifications = [],
  onDismissUserNotifications,
  onGoPrices,
  onOpenCreateDrink,
  onOpenCatalog,
  onOpenShakers,
  onSelectRecipe,
  onRecipeUpdated,
  onToast,
}) => {
  const canEditCatalogRecipes = Boolean(canEditGlobalRecipes ?? isPlatformAdmin);
  const canSearchCatalogImages = Boolean(canSearchImages ?? isPlatformAdmin);
  const [rFilter, setRFilter] = useState<'can' | 'missing' | 'all'>('can');
  const [rCat, setRCat] = useState('Todas');
  const [rQuery, setRQuery] = useState('');
  const [rTags, setRTags] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'ready' | 'fewest_missing'>('name');
  const [showTags, setShowTags] = useState(false);
  const [showUnlockHelper, setShowUnlockHelper] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [missingFocusIng, setMissingFocusIng] = useState('');
  const [showPhotoBatchModal, setShowPhotoBatchModal] = useState(false);

  const drinkRecipes = filterRecipesForBar(recipes, bar.id).filter(
    (r) => getRecipeItemType(r) === 'drink'
  );
  const canList = drinkRecipes.filter((r) => makeDrink(r, items));
  const missingList = drinkRecipes.filter((r) => !makeDrink(r, items));

  // Calcula ingredientes que mais destravam receitas em Receitas (1 clique para ver quais)
  const unlockSingleMap = new Map<string, { label: string; count: number }>();
  const missingOverallMap = new Map<string, { label: string; count: number }>();
  missingList.forEach((r) => {
    const miss = getMissingIngredientsForRecipe(r, items);
    if (miss.length === 1) {
      const lbl = miss[0];
      const key = canonicalIngredientKey(lbl);
      const cur = unlockSingleMap.get(key);
      if (cur) cur.count += 1;
      else unlockSingleMap.set(key, { label: lbl, count: 1 });
    }
    miss.forEach((lbl) => {
      if (lbl === 'Indisponível') return;
      const key = canonicalIngredientKey(lbl);
      const cur = missingOverallMap.get(key);
      if (cur) cur.count += 1;
      else missingOverallMap.set(key, { label: lbl, count: 1 });
    });
  });
  const topBuyHelpers = (
    unlockSingleMap.size > 0
      ? Array.from(unlockSingleMap.values())
      : Array.from(missingOverallMap.values())
  )
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10);

  const basePool = rFilter === 'can' ? canList : rFilter === 'missing' ? missingList : drinkRecipes;
  const q = rQuery.trim().toLowerCase();

  const filtered = basePool
    .filter((r) => {
      if (rCat !== 'Todas' && normalizeRecipeCategory(r.category) !== rCat) return false;
      if (!matchRecipeTags(r, rTags)) return false;
      if (missingFocusIng) {
        const missKeys = getMissingIngredientsForRecipe(r, items).map((m) =>
          canonicalIngredientKey(m)
        );
        if (!missKeys.includes(canonicalIngredientKey(missingFocusIng))) return false;
      }
      if (q) {
        const inName = (r.name || '').toLowerCase().includes(q);
        const inDesc = (r.description || r.story || '').toLowerCase().includes(q);
        const inGlass = (r.glass || '').toLowerCase().includes(q);
        const inTech = (r.technique || '').toLowerCase().includes(q);
        const inIng = normalizeRecipeIngredients(r.ingredients).some((i) =>
          (i.n || '').toLowerCase().includes(q)
        );
        if (!inName && !inIng && !inDesc && !inGlass && !inTech) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ready') {
        const aOk = makeDrink(a, items) ? 0 : 1;
        const bOk = makeDrink(b, items) ? 0 : 1;
        if (aOk !== bOk) return aOk - bOk;
      } else if (sortBy === 'fewest_missing') {
        const aMiss = getMissingIngredientsForRecipe(a, items).length;
        const bMiss = getMissingIngredientsForRecipe(b, items).length;
        if (aMiss !== bMiss) return aMiss - bMiss;
      }
      return (a.name || '').localeCompare(b.name || '', 'pt-BR');
    });

  const missingPhotoCount = drinkRecipes.filter((r) => !r.image_url).length;
  const unreadCreatorNotifs = userNotifications.filter((n) => !n.read);
  const pendingAuditDrinks = drinkRecipes.filter((r) => getRecipeAuditStatus(r) === 'pending');
  const hasToolsOptions =
    canEditCatalogRecipes ||
    canSearchCatalogImages ||
    Boolean(onOpenCatalog) ||
    Boolean(onOpenShakers) ||
    Boolean(canEditMenu && onGoPrices && hasPricing);
  const hasActiveFilters =
    rCat !== 'Todas' || rTags.size > 0 || !!rQuery.trim() || !!missingFocusIng;

  const clearAllFilters = () => {
    setRCat('Todas');
    setRTags(new Set());
    setRQuery('');
    setMissingFocusIng('');
  };

  return (
    <div className="space-y-4">
      {/* Notificações para o criador sobre receitas auditadas pela equipe */}
      {unreadCreatorNotifs.length > 0 && (
        <div className="panel !mt-0 !border-emerald-400/50 bg-emerald-500/10 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="text-sm font-bold text-emerald-200">
              🔔 Atualização sobre seus drinks autorais ({unreadCreatorNotifs.length})
            </div>
            {onDismissUserNotifications && (
              <button
                type="button"
                className="b g sm"
                onClick={() => onDismissUserNotifications(unreadCreatorNotifs.map((n) => n.id))}
              >
                Ok, entendi
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {unreadCreatorNotifs.slice(0, 4).map((notif) => (
              <div
                key={notif.id}
                className="rounded-xl px-3 py-2 bg-black/25 border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-[var(--fg)]">
                    {notif.kind === 'recipe_approved' ? '✅ ' : notif.kind === 'recipe_rejected' ? '⚠️ ' : '🔔 '}
                    {notif.title}
                  </div>
                  <div className="text-[var(--mut)] mt-0.5">{notif.message}</div>
                </div>
                {onDismissUserNotifications && (
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => onDismissUserNotifications([notif.id])}
                  >
                    Fechar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabeçalho limpo e bem hierarquizado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="[text-wrap:balance]">Cardápio & Receitas</h1>
          <p className="mu tabular-nums mt-0.5">
            {bar.name} · {canList.length} prontos de {drinkRecipes.length} drinks
            {canSearchCatalogImages && missingPhotoCount > 0 ? ` · ${missingPhotoCount} sem foto` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCreateDrink && (
            <button
              type="button"
              className="b sm whitespace-nowrap"
              onClick={() => onOpenCreateDrink(false)}
            >
              + Novo drink
            </button>
          )}
          {hasToolsOptions && (
            <button
              type="button"
              className={`b sm whitespace-nowrap ${showToolsDrawer ? '' : 'g'}`}
              onClick={() => setShowToolsDrawer((s) => !s)}
            >
              Ferramentas {showToolsDrawer ? '▴' : '▾'}
            </button>
          )}
        </div>
      </div>

      {/* Aviso claro de drinks enviados aguardando auditoria da equipe */}
      {!canEditCatalogRecipes && pendingAuditDrinks.length > 0 && (
        <div className="panel !mt-0 !border-amber-400/40 bg-amber-500/10 text-xs flex items-center justify-between gap-2 flex-wrap">
          <div>
            <b className="text-amber-300">
              ⏳ {pendingAuditDrinks.length} drink(s) aguardando auditoria da equipe
            </b>
            <p className="mu mt-0.5 !mb-0">
              {pendingAuditDrinks.map((d) => d.name).slice(0, 3).join(', ')}
              {pendingAuditDrinks.length > 3 ? ` e +${pendingAuditDrinks.length - 3}` : ''} — assim que autorizado pelo ADM, será publicado no catálogo geral com sua marca.
            </p>
          </div>
        </div>
      )}

      {/* Gaveta organizada de ferramentas do catálogo */}
      {showToolsDrawer && hasToolsOptions && (
        <div className="panel !mt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {canEditCatalogRecipes && onOpenCreateDrink && (
            <button
              type="button"
              className="b g sm w-full justify-start"
              onClick={() => onOpenCreateDrink(true)}
            >
              ✏️ Editar receita
            </button>
          )}
          {canSearchCatalogImages && (
            <button
              type="button"
              className="b g sm w-full justify-start"
              onClick={() => setShowPhotoBatchModal(true)}
              title="Pesquisar fotos profissionais na Internet sem IA e aplicar no catálogo"
            >
              🌐 Fotos ({missingPhotoCount})
            </button>
          )}
          {onOpenCatalog && (
            <button
              type="button"
              className="b g sm w-full justify-start"
              onClick={onOpenCatalog}
            >
              🍟 Petiscos & Avulsos
            </button>
          )}
          {onOpenShakers && (
            <button
              type="button"
              className="b g sm w-full justify-start"
              onClick={onOpenShakers}
            >
              🍸 Coqueteleiras
            </button>
          )}
          {canEditMenu && onGoPrices && hasPricing && (
            <button
              type="button"
              className="b g sm w-full justify-start"
              onClick={onGoPrices}
            >
              💰 Preços{unpricedCount > 0 ? ` (${unpricedCount})` : ''}
            </button>
          )}
        </div>
      )}

      {/* Controle segmentado de disponibilidade */}
      <div className="seg tabular-nums" role="tablist" aria-label="Filtro de disponibilidade">
        <button
          type="button"
          role="tab"
          aria-selected={rFilter === 'can'}
          className={rFilter === 'can' ? 'on' : ''}
          onClick={() => {
            setRFilter('can');
            setMissingFocusIng('');
          }}
        >
          ✓ Posso fazer ({canList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rFilter === 'missing'}
          className={rFilter === 'missing' ? 'on' : ''}
          onClick={() => {
            setRFilter('missing');
            if (sortBy === 'name') setSortBy('fewest_missing');
          }}
        >
          Falta algo ({missingList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={rFilter === 'all'}
          className={rFilter === 'all' ? 'on' : ''}
          onClick={() => setRFilter('all')}
        >
          Todas ({drinkRecipes.length})
        </button>
      </div>

      {/* Busca + botões de descoberta */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <input
            value={rQuery}
            onChange={(e) => setRQuery(e.target.value)}
            placeholder="Buscar drink, ingrediente, copo ou técnica..."
            className="pr-9"
          />
          {rQuery && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setRQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--mu)] hover:text-[var(--tx)] px-1.5 py-1 text-sm cursor-pointer bg-transparent border-0"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
          <button
            type="button"
            className={`b sm whitespace-nowrap ${showTags ? '' : 'g'}`}
            onClick={() => {
              setShowTags((s) => !s);
              if (!showTags) setShowUnlockHelper(false);
            }}
          >
            O que tomar{rTags.size > 0 ? ` (${rTags.size})` : ''}
          </button>
          <button
            type="button"
            className={`b sm whitespace-nowrap ${showUnlockHelper ? '' : 'g'}`}
            onClick={() => {
              const next = !showUnlockHelper;
              setShowUnlockHelper(next);
              if (next) {
                setShowTags(false);
                if (rFilter === 'can' && missingList.length > 0) {
                  setRFilter('missing');
                  setSortBy('fewest_missing');
                }
              } else {
                setMissingFocusIng('');
              }
            }}
          >
            O que comprar
          </button>
        </div>
      </div>

      {/* Categorias limpas em faixa horizontal */}
      <div className="recipe-cat-strip">
        <button
          type="button"
          className={`recipe-cat-btn ${rCat === 'Todas' ? 'on' : ''}`}
          onClick={() => setRCat('Todas')}
        >
          Todas
        </button>
        {CATS.map((c, idx) => (
          <button
            key={c}
            type="button"
            className={`recipe-cat-btn ${rCat === c ? 'on' : ''}`}
            onClick={() => setRCat(rCat === c ? 'Todas' : c)}
          >
            {EMO[idx] || '🍹'} {c}
          </button>
        ))}
      </div>

      {showUnlockHelper && (
        <div className="panel !mt-0 !border-[var(--bd-strong)] space-y-2.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <b className="text-sm">
                {unlockSingleMap.size > 0
                  ? 'Comprar 1 item já libera estes drinks:'
                  : 'Ingredientes que destravam mais receitas:'}
              </b>
              <p className="mu text-xs mt-0.5">
                Toque em um item para filtrar os drinks que dependem dele.
              </p>
            </div>
            {missingFocusIng && (
              <button
                type="button"
                className="b g sm"
                onClick={() => setMissingFocusIng('')}
              >
                Limpar ingrediente
              </button>
            )}
          </div>
          {topBuyHelpers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {topBuyHelpers.map((h) => {
                const active =
                  canonicalIngredientKey(missingFocusIng) === canonicalIngredientKey(h.label);
                return (
                  <button
                    key={h.label}
                    type="button"
                    className={`recipe-cat-btn ${active ? 'on' : ''}`}
                    onClick={() => {
                      setRFilter('missing');
                      setMissingFocusIng(active ? '' : h.label);
                    }}
                  >
                    + {h.label} ({h.count})
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mu text-xs">Você já consegue preparar todas as receitas do catálogo.</p>
          )}
        </div>
      )}

      {showTags && (
        <div className="panel !mt-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <b className="text-sm">Filtros — O que tomar?</b>
            {rTags.size > 0 && (
              <button
                type="button"
                className="b g sm"
                onClick={() => setRTags(new Set())}
              >
                Limpar ({rTags.size})
              </button>
            )}
          </div>
          {TAG_GROUPS.map((grp) => (
            <div key={grp.id}>
              <div className="text-xs font-semibold text-[var(--mu)] mb-1.5">
                {grp.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grp.tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`recipe-cat-btn ${rTags.has(t) ? 'on' : ''}`}
                    onClick={() => {
                      const next = new Set(rTags);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      setRTags(next);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPricing && unpricedCount > 0 && (
        <div className="alert-box row sp !mt-0">
          <div className="flex-1 min-w-[200px]">
            <b>{unpricedCount} drink(s) pronto(s) sem preço</b>
            <p className="mu mt-0.5 text-xs">
              Defina o preço para aparecerem automaticamente no cardápio dos clientes.
            </p>
          </div>
          {onGoPrices && (
            <button type="button" className="b sm" onClick={onGoPrices}>
              Precificar ({unpricedCount})
            </button>
          )}
        </div>
      )}

      {/* Barra de contagem e ordenação */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[var(--bd)]">
        <div className="text-xs text-[var(--mu)] tabular-nums">
          Mostrando <b className="text-[var(--tx)]">{filtered.length}</b> de{' '}
          {basePool.length} receitas
          {missingFocusIng ? ` · faltando ${missingFocusIng}` : ''}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="lnk text-xs !py-1 !px-2 underline"
            >
              Limpar filtros
            </button>
          )}
          <select
            aria-label="Ordenar receitas"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'ready' | 'fewest_missing')}
            className="!w-auto !py-1.5 !px-2.5 !text-xs !rounded-lg"
          >
            <option value="name">Ordem A–Z</option>
            <option value="ready">Prontos primeiro</option>
            <option value="fewest_missing">Faltam menos itens</option>
          </select>
        </div>
      </div>

      {/* Grade limpa e informativa */}
      {filtered.length > 0 ? (
        <div className="recipes-catalog-grid">
          {filtered.map((r) => {
            const catLabel = normalizeRecipeCategory(r.category);
            const catIdx = Math.max(0, CATS.indexOf(catLabel));
            const ings = normalizeRecipeIngredients(r.ingredients);
            const missingIngs = getMissingIngredientsForRecipe(r, items);
            const canMakeNow = missingIngs.length === 0;
            const pr = hasPricing && prices[r.id] != null ? money(prices[r.id]) : null;
            const styleTags = recipeTags(r).slice(0, 3);
            const creatorBrand = getRecipeCreatorBrand(r);
            const auditStatus = getRecipeAuditStatus(r);
            const metaParts = [
              catLabel,
              r.glass || 'Copo padrão',
              r.technique?.split('(')[0].trim() || (r.shaken ? 'Batido' : 'Montado'),
            ].filter(Boolean);

            return (
              <button
                key={r.id}
                type="button"
                className="recipe-pro-card"
                onClick={() => onSelectRecipe(r)}
              >
                <div
                  className={`recipe-pro-media c${catIdx}`}
                  style={r.image_url ? { backgroundImage: `url('${r.image_url}')` } : undefined}
                >
                  {r.image_url ? null : EMO[catIdx] || '🍸'}
                </div>

                <div className="p-4 flex-1 flex flex-col gap-2 w-full">
                  <div className="text-[11.5px] text-[var(--mu)] truncate">
                    {metaParts.join(' · ')}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[1.05rem] font-semibold leading-snug text-[var(--tx)] line-clamp-2">
                      {r.name}
                    </h3>
                    {pr && canMakeNow ? (
                      <span className="pr text-sm shrink-0">{pr}</span>
                    ) : hasPricing && canMakeNow ? (
                      <span className="text-xs font-medium text-[var(--ac)] whitespace-nowrap shrink-0">
                        Sem preço
                      </span>
                    ) : null}
                  </div>

                  {(creatorBrand || auditStatus !== 'approved') && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {creatorBrand && (
                        <span className="font-semibold text-[var(--ac)] truncate">
                          ✦ Criação de {creatorBrand}
                        </span>
                      )}
                      {auditStatus === 'pending' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/35 font-semibold">
                          ⏳ Aguardando auditoria da equipe
                        </span>
                      )}
                      {auditStatus === 'private' && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--s2)] text-[var(--mu)] border border-[var(--bd)] font-medium">
                          🔒 Só no meu bar
                        </span>
                      )}
                      {auditStatus === 'rejected' && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--dn)]/15 text-[var(--dn)] border border-[var(--dn)]/35 font-semibold">
                          ✕ Não publicado
                        </span>
                      )}
                    </div>
                  )}

                  {r.description && (
                    <p className="text-[0.83rem] leading-snug text-[var(--mu)] line-clamp-2">
                      {r.description}
                    </p>
                  )}

                  <div className="mt-auto pt-2.5 border-t border-[var(--bd)] space-y-1.5">
                    {ings.length > 0 && (
                      <div className="text-[0.78rem] text-[var(--tx)] opacity-90 leading-snug line-clamp-2">
                        <span className="text-[var(--mu)]">Base: </span>
                        {ings
                          .slice(0, 5)
                          .map((i) => i.n)
                          .join(' · ')}
                        {ings.length > 5 ? ` · +${ings.length - 5}` : ''}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
                      {canMakeNow ? (
                        <span className="font-semibold text-[var(--ok)] truncate">
                          ✓ Pronto para fazer ({ings.length} itens)
                        </span>
                      ) : (
                        <span className="font-semibold text-[var(--dn)] truncate">
                          Falta: {missingIngs.slice(0, 2).join(', ')}
                          {missingIngs.length > 2 ? ` +${missingIngs.length - 2}` : ''}
                        </span>
                      )}
                      {styleTags.length > 0 && (
                        <span className="text-[11px] text-[var(--mu)] truncate shrink-0 max-w-[44%]">
                          {styleTags.slice(0, 2).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="panel text-center py-8 space-y-2">
          <p className="font-semibold text-[var(--tx)]">Nenhuma receita encontrada</p>
          <p className="mu text-xs">
            Tente limpar a busca ou trocar entre &ldquo;Posso fazer&rdquo;, &ldquo;Falta algo&rdquo; e &ldquo;Todas&rdquo;.
          </p>
          {hasActiveFilters && (
            <button type="button" className="b g sm mt-2" onClick={clearAllFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {canSearchCatalogImages && showPhotoBatchModal && (
        <DrinkImageSearchModal
          mode="catalog"
          recipes={drinkRecipes}
          userId={userId}
          onRecipeUpdated={(updated) => onRecipeUpdated?.(updated)}
          onClose={() => setShowPhotoBatchModal(false)}
          onToast={(m) => onToast?.(m)}
        />
      )}
    </div>
  );
};

export const StockView: React.FC<{
  bar: Bar;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  canEditMenu: boolean;
  hasPricing: boolean;
  onItemsChange: (items: BarItem[]) => void;
  onBarUpdated?: (bar: Bar) => void;
  onGoPrices: () => void;
  onOpenCompras?: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  items,
  recipes,
  prices,
  canEditMenu,
  hasPricing,
  onItemsChange,
  onBarUpdated,
  onGoPrices,
  onOpenCompras,
  onToast,
}) => {
  const cats = Object.keys(CAT);
  const ops = getBarOpsData(bar);
  const costBasisMap = ops.stock_cost_basis || {};
  const [stockCat, setStockCat] = useState('');
  const [stockQ, setStockQ] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState(cats[0] || 'Outros');
  const unpricedAvailable = getUnpricedAvailableDrinks(recipes, items, prices, bar);
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState<StockUnitId>('garrafa');
  const [costBasis, setCostBasis] = useState<StockCostBasisId>('garrafa');
  const [sizeMl, setSizeMl] = useState('750');
  const [variant, setVariant] = useState('');
  const [cost, setCost] = useState('');
  const [err, setErr] = useState('');
  const [showShopping, setShowShopping] = useState(false);
  const [showStarterKits, setShowStarterKits] = useState(false);
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in' | 'out'>('all');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [addingKitId, setAddingKitId] = useState<string | null>(null);
  const [quickAddingIng, setQuickAddingIng] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BarItem | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [edBrand, setEdBrand] = useState('');
  const [edVariant, setEdVariant] = useState('');
  const [edUnit, setEdUnit] = useState<StockUnitId>('garrafa');
  const [edCostBasis, setEdCostBasis] = useState<StockCostBasisId>('garrafa');
  const [edSize, setEdSize] = useState('');
  const [edCost, setEdCost] = useState('');
  const [edQty, setEdQty] = useState('');
  const [edMinQty, setEdMinQty] = useState('');
  const [edSupplier, setEdSupplier] = useState('');
  const [edErr, setEdErr] = useState('');

  const drinkRecipes = filterRecipesForBar(recipes, bar.id).filter(
    (r) => getRecipeItemType(r) === 'drink'
  );

  // Calcula quais ingredientes faltantes liberam mais receitas imediatamente (1 item, duplas e base geral)
  const unlockMap = new Map<string, { label: string; recipes: string[] }>();
  const pairUnlockMap = new Map<string, { a: string; b: string; recipes: string[] }>();
  const overallMissingMap = new Map<string, { label: string; recipes: string[] }>();
  const nearTwoList: { recipe: string; missing: string[] }[] = [];

  drinkRecipes.forEach((r) => {
    const miss = getMissingIngredientsForRecipe(r, items).filter((m) => m !== 'Indisponível');
    if (miss.length === 1) {
      const rawIng = miss[0];
      const key = canonicalIngredientKey(rawIng);
      const cur = unlockMap.get(key);
      if (cur) {
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
      } else {
        unlockMap.set(key, { label: rawIng, recipes: [r.name] });
      }
    } else if (miss.length === 2) {
      nearTwoList.push({ recipe: r.name, missing: miss });
      const sorted = [...miss].sort((x, y) => x.localeCompare(y));
      const pKey = `${canonicalIngredientKey(sorted[0])}||${canonicalIngredientKey(sorted[1])}`;
      const pCur = pairUnlockMap.get(pKey);
      if (pCur) {
        if (!pCur.recipes.includes(r.name)) pCur.recipes.push(r.name);
      } else {
        pairUnlockMap.set(pKey, { a: sorted[0], b: sorted[1], recipes: [r.name] });
      }
    }
    miss.forEach((rawIng) => {
      const key = canonicalIngredientKey(rawIng);
      const cur = overallMissingMap.get(key);
      if (cur) {
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
      } else {
        overallMissingMap.set(key, { label: rawIng, recipes: [r.name] });
      }
    });
  });

  const unlockSuggestions = Array.from(unlockMap.values()).sort(
    (a, b) => b.recipes.length - a.recipes.length || a.label.localeCompare(b.label)
  );
  const pairSuggestions = Array.from(pairUnlockMap.values())
    .sort((a, b) => b.recipes.length - a.recipes.length)
    .slice(0, 6);
  const topMissingIngredients = Array.from(overallMissingMap.values())
    .sort((a, b) => b.recipes.length - a.recipes.length || a.label.localeCompare(b.label))
    .slice(0, 8);

  const allCatalogEntries = cats.flatMap((c) =>
    (CAT[c] || []).map((s) => ({
      name: String(s).split('|')[0].trim(),
      category: c,
    }))
  );

  const namesInCat = stockCat
    ? (CAT[stockCat] || []).map((s) => String(s).split('|')[0].trim())
    : [];

  const q = stockQ.toLowerCase().trim();
  const catalogMatches = (stockCat
    ? allCatalogEntries.filter((e) => e.category === stockCat)
    : allCatalogEntries
  ).filter((e) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));

  const barItemsOnly = items.filter((i) => i.bar_id === bar.id);
  const inStockCount = barItemsOnly.filter((i) => i.in_stock).length;
  const outStockCount = barItemsOnly.length - inStockCount;

  const list = barItemsOnly.filter((i) => {
    if (stockStatusFilter === 'in' && !i.in_stock) return false;
    if (stockStatusFilter === 'out' && i.in_stock) return false;
    const matchCat = !stockCat || i.category === stockCat || namesInCat.includes(i.name);
    const matchQ = !q || i.name.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const handleClearAllStock = async () => {
    if (!barItemsOnly.length) return;
    setClearingAll(true);
    const del = await sb.from('bar_items').delete().eq('bar_id', bar.id);
    setClearingAll(false);
    setConfirmClearAll(false);
    if (del.error) {
      onToast(`Não foi possível limpar o estoque: ${del.error.message}`);
      return;
    }
    onItemsChange([]);
    void broadcastMenuUpdate(bar.id);
    onToast('Estoque limpo! Agora cadastre apenas os itens que você usa.');
  };

  const handleAdd = async () => {
    setErr('');
    const nm = selectedName === '__custom__' ? customName.trim() : selectedName.trim();
    if (!nm) {
      setErr('Selecione um item da lista ou escolha "Cadastrar item novo…".');
      return;
    }
    const inferredCat =
      stockCat ||
      (selectedName === '__custom__'
        ? customCat
        : allCatalogEntries.find((e) => e.name === nm)?.category || null);

    const row: Record<string, unknown> = {
      bar_id: bar.id,
      name: nm,
      in_stock: true,
      category: inferredCat,
      unit,
      unit_cost: Math.max(0, Number(cost) || 0),
      brand: brand.trim() || null,
      variant: variant.trim() || null,
      size_ml: sizeMl ? parseInt(sizeMl, 10) : null,
    };
    let r = await sb.from('bar_items').insert(row).select().single();
    if (r.error && /unit|column .* does not exist/i.test(r.error.message || '')) {
      delete row.unit;
      r = await sb.from('bar_items').insert(row).select().single();
    }
    if (r.error) {
      delete row.brand;
      delete row.variant;
      delete row.size_ml;
      delete row.category;
      delete row.unit;
      r = await sb.from('bar_items').insert(row).select().single();
    }
    if (r.error) {
      setErr(r.error.message);
      return;
    }
    const insertedItem: BarItem = {
      ...(r.data as BarItem),
      unit: (r.data as BarItem).unit || unit,
      cost_basis: costBasis,
    };
    const next = [...items, insertedItem].sort((a, b) => a.name.localeCompare(b.name));
    onItemsChange(next);
    if (insertedItem.id) {
      void saveBarOpsData(
        bar,
        { stock_cost_basis: { ...costBasisMap, [insertedItem.id]: costBasis } },
        onBarUpdated
      );
    }
    void broadcastMenuUpdate(bar.id);
    setStockQ('');
    setSelectedName('');
    setCustomName('');
    setBrand('');
    setSizeMl('');
    setVariant('');
    setCost('');
    const nextUnpriced = getUnpricedAvailableDrinks(recipes, next, prices, bar);
    if (
      hasPricing &&
      nextUnpriced.length > unpricedAvailable.length &&
      isAlertEnabled('lowStock')
    ) {
      const gained = nextUnpriced.length - unpricedAvailable.length;
      onToast(`Item adicionado! ⚠️ +${gained} drink(s) liberado(s) aguardam preço na Precificação.`);
    } else {
      onToast('Item adicionado e cardápio atualizado!');
    }
  };

  const handleToggle = async (it: BarItem) => {
    const prevAvailableCount = recipes.filter((r) => makeDrink(r, items)).length;
    const nextInStock = !it.in_stock;
    const sameNameIds = items
      .filter((x) => norm(x.name) === norm(it.name))
      .map((x) => x.id);
    const idsToUpdate = !nextInStock && sameNameIds.length > 1 ? sameNameIds : [it.id];

    const patch: Record<string, unknown> = { in_stock: nextInStock };
    if (nextInStock && it.qty != null && Number(it.qty) <= 0) {
      patch.qty = 1;
    }

    const r = await sb
      .from('bar_items')
      .update(patch)
      .in('id', idsToUpdate)
      .select();

    if (!r.error && Array.isArray(r.data) && r.data.length > 0) {
      const updatedById = new Map((r.data as BarItem[]).map((u) => [u.id, u]));
      const next = items.map((x) => updatedById.get(x.id) || x);
      onItemsChange(next);
      void broadcastMenuUpdate(bar.id);
      const nextAvailableCount = recipes.filter((rec) => makeDrink(rec, next)).length;
      if (!nextInStock) {
        const removedCount = Math.max(0, prevAvailableCount - nextAvailableCount);
        onToast(
          removedCount > 0
            ? `${it.name} indisponível — ${removedCount} receita(s) saíram de Receitas e do Cardápio.`
            : `${it.name} marcado como indisponível.`
        );
      } else {
        const nextUnpriced = getUnpricedAvailableDrinks(recipes, next, prices, bar);
        if (hasPricing && nextUnpriced.length > unpricedAvailable.length) {
          onToast(`⚠️ ${nextUnpriced.length} drink(s) disponível(is) sem preço na Precificação.`);
        } else if (nextAvailableCount > prevAvailableCount) {
          onToast(
            `${it.name} disponível! +${nextAvailableCount - prevAvailableCount} receita(s) liberada(s).`
          );
        }
      }
    } else if (r.error) {
      onToast(`Erro ao atualizar estoque: ${r.error.message}`);
    }
  };

  const handleRemove = async (id: string) => {
    const targetItem = items.find((x) => x.id === id);
    const prevAvailableCount = recipes.filter((r) => makeDrink(r, items)).length;
    const del = await sb.from('bar_items').delete().eq('id', id);

    let next: BarItem[];
    if (del.error) {
      // Fallback caso RLS impeça DELETE mas permita UPDATE
      const up = await sb
        .from('bar_items')
        .update({ in_stock: false, qty: 0 })
        .eq('id', id)
        .select()
        .single();
      if (up.error) {
        onToast(`Não foi possível remover o item: ${del.error.message}`);
        return;
      }
      next = items.map((x) => (x.id === id ? (up.data as BarItem) : x));
    } else {
      next = items.filter((x) => x.id !== id);
    }

    onItemsChange(next);
    void broadcastMenuUpdate(bar.id);
    setConfirmRemoveId(null);

    const nextAvailableCount = recipes.filter((rec) => makeDrink(rec, next)).length;
    const removedCount = Math.max(0, prevAvailableCount - nextAvailableCount);
    const hasDuplicateLeft =
      targetItem && next.some((x) => x.in_stock && norm(x.name) === norm(targetItem.name));

    if (hasDuplicateLeft) {
      onToast(
        `${targetItem?.name} removido, mas ainda há outro registro ativo de "${targetItem?.name}" no estoque.`
      );
    } else if (removedCount > 0) {
      onToast(
        `${targetItem?.name || 'Item'} removido — ${removedCount} receita(s) saíram de Receitas e do Cardápio.`
      );
    } else {
      onToast('Item removido do estoque.');
    }
  };

  const openEdit = (it: BarItem) => {
    setEditingItem(it);
    setEdBrand(it.brand || '');
    setEdVariant(it.variant || '');
    const def = getDefaultUnitForIngredient(it.name, it.category);
    const resolvedUnit = (it.unit as StockUnitId) || def.unit;
    setEdUnit(resolvedUnit);
    const savedBasis = (it.cost_basis || costBasisMap[it.id]) as StockCostBasisId | undefined;
    const validBases = getCostBasisOptionsForUnit(resolvedUnit);
    setEdCostBasis(
      savedBasis && validBases.some((b) => b.id === savedBasis)
        ? savedBasis
        : getDefaultCostBasisForUnit(resolvedUnit)
    );
    setEdSize(it.size_ml != null ? String(it.size_ml) : def.defaultSize ? String(def.defaultSize) : '');
    setEdCost(it.unit_cost != null ? String(it.unit_cost) : '');
    setEdQty(it.qty != null ? String(it.qty) : '');
    setEdMinQty(it.min_qty != null ? String(it.min_qty) : '');
    setEdSupplier(it.supplier || '');
    setEdErr('');
  };

  const saveEdit = async () => {
    if (!editingItem) return;
    setEdErr('');
    const parsedQty = edQty !== '' ? Math.max(0, parseInt(edQty, 10) || 0) : null;
    const nextInStock = parsedQty !== null ? parsedQty > 0 : editingItem.in_stock;
    const patch: Record<string, unknown> = {
      brand: edBrand.trim() || null,
      variant: edVariant.trim() || null,
      unit: edUnit,
      size_ml: edSize ? parseInt(edSize, 10) : null,
      qty: parsedQty,
      in_stock: nextInStock,
      min_qty: edMinQty !== '' ? Math.max(0, parseInt(edMinQty, 10) || 0) : null,
      supplier: edSupplier.trim() || null,
      unit_cost: Math.max(0, Number(edCost) || 0),
    };
    let r = await sb.from('bar_items').update(patch).eq('id', editingItem.id).select().single();
    if (r.error && /column .* does not exist/i.test(r.error.message || '')) {
      const stripped = { ...patch };
      ['unit', 'min_qty', 'supplier'].forEach((k) => {
        if (r.error?.message.includes(k)) delete stripped[k];
      });
      r = await sb.from('bar_items').update(stripped).eq('id', editingItem.id).select().single();
      if (r.error) {
        delete stripped.unit;
        delete stripped.min_qty;
        delete stripped.supplier;
        r = await sb.from('bar_items').update(stripped).eq('id', editingItem.id).select().single();
      }
    }
    if (r.error) {
      r = await sb
        .from('bar_items')
        .update({ unit_cost: patch.unit_cost, in_stock: nextInStock })
        .eq('id', editingItem.id)
        .select()
        .single();
    }
    if (r.error) {
      setEdErr(r.error.message);
      return;
    }
    onItemsChange(
      items.map((x) =>
        x.id === editingItem.id
          ? {
              ...x,
              ...(r.data as BarItem),
              in_stock: nextInStock,
              unit: edUnit,
              cost_basis: edCostBasis,
              qty: parsedQty !== null ? parsedQty : x.qty,
              min_qty: edMinQty !== '' ? Math.max(0, parseInt(edMinQty, 10) || 0) : x.min_qty,
              supplier: edSupplier.trim() || null,
            }
          : x
      )
    );
    void saveBarOpsData(
      bar,
      { stock_cost_basis: { ...costBasisMap, [editingItem.id]: edCostBasis } },
      onBarUpdated
    );
    void broadcastMenuUpdate(bar.id);
    setEditingItem(null);
    onToast(
      parsedQty === 0
        ? 'Quantidade zerada — receitas com este item saíram dos catálogos.'
        : 'Item atualizado'
    );
  };

  const handleQuickAddIngredient = async (rawName: string) => {
    const targetNorm = norm(rawName);
    setQuickAddingIng(targetNorm);
    const existingOut = items.find((it) => norm(it.name) === targetNorm && !it.in_stock);
    let nextItems = [...items];

    if (existingOut) {
      const up = await sb
        .from('bar_items')
        .update({ in_stock: true })
        .eq('id', existingOut.id)
        .select()
        .single();
      if (!up.error && up.data) {
        nextItems = nextItems.map((it) => (it.id === existingOut.id ? (up.data as BarItem) : it));
      }
    } else {
      const inferredCat =
        cats.find((c) => (CAT[c] || []).some((s) => norm(String(s).split('|')[0]) === targetNorm)) ||
        null;
      const defUnit = getDefaultUnitForIngredient(rawName, inferredCat);
      let ins = await sb
        .from('bar_items')
        .insert({
          bar_id: bar.id,
          name: rawName,
          in_stock: true,
          category: inferredCat,
          unit: defUnit.unit,
          size_ml: defUnit.defaultSize ?? null,
          unit_cost: 0,
        })
        .select()
        .single();
      if (ins.error) {
        ins = await sb
          .from('bar_items')
          .insert({ bar_id: bar.id, name: rawName, in_stock: true, category: inferredCat, unit_cost: 0 })
          .select()
          .single();
      }
      if (ins.error) {
        ins = await sb
          .from('bar_items')
          .insert({ bar_id: bar.id, name: rawName, in_stock: true })
          .select()
          .single();
      }
      if (!ins.error && ins.data) {
        nextItems.push({ ...(ins.data as BarItem), unit: (ins.data as BarItem).unit || defUnit.unit });
      }
    }

    setQuickAddingIng(null);
    nextItems.sort((a, b) => a.name.localeCompare(b.name));
    onItemsChange(nextItems);
    void broadcastMenuUpdate(bar.id);
    const nextUnpriced = getUnpricedAvailableDrinks(recipes, nextItems, prices, bar);
    if (
      hasPricing &&
      nextUnpriced.length > unpricedAvailable.length &&
      isAlertEnabled('lowStock')
    ) {
      const gained = nextUnpriced.length - unpricedAvailable.length;
      onToast(`${rawName} adicionado! ⚠️ +${gained} drink(s) liberado(s) aguardam preço.`);
    } else {
      onToast(`${rawName} adicionado ao estoque e receitas liberadas!`);
    }
  };

  const handleAddStarterKit = async (kitId: string, ingNames: string[]) => {
    setAddingKitId(kitId);
    let nextItems = [...items];
    for (const rawName of ingNames) {
      const targetNorm = norm(rawName);
      if (targetNorm === 'gelo' || targetNorm === 'agua') continue;
      const alreadyIn = nextItems.some((it) => norm(it.name) === targetNorm && it.in_stock);
      if (alreadyIn) continue;
      const existingOut = nextItems.find((it) => norm(it.name) === targetNorm && !it.in_stock);
      if (existingOut) {
        const up = await sb
          .from('bar_items')
          .update({ in_stock: true })
          .eq('id', existingOut.id)
          .select()
          .single();
        if (!up.error && up.data) {
          nextItems = nextItems.map((it) => (it.id === existingOut.id ? (up.data as BarItem) : it));
        }
        continue;
      }
      const inferredCat =
        cats.find((c) => (CAT[c] || []).some((s) => norm(String(s).split('|')[0]) === targetNorm)) ||
        null;
      const defUnit = getDefaultUnitForIngredient(rawName, inferredCat);
      let ins = await sb
        .from('bar_items')
        .insert({
          bar_id: bar.id,
          name: rawName,
          in_stock: true,
          category: inferredCat,
          unit: defUnit.unit,
          size_ml: defUnit.defaultSize ?? null,
          unit_cost: 0,
        })
        .select()
        .single();
      if (ins.error) {
        ins = await sb
          .from('bar_items')
          .insert({ bar_id: bar.id, name: rawName, in_stock: true })
          .select()
          .single();
      }
      if (!ins.error && ins.data) {
        nextItems.push({ ...(ins.data as BarItem), unit: (ins.data as BarItem).unit || defUnit.unit });
      }
    }
    setAddingKitId(null);
    nextItems.sort((a, b) => a.name.localeCompare(b.name));
    onItemsChange(nextItems);
    void broadcastMenuUpdate(bar.id);
    const unlockedCount = drinkRecipes.filter((r) => makeDrink(r, nextItems)).length;
    onToast(`Kit adicionado! Agora você já pode fazer ${unlockedCount} receitas!`);
  };

  const activeUnitMeta = getUnitMeta(unit);
  const editUnitMeta = getUnitMeta(edUnit);
  const activeCostBasisOptions = getCostBasisOptionsForUnit(unit);
  const activeCostBasisMeta = getCostBasisMeta(costBasis, unit);
  const editCostBasisOptions = getCostBasisOptionsForUnit(edUnit);
  const editCostBasisMeta = getCostBasisMeta(edCostBasis, edUnit);

  const handleSelectCatalogEntry = (entryName: string, entryCategory?: string | null) => {
    const resolvedCat =
      entryCategory || allCatalogEntries.find((en) => en.name === entryName)?.category || '';
    setStockQ(entryName);
    if (resolvedCat) setStockCat(resolvedCat);
    setSelectedName(entryName);
    const def = getDefaultUnitForIngredient(entryName, resolvedCat || null);
    setUnit(def.unit);
    setCostBasis(getDefaultCostBasisForUnit(def.unit));
    setSizeMl(def.defaultSize ? String(def.defaultSize) : '');
    setShowSearchDropdown(false);
  };

  return (
    <div>
      <div className="row sp flex-wrap gap-2">
        <h1>Estoque</h1>
        <div className="row flex-wrap">
          <button
            type="button"
            className={`b sm ${showStarterKits ? '' : 'g'}`}
            onClick={() => setShowStarterKits((v) => !v)}
            title="Resumo do que comprar rápido, fácil e barato para já ter drinks"
          >
            🚀 Kit inicial
          </button>
          <button
            type="button"
            className={`b sm ${showShopping ? '' : 'g'}`}
            onClick={() => setShowShopping((v) => !v)}
            title="Ver quais ingredientes comprar para liberar novas receitas"
          >
            💡 O que comprar{unlockSuggestions.length > 0 ? ` (${unlockSuggestions.length})` : ''}
          </button>
          {onOpenCompras && (
            <button
              type="button"
              className="b g sm"
              onClick={onOpenCompras}
              title="Lista de compras automática, fornecedores e perdas"
            >
              🛒 Compras & Perdas
            </button>
          )}
          {canEditMenu && hasPricing && (
            <button type="button" className="b sm" onClick={onGoPrices}>
              Precificação
              {unpricedAvailable.length > 0 && ` (${unpricedAvailable.length})`}
            </button>
          )}
        </div>
      </div>
      <p className="mu">Pesquise o nome direto ou filtre por categoria. A unidade de medida é sugerida automaticamente para facilitar o custo.</p>

      {showStarterKits && (
        <div className="panel mt-3 !border-[var(--ok)]">
          <div className="row sp">
            <div>
              <h3 className="!m-0">🚀 Guia Rápido: O que comprar fácil e barato para começar</h3>
              <p className="mu mt-0.5 text-[0.78rem]">
                Acabou de montar o bar? Escolha um kit econômico abaixo para liberar dezenas de
                drinks clássicos, cremosos, com café e sem álcool hoje mesmo.
              </p>
            </div>
            <button
              type="button"
              className="b g sm"
              onClick={() => setShowStarterKits(false)}
            >
              Ocultar
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 mt-3">
            {STARTER_KITS.map((kit) => {
              const simulatedItems: BarItem[] = [
                ...items,
                ...kit.ingredients.map((n, idx) => ({
                  id: `sim-${idx}`,
                  bar_id: bar.id,
                  name: n,
                  in_stock: true,
                })),
              ];
              const unlockedWithKit = drinkRecipes.filter((r) => makeDrink(r, simulatedItems)).length;
              const missingInKit = kit.ingredients.filter(
                (n) =>
                  norm(n) !== 'gelo' &&
                  !items.some((it) => it.in_stock && norm(it.name) === norm(n))
              );
              const isBusy = addingKitId === kit.id;
              return (
                <div
                  key={kit.id}
                  className="rounded-xl p-3 border border-[var(--bd)] bg-[var(--bg2)]"
                >
                  <div className="row sp flex-wrap gap-2">
                    <div>
                      <b className="text-sm">{kit.title}</b>{' '}
                      <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                        Libera até {unlockedWithKit} receitas
                      </span>
                      <div className="text-xs text-[var(--ac)] font-semibold mt-0.5">
                        💰 {kit.priceRange} · {kit.highlight}
                      </div>
                      <div className="text-[11px] text-[var(--mut)] mt-0.5">{kit.subtitle}</div>
                    </div>
                    <button
                      type="button"
                      className="b sm ok shrink-0"
                      disabled={isBusy || missingInKit.length === 0}
                      onClick={() => void handleAddStarterKit(kit.id, kit.ingredients)}
                    >
                      {isBusy
                        ? 'Adicionando...'
                        : missingInKit.length === 0
                          ? '✓ Kit completo!'
                          : `+ Adicionar faltantes (${missingInKit.length})`}
                    </button>
                  </div>
                  <div className="chips !flex-wrap !overflow-visible mt-2">
                    {kit.ingredients.map((ingName) => {
                      const hasIt =
                        norm(ingName) === 'gelo' ||
                        items.some((it) => it.in_stock && norm(it.name) === norm(ingName));
                      return (
                        <button
                          key={ingName}
                          type="button"
                          disabled={hasIt}
                          onClick={() => void handleQuickAddIngredient(ingName)}
                          className={`chip !text-[0.74rem] ${hasIt ? 'st1' : ''}`}
                        >
                          {hasIt ? '✓ ' : '+ '}
                          {ingName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showShopping && (
        <div className="panel mt-3 !border-[var(--ac)] space-y-3">
          <div className="row sp">
            <div>
              <h3 className="!m-0">💡 O que comprar para liberar receitas</h3>
              <p className="mu mt-0.5 text-[0.78rem]">
                Ranking inteligente do que mais destrava drinks no seu cardápio com o menor investimento.
              </p>
            </div>
            <button
              type="button"
              className="b g sm"
              onClick={() => setShowShopping(false)}
            >
              Fechar
            </button>
          </div>
          {unlockSuggestions.length > 0 && (
            <div className="list">
              {unlockSuggestions.slice(0, 15).map((sug) => {
                const isAdding = quickAddingIng === norm(sug.label);
                return (
                  <div key={sug.label} className="!items-start">
                    <div className="flex-1 min-w-[180px]">
                      <b>{sug.label}</b>{' '}
                      <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                        +{sug.recipes.length} {sug.recipes.length === 1 ? 'receita' : 'receitas'} na hora
                      </span>
                      <br />
                      <span className="mu text-[0.78rem]">
                        Libera: {sug.recipes.slice(0, 6).join(', ')}
                        {sug.recipes.length > 6 ? ` e +${sug.recipes.length - 6}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="b sm ok"
                      disabled={isAdding}
                      onClick={() => void handleQuickAddIngredient(sug.label)}
                    >
                      {isAdding ? 'Salvando…' : '+ Já tenho / Comprar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pairSuggestions.length > 0 && (
            <div className="pt-2 border-t border-[var(--bd)]">
              <div className="text-xs font-bold text-[var(--ac)] mb-1.5">
                🎯 Duplas que liberam vários drinks juntos (faltam 2 itens):
              </div>
              <div className="list">
                {pairSuggestions.map((pair) => (
                  <div key={`${pair.a}+${pair.b}`} className="!items-start">
                    <div className="flex-1 min-w-[180px]">
                      <b>
                        {pair.a} + {pair.b}
                      </b>{' '}
                      <span className="chip !py-0.5 !px-2 !text-[0.72rem]">
                        +{pair.recipes.length} {pair.recipes.length === 1 ? 'drink' : 'drinks'}
                      </span>
                      <br />
                      <span className="mu text-[0.76rem]">
                        Libera: {pair.recipes.slice(0, 4).join(', ')}
                        {pair.recipes.length > 4 ? ` e +${pair.recipes.length - 4}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="b sm g"
                      onClick={() => void handleAddStarterKit(`pair-${pair.a}-${pair.b}`, [pair.a, pair.b])}
                    >
                      + Adicionar dupla
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlockSuggestions.length === 0 && topMissingIngredients.length > 0 && (
            <div className="pt-2 border-t border-[var(--bd)]">
              <div className="text-xs font-bold text-[var(--ac)] mb-1.5">
                🏆 Base mais presente nas receitas do cardápio (comece por aqui):
              </div>
              <div className="list">
                {topMissingIngredients.map((item) => {
                  const isAdding = quickAddingIng === norm(item.label);
                  return (
                    <div key={item.label} className="!items-start">
                      <div className="flex-1 min-w-[180px]">
                        <b>{item.label}</b>{' '}
                        <span className="chip !py-0.5 !px-2 !text-[0.72rem]">
                          em {item.recipes.length} receitas
                        </span>
                        <br />
                        <span className="mu text-[0.76rem]">
                          Ex: {item.recipes.slice(0, 4).join(', ')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="b sm ok"
                        disabled={isAdding}
                        onClick={() => void handleQuickAddIngredient(item.label)}
                      >
                        {isAdding ? 'Salvando…' : '+ Já tenho / Comprar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {unlockSuggestions.length === 0 && pairSuggestions.length === 0 && topMissingIngredients.length === 0 && (
            <p className="mu mt-2">
              Você já tem ingredientes para todas as receitas cadastradas!
            </p>
          )}
        </div>
      )}

      {hasPricing && unpricedAvailable.length > 0 && (
        <div className="alert-box row sp mt-3">
          <div className="flex-1 min-w-[200px]">
            <b>⚠️ {unpricedAvailable.length} drink(s) disponível(is) sem preço</b>
            <p className="mu mt-0.5">
              Estes drinks já têm ingredientes no estoque, mas precisam de preço para aparecer no cardápio:{' '}
              {unpricedAvailable
                .slice(0, 4)
                .map((d) => d.name)
                .join(', ')}
            </p>
          </div>
          {canEditMenu && (
            <button type="button" className="b sm" onClick={onGoPrices}>
              Definir preços
            </button>
          )}
        </div>
      )}

      <div className="panel">
        <label className="!mt-0">
          1. Buscar item pelo nome (em todas as categorias ou na escolhida)
        </label>
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <input
              value={stockQ}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setStockQ(e.target.value);
                setShowSearchDropdown(true);
              }}
              placeholder="Digite ou toque para selecionar (ex: Gin, Vodka, Limão…)"
              className="!mt-1 flex-1"
            />
            {stockQ && (
              <button
                type="button"
                className="b g sm !mt-1 shrink-0"
                onClick={() => {
                  setStockQ('');
                  setSelectedName('');
                  setShowSearchDropdown(true);
                }}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {showSearchDropdown && (
            <div className="mt-1.5 rounded-xl border border-[var(--ac)]/45 bg-[var(--s1)] shadow-xl max-h-56 overflow-y-auto divide-y divide-[var(--bd)]">
              <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-[var(--mut)] bg-[var(--s2)] sticky top-0">
                <span>
                  Toque em um item para preencher automaticamente Categoria, Item e Unidade ({catalogMatches.length})
                </span>
                <button
                  type="button"
                  className="bg-transparent border-0 text-[var(--ac)] font-bold cursor-pointer text-[11px]"
                  onClick={() => setShowSearchDropdown(false)}
                >
                  Fechar
                </button>
              </div>
              {catalogMatches.slice(0, 40).map((entry) => {
                const isSelected = selectedName === entry.name;
                return (
                  <button
                    key={`pick-${entry.category}-${entry.name}`}
                    type="button"
                    className={`w-full text-left px-3 py-2 border-0 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-[var(--ac)]/20 text-[var(--tx)] font-bold'
                        : 'bg-transparent text-[var(--tx)] hover:bg-[var(--s2)]'
                    }`}
                    onClick={() => handleSelectCatalogEntry(entry.name, entry.category)}
                  >
                    <span className="text-xs font-semibold truncate">{entry.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--s2)] text-[var(--mut)] shrink-0">
                      {entry.category}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                className="w-full text-left px-3 py-2 border-0 cursor-pointer bg-[var(--s2)] text-[var(--ac)] font-bold text-xs hover:opacity-90"
                onClick={() => {
                  setSelectedName('__custom__');
                  if (stockQ.trim()) setCustomName(stockQ.trim());
                  setShowSearchDropdown(false);
                }}
              >
                ➕ Cadastrar item novo{stockQ.trim() ? `: "${stockQ.trim()}"` : '…'}
              </button>
            </div>
          )}
        </div>

        <label>2. Tipo / categoria (preenchido ao selecionar acima)</label>
        <select
          value={stockCat}
          onChange={(e) => {
            setStockCat(e.target.value);
            setSelectedName('');
          }}
        >
          <option value="">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label>
          3. Selecionar item ({catalogMatches.length} encontrado{catalogMatches.length === 1 ? '' : 's'})
        </label>
        <select
          value={selectedName}
          onChange={(e) => {
            const val = e.target.value;
            if (val && val !== '__custom__') {
              handleSelectCatalogEntry(val, stockCat || undefined);
            } else {
              setSelectedName(val);
            }
          }}
        >
          <option value="">— selecione ou cadastre novo —</option>
          {catalogMatches.map((entry) => (
            <option key={`${entry.category}-${entry.name}`} value={entry.name}>
              {stockCat ? entry.name : `${entry.name} (${entry.category})`}
            </option>
          ))}
          <option value="__custom__">➕ Cadastrar item novo…</option>
        </select>

        {selectedName === '__custom__' && (
          <div className="row mt-1">
            <div className="grow">
              <label>Nome do novo item *</label>
              <input
                value={customName}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomName(v);
                  if (v.trim().length >= 3) {
                    const def = getDefaultUnitForIngredient(v, stockCat || customCat);
                    setUnit(def.unit);
                    setCostBasis(getDefaultCostBasisForUnit(def.unit));
                    if (def.defaultSize) setSizeMl(String(def.defaultSize));
                  }
                }}
                placeholder="Ex: Xarope de hibisco caseiro"
              />
            </div>
            {!stockCat && (
              <div className="grow">
                <label>Categoria do novo item</label>
                <select value={customCat} onChange={(e) => setCustomCat(e.target.value)}>
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
          <div>
            <label className="!mt-0">Unidade de medida (como você compra)</label>
            <select
              value={unit}
              onChange={(e) => {
                const nextU = e.target.value as StockUnitId;
                setUnit(nextU);
                setCostBasis(getDefaultCostBasisForUnit(nextU));
              }}
            >
              {STOCK_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="!mt-0">Tipo de custo (conforme a unidade)</label>
            <select
              value={costBasis}
              onChange={(e) => setCostBasis(e.target.value as StockCostBasisId)}
            >
              {activeCostBasisOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="!mt-0">{activeCostBasisMeta.costLabel}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder={`Ex: R$ por ${activeCostBasisMeta.short}`}
            />
          </div>
        </div>

        <div className="row mt-2">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marca (opcional)"
            className="flex-1"
          />
          {activeUnitMeta.showSize && (
            <input
              type="number"
              value={sizeMl}
              onChange={(e) => setSizeMl(e.target.value)}
              placeholder={activeUnitMeta.sizePlaceholder || 'ml'}
              className="!w-[105px]"
            />
          )}
        </div>
        <div className="row mt-2">
          <input
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="Sabor / variação (opcional)"
            className="flex-1"
          />
          <button type="button" className="b sm" onClick={() => void handleAdd()}>
            + Adicionar ao estoque
          </button>
        </div>
        {err && <p className="err">{err}</p>}
      </div>

      <div className="row sp flex-wrap gap-2 mt-4">
        <div>
          <h2 className="!m-0">
            📦 Seu estoque cadastrado ({barItemsOnly.length}{' '}
            {barItemsOnly.length === 1 ? 'item' : 'itens'})
          </h2>
          <p className="mu text-xs !mt-0.5 !mb-0">
            Exibindo apenas os itens salvos no banco deste bar. O Kit inicial só abre quando você
            tocar no botão acima.
          </p>
        </div>
        {barItemsOnly.length > 0 && (
          <div className="row flex-wrap gap-1.5">
            <button
              type="button"
              className={`chip ${stockStatusFilter === 'all' ? 'on' : ''}`}
              onClick={() => setStockStatusFilter('all')}
            >
              Todos ({barItemsOnly.length})
            </button>
            <button
              type="button"
              className={`chip ${stockStatusFilter === 'in' ? 'on' : ''}`}
              onClick={() => setStockStatusFilter('in')}
            >
              OK ({inStockCount})
            </button>
            {outStockCount > 0 && (
              <button
                type="button"
                className={`chip ${stockStatusFilter === 'out' ? 'on' : ''}`}
                onClick={() => setStockStatusFilter('out')}
              >
                Falta ({outStockCount})
              </button>
            )}
            {confirmClearAll ? (
              <>
                <button
                  type="button"
                  className="b d sm"
                  disabled={clearingAll}
                  onClick={() => void handleClearAllStock()}
                >
                  {clearingAll ? 'Limpando...' : 'Confirmar zerar estoque'}
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setConfirmClearAll(false)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="b g sm"
                onClick={() => setConfirmClearAll(true)}
                title="Remove todos os itens cadastrados deste bar para começar do zero"
              >
                🗑 Zerar estoque
              </button>
            )}
          </div>
        )}
      </div>

      <div className="chips !flex-wrap !overflow-visible mt-2.5">
        <span
          className={`chip ${!stockCat ? 'on' : ''}`}
          onClick={() => {
            setStockCat('');
            setStockQ('');
          }}
        >
          Todos no estoque
        </span>
        {cats.map((c) => (
          <span
            key={c}
            className={`chip ${stockCat === c ? 'on' : ''}`}
            onClick={() => {
              setStockCat(c);
              setStockQ('');
            }}
          >
            {c}
          </span>
        ))}
      </div>

      <div className="list mt-3.5">
        {list.length > 0 ? (
          list.map((i) => {
            const unitId =
              (i.unit as StockUnitId) || getDefaultUnitForIngredient(i.name, i.category).unit;
            const uMeta = getUnitMeta(unitId);
            const itemBasisMeta = getCostBasisMeta(i.cost_basis || costBasisMap[i.id], unitId);
            const meta: string[] = [];
            meta.push(`📏 ${uMeta.label}`);
            if (i.brand) meta.push(i.brand);
            if (i.variant) meta.push(i.variant);
            if (i.size_ml && uMeta.showSize) meta.push(`${i.size_ml} ml`);
            if (i.qty != null) meta.push(`qtd: ${i.qty} ${uMeta.short}`);
            if (i.min_qty != null && Number(i.min_qty) > 0) meta.push(`mín: ${i.min_qty}`);
            if (i.unit_cost != null && Number(i.unit_cost) > 0) {
              meta.push(`custo ${money(i.unit_cost)} / ${itemBasisMeta.short}`);
            } else {
              meta.push(`custo não informado (R$/${itemBasisMeta.short})`);
            }
            const isLowStock =
              i.in_stock && Number(i.min_qty || 0) > 0 && Number(i.qty || 0) <= Number(i.min_qty || 0);
            return (
              <div key={i.id} className="!items-start">
                <div className="flex-1">
                  <b>{i.name}</b>{' '}
                  {isLowStock && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      ⚠️ Estoque baixo
                    </span>
                  )}
                  {meta.length > 0 && (
                    <>
                      <br />
                      <span className="tag">{meta.join(' · ')}</span>
                    </>
                  )}
                </div>
                <div className="row">
                  <button
                    type="button"
                    className={`chip ${i.in_stock ? 'st1' : 'st0'}`}
                    onClick={() => void handleToggle(i)}
                  >
                    {i.in_stock ? 'OK' : 'Falta'}
                  </button>
                  <button type="button" className="b g sm" onClick={() => openEdit(i)}>
                    ✏️
                  </button>
                  {confirmRemoveId === i.id ? (
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => void handleRemove(i.id)}
                    >
                      Confirmar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => setConfirmRemoveId(i.id)}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="mu">
            {barItemsOnly.length === 0
              ? 'Seu estoque está vazio. Cadastre acima apenas os ingredientes que você realmente tem.'
              : 'Nenhum item encontrado com este filtro.'}
          </p>
        )}
      </div>

      {editingItem && (
        <div className="ov">
          <div className="w narrow">
            <button type="button" className="b g sm" onClick={() => setEditingItem(null)}>
              ← Voltar
            </button>
            <h1 className="mt-3">Editar {editingItem.name}</h1>
            <label>Unidade de medida (como você compra)</label>
            <select
              value={edUnit}
              onChange={(e) => {
                const nextU = e.target.value as StockUnitId;
                setEdUnit(nextU);
                setEdCostBasis(getDefaultCostBasisForUnit(nextU));
              }}
            >
              {STOCK_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <label>Tipo de custo (conforme a unidade)</label>
            <select
              value={edCostBasis}
              onChange={(e) => setEdCostBasis(e.target.value as StockCostBasisId)}
            >
              {editCostBasisOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label>{editCostBasisMeta.costLabel}</label>
            <input
              type="number"
              step="0.1"
              value={edCost}
              onChange={(e) => setEdCost(e.target.value)}
              placeholder={`R$ por ${editCostBasisMeta.short}`}
            />
            {editUnitMeta.showSize && (
              <>
                <label>Tamanho ({editUnitMeta.sizePlaceholder || 'ml'})</label>
                <input type="number" value={edSize} onChange={(e) => setEdSize(e.target.value)} />
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Qtd atual ({editUnitMeta.short})</label>
                <input
                  type="number"
                  min={0}
                  value={edQty}
                  onChange={(e) => setEdQty(e.target.value)}
                  placeholder="Ex: 5"
                />
              </div>
              <div>
                <label>Estoque mínimo (alerta)</label>
                <input
                  type="number"
                  min={0}
                  value={edMinQty}
                  onChange={(e) => setEdMinQty(e.target.value)}
                  placeholder="Ex: 2"
                />
              </div>
            </div>
            <label>Fornecedor (opcional)</label>
            <input
              value={edSupplier}
              onChange={(e) => setEdSupplier(e.target.value)}
              placeholder="Ex: Distribuidora Silva"
            />
            <label>Marca</label>
            <input value={edBrand} onChange={(e) => setEdBrand(e.target.value)} />
            <label>Sabor / variação</label>
            <input value={edVariant} onChange={(e) => setEdVariant(e.target.value)} />
            <button type="button" className="b full mt-3" onClick={() => void saveEdit()}>
              Salvar
            </button>
            {edErr && <p className="err">{edErr}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export const QueueView: React.FC<{
  bar: Bar;
  role?: string | null;
  actorName?: string;
  members?: BarMember[];
  orders: Order[];
  recipes: Recipe[];
  items?: BarItem[];
  prices?: Record<string, number>;
  tableTabs?: TableTab[];
  tableCalls?: TableCallAlert[];
  defaultStation?: 'all' | 'bar' | 'cozinha' | 'garcom';
  lockedStation?: 'bar' | 'cozinha' | 'garcom';
  onBarUpdated: (bar: Bar) => void;
  onItemsChange?: (items: BarItem[]) => void;
  onRefreshOrders: () => Promise<void>;
  onRefreshTableTabs?: () => Promise<void>;
  onResolveCall?: (id: string) => Promise<void>;
  onRecipesUpdated?: () => Promise<void>;
  onSelectRecipe?: (recipe: Recipe) => void;
  onGoStock?: () => void;
  onOpenCatalog?: () => void;
  onToast?: (msg: string) => void;
}> = ({
  bar,
  role,
  actorName = 'Equipe',
  members = [],
  orders,
  recipes,
  items = [],
  prices = {},
  tableTabs = [],
  tableCalls = [],
  defaultStation = 'all',
  lockedStation,
  onBarUpdated,
  onItemsChange,
  onRefreshOrders,
  onRefreshTableTabs,
  onResolveCall,
  onRecipesUpdated,
  onSelectRecipe,
  onGoStock,
  onOpenCatalog,
  onToast,
}) => {
  const [stationMode, setStationMode] = useState<'all' | 'bar' | 'cozinha' | 'garcom'>(
    lockedStation || defaultStation
  );
  const [clientFilter, setClientFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);

  useEffect(() => {
    setStationMode(lockedStation || defaultStation);
  }, [defaultStation, lockedStation]);

  const open = bar.accepting_orders !== false;
  const activeAll = orders.filter((o) => o.status !== 'done');
  const recipeMapById = new Map(recipes.map((r) => [r.id, r]));
  const recipeMapByName = new Map<string, Recipe>();
  recipes.forEach((r) => {
    const k = norm(r.name);
    if (k && !recipeMapByName.has(k)) recipeMapByName.set(k, r);
  });
  const resolveRecipe = (o: Order): Recipe | undefined =>
    recipeMapById.get(o.recipe_id) || recipeMapByName.get(norm(o.recipe_name || ''));
  const recipeNameById = new Map(recipes.map((r) => [r.id, r.name]));

  const barStationCount = activeAll.filter((o) => {
    const rec = resolveRecipe(o);
    return (o.station || (rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar')) === 'bar';
  }).length;
  const kitchenStationCount = activeAll.filter((o) => {
    const rec = recipeMapById.get(o.recipe_id);
    return (
      (o.station || (rec && getRecipeItemType(rec) === 'petisco' ? 'cozinha' : 'bar')) === 'cozinha'
    );
  }).length;
  const readyWaiterCount = activeAll.filter((o) => o.status === 'ready').length;

  // Lista única (sem nomes duplicados) de clientes ativos agora na fila
  const activeClientMap = new Map<string, { label: string; count: number }>();
  activeAll.forEach((o) => {
    const rawName = (o.client_name || o.customer_name || 'Cliente').trim();
    const key = norm(rawName) || 'cliente';
    const cur = activeClientMap.get(key);
    if (cur) {
      cur.count += o.qty || 1;
    } else {
      activeClientMap.set(key, { label: rawName, count: o.qty || 1 });
    }
  });
  const activeClients = Array.from(activeClientMap.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    count: v.count,
  }));

  const searchNorm = norm(clientSearch);
  const active = activeAll.filter((o) => {
    const rawName = (o.client_name || o.customer_name || 'Cliente').trim();
    const key = norm(rawName) || 'cliente';
    if (clientFilter && key !== clientFilter) return false;
    if (searchNorm) {
      const tableNorm = norm(o.table_label || '');
      if (!key.includes(searchNorm) && !tableNorm.includes(searchNorm)) return false;
    }
    return true;
  });

  interface OrderGroup {
    key: string;
    recipeId: string;
    recipe?: Recipe;
    recipeName: string;
    status: string;
    note: string;
    qty: number;
    orders: Order[];
    names: string[];
  }

  const groups: OrderGroup[] = [];
  const map: Record<string, OrderGroup> = {};

  active.forEach((o) => {
    const rec = resolveRecipe(o);
    const rName = o.recipe_name || rec?.name || recipeNameById.get(o.recipe_id) || 'Drink';
    const dlv = parseDeliveryOrderMeta(o);
    const displayNote = dlv ? dlv.cleanItemNote : o.note || '';
    const key = `${o.recipe_id || rName}|${o.status || 'pending'}|${displayNote}`;
    if (!map[key]) {
      map[key] = {
        key,
        recipeId: o.recipe_id,
        recipe: rec,
        recipeName: rName,
        status: o.status,
        note: displayNote,
        qty: 0,
        orders: [],
        names: [],
      };
      groups.push(map[key]);
    }
    if (!map[key].recipe && rec) map[key].recipe = rec;
    map[key].qty += o.qty || 1;
    map[key].orders.push(o);
    const client = (o.client_name || o.customer_name || 'Cliente').trim();
    const label = dlv
      ? `${dlv.mode === 'pickup' ? '🛍️ RETIRADA' : '🛵 DELIVERY'} #${dlv.code} · ${client}`
      : o.table_label
        ? `${client} (${o.table_label})`
        : client;
    if (!map[key].names.some((x) => norm(x) === norm(label))) map[key].names.push(label);
  });

  groups.sort((a, b) => {
    const ta = a.orders[0]?.created_at || '';
    const tb = b.orders[0]?.created_at || '';
    return ta < tb ? -1 : 1;
  });

  const handleToggleOpen = async () => {
    const r = await sb
      .from('bars')
      .update({ accepting_orders: !open })
      .eq('id', bar.id)
      .select()
      .single();
    if (!r.error && r.data) onBarUpdated(r.data as Bar);
  };

  const handleBatchStatus = async (ids: string[], status: 'ready' | 'done') => {
    const patch: Record<string, unknown> = { status };
    if (status === 'ready') patch.ready_at = new Date().toISOString();
    let res = await sb.from('orders').update(patch).in('id', ids);
    if (res.error && status === 'ready') {
      res = await sb.from('orders').update({ status }).in('id', ids);
    }

    if (status === 'ready') {
      playStationAlert('garcom', 'orderReady');
      const allLow: string[] = [];
      let curItems = [...items];
      for (const id of ids) {
        const ord = orders.find((x) => x.id === id);
        if (!ord) continue;
        const rec = recipeMapById.get(ord.recipe_id);
        const ded = await autoDeductStockForOrder(
          bar,
          rec,
          Number(ord.qty) || 1,
          curItems,
          (next) => {
            curItems = next;
          }
        );
        allLow.push(...ded.lowStockNames);
      }
      if (onItemsChange && curItems !== items) onItemsChange(curItems);
      if (allLow.length > 0 && onToast && isAlertEnabled('lowStock')) {
        onToast(`⚠️ Estoque baixo: ${Array.from(new Set(allLow)).join(', ')}`);
      }
    }

    await onRefreshOrders();
  };

  const handleSingleStatus = async (orderId: string, status: Order['status']) => {
    if (status === 'pending') return;
    await handleBatchStatus([orderId], status);
  };

  const handleCancelOrder = async (ord: Order, reason: string) => {
    await sb.from('orders').delete().eq('id', ord.id);
    await logBarAudit(
      bar,
      'Cancelamento de pedido',
      `${ord.qty}x ${ord.recipe_name || recipeNameById.get(ord.recipe_id) || 'Item'} (${ord.table_label || ord.client_name || 'Balcão'}) — Motivo: ${reason}`,
      actorName,
      role || 'staff',
      onBarUpdated
    );
    if (onToast) onToast('Pedido cancelado e registrado na auditoria.');
    await onRefreshOrders();
  };

  return (
    <div>
      {!lockedStation && (
        <>
          <div className="row sp">
            <h1>Fila & Estações</h1>
            <button
              type="button"
              className={`b sm ${open ? 'g' : 'ok'}`}
              onClick={() => void handleToggleOpen()}
            >
              {open ? 'Pausar pedidos' : 'Retomar pedidos'}
            </button>
          </div>
          {!open && <p className="warn-txt">Pedidos pausados no cardápio agora.</p>}

          {/* Seletor de Estações Operacionais: Geral | Barman | Cozinha | Garçom */}
          <div className="chips !flex-wrap !overflow-visible mt-2.5 mb-3">
            <button
              type="button"
              className={`chip ${stationMode === 'all' ? 'on' : ''}`}
              onClick={() => setStationMode('all')}
            >
              📋 Geral ({activeAll.length})
            </button>
            <button
              type="button"
              className={`chip ${stationMode === 'bar' ? 'on' : ''}`}
              onClick={() => setStationMode('bar')}
            >
              🍸 Barman ({barStationCount})
            </button>
            <button
              type="button"
              className={`chip ${stationMode === 'cozinha' ? 'on' : ''}`}
              onClick={() => setStationMode('cozinha')}
            >
              🍳 Cozinha ({kitchenStationCount})
            </button>
            <button
              type="button"
              className={`chip ${stationMode === 'garcom' ? 'on' : ''}`}
              onClick={() => setStationMode('garcom')}
            >
              🍽️ Garçom {readyWaiterCount > 0 ? `(🔔 ${readyWaiterCount})` : ''}
            </button>
          </div>
        </>
      )}

      {stationMode === 'bar' && (
        <BarmanStationView
          bar={bar}
          role={role}
          actorName={actorName}
          orders={orders}
          recipes={recipes}
          onSetOrderStatus={handleSingleStatus}
          onCancelOrder={handleCancelOrder}
          onSelectRecipe={onSelectRecipe}
          onGoStock={onGoStock}
          onRefresh={onRefreshOrders}
        />
      )}

      {stationMode === 'cozinha' && (
        <KitchenStationView
          bar={bar}
          role={role}
          orders={orders}
          recipes={recipes}
          onSetOrderStatus={handleSingleStatus}
          onCancelOrder={handleCancelOrder}
          onSelectRecipe={onSelectRecipe}
          onRecipesUpdated={onRecipesUpdated || (async () => {})}
          onOpenCatalog={onOpenCatalog}
          onRefresh={onRefreshOrders}
          onToast={onToast || (() => {})}
        />
      )}

      {tableCalls.length > 0 && stationMode !== 'garcom' && (
        <div className="panel !border-amber-400/60 bg-amber-500/10 mb-3 space-y-1.5">
          <div className="text-xs font-bold text-amber-200">
            🔔 {tableCalls.length} chamado(s) de mesa aguardando atendimento
          </div>
          {tableCalls.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 text-xs bg-black/20 rounded-lg px-2.5 py-1.5"
            >
              <div>
                <b>{c.kind === 'bill' ? '🧾 Pediu a Conta' : '🙋 Chamou Garçom'}</b> ·{' '}
                {c.table_label ? `${c.table_label} (${c.client_name})` : c.client_name}
                {c.note ? ` — ${c.note}` : ''}
              </div>
              {onResolveCall && (
                <button
                  type="button"
                  className="b ok sm !py-1"
                  onClick={() => void onResolveCall(c.id)}
                >
                  ✓ Atendido
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {stationMode === 'garcom' && (
        <WaiterStationView
          bar={bar}
          role={role}
          actorName={actorName}
          members={members}
          orders={orders}
          recipes={recipes}
          items={items}
          prices={prices}
          tableTabs={tableTabs}
          tableCalls={tableCalls}
          onResolveCall={onResolveCall}
          onSetOrderStatus={handleSingleStatus}
          onBarUpdated={onBarUpdated}
          onRefreshAll={async () => {
            await onRefreshOrders();
            if (onRefreshTableTabs) await onRefreshTableTabs();
          }}
          onToast={onToast || (() => {})}
        />
      )}

      {stationMode === 'all' && (
        <>
          <p className="mu">Pedidos iguais do mesmo item são agrupados para preparar juntos.</p>

      {activeClients.length > 0 && (
        <div className="panel mt-3">
          <div className="row sp">
            <h3 className="!m-0">Clientes ativos agora ({activeClients.length})</h3>
            {(clientFilter || clientSearch) && (
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  setClientFilter('');
                  setClientSearch('');
                }}
              >
                Limpar filtro
              </button>
            )}
          </div>
          <input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Filtrar cliente ativo ou mesa…"
            className="mt-2"
          />
          <div className="chips !flex-wrap !overflow-visible mt-2">
            <span
              className={`chip ${!clientFilter ? 'on' : ''}`}
              onClick={() => setClientFilter('')}
            >
              Todos ({activeAll.length})
            </span>
            {activeClients.map((c) => (
              <span
                key={c.key}
                className={`chip ${clientFilter === c.key ? 'on' : ''}`}
                onClick={() => setClientFilter(clientFilter === c.key ? '' : c.key)}
              >
                {c.label} ({c.count})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        {groups.length > 0 ? (
          groups.map((g) => {
            const isReady = g.status === 'ready';
            const ids = g.orders.map((o) => o.id);
            const rec =
              g.recipe ||
              recipeMapById.get(g.recipeId) ||
              recipeMapByName.get(norm(g.recipeName));
            const cleanIngs = normalizeRecipeIngredients(rec?.ingredients).filter(
              (i) => !i.n.startsWith('__')
            );
            const hasRecipeDetails = Boolean(
              rec && (cleanIngs.length > 0 || rec.steps || rec.instructions || rec.description)
            );
            const isExpanded = expandedGroupKey === g.key;
            return (
              <div key={g.key} className={`ord ${isReady ? 'ready' : ''}`}>
                <div className="row sp">
                  <h3>
                    {g.qty}× {g.recipeName}
                  </h3>
                  <span className="tag">
                    {isReady ? 'PRONTO' : 'PREPARANDO'}
                    {g.orders.length > 1 ? ` · ${g.orders.length} pedidos` : ''}
                  </span>
                </div>
                <div className="meta">{g.names.join(', ')}</div>
                {g.note && (
                  <div className="items">
                    <span className="mu">Obs: {g.note}</span>
                  </div>
                )}

                {isExpanded && rec && (
                  <div className="mt-2.5 rounded-xl bg-[var(--bg2)] border border-[var(--bd)] p-3 text-xs space-y-1.5">
                    <div className="font-bold text-[var(--ac)]">
                      📖 Receita · {rec.glass || 'Copo padrão'}
                      {rec.technique ? ` · ${rec.technique}` : ''}
                    </div>
                    {cleanIngs.length > 0 && (
                      <ul className="list-disc pl-4 m-0 space-y-0.5">
                        {cleanIngs.map((ing, idx) => (
                          <li key={idx}>
                            <strong>{ing.n}</strong>
                            {ing.q ? ` — ${ing.q}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(rec.steps || rec.instructions || rec.description) && (
                      <div className="text-[var(--mut)] pt-1 border-t border-[var(--bd)]">
                        <strong className="text-[var(--txt)]">Modo de preparo:</strong>{' '}
                        {rec.steps || rec.instructions || rec.description}
                      </div>
                    )}
                    {rec.garnish && (
                      <div className="text-[var(--ok)]">
                        <strong>Guarnição:</strong> {rec.garnish}
                      </div>
                    )}
                  </div>
                )}

                <div className="acts flex-wrap">
                  {rec && hasRecipeDetails && (
                    <button
                      type="button"
                      className="b sm g"
                      onClick={() =>
                        setExpandedGroupKey(isExpanded ? null : g.key)
                      }
                    >
                      {isExpanded ? 'Ocultar receita' : '📖 Ver receita'}
                    </button>
                  )}
                  {rec && onSelectRecipe && (
                    <button
                      type="button"
                      className="b sm g"
                      onClick={() => onSelectRecipe(rec)}
                    >
                      🍸 Modo preparo
                    </button>
                  )}
                  {!isReady && (
                    <button
                      type="button"
                      className="b sm ok"
                      onClick={() => void handleBatchStatus(ids, 'ready')}
                    >
                      Marcar lote pronto
                    </button>
                  )}
                  <button
                    type="button"
                    className="b sm g"
                    onClick={() => void handleBatchStatus(ids, 'done')}
                  >
                    Entregue
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="mu">
            {activeAll.length > 0
              ? 'Nenhum pedido encontrado para este cliente ativo.'
              : 'Nenhum pedido na fila agora. Você pode fazer drinks direto na aba Receitas.'}
          </p>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export const CashierView: React.FC<{
  bar: Bar;
  orders: Order[];
  tableTabs?: TableTab[];
  recipes: Recipe[];
  prices: Record<string, number>;
  hasPricing: boolean;
  settledIds: Set<string>;
  onSettled: (ids: string[]) => void;
  onRefreshOrders: () => Promise<void>;
  onRefreshTableTabs?: () => Promise<void>;
  onBackMore: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  orders,
  tableTabs = [],
  recipes,
  prices,
  hasPricing,
  settledIds,
  onSettled,
  onRefreshOrders,
  onRefreshTableTabs,
  onBackMore,
  onToast,
}) => {
  const [clientFilter, setClientFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const recipeNameById = new Map(recipes.map((r) => [r.id, r.name]));
  const openOrders = orders.filter((o) => !o.paid && !settledIds.has(o.id));
  const openTabsById = new Map(tableTabs.map((t) => [t.id, t]));
  const openTabsByLabel = new Map(tableTabs.map((t) => [norm(t.table_label), t]));

  interface CustomerTab {
    key: string;
    name: string;
    isTable: boolean;
    tableTabId?: string;
    tableCode?: string;
    members: string[];
    total: number;
    ids: string[];
    lines: string[];
  }

  const grouped: Record<string, CustomerTab> = {};
  let grandTotal = 0;

  // Primeiro garante que comandas de mesa abertas via QR apareçam mesmo sem pedidos ainda
  tableTabs.forEach((t) => {
    const key = `tab:${t.id}`;
    grouped[key] = {
      key,
      name: t.table_label,
      isTable: true,
      tableTabId: t.id,
      tableCode: t.code,
      members: Array.isArray(t.members) ? t.members : [t.opened_by],
      total: 0,
      ids: [],
      lines: [],
    };
  });

  openOrders.forEach((o) => {
    const rawName = (o.client_name || o.customer_name || 'Cliente').trim();
    const matchedTab =
      (o.table_tab_id && openTabsById.get(o.table_tab_id)) ||
      (o.table_label ? openTabsByLabel.get(norm(o.table_label)) : undefined);

    const rName = o.recipe_name || recipeNameById.get(o.recipe_id) || 'Drink';
    const unit =
      o.price != null
        ? Number(o.price)
        : o.unit_price != null
        ? Number(o.unit_price)
        : o.recipe_id && prices[o.recipe_id] != null
        ? Number(prices[o.recipe_id])
        : 0;
    const line = (Number(o.qty) || 1) * unit;
    grandTotal += line;

    if (matchedTab) {
      const key = `tab:${matchedTab.id}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          name: matchedTab.table_label,
          isTable: true,
          tableTabId: matchedTab.id,
          tableCode: matchedTab.code,
          members: Array.isArray(matchedTab.members) ? matchedTab.members : [],
          total: 0,
          ids: [],
          lines: [],
        };
      }
      if (rawName && !grouped[key].members.some((m) => norm(m) === norm(rawName))) {
        grouped[key].members.push(rawName);
      }
      grouped[key].total += line;
      grouped[key].ids.push(o.id);
      grouped[key].lines.push(
        `${o.qty || 1}× ${rName} — ${rawName}${unit ? ` (${money(line)})` : ''}`
      );
      return;
    }

    const key = `client:${norm(rawName) || 'cliente'}`;
    if (!grouped[key]) {
      grouped[key] = {
        key,
        name: rawName,
        isTable: false,
        members: [rawName],
        total: 0,
        ids: [],
        lines: [],
      };
    }
    grouped[key].total += line;
    grouped[key].ids.push(o.id);
    grouped[key].lines.push(`${o.qty || 1}× ${rName}${unit ? ` (${money(line)})` : ''}`);
  });

  const allCustomers = Object.values(grouped).sort((a, b) => {
    if (a.isTable !== b.isTable) return a.isTable ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const searchNorm = norm(clientSearch);
  const customers = allCustomers.filter((c) => {
    if (clientFilter && c.key !== clientFilter) return false;
    if (searchNorm) {
      const matchName = norm(c.name).includes(searchNorm);
      const matchMembers = c.members.some((m) => norm(m).includes(searchNorm));
      const matchCode = c.tableCode && c.tableCode.includes(searchNorm);
      if (!matchName && !matchMembers && !matchCode) return false;
    }
    return true;
  });

  const handleSettle = async (c: CustomerTab) => {
    if (c.ids.length > 0) {
      onSettled(c.ids);
      const r = await sb.from('orders').update({ paid: true, status: 'done' }).in('id', c.ids);
      if (r.error) {
        await sb.from('orders').update({ status: 'done' }).in('id', c.ids);
      }
    }
    if (c.tableTabId) {
      await sb
        .from('table_tabs')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', c.tableTabId);
      if (onRefreshTableTabs) await onRefreshTableTabs();
    }
    if (clientFilter === c.key) setClientFilter('');
    onToast(c.isTable ? `Comanda da ${c.name} fechada! Mesa liberada.` : `Comanda de ${c.name} fechada!`);
    await onRefreshOrders();
  };

  return (
    <div>
      <button type="button" className="b g sm" onClick={onBackMore}>
        ← Voltar para Mais
      </button>
      <h1 className="mt-3">Caixa</h1>
      <p className="mu">
        {bar.name}
        {hasPricing ? ' · Comandas em aberto' : ' · Modo livre (sem cobrança)'}
      </p>
      <div className="pay">
        <div className="row sp">
          <span>Total em aberto ({allCustomers.length} comanda(s) ativa(s))</span>
          <span className="tt">{money(grandTotal)}</span>
        </div>
      </div>

      {allCustomers.length > 0 && (
        <div className="panel mt-3">
          <div className="row sp">
            <h3 className="!m-0">Filtro de clientes / mesas ativas</h3>
            {(clientFilter || clientSearch) && (
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  setClientFilter('');
                  setClientSearch('');
                }}
              >
                Limpar
              </button>
            )}
          </div>
          <input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar mesa, código ou pessoa…"
            className="mt-2"
          />
          <div className="chips !flex-wrap !overflow-visible mt-2">
            <span
              className={`chip ${!clientFilter ? 'on' : ''}`}
              onClick={() => setClientFilter('')}
            >
              Todos ({allCustomers.length})
            </span>
            {allCustomers.map((c) => (
              <span
                key={c.key}
                className={`chip ${clientFilter === c.key ? 'on' : ''}`}
                onClick={() => setClientFilter(clientFilter === c.key ? '' : c.key)}
              >
                {c.isTable ? `🪑 ${c.name}` : c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="list mt-3.5">
        {customers.length > 0 ? (
          customers.map((c) => (
            <div key={c.key} className="!items-start">
              <div className="flex-1 min-w-[180px]">
                <b>{c.isTable ? `🪑 ${c.name}` : c.name}</b>
                {c.tableCode && (
                  <>
                    {' '}
                    <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                      Cód: {c.tableCode}
                    </span>
                  </>
                )}
                {hasPricing && (
                  <>
                    {' · '}
                    <span className="pr">{money(c.total)}</span>
                  </>
                )}
                {c.isTable && c.members.length > 0 && (
                  <div className="mu text-[0.78rem] mt-0.5">
                    Na mesa: <b>{c.members.join(', ')}</b>
                  </div>
                )}
                <div className="mt-1">
                  {c.lines.length > 0 ? (
                    <span className="tag">{c.lines.join(' · ')}</span>
                  ) : (
                    <span className="mu text-[0.78rem]">
                      Comanda aberta via QR da mesa (nenhum pedido feito ainda)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="b sm ok"
                onClick={() => void handleSettle(c)}
              >
                {c.isTable ? (c.ids.length > 0 ? 'Receber / Fechar mesa' : 'Fechar mesa') : 'Receber / Fechar'}
              </button>
            </div>
          ))
        ) : (
          <p className="mu">
            {allCustomers.length > 0
              ? 'Nenhuma comanda encontrada com esse filtro.'
              : 'Nenhuma comanda pendente no caixa agora.'}
          </p>
        )}
      </div>
    </div>
  );
};

export const PricesView: React.FC<{
  bar: Bar;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  onBarUpdated: (bar: Bar) => void;
  onPricesUpdated: (prices: Record<string, number>) => void;
  onItemsChange?: (items: BarItem[]) => void;
  onGoStock?: () => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  items,
  recipes,
  prices,
  onBarUpdated,
  onPricesUpdated,
  onItemsChange,
  onGoStock,
  onBack,
  onToast,
}) => {
  const [pCat, setPCat] = useState('Todas');
  const [pFilter, setPFilter] = useState<'all' | 'missing' | 'priced'>('all');
  const [pQuery, setPQuery] = useState('');
  const [markup, setMarkup] = useState(2.8);
  const [baseCost, setBaseCost] = useState(String(bar.base_cost || 0));
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    Object.keys(prices).forEach((k) => {
      d[k] = String(prices[k]);
    });
    return d;
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      Object.keys(prices).forEach((k) => {
        if (prev[k] == null || prev[k] === '') {
          next[k] = String(prices[k]);
        }
      });
      return next;
    });
  }, [prices]);

  // Trava: só entram na precificação receitas deste bar com TODOS os ingredientes em estoque (in_stock = true)
  const scopedBarRecipes = filterRecipesForBar(recipes, bar.id);
  const availableRecipes = scopedBarRecipes.filter((r) => makeDrink(r, items));
  const makeableCount = availableRecipes.length;
  const readyForMenu = availableRecipes.filter((r) => prices[r.id] != null);
  const pricedMissingStock = scopedBarRecipes.filter(
    (r) => !makeDrink(r, items) && prices[r.id] != null
  );
  const pricedTotal = scopedBarRecipes.filter((r) => prices[r.id] != null).length;
  const unpricedAvailable = availableRecipes.filter((r) => prices[r.id] == null);

  const scopedMissingCount = unpricedAvailable.length;
  const scopedPricedCount = readyForMenu.length;

  const qNorm = norm(pQuery);
  const filtered = availableRecipes.filter((r) => {
    if (pCat !== 'Todas' && r.category !== pCat) return false;
    if (pFilter === 'missing' && prices[r.id] != null) return false;
    if (pFilter === 'priced' && prices[r.id] == null) return false;
    if (qNorm && !norm(r.name).includes(qNorm)) return false;
    return true;
  });

  const handleSaveBase = async () => {
    const r = await sb
      .from('bars')
      .update({ base_cost: Math.max(0, Number(baseCost) || 0) })
      .eq('id', bar.id)
      .select()
      .single();
    if (!r.error && r.data) {
      onBarUpdated(r.data as Bar);
      onToast('Base salva!');
    }
  };

  const addMissingToStock = async (missingNames: string[]) => {
    if (!missingNames.length) return;
    setAddingStock(true);
    let nextItems = [...items];
    const cats = Object.keys(CAT);

    for (const rawName of missingNames) {
      const targetNorm = norm(rawName);
      const existingOut = nextItems.find((it) => norm(it.name) === targetNorm && !it.in_stock);
      if (existingOut) {
        const up = await sb
          .from('bar_items')
          .update({ in_stock: true })
          .eq('id', existingOut.id)
          .select()
          .single();
        if (!up.error && up.data) {
          nextItems = nextItems.map((it) => (it.id === existingOut.id ? (up.data as BarItem) : it));
        }
        continue;
      }
      const alreadyIn = nextItems.some(
        (it) => it.in_stock && (norm(it.name) === targetNorm || norm(it.name).startsWith(targetNorm + ' '))
      );
      if (alreadyIn) continue;

      const inferredCat =
        cats.find((c) =>
          (CAT[c] || []).some((s) => norm(String(s).split('|')[0]) === targetNorm)
        ) || null;

      let ins = await sb
        .from('bar_items')
        .insert({ bar_id: bar.id, name: rawName, in_stock: true, category: inferredCat, unit_cost: 0 })
        .select()
        .single();
      if (ins.error) {
        ins = await sb
          .from('bar_items')
          .insert({ bar_id: bar.id, name: rawName, in_stock: true })
          .select()
          .single();
      }
      if (!ins.error && ins.data) {
        nextItems.push(ins.data as BarItem);
      }
    }

    setAddingStock(false);
    nextItems.sort((a, b) => a.name.localeCompare(b.name));
    if (onItemsChange) onItemsChange(nextItems);
    void broadcastMenuUpdate(bar.id);
    setMsg('Ingredientes adicionados ao estoque e cardápio atualizado!');
    onToast('Estoque e cardápio atualizados!');
  };

  const saveSinglePrice = async (r: Recipe, rawInput: string) => {
    const raw = rawInput.trim().replace(',', '.');
    const canMakeNow = makeDrink(r, items);

    if (raw === '') {
      setSavingId(r.id);
      if (prices[r.id] != null) {
        const del = await sb
          .from('bar_prices')
          .delete()
          .eq('bar_id', bar.id)
          .eq('recipe_id', r.id);
        setSavingId(null);
        if (del.error) {
          onToast('Erro: ' + del.error.message);
          return;
        }
        const nextPrices = { ...prices };
        delete nextPrices[r.id];
        onPricesUpdated(nextPrices);
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[r.id];
          return next;
        });
        void broadcastMenuUpdate(bar.id);
        setMsg(`${r.name} removido de Com preço e enviado para Sem preço.`);
        onToast(`${r.name} enviado para Sem preço`);
      } else {
        setSavingId(null);
        onToast('Digite um preço ou clique em Usar sugerido.');
      }
      return;
    }

    if (!canMakeNow) {
      const missingIngs = getMissingIngredientsForRecipe(r, items);
      const errTxt = `Bloqueado: "${r.name}" não está disponível no estoque (falta: ${missingIngs.join(', ')}).`;
      setMsg(errTxt);
      onToast('🔒 Item indisponível no estoque não pode ser precificado.');
      return;
    }

    setSavingId(r.id);
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
      setSavingId(null);
      onToast('Informe um preço válido.');
      return;
    }

    const num = Math.round(parsed * 100) / 100;
    let up = await sb
      .from('bar_prices')
      .upsert({ bar_id: bar.id, recipe_id: r.id, price: num }, { onConflict: 'bar_id,recipe_id' });

    if (up.error) {
      await sb.from('bar_prices').delete().eq('bar_id', bar.id).eq('recipe_id', r.id);
      up = await sb.from('bar_prices').insert({ bar_id: bar.id, recipe_id: r.id, price: num });
    }

    setSavingId(null);
    if (up.error) {
      onToast('Erro: ' + up.error.message);
      return;
    }

    setDrafts((prev) => ({ ...prev, [r.id]: String(num) }));
    onPricesUpdated({ ...prices, [r.id]: num });
    void broadcastMenuUpdate(bar.id);
    setMsg(`${r.name} salvo (${money(num)}) — já está ativo no cardápio!`);
    onToast(`${r.name} salvo e ativo no cardápio!`);
  };

  const handleApplyMissing = () => {
    const next = { ...drafts };
    let filled = 0;
    availableRecipes.forEach((r) => {
      if (prices[r.id] == null && (!next[r.id] || next[r.id].trim() === '')) {
        next[r.id] = String(suggestedPrice(r, items, bar, markup));
        filled++;
      }
    });
    setDrafts(next);
    if (filled > 0) {
      onToast(`Preços sugeridos para ${filled} receita(s) disponível(is)! Clique em Salvar todos.`);
    } else {
      onToast('Todas as receitas disponíveis já possuem preço ou rascunho.');
    }
  };

  const handleResetAllPrices = async () => {
    setResetting(true);
    const del = await sb.from('bar_prices').delete().eq('bar_id', bar.id);
    setResetting(false);
    setConfirmReset(false);
    if (del.error) {
      onToast('Erro ao zerar preços: ' + del.error.message);
      return;
    }
    setDrafts({});
    onPricesUpdated({});
    setPFilter('missing');
    void broadcastMenuUpdate(bar.id);
    setMsg('Todos os preços foram zerados e todos os itens disponíveis foram movidos para Sem preço.');
    onToast('Preços zerados!');
  };

  const handleSavePrices = async () => {
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const rows: { bar_id: string; recipe_id: string; price: number }[] = [];
    const nextPrices: Record<string, number> = {};
    const toDelete: string[] = [];
    let skippedUnavailable = 0;

    Object.keys(drafts).forEach((rid) => {
      const rec = recipeById.get(rid);
      const raw = (drafts[rid] || '').trim().replace(',', '.');
      if (raw !== '') {
        if (rec && !makeDrink(rec, items)) {
          skippedUnavailable++;
          if (prices[rid] != null) nextPrices[rid] = prices[rid];
          return;
        }
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
          const num = Math.max(0, Math.round(parsed * 100) / 100);
          nextPrices[rid] = num;
          rows.push({ bar_id: bar.id, recipe_id: rid, price: num });
        }
      } else if (prices[rid] != null) {
        toDelete.push(rid);
      }
    });

    setSavingAll(true);
    if (rows.length > 0) {
      let r = await sb.from('bar_prices').upsert(rows, { onConflict: 'bar_id,recipe_id' });
      if (r.error) {
        const rids = rows.map((x) => x.recipe_id);
        await sb.from('bar_prices').delete().eq('bar_id', bar.id).in('recipe_id', rids);
        r = await sb.from('bar_prices').insert(rows);
      }
      if (r.error) {
        setSavingAll(false);
        onToast('Erro: ' + r.error.message);
        return;
      }
    }
    if (toDelete.length > 0) {
      await sb.from('bar_prices').delete().eq('bar_id', bar.id).in('recipe_id', toDelete);
    }
    setSavingAll(false);

    onPricesUpdated(nextPrices);
    void broadcastMenuUpdate(bar.id);
    if (skippedUnavailable > 0) {
      setMsg(
        `Preços salvos! ${skippedUnavailable} item(ns) indisponível(is) no estoque foram bloqueados.`
      );
    } else {
      setMsg('Preços salvos e cardápio atualizado nos clientes!');
    }
    onToast('Preços atualizados!');
  };

  const allMissingForPriced = Array.from(
    new Set(pricedMissingStock.flatMap((r) => getMissingIngredientsForRecipe(r, items)))
  );

  return (
    <div>
      <button type="button" className="b g sm" onClick={onBack}>
        ← Voltar
      </button>
      <div className="row sp mt-3">
        <h1 className="!m-0">Precificação do Bar</h1>
        {unpricedAvailable.length > 0 && (
          <span className="badge-warn !text-xs">
            ⚠️ {unpricedAvailable.length} sem preço
          </span>
        )}
      </div>

      {readyForMenu.length > 0 ? (
        <p className="ok-txt mt-2">
          ✓ <b>{readyForMenu.length}</b> drink(s) ativo(s) no cardápio agora (estoque OK + preço salvo).
        </p>
      ) : (
        <div className="alert-box mt-2">
          <b>⚠️ Nenhum drink aparecendo no cardápio agora</b>
          <p className="mu mt-1">
            {makeableCount === 0
              ? 'Adicione ingredientes no Estoque para liberar receitas e definir seus preços aqui.'
              : 'Defina os preços das receitas disponíveis abaixo para liberá-las no cardápio.'}
          </p>
          {makeableCount === 0 && onGoStock && (
            <div className="mt-2">
              <button type="button" className="b sm" onClick={onGoStock}>
                🍾 Ir para Estoque
              </button>
            </div>
          )}
        </div>
      )}

      <div className="panel !border-[var(--ok)]/40 mt-2">
        <b className="text-sm">
          🔒 Trava ativa: exibindo e liberando preço apenas para receitas disponíveis ({makeableCount})
        </b>
        <p className="mu !m-0 mt-0.5 !text-xs">
          Se algum ingrediente acabar e for marcado como em falta no Estoque, todos os drinks que usam esse item saem automaticamente daqui e dos catálogos.
        </p>
      </div>

      {pricedMissingStock.length > 0 && (
        <div className="alert-box mt-2">
          <b>
            📦 {pricedMissingStock.length} drink(s) saíram dos catálogos porque faltou ingrediente no Estoque:
          </b>
          <p className="mu mt-1">
            {pricedMissingStock
              .slice(0, 4)
              .map((d) => `${d.name} (falta: ${getMissingIngredientsForRecipe(d, items).join(', ')})`)
              .join(' · ')}
          </p>
          <div className="row mt-2 flex-wrap">
            {onGoStock && (
              <button type="button" className="b sm" onClick={onGoStock}>
                🍾 Gerenciar no Estoque
              </button>
            )}
          </div>
        </div>
      )}

      {unpricedAvailable.length > 0 ? (
        <div className="alert-box row sp mt-2">
          <div className="flex-1 min-w-[200px]">
            <b>⚠️ {unpricedAvailable.length} drink(s) disponível(is) no estoque sem preço!</b>
            <p className="mu mt-1">
              Sem preço, não aparece para o cliente:{' '}
              {unpricedAvailable
                .slice(0, 6)
                .map((d) => d.name)
                .join(', ')}
            </p>
          </div>
          <button
            type="button"
            className="b sm"
            onClick={() => setPFilter('missing')}
          >
            Precificar agora
          </button>
        </div>
      ) : (
        makeableCount > 0 && (
          <p className="ok-txt mt-1">✓ Todos os drinks do seu estoque já possuem preço.</p>
        )
      )}

      <div className="panel">
        <div className="row">
          <div className="grow">
            <label>Multiplicador sobre custo base</label>
            <input
              type="number"
              step="0.1"
              min="1.1"
              value={markup}
              onChange={(e) => setMarkup(Math.max(1.1, Number(e.target.value) || 2.8))}
            />
          </div>
          <div className="grow">
            <label>Custo base padrão (R$)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={baseCost}
              onChange={(e) => setBaseCost(e.target.value)}
            />
          </div>
          <div className="self-end">
            <button type="button" className="b sm g" onClick={() => void handleSaveBase()}>
              Salvar base
            </button>
          </div>
        </div>
        <div className="row mt-3 flex-wrap">
          <button type="button" className="b sm" onClick={handleApplyMissing}>
            Sugerir para disponíveis sem preço
          </button>
          <button
            type="button"
            className="b sm ok"
            disabled={savingAll || makeableCount === 0}
            onClick={() => void handleSavePrices()}
          >
            {savingAll ? 'Salvando...' : 'Salvar todos'}
          </button>
          {!confirmReset ? (
            <button
              type="button"
              className="b sm g"
              disabled={pricedTotal === 0 || resetting}
              onClick={() => setConfirmReset(true)}
            >
              Zerar preços
            </button>
          ) : (
            <div className="row">
              <button
                type="button"
                className="b sm"
                disabled={resetting}
                onClick={() => void handleResetAllPrices()}
              >
                {resetting ? 'Zerando...' : 'Confirmar zerar todos'}
              </button>
              <button
                type="button"
                className="b sm g"
                disabled={resetting}
                onClick={() => setConfirmReset(false)}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        type="search"
        value={pQuery}
        onChange={(e) => setPQuery(e.target.value)}
        placeholder="Buscar drink disponível para precificar..."
        className="mt-2"
      />

      <div className="chips">
        {(['all', 'missing', 'priced'] as const).map((f) => (
          <span
            key={f}
            className={`chip ${pFilter === f ? 'on' : ''}`}
            onClick={() => setPFilter(f)}
          >
            {f === 'all'
              ? `Disponíveis (${availableRecipes.length})`
              : f === 'missing'
              ? `Sem preço (${scopedMissingCount})`
              : `Com preço (${scopedPricedCount})`}
          </span>
        ))}
      </div>

      <div className="chips">
        {['Todas', ...CATS].map((c) => (
          <span
            key={c}
            className={`chip ${pCat === c ? 'on' : ''}`}
            onClick={() => setPCat(c)}
          >
            {c}
          </span>
        ))}
      </div>

      {msg && <p className="ok-txt mt-2">{msg}</p>}

      <div className="list mt-3">
        {filtered.length > 0 ? (
          filtered.map((r) => {
            const cur = drafts[r.id];
            const isUnpriced = prices[r.id] == null;
            const cost = estimateRecipeCost(r, items, bar);
            const sug = suggestedPrice(r, items, bar, markup);
            const isSaving = savingId === r.id;
            return (
              <div key={r.id} className="!items-center flex-wrap">
                <div className="flex-1 min-w-[190px]">
                  <b>{r.name}</b>
                  {isUnpriced ? (
                    <>
                      <span className="badge-warn">Sem preço</span>
                      <span className="tag !text-[var(--ok)] ml-1.5">✓ Estoque OK</span>
                    </>
                  ) : (
                    <span className="tag !text-[var(--ok)] ml-1.5">
                      ✓ No cardápio: {money(prices[r.id])}
                    </span>
                  )}
                  <br />
                  <span className="tag">
                    Custo base: {money(cost)} · Sugerido: <b>{money(sug)}</b>
                  </span>
                </div>
                <div className="row flex-wrap">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={cur ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void saveSinglePrice(r, cur ?? '');
                      }
                    }}
                    placeholder="R$"
                    className="!w-[88px]"
                  />
                  <button
                    type="button"
                    className="b sm ok"
                    disabled={isSaving}
                    onClick={() => void saveSinglePrice(r, cur ?? '')}
                  >
                    {isSaving ? '...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    className="b sm g"
                    disabled={isSaving}
                    onClick={() => {
                      const val = String(sug);
                      setDrafts((prev) => ({ ...prev, [r.id]: val }));
                      void saveSinglePrice(r, val);
                    }}
                  >
                    Usar {money(sug)}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="mu">
            {makeableCount === 0
              ? 'Nenhuma receita disponível para fazer agora. Adicione ingredientes com status OK no Estoque para liberar a precificação.'
              : pFilter === 'missing'
              ? 'Nenhum drink disponível sem preço nesta categoria.'
              : pFilter === 'priced'
              ? 'Nenhum drink disponível com preço definido ainda.'
              : 'Nenhum drink disponível encontrado.'}
          </p>
        )}
      </div>

      <button
        type="button"
        className="b full mt-3.5"
        disabled={savingAll || makeableCount === 0}
        onClick={() => void handleSavePrices()}
      >
        {savingAll ? 'Salvando todos...' : 'Salvar todos os preços disponíveis'}
      </button>
    </div>
  );
};


export const MoreView: React.FC<{
  bar: Bar;
  isManager: boolean;
  canEditMenu: boolean;
  hasPricing?: boolean;
  unpricedCount?: number;
  planLabel?: string;
  isProPlan?: boolean;
  isPlatformAdmin?: boolean;
  unreadAdminAlerts?: number;
  activeDeliveryCount?: number;
  supportWhatsAppHref?: string | null;
  uiThemeMode?: UiThemeMode;
  onToggleTheme?: () => void;
  onBarUpdated: (bar: Bar) => void;
  onOpenQr: () => void;
  onOpenShakers: () => void;
  onOpenCreateDrink: (editExisting: boolean) => void;
  onOpenStation?: (station: 'bar' | 'cozinha' | 'garcom') => void;
  onOpenManagement?: (
    subtab:
      | 'dashboard'
      | 'garcons'
      | 'compras'
      | 'happyhour'
      | 'fidelidade'
      | 'reservas'
      | 'modificadores'
      | 'config'
  ) => void;
  onNavigate: (tab: string, careerMode?: 'store' | 'personal') => void;
  onOpenSwitchBar: () => void;
  onOpenAlertSettings?: () => void;
  onOpenPlans?: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenSalesArea?: () => void;
  onOpenSupportDesk?: () => void;
  onOpenSupportChat?: () => void;
  unreadSupportCount?: number;
  isSupportAgent?: boolean;
  canOpenSalesArea?: boolean;
  quickProfile?: SavedQuickProfile | null;
  onQuickProfileChanged?: (next: SavedQuickProfile | null) => void;
  onLockApp?: () => void;
  onOpenSalesSite?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
  actorName?: string;
  userEmail?: string | null;
  avatarUrl?: string | null;
  onOpenEditProfile?: () => void;
  onToast?: (msg: string) => void;
}> = ({
  bar,
  isManager,
  canEditMenu,
  hasPricing = false,
  unpricedCount = 0,
  planLabel = 'Plano Grátis',
  isProPlan = true,
  isPlatformAdmin = false,
  isSupportAgent = false,
  canOpenSalesArea = false,
  unreadAdminAlerts = 0,
  unreadSupportCount = 0,
  activeDeliveryCount = 0,
  supportWhatsAppHref = null,
  uiThemeMode = 'dark',
  quickProfile = null,
  onToggleTheme,
  onBarUpdated,
  onOpenQr,
  onOpenManagement,
  onNavigate,
  onOpenSwitchBar,
  onOpenAlertSettings,
  onOpenPlans,
  onOpenSuperAdmin,
  onOpenSalesArea,
  onOpenSupportDesk,
  onOpenSupportChat,
  onQuickProfileChanged,
  onLockApp,
  onOpenSalesSite,
  onOpenLegal,
  actorName,
  userEmail,
  avatarUrl,
  onOpenEditProfile,
  onToast,
}) => {
  const open = bar.accepting_orders !== false;
  const deliveryCfg = getDeliveryConfig(bar);
  const { prefs: alertPrefs } = useAlertPrefs();
  const alertSummary = getAlertPrefsSummary(alertPrefs, isPlatformAdmin);
  const showLowStockAlerts = alertPrefs.allEnabled && alertPrefs.lowStock;
  const activeHhCount = isProPlan ? getActiveHappyHours(bar).length : 0;
  const [showQuickPinInput, setShowQuickPinInput] = useState(false);
  const [quickPinVal, setQuickPinVal] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const handleToggleOrders = async () => {
    const r = await sb
      .from('bars')
      .update({ accepting_orders: !open })
      .eq('id', bar.id)
      .select()
      .single();
    if (!r.error && r.data) onBarUpdated(r.data as Bar);
  };

  const handleEnableBiometric = async () => {
    const base = quickProfile || getSavedQuickProfile();
    if (!base) {
      onToast?.('Aguarde o perfil carregar para ativar a biometria.');
      return;
    }
    setQuickBusy(true);
    const res = await registerDeviceBiometricUnlock(base);
    setQuickBusy(false);
    if (!res.ok) {
      onToast?.(res.error || 'Biometria indisponível. Use o PIN rápido abaixo.');
      setShowQuickPinInput(true);
      return;
    }
    onQuickProfileChanged?.(getSavedQuickProfile());
    onToast?.('👆 Desbloqueio por digital/Face ID ativado neste celular!');
  };

  const handleSaveQuickPin = async () => {
    const base = quickProfile || getSavedQuickProfile();
    if (!base) return;
    setQuickBusy(true);
    const res = await saveQuickPin(base, quickPinVal);
    setQuickBusy(false);
    if (!res.ok) {
      onToast?.(res.error || 'Digite de 4 a 6 números.');
      return;
    }
    setQuickPinVal('');
    setShowQuickPinInput(false);
    onQuickProfileChanged?.(getSavedQuickProfile());
    onToast?.('🔒 PIN rápido salvo! Agora você pode bloquear a tela e voltar em 1 toque.');
  };

  const handleDisableQuickLock = () => {
    const base = quickProfile || getSavedQuickProfile();
    if (!base) return;
    const next = saveQuickProfile({
      ...base,
      biometricEnabled: false,
      credentialId: undefined,
      pinHash: undefined,
      pinSalt: undefined,
    });
    onQuickProfileChanged?.(next);
    onToast?.('Bloqueio rápido desativado neste aparelho.');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1>Mais</h1>
        <p className="mu">
          {bar.name}
          {' · '}
          <span
            className={
              isProPlan ? 'text-[var(--ok)] font-semibold' : 'text-[var(--ac)] font-semibold'
            }
          >
            {planLabel}
          </span>
          {bar.city && (
            <>
              {' · '}
              <a
                href={externalMapUrl(bar)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--ac)] no-underline"
              >
                📍 {bar.city}
              </a>
            </>
          )}
        </p>
      </div>

      {/* 1. OPERAÇÃO & VENDAS */}
      <section className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)] px-1">
          Operação & Vendas
        </div>
        <div className="menu-row-list !mt-0">
          <button
            type="button"
            className="menu-row-item"
            onClick={() => onNavigate('cashier')}
          >
            <div className="menu-row-text">
              <div className="menu-row-title">💵 Caixa & Turno {!isProPlan ? '· Pro' : ''}</div>
              <div className="menu-row-sub">
                Abertura/fechamento, Pix, maquininha, 10%, divisão e pré-conta
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>

          <button
            type="button"
            className="menu-row-item"
            onClick={() => onNavigate('delivery')}
          >
            <div className="menu-row-text">
              <div className="menu-row-title">
                🛵 Delivery & Motoboys
                {activeDeliveryCount > 0 ? (
                  <span className="badge-warn ml-1.5">{activeDeliveryCount} ativo(s)</span>
                ) : deliveryCfg.enabled ? (
                  <span className="text-[11px] font-bold text-[var(--ok)] ml-2">ATIVO</span>
                ) : null}
              </div>
              <div className="menu-row-sub">
                App próprio (0% taxa), taxas por bairro e despacho no WhatsApp
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>

          <div className="menu-row-item !cursor-default flex-wrap gap-2">
            <div
              className="menu-row-text cursor-pointer"
              onClick={() => (canEditMenu ? onNavigate('studio') : onOpenQr())}
            >
              <div className="menu-row-title">🎨 Cardápio, Perfil & QR Code</div>
              <div className="menu-row-sub">
                Personalize o visual no Modo Canva ou compartilhe o QR das mesas
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" className="b g sm" onClick={onOpenQr}>
                📱 QR
              </button>
              {canEditMenu && (
                <button
                  type="button"
                  className="b sm"
                  onClick={() => onNavigate('studio')}
                >
                  Editar
                </button>
              )}
            </div>
          </div>

          {canEditMenu && (
            <button
              type="button"
              className="menu-row-item"
              onClick={() => onNavigate('prices')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  💰 Precificação
                  {hasPricing && unpricedCount > 0 && showLowStockAlerts && (
                    <span className="badge-warn">{unpricedCount} sem preço</span>
                  )}
                </div>
                <div className="menu-row-sub">
                  Defina preços de venda e margem sugerida sobre o estoque
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. CENTRAL DE GESTÃO UNIFICADA (SUBSTITUI 7 TELAS REPETIDAS) */}
      {onOpenManagement && (
        <section className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)] px-1">
            Gestão do Negócio
          </div>
          <div className="panel space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 bg-transparent border-0 p-0 text-left cursor-pointer text-[var(--tx)]"
              onClick={() => onOpenManagement('dashboard')}
            >
              <div>
                <div className="font-bold text-[15px]">
                  📊 Central de Gestão {!isProPlan ? '· Pro' : ''}
                </div>
                <div className="text-xs text-[var(--mut)] mt-0.5">
                  Financeiro, garçons, promoções, compras, reservas e impressora
                </div>
              </div>
              <span className="text-xl text-[var(--mut)]">›</span>
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--bd)]">
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('dashboard')}
              >
                📈 Financeiro & CMV
              </button>
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('garcons')}
              >
                🍽️ Garçons & Praças
              </button>
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('happyhour')}
              >
                🍻 Happy Hour{activeHhCount > 0 ? ' · ON' : ''}
              </button>
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('fidelidade')}
              >
                🎁 Fidelidade
              </button>
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('compras')}
              >
                🛒 Compras & Perdas
              </button>
              <button
                type="button"
                className="b g sm !justify-start"
                onClick={() => onOpenManagement('reservas')}
              >
                📅 Reservas & CRM
              </button>
              <button
                type="button"
                className="b g sm !justify-start col-span-2 sm:col-span-3"
                onClick={() => onOpenManagement('config')}
              >
                🛡️ Chave Pix, Impressora Bluetooth & Permissões (RBAC)
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 3. APARÊNCIA & PREFERÊNCIAS */}
      <section className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)] px-1">
          Aparência & Preferências
        </div>
        <div className="menu-row-list !mt-0">
          {onToggleTheme && (
            <div className="menu-row-item !cursor-default">
              <div className="menu-row-text">
                <div className="menu-row-title">
                  {uiThemeMode === 'dark' ? '🌙 Modo Noturno' : '☀️ Modo Diurno'}
                </div>
                <div className="menu-row-sub">
                  Contraste automático: letras claras no escuro e letras escuras no claro
                </div>
              </div>
              <button type="button" className="b sm g" onClick={onToggleTheme}>
                {uiThemeMode === 'dark' ? '☀️ Diurno' : '🌙 Noturno'}
              </button>
            </div>
          )}

          <div className="menu-row-item !cursor-default">
            <div className="menu-row-text">
              <div className="menu-row-title">Receber pedidos no cardápio</div>
              <div className="menu-row-sub">{open ? 'Ligado e aceitando pedidos' : 'Pausado'}</div>
            </div>
            <button
              type="button"
              className={`b sm ${open ? 'g' : 'ok'}`}
              onClick={() => void handleToggleOrders()}
            >
              {open ? 'Pausar' : 'Ligar'}
            </button>
          </div>

          {/* LOGIN RÁPIDO COM BIOMETRIA / DESBLOQUEIO DO CELULAR */}
          <div className="menu-row-item !cursor-default !flex-col !items-stretch gap-2.5">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="menu-row-text">
                <div className="menu-row-title">
                  👆 Login Rápido & Desbloqueio do Celular
                  {quickProfile?.biometricEnabled && (
                    <span className="text-[11px] font-bold text-[var(--ok)] ml-2">ATIVO</span>
                  )}
                </div>
                <div className="menu-row-sub">
                  {quickProfile?.credentialId
                    ? 'Digital / Face ID / Tela do celular configurado neste aparelho'
                    : quickProfile?.pinHash
                      ? 'PIN rápido configurado neste aparelho'
                      : 'Salva seu perfil e permite destravar com digital, Face ID ou PIN rápido'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <button
                  type="button"
                  className="b sm"
                  disabled={quickBusy}
                  onClick={() => void handleEnableBiometric()}
                >
                  {quickProfile?.credentialId ? '🔄 Recadastrar Biometria' : '👆 Ativar Biometria'}
                </button>
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => setShowQuickPinInput((v) => !v)}
                >
                  🔢 {quickProfile?.pinHash ? 'Trocar PIN' : 'Definir PIN'}
                </button>
                {quickProfile?.biometricEnabled && onLockApp && (
                  <button type="button" className="b ok sm" onClick={onLockApp}>
                    🔒 Bloquear agora
                  </button>
                )}
              </div>
            </div>

            {showQuickPinInput && (
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--bd)]">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={quickPinVal}
                  onChange={(e) => setQuickPinVal(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                  placeholder="Digite 4 a 6 números"
                  className="grow !mt-0"
                />
                <button
                  type="button"
                  className="b sm ok shrink-0"
                  disabled={quickBusy || quickPinVal.length < 4}
                  onClick={() => void handleSaveQuickPin()}
                >
                  Salvar PIN
                </button>
                {quickProfile?.biometricEnabled && (
                  <button
                    type="button"
                    className="b g sm shrink-0"
                    onClick={handleDisableQuickLock}
                  >
                    Desativar
                  </button>
                )}
              </div>
            )}
          </div>

          {onOpenAlertSettings && (
            <button type="button" className="menu-row-item" onClick={onOpenAlertSettings}>
              <div className="menu-row-text">
                <div className="menu-row-title">
                  {alertSummary.isMuted ? '🔕' : '🔔'} Alertas & Sons ({alertSummary.label})
                </div>
                <div className="menu-row-sub">
                  Configure avisos sonoros de novos pedidos, mesas e estoque baixo
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. EQUIPE, CONTA & DIVULGAÇÃO */}
      <section className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--mut)] px-1">
          Equipe, Conta & Suporte
        </div>
        <div className="menu-row-list !mt-0">
          {onOpenEditProfile && (
            <button
              type="button"
              className="menu-row-item"
              onClick={onOpenEditProfile}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={actorName || 'Perfil'}
                    className="w-9 h-9 rounded-full object-cover border border-[var(--ac)]/50 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[var(--ac)]/20 border border-[var(--ac)]/50 text-[var(--ac)] font-extrabold text-sm flex items-center justify-center shrink-0">
                    {(actorName || userEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="menu-row-text">
                  <div className="menu-row-title truncate">
                    👤 Meu Perfil · {actorName || 'Definir nome'}
                  </div>
                  <div className="menu-row-sub truncate">
                    {userEmail ? `${userEmail} · ` : ''}Alterar nome de exibição e foto de perfil
                  </div>
                </div>
              </div>
              <span className="b g sm shrink-0">Editar</span>
            </button>
          )}
          {isPlatformAdmin && onOpenSuperAdmin && (
            <button
              type="button"
              className="menu-row-item !border-[var(--ac)]/60"
              onClick={onOpenSuperAdmin}
            >
              <div className="menu-row-text">
                <div className="menu-row-title text-[var(--ac)]">
                  👑 Entrar na Área ADM (Separada)
                  {unreadAdminAlerts > 0 && (
                    <span className="badge-warn ml-1.5">🔔 {unreadAdminAlerts} nova(s)</span>
                  )}
                </div>
                <div className="menu-row-sub">
                  Área dedicada à administração da plataforma conforme suas permissões
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          {canOpenSalesArea && onOpenSalesArea && (
            <button
              type="button"
              className="menu-row-item !border-[var(--ac)]/50"
              onClick={onOpenSalesArea}
            >
              <div className="menu-row-text">
                <div className="menu-row-title text-[var(--ac)]">
                  💼 Perfil de Vendas & Simulador Demo
                </div>
                <div className="menu-row-sub">
                  Simulador ao vivo, roteiro de apresentação comercial e calculadora de economia
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          {!isPlatformAdmin && isSupportAgent && onOpenSupportDesk && (
            <button
              type="button"
              className="menu-row-item !border-[var(--ok)]/60"
              onClick={onOpenSupportDesk}
            >
              <div className="menu-row-text">
                <div className="menu-row-title text-[var(--ok)]">
                  🎧 Central de Atendimento (Equipe Suporte)
                </div>
                <div className="menu-row-sub">
                  Responder mensagens das lojas em tempo real
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          <div className="menu-row-item !cursor-default flex-wrap gap-2">
            <div
              className="menu-row-text cursor-pointer"
              onClick={() => onNavigate('careers', isManager ? 'store' : 'personal')}
            >
              <div className="menu-row-title">👥 Equipe, Vagas & Currículo</div>
              <div className="menu-row-sub">
                Gerencie funcionários da loja, vagas publicadas ou seu perfil profissional
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isManager && (
                <button
                  type="button"
                  className="b g sm"
                  onClick={() => onNavigate('careers', 'store')}
                >
                  Equipe
                </button>
              )}
              <button
                type="button"
                className="b g sm"
                onClick={() => onNavigate('careers', 'personal')}
              >
                Currículo
              </button>
            </div>
          </div>

          <button type="button" className="menu-row-item" onClick={onOpenSwitchBar}>
            <div className="menu-row-text">
              <div className="menu-row-title">🏠 Meus bares</div>
              <div className="menu-row-sub">Trocar de unidade ou criar novo bar</div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>

          {onOpenPlans && (
            <button type="button" className="menu-row-item" onClick={onOpenPlans}>
              <div className="menu-row-text">
                <div className="menu-row-title">⭐ Plano & Assinatura ({planLabel})</div>
                <div className="menu-row-sub">
                  {isProPlan
                    ? 'Ver benefícios ativos e status da assinatura'
                    : 'Remova anúncios e libere todos os módulos profissionais'}
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          {onOpenSalesSite && (
            <button type="button" className="menu-row-item" onClick={onOpenSalesSite}>
              <div className="menu-row-text">
                <div className="menu-row-title">🌐 Conhecer o Meu Bar (Apresentação)</div>
                <div className="menu-row-sub">
                  Apresentação interativa por problema do cliente com telas e exemplos
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          <PWAInstallButton variant="row" />

          {onOpenSupportChat && (
            <button
              type="button"
              className="menu-row-item"
              onClick={onOpenSupportChat}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  💬 Chat Direto com o Suporte (no app)
                  {unreadSupportCount > 0 && (
                    <span className="badge-warn ml-1.5">{unreadSupportCount} nova(s)</span>
                  )}
                </div>
                <div className="menu-row-sub">
                  Fale direto com nossa equipe dentro do Meu Bar em tempo real
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          )}

          {supportWhatsAppHref && (
            <a
              href={supportWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="menu-row-item no-underline"
            >
              <div className="menu-row-text">
                <div className="menu-row-title">💬 Suporte no WhatsApp</div>
                <div className="menu-row-sub">Dúvidas sobre implantação, impressora ou Plano Pro</div>
              </div>
              <span className="menu-row-chev">›</span>
            </a>
          )}
        </div>
      </section>

      {onOpenLegal && (
        <div className="pt-2 flex items-center justify-center gap-3 text-xs text-[var(--mut)]">
          <button
            type="button"
            className="bg-transparent border-0 text-[var(--mut)] hover:text-[var(--fg)] underline cursor-pointer p-0"
            onClick={() => onOpenLegal('terms')}
          >
            Termos de Uso
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            className="bg-transparent border-0 text-[var(--mut)] hover:text-[var(--fg)] underline cursor-pointer p-0"
            onClick={() => onOpenLegal('privacy')}
          >
            Política de Privacidade
          </button>
        </div>
      )}
    </div>
  );
};
