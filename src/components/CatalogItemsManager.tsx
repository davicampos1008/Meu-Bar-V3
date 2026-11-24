import React, { useMemo, useState } from 'react';
import { AVULSO_CATS, PETISCO_CATS } from '../lib/catalog';
import { broadcastMenuUpdate, sb } from '../lib/supabase';
import {
  filterRecipesForBar,
  getRecipeItemType,
  isRecipeManuallyUnavailable,
  money,
} from '../lib/utils';
import type { Bar, ItemType, Recipe } from '../types/meubar';
import { ImageUploader } from './SharedUI';

interface CatalogItemsManagerProps {
  bar: Bar;
  userId: string;
  recipes: Recipe[];
  prices: Record<string, number>;
  initialType?: 'petisco' | 'avulso';
  onChanged: () => Promise<void>;
  onToast: (msg: string) => void;
  onBack?: () => void;
}

export const CatalogItemsManager: React.FC<CatalogItemsManagerProps> = ({
  bar,
  userId,
  recipes,
  prices,
  initialType = 'petisco',
  onChanged,
  onToast,
  onBack,
}) => {
  const [activeType, setActiveType] = useState<'petisco' | 'avulso'>(initialType);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(
    initialType === 'petisco' ? PETISCO_CATS[0] : AVULSO_CATS[0]
  );
  const [priceStr, setPriceStr] = useState('');
  const [costStr, setCostStr] = useState('');
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  const cats = activeType === 'petisco' ? PETISCO_CATS : AVULSO_CATS;

  const list = useMemo(() => {
    return filterRecipesForBar(recipes, bar.id)
      .filter((r) => getRecipeItemType(r) === activeType)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [recipes, bar.id, activeType]);

  const resetForm = (nextType: 'petisco' | 'avulso' = activeType) => {
    setEditingId(null);
    setName('');
    setCategory(nextType === 'petisco' ? PETISCO_CATS[0] : AVULSO_CATS[0]);
    setPriceStr('');
    setCostStr('');
    setKitchenNotes('');
    setDescription('');
    setImageUrl('');
    setAvailable(true);
  };

  const switchType = (nextType: 'petisco' | 'avulso') => {
    setActiveType(nextType);
    resetForm(nextType);
  };

  const startEdit = (r: Recipe) => {
    const t = getRecipeItemType(r) === 'avulso' ? 'avulso' : 'petisco';
    setActiveType(t);
    setEditingId(r.id);
    setName(r.name);
    setCategory(r.category || (t === 'petisco' ? PETISCO_CATS[0] : AVULSO_CATS[0]));
    setPriceStr(prices[r.id] != null ? String(prices[r.id]) : '');
    setCostStr(r.base_cost != null ? String(r.base_cost) : '');
    setKitchenNotes(r.steps || r.instructions || '');
    setDescription(r.story || r.description || '');
    setImageUrl(r.image_url || '');
    setAvailable(!isRecipeManuallyUnavailable(r));
  };

  const buildInternalTags = (type: ItemType, isAvail: boolean) => [
    `__type:${type}`,
    `__bar:${bar.id}`,
    isAvail ? '__avail:1' : '__avail:0',
  ];

  const writeRecipeSafe = async (
    payload: Record<string, unknown>,
    id?: string | null
  ): Promise<{ id?: string; error?: string }> => {
    const attempt = async (body: Record<string, unknown>) => {
      if (id) {
        const res = await sb.from('recipes').update(body).eq('id', id).select('id').single();
        return res;
      }
      const res = await sb.from('recipes').insert(body).select('id').single();
      return res;
    };

    let res = await attempt(payload);
    if (res.error && /item_type|column .* does not exist/i.test(res.error.message || '')) {
      const { item_type: _omit, ...rest } = payload;
      res = await attempt(rest);
    }
    if (res.error) return { error: res.error.message };
    return { id: (res.data as { id?: string } | null)?.id || id || undefined };
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onToast('Informe o nome do item.');
      return;
    }
    const numPrice = Number(priceStr.replace(',', '.'));
    if (!(numPrice > 0)) {
      onToast('Informe um preço válido para aparecer no cardápio.');
      return;
    }

    setSaving(true);
    try {
      const numCost = costStr.trim() !== '' ? Math.max(0, Number(costStr.replace(',', '.')) || 0) : null;
      const payload: Record<string, unknown> = {
        owner: userId,
        is_public: false,
        name: name.trim(),
        category: category || cats[0],
        item_type: activeType,
        base_cost: numCost,
        ingredients: available ? [] : [{ n: '__INDISPONIVEL__', q: '' }],
        story: description.trim() || null,
        steps:
          kitchenNotes.trim() ||
          (activeType === 'petisco'
            ? 'Preparar na cozinha e enviar para a bancada do garçom.'
            : 'Servir bem gelado direto do bar.'),
        image_url: imageUrl.trim() || null,
        tags: buildInternalTags(activeType, available),
      };

      const saved = await writeRecipeSafe(payload, editingId);
      if (saved.error || !saved.id) {
        onToast('Erro ao salvar item: ' + (saved.error || 'falha desconhecida'));
        return;
      }

      const pr = await sb
        .from('bar_prices')
        .upsert({ bar_id: bar.id, recipe_id: saved.id, price: numPrice });
      if (pr.error) {
        onToast('Item salvo, mas erro no preço: ' + pr.error.message);
      } else {
        onToast(
          editingId
            ? `${name.trim()} atualizado!`
            : `${name.trim()} cadastrado na aba ${activeType === 'petisco' ? 'Petiscos' : 'Avulsos'}!`
        );
      }

      await onChanged();
      await broadcastMenuUpdate(bar.id, bar);
      resetForm(activeType);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (r: Recipe) => {
    const currentlyUnavail = isRecipeManuallyUnavailable(r);
    const nextAvail = currentlyUnavail;
    const t = getRecipeItemType(r);
    const saved = await writeRecipeSafe(
      {
        ingredients: nextAvail ? [] : [{ n: '__INDISPONIVEL__', q: '' }],
        tags: buildInternalTags(t, nextAvail),
      },
      r.id
    );
    if (saved.error) {
      onToast('Erro ao atualizar disponibilidade: ' + saved.error);
      return;
    }
    onToast(
      nextAvail
        ? `${r.name} marcado como disponível no cardápio!`
        : `${r.name} marcado como em falta (ocultado do cardápio).`
    );
    await onChanged();
    await broadcastMenuUpdate(bar.id, bar);
  };

  const deleteItem = async (r: Recipe) => {
    await sb.from('bar_prices').delete().eq('bar_id', bar.id).eq('recipe_id', r.id);
    const del = await sb.from('recipes').delete().eq('id', r.id);
    if (del.error) {
      onToast('Erro ao excluir: ' + del.error.message);
      return;
    }
    onToast(`${r.name} removido.`);
    if (editingId === r.id) resetForm(activeType);
    await onChanged();
    await broadcastMenuUpdate(bar.id, bar);
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="!mb-0.5">🍽️ Petiscos, Comidas & Bebidas Avulsas</h3>
            <p className="sub !mb-0">
              Cadastre comidas para a aba <strong>🍟 Petiscos</strong> (enviados à Cozinha) e
              cervejas/energéticos/latas para a aba <strong>🍺 Avulsos</strong> (enviados ao Bar).
            </p>
          </div>
          {onBack && (
            <button type="button" className="b g sm" onClick={onBack}>
              ← Voltar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            type="button"
            className={`b ${activeType === 'petisco' ? '' : 'g'}`}
            onClick={() => switchType('petisco')}
          >
            🍟 Petiscos & Comidas
          </button>
          <button
            type="button"
            className={`b ${activeType === 'avulso' ? '' : 'g'}`}
            onClick={() => switchType('avulso')}
          >
            🍺 Avulsos (Cerveja, Energético...)
          </button>
        </div>
      </div>

      {/* Formulário de cadastro / edição */}
      <form className="card" onSubmit={(e) => void saveItem(e)}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="!mb-0">
            {editingId
              ? `✏️ Editando ${activeType === 'petisco' ? 'petisco' : 'avulso'}`
              : activeType === 'petisco'
                ? '➕ Cadastrar novo petisco / comida'
                : '➕ Cadastrar bebida avulsa'}
          </h3>
          {editingId && (
            <button type="button" className="b g sm" onClick={() => resetForm(activeType)}>
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label>Nome do item</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                activeType === 'petisco'
                  ? 'Ex: Batata frita com cheddar e bacon'
                  : 'Ex: Heineken Long Neck 330ml'
              }
            />
          </div>
          <div>
            <label>Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
          <div>
            <label>Preço de venda (R$)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder={activeType === 'petisco' ? 'Ex: 38.00' : 'Ex: 14.00'}
            />
          </div>
          <div>
            <label>Custo / CMV (R$ — p/ lucro)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={costStr}
              onChange={(e) => setCostStr(e.target.value)}
              placeholder={activeType === 'petisco' ? 'Ex: 14.50' : 'Ex: 5.50'}
            />
          </div>
          <div>
            <label>Status no cardápio</label>
            <select
              value={available ? '1' : '0'}
              onChange={(e) => setAvailable(e.target.value === '1')}
            >
              <option value="1">✅ Disponível agora</option>
              <option value="0">⛔ Em falta (ocultar do cardápio)</option>
            </select>
          </div>
        </div>
        {Number(priceStr.replace(',', '.')) > 0 && Number(costStr.replace(',', '.')) > 0 && (
          <p className="text-xs text-[var(--ok)] mt-1 mb-0">
            💰 Lucro bruto por unidade:{' '}
            <b>
              {money(
                Number(priceStr.replace(',', '.')) - Number(costStr.replace(',', '.'))
              )}
            </b>{' '}
            (
            {Math.round(
              ((Number(priceStr.replace(',', '.')) - Number(costStr.replace(',', '.'))) /
                Number(priceStr.replace(',', '.'))) *
                100
            )}
            % de margem)
          </p>
        )}

        <label>Descrição (aparece no cardápio pro cliente)</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            activeType === 'petisco'
              ? 'Ex: Porção de 500g servida bem crocante com molho da casa.'
              : 'Ex: Servida trincando no balde ou copo gelado.'
          }
        />

        {activeType === 'petisco' && (
          <>
            <label>Ficha técnica / Ingredientes da Cozinha (uso interno)</label>
            <textarea
              rows={2}
              value={kitchenNotes}
              onChange={(e) => setKitchenNotes(e.target.value)}
              placeholder="Ex: 400g batata palito, 80g cheddar cremoso, 50g bacon picado, fritar 5 min a 180ºC."
            />
          </>
        )}

        <div className="mt-3">
          <ImageUploader
            label="Foto do item (opcional)"
            value={imageUrl}
            folder={`catalog/${bar.id}`}
            entityId={editingId ? `item-${editingId}` : undefined}
            imagePreset="recipe"
            userId={userId}
            onChange={setImageUrl}
            onToast={onToast}
          />
        </div>

        <button type="submit" className="b mt-3 w-full" disabled={saving}>
          {saving
            ? 'Salvando...'
            : editingId
              ? '💾 Salvar alterações'
              : activeType === 'petisco'
                ? '🍟 Cadastrar petisco no cardápio'
                : '🍺 Cadastrar avulso no cardápio'}
        </button>
      </form>

      {/* Lista de itens cadastrados */}
      <div className="card">
        <h3>
          {activeType === 'petisco'
            ? `🍟 Petiscos cadastrados (${list.length})`
            : `🍺 Bebidas avulsas cadastradas (${list.length})`}
        </h3>

        {list.length === 0 ? (
          <div className="empty !py-6">
            {activeType === 'petisco'
              ? 'Nenhum petisco cadastrado ainda. Cadastre porções, lanches ou sobremesas acima para aparecer na aba Petiscos do cardápio.'
              : 'Nenhuma bebida avulsa cadastrada ainda. Cadastre cervejas, energéticos, refrigerantes ou garrafas acima.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {list.map((item) => {
              const unavail = isRecipeManuallyUnavailable(item);
              const pr = prices[item.id];
              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-3 border flex items-center justify-between gap-3 flex-wrap ${
                    unavail
                      ? 'border-red-500/30 bg-red-500/5 opacity-80'
                      : 'border-[var(--bd)] bg-[var(--bg2)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--bd)]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[var(--sf2)] flex items-center justify-center text-xl shrink-0 border border-[var(--bd)]">
                        {activeType === 'petisco' ? '🍟' : '🍺'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">
                        {item.name}
                        {unavail && (
                          <span className="ml-2 text-[11px] text-[var(--dn)] font-semibold">
                            · Em falta
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--mut)]">
                        {item.category} ·{' '}
                        <span className="text-[var(--ok)] font-bold">
                          {pr != null ? money(pr) : 'Sem preço'}
                        </span>
                      </div>
                      {(item.story || item.description) && (
                        <div className="text-[11px] text-[var(--mut)] line-clamp-1 mt-0.5">
                          {item.story || item.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className={`b sm ${unavail ? '' : 'g'}`}
                      onClick={() => void toggleAvailability(item)}
                    >
                      {unavail ? '✅ Ativar' : '⛔ Em falta'}
                    </button>
                    <button type="button" className="b g sm" onClick={() => startEdit(item)}>
                      ✏️
                    </button>
                    <button type="button" className="b d sm" onClick={() => void deleteItem(item)}>
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
