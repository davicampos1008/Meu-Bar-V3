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
  getDefaultUnitForIngredient,
  getUnitMeta,
  STARTER_KITS,
  STOCK_UNITS,
  type StockUnitId,
} from '../lib/catalog';
import {
  autoDeductStockForOrder,
  getActiveHappyHours,
  getDeliveryConfig,
  logBarAudit,
  parseDeliveryOrderMeta,
  playStationAlert,
} from '../lib/opsUtils';
import { broadcastMenuUpdate, sb } from '../lib/supabase';
import {
  estimateRecipeCost,
  externalMapUrl,
  filterRecipesForBar,
  getMissingIngredientsForRecipe,
  getRecipeItemType,
  getUnpricedAvailableDrinks,
  makeDrink,
  matchRecipeTags,
  money,
  norm,
  recipeTags,
  suggestedPrice,
} from '../lib/utils';
import type { Bar, BarItem, BarMember, Order, Recipe, TableCallAlert, TableTab } from '../types/meubar';
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
  onGoPrices?: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
}> = ({
  bar,
  items,
  recipes,
  prices,
  hasPricing,
  unpricedCount = 0,
  onGoPrices,
  onSelectRecipe,
}) => {
  const [rFilter, setRFilter] = useState<'can' | 'missing' | 'all'>('can');
  const [rCat, setRCat] = useState('Todas');
  const [rQuery, setRQuery] = useState('');
  const [rTags, setRTags] = useState<Set<string>>(new Set());
  const [showTags, setShowTags] = useState(false);

  const drinkRecipes = filterRecipesForBar(recipes, bar.id).filter(
    (r) => getRecipeItemType(r) === 'drink'
  );
  const canList = drinkRecipes.filter((r) => makeDrink(r, items));
  const missingList = drinkRecipes.filter((r) => !makeDrink(r, items));
  const basePool = rFilter === 'can' ? canList : rFilter === 'missing' ? missingList : drinkRecipes;
  const q = rQuery.trim().toLowerCase();

  const filtered = basePool.filter((r) => {
    if (rCat !== 'Todas' && r.category !== rCat) return false;
    if (!matchRecipeTags(r, rTags)) return false;
    if (q) {
      const inName = (r.name || '').toLowerCase().includes(q);
      const inIng = (r.ingredients || []).some((i) => (i.n || '').toLowerCase().includes(q));
      if (!inName && !inIng) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="row sp items-start">
        <div>
          <h1>Receitas</h1>
          <p className="mu">
            {bar.name} · você faz {canList.length}
          </p>
        </div>
        <div className="row">
          <button type="button" className="b sm g" onClick={() => setShowTags((s) => !s)}>
            ✨ O que tomar?
          </button>
          <select
            value={rCat}
            onChange={(e) => setRCat(e.target.value)}
            className="!w-auto py-2 px-3 text-[0.85rem]"
          >
            {['Todas', ...CATS].map((c) => (
              <option key={c} value={c}>
                {c === 'Todas' ? 'Categorias' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input
        value={rQuery}
        onChange={(e) => setRQuery(e.target.value)}
        placeholder="Buscar drink"
        className="mt-3.5"
      />

      <div className="chips mt-2.5">
        <button
          type="button"
          className={`chip ${rFilter === 'can' ? 'on' : ''}`}
          onClick={() => setRFilter('can')}
        >
          Faço agora
        </button>
        <button
          type="button"
          className={`chip ${rFilter === 'missing' ? 'on' : ''}`}
          onClick={() => setRFilter('missing')}
        >
          Falta {missingList.length}
        </button>
        <button
          type="button"
          className={`chip ${rFilter === 'all' ? 'on' : ''}`}
          onClick={() => setRFilter('all')}
        >
          Todas
        </button>
      </div>

      {showTags && (
        <div className="chips !flex-wrap !overflow-visible mt-1.5">
          {ALL_TAGS.map((t) => (
            <span
              key={t}
              className={`chip ${rTags.has(t) ? 'on' : ''}`}
              onClick={() => {
                const next = new Set(rTags);
                if (next.has(t)) next.delete(t);
                else next.add(t);
                setRTags(next);
              }}
            >
              {t}
            </span>
          ))}
          {rTags.size > 0 && (
            <span
              className="chip border-dashed"
              onClick={() => setRTags(new Set())}
            >
              Limpar
            </span>
          )}
        </div>
      )}

      {hasPricing && unpricedCount > 0 && (
        <div className="alert-box row sp mt-3">
          <div className="flex-1 min-w-[200px]">
            <b>⚠️ {unpricedCount} drink(s) disponível(is) sem preço</b>
            <p className="mu mt-0.5">
              Adicione preço para eles aparecerem automaticamente no cardápio dos clientes.
            </p>
          </div>
          {onGoPrices && (
            <button type="button" className="b sm" onClick={onGoPrices}>
              Precificar ({unpricedCount})
            </button>
          )}
        </div>
      )}

      <div className="menu-items mt-3.5">
        {filtered.length > 0 ? (
          filtered.map((r) => {
            const tg = recipeTags(r).slice(0, 2);
            const missingIngs = getMissingIngredientsForRecipe(r, items);
            const canMakeNow = missingIngs.length === 0;
            const pr = hasPricing && prices[r.id] != null ? money(prices[r.id]) : null;
            return (
              <button
                key={r.id}
                type="button"
                className="card"
                onClick={() => onSelectRecipe(r)}
              >
                <RecipeTile recipe={r} />
                <div className="t">
                  <div>
                    <div>{r.name}</div>
                    {!canMakeNow ? (
                      <span className="pill-tag !text-red-300 !border-red-400/30">
                        ❌ Falta: {missingIngs.slice(0, 2).join(', ')}
                        {missingIngs.length > 2 ? ` +${missingIngs.length - 2}` : ''}
                      </span>
                    ) : (
                      tg.length > 0 && <span className="pill-tag">{tg.join(' · ')}</span>
                    )}
                  </div>
                  {pr && canMakeNow ? (
                    <span className="tag pr">{pr}</span>
                  ) : hasPricing && canMakeNow ? (
                    <span className="badge-warn !ml-0">Sem preço</span>
                  ) : null}
                </div>
              </button>
            );
          })
        ) : (
          <p className="mu">Nenhuma receita encontrada com esse filtro.</p>
        )}
      </div>
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
  onGoPrices,
  onOpenCompras,
  onToast,
}) => {
  const cats = Object.keys(CAT);
  const [stockCat, setStockCat] = useState('');
  const [stockQ, setStockQ] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState(cats[0] || 'Outros');
  const unpricedAvailable = getUnpricedAvailableDrinks(recipes, items, prices, bar);
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState<StockUnitId>('garrafa');
  const [sizeMl, setSizeMl] = useState('750');
  const [variant, setVariant] = useState('');
  const [cost, setCost] = useState('');
  const [err, setErr] = useState('');
  const [showShopping, setShowShopping] = useState(false);
  const [showStarterKits, setShowStarterKits] = useState(() => items.length < 5);
  const [addingKitId, setAddingKitId] = useState<string | null>(null);
  const [quickAddingIng, setQuickAddingIng] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BarItem | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [edBrand, setEdBrand] = useState('');
  const [edVariant, setEdVariant] = useState('');
  const [edUnit, setEdUnit] = useState<StockUnitId>('garrafa');
  const [edSize, setEdSize] = useState('');
  const [edCost, setEdCost] = useState('');
  const [edQty, setEdQty] = useState('');
  const [edMinQty, setEdMinQty] = useState('');
  const [edSupplier, setEdSupplier] = useState('');
  const [edErr, setEdErr] = useState('');

  const drinkRecipes = filterRecipesForBar(recipes, bar.id).filter(
    (r) => getRecipeItemType(r) === 'drink'
  );

  // Calcula quais ingredientes faltantes liberam mais receitas imediatamente (falta só 1 item)
  const unlockMap = new Map<string, { label: string; recipes: string[] }>();
  const nearTwoList: { recipe: string; missing: string[] }[] = [];
  drinkRecipes.forEach((r) => {
    const miss = getMissingIngredientsForRecipe(r, items);
    if (miss.length === 1) {
      const rawIng = miss[0];
      const key = norm(rawIng);
      const cur = unlockMap.get(key);
      if (cur) {
        if (!cur.recipes.includes(r.name)) cur.recipes.push(r.name);
      } else {
        unlockMap.set(key, { label: rawIng, recipes: [r.name] });
      }
    } else if (miss.length === 2) {
      nearTwoList.push({ recipe: r.name, missing: miss });
    }
  });
  const unlockSuggestions = Array.from(unlockMap.values()).sort(
    (a, b) => b.recipes.length - a.recipes.length || a.label.localeCompare(b.label)
  );

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

  const list = items.filter((i) => {
    const matchCat = !stockCat || i.category === stockCat || namesInCat.includes(i.name);
    const matchQ = !q || i.name.toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q);
    return matchCat && matchQ;
  });

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
    const insertedItem: BarItem = { ...(r.data as BarItem), unit: (r.data as BarItem).unit || unit };
    const next = [...items, insertedItem].sort((a, b) => a.name.localeCompare(b.name));
    onItemsChange(next);
    void broadcastMenuUpdate(bar.id);
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
    setEdUnit((it.unit as StockUnitId) || def.unit);
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
              qty: parsedQty !== null ? parsedQty : x.qty,
              min_qty: edMinQty !== '' ? Math.max(0, parseInt(edMinQty, 10) || 0) : x.min_qty,
              supplier: edSupplier.trim() || null,
            }
          : x
      )
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
        <div className="panel mt-3 !border-[var(--ac)]">
          <div className="row sp">
            <div>
              <h3 className="!m-0">💡 O que comprar para liberar receitas</h3>
              <p className="mu mt-0.5 text-[0.78rem]">
                Itens que faltam sozinhos para desbloquear novos drinks imediatamente no seu bar.
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
          {unlockSuggestions.length > 0 ? (
            <div className="list mt-2.5">
              {unlockSuggestions.map((sug) => {
                const isAdding = quickAddingIng === norm(sug.label);
                return (
                  <div key={sug.label} className="!items-start">
                    <div className="flex-1 min-w-[180px]">
                      <b>{sug.label}</b>{' '}
                      <span className="chip st1 !py-0.5 !px-2 !text-[0.72rem]">
                        +{sug.recipes.length} {sug.recipes.length === 1 ? 'receita' : 'receitas'}
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
          ) : (
            <p className="mu mt-2">
              {nearTwoList.length > 0
                ? `Nenhum drink está a apenas 1 ingrediente. ${nearTwoList.length} receita(s) precisam de 2 itens (ex: ${nearTwoList[0].recipe}: ${nearTwoList[0].missing.join(' + ')}).`
                : 'Você já tem ingredientes para todas as receitas cadastradas ou falta montar sua base no estoque!'}
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
        <label className="!mt-0">1. Buscar item pelo nome (em todas as categorias ou na escolhida)</label>
        <input
          value={stockQ}
          onChange={(e) => setStockQ(e.target.value)}
          placeholder="Ex: Gin, Vodka, Limão, Xarope de morango…"
        />

        <label>2. Tipo / categoria (opcional)</label>
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
            setSelectedName(val);
            if (val && val !== '__custom__') {
              const catFound =
                stockCat || allCatalogEntries.find((en) => en.name === val)?.category || null;
              const def = getDefaultUnitForIngredient(val, catFound);
              setUnit(def.unit);
              setSizeMl(def.defaultSize ? String(def.defaultSize) : '');
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <div>
            <label className="!mt-0">Unidade de medida (como você compra)</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as StockUnitId)}>
              {STOCK_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="!mt-0">{activeUnitMeta.costLabel}</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder={`Ex: R$ por ${activeUnitMeta.short}`}
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
            const meta: string[] = [];
            meta.push(`📏 ${uMeta.label}`);
            if (i.brand) meta.push(i.brand);
            if (i.variant) meta.push(i.variant);
            if (i.size_ml && uMeta.showSize) meta.push(`${i.size_ml} ml`);
            if (i.qty != null) meta.push(`qtd: ${i.qty} ${uMeta.short}`);
            if (i.min_qty != null && Number(i.min_qty) > 0) meta.push(`mín: ${i.min_qty}`);
            if (i.unit_cost != null && Number(i.unit_cost) > 0) {
              meta.push(`custo ${money(i.unit_cost)} / ${uMeta.short}`);
            } else {
              meta.push(`custo não informado (R$/${uMeta.short})`);
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
          <p className="mu">Nenhum item listado.</p>
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
            <select value={edUnit} onChange={(e) => setEdUnit(e.target.value as StockUnitId)}>
              {STOCK_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <label>{editUnitMeta.costLabel}</label>
            <input
              type="number"
              step="0.1"
              value={edCost}
              onChange={(e) => setEdCost(e.target.value)}
              placeholder={`R$ por ${editUnitMeta.short}`}
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
  onBarUpdated: (bar: Bar) => void;
  onItemsChange?: (items: BarItem[]) => void;
  onRefreshOrders: () => Promise<void>;
  onRefreshTableTabs?: () => Promise<void>;
  onResolveCall?: (id: string) => Promise<void>;
  onRecipesUpdated?: () => Promise<void>;
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
  onBarUpdated,
  onItemsChange,
  onRefreshOrders,
  onRefreshTableTabs,
  onResolveCall,
  onRecipesUpdated,
  onGoStock,
  onOpenCatalog,
  onToast,
}) => {
  const [stationMode, setStationMode] = useState<'all' | 'bar' | 'cozinha' | 'garcom'>(
    defaultStation
  );
  const [clientFilter, setClientFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    setStationMode(defaultStation);
  }, [defaultStation]);

  const open = bar.accepting_orders !== false;
  const activeAll = orders.filter((o) => o.status !== 'done');
  const recipeMapById = new Map(recipes.map((r) => [r.id, r]));
  const recipeNameById = new Map(recipes.map((r) => [r.id, r.name]));

  const barStationCount = activeAll.filter((o) => {
    const rec = recipeMapById.get(o.recipe_id);
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
    const rName = o.recipe_name || recipeNameById.get(o.recipe_id) || 'Drink';
    const dlv = parseDeliveryOrderMeta(o);
    const displayNote = dlv ? dlv.cleanItemNote : o.note || '';
    const key = `${o.recipe_id || rName}|${o.status || 'pending'}|${displayNote}`;
    if (!map[key]) {
      map[key] = {
        key,
        recipeName: rName,
        status: o.status,
        note: displayNote,
        qty: 0,
        orders: [],
        names: [],
      };
      groups.push(map[key]);
    }
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

      {stationMode === 'bar' && (
        <BarmanStationView
          bar={bar}
          role={role}
          actorName={actorName}
          orders={orders}
          recipes={recipes}
          onSetOrderStatus={handleSingleStatus}
          onCancelOrder={handleCancelOrder}
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
                <div className="acts">
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
            {allMissingForPriced.length > 0 && (
              <button
                type="button"
                className="b sm ok"
                disabled={addingStock}
                onClick={() => void addMissingToStock(allMissingForPriced)}
              >
                {addingStock
                  ? 'Adicionando...'
                  : `+ Repor faltantes no Estoque (${allMissingForPriced.slice(0, 3).join(', ')}${allMissingForPriced.length > 3 ? '…' : ''})`}
              </button>
            )}
            {onGoStock && (
              <button type="button" className="b sm g" onClick={onGoStock}>
                Ir para Estoque
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
  onBarUpdated: (bar: Bar) => void;
  onOpenQr: () => void;
  onOpenShakers: () => void;
  onOpenCreateDrink: (editExisting: boolean) => void;
  onOpenStation?: (station: 'bar' | 'cozinha' | 'garcom') => void;
  onOpenManagement?: (
    subtab:
      | 'dashboard'
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
  onOpenLegal?: (tab: 'terms' | 'privacy') => void;
}> = ({
  bar,
  isManager,
  canEditMenu,
  hasPricing = false,
  unpricedCount = 0,
  planLabel = 'Plano Grátis',
  isProPlan = true,
  isPlatformAdmin = false,
  unreadAdminAlerts = 0,
  activeDeliveryCount = 0,
  supportWhatsAppHref = null,
  onBarUpdated,
  onOpenQr,
  onOpenShakers,
  onOpenCreateDrink,
  onOpenStation,
  onOpenManagement,
  onNavigate,
  onOpenSwitchBar,
  onOpenAlertSettings,
  onOpenPlans,
  onOpenSuperAdmin,
  onOpenLegal,
}) => {
  const open = bar.accepting_orders !== false;
  const deliveryCfg = getDeliveryConfig(bar);
  const { prefs: alertPrefs } = useAlertPrefs();
  const alertSummary = getAlertPrefsSummary(alertPrefs, isPlatformAdmin);
  const showLowStockAlerts = alertPrefs.allEnabled && alertPrefs.lowStock;

  const handleToggleOrders = async () => {
    const r = await sb
      .from('bars')
      .update({ accepting_orders: !open })
      .eq('id', bar.id)
      .select()
      .single();
    if (!r.error && r.data) onBarUpdated(r.data as Bar);
  };

  return (
    <div>
      <h1>Mais</h1>
      <p className="mu">
        {bar.name}
        {' · '}
        <span className={isProPlan ? 'text-[var(--ok)] font-semibold' : 'text-[var(--ac)] font-semibold'}>
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
              📍 {bar.city} (Abrir mapa)
            </a>
          </>
        )}
      </p>

      <div className="menu-row-list">
        {isPlatformAdmin && onOpenSuperAdmin && (
          <button
            type="button"
            className="menu-row-item !border-[var(--ac)]/60"
            onClick={onOpenSuperAdmin}
          >
            <div className="menu-row-text">
              <div className="menu-row-title text-[var(--ac)]">
                👑 Painel Admin SaaS (Contas, VIP & Anúncios)
                {unreadAdminAlerts > 0 && (
                  <span className="badge-warn !bg-emerald-500/20 !text-emerald-200 ml-1.5">
                    🔔 {unreadAdminAlerts} nova(s)
                  </span>
                )}
              </div>
              <div className="menu-row-sub">
                Liberar VIP grátis, gerenciar lojas, banners de parceiros e Google AdSense
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

        {onOpenPlans && (
          <button type="button" className="menu-row-item" onClick={onOpenPlans}>
            <div className="menu-row-text">
              <div className="menu-row-title">
                ⭐ Plano & Assinatura ({planLabel})
              </div>
              <div className="menu-row-sub">
                {isProPlan
                  ? 'Ver benefícios ativos, validade e opções de download grátis'
                  : 'Remova anúncios e libere Happy Hour, Fidelidade, Equipe e Bluetooth'}
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

        <div className="menu-row-item !cursor-default">
          <div className="menu-row-text">
            <div className="menu-row-title">Receber pedidos</div>
            <div className="menu-row-sub">{open ? 'Ligado' : 'Pausado'}</div>
          </div>
          <button
            type="button"
            className="b sm g"
            onClick={() => void handleToggleOrders()}
          >
            {open ? 'Pausar' : 'Ligar'}
          </button>
        </div>

        {onOpenAlertSettings && (
          <button type="button" className="menu-row-item" onClick={onOpenAlertSettings}>
            <div className="menu-row-text">
              <div className="menu-row-title">
                {alertSummary.isMuted ? '🔕' : '🔔'} Alertas & Notificações
                <span
                  className={`badge-warn ml-1.5 ${
                    alertSummary.isMuted
                      ? '!bg-red-500/20 !text-red-200'
                      : '!bg-emerald-500/20 !text-emerald-200'
                  }`}
                >
                  {alertSummary.label}
                </span>
              </div>
              <div className="menu-row-sub">
                Ative ou desative sons, vibração, pedidos, mesas, estoque e alertas do app
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

        <button type="button" className="menu-row-item" onClick={onOpenQr}>
          <div className="menu-row-text">
            <div className="menu-row-title">📱 QR do cardápio</div>
            <div className="menu-row-sub">Para convidados ou clientes (inclui mesas)</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button type="button" className="menu-row-item" onClick={onOpenShakers}>
          <div className="menu-row-text">
            <div className="menu-row-title">🍸 Coqueteleiras</div>
            <div className="menu-row-sub">Tamanhos que você usa</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onOpenCreateDrink(false)}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">➕ Criar drink</div>
            <div className="menu-row-sub">Receita nova, com foto e história</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onOpenCreateDrink(true)}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">✏️ Editar receita</div>
            <div className="menu-row-sub">Importe, ajuste e atualize ou crie nova</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onNavigate('catalog')}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">🍟 Petiscos, Comidas & Avulsos</div>
            <div className="menu-row-sub">
              Cadastre porções, lanches, cervejas, energéticos e latas no cardápio
            </div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        {onOpenStation && (
          <div className="panel mt-1 mb-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--ac)] mb-2">
              🎯 Áreas Operacionais da Equipe {!isProPlan ? '· Pro' : ''}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="b g sm"
                onClick={() => onOpenStation('bar')}
              >
                🍸 Barman
              </button>
              <button
                type="button"
                className="b g sm"
                onClick={() => onOpenStation('cozinha')}
              >
                🍳 Cozinha
              </button>
              <button
                type="button"
                className="b g sm"
                onClick={() => onOpenStation('garcom')}
              >
                🍽️ Garçom
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onNavigate('delivery')}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">
              🛵 Delivery & Motoboys
              {activeDeliveryCount > 0 ? (
                <span className="badge-warn !bg-sky-500/25 !text-sky-200 ml-1.5">
                  {activeDeliveryCount} ativo(s)
                </span>
              ) : deliveryCfg.enabled ? (
                <span className="badge-warn !bg-emerald-500/20 !text-emerald-300 ml-1.5">
                  ATIVO
                </span>
              ) : null}
            </div>
            <div className="menu-row-sub">
              App externo de pedidos (0% comissão), fila de entrega e despacho p/ motoboy no WhatsApp
            </div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onNavigate('cashier')}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">💵 Caixa & Turno {!isProPlan ? '· Pro' : ''}</div>
            <div className="menu-row-sub">
              Abertura/fechamento, maquininha/Pix/dinheiro, 10%, divisão e pré-conta
            </div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        {onOpenManagement && (
          <>
            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('happyhour')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  🍻 Happy Hour Automático {!isProPlan ? '· Pro' : ''}
                  {isProPlan && getActiveHappyHours(bar).length > 0 && (
                    <span className="badge-warn !bg-emerald-500/20 !text-emerald-300">
                      ATIVO AGORA
                    </span>
                  )}
                </div>
                <div className="menu-row-sub">
                  Cadastre promoções por dia e horário que ligam e desligam sozinhas
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>

            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('fidelidade')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  🎁 Cartão Fidelidade & Cashback {!isProPlan ? '· Pro' : ''}
                </div>
                <div className="menu-row-sub">
                  Carimbos ou cashback % por cliente com resgate automático no Caixa
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>

            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('dashboard')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  📊 Relatórios, Financeiro & Lucro {!isProPlan ? '· Pro' : ''}
                </div>
                <div className="menu-row-sub">
                  Faturamento, CMV, lucro líquido, top vendidos, picos e exportação CSV
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>

            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('compras')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  🛒 Compras, Fornecedores & Perdas {!isProPlan ? '· Pro' : ''}
                </div>
                <div className="menu-row-sub">
                  Lista automática de reposição, WhatsApp, quebras e cortesias
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>

            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('reservas')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">
                  📅 Reservas de Mesa & Clientes (CRM) {!isProPlan ? '· Pro' : ''}
                </div>
                <div className="menu-row-sub">
                  Agenda de reservas e ranking automático dos clientes frequentes
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>

            <button
              type="button"
              className="menu-row-item"
              onClick={() => onOpenManagement('config')}
            >
              <div className="menu-row-text">
                <div className="menu-row-title">🛡️ Pix, Bluetooth, Adicionais & Permissões</div>
                <div className="menu-row-sub">
                  Chave Pix da loja, impressora Bluetooth ESC/POS, baixa automática e RBAC
                </div>
              </div>
              <span className="menu-row-chev">›</span>
            </button>
          </>
        )}

        {canEditMenu && (
          <button
            type="button"
            className="menu-row-item"
            onClick={() => onNavigate('studio')}
          >
            <div className="menu-row-text">
              <div className="menu-row-title">🎨 Editor: Perfil, Cardápio & Arte QR</div>
              <div className="menu-row-sub">
                Personalize o perfil da loja, cardápio, promoções e placas de QR Code
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

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
                {hasPricing && unpricedCount > 0 && showLowStockAlerts
                  ? `${unpricedCount} item(ns) do estoque aguardando preço para o cardápio`
                  : 'Preços dos drinks (cardápio pago)'}
              </div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

        {isManager && (
          <button
            type="button"
            className="menu-row-item"
            onClick={() => onNavigate('careers', 'store')}
          >
            <div className="menu-row-text">
              <div className="menu-row-title">👥 Equipe & Vagas da loja</div>
              <div className="menu-row-sub">Criar vagas, currículos recebidos e equipe</div>
            </div>
            <span className="menu-row-chev">›</span>
          </button>
        )}

        <button
          type="button"
          className="menu-row-item"
          onClick={() => onNavigate('careers', 'personal')}
        >
          <div className="menu-row-text">
            <div className="menu-row-title">📄 Meu currículo & Vagas</div>
            <div className="menu-row-sub">Currículo, vagas na região e entrar em loja</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <button type="button" className="menu-row-item" onClick={onOpenSwitchBar}>
          <div className="menu-row-text">
            <div className="menu-row-title">🏠 Meus bares</div>
            <div className="menu-row-sub">Trocar ou criar bar</div>
          </div>
          <span className="menu-row-chev">›</span>
        </button>

        <PWAInstallButton variant="row" />

        {supportWhatsAppHref && (
          <a
            href={supportWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="menu-row-item no-underline"
          >
            <div className="menu-row-text">
              <div className="menu-row-title">💬 Suporte & Atendimento (WhatsApp)</div>
              <div className="menu-row-sub">Dúvidas sobre o app, configuração ou Plano Pro</div>
            </div>
            <span className="menu-row-chev">›</span>
          </a>
        )}
      </div>

      {onOpenLegal && (
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-[var(--mut)]">
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
