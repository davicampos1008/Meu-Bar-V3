import { createClient } from '@supabase/supabase-js';
import type { Bar, Recipe } from '../types/meubar';
import {
  inferImagePresetFromFolder,
  optimizeImageFile,
  type ImagePreset,
} from './imageOptimizer';
import {
  sanitizeStorageSegment,
  validateImageUpload,
  validatePdfUpload,
} from './security';

import {
  isSimDbActive,
  notifySimDbChange,
  registerSimBlobUrl,
  simChannel,
  simFrom,
  simRpc,
} from './simDb';

const FALLBACK_URL = 'https://ikyxhwyqbknwjugwdlfp.supabase.co';
const FALLBACK_KEY = 'sb_publishable_bs4eqPwTL4LEMi2ZiB-ROA_eTVoX1ll';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;
export const MEDIA_BUCKET = 'bar-media';
export const RECIPE_BUCKET = 'recipes';

export const realSb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const sb = new Proxy(realSb, {
  get(target, prop, receiver) {
    if (isSimDbActive()) {
      if (prop === 'from') return simFrom;
      if (prop === 'rpc') return simRpc;
      if (prop === 'channel') return simChannel;
      if (prop === 'removeChannel') return () => Promise.resolve('ok');
    }
    const val = Reflect.get(target, prop, receiver);
    return typeof val === 'function' ? val.bind(target) : val;
  },
});

export async function writeBarSafe(
  mode: 'insert' | 'update',
  payload: Record<string, unknown>,
  barId?: string
): Promise<{ data: Bar | null; error: { message: string; code?: string } | null }> {
  const data: Record<string, unknown> = { ...payload };
  const optionalKeys = [
    'tiers',
    'handle',
    'city',
    'lat',
    'lon',
    'logo_url',
    'banner_url',
    'slogan',
    'name_font',
    'crest_border',
    'crest_base',
    'crest_icon',
    'crest_ornament',
    'logo_pos',
    'name_pos',
    'menu_display_mode',
    'menu_presets',
    'active_menu_preset',
    'menu_design',
    'menu_promotions',
    'active_promotion_id',
    'store_profile_data',
    'store_profiles',
    'active_store_profile',
    'qr_designs',
    'active_qr_design',
    'phone',
    'instagram',
    'opening_hours',
    'about',
    'color_bg',
    'color_surface',
    'color_accent',
    'color_ok',
    'color_text',
    'base_cost',
    'table_names',
    'ops_data',
    'plan_tier',
    'plan_expires_at',
    'trial_ends_at',
    'plan_note',
    'shakers',
  ];

  for (let attempt = 0; attempt < 36; attempt++) {
    const res =
      mode === 'insert'
        ? await sb.from('bars').insert(data).select().single()
        : await sb.from('bars').update(data).eq('id', barId).select().single();

    if (!res.error) return { data: res.data as Bar, error: null };

    const msg = String(res.error.message || '');
    if (msg.includes('bars_kind_check') && data.kind === 'bar') {
      data.kind = 'counter';
      continue;
    }

    if (
      msg.includes('invalid input syntax') ||
      msg.includes('malformed array literal') ||
      msg.includes('cannot cast')
    ) {
      if ('tiers' in data) {
        delete data.tiers;
        continue;
      }
      if ('shakers' in data && Array.isArray(data.shakers)) {
        data.shakers = data.shakers.length || 2;
        continue;
      }
      if ('shakers' in data) {
        delete data.shakers;
        continue;
      }
    }

    let removed = false;
    for (const k of optionalKeys) {
      if (k in data && msg.includes(k)) {
        delete data[k];
        removed = true;
        break;
      }
    }
    if (!removed) return { data: null, error: res.error };
  }

  const fallbackRes =
    mode === 'insert'
      ? await sb.from('bars').insert({ name: payload.name, kind: payload.kind, owner: payload.owner }).select().single()
      : await sb.from('bars').update({ name: payload.name }).eq('id', barId).select().single();

  return { data: (fallbackRes.data as Bar) || null, error: fallbackRes.error };
}

export async function broadcastMenuUpdate(barId: string, updatedBar?: Partial<Bar> | null): Promise<void> {
  if (isSimDbActive()) {
    notifySimDbChange();
    return;
  }
  try {
    const ch = sb.channel('menu-live-' + barId);
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 800);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          void ch
            .send({
              type: 'broadcast',
              event: 'menu-updated',
              payload: { bar: updatedBar || null, ts: Date.now() },
            })
            .finally(() => {
              setTimeout(() => void sb.removeChannel(ch), 300);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore broadcast issues
  }
}

export function compressImageFile(
  file: File,
  preset: ImagePreset = 'general'
): Promise<File> {
  return optimizeImageFile(file, preset);
}

export interface UploadMediaOptions {
  preset?: ImagePreset;
  entityId?: string;
  bucket?: 'recipes' | 'bar-media';
}

function appendCacheVersion(publicUrl: string): string {
  if (!publicUrl) return '';
  const sep = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${sep}v=${Date.now()}`;
}

export async function uploadMediaFile(
  file: File,
  folder: string,
  userId?: string,
  options?: UploadMediaOptions
): Promise<{ url?: string; error?: string }> {
  const check = validateImageUpload(file);
  if (!check.ok) {
    return { error: check.error };
  }

  const preset = options?.preset || inferImagePresetFromFolder(folder);
  const prepared = await optimizeImageFile(file, preset);

  if (isSimDbActive()) {
    return { url: registerSimBlobUrl(prepared) };
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    try {
      const { data } = await realSb.auth.getSession();
      resolvedUserId = data.session?.user?.id || undefined;
    } catch {
      // ignore
    }
  }

  const ext =
    prepared.type === 'image/webp'
      ? 'webp'
      : prepared.type === 'image/png'
        ? 'png'
        : 'jpg';
  const safeUser = sanitizeStorageSegment(resolvedUserId || 'anon', 'anon');
  const safeFolder = sanitizeStorageSegment(folder, 'media');
  const safeEntity = options?.entityId
    ? sanitizeStorageSegment(options.entityId, '')
    : '';
  const uniqueName = safeEntity
    ? `${safeEntity}.${ext}`
    : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const targetBucket =
    options?.bucket || (safeFolder === 'recipes' && safeEntity ? RECIPE_BUCKET : MEDIA_BUCKET);

  const primaryPath =
    targetBucket === RECIPE_BUCKET && safeEntity
      ? `catalog/${uniqueName}`
      : `${safeUser}/${safeFolder}/${uniqueName}`;

  const up = await sb.storage.from(targetBucket).upload(primaryPath, prepared, {
    upsert: true,
    cacheControl: '3600',
    contentType: prepared.type || 'image/webp',
  });

  if (!up.error) {
    const pub = sb.storage.from(targetBucket).getPublicUrl(primaryPath);
    return { url: appendCacheVersion(pub.data?.publicUrl || '') };
  }

  // Fallback seguro para pasta própria em bar-media caso políticas antigas do bucket 'recipes' ainda estejam ativas
  if (targetBucket === RECIPE_BUCKET) {
    const fallbackPath = `${safeUser}/recipes/${uniqueName}`;
    const fallbackUp = await sb.storage.from(MEDIA_BUCKET).upload(fallbackPath, prepared, {
      upsert: true,
      cacheControl: '3600',
      contentType: prepared.type || 'image/webp',
    });
    if (!fallbackUp.error) {
      const pub = sb.storage.from(MEDIA_BUCKET).getPublicUrl(fallbackPath);
      return { url: appendCacheVersion(pub.data?.publicUrl || '') };
    }
    return { error: fallbackUp.error.message || up.error.message };
  }

  return { error: up.error.message };
}

export async function broadcastGlobalRecipeUpdate(recipe: Recipe): Promise<void> {
  if (isSimDbActive()) {
    notifySimDbChange();
    return;
  }
  try {
    const ch = realSb.channel('global-recipes-sync');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 750);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          void ch
            .send({
              type: 'broadcast',
              event: 'recipe-updated',
              payload: { recipe, ts: Date.now() },
            })
            .finally(() => {
              setTimeout(() => void realSb.removeChannel(ch), 250);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore broadcast issues
  }
}

export async function saveRecipeImageGlobally(
  recipe: Recipe,
  imageUrl: string | null
): Promise<{ ok: true; recipe: Recipe } | { ok: false; error: string }> {
  const cleanUrl = imageUrl ? imageUrl.trim() || null : null;
  const upRec = await sb
    .from('recipes')
    .update({ image_url: cleanUrl })
    .eq('id', recipe.id)
    .select()
    .single();

  if (upRec.error || !upRec.data) {
    const msg = String(upRec.error?.message || 'Não foi possível salvar a foto no catálogo.');
    return {
      ok: false,
      error:
        msg.includes('policy') || msg.includes('permission')
          ? 'Sem permissão no banco para editar foto global. Peça acesso ao Administrador.'
          : msg,
    };
  }

  const saved = upRec.data as Recipe;
  if (saved.is_public !== false && (!saved.item_type || saved.item_type === 'drink')) {
    try {
      await sb
        .from('recipes')
        .update({ image_url: cleanUrl })
        .eq('is_public', true)
        .eq('name', saved.name)
        .neq('id', saved.id);
    } catch {
      // ignore optional sibling sync errors
    }
  }
  void broadcastGlobalRecipeUpdate(saved);
  return { ok: true, recipe: saved };
}

export async function uploadAndSaveRecipePhoto(
  recipe: Recipe,
  file: File,
  userId?: string
): Promise<{ ok: true; recipe: Recipe; url: string } | { ok: false; error: string }> {
  const up = await uploadMediaFile(file, 'recipes', userId, {
    preset: 'recipe',
    bucket: RECIPE_BUCKET,
    entityId: `drink-${recipe.id}`,
  });
  if (up.error || !up.url) {
    return { ok: false, error: up.error || 'Erro ao enviar foto do drink.' };
  }

  const saved = await saveRecipeImageGlobally(recipe, up.url);
  if (!saved.ok) {
    return saved;
  }
  return { ok: true, recipe: saved.recipe, url: up.url };
}

export async function uploadPdfFile(
  file: File,
  folder: string,
  userId?: string
): Promise<{ url?: string; error?: string }> {
  const check = await validatePdfUpload(file);
  if (!check.ok) {
    return { error: check.error };
  }
  if (isSimDbActive()) {
    return { url: registerSimBlobUrl(file) };
  }
  const safeUser = sanitizeStorageSegment(userId || 'anon', 'anon');
  const safeFolder = sanitizeStorageSegment(folder, 'docs');
  const path = `${safeUser}/${safeFolder}/${Date.now()}-curriculo.pdf`;
  const up = await sb.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (up.error) {
    return { error: up.error.message };
  }
  const pub = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: pub.data?.publicUrl || '' };
}
