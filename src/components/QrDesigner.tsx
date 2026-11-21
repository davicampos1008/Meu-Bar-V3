import React, { useMemo, useState } from 'react';
import { QR_DESIGN_TEMPLATES } from '../lib/catalog';
import { generateQrDataUrl, getStoreProfileConfig } from '../lib/utils';
import type { Bar, QrDesignConfig } from '../types/meubar';

interface QrPosterPreviewProps {
  bar: Partial<Bar>;
  design: QrDesignConfig;
  qrUrl: string;
  tableLabel?: string;
  compact?: boolean;
}

export const QrPosterPreview: React.FC<QrPosterPreviewProps> = ({
  bar,
  design,
  qrUrl,
  tableLabel,
  compact = false,
}) => {
  const qrImg = useMemo(() => generateQrDataUrl(qrUrl || 'https://meubar.app', 5, 2), [qrUrl]);
  const sp = getStoreProfileConfig(bar);

  const bg1 = design.bg_color || '#0b090e';
  const bg2 = design.bg_color_2 || '#23190a';
  const accent = design.accent_color || '#e5b84b';
  const textCol = design.text_color || '#f8f2e4';
  const cardCol = design.card_color || '#16131c';
  const qrBg = design.qr_bg_color || '#ffffff';

  const bgStyle: React.CSSProperties =
    design.bg_pattern === 'gradient'
      ? { background: `linear-gradient(155deg, ${bg1} 0%, ${bg2} 100%)` }
      : design.bg_pattern === 'radial'
        ? { background: `radial-gradient(circle at 50% 35%, ${bg2} 0%, ${bg1} 82%)` }
        : design.bg_pattern === 'dots'
          ? {
              backgroundColor: bg1,
              backgroundImage: `radial-gradient(${accent}33 1.5px, transparent 1.5px)`,
              backgroundSize: '18px 18px',
            }
          : design.bg_pattern === 'stripes'
            ? {
                backgroundColor: bg1,
                backgroundImage: `repeating-linear-gradient(135deg, ${accent}1a 0px, ${accent}1a 8px, transparent 8px, transparent 26px)`,
              }
            : { background: bg1 };

  const frameStyleObj: React.CSSProperties =
    design.frame_style === 'neon'
      ? { border: `2px solid ${accent}`, boxShadow: `0 0 18px ${accent}77`, borderRadius: '20px' }
      : design.frame_style === 'double' || design.frame_style === 'gold'
        ? {
            border: `2px solid ${accent}`,
            outline: `1px solid ${accent}77`,
            outlineOffset: '-7px',
            borderRadius: '16px',
          }
        : design.frame_style === 'vintage'
          ? {
              border: `3px solid ${accent}`,
              outline: `1px dashed ${accent}`,
              outlineOffset: '-8px',
              borderRadius: '6px',
            }
          : design.frame_style === 'rounded'
            ? { border: `3px solid ${accent}`, borderRadius: '30px' }
            : design.frame_style === 'minimal'
              ? { border: `1px solid ${accent}66`, borderRadius: '14px' }
              : { border: 'none', borderRadius: '14px' };

  const phoneVal = (design.phone_text || sp.phone || sp.whatsapp || '').trim();
  const instaVal = (design.instagram_text || sp.instagram || (bar.handle ? `@${bar.handle}` : '')).trim();

  return (
    <div
      className={`mx-auto w-full ${compact ? 'max-w-[280px] p-3.5' : 'max-w-[330px] p-5'} text-center select-none`}
      style={{
        ...bgStyle,
        color: textCol,
        borderRadius: '20px',
        boxShadow: '0 14px 32px rgba(0,0,0,0.45)',
      }}
    >
      <div className={compact ? 'p-3.5' : 'p-5'} style={frameStyleObj}>
        {design.badge_text?.trim() && (
          <div className="mb-2.5">
            <span
              className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase"
              style={{ background: accent, color: '#111014' }}
            >
              {design.badge_text.trim()}
            </span>
          </div>
        )}

        {design.show_logo && (
          <img
            src={bar.logo_url || '/logo.png'}
            alt={bar.name || 'Logo'}
            className={`${compact ? 'w-12 h-12' : 'w-14 h-14'} rounded-xl object-cover mx-auto mb-2`}
            style={{ border: `2px solid ${accent}` }}
          />
        )}

        {design.show_name && (
          <div
            className={`${bar.name_font || 'store-font-serif'} font-bold leading-tight ${
              compact ? 'text-lg' : 'text-xl'
            }`}
            style={{ color: accent }}
          >
            {bar.name || 'Meu Bar'}
          </div>
        )}

        {design.show_slogan && bar.slogan && (
          <div className="text-[11px] italic opacity-80 mt-0.5">{bar.slogan}</div>
        )}

        {design.headline?.trim() && (
          <div className={`font-extrabold tracking-wide mt-2.5 ${compact ? 'text-xs' : 'text-sm'}`}>
            {design.headline.trim()}
          </div>
        )}

        {design.subheadline?.trim() && (
          <div className="text-[11px] opacity-75 mt-0.5 leading-snug">
            {design.subheadline.trim()}
          </div>
        )}

        <div
          className="mx-auto my-3 inline-block p-2.5 rounded-2xl"
          style={{
            background: qrBg,
            border: `2.5px solid ${accent}`,
            boxShadow: design.frame_style === 'neon' ? `0 0 16px ${accent}66` : '0 8px 20px rgba(0,0,0,0.35)',
          }}
        >
          <img
            src={qrImg}
            alt="QR Code"
            className={`${compact ? 'w-36 h-36' : 'w-44 h-44'} block rounded-lg`}
          />
        </div>

        {design.show_table && (
          <div className="mb-2">
            <span
              className="inline-block px-3.5 py-1 rounded-full text-xs font-extrabold border"
              style={{
                background: cardCol,
                borderColor: accent,
                color: accent,
              }}
            >
              {tableLabel?.trim() ? `🪑 ${tableLabel.trim()}` : '📱 CARDÁPIO GERAL'}
            </span>
          </div>
        )}

        <div className="space-y-1 text-[11px] font-medium mt-2">
          {design.show_phone && phoneVal && <div>📞 {phoneVal}</div>}
          {design.show_instagram && instaVal && (
            <div>📸 {instaVal.startsWith('@') ? instaVal : `@${instaVal}`}</div>
          )}
          {design.show_wifi && (design.wifi_name || design.wifi_pass) && (
            <div>
              📶 Wi-Fi: {design.wifi_name || 'Rede do Bar'}
              {design.wifi_pass ? ` · Senha: ${design.wifi_pass}` : ''}
            </div>
          )}
          {design.custom_note?.trim() && (
            <div className="font-semibold pt-0.5" style={{ color: accent }}>
              {design.custom_note.trim()}
            </div>
          )}
        </div>

        {design.footer_text?.trim() && (
          <div className="text-[10px] opacity-70 mt-3 pt-2 border-t border-white/10">
            {design.footer_text.trim()}
          </div>
        )}
      </div>
    </div>
  );
};

interface QrDesignerPanelProps {
  bar: Partial<Bar>;
  design: QrDesignConfig;
  savedDesigns: QrDesignConfig[];
  activeDesignId: string;
  onChangeDesign: (next: QrDesignConfig) => void;
  onSelectSaved: (design: QrDesignConfig) => void;
  onSaveAsNew: (name: string) => Promise<void>;
  onUpdateCurrent: () => Promise<void>;
  onDeleteSaved: (id: string) => Promise<void>;
  saving: boolean;
}

export const QrDesignerPanel: React.FC<QrDesignerPanelProps> = ({
  bar,
  design,
  savedDesigns,
  activeDesignId,
  onChangeDesign,
  onSelectSaved,
  onSaveAsNew,
  onUpdateCurrent,
  onDeleteSaved,
  saving,
}) => {
  const [newName, setNewName] = useState('');

  const patch = (p: Partial<QrDesignConfig>) => {
    onChangeDesign({ ...design, ...p });
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3>📱 Designs prontos de placa QR Code</h3>
        <p className="sub">
          Escolha um modelo pronto e personalize cores, borda, logo, telefone, Instagram, Wi-Fi e
          textos ao redor do quadrado do QR Code.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QR_DESIGN_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="rounded-xl p-2.5 text-left border cursor-pointer transition-all"
              style={{
                background: tpl.bg_color,
                borderColor: design.id === tpl.id ? tpl.accent_color : 'rgba(255,255,255,0.14)',
                color: tpl.text_color,
              }}
              onClick={() =>
                onChangeDesign({
                  ...tpl,
                  id: design.id.startsWith('qr-') ? design.id : tpl.id,
                  phone_text: design.phone_text,
                  instagram_text: design.instagram_text,
                  wifi_name: design.wifi_name,
                  wifi_pass: design.wifi_pass,
                  custom_note: design.custom_note,
                })
              }
            >
              <div className="text-xs font-bold" style={{ color: tpl.accent_color }}>
                {tpl.design_name}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5 truncate">{tpl.headline}</div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="b g sm mt-3"
          onClick={() =>
            patch({
              bg_color: bar.color_bg || '#0b090e',
              card_color: bar.color_surface || '#16131c',
              accent_color: bar.color_accent || '#e5b84b',
              text_color: bar.color_text || '#f8f2e4',
            })
          }
        >
          🎨 Puxar cores atuais da loja
        </button>
      </div>

      {/* Salvos / Múltiplos Designs */}
      <div className="card">
        <h3>💾 Meus designs salvos de QR ({savedDesigns.length})</h3>
        <p className="sub">
          Salve vários estilos (ex: Mesa VIP, Balcão, Happy Hour, Festa) e escolha qualquer um na
          hora de baixar a imagem do QR Code.
        </p>

        {savedDesigns.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {savedDesigns.map((d) => {
              const isAct = d.id === activeDesignId;
              return (
                <div
                  key={d.id}
                  className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                    isAct
                      ? 'border-[var(--ac)] bg-[var(--ac)]/10'
                      : 'border-[var(--bd)] bg-[var(--bg2)]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm truncate">
                      {d.design_name} {isAct && <span className="text-[var(--ac)]">· Ativo</span>}
                    </div>
                    <div className="text-[11px] text-[var(--mut)] truncate">{d.headline}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" className="b g sm" onClick={() => onSelectSaved(d)}>
                      Usar
                    </button>
                    <button
                      type="button"
                      className="b d sm"
                      onClick={() => void onDeleteSaved(d.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do novo design (ex: Placa Mesa VIP)"
            className="grow"
          />
          <button
            type="button"
            className="b sm"
            disabled={saving}
            onClick={async () => {
              const nm = newName.trim() || `Design QR ${savedDesigns.length + 1}`;
              await onSaveAsNew(nm);
              setNewName('');
            }}
          >
            + Salvar novo
          </button>
        </div>

        <button
          type="button"
          className="b g mt-2 w-full"
          disabled={saving}
          onClick={() => void onUpdateCurrent()}
        >
          {saving ? 'Salvando...' : '💾 Salvar alterações no design ativo'}
        </button>
      </div>

      {/* Cores & Moldura */}
      <div className="card">
        <h3>🎨 Cores, fundo e moldura</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label>Fundo principal</label>
            <input
              type="color"
              value={design.bg_color || '#0b090e'}
              onChange={(e) => patch({ bg_color: e.target.value })}
              className="h-10 p-1"
            />
          </div>
          <div>
            <label>Fundo secundário</label>
            <input
              type="color"
              value={design.bg_color_2 || '#23190a'}
              onChange={(e) => patch({ bg_color_2: e.target.value })}
              className="h-10 p-1"
            />
          </div>
          <div>
            <label>Cor de destaque / borda</label>
            <input
              type="color"
              value={design.accent_color || '#e5b84b'}
              onChange={(e) => patch({ accent_color: e.target.value })}
              className="h-10 p-1"
            />
          </div>
          <div>
            <label>Cor dos textos</label>
            <input
              type="color"
              value={design.text_color || '#f8f2e4'}
              onChange={(e) => patch({ text_color: e.target.value })}
              className="h-10 p-1"
            />
          </div>
          <div>
            <label>Cor do QR Code</label>
            <input
              type="color"
              value={design.qr_fg_color || '#111111'}
              onChange={(e) => patch({ qr_fg_color: e.target.value })}
              className="h-10 p-1"
            />
          </div>
          <div>
            <label>Fundo do quadrado QR</label>
            <input
              type="color"
              value={design.qr_bg_color || '#ffffff'}
              onChange={(e) => patch({ qr_bg_color: e.target.value })}
              className="h-10 p-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
          <div>
            <label>Textura / fundo da placa</label>
            <select
              value={design.bg_pattern || 'radial'}
              onChange={(e) =>
                patch({ bg_pattern: e.target.value as QrDesignConfig['bg_pattern'] })
              }
            >
              <option value="radial">Luz radial central</option>
              <option value="gradient">Degradê diagonal</option>
              <option value="solid">Sólido limpo</option>
              <option value="dots">Pontilhado elegante</option>
              <option value="stripes">Listras diagonais</option>
            </select>
          </div>
          <div>
            <label>Estilo da moldura</label>
            <select
              value={design.frame_style || 'gold'}
              onChange={(e) =>
                patch({ frame_style: e.target.value as QrDesignConfig['frame_style'] })
              }
            >
              <option value="gold">Dourada / Dupla Clássica</option>
              <option value="neon">Neon Brilhante</option>
              <option value="vintage">Boteco Vintage Tracejada</option>
              <option value="rounded">Arredondada Forte</option>
              <option value="double">Linha Dupla Speakeasy</option>
              <option value="minimal">Fina Minimalista</option>
              <option value="none">Sem moldura</option>
            </select>
          </div>
        </div>
      </div>

      {/* Textos e Informações exibidas */}
      <div className="card">
        <h3>✍️ Textos e informações na placa</h3>

        <label>Selo no topo (badge)</label>
        <input
          value={design.badge_text || ''}
          onChange={(e) => patch({ badge_text: e.target.value })}
          placeholder="Ex: ESCANEIE AQUI"
        />

        <label>Título principal</label>
        <input
          value={design.headline || ''}
          onChange={(e) => patch({ headline: e.target.value })}
          placeholder="Ex: CARDÁPIO DIGITAL"
        />

        <label>Subtítulo / instrução</label>
        <input
          value={design.subheadline || ''}
          onChange={(e) => patch({ subheadline: e.target.value })}
          placeholder="Ex: Aponte a câmera e peça direto da mesa"
        />

        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { k: 'show_logo' as const, label: 'Mostrar logo' },
            { k: 'show_name' as const, label: 'Mostrar nome da loja' },
            { k: 'show_slogan' as const, label: 'Mostrar slogan' },
            { k: 'show_table' as const, label: 'Mostrar etiqueta de mesa' },
            { k: 'show_phone' as const, label: 'Mostrar telefone' },
            { k: 'show_instagram' as const, label: 'Mostrar Instagram' },
            { k: 'show_wifi' as const, label: 'Mostrar Wi-Fi' },
          ].map((item) => (
            <label
              key={item.k}
              className="!mt-0 flex items-center gap-2 rounded-xl border border-[var(--bd)] bg-[var(--bg2)] px-3 py-2 cursor-pointer text-xs text-[var(--txt)]"
            >
              <input
                type="checkbox"
                checked={!!design[item.k]}
                onChange={(e) => patch({ [item.k]: e.target.checked })}
                className="w-4 h-4 accent-[var(--ac)]"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        {design.show_phone && (
          <>
            <label>Telefone / WhatsApp na placa (opcional — puxa do perfil se vazio)</label>
            <input
              value={design.phone_text || ''}
              onChange={(e) => patch({ phone_text: e.target.value })}
              placeholder="(61) 99999-9999"
            />
          </>
        )}

        {design.show_instagram && (
          <>
            <label>Instagram na placa (opcional — puxa do perfil se vazio)</label>
            <input
              value={design.instagram_text || ''}
              onChange={(e) => patch({ instagram_text: e.target.value })}
              placeholder="@meubar"
            />
          </>
        )}

        {design.show_wifi && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label>Nome do Wi-Fi</label>
              <input
                value={design.wifi_name || ''}
                onChange={(e) => patch({ wifi_name: e.target.value })}
                placeholder="WiFi_MeuBar"
              />
            </div>
            <div>
              <label>Senha do Wi-Fi</label>
              <input
                value={design.wifi_pass || ''}
                onChange={(e) => patch({ wifi_pass: e.target.value })}
                placeholder="drinks2025"
              />
            </div>
          </div>
        )}

        <label>Observação extra (ex: Happy hour 18h–20h · Chame o garçom)</label>
        <input
          value={design.custom_note || ''}
          onChange={(e) => patch({ custom_note: e.target.value })}
          placeholder="Texto personalizado extra..."
        />

        <label>Texto do rodapé</label>
        <input
          value={design.footer_text || ''}
          onChange={(e) => patch({ footer_text: e.target.value })}
          placeholder="Drinks feitos na hora · Petiscos · Bebidas"
        />
      </div>
    </div>
  );
};
