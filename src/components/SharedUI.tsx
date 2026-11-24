import React, { useRef, useState } from 'react';
import { CATS, EMO } from '../lib/catalog';
import type { ImagePreset } from '../lib/imageOptimizer';
import { uploadMediaFile } from '../lib/supabase';
import { getProximitySuggestions, reverseGeocodeExact } from '../lib/utils';
import type { Bar, Recipe, UserCoords } from '../types/meubar';
import { DrinkImageSearchModal } from './DrinkImageSearchModal';

export const BrandMark: React.FC<{ bar?: Partial<Bar> | null; big?: boolean }> = ({
  bar,
  big = false,
}) => {
  const lg = bar?.logo_url || '/logo.png';
  const nm = bar?.name || 'Meu Bar';
  const fontCls = bar?.name_font || 'store-font-serif';

  return (
    <span className={`brand${big ? ' big' : ''}`}>
      <img
        className={`logo${big ? ' big' : ''}`}
        src={lg}
        alt={nm}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      <span>
        <span className={`bn ${fontCls}`}>{nm}</span>
      </span>
    </span>
  );
};

export const RecipeTile: React.FC<{ recipe: Pick<Recipe, 'category' | 'image_url'> }> = ({
  recipe,
}) => {
  const idx = Math.max(0, CATS.indexOf(recipe.category));
  return (
    <div
      className={`im c${idx}`}
      style={recipe.image_url ? { backgroundImage: `url('${recipe.image_url}')` } : undefined}
    >
      {recipe.image_url ? null : EMO[idx] || '🍸'}
    </div>
  );
};

interface ImageUploaderProps {
  label: string;
  value: string;
  folder: string;
  userId?: string;
  entityId?: string;
  imagePreset?: ImagePreset;
  defaultSearchQuery?: string;
  allowWebSearch?: boolean;
  onChange: (url: string) => void;
  onToast: (msg: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  folder,
  userId,
  entityId,
  imagePreset,
  defaultSearchQuery = '',
  allowWebSearch = false,
  onChange,
  onToast,
}) => {
  const [status, setStatus] = useState('');
  const [showWebSearch, setShowWebSearch] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setStatus('Otimizando…');
    const res = await uploadMediaFile(file, folder, userId, {
      preset: imagePreset,
      entityId,
    });
    if (res.error) {
      setStatus('Falha no upload');
      onToast('Erro ao enviar imagem: ' + res.error);
      return;
    }
    const url = res.url || '';
    onChange(url);
    setStatus('Salva em WebP!');
    onToast('Imagem otimizada e salva com sucesso!');
  };

  return (
    <div className="img-picker">
      <label className="!mt-0">{label}</label>
      <div className="row items-start">
        <img
          className={`img-thumb ${value ? 'opacity-100' : 'opacity-35'}`}
          src={value || '/logo.png'}
          alt="Prévia"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.35';
          }}
        />
        <div className="grow">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Link da imagem (gerado ao enviar foto ou colado)"
          />
          <div className="row mt-2 flex-wrap">
            <button
              type="button"
              className="b sm g"
              onClick={() => camRef.current?.click()}
            >
              📷 Tirar foto
            </button>
            <button
              type="button"
              className="b sm g"
              onClick={() => galRef.current?.click()}
            >
              🖼️ Galeria
            </button>
            {allowWebSearch && (
              <button
                type="button"
                className="b sm"
                onClick={() => setShowWebSearch(true)}
              >
                🌐 Pesquisar foto
              </button>
            )}
            {status && <span className="tag">{status}</span>}
          </div>
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <input
            ref={galRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>
      </div>

      {allowWebSearch && showWebSearch && (
        <DrinkImageSearchModal
          mode="single"
          initialQuery={defaultSearchQuery}
          userId={userId}
          onSelectUrl={(url) => {
            onChange(url);
            setStatus('Foto da web salva!');
          }}
          onClose={() => setShowWebSearch(false)}
          onToast={onToast}
        />
      )}
    </div>
  );
};

interface LocationPickerProps {
  label?: string;
  placeholder?: string;
  value: string;
  userCoords: UserCoords | null;
  showGeoButton?: boolean;
  onDetectCoords?: () => Promise<UserCoords | null>;
  onChange: (value: string, lat?: number, lon?: number) => void;
  onToast?: (msg: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  placeholder = 'Ex: Asa Norte, Brasília, DF',
  value,
  userCoords,
  showGeoButton = false,
  onDetectCoords,
  onChange,
  onToast,
}) => {
  const [focused, setFocused] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const suggestions =
    focused && value.trim().length > 0 ? getProximitySuggestions(value, userCoords) : [];

  const handleGeo = async () => {
    if (!onDetectCoords) return;
    setDetecting(true);
    const c = await onDetectCoords();
    if (!c) {
      setDetecting(false);
      onToast?.('Não foi possível obter a localização. Permita o acesso no navegador.');
      return;
    }
    const exactLabel = await reverseGeocodeExact(c.lat, c.lon);
    setDetecting(false);
    onToast?.(`Localização exata: ${exactLabel}`);
    onChange(exactLabel, c.lat, c.lon);
  };

  return (
    <div>
      {label && <label>{label}</label>}
      {showGeoButton && (
        <div className="row mb-1.5">
          <button
            type="button"
            className="b g sm"
            disabled={detecting}
            onClick={() => void handleGeo()}
          >
            {detecting ? 'Obtendo…' : '📍 Usar minha localização'}
          </button>
        </div>
      )}
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 180)}
        onChange={(e) => onChange(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="loc-suggest-box">
          {suggestions.map((it) => (
            <button
              key={it.label}
              type="button"
              className="loc-suggest-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(it.label, it.lat, it.lon);
                setFocused(false);
              }}
            >
              <span>
                📍 <b>{it.label}</b>
              </span>
              <span className="tag">{it.km < 9000 ? `${it.km.toFixed(1)} km` : 'Exato'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
