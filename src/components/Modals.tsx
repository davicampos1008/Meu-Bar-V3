import React, { useEffect, useState } from 'react';
import { allIngredientNames, CATS, ROLE_LABELS } from '../lib/catalog';
import { broadcastMenuUpdate, sb, writeBarSafe } from '../lib/supabase';
import {
  applyBarTheme,
  formatShakers,
  generatePrintableQrPng,
  generateQrDataUrl,
  getActivePromotion,
  getBarMenuDesign,
  getBarPromotions,
  getMenuPresets,
  makeDrink,
  menuUrl,
  money,
  norm,
  parseShakers,
} from '../lib/utils';
import type { Bar, BarEntry, BarItem, Order, Recipe, UserCoords } from '../types/meubar';
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
  onClose: () => void;
  onOrderCreated: () => Promise<void>;
  onToast: (msg: string) => void;
}> = ({ recipe, bar, items, prices, orders = [], onClose, onOrderCreated, onToast }) => {
  const [who, setWho] = useState('');
  const [confirmedExistingKey, setConfirmedExistingKey] = useState('');
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);

  const canMake = makeDrink(recipe, items);
  const stockSet = new Set(items.filter((i) => i.in_stock).map((i) => norm(i.name)));
  const free: Record<string, number> = { gelo: 1, agua: 1, 'agua gelada': 1 };

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

  const handleMakeNow = async () => {
    setErr('');
    const client = who.trim();
    if (client.length < 2) {
      setErr('Informe o nome ou a comanda.');
      return;
    }
    if (needsConfirmSameClient && matchedActive) {
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
      client_name: matchedActive || client,
      customer_name: matchedActive || client,
      qty,
      note: note.trim() || null,
      price,
      unit_price: price,
      status: 'pending',
      recipe_name: recipe.name,
    };
    let ins = await sb.from('orders').insert(payload).select().single();
    if (ins.error) {
      delete payload.customer_name;
      delete payload.recipe_name;
      delete payload.unit_price;
      ins = await sb.from('orders').insert(payload).select().single();
    }
    setSending(false);
    if (ins.error) {
      setErr(ins.error.message);
      return;
    }
    onToast(`Na fila: ${qty}× ${recipe.name} → ${matchedActive || client}`);
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
          const ok = free[norm(i.n)] || stockSet.has(norm(i.n));
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
          {activeClients.length > 0 && (
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
          {needsConfirmSameClient && matchedActive && (
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

export const QrModal: React.FC<{
  bar: Bar;
  onBarUpdated: (bar: Bar) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}> = ({ bar, onBarUpdated, onClose, onToast }) => {
  const presets = getMenuPresets(bar);
  const promos = getBarPromotions(bar);
  const [designId, setDesignId] = useState(bar.active_menu_preset || '');
  const [promoId, setPromoId] = useState(() => getActivePromotion(bar)?.id || '');
  const [mesaSel, setMesaSel] = useState('');
  const [customMesa, setCustomMesa] = useState('');
  const [qrSrc, setQrSrc] = useState('');

  const tableVal = mesaSel === 'custom' ? customMesa.trim() : mesaSel;
  const targetUrl = menuUrl(bar.id, tableVal);
  const label = tableVal ? `${bar.name} · ${tableVal}` : bar.name;

  useEffect(() => {
    try {
      setQrSrc(generateQrDataUrl(targetUrl, 6, 2));
    } catch {
      setQrSrc('');
    }
  }, [targetUrl]);

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
    const rawList = Array.isArray(bar.menu_presets) ? bar.menu_presets : presets;
    const updatedPresetsMeta = [
      ...rawList.filter((x) => typeof x === 'object' && x.id !== '__studio_meta__'),
      {
        id: '__studio_meta__',
        preset_name: '__studio_meta__',
        menu_design: getBarMenuDesign(bar),
        promotions: nextPromos,
        active_promotion_id: nextPromoId || null,
      },
    ];
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
      };
      onBarUpdated(normalized);
      void broadcastMenuUpdate(bar.id, normalized);
      const found = promos.find((x) => x.id === nextPromoId);
      onToast(found ? `Promoção ativa: ${found.title}` : 'Promoção removida do cardápio');
    }
  };

  const handleDownloadPng = () => {
    const pngUrl = generatePrintableQrPng(targetUrl, bar.name, tableVal || 'Cardápio Digital');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `qr-${(bar.handle || bar.name).toLowerCase().replace(/\s+/g, '-')}${tableVal ? '-' + tableVal.toLowerCase().replace(/\s+/g, '-') : ''}.png`;
    a.click();
    onToast('QR Code baixado!');
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

        <div className="row">
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
            <label>Mesa (opcional)</label>
            <select value={mesaSel} onChange={(e) => setMesaSel(e.target.value)}>
              <option value="">Cardápio geral</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                <option key={n} value={`Mesa ${n}`}>
                  Mesa {n}
                </option>
              ))}
              <option value="custom">Mesa personalizada...</option>
            </select>
          </div>
        </div>

        {mesaSel === 'custom' && (
          <div>
            <label>Nome/número da mesa</label>
            <input
              value={customMesa}
              onChange={(e) => setCustomMesa(e.target.value)}
              placeholder="Ex: Mesa 14 / Varanda 2"
            />
          </div>
        )}

        <div className="text-center">
          <div className="qr-box">
            {qrSrc && <img src={qrSrc} alt="QR Code" />}
            <span className="tag !text-[#222] font-semibold">{label}</span>
          </div>
        </div>

        <p className="tag break-all text-center">{targetUrl}</p>

        <div className="row mt-3.5">
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
          <button type="button" className="b g grow" onClick={handleDownloadPng}>
            Baixar QR (PNG)
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
