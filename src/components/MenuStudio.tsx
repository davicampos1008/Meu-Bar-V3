import React, { useEffect, useMemo, useState } from 'react';
import {
  BG_PATTERNS,
  BORDER_STYLES,
  CARD_STYLES,
  CATS,
  CREST_BASES,
  CREST_ICONS,
  CREST_ORNAMENTS,
  DISPLAY_MODES,
  FOOTER_ORNAMENTS,
  LOGO_SHAPES,
  LOGO_SIZES,
  MENU_BLOCK_LABELS,
  MENU_STYLE_TEMPLATES,
  NAME_FONTS,
  POS_OPTIONS,
  PRICE_STYLES,
  SECTION_STYLES,
  SIDE_DETAILS,
  STORE_AMENITIES,
  STORE_PROFILE_TEMPLATES,
  TOP_ORNAMENTS,
} from '../lib/catalog';
import { broadcastMenuUpdate, writeBarSafe } from '../lib/supabase';
import {
  applyBarTheme,
  buildUnifiedStudioPresets,
  filterRecipesForBar,
  getActivePromotion,
  getActiveQrDesign,
  getActiveStoreProfileId,
  getBarMenuDesign,
  getBarPromotions,
  getMenuPresets,
  getQrDesigns,
  getStoreProfileConfig,
  getStoreProfiles,
  getUnpricedAvailableDrinks,
  makeDrink,
  menuUrl,
  slugHandle,
} from '../lib/utils';
import type {
  Bar,
  BarItem,
  MenuBlockId,
  MenuDesignConfig,
  MenuPreset,
  MenuPromotion,
  QrDesignConfig,
  Recipe,
  StoreProfileConfig,
  StoreProfilePreset,
  UserCoords,
} from '../types/meubar';
import {
  buildMenuBackgroundStyle,
  CanvaBlockShell,
  FooterOrnamentView,
  MenuDrinksCatalog,
  MenuHeaderCard,
  MenuPromoBanner,
  normalizeBlockOrder,
  SideDetailWrapper,
} from './MenuVisualRenderer';
import { QrDesignerPanel, QrPosterPreview } from './QrDesigner';
import { ImageUploader, LocationPicker } from './SharedUI';
import { StoreProfileRenderer } from './StoreProfileRenderer';

export type StudioTab = 'store' | 'menu' | 'promos' | 'qr';

const DEFAULT_PROMO_COLORS = ['#e5a93c', '#34d399', '#f43f5e', '#a855f7', '#38bdf8'];

export const StoreStudioView: React.FC<{
  bar: Bar;
  items: BarItem[];
  recipes: Recipe[];
  prices: Record<string, number>;
  hasPricing: boolean;
  initialTab?: StudioTab;
  userCoords: UserCoords | null;
  onDetectCoords: () => Promise<UserCoords | null>;
  onBarUpdated: (bar: Bar) => void;
  onGoPrices?: () => void;
  onBackMore: () => void;
  onToast: (msg: string) => void;
}> = ({
  bar,
  items,
  recipes,
  prices,
  hasPricing,
  initialTab,
  userCoords,
  onDetectCoords,
  onBarUpdated,
  onGoPrices,
  onBackMore,
  onToast,
}) => {
  const [studioTab, setStudioTab] = useState<StudioTab>(initialTab || 'menu');
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    if (initialTab) setStudioTab(initialTab);
  }, [initialTab]);

  // --- Aba 1: Perfil & Visual da Loja (completo + múltiplos perfis) ---
  const [name, setName] = useState(bar.name || '');
  const [handle, setHandle] = useState(bar.handle || '');
  const [slogan, setSlogan] = useState(bar.slogan || '');
  const [logoUrl, setLogoUrl] = useState(bar.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(bar.banner_url || '');
  const [city, setCity] = useState(bar.city || '');
  const [lat, setLat] = useState(bar.lat != null ? String(bar.lat) : '');
  const [lon, setLon] = useState(bar.lon != null ? String(bar.lon) : '');
  const [storeProfileCfg, setStoreProfileCfg] = useState<StoreProfileConfig>(() =>
    getStoreProfileConfig(bar)
  );
  const [storeProfiles, setStoreProfiles] = useState<StoreProfilePreset[]>(() =>
    getStoreProfiles(bar)
  );
  const [activeStoreProfileId, setActiveStoreProfileId] = useState<string>(() =>
    getActiveStoreProfileId(bar)
  );
  const [newProfileName, setNewProfileName] = useState('');

  // --- Aba 4: Arte do QR Code ---
  const [qrDesigns, setQrDesigns] = useState<QrDesignConfig[]>(() => getQrDesigns(bar));
  const [qrDesign, setQrDesign] = useState<QrDesignConfig>(() => getActiveQrDesign(bar));
  const [activeQrDesignId, setActiveQrDesignId] = useState<string>(
    () => bar.active_qr_design || getActiveQrDesign(bar).id
  );
  const [previewQrTable, setPreviewQrTable] = useState('Mesa 1');

  // --- Aba 2: Edição do Cardápio (RPG modular) ---
  const [mode, setMode] = useState(bar.menu_display_mode || 'grid-classic');
  const [font, setFont] = useState(bar.name_font || 'store-font-serif');
  const [crestBase, setCrestBase] = useState(bar.crest_base || 'circle');
  const [crestIcon, setCrestIcon] = useState(bar.crest_icon || 'glass');
  const [crestOrn, setCrestOrn] = useState(bar.crest_ornament || 'none');
  const [borderStyle, setBorderStyle] = useState(bar.crest_border || 'crest-border-gold');
  const [logoPos, setLogoPos] = useState(bar.logo_pos || 'left');
  const [namePos, setNamePos] = useState(bar.name_pos || 'left');

  const [colorBg, setColorBg] = useState(bar.color_bg || '#0b0a0d');
  const [colorSurface, setColorSurface] = useState(bar.color_surface || '#141218');
  const [colorAccent, setColorAccent] = useState(bar.color_accent || '#e5a93c');
  const [colorOk, setColorOk] = useState(bar.color_ok || '#34d399');
  const [colorText, setColorText] = useState(bar.color_text || '#f6f1ea');

  const [design, setDesign] = useState<MenuDesignConfig>(() => getBarMenuDesign(bar));
  const [selectedPreset, setSelectedPreset] = useState(bar.active_menu_preset || '');
  const [presetName, setPresetName] = useState('');

  // --- Modo Canva ---
  const [canvaOpen, setCanvaOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<MenuBlockId>('header');
  const [draggedBlock, setDraggedBlock] = useState<MenuBlockId | null>(null);

  useEffect(() => {
    if (!canvaOpen) return;
    const onBackCloseCanva = (ev: Event) => {
      ev.preventDefault();
      setCanvaOpen(false);
    };
    window.addEventListener('meubar:back-intercept', onBackCloseCanva);
    return () => window.removeEventListener('meubar:back-intercept', onBackCloseCanva);
  }, [canvaOpen]);

  // --- Aba 3: Promoções ---
  const [promotions, setPromotions] = useState<MenuPromotion[]>(() => getBarPromotions(bar));
  const [activePromoId, setActivePromoId] = useState<string | null>(
    () => getActivePromotion(bar)?.id || null
  );
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoTitle, setPromoTitle] = useState('');
  const [promoSubtitle, setPromoSubtitle] = useState('');
  const [promoBadge, setPromoBadge] = useState('OFERTA');
  const [promoType, setPromoType] = useState<'discount_pct' | 'banner'>('discount_pct');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [promoCat, setPromoCat] = useState('Todas');
  const [promoColor, setPromoColor] = useState('#e5a93c');

  const [saving, setSaving] = useState(false);

  // Sincroniza estados se o usuário trocar de bar
  useEffect(() => {
    setName(bar.name || '');
    setHandle(bar.handle || '');
    setSlogan(bar.slogan || '');
    setLogoUrl(bar.logo_url || '');
    setBannerUrl(bar.banner_url || '');
    setCity(bar.city || '');
    setLat(bar.lat != null ? String(bar.lat) : '');
    setLon(bar.lon != null ? String(bar.lon) : '');
    setMode(bar.menu_display_mode || 'grid-classic');
    setFont(bar.name_font || 'store-font-serif');
    setCrestBase(bar.crest_base || 'circle');
    setCrestIcon(bar.crest_icon || 'glass');
    setCrestOrn(bar.crest_ornament || 'none');
    setBorderStyle(bar.crest_border || 'crest-border-gold');
    setLogoPos(bar.logo_pos || 'left');
    setNamePos(bar.name_pos || 'left');
    setColorBg(bar.color_bg || '#0b0a0d');
    setColorSurface(bar.color_surface || '#141218');
    setColorAccent(bar.color_accent || '#e5a93c');
    setColorOk(bar.color_ok || '#34d399');
    setColorText(bar.color_text || '#f6f1ea');
    setDesign(getBarMenuDesign(bar));
    setSelectedPreset(bar.active_menu_preset || '');
    setPromotions(getBarPromotions(bar));
    setActivePromoId(getActivePromotion(bar)?.id || null);
    setStoreProfileCfg(getStoreProfileConfig(bar));
    setStoreProfiles(getStoreProfiles(bar));
    setActiveStoreProfileId(getActiveStoreProfileId(bar));
    setQrDesigns(getQrDesigns(bar));
    const activeQr = getActiveQrDesign(bar);
    setQrDesign(activeQr);
    setActiveQrDesignId(bar.active_qr_design || activeQr.id);
  }, [bar.id]);

  const presets = useMemo(() => getMenuPresets(bar), [bar]);
  const activePromo = useMemo(
    () => promotions.find((p) => p.id === activePromoId) || null,
    [promotions, activePromoId]
  );

  const blockOrder = useMemo(
    () => normalizeBlockOrder(design.block_order),
    [design.block_order]
  );

  // Drinks reais disponíveis para o cliente (no estoque + com preço quando bar é pago)
  const scopedRecipes = useMemo(() => filterRecipesForBar(recipes, bar.id), [recipes, bar.id]);
  const makeableDrinks = useMemo(
    () => scopedRecipes.filter((r) => makeDrink(r, items)),
    [scopedRecipes, items]
  );

  const realClientDrinks = useMemo(
    () =>
      hasPricing
        ? makeableDrinks.filter((r) => prices[r.id] != null)
        : makeableDrinks,
    [makeableDrinks, hasPricing, prices]
  );

  const unpricedAvailable = useMemo(
    () => getUnpricedAvailableDrinks(recipes, items, prices, bar),
    [recipes, items, prices, bar]
  );

  const usingSampleDrinks = realClientDrinks.length === 0;
  const previewDrinks = useMemo(
    () =>
      realClientDrinks.length > 0
        ? realClientDrinks.slice(0, 8)
        : recipes.slice(0, 4),
    [realClientDrinks, recipes]
  );

  const liveBar: Partial<Bar> = {
    ...bar,
    name: name.trim() || bar.name,
    handle: handle.trim().replace(/^@/, '') || bar.handle,
    slogan: slogan.trim() || null,
    logo_url: logoUrl.trim() || null,
    banner_url: bannerUrl.trim() || null,
    city: city.trim() || null,
    lat: lat ? Number(lat) : null,
    lon: lon ? Number(lon) : null,
    name_font: font,
    crest_base: crestBase,
    crest_icon: crestIcon,
    crest_ornament: crestOrn,
    crest_border: borderStyle,
    logo_pos: logoPos,
    name_pos: namePos,
    menu_display_mode: mode,
    color_bg: colorBg,
    color_surface: colorSurface,
    color_accent: colorAccent,
    color_ok: colorOk,
    color_text: colorText,
    menu_design: design,
    menu_promotions: promotions,
    active_promotion_id: activePromoId,
  };

  const applyQuickTemplate = (tplId: string) => {
    const tpl = MENU_STYLE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    setColorBg(tpl.color_bg);
    setColorSurface(tpl.color_surface);
    setColorAccent(tpl.color_accent);
    setColorOk(tpl.color_ok);
    setColorText(tpl.color_text);
    setFont(tpl.name_font);
    setBorderStyle(tpl.crest_border);
    setLogoPos(tpl.logo_pos);
    setNamePos(tpl.name_pos);
    setMode(tpl.menu_display_mode);
    setDesign((prev) => ({
      ...prev,
      ...tpl.design,
    }));
    onToast(`Tema "${tpl.label}" aplicado na prévia!`);
  };

  const buildStudioMetaArray = (
    userPresets: MenuPreset[],
    nextDesign: MenuDesignConfig,
    nextPromos: MenuPromotion[],
    nextActivePromoId: string | null,
    extra?: {
      store_profile_data?: StoreProfileConfig;
      store_profiles?: StoreProfilePreset[];
      active_store_profile?: string | null;
      qr_designs?: QrDesignConfig[];
      active_qr_design?: string | null;
    }
  ) =>
    buildUnifiedStudioPresets(bar, {
      userPresets,
      menu_design: nextDesign,
      promotions: nextPromos,
      active_promotion_id: nextActivePromoId,
      store_profile_data: extra?.store_profile_data ?? storeProfileCfg,
      store_profiles: extra?.store_profiles ?? storeProfiles,
      active_store_profile:
        extra?.active_store_profile !== undefined
          ? extra.active_store_profile
          : activeStoreProfileId || null,
      qr_designs: extra?.qr_designs ?? qrDesigns,
      active_qr_design:
        extra?.active_qr_design !== undefined ? extra.active_qr_design : activeQrDesignId || null,
    });

  const persistStudioUpdate = async (
    patch: Record<string, unknown>,
    successMsg: string
  ) => {
    setSaving(true);
    const nextStoreCfg = (patch.store_profile_data as StoreProfileConfig) || storeProfileCfg;
    const nextStoreProfiles = (patch.store_profiles as StoreProfilePreset[]) || storeProfiles;
    const nextActiveStoreProfile =
      patch.active_store_profile !== undefined
        ? (patch.active_store_profile as string | null)
        : activeStoreProfileId || null;
    const nextQrDesigns = (patch.qr_designs as QrDesignConfig[]) || qrDesigns;
    const nextActiveQrDesign =
      patch.active_qr_design !== undefined
        ? (patch.active_qr_design as string | null)
        : activeQrDesignId || null;

    const mergedPresets = buildStudioMetaArray(
      presets,
      (patch.menu_design as MenuDesignConfig) || design,
      (patch.menu_promotions as MenuPromotion[]) || promotions,
      patch.active_promotion_id !== undefined
        ? (patch.active_promotion_id as string | null)
        : activePromoId,
      {
        store_profile_data: nextStoreCfg,
        store_profiles: nextStoreProfiles,
        active_store_profile: nextActiveStoreProfile,
        qr_designs: nextQrDesigns,
        active_qr_design: nextActiveQrDesign,
      }
    );
    const fullPatch: Record<string, unknown> = {
      ...patch,
      menu_presets: patch.menu_presets || mergedPresets,
    };

    const r = await writeBarSafe('update', fullPatch, bar.id);
    setSaving(false);
    if (r.error) {
      onToast('Erro: ' + r.error.message);
      return null;
    }
    if (r.data) {
      const normalized: Bar = {
        ...r.data,
        menu_presets: (fullPatch.menu_presets as MenuPreset[]) || r.data.menu_presets,
        menu_design: (patch.menu_design as MenuDesignConfig) || design,
        menu_promotions: (patch.menu_promotions as MenuPromotion[]) || promotions,
        active_promotion_id:
          patch.active_promotion_id !== undefined
            ? (patch.active_promotion_id as string | null)
            : activePromoId,
        store_profile_data: nextStoreCfg,
        store_profiles: nextStoreProfiles,
        active_store_profile: nextActiveStoreProfile,
        qr_designs: nextQrDesigns,
        active_qr_design: nextActiveQrDesign,
      };
      applyBarTheme(normalized);
      onBarUpdated(normalized);
      void broadcastMenuUpdate(bar.id, normalized);
      onToast(successMsg);
      return normalized;
    }
    return null;
  };

  const buildCardapioPatch = () => ({
    name: name.trim() || bar.name,
    slogan: slogan.trim() || null,
    logo_url: logoUrl.trim() || null,
    banner_url: bannerUrl.trim() || null,
    name_font: font,
    crest_base: crestBase,
    crest_icon: crestIcon,
    crest_ornament: crestOrn,
    crest_border: borderStyle,
    logo_pos: logoPos,
    name_pos: namePos,
    menu_display_mode: mode,
    color_bg: colorBg,
    color_surface: colorSurface,
    color_accent: colorAccent,
    color_ok: colorOk,
    color_text: colorText,
    menu_design: design,
    active_promotion_id: activePromoId,
  });

  const buildStoreProfilePatch = () => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    return {
      name: name.trim() || bar.name,
      handle: cleanHandle ? slugHandle(cleanHandle) : null,
      slogan: slogan.trim() || null,
      city: city.trim() || null,
      lat: lat ? Number(lat) : null,
      lon: lon ? Number(lon) : null,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      name_font: font,
      color_bg: colorBg,
      color_surface: colorSurface,
      color_accent: colorAccent,
      color_ok: colorOk,
      color_text: colorText,
      about: storeProfileCfg.about?.trim() || null,
      phone: storeProfileCfg.phone?.trim() || null,
      instagram: storeProfileCfg.instagram?.trim() || null,
      opening_hours: storeProfileCfg.opening_hours?.trim() || null,
      store_profile_data: storeProfileCfg,
    };
  };

  const handleSaveStoreVisual = async () => {
    const cleanHandle = handle.trim().replace(/^@/, '');
    if (cleanHandle && !/^[a-z0-9_]{3,32}$/i.test(cleanHandle)) {
      onToast('@ precisa ter 3–32 letras, números ou _.');
      return;
    }
    await persistStudioUpdate(buildStoreProfilePatch(), 'Perfil e visual da loja salvos!');
  };

  const handleSaveNewStoreProfile = async () => {
    const pName = newProfileName.trim() || `Perfil ${storeProfiles.length + 1}`;
    const id = 'sp_' + Math.random().toString(36).slice(2, 9);
    const preset: StoreProfilePreset = {
      id,
      profile_name: pName,
      saved_at: new Date().toISOString(),
      name: name.trim() || bar.name,
      slogan: slogan.trim() || null,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      name_font: font,
      color_bg: colorBg,
      color_surface: colorSurface,
      color_accent: colorAccent,
      color_ok: colorOk,
      color_text: colorText,
      profile_config: storeProfileCfg,
    };
    const nextList = [...storeProfiles, preset];
    setStoreProfiles(nextList);
    setActiveStoreProfileId(id);
    setNewProfileName('');
    await persistStudioUpdate(
      {
        ...buildStoreProfilePatch(),
        store_profiles: nextList,
        active_store_profile: id,
      },
      `Perfil "${pName}" salvo e ativado!`
    );
  };

  const handleApplyStoreProfile = async (sp: StoreProfilePreset) => {
    if (sp.name) setName(sp.name);
    if (sp.slogan !== undefined) setSlogan(sp.slogan || '');
    if (sp.logo_url !== undefined) setLogoUrl(sp.logo_url || '');
    if (sp.banner_url !== undefined) setBannerUrl(sp.banner_url || '');
    if (sp.name_font) setFont(sp.name_font);
    if (sp.color_bg) setColorBg(sp.color_bg);
    if (sp.color_surface) setColorSurface(sp.color_surface);
    if (sp.color_accent) setColorAccent(sp.color_accent);
    if (sp.color_ok) setColorOk(sp.color_ok);
    if (sp.color_text) setColorText(sp.color_text);
    const nextCfg: StoreProfileConfig = {
      ...storeProfileCfg,
      ...(sp.profile_config || {}),
    };
    setStoreProfileCfg(nextCfg);
    setActiveStoreProfileId(sp.id);
    await persistStudioUpdate(
      {
        name: sp.name || name.trim() || bar.name,
        slogan: sp.slogan ?? (slogan.trim() || null),
        logo_url: sp.logo_url ?? (logoUrl.trim() || null),
        banner_url: sp.banner_url ?? (bannerUrl.trim() || null),
        name_font: sp.name_font || font,
        color_bg: sp.color_bg || colorBg,
        color_surface: sp.color_surface || colorSurface,
        color_accent: sp.color_accent || colorAccent,
        color_ok: sp.color_ok || colorOk,
        color_text: sp.color_text || colorText,
        store_profile_data: nextCfg,
        active_store_profile: sp.id,
      },
      `Perfil "${sp.profile_name}" ativado!`
    );
  };

  const handleDeleteStoreProfile = async (id: string) => {
    const nextList = storeProfiles.filter((x) => x.id !== id);
    const nextActive = activeStoreProfileId === id ? nextList[0]?.id || '' : activeStoreProfileId;
    setStoreProfiles(nextList);
    setActiveStoreProfileId(nextActive);
    await persistStudioUpdate(
      {
        store_profiles: nextList,
        active_store_profile: nextActive || null,
      },
      'Perfil removido!'
    );
  };

  const handleSaveNewQrDesign = async (designName: string) => {
    const id = 'qr_' + Math.random().toString(36).slice(2, 9);
    const created: QrDesignConfig = {
      ...qrDesign,
      id,
      design_name: designName,
      saved_at: new Date().toISOString(),
    };
    const nextList = [...qrDesigns, created];
    setQrDesigns(nextList);
    setQrDesign(created);
    setActiveQrDesignId(id);
    await persistStudioUpdate(
      {
        qr_designs: nextList,
        active_qr_design: id,
      },
      `Design de QR "${designName}" salvo!`
    );
  };

  const handleUpdateCurrentQrDesign = async () => {
    const exists = qrDesigns.some((d) => d.id === qrDesign.id);
    const nextId = exists ? qrDesign.id : 'qr_' + Math.random().toString(36).slice(2, 9);
    const updatedItem: QrDesignConfig = {
      ...qrDesign,
      id: nextId,
      design_name: qrDesign.design_name || 'Design QR Principal',
      saved_at: new Date().toISOString(),
    };
    const nextList = exists
      ? qrDesigns.map((d) => (d.id === nextId ? updatedItem : d))
      : [...qrDesigns, updatedItem];
    setQrDesigns(nextList);
    setQrDesign(updatedItem);
    setActiveQrDesignId(nextId);
    await persistStudioUpdate(
      {
        qr_designs: nextList,
        active_qr_design: nextId,
      },
      'Design de QR Code salvo e ativado!'
    );
  };

  const handleDeleteQrDesign = async (id: string) => {
    const nextList = qrDesigns.filter((d) => d.id !== id);
    const nextActive = activeQrDesignId === id ? nextList[0]?.id || '' : activeQrDesignId;
    setQrDesigns(nextList);
    setActiveQrDesignId(nextActive);
    await persistStudioUpdate(
      {
        qr_designs: nextList,
        active_qr_design: nextActive || null,
      },
      'Design de QR removido!'
    );
  };

  const handleSaveCardapio = async () => {
    await persistStudioUpdate(buildCardapioPatch(), 'Cardápio salvo e atualizado nos clientes!');
  };

  const handleSaveNewPreset = async () => {
    const pname = presetName.trim();
    if (!pname) {
      onToast('Digite um nome para o layout (ex: Happy Hour)');
      return;
    }
    const id = 'p_' + Math.random().toString(36).slice(2, 9);
    const newPreset: MenuPreset = {
      id,
      preset_name: pname,
      saved_at: new Date().toISOString(),
      ...buildCardapioPatch(),
      menu_design: design,
      active_promotion_id: activePromoId,
    };
    const nextUserPresets = [...presets, newPreset];
    const saved = await persistStudioUpdate(
      {
        ...buildCardapioPatch(),
        menu_presets: buildStudioMetaArray(nextUserPresets, design, promotions, activePromoId),
        active_menu_preset: id,
      },
      `Layout "${pname}" salvo!`
    );
    if (saved) {
      setSelectedPreset(id);
      setPresetName('');
    }
  };

  const handleUpdateSelectedPreset = async () => {
    if (!selectedPreset) {
      onToast('Selecione um layout salvo para atualizar.');
      return;
    }
    const cur = presets.find((x) => x.id === selectedPreset);
    if (!cur) return;
    const nextUserPresets = presets.map((x) =>
      x.id === selectedPreset
        ? {
            ...x,
            saved_at: new Date().toISOString(),
            ...buildCardapioPatch(),
            menu_design: design,
            active_promotion_id: activePromoId,
          }
        : x
    );
    await persistStudioUpdate(
      {
        ...buildCardapioPatch(),
        menu_presets: buildStudioMetaArray(nextUserPresets, design, promotions, activePromoId),
        active_menu_preset: selectedPreset,
      },
      `Layout "${cur.preset_name}" atualizado!`
    );
  };

  const handleApplyPreset = async (idToApply = selectedPreset) => {
    if (!idToApply) {
      onToast('Escolha um layout salvo.');
      return;
    }
    const p = presets.find((x) => x.id === idToApply);
    if (!p) return;

    const nextDesign = p.menu_design
      ? { ...getBarMenuDesign(null), ...p.menu_design }
      : design;

    setName(p.name || name);
    setSlogan(p.slogan || '');
    setLogoUrl(p.logo_url ?? logoUrl);
    setBannerUrl(p.banner_url ?? bannerUrl);
    setFont(p.name_font || 'store-font-serif');
    setCrestBase(p.crest_base || 'circle');
    setCrestIcon(p.crest_icon || 'glass');
    setCrestOrn(p.crest_ornament || 'none');
    setBorderStyle(p.crest_border || 'crest-border-gold');
    setLogoPos(p.logo_pos || 'left');
    setNamePos(p.name_pos || 'left');
    setMode(p.menu_display_mode || 'grid-classic');
    setColorBg(p.color_bg || '#0b0a0d');
    setColorSurface(p.color_surface || '#141218');
    setColorAccent(p.color_accent || '#e5a93c');
    setColorOk(p.color_ok || '#34d399');
    setColorText(p.color_text || '#f6f1ea');
    setDesign(nextDesign);
    if (p.active_promotion_id !== undefined) {
      setActivePromoId(p.active_promotion_id || null);
    }

    const payload: Record<string, unknown> = {
      name: p.name || bar.name,
      slogan: p.slogan || null,
      logo_url: p.logo_url ?? logoUrl ?? null,
      banner_url: p.banner_url ?? bannerUrl ?? null,
      name_font: p.name_font || 'store-font-serif',
      crest_base: p.crest_base || 'circle',
      crest_icon: p.crest_icon || 'glass',
      crest_ornament: p.crest_ornament || 'none',
      crest_border: p.crest_border || 'crest-border-gold',
      logo_pos: p.logo_pos || 'left',
      name_pos: p.name_pos || 'left',
      menu_display_mode: p.menu_display_mode || 'grid-classic',
      color_bg: p.color_bg || '#0b0a0d',
      color_surface: p.color_surface || '#141218',
      color_accent: p.color_accent || '#e5a93c',
      color_ok: p.color_ok || '#34d399',
      color_text: p.color_text || '#f6f1ea',
      menu_design: nextDesign,
      active_menu_preset: idToApply,
      active_promotion_id:
        p.active_promotion_id !== undefined ? p.active_promotion_id : activePromoId,
    };

    await persistStudioUpdate(
      payload,
      `Layout "${p.preset_name}" aplicado nos cardápios!`
    );
  };

  const handleDelPreset = async () => {
    if (!selectedPreset) {
      onToast('Escolha um layout salvo.');
      return;
    }
    const nextUserPresets = presets.filter((x) => x.id !== selectedPreset);
    const nextActive = selectedPreset === bar.active_menu_preset ? null : bar.active_menu_preset;
    await persistStudioUpdate(
      {
        menu_presets: buildStudioMetaArray(nextUserPresets, design, promotions, activePromoId),
        active_menu_preset: nextActive,
      },
      'Layout excluído!'
    );
    setSelectedPreset('');
  };

  // --- Promoções CRUD ---
  const resetPromoForm = () => {
    setEditingPromoId(null);
    setPromoTitle('');
    setPromoSubtitle('');
    setPromoBadge('OFERTA');
    setPromoType('discount_pct');
    setPromoDiscount('15');
    setPromoCat('Todas');
    setPromoColor('#e5a93c');
  };

  const handleSavePromo = async () => {
    const t = promoTitle.trim();
    if (!t) {
      onToast('Informe o título da promoção.');
      return;
    }
    const pct =
      promoType === 'discount_pct'
        ? Math.min(90, Math.max(1, Number(promoDiscount) || 10))
        : 0;

    const item: MenuPromotion = {
      id: editingPromoId || 'pr_' + Math.random().toString(36).slice(2, 9),
      title: t,
      subtitle: promoSubtitle.trim() || undefined,
      badge: promoBadge.trim() || undefined,
      type: promoType,
      discount_pct: pct,
      target_category: promoCat,
      accent_color: promoColor,
      active: editingPromoId ? activePromoId === editingPromoId : true,
    };

    const nextList = editingPromoId
      ? promotions.map((x) => (x.id === editingPromoId ? item : x))
      : [...promotions, item];

    const nextActiveId = !editingPromoId ? item.id : activePromoId;
    setPromotions(nextList);
    setActivePromoId(nextActiveId || null);

    await persistStudioUpdate(
      {
        menu_promotions: nextList.map((x) => ({ ...x, active: x.id === nextActiveId })),
        active_promotion_id: nextActiveId,
      },
      editingPromoId ? 'Promoção atualizada!' : 'Promoção criada e ativada!'
    );
    resetPromoForm();
  };

  const handleToggleActivePromo = async (promoId: string | null) => {
    const nextList = promotions.map((p) => ({ ...p, active: p.id === promoId }));
    setPromotions(nextList);
    setActivePromoId(promoId);
    await persistStudioUpdate(
      {
        menu_promotions: nextList,
        active_promotion_id: promoId,
      },
      promoId ? 'Promoção ativada no cardápio!' : 'Promoção desativada no cardápio.'
    );
  };

  const handleDeletePromo = async (promoId: string) => {
    const nextList = promotions.filter((p) => p.id !== promoId);
    const nextActiveId = activePromoId === promoId ? null : activePromoId;
    setPromotions(nextList);
    setActivePromoId(nextActiveId);
    await persistStudioUpdate(
      {
        menu_promotions: nextList,
        active_promotion_id: nextActiveId,
      },
      'Promoção removida!'
    );
    if (editingPromoId === promoId) resetPromoForm();
  };

  // --- Helpers de Reordenação no Modo Canva ---
  const moveBlock = (id: MenuBlockId, dir: -1 | 1) => {
    const idx = blockOrder.indexOf(id);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= blockOrder.length) return;
    const next = [...blockOrder];
    const [removed] = next.splice(idx, 1);
    next.splice(target, 0, removed);
    setDesign({ ...design, block_order: next });
  };

  const reorderOnDrop = (targetId: MenuBlockId) => {
    if (!draggedBlock || draggedBlock === targetId) return;
    const from = blockOrder.indexOf(draggedBlock);
    const to = blockOrder.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...blockOrder];
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setDesign({ ...design, block_order: next });
    setDraggedBlock(null);
  };

  const renderLiveMenuPreview = (interactive: boolean) => {
    const bgStyle = buildMenuBackgroundStyle(colorBg, design, colorAccent);

    const renderBlockContent = (bId: MenuBlockId) => {
      if (bId === 'header') {
        return (
          <MenuHeaderCard
            bar={liveBar}
            design={design}
            interactiveLogoDrag={interactive}
            onLogoOffsetChange={(x, y) =>
              setDesign((prev) => ({ ...prev, logo_offset_x: x, logo_offset_y: y }))
            }
          />
        );
      }
      if (bId === 'promo') {
        if (!activePromo) {
          return interactive ? (
            <div className="rounded-xl border border-dashed border-white/20 p-3 text-xs opacity-60 text-center">
              Área de Promoção (nenhuma ativa no momento)
            </div>
          ) : null;
        }
        return (
          <MenuPromoBanner
            promo={activePromo}
            accent={colorAccent}
            surface={colorSurface}
          />
        );
      }
      if (bId === 'filters') {
        return (
          <div className="my-2">
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-xl border mb-2"
              style={{ background: `${colorSurface}dd`, borderColor: `${colorAccent}44` }}
            >
              {[
                { label: '🍸 Drinks', active: true },
                { label: '🍟 Petiscos', active: false },
                { label: '🍺 Avulsos', active: false },
              ].map((t) => (
                <span
                  key={t.label}
                  className="text-[10px] font-bold py-1.5 rounded-lg text-center"
                  style={
                    t.active
                      ? { background: colorAccent, color: '#141115' }
                      : { color: colorText, opacity: 0.72 }
                  }
                >
                  {t.label}
                </span>
              ))}
            </div>
            <div
              className="rounded-xl px-3 py-2 text-xs opacity-70 border"
              style={{ background: colorSurface, borderColor: `${colorAccent}33` }}
            >
              🔍 Buscar drink ou ingrediente…
            </div>
            <div className="flex gap-1.5 overflow-hidden mt-2">
              {['Todas', 'Refrescantes', 'Cítricos'].map((c, idx) => (
                <span
                  key={c}
                  className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium"
                  style={{
                    background: idx === 0 ? colorAccent : colorSurface,
                    color: idx === 0 ? '#16120c' : colorText,
                    border: `1px solid ${colorAccent}33`,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        );
      }
      if (bId === 'drinks') {
        return (
          <div>
            {usingSampleDrinks && (
              <div className="alert-box !mt-1 !mb-2 text-[11px]">
                <b>⚠️ Prévia ilustrativa (0 drinks ativos no link público agora)</b>
                <p className="mu mt-0.5 !text-[11px]">
                  No cardápio real do QR/link, só aparecem drinks com ingredientes em <b>Estoque</b>
                  {hasPricing ? ' e preço salvo em Precificação.' : '.'}
                </p>
                {hasPricing && onGoPrices && (
                  <button
                    type="button"
                    className="b sm mt-1.5"
                    onClick={onGoPrices}
                  >
                    Verificar Precificação e Estoque
                  </button>
                )}
              </div>
            )}
            <MenuDrinksCatalog
              recipes={previewDrinks}
              displayMode={mode}
              design={design}
              accent={colorAccent}
              surface={colorSurface}
              okColor={colorOk}
              textColor={colorText}
              activePromo={activePromo}
              pricesMap={prices}
              previewFallbackPrice={hasPricing ? 28 : null}
            />
          </div>
        );
      }
      return (
        <FooterOrnamentView
          id={design.footer_ornament}
          accent={colorAccent}
          barName={name.trim() || bar.name}
          footerText={design.footer_text}
        />
      );
    };

    return (
      <div
        className="rounded-2xl p-3.5 transition-all"
        style={{ ...bgStyle, color: colorText, border: `1px solid ${colorAccent}44` }}
      >
        <SideDetailWrapper sideDetail={design.side_detail} accent={colorAccent}>
          {blockOrder.map((bId, idx) => {
            const inner = renderBlockContent(bId);
            if (!inner) return null;
            if (!interactive) {
              return <div key={bId}>{inner}</div>;
            }
            return (
              <CanvaBlockShell
                key={bId}
                blockId={bId}
                active={selectedBlock === bId}
                onSelect={() => setSelectedBlock(bId)}
                canMoveUp={idx > 0}
                canMoveDown={idx < blockOrder.length - 1}
                onMoveUp={() => moveBlock(bId, -1)}
                onMoveDown={() => moveBlock(bId, 1)}
                onDragStartBlock={(id) => setDraggedBlock(id)}
                onDropOnBlock={(target) => reorderOnDrop(target)}
              >
                {inner}
              </CanvaBlockShell>
            );
          })}
        </SideDetailWrapper>
      </div>
    );
  };

  return (
    <div>
      <button
        type="button"
        className="b g sm"
        onClick={() => {
          applyBarTheme(bar);
          onBackMore();
        }}
      >
        ← Voltar para Mais
      </button>

      <div className="row sp mt-3">
        <div>
          <h1>Editor do Cardápio</h1>
          <p className="mu">
            Edite o visual da loja, combine peças do cardápio e crie promoções com prévia ao vivo.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="b g sm"
            onClick={() => setPreviewOpen((v) => !v)}
          >
            {previewOpen ? '🙈 Ocultar prévia' : '👁️ Mostrar prévia'}
          </button>
          <button type="button" className="b sm" onClick={() => setCanvaOpen(true)}>
            🖌️ Modo Canva
          </button>
        </div>
      </div>

      {hasPricing && unpricedAvailable.length > 0 && (
        <div className="alert-box row sp mt-3">
          <div className="flex-1 min-w-[200px]">
            <b>⚠️ {unpricedAvailable.length} drink(s) disponível(is) no estoque sem preço</b>
            <p className="mu mt-0.5">
              Só aparecem no cardápio do cliente os drinks do estoque que já têm preço cadastrado.
            </p>
          </div>
          {onGoPrices && (
            <button type="button" className="b sm" onClick={onGoPrices}>
              Precificar ({unpricedAvailable.length})
            </button>
          )}
        </div>
      )}

      {/* Abas principais */}
      <div className="chips !flex-wrap !overflow-visible mt-3">
        <button
          type="button"
          className={`chip ${studioTab === 'store' ? 'on' : ''}`}
          onClick={() => setStudioTab('store')}
        >
          🏪 Perfil da loja
        </button>
        <button
          type="button"
          className={`chip ${studioTab === 'menu' ? 'on' : ''}`}
          onClick={() => setStudioTab('menu')}
        >
          🎨 Edição do cardápio
        </button>
        <button
          type="button"
          className={`chip ${studioTab === 'promos' ? 'on' : ''}`}
          onClick={() => setStudioTab('promos')}
        >
          🏷️ Promoções ({promotions.length})
        </button>
        <button
          type="button"
          className={`chip ${studioTab === 'qr' ? 'on' : ''}`}
          onClick={() => setStudioTab('qr')}
        >
          📱 Arte do QR Code ({qrDesigns.length})
        </button>
      </div>

      {/* Layout responsivo: controles à esquerda, prévia fixa à direita no desktop quando visível */}
      <div
        className={
          previewOpen
            ? 'lg:grid lg:grid-cols-[1fr_370px] lg:gap-5 lg:items-start mt-2'
            : 'mt-2'
        }
      >
        {/* Coluna de Controles */}
        <div className="min-w-0">
          {/* ================= ABA 1: PERFIL COMPLETO & VISUAL DA LOJA ================= */}
          {studioTab === 'store' && (
            <div className="space-y-4">
              {/* Temas prontos do Perfil da Loja */}
              <div className="panel">
                <h2>✨ Temas prontos para o Perfil da Loja</h2>
                <p className="mu">
                  Este perfil personalizado aparece para funcionários na aba <b>Bares próximos</b> e
                  nas vagas. Crie e alterne entre vários perfis!
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {STORE_PROFILE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="rounded-xl p-2.5 text-left border cursor-pointer"
                      style={{
                        background: tpl.color_bg,
                        borderColor: `${tpl.color_accent}66`,
                        color: tpl.color_text,
                      }}
                      onClick={() => {
                        setFont(tpl.name_font);
                        setColorBg(tpl.color_bg);
                        setColorSurface(tpl.color_surface);
                        setColorAccent(tpl.color_accent);
                        setColorOk(tpl.color_ok);
                        setColorText(tpl.color_text);
                        setStoreProfileCfg((prev) => ({ ...prev, ...tpl.profile_config }));
                        onToast(`Tema de perfil "${tpl.label}" aplicado!`);
                      }}
                    >
                      <div className="text-xs font-bold" style={{ color: tpl.color_accent }}>
                        {tpl.label}
                      </div>
                      <div className="text-[10px] opacity-75 mt-0.5 truncate">
                        {tpl.profile_config.badge_text}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Múltiplos Perfis Salvos */}
              <div className="panel">
                <h2>🗂️ Meus perfis salvos da loja ({storeProfiles.length})</h2>
                <p className="mu">
                  Salve versões diferentes (ex: Perfil Oficial, Perfil Eventos, Perfil Fim de Semana)
                  e ative com 1 clique.
                </p>
                {storeProfiles.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 mb-3">
                    {storeProfiles.map((sp) => {
                      const isAct = sp.id === activeStoreProfileId;
                      return (
                        <div
                          key={sp.id}
                          className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 ${
                            isAct
                              ? 'border-[var(--ac)] bg-[var(--ac)]/10'
                              : 'border-[var(--bd)] bg-[var(--bg2)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs sm:text-sm truncate">
                              {sp.profile_name}{' '}
                              {isAct && <span className="text-[var(--ac)]">· Ativo</span>}
                            </div>
                            <div className="text-[11px] text-[var(--mut)] truncate">
                              {sp.name || bar.name} · {sp.profile_config?.badge_text || 'Perfil'}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => void handleApplyStoreProfile(sp)}
                            >
                              Ativar
                            </button>
                            <button
                              type="button"
                              className="b d sm"
                              onClick={() => void handleDeleteStoreProfile(sp.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="row mt-2">
                  <input
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Nome do perfil (ex: Perfil Oficial, Eventos VIP)"
                    className="grow"
                  />
                  <button
                    type="button"
                    className="b sm"
                    disabled={saving}
                    onClick={() => void handleSaveNewStoreProfile()}
                  >
                    + Salvar perfil
                  </button>
                </div>
              </div>

              {/* Informações Completas da Loja */}
              <div className="panel">
                <h2>🏪 Informações do Estabelecimento</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label>Nome da loja</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label>@ único da loja (handle)</label>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="ex: meu_bar_brasilia"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label>Slogan / frase de destaque</label>
                    <input
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder="Ex: Coquetelaria autoral & boas noites"
                    />
                  </div>
                  <div>
                    <label>Selo no banner (badge)</label>
                    <input
                      value={storeProfileCfg.badge_text || ''}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, badge_text: e.target.value })
                      }
                      placeholder="Ex: COQUETELARIA & LOUNGE"
                    />
                  </div>
                </div>

                <label>Sobre a loja (história, ambiente, proposta)</label>
                <textarea
                  rows={3}
                  value={storeProfileCfg.about || ''}
                  onChange={(e) =>
                    setStoreProfileCfg({ ...storeProfileCfg, about: e.target.value })
                  }
                  placeholder="Conte sobre seu espaço, música, drinks especiais, equipe e estilo da casa..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label>Horário de funcionamento</label>
                    <input
                      value={storeProfileCfg.opening_hours || ''}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, opening_hours: e.target.value })
                      }
                      placeholder="Ex: Ter–Dom · 18h às 02h"
                    />
                  </div>
                  <div>
                    <label>Telefone / Reservas</label>
                    <input
                      value={storeProfileCfg.phone || ''}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, phone: e.target.value })
                      }
                      placeholder="(61) 99999-9999"
                    />
                  </div>
                  <div>
                    <label>WhatsApp (com DDD)</label>
                    <input
                      value={storeProfileCfg.whatsapp || ''}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, whatsapp: e.target.value })
                      }
                      placeholder="5561999999999"
                    />
                  </div>
                  <div>
                    <label>Instagram</label>
                    <input
                      value={storeProfileCfg.instagram || ''}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, instagram: e.target.value })
                      }
                      placeholder="@seubar"
                    />
                  </div>
                </div>

                <label>Site / Linktree (opcional)</label>
                <input
                  value={storeProfileCfg.website || ''}
                  onChange={(e) =>
                    setStoreProfileCfg({ ...storeProfileCfg, website: e.target.value })
                  }
                  placeholder="https://seubar.com.br"
                />

                <LocationPicker
                  label="Localização exata da loja"
                  placeholder="Digite endereço, bairro ou use o GPS"
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

                <label>Complemento / Ponto de referência</label>
                <input
                  value={storeProfileCfg.address_details || ''}
                  onChange={(e) =>
                    setStoreProfileCfg({ ...storeProfileCfg, address_details: e.target.value })
                  }
                  placeholder="Ex: CLN 205 Bloco B Loja 12 · Entrada pela varanda"
                />

                <label>Estrutura & Diferenciais da casa</label>
                <div className="chips !flex-wrap !overflow-visible mt-1">
                  {STORE_AMENITIES.map((am) => {
                    const selected = (storeProfileCfg.amenities || []).includes(am);
                    return (
                      <span
                        key={am}
                        className={`chip ${selected ? 'on' : ''}`}
                        onClick={() => {
                          const cur = storeProfileCfg.amenities || [];
                          const next = selected ? cur.filter((x) => x !== am) : [...cur, am];
                          setStoreProfileCfg({ ...storeProfileCfg, amenities: next });
                        }}
                      >
                        {am}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Imagens, Banners e Galeria */}
              <div className="panel">
                <h2>🖼️ Logo, Banner Principal & Galeria de Banners</h2>
                <ImageUploader
                  label="Logo da loja (câmera ou galeria)"
                  value={logoUrl}
                  folder="logos"
                  onChange={setLogoUrl}
                  onToast={onToast}
                />

                <ImageUploader
                  label="Banner principal do topo do perfil e cardápio"
                  value={bannerUrl}
                  folder="banners"
                  onChange={setBannerUrl}
                  onToast={onToast}
                />

                <h3 className="mt-4">📸 Banners extras da loja (até 4 fotos do ambiente/drinks)</h3>
                <div className="space-y-2.5">
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const currentBanners = storeProfileCfg.extra_banners || [];
                    const val = currentBanners[slotIdx] || '';
                    return (
                      <div key={slotIdx} className="relative">
                        <ImageUploader
                          label={`Banner extra #${slotIdx + 1}`}
                          value={val}
                          folder="banners"
                          onChange={(url) => {
                            const next = [...currentBanners];
                            while (next.length <= slotIdx) next.push('');
                            next[slotIdx] = url;
                            setStoreProfileCfg({ ...storeProfileCfg, extra_banners: next });
                          }}
                          onToast={onToast}
                        />
                        {val && (
                          <button
                            type="button"
                            className="b d sm mt-1"
                            onClick={() => {
                              const next = [...currentBanners];
                              next[slotIdx] = '';
                              setStoreProfileCfg({ ...storeProfileCfg, extra_banners: next });
                            }}
                          >
                            Remover banner #{slotIdx + 1}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Design Visual Avançado do Perfil (mesmo nível do Cardápio!) */}
              <div className="panel">
                <h2>🎨 Design Visual do Perfil & Paleta</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label>Fonte do nome da loja ({NAME_FONTS.length} opções)</label>
                    <select value={font} onChange={(e) => setFont(e.target.value)}>
                      {NAME_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Textura / fundo do perfil</label>
                    <select
                      value={storeProfileCfg.bg_pattern || 'radial'}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, bg_pattern: e.target.value })
                      }
                    >
                      {BG_PATTERNS.map((bp) => (
                        <option key={bp.id} value={bp.id}>
                          {bp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Altura do banner</label>
                    <select
                      value={storeProfileCfg.banner_height || 'md'}
                      onChange={(e) =>
                        setStoreProfileCfg({
                          ...storeProfileCfg,
                          banner_height: e.target.value as StoreProfileConfig['banner_height'],
                        })
                      }
                    >
                      <option value="sm">Compacto</option>
                      <option value="md">Médio (Padrão)</option>
                      <option value="lg">Grande Destaque</option>
                    </select>
                  </div>
                  <div>
                    <label>Contraste sobre o banner</label>
                    <select
                      value={storeProfileCfg.banner_overlay || 'gradient'}
                      onChange={(e) =>
                        setStoreProfileCfg({
                          ...storeProfileCfg,
                          banner_overlay: e.target.value as StoreProfileConfig['banner_overlay'],
                        })
                      }
                    >
                      <option value="gradient">Degradê suave</option>
                      <option value="dark">Escuro elegante</option>
                      <option value="soft">Claro / Sutil</option>
                      <option value="none">Sem filtro</option>
                    </select>
                  </div>
                  <div>
                    <label>Formato da logo</label>
                    <select
                      value={storeProfileCfg.logo_shape || 'rounded'}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, logo_shape: e.target.value })
                      }
                    >
                      {LOGO_SHAPES.map((ls) => (
                        <option key={ls.id} value={ls.id}>
                          {ls.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Tamanho da logo</label>
                    <select
                      value={storeProfileCfg.logo_size || 'md'}
                      onChange={(e) =>
                        setStoreProfileCfg({
                          ...storeProfileCfg,
                          logo_size: e.target.value as StoreProfileConfig['logo_size'],
                        })
                      }
                    >
                      <option value="sm">Pequena</option>
                      <option value="md">Média</option>
                      <option value="lg">Grande</option>
                    </select>
                  </div>
                  <div>
                    <label>Estilo dos cartões</label>
                    <select
                      value={storeProfileCfg.card_style || 'glass'}
                      onChange={(e) =>
                        setStoreProfileCfg({
                          ...storeProfileCfg,
                          card_style: e.target.value as StoreProfileConfig['card_style'],
                        })
                      }
                    >
                      <option value="glass">Vidro translúcido</option>
                      <option value="bordered">Borda destaque</option>
                      <option value="elevated">Elevado c/ sombra</option>
                      <option value="neon">Brilho Neon</option>
                      <option value="minimal">Minimalista</option>
                    </select>
                  </div>
                  <div>
                    <label>Enfeite do topo</label>
                    <select
                      value={storeProfileCfg.top_ornament || 'classic-filigree'}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, top_ornament: e.target.value })
                      }
                    >
                      {TOP_ORNAMENTS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Moldura / detalhes laterais</label>
                    <select
                      value={storeProfileCfg.side_detail || 'thin-gold'}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, side_detail: e.target.value })
                      }
                    >
                      {SIDE_DETAILS.map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {sd.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Cor secundária de fundo</label>
                    <input
                      type="color"
                      value={storeProfileCfg.bg_color_2 || '#1b1626'}
                      onChange={(e) =>
                        setStoreProfileCfg({ ...storeProfileCfg, bg_color_2: e.target.value })
                      }
                    />
                  </div>
                </div>

                <h3 className="mt-4">Paleta de cores da loja</h3>
                <div className="row">
                  <div className="grow">
                    <label>Fundo</label>
                    <input type="color" value={colorBg} onChange={(e) => setColorBg(e.target.value)} />
                  </div>
                  <div className="grow">
                    <label>Superfície / Cards</label>
                    <input
                      type="color"
                      value={colorSurface}
                      onChange={(e) => setColorSurface(e.target.value)}
                    />
                  </div>
                  <div className="grow">
                    <label>Destaque</label>
                    <input
                      type="color"
                      value={colorAccent}
                      onChange={(e) => setColorAccent(e.target.value)}
                    />
                  </div>
                  <div className="grow">
                    <label>Preços / Pronto</label>
                    <input type="color" value={colorOk} onChange={(e) => setColorOk(e.target.value)} />
                  </div>
                  <div className="grow">
                    <label>Texto</label>
                    <input
                      type="color"
                      value={colorText}
                      onChange={(e) => setColorText(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="b full mt-4"
                  disabled={saving}
                  onClick={() => void handleSaveStoreVisual()}
                >
                  {saving ? 'Salvando...' : '💾 Salvar perfil e visual da loja'}
                </button>
              </div>
            </div>
          )}

          {/* ================= ABA 2: EDIÇÃO MODULAR DO CARDÁPIO ================= */}
          {studioTab === 'menu' && (
            <div>
              {/* Temas Prontos inspirados em cardápios profissionais */}
              <div className="panel">
                <div className="row sp">
                  <h2 className="!mt-0">✨ Estilos Prontos (1 clique)</h2>
                  <span className="tag">Combine à vontade depois</span>
                </div>
                <p className="mu">
                  Inspirados em Speakeasy, Boteco Vintage, Royal Gold, Sport Bar e Club Neon.
                </p>
                <div className="chips !flex-wrap !overflow-visible mt-2">
                  {MENU_STYLE_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="chip"
                      style={{
                        borderColor: tpl.color_accent,
                        background: tpl.color_surface,
                        color: tpl.color_text,
                      }}
                      onClick={() => applyQuickTemplate(tpl.id)}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bloco de Presets / Layouts Salvos */}
              <div className="panel">
                <div className="row sp">
                  <h2 className="!mt-0">Layouts Salvos (Predefinições do QR)</h2>
                  <button type="button" className="b sm" onClick={() => setCanvaOpen(true)}>
                    🖌️ Editar no Canva
                  </button>
                </div>
                <p className="mu">
                  Salve vários layouts (ex: Noite, Happy Hour, Carnaval). O QR Code é sempre o mesmo e
                  atualiza na hora nos celulares dos clientes!
                </p>

                <label>Escolher layout salvo</label>
                <div className="row">
                  <select
                    value={selectedPreset}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedPreset(id);
                      if (id) void handleApplyPreset(id);
                    }}
                    className="grow"
                  >
                    <option value="">— visual atual —</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.preset_name || 'Layout'}
                      </option>
                    ))}
                  </select>
                  {selectedPreset && (
                    <>
                      <button
                        type="button"
                        className="b g sm"
                        disabled={saving}
                        onClick={() => void handleUpdateSelectedPreset()}
                      >
                        Atualizar este
                      </button>
                      <button
                        type="button"
                        className="b g sm"
                        disabled={saving}
                        onClick={() => void handleDelPreset()}
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>

                <div className="row mt-2.5">
                  <input
                    className="grow"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Nome de novo layout (ex: Sexta Tropical)"
                  />
                  <button
                    type="button"
                    className="b sm"
                    disabled={saving}
                    onClick={() => void handleSaveNewPreset()}
                  >
                    + Salvar novo layout
                  </button>
                </div>
              </div>

              {/* 1. Plano de Fundo */}
              <div className="panel">
                <h2>1. Plano de Fundo & Textura</h2>
                <div className="row">
                  <div className="grow">
                    <label>Padrão do fundo</label>
                    <select
                      value={design.bg_pattern || 'radial'}
                      onChange={(e) => setDesign({ ...design, bg_pattern: e.target.value })}
                    >
                      {BG_PATTERNS.map((bp) => (
                        <option key={bp.id} value={bp.id}>
                          {bp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[100px]">
                    <label>Cor 1</label>
                    <input type="color" value={colorBg} onChange={(e) => setColorBg(e.target.value)} />
                  </div>
                  <div className="w-[100px]">
                    <label>Cor 2 / Luz</label>
                    <input
                      type="color"
                      value={design.bg_color_2 || '#1b1626'}
                      onChange={(e) => setDesign({ ...design, bg_color_2: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Logo, Posição, Borda & Brasão */}
              <div className="panel">
                <h2>2. Logo, Borda da Logo & Brasão</h2>
                <div className="row">
                  <div className="grow">
                    <label>Onde fica a logo</label>
                    <select value={logoPos} onChange={(e) => setLogoPos(e.target.value)}>
                      {POS_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Borda / Formato da logo</label>
                    <select
                      value={design.logo_shape || 'rounded'}
                      onChange={(e) => setDesign({ ...design, logo_shape: e.target.value })}
                    >
                      {LOGO_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Tamanho da logo</label>
                    <select
                      value={design.logo_size || 'md'}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo_size: e.target.value as MenuDesignConfig['logo_size'],
                        })
                      }
                    >
                      {LOGO_SIZES.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="grow">
                    <label>Fonte do nome</label>
                    <select value={font} onChange={(e) => setFont(e.target.value)}>
                      {NAME_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Alinhamento do nome</label>
                    <select value={namePos} onChange={(e) => setNamePos(e.target.value)}>
                      {POS_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="grow">
                    <label>Base do emblema</label>
                    <select value={crestBase} onChange={(e) => setCrestBase(e.target.value)}>
                      {CREST_BASES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Ícone do emblema</label>
                    <select value={crestIcon} onChange={(e) => setCrestIcon(e.target.value)}>
                      {CREST_ICONS.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.emoji} {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Ornamento</label>
                    <select value={crestOrn} onChange={(e) => setCrestOrn(e.target.value)}>
                      {CREST_ORNAMENTS.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.emoji ? `${x.emoji} ` : ''}
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label>Borda da moldura do cabeçalho</label>
                <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
                  {BORDER_STYLES.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Enfeites de Topo, Rodapé e Detalhes Laterais */}
              <div className="panel">
                <h2>3. Enfeites do Topo, Rodapé & Laterais</h2>
                <div className="row">
                  <div className="grow">
                    <label>Enfeite do topo</label>
                    <select
                      value={design.top_ornament || 'none'}
                      onChange={(e) => setDesign({ ...design, top_ornament: e.target.value })}
                    >
                      {TOP_ORNAMENTS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Detalhes laterais (bordas)</label>
                    <select
                      value={design.side_detail || 'none'}
                      onChange={(e) => setDesign({ ...design, side_detail: e.target.value })}
                    >
                      {SIDE_DETAILS.map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {sd.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="grow">
                    <label>Enfeite do rodapé</label>
                    <select
                      value={design.footer_ornament || 'none'}
                      onChange={(e) => setDesign({ ...design, footer_ornament: e.target.value })}
                    >
                      {FOOTER_ORNAMENTS.map((fo) => (
                        <option key={fo.id} value={fo.id}>
                          {fo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Texto do rodapé</label>
                    <input
                      value={design.footer_text || ''}
                      onChange={(e) => setDesign({ ...design, footer_text: e.target.value })}
                      placeholder="Ex: Feito na hora · Peça pelo celular"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Drinks, Preços, Faixas e Paleta */}
              <div className="panel">
                <h2>4. Área de Drinks (só no cardápio) & Cores</h2>
                <p className="mu">
                  Muda apenas o cardápio do cliente (todos com imagem). Não altera a aba Receitas do app.
                </p>

                <div className="row">
                  <div className="grow">
                    <label>Formato dos drinks (sempre c/ imagem)</label>
                    <select value={mode} onChange={(e) => setMode(e.target.value)}>
                      {DISPLAY_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Estilo dos cartões</label>
                    <select
                      value={design.card_style || 'glass'}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          card_style: e.target.value as MenuDesignConfig['card_style'],
                        })
                      }
                    >
                      {CARD_STYLES.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="grow">
                    <label>Estilo da etiqueta de preço</label>
                    <select
                      value={design.price_style || 'clean'}
                      onChange={(e) => setDesign({ ...design, price_style: e.target.value })}
                    >
                      {PRICE_STYLES.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grow">
                    <label>Títulos das seções (modo categorias)</label>
                    <select
                      value={design.section_style || 'clean'}
                      onChange={(e) => setDesign({ ...design, section_style: e.target.value })}
                    >
                      {SECTION_STYLES.map((ss) => (
                        <option key={ss.id} value={ss.id}>
                          {ss.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="grow">
                    <label>Cards</label>
                    <input
                      type="color"
                      value={colorSurface}
                      onChange={(e) => setColorSurface(e.target.value)}
                    />
                  </div>
                  <div className="grow">
                    <label>Dourado / Detalhes</label>
                    <input
                      type="color"
                      value={colorAccent}
                      onChange={(e) => setColorAccent(e.target.value)}
                    />
                  </div>
                  <div className="grow">
                    <label>Preços</label>
                    <input type="color" value={colorOk} onChange={(e) => setColorOk(e.target.value)} />
                  </div>
                  <div className="grow">
                    <label>Textos</label>
                    <input
                      type="color"
                      value={colorText}
                      onChange={(e) => setColorText(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row mt-4">
                  <button
                    type="button"
                    className="b grow"
                    disabled={saving}
                    onClick={() => void handleSaveCardapio()}
                  >
                    {saving ? 'Salvando...' : 'Salvar e atualizar nos clientes'}
                  </button>
                  <button
                    type="button"
                    className="b g"
                    onClick={() => setCanvaOpen(true)}
                  >
                    🖌️ Modo Canva
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 3: PROMOÇÕES ================= */}
          {studioTab === 'promos' && (
            <div>
              <div className="panel">
                <h2>{editingPromoId ? 'Editar promoção' : 'Criar nova promoção'}</h2>
                <p className="mu">
                  Crie quantas promoções quiser e escolha qual fica ativa no cardápio e no QR Code.
                </p>

                <label>Título da promoção *</label>
                <input
                  value={promoTitle}
                  onChange={(e) => setPromoTitle(e.target.value)}
                  placeholder="Ex: Happy Hour da Casa · 20% OFF"
                />

                <label>Subtítulo / Regra</label>
                <input
                  value={promoSubtitle}
                  onChange={(e) => setPromoSubtitle(e.target.value)}
                  placeholder="Ex: Válido hoje até as 21h"
                />

                <div className="row">
                  <div className="grow">
                    <label>Tipo de promoção</label>
                    <select
                      value={promoType}
                      onChange={(e) => setPromoType(e.target.value as 'discount_pct' | 'banner')}
                    >
                      <option value="discount_pct">Desconto (%) automático nos preços</option>
                      <option value="banner">Banner / Combo destaque (sem mudar preço)</option>
                    </select>
                  </div>
                  {promoType === 'discount_pct' && (
                    <div className="w-[120px]">
                      <label>% de desconto</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="row">
                  {promoType === 'discount_pct' && (
                    <div className="grow">
                      <label>Aplicar em qual categoria?</label>
                      <select value={promoCat} onChange={(e) => setPromoCat(e.target.value)}>
                        <option value="Todas">Todas as categorias</option>
                        {CATS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grow">
                    <label>Selo / Etiqueta</label>
                    <input
                      value={promoBadge}
                      onChange={(e) => setPromoBadge(e.target.value)}
                      placeholder="Ex: HAPPY HOUR"
                      maxLength={18}
                    />
                  </div>
                  <div className="w-[90px]">
                    <label>Cor</label>
                    <input
                      type="color"
                      value={promoColor}
                      onChange={(e) => setPromoColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="chips !overflow-visible !flex-wrap mt-1">
                  {DEFAULT_PROMO_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-7 h-7 rounded-full border-2 cursor-pointer"
                      style={{
                        background: c,
                        borderColor: promoColor === c ? '#ffffff' : 'transparent',
                      }}
                      onClick={() => setPromoColor(c)}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>

                <div className="row mt-3.5">
                  <button
                    type="button"
                    className="b grow"
                    disabled={saving}
                    onClick={() => void handleSavePromo()}
                  >
                    {editingPromoId ? 'Salvar edição' : '+ Criar e ativar promoção'}
                  </button>
                  {editingPromoId && (
                    <button type="button" className="b g" onClick={resetPromoForm}>
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="row sp">
                  <h2 className="!mt-0">Minhas Promoções ({promotions.length})</h2>
                  {activePromoId && (
                    <button
                      type="button"
                      className="b g sm"
                      onClick={() => void handleToggleActivePromo(null)}
                    >
                      Desativar promoção ativa
                    </button>
                  )}
                </div>

                <div className="list mt-3">
                  {promotions.length > 0 ? (
                    promotions.map((pr) => {
                      const isActive = activePromoId === pr.id;
                      return (
                        <div key={pr.id} className="!items-start flex-wrap">
                          <div className="flex-1 min-w-[180px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <b>{pr.title}</b>
                              {pr.badge && (
                                <span
                                  className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                                  style={{
                                    background: pr.accent_color || '#e5a93c',
                                    color: '#141218',
                                  }}
                                >
                                  {pr.badge}
                                </span>
                              )}
                              {isActive && <span className="chip st1">Ativa no cardápio</span>}
                            </div>
                            {pr.subtitle && <div className="mu mt-0.5">{pr.subtitle}</div>}
                            <span className="tag">
                              {pr.type === 'discount_pct'
                                ? `${pr.discount_pct}% OFF · ${pr.target_category || 'Todas'}`
                                : 'Banner destaque'}
                            </span>
                          </div>

                          <div className="row">
                            <button
                              type="button"
                              className={`b sm ${isActive ? 'g' : 'ok'}`}
                              onClick={() => void handleToggleActivePromo(isActive ? null : pr.id)}
                            >
                              {isActive ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => {
                                setEditingPromoId(pr.id);
                                setPromoTitle(pr.title);
                                setPromoSubtitle(pr.subtitle || '');
                                setPromoBadge(pr.badge || '');
                                setPromoType(pr.type);
                                setPromoDiscount(String(pr.discount_pct || 15));
                                setPromoCat(pr.target_category || 'Todas');
                                setPromoColor(pr.accent_color || '#e5a93c');
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="b g sm"
                              onClick={() => void handleDeletePromo(pr.id)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="mu">Nenhuma promoção criada ainda.</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* ================= ABA 4: ARTE DO QR CODE ================= */}
          {studioTab === 'qr' && (
            <QrDesignerPanel
              bar={liveBar}
              design={qrDesign}
              savedDesigns={qrDesigns}
              activeDesignId={activeQrDesignId}
              onChangeDesign={setQrDesign}
              onSelectSaved={async (d) => {
                setQrDesign(d);
                setActiveQrDesignId(d.id);
                await persistStudioUpdate(
                  { active_qr_design: d.id },
                  `Design de QR "${d.design_name}" ativado!`
                );
              }}
              onSaveAsNew={handleSaveNewQrDesign}
              onUpdateCurrent={handleUpdateCurrentQrDesign}
              onDeleteSaved={handleDeleteQrDesign}
              saving={saving}
            />
          )}
        </div>

        {/* Coluna Direita Fixa (Desktop) / Painel Visível (Mobile): Prévia em Tempo Real */}
        {previewOpen && (
          <div className="lg:sticky lg:top-[76px]">
            <div className="panel">
              <div className="row sp mb-2.5">
                <div>
                  <h2 className="!m-0">
                    {studioTab === 'store'
                      ? 'Prévia do Perfil da Loja'
                      : studioTab === 'qr'
                        ? 'Prévia da Placa QR Code'
                        : 'Prévia do Cardápio'}
                  </h2>
                  <span className="tag">
                    {studioTab === 'store'
                      ? 'Assim aparece em Bares próximos'
                      : studioTab === 'qr'
                        ? 'Pronta para imprimir ou enviar'
                        : realClientDrinks.length > 0
                          ? `${realClientDrinks.length} item(ns) ativos no cardápio`
                          : 'Modo exemplo (adicione estoque + preço)'}
                  </span>
                </div>
                <button
                  type="button"
                  className="b sm"
                  disabled={saving}
                  onClick={() =>
                    void (studioTab === 'store'
                      ? handleSaveStoreVisual()
                      : studioTab === 'qr'
                        ? handleUpdateCurrentQrDesign()
                        : handleSaveCardapio())
                  }
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>

              {studioTab === 'store' ? (
                <StoreProfileRenderer bar={liveBar} profileConfig={storeProfileCfg} compact />
              ) : studioTab === 'qr' ? (
                <div>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="text-xs text-[var(--mut)]">Testar mesa:</span>
                    <input
                      value={previewQrTable}
                      onChange={(e) => setPreviewQrTable(e.target.value)}
                      placeholder="Vazio = Cardápio geral"
                      className="!py-1 !text-xs flex-1"
                    />
                  </div>
                  <QrPosterPreview
                    bar={liveBar}
                    design={qrDesign}
                    qrUrl={menuUrl(bar.id, previewQrTable)}
                    tableLabel={previewQrTable}
                  />
                </div>
              ) : (
                renderLiveMenuPreview(false)
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODO CANVA INTERATIVO (TEMPO REAL + ARRASTAR) ================= */}
      {canvaOpen && (
        <div className="canvas-modal">
          <div className="canvas-bar">
            <div className="row">
              <button type="button" className="b g sm" onClick={() => setCanvaOpen(false)}>
                ← Fechar Canva
              </button>
              <b className="text-sm">Modo Canva · Arraste os blocos ou a logo</b>
            </div>
            <button
              type="button"
              className="b ok sm"
              disabled={saving}
              onClick={async () => {
                await handleSaveCardapio();
                setCanvaOpen(false);
              }}
            >
              {saving ? 'Salvando...' : 'Salvar e aplicar'}
            </button>
          </div>

          <div className="canvas-body">
            <div className="canvas-viewport">
              <div className="canvas-phone-stage">{renderLiveMenuPreview(true)}</div>
            </div>

            {/* Painel rápido contextual do bloco selecionado */}
            <div className="canvas-inspector">
              <div className="row sp mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--ac)]">
                  Editando: {MENU_BLOCK_LABELS[selectedBlock]}
                </span>
                <button
                  type="button"
                  className="lnk !p-0 text-xs"
                  onClick={() =>
                    setDesign((prev) => ({
                      ...prev,
                      logo_offset_x: 0,
                      logo_offset_y: 0,
                      block_order: ['header', 'promo', 'filters', 'drinks', 'footer'],
                    }))
                  }
                >
                  Resetar posições
                </button>
              </div>

              {selectedBlock === 'header' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="!mt-0">Fonte do nome</label>
                    <select value={font} onChange={(e) => setFont(e.target.value)}>
                      {NAME_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Alinhamento nome</label>
                    <select value={namePos} onChange={(e) => setNamePos(e.target.value)}>
                      {POS_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Moldura cabeçalho</label>
                    <select value={borderStyle} onChange={(e) => setBorderStyle(e.target.value)}>
                      {BORDER_STYLES.map((br) => (
                        <option key={br.id} value={br.id}>
                          {br.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Posição da logo</label>
                    <select value={logoPos} onChange={(e) => setLogoPos(e.target.value)}>
                      {POS_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Borda da logo</label>
                    <select
                      value={design.logo_shape || 'rounded'}
                      onChange={(e) => setDesign({ ...design, logo_shape: e.target.value })}
                    >
                      {LOGO_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Tamanho logo</label>
                    <select
                      value={design.logo_size || 'md'}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo_size: e.target.value as MenuDesignConfig['logo_size'],
                        })
                      }
                    >
                      {LOGO_SIZES.map((sz) => (
                        <option key={sz.id} value={sz.id}>
                          {sz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Base do emblema</label>
                    <select value={crestBase} onChange={(e) => setCrestBase(e.target.value)}>
                      {CREST_BASES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Ícone do emblema</label>
                    <select value={crestIcon} onChange={(e) => setCrestIcon(e.target.value)}>
                      {CREST_ICONS.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.emoji} {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Ornamento emblema</label>
                    <select value={crestOrn} onChange={(e) => setCrestOrn(e.target.value)}>
                      {CREST_ORNAMENTS.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.emoji ? `${x.emoji} ` : ''}
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Enfeite do topo</label>
                    <select
                      value={design.top_ornament || 'none'}
                      onChange={(e) => setDesign({ ...design, top_ornament: e.target.value })}
                    >
                      {TOP_ORNAMENTS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Detalhes laterais</label>
                    <select
                      value={design.side_detail || 'none'}
                      onChange={(e) => setDesign({ ...design, side_detail: e.target.value })}
                    >
                      {SIDE_DETAILS.map((sd) => (
                        <option key={sd.id} value={sd.id}>
                          {sd.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Fundo</label>
                    <select
                      value={design.bg_pattern || 'radial'}
                      onChange={(e) => setDesign({ ...design, bg_pattern: e.target.value })}
                    >
                      {BG_PATTERNS.map((bp) => (
                        <option key={bp.id} value={bp.id}>
                          {bp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedBlock === 'promo' && (
                <div className="row">
                  <div className="grow">
                    <label className="!mt-0">Promoção ativa</label>
                    <select
                      value={activePromoId || ''}
                      onChange={(e) => setActivePromoId(e.target.value || null)}
                    >
                      <option value="">Sem promoção ativa</option>
                      {promotions.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="b g sm self-end"
                    onClick={() => {
                      setCanvaOpen(false);
                      setStudioTab('promos');
                    }}
                  >
                    Gerenciar promoções
                  </button>
                </div>
              )}

              {(selectedBlock === 'drinks' || selectedBlock === 'filters') && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="!mt-0">Formato dos drinks</label>
                    <select value={mode} onChange={(e) => setMode(e.target.value)}>
                      {DISPLAY_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Estilo dos cartões</label>
                    <select
                      value={design.card_style || 'glass'}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          card_style: e.target.value as MenuDesignConfig['card_style'],
                        })
                      }
                    >
                      {CARD_STYLES.map((cs) => (
                        <option key={cs.id} value={cs.id}>
                          {cs.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Etiqueta de preço</label>
                    <select
                      value={design.price_style || 'clean'}
                      onChange={(e) => setDesign({ ...design, price_style: e.target.value })}
                    >
                      {PRICE_STYLES.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Seções</label>
                    <select
                      value={design.section_style || 'clean'}
                      onChange={(e) => setDesign({ ...design, section_style: e.target.value })}
                    >
                      {SECTION_STYLES.map((ss) => (
                        <option key={ss.id} value={ss.id}>
                          {ss.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedBlock === 'footer' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="!mt-0">Enfeite do rodapé</label>
                    <select
                      value={design.footer_ornament || 'none'}
                      onChange={(e) => setDesign({ ...design, footer_ornament: e.target.value })}
                    >
                      {FOOTER_ORNAMENTS.map((fo) => (
                        <option key={fo.id} value={fo.id}>
                          {fo.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="!mt-0">Texto do rodapé</label>
                    <input
                      value={design.footer_text || ''}
                      onChange={(e) => setDesign({ ...design, footer_text: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
