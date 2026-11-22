import React, { useEffect, useState } from 'react';
import {
  allIngredientNames,
  CAT,
  CATS,
  QR_DESIGN_TEMPLATES,
  ROLE_LABELS,
} from '../lib/catalog';
import { broadcastMenuUpdate, sb, writeBarSafe } from '../lib/supabase';
import {
  applyBarTheme,
  buildUnifiedStudioPresets,
  filterRecipesForBar,
  formatShakers,
  generateCustomQrPosterPng,
  generatePrintableQrPng,
  generateQrDataUrl,
  getActivePromotion,
  getActiveQrDesign,
  getBarMenuDesign,
  getBarPromotions,
  getMenuPresets,
  getMissingIngredientsForRecipe,
  getQrDesigns,
  makeDrink,
  menuUrl,
  money,
  norm,
  parseShakers,
} from '../lib/utils';
import type {
  Bar,
  BarEntry,
  BarItem,
  Order,
  QrDesignConfig,
  Recipe,
  TableTab,
  UserCoords,
} from '../types/meubar';
import { QrPosterPreview } from './QrDesigner';
import { ImageUploader, LocationPicker, RecipeTile } from './SharedUI';

export const SwitchBarModal: React.FC<{
  bars: BarEntry[];
  activeBar: Bar | null;
  userCoords: UserCoords | null;
  onDetectCoords: () => Promise<UserCoords | null>;
  onPickBar: (bar: Bar, role: string) => Promise<void>;
  onBarUpdated: (bar: Bar) => void;
  onNewBar: () => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({
  bars,
  activeBar,
  userCoords,
  onDetectCoords,
  onPickBar,
  onBarUpdated,
  onNewBar,
  onClose,
  onToast,
}) => {
  const [editingBar, setEditingBar] = useState<Bar | null>(null);

  if (editingBar) {
    return (
      <EditBarModal
        bar={editingBar}
        userCoords={userCoords}
        onDetectCoords={onDetectCoords}
        onSaved={(updated) => {
          onBarUpdated(updated);
          setEditingBar(null);
        }}
        onClose={() => setEditingBar(null)}
        onToast={onToast}
      />
    );
  }

  return (
    <div className="ov">
      <div className="w narrow">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3.5">Meus bares</h1>
        <p className="mu">Troque o bar ativo ou edite nome, @, cidade e imagens.</p>
        <div className="list mt-3.5">
          {bars.map((x) => {
            const active = activeBar?.id === x.bar.id;
            const b = x.bar;
            return (
              <div key={b.id} className="!items-start flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  {b.logo_url && (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className="w-9 h-9 rounded-lg object-cover inline-block align-middle mr-2"
                    />
                  )}
                  <b>{b.name}</b>
                  <span className="badge-warn">{ROLE_LABELS[x.role] || x.role}</span>
                  {b.handle && (
                    <>
                      <br />
                      <span className="tag">@{b.handle}</span>
                    </>
                  )}
                  {b.city && (
                    <>
                      <br />
                      <span className="tag">📍 {b.city}</span>
                    </>
                  )}
                </div>
                <div className="row">
                  {active ? (
                    <span className="chip st1">Ativo</span>
                  ) : (
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => {
                        onClose();
                        void onPickBar(b, x.role);
                      }}
                    >
                      Gerenciar
                    </button>
                  )}
                  {(x.role === 'owner' || x.role === 'dono' || x.role === 'gerente') && (
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => setEditingBar(b)}
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="b g full mt-3.5"
          onClick={() => {
            onClose();
            onNewBar();
          }}
        >
          + Criar ou entrar em outro bar
        </button>
      </div>
    </div>
  );
};

export const EditBarModal: React.FC<{
  bar: Bar;
  userCoords: UserCoords | null;
  onDetectCoords: () => Promise<UserCoords | null>;
  onSaved: (bar: Bar) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ bar, userCoords, onDetectCoords, onSaved, onClose, onToast }) => {
  const [name, setName] = useState(bar.name || '');
  const [handle, setHandle] = useState(bar.handle || '');
  const [city, setCity] = useState(bar.city || '');
  const [lat, setLat] = useState<string>(bar.lat != null ? String(bar.lat) : '');
  const [lon, setLon] = useState<string>(bar.lon != null ? String(bar.lon) : '');
  const [slogan, setSlogan] = useState(bar.slogan || '');
  const [logoUrl, setLogoUrl] = useState(bar.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(bar.banner_url || '');
  const [kind, setKind] = useState(bar.kind === 'home' || bar.kind === 'casa' ? 'home' : 'bar');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setErr('');
    const nm = name.trim();
    const h = handle.trim().replace(/^@/, '');
    if (nm.length < 2) {
      setErr('Nome obrigatório');
      return;
    }
    if (h && !/^[a-z0-9_]{3,32}$/i.test(h)) {
      setErr('@ só letras, números e _ (3–32)');
      return;
    }
    setSaving(true);
    const payload = {
      name: nm,
      handle: h || null,
      city: city.trim() || null,
      lat: lat ? Number(lat) : null,
      lon: lon ? Number(lon) : null,
      slogan: slogan.trim() || null,
      kind,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
    };
    const r = await writeBarSafe('update', payload, bar.id);
    setSaving(false);
    if (r.error) {
      let msg = r.error.message || '';
      if (msg.includes('bars_kind_check')) {
        msg = 'Tipo de bar inválido no banco. Rode o SQL schema_completo.sql no Supabase.';
      }
      setErr(msg);
      return;
    }
    onToast('Bar atualizado');
    if (r.data) onSaved(r.data);
  };

  return (
    <div className="ov">
      <div className="w narrow">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3">Editar bar</h1>
        <label>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <label>@ único (handle)</label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="ex: campos_house"
        />
        <LocationPicker
          label="Cidade / endereço"
          placeholder="Ex: Asa Norte, Brasília"
          value={city}
          userCoords={userCoords}
          showGeoButton
          onDetectCoords={onDetectCoords}
          onToast={onToast}
          onChange={(val, newLat, newLon) => {
            setCity(val);
            if (newLat != null) setLat(String(newLat));
            if (newLon != null) setLon(String(newLon));
          }}
        />
        <label>Slogan</label>
        <input value={slogan} onChange={(e) => setSlogan(e.target.value)} />
        <ImageUploader
          label="Logo"
          value={logoUrl}
          folder="logos"
          onChange={setLogoUrl}
          onToast={onToast}
        />
        <ImageUploader
          label="Banner"
          value={bannerUrl}
          folder="banners"
          onChange={setBannerUrl}
          onToast={onToast}
        />
        <label>Tipo</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="home">Casa (sem preço)</option>
          <option value="bar">Bar / Restaurante (com preços)</option>
        </select>
        <button
          type="button"
          className="b full mt-3.5"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  );
};

export const MakeDrinkModal: React.FC<{
  recipe: Recipe;
  bar: Bar;
  items: BarItem[];
  prices: Record<string, number>;
  orders?: Order[];
  tableTabs?: TableTab[];
  onClose: () => void;
  onOrderCreated: () => Promise<void>;
  onToast: (msg: string) => void;
}> = ({
  recipe,
  bar,
  items,
  prices,
  orders = [],
  tableTabs = [],
  onClose,
  onOrderCreated,
  onToast,
}) => {
  const [who, setWho] = useState('');
  const [confirmedExistingKey, setConfirmedExistingKey] = useState('');
  const [selectedTableTabId, setSelectedTableTabId] = useState('');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);

  const missingSet = new Set(getMissingIngredientsForRecipe(recipe, items).map((x) => norm(x)));
  const canMake = missingSet.size === 0;

  // Clientes ativos únicos (sem duplicados)
  const activeClientMap = new Map<string, string>();
  orders.forEach((o) => {
    if (o.status === 'done' && o.paid) return;
    const raw = (o.client_name || o.customer_name || '').trim();
    const key = norm(raw);
    if (key && !activeClientMap.has(key)) activeClientMap.set(key, raw);
  });
  const activeClients = Array.from(activeClientMap.entries()).map(([key, label]) => ({
    key,
    label,
  }));
  const typedKey = norm(who);
  const matchedActive = typedKey ? activeClientMap.get(typedKey) || null : null;
  const needsConfirmSameClient =
    Boolean(matchedActive) && confirmedExistingKey !== typedKey;

  const stepsText = recipe.instructions || recipe.steps || '';
  const stepsList = stepsText
    ? String(stepsText)
        .split('\n')
        .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean)
    : [];

  const selectedTableTab = tableTabs.find((t) => t.id === selectedTableTabId) || null;

  const handleMakeNow = async () => {
    setErr('');
    const client = who.trim();
    if (client.length < 2) {
      setErr('Informe o nome ou a comanda.');
      return;
    }
    if (!selectedTableTab && needsConfirmSameClient && matchedActive) {
      setErr(
        `Já existe um cliente ativo chamado "${matchedActive}". Toque em "Mesma comanda" ou diferencie o nome (ex: ${client} 2).`
      );
      return;
    }
    setSending(true);
    const price = prices[recipe.id] != null ? prices[recipe.id] : null;
    const payload: Record<string, unknown> = {
      bar_id: bar.id,
      recipe_id: recipe.id,
      client_name: selectedTableTab ? client : matchedActive || client,
      customer_name: selectedTableTab ? client : matchedActive || client,
      qty,
      note: selectedTableTab
        ? note.trim()
          ? `${selectedTableTab.table_label} · ${note.trim()}`
          : selectedTableTab.table_label
        : note.trim() || null,
      price,
      unit_price: price,
      status: 'pending',
      recipe_name: recipe.name,
      ...(selectedTableTab
        ? { table_label: selectedTableTab.table_label, table_tab_id: selectedTableTab.id }
        : {}),
    };
    let ins = await sb.from('orders').insert(payload).select().single();
    if (ins.error) {
      delete payload.customer_name;
      delete payload.recipe_name;
      delete payload.unit_price;
      delete payload.table_tab_id;
      ins = await sb.from('orders').insert(payload).select().single();
    }
    setSending(false);
    if (ins.error) {
      setErr(ins.error.message);
      return;
    }
    onToast(
      `Na fila: ${qty}× ${recipe.name} → ${selectedTableTab ? `${client} (${selectedTableTab.table_label})` : matchedActive || client}`
    );
    await onOrderCreated();
    onClose();
  };

  return (
    <div className="ov">
      <div
        className={`hero c${Math.max(0, CATS.indexOf(recipe.category))}`}
        style={recipe.image_url ? { backgroundImage: `url('${recipe.image_url}')` } : undefined}
      >
        {recipe.image_url ? null : '🍸'}
      </div>
      <div className="w">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3.5">{recipe.name}</h1>
        <p className="mu">
          {recipe.category || 'Drink'} ·{' '}
          {canMake ? (
            <span className="text-[var(--ok)]">Você consegue fazer agora</span>
          ) : (
            <span className="warn-txt">Falta algo no estoque</span>
          )}
        </p>

        {(recipe.glass || recipe.technique || recipe.garnish) && (
          <div className="meta flex gap-3 flex-wrap my-3">
            {recipe.glass && (
              <div>
                <span className="mu">Copo</span>
                <br />
                <b>{recipe.glass}</b>
              </div>
            )}
            {recipe.technique && (
              <div>
                <span className="mu">Técnica</span>
                <br />
                <b>{recipe.technique}</b>
              </div>
            )}
            {recipe.garnish && (
              <div>
                <span className="mu">Decoração</span>
                <br />
                <b>{recipe.garnish}</b>
              </div>
            )}
          </div>
        )}

        {recipe.description && <p className="desc">{recipe.description}</p>}

        <h2>Ingredientes</h2>
        {(recipe.ingredients || []).map((i, idx) => {
          const ok = !missingSet.has(norm(i.n));
          return (
            <div
              key={`${i.n}-${idx}`}
              className="row sp py-2 border-b border-white/10"
            >
              <span>{i.n}</span>
              <span className="mu">
                {i.q || ''}
                {!ok && (
                  <>
                    {' · '}
                    <span className="warn-txt">falta</span>
                  </>
                )}
              </span>
            </div>
          );
        })}

        <h2 className="mt-4.5">Modo de preparo</h2>
        {stepsList.length > 0 ? (
          <ol className="st pl-4.5 list-decimal">
            {stepsList.map((line, i) => (
              <li key={i} className="my-1.5">
                <span>{line}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mu">Sem modo de preparo cadastrado.</p>
        )}

        {(recipe.garnish || recipe.technique) && (
          <>
            <h2>Dicas</h2>
            <p className="mu">
              {recipe.technique && (
                <>
                  Técnica: <b>{recipe.technique}</b>.{' '}
                </>
              )}
              {recipe.garnish && (
                <>
                  Finalize com <b>{recipe.garnish}</b>.
                </>
              )}
            </p>
          </>
        )}

        <h2>Equipamento</h2>
        <p className="mu">
          Coqueteleiras do bar: <b>{formatShakers(bar.shakers)}</b>. Use gelo e a coqueteleira
          adequada ao volume do lote.
        </p>

        {recipe.story && (
          <>
            <h2>História</h2>
            <p className="mu story">{recipe.story}</p>
          </>
        )}

        <div className="panel mt-4.5">
          <label className="!mt-0">Nome do cliente ou comanda *</label>
          <input
            value={who}
            onChange={(e) => {
              setWho(e.target.value);
              if (norm(e.target.value) !== confirmedExistingKey) {
                setConfirmedExistingKey('');
              }
            }}
            placeholder="Ex: Mesa 3 · Ana · Comanda 12"
            maxLength={40}
          />
          {tableTabs.length > 0 && (
            <div className="mt-2">
              <span className="mu text-[0.76rem]">Mesas com comanda aberta agora:</span>
              <div className="chips !flex-wrap !overflow-visible mt-1">
                {tableTabs.map((t) => (
                  <span
                    key={t.id}
                    className={`chip ${selectedTableTabId === t.id ? 'on' : ''}`}
                    onClick={() => {
                      if (selectedTableTabId === t.id) {
                        setSelectedTableTabId('');
                      } else {
                        setSelectedTableTabId(t.id);
                        if (!who.trim()) setWho(t.opened_by || t.table_label);
                        setErr('');
                      }
                    }}
                  >
                    🪑 {t.table_label} (Cód: {t.code})
                  </span>
                ))}
              </div>
            </div>
          )}
          {activeClients.length > 0 && !selectedTableTab && (
            <div className="mt-2">
              <span className="mu text-[0.76rem]">Clientes ativos agora (toque para adicionar na comanda):</span>
              <div className="chips !flex-wrap !overflow-visible mt-1">
                {activeClients.map((c) => (
                  <span
                    key={c.key}
                    className={`chip ${confirmedExistingKey === c.key ? 'on' : ''}`}
                    onClick={() => {
                      setWho(c.label);
                      setConfirmedExistingKey(c.key);
                      setErr('');
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!selectedTableTab && needsConfirmSameClient && matchedActive && (
            <div className="alert-box row sp mt-2">
              <div className="flex-1 min-w-[180px]">
                <b>⚠️ Cliente ativo com esse nome</b>
                <p className="mu mt-0.5">
                  Já existe comanda aberta para <b>{matchedActive}</b>. Se for outra pessoa,
                  diferencie (ex: sobrenome ou mesa).
                </p>
              </div>
              <button
                type="button"
                className="b sm"
                onClick={() => {
                  setWho(matchedActive);
                  setConfirmedExistingKey(typedKey);
                  setErr('');
                }}
              >
                Mesma comanda
              </button>
            </div>
          )}
          <label>Observação</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Sem açúcar, pouco gelo…"
            maxLength={140}
          />
          <label>Quantidade</label>
          <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="b ok full mt-3"
            disabled={sending}
            onClick={() => void handleMakeNow()}
          >
            {sending ? 'Enviando...' : '🍸 Fazer agora · enviar à fila'}
          </button>
          {err && <p className="err">{err}</p>}
        </div>
      </div>
    </div>
  );
};

const GET_MENU_SQL_SNIPPET = `create or replace function get_menu(p_bar uuid) returns json language sql security definer set search_path=public,extensions as $$
select json_build_object(
  'bar', json_build_object(
    'id', b.id, 'name', b.name, 'kind', b.kind, 'open', b.accepting_orders,
    'slogan', b.slogan, 'city', b.city, 'logo_url', b.logo_url, 'banner_url', b.banner_url,
    'name_font', b.name_font, 'crest_border', b.crest_border, 'crest_base', b.crest_base,
    'crest_icon', b.crest_icon, 'crest_ornament', b.crest_ornament,
    'logo_pos', b.logo_pos, 'name_pos', b.name_pos, 'menu_display_mode', b.menu_display_mode,
    'color_bg', b.color_bg, 'color_surface', b.color_surface, 'color_accent', b.color_accent,
    'color_ok', b.color_ok, 'color_text', b.color_text, 'menu_design', b.menu_design,
    'menu_promotions', b.menu_promotions, 'active_promotion_id', b.active_promotion_id,
    'menu_presets', b.menu_presets, 'active_menu_preset', b.active_menu_preset
  ),
  'active_clients', coalesce((
    select json_agg(distinct cname order by cname) from (
      select trim(coalesce(nullif(o.client_name, ''), o.customer_name, '')) as cname
      from orders o where o.bar_id = b.id and (o.status <> 'done' or o.paid = false)
    ) t where t.cname <> ''
  ), '[]'::json),
  'items', coalesce((
    select json_agg(json_build_object(
      'id', r.id, 'name', r.name, 'category', r.category, 'item_type', coalesce(r.item_type, 'drink'),
      'image_url', r.image_url, 'price', p.price, 'ingredients', r.ingredients,
      'description', r.description, 'story', r.story, 'tags', r.tags
    ) order by r.name)
    from recipes r
    left join bar_prices p on p.bar_id = b.id and p.recipe_id = r.id
    where (r.is_public is not false or r.owner = b.owner or p.price is not null)
      and (not exists (select 1 from unnest(coalesce(r.tags, '{}')) tg where tg like '__bar:%') or ('__bar:' || b.id::text) = any(coalesce(r.tags, '{}')))
      and (lower(coalesce(b.kind, '')) in ('home', 'casa') or p.price is not null)
      and not exists (
        select 1 from jsonb_array_elements(coalesce(r.ingredients, '[]'::jsonb)) i
        where trim(coalesce(i->>'n', '')) <> ''
          and lower(unaccent(trim(i->>'n'))) not in ('gelo', 'agua', 'agua gelada', 'agua filtrada', 'agua mineral')
          and lower(unaccent(trim(i->>'n'))) not like 'gelo %'
          and not exists (
            select 1 from bar_items bi where bi.bar_id = b.id and bi.in_stock
              and (
                lower(unaccent(trim(bi.name))) = lower(unaccent(trim(i->>'n')))
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || ' %'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '-%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '/%'
                or lower(unaccent(trim(bi.name))) like lower(unaccent(trim(i->>'n'))) || '(%'
              )
          )
      )
  ), '[]'::json)
) from bars b where b.id = p_bar $$;
grant execute on function get_menu(uuid) to anon, authenticated;`;

export const QrModal: React.FC<{
  bar: Bar;
  items?: BarItem[];
  recipes?: Recipe[];
  prices?: Record<string, number>;
  onItemsChange?: (items: BarItem[]) => void;
  onGoPrices?: () => void;
  onGoStock?: () => void;
  onGoQrStudio?: () => void;
  onBarUpdated: (bar: Bar) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  items = [],
  recipes = [],
  prices = {},
  onItemsChange,
  onGoPrices,
  onGoStock,
  onGoQrStudio,
  onBarUpdated,
  onClose,
  onToast,
}) => {
  const presets = getMenuPresets(bar);
  const promos = getBarPromotions(bar);
  const savedQrDesigns = getQrDesigns(bar);
  const activeQrDefault = getActiveQrDesign(bar);
  const [designId, setDesignId] = useState(bar.active_menu_preset || '');
  const [promoId, setPromoId] = useState(() => getActivePromotion(bar)?.id || '');
  const [qrStyleMode, setQrStyleMode] = useState<'simple' | 'custom'>('simple');
  const [selectedQrDesignId, setSelectedQrDesignId] = useState<string>(
    activeQrDefault.id || QR_DESIGN_TEMPLATES[0].id
  );
  const [exportingPoster, setExportingPoster] = useState(false);

  const allQrOptions: QrDesignConfig[] = [
    ...savedQrDesigns,
    ...QR_DESIGN_TEMPLATES.filter((t) => !savedQrDesigns.some((s) => s.id === t.id)),
  ];
  const currentQrDesign: QrDesignConfig =
    allQrOptions.find((d) => d.id === selectedQrDesignId) || activeQrDefault;

  const defaultTables = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Mesa 5', 'Mesa 6', 'Mesa 7', 'Mesa 8', 'Mesa 9', 'Mesa 10', 'Mesa 12', 'Mesa 15', 'Mesa 20'];
  const getInitialTables = (): string[] => {
    const rawBar = Array.isArray(bar.table_names) ? bar.table_names.map((x) => String(x).trim()).filter(Boolean) : [];
    let rawLocal: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem('bar_tables_' + bar.id) || '[]');
      if (Array.isArray(stored)) rawLocal = stored.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // ignore
    }
    const merged = rawBar.length ? rawBar : rawLocal.length ? rawLocal : defaultTables;
    return Array.from(new Set(merged));
  };

  const [tablesList, setTablesList] = useState<string[]>(getInitialTables);
  const [newTableInput, setNewTableInput] = useState('');
  const [mesaSel, setMesaSel] = useState('');
  const [customMesa, setCustomMesa] = useState('');
  const [qrSrc, setQrSrc] = useState('');
  const [checkingMenu, setCheckingMenu] = useState(true);
  const [serverItems, setServerItems] = useState<{ id: string; name: string }[] | null>(null);
  const [addingStock, setAddingStock] = useState(false);

  const tableVal = mesaSel === 'custom' ? customMesa.trim() : mesaSel;
  const targetUrl = menuUrl(bar.id, tableVal);
  const label = tableVal ? `${bar.name} · ${tableVal}` : bar.name;

  const persistTablesList = async (next: string[]) => {
    setTablesList(next);
    try {
      localStorage.setItem('bar_tables_' + bar.id, JSON.stringify(next));
    } catch {
      // ignore
    }
    const r = await writeBarSafe('update', { table_names: next }, bar.id);
    if (!r.error && r.data) {
      onBarUpdated({ ...r.data, table_names: next });
    } else {
      onBarUpdated({ ...bar, table_names: next });
    }
  };

  const handleAddTable = async (nameToAdd?: string) => {
    const raw = (nameToAdd ?? newTableInput).trim();
    if (!raw) return;
    const normalized = /^\d+$/.test(raw) ? `Mesa ${raw}` : raw;
    if (tablesList.some((t) => norm(t) === norm(normalized))) {
      setMesaSel(tablesList.find((t) => norm(t) === norm(normalized)) || normalized);
      setNewTableInput('');
      onToast(`${normalized} já está na lista!`);
      return;
    }
    const next = [...tablesList, normalized];
    setNewTableInput('');
    setMesaSel(normalized);
    await persistTablesList(next);
    onToast(`${normalized} adicionada!`);
  };

  const handleAddNextNumericTable = async () => {
    const nums = tablesList
      .map((t) => {
        const m = t.match(/^mesa\s+(\d+)$/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
    await handleAddTable(`Mesa ${nextNum}`);
  };

  const scopedRecipes = filterRecipesForBar(recipes, bar.id);
  const isHome = bar.kind === 'home' || bar.kind === 'casa';
  const makeable = scopedRecipes.filter((r) => makeDrink(r, items));
  const readyForMenu = isHome ? makeable : makeable.filter((r) => prices[r.id] != null);
  const pricedMissingStock = isHome
    ? []
    : scopedRecipes.filter((r) => !makeDrink(r, items) && prices[r.id] != null);
  const unpricedAvailable = isHome ? [] : makeable.filter((r) => prices[r.id] == null);
  const pricedCount = scopedRecipes.filter((r) => prices[r.id] != null).length;
  const stockedCount = items.filter((i) => i.in_stock).length;
  const missingNamesForPriced = Array.from(
    new Set(pricedMissingStock.flatMap((r) => getMissingIngredientsForRecipe(r, items)))
  );

  const checkLiveServerMenu = async () => {
    setCheckingMenu(true);
    try {
      const res = await sb.rpc('get_menu', { p_bar: bar.id });
      const data = res.data as { items?: { id: string; name: string }[] } | null;
      if (!res.error && data && Array.isArray(data.items)) {
        setServerItems(data.items);
      } else {
        setServerItems(null);
      }
    } catch {
      setServerItems(null);
    }
    setCheckingMenu(false);
  };

  useEffect(() => {
    void checkLiveServerMenu();
  }, [bar.id, items.length, pricedCount]);

  useEffect(() => {
    try {
      setQrSrc(generateQrDataUrl(targetUrl, 6, 2));
    } catch {
      setQrSrc('');
    }
  }, [targetUrl]);

  const handleAddMissingFromQr = async () => {
    if (!missingNamesForPriced.length || !onItemsChange) return;
    setAddingStock(true);
    let nextItems = [...items];
    const cats = Object.keys(CAT);

    for (const rawName of missingNamesForPriced) {
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
        cats.find((c) => (CAT[c] || []).some((s) => norm(String(s).split('|')[0]) === targetNorm)) ||
        null;

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
    onItemsChange(nextItems);
    void broadcastMenuUpdate(bar.id);
    await checkLiveServerMenu();
    onToast('Ingredientes adicionados ao estoque!');
  };

  const handleDesignChange = async (id: string) => {
    setDesignId(id);
    if (!id) {
      const r = await writeBarSafe('update', { active_menu_preset: null }, bar.id);
      if (!r.error && r.data) {
        onBarUpdated(r.data);
        void broadcastMenuUpdate(bar.id, r.data);
      }
      return;
    }
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    const payload: Record<string, unknown> = { ...p };
    delete payload.id;
    delete payload.preset_name;
    delete payload.saved_at;
    payload.active_menu_preset = id;
    if (p.menu_design) payload.menu_design = p.menu_design;
    const r = await writeBarSafe('update', payload, bar.id);
    if (!r.error && r.data) {
      const normalized = {
        ...r.data,
        menu_design: p.menu_design || getBarMenuDesign(r.data),
      };
      applyBarTheme(normalized);
      onBarUpdated(normalized);
      void broadcastMenuUpdate(bar.id, normalized);
      onToast(`Layout ativo: ${p.preset_name || ''}`);
    }
  };

  const handlePromoChange = async (nextPromoId: string) => {
    setPromoId(nextPromoId);
    const nextPromos = promos.map((pr) => ({
      ...pr,
      active: pr.id === nextPromoId,
    }));
    const updatedPresetsMeta = buildUnifiedStudioPresets(bar, {
      promotions: nextPromos,
      active_promotion_id: nextPromoId || null,
    });
    const r = await writeBarSafe(
      'update',
      {
        menu_promotions: nextPromos,
        active_promotion_id: nextPromoId || null,
        menu_presets: updatedPresetsMeta,
      },
      bar.id
    );
    if (!r.error && r.data) {
      const normalized = {
        ...r.data,
        menu_promotions: nextPromos,
        active_promotion_id: nextPromoId || null,
        menu_presets: updatedPresetsMeta,
      };
      onBarUpdated(normalized);
      void broadcastMenuUpdate(bar.id, normalized);
      const found = promos.find((x) => x.id === nextPromoId);
      onToast(found ? `Promoção ativa: ${found.title}` : 'Promoção removida do cardápio');
    }
  };

  const handleDownloadPng = async () => {
    const slug = `${(bar.handle || bar.name).toLowerCase().replace(/\s+/g, '-')}${
      tableVal ? '-' + tableVal.toLowerCase().replace(/\s+/g, '-') : ''
    }`;
    if (qrStyleMode === 'custom') {
      setExportingPoster(true);
      try {
        const pngUrl = await generateCustomQrPosterPng(targetUrl, bar, currentQrDesign, tableVal);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `placa-qr-${slug}.png`;
        a.click();
        onToast('Arte do QR Code personalizada baixada!');
      } finally {
        setExportingPoster(false);
      }
      return;
    }
    const pngUrl = generatePrintableQrPng(targetUrl, bar.name, tableVal || 'Cardápio Digital');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `qr-${slug}.png`;
    a.click();
    onToast('QR Code simples baixado!');
  };

  return (
    <div className="ov">
      <div className="w narrow">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3.5">QR do cardápio</h1>
        <p className="mu">
          O QR Code é sempre o mesmo. Troque o layout ou a promoção abaixo e os celulares abertos
          atualizam automaticamente sem perder pedidos salvos.
        </p>

        {!checkingMenu && serverItems !== null && serverItems.length > 0 && (
          <div className="panel mt-2.5 !border-[var(--ok)]">
            <p className="ok-txt !mt-0">
              ✓ <b>{serverItems.length} drink(s) ativo(s)</b> aparecendo no cardápio QR agora:{' '}
              {serverItems
                .slice(0, 4)
                .map((x) => x.name)
                .join(', ')}
              {serverItems.length > 4 ? ` e +${serverItems.length - 4}` : ''}.
            </p>
          </div>
        )}

        {!checkingMenu && (serverItems === null || serverItems.length === 0) && (
          <div className="alert-box mt-2.5">
            {readyForMenu.length > 0 ? (
              <>
                <b>⚠️ {readyForMenu.length} drink(s) pronto(s) no app, mas o servidor retornou 0!</b>
                <p className="mu mt-1">
                  No app está tudo certo ({readyForMenu.slice(0, 3).map((r) => r.name).join(', ')}),
                  mas a função <code>get_menu</code> do Supabase ainda precisa ser atualizada para
                  liberar esses drinks no link público/QR.
                </p>
                <div className="row mt-2 flex-wrap">
                  <button
                    type="button"
                    className="b sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(GET_MENU_SQL_SNIPPET);
                      onToast('SQL do get_menu copiado! Cole no SQL Editor do Supabase e clique Run.');
                    }}
                  >
                    Copiar SQL do get_menu
                  </button>
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => void checkLiveServerMenu()}
                  >
                    Reverificar
                  </button>
                </div>
              </>
            ) : (
              <>
                <b>⚠️ Este cardápio ainda abrirá sem drinks para o cliente</b>
                <p className="mu mt-1">
                  Estoque ativo: <b>{stockedCount}</b> item(ns) · Drinks possíveis:{' '}
                  <b>{makeable.length}</b> · Precificados: <b>{pricedCount}</b>.
                </p>
                {pricedMissingStock.length > 0 && (
                  <p className="mu mt-1">
                    Você já precificou <b>{pricedMissingStock.map((d) => d.name).slice(0, 3).join(', ')}</b>
                    {pricedMissingStock.length > 3 ? '…' : ''}, mas ainda falta no Estoque:{' '}
                    <b>{missingNamesForPriced.join(', ')}</b>.
                  </p>
                )}
                {unpricedAvailable.length > 0 && (
                  <p className="mu mt-1">
                    Você já tem estoque para{' '}
                    <b>{unpricedAvailable.map((d) => d.name).slice(0, 3).join(', ')}</b>
                    {unpricedAvailable.length > 3 ? '…' : ''}, mas falta definir o preço.
                  </p>
                )}
                <div className="row mt-2 flex-wrap">
                  {!isHome && onGoPrices && (
                    <button
                      type="button"
                      className="b sm"
                      onClick={() => {
                        onClose();
                        onGoPrices();
                      }}
                    >
                      Ir para Precificação
                    </button>
                  )}
                  {onGoStock && (
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => {
                        onClose();
                        onGoStock();
                      }}
                    >
                      Ir para Estoque
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="row mt-3">
          <div className="grow">
            <label>Layout ativo do cardápio</label>
            <select value={designId} onChange={(e) => void handleDesignChange(e.target.value)}>
              <option value="">Visual atual</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.preset_name || 'Preset'}
                </option>
              ))}
            </select>
          </div>
          <div className="grow">
            <label>Promoção ativa</label>
            <select value={promoId} onChange={(e) => void handlePromoChange(e.target.value)}>
              <option value="">Sem promoção ativa</option>
              {promos.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mt-3">
          <div className="grow">
            <label>Tipo de QR / Mesa</label>
            <select value={mesaSel} onChange={(e) => setMesaSel(e.target.value)}>
              <option value="">📱 Cardápio geral (QR comum)</option>
              {tablesList.map((tName) => (
                <option key={tName} value={tName}>
                  🪑 {tName}
                </option>
              ))}
              <option value="custom">✏️ Digitar mesa avulsa…</option>
            </select>
          </div>
        </div>

        <div className="panel mt-2.5">
          <div className="row sp">
            <b className="text-[0.86rem]">🪑 Gerenciar mesas ({tablesList.length})</b>
            <button
              type="button"
              className="b g sm"
              onClick={() => void handleAddNextNumericTable()}
            >
              + Próxima mesa
            </button>
          </div>
          <div className="row mt-2">
            <input
              value={newTableInput}
              onChange={(e) => setNewTableInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddTable();
              }}
              placeholder="Nova mesa (ex: 11, Varanda 2, VIP 1)"
              className="flex-1"
            />
            <button
              type="button"
              className="b sm"
              onClick={() => void handleAddTable()}
            >
              + Adicionar
            </button>
          </div>
          {mesaSel && mesaSel !== 'custom' && tablesList.includes(mesaSel) && tablesList.length > 1 && (
            <div className="row sp mt-2">
              <span className="mu text-[0.76rem]">
                QR selecionado: <b>{mesaSel}</b>
              </span>
              <button
                type="button"
                className="b g sm"
                onClick={async () => {
                  const next = tablesList.filter((t) => t !== mesaSel);
                  setMesaSel('');
                  await persistTablesList(next);
                  onToast(`${mesaSel} removida`);
                }}
              >
                Remover {mesaSel}
              </button>
            </div>
          )}
        </div>

        {mesaSel === 'custom' && (
          <div>
            <label>Nome/número da mesa avulsa</label>
            <input
              value={customMesa}
              onChange={(e) => setCustomMesa(e.target.value)}
              placeholder="Ex: Mesa 24 / Deck"
            />
          </div>
        )}

        <div className="panel mt-2.5">
          {tableVal ? (
            <p className="mu text-[0.8rem]">
              🪑 <b>QR de Mesa ({tableVal}):</b> ao ler o QR, a comanda da mesa já abre
              automaticamente com um código de 4 dígitos. Quem entrar depois na mesma mesa precisa
              digitar esse código + seu próprio nome.
            </p>
          ) : (
            <p className="mu text-[0.8rem]">
              📱 <b>QR Comum (Cardápio geral):</b> o cliente vê o cardápio e a comanda só é aberta
              quando ele enviar um pedido.
            </p>
          )}
        </div>

        {/* Escolha do formato da imagem PNG: QR Simples vs QR Personalizado */}
        <div className="panel mt-3">
          <div className="row sp flex-wrap gap-2">
            <b className="text-[0.88rem]">🖼️ Formato da imagem do QR Code</b>
            {onGoQrStudio && (
              <button
                type="button"
                className="b g sm"
                onClick={() => {
                  onClose();
                  onGoQrStudio();
                }}
              >
                🎨 Personalizar arte do QR
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              className={`b sm ${qrStyleMode === 'simple' ? '' : 'g'}`}
              onClick={() => setQrStyleMode('simple')}
            >
              📄 QR Simples (só nome)
            </button>
            <button
              type="button"
              className={`b sm ${qrStyleMode === 'custom' ? '' : 'g'}`}
              onClick={() => setQrStyleMode('custom')}
            >
              🎨 QR Personalizado (arte)
            </button>
          </div>

          {qrStyleMode === 'custom' && (
            <div className="mt-2.5">
              <label className="!mt-0">Escolher design da placa QR</label>
              <select
                value={selectedQrDesignId}
                onChange={(e) => setSelectedQrDesignId(e.target.value)}
              >
                {savedQrDesigns.length > 0 && (
                  <optgroup label="Meus designs salvos">
                    {savedQrDesigns.map((d) => (
                      <option key={d.id} value={d.id}>
                        ⭐ {d.design_name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Modelos prontos">
                  {QR_DESIGN_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.design_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>

        <div className="text-center mt-3">
          {qrStyleMode === 'simple' ? (
            <div className="qr-box">
              {qrSrc && <img src={qrSrc} alt="QR Code" />}
              <span className="tag !text-[#222] font-semibold">{label}</span>
            </div>
          ) : (
            <QrPosterPreview
              bar={bar}
              design={currentQrDesign}
              qrUrl={targetUrl}
              tableLabel={tableVal}
              compact
            />
          )}
        </div>

        <p className="tag break-all text-center mt-2">{targetUrl}</p>

        <div className="row mt-3.5 flex-wrap">
          <button
            type="button"
            className="b grow"
            onClick={() => {
              void navigator.clipboard?.writeText(targetUrl);
              onToast('Link do QR copiado!');
            }}
          >
            Copiar link
          </button>
          <button
            type="button"
            className="b g grow"
            disabled={exportingPoster}
            onClick={() => void handleDownloadPng()}
          >
            {exportingPoster
              ? 'Gerando arte...'
              : qrStyleMode === 'custom'
                ? '⬇️ Baixar Placa QR (PNG)'
                : '⬇️ Baixar QR Simples (PNG)'}
          </button>
          <a
            className="b g grow"
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir cardápio
          </a>
        </div>
      </div>
    </div>
  );
};

export const ShakersModal: React.FC<{
  bar: Bar;
  onBarUpdated: (bar: Bar) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ bar, onBarUpdated, onClose, onToast }) => {
  const [shakers, setShakers] = useState<number[]>(() => parseShakers(bar.shakers));
  const [newMl, setNewMl] = useState('750');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const clean = shakers.filter((n) => n >= 100 && n <= 3000);
    const list = clean.length ? clean : [750, 500];
    setSaving(true);
    let r = await writeBarSafe('update', { shakers: list }, bar.id);
    if (r.error) {
      r = await writeBarSafe('update', { shakers: list.length }, bar.id);
    }
    setSaving(false);
    if (!r.error && r.data) {
      onBarUpdated(r.data);
      onToast('Coqueteleiras salvas!');
    }
    onClose();
  };

  return (
    <div className="ov">
      <div className="w narrow">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3.5">Coqueteleiras</h1>
        <p className="mu">Tamanhos (em ml) e quantidade de coqueteleiras que você usa.</p>
        <div className="panel">
          <div className="list">
            {shakers.map((ml, idx) => (
              <div key={idx}>
                <span>
                  <b>Coqueteleira {idx + 1}</b> · {ml} ml
                </span>
                {shakers.length > 1 && (
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => setShakers(shakers.filter((_, i) => i !== idx))}
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
          <label>Adicionar coqueteleira (ml)</label>
          <div className="row">
            <input
              type="number"
              min={150}
              max={2000}
              step={50}
              value={newMl}
              onChange={(e) => setNewMl(e.target.value)}
              className="grow"
            />
            <button
              type="button"
              className="b g sm"
              onClick={() => {
                const v = Math.max(150, Math.min(2000, parseInt(newMl, 10) || 500));
                setShakers([...shakers, v]);
              }}
            >
              + Adicionar
            </button>
          </div>
          <button
            type="button"
            className="b full mt-3.5"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CreateDrinkModal: React.FC<{
  editExisting: boolean;
  recipes: Recipe[];
  userId?: string;
  onRecipeSaved: (recipe: Recipe) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ editExisting, recipes, userId, onRecipeSaved, onClose, onToast }) => {
  const ingOptions = allIngredientNames();
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState<{ n: string; q: string }[]>([{ n: '', q: '' }]);
  const [prep, setPrep] = useState('');
  const [story, setStory] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const handlePickExisting = (id: string) => {
    setSelectedId(id);
    if (!id) {
      setName('');
      setCategory(CATS[0]);
      setImageUrl('');
      setIngredients([{ n: '', q: '' }]);
      setPrep('');
      setStory('');
      return;
    }
    const rec = recipes.find((x) => x.id === id);
    if (!rec) return;
    setName(rec.name || '');
    setCategory(rec.category || CATS[0]);
    setImageUrl(rec.image_url || '');
    setIngredients(
      rec.ingredients?.length
        ? rec.ingredients.map((i) => ({ n: i.n || '', q: i.q || '' }))
        : [{ n: '', q: '' }]
    );
    setPrep(rec.instructions || rec.steps || '');
    setStory(rec.story || '');
  };

  const handleSave = async () => {
    setErr('');
    const nm = name.trim();
    if (nm.length < 2) {
      setErr('Digite o nome do drink.');
      return;
    }
    const ingLines = ingredients
      .map((i) => ({ n: i.n.trim(), q: i.q.trim() }))
      .filter((i) => i.n);
    if (!ingLines.length) {
      setErr('Adicione ao menos 1 ingrediente da lista.');
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      name: nm,
      category,
      image_url: imageUrl.trim() || null,
      ingredients: ingLines,
      steps: prep.trim() || '',
      instructions: prep.trim() || null,
      story: story.trim() || null,
      is_public: true,
      ...(selectedId ? {} : { owner: userId || null }),
    };

    let r = selectedId
      ? await sb.from('recipes').update(payload).eq('id', selectedId).select().single()
      : await sb.from('recipes').insert(payload).select().single();

    if (r.error && String(r.error.message || '').includes('instructions')) {
      delete payload.instructions;
      r = selectedId
        ? await sb.from('recipes').update(payload).eq('id', selectedId).select().single()
        : await sb.from('recipes').insert(payload).select().single();
    }

    setSaving(false);
    if (r.error) {
      setErr(r.error.message);
      return;
    }
    if (r.data) {
      onRecipeSaved(r.data as Recipe);
      onToast('Receita salva!');
      onClose();
    }
  };

  return (
    <div className="ov">
      <div className="w narrow">
        <button type="button" className="b g sm" onClick={onClose}>
          ← Voltar
        </button>
        <h1 className="mt-3.5">{editExisting ? 'Editar / Criar receita' : 'Criar drink'}</h1>

        {editExisting && (
          <>
            <label>Escolha uma receita para editar ou deixe em branco para nova</label>
            <select value={selectedId} onChange={(e) => handlePickExisting(e.target.value)}>
              <option value="">— Nova receita —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Nome do drink</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Gin Tônica de Hibisco"
        />

        <label>Categoria</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <ImageUploader
          label="Foto do drink (câmera ou galeria)"
          value={imageUrl}
          folder="recipes"
          userId={userId}
          onChange={setImageUrl}
          onToast={onToast}
        />

        <label>Ingredientes</label>
        <div>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="row mt-2">
              <div className="grow">
                <select
                  value={ing.n}
                  onChange={(e) => {
                    const next = [...ingredients];
                    next[idx] = { ...next[idx], n: e.target.value };
                    setIngredients(next);
                  }}
                >
                  <option value="">— selecione —</option>
                  {ingOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={ing.q}
                onChange={(e) => {
                  const next = [...ingredients];
                  next[idx] = { ...next[idx], q: e.target.value };
                  setIngredients(next);
                }}
                placeholder="Qtd"
                className="!w-[110px]"
              />
              <button
                type="button"
                className="b g sm"
                onClick={() => setIngredients(ingredients.filter((_, i) => i !== idx))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="b g sm mt-2"
          onClick={() => setIngredients([...ingredients, { n: '', q: '' }])}
        >
          + Ingrediente
        </button>
        <p className="mu">Nome pela lista (obrigatório). Quantidade livre (ex: 50 ml).</p>

        <label>Modo de preparo</label>
        <textarea
          value={prep}
          onChange={(e) => setPrep(e.target.value)}
          placeholder="Como montar ou bater o drink"
        />

        <label>História do drink</label>
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Origem ou curiosidade"
        />

        <button
          type="button"
          className="b full mt-3.5"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Salvando...' : 'Salvar receita'}
        </button>
        {err && <p className="err">{err}</p>}
      </div>
    </div>
  );
};
