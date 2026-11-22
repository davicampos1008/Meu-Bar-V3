import { createClient } from '@supabase/supabase-js';
import type { Bar } from '../types/meubar';
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

export function compressImageFile(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const maxSide = 960;
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w >= h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            resolve(blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file);
          },
          'image/jpeg',
          0.78
        );
      };
      img.onerror = () => resolve(file);
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(
  file: File,
  folder: string,
  userId?: string
): Promise<{ url?: string; error?: string }> {
  const check = validateImageUpload(file);
  if (!check.ok) {
    return { error: check.error };
  }
  if (isSimDbActive()) {
    return { url: registerSimBlobUrl(file) };
  }
  const prepared = await compressImageFile(file);
  const ext =
    prepared.type === 'image/jpeg'
      ? 'jpg'
      : prepared.type === 'image/png'
      ? 'png'
      : prepared.type === 'image/webp'
      ? 'webp'
      : 'jpg';
  const safeUser = sanitizeStorageSegment(userId || 'anon', 'anon');
  const safeFolder = sanitizeStorageSegment(folder, 'media');
  const path = `${safeUser}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const up = await sb.storage.from(MEDIA_BUCKET).upload(path, prepared, {
    upsert: true,
    contentType: prepared.type || 'image/jpeg',
  });
  if (up.error) {
    return { error: up.error.message };
  }
  const pub = sb.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { url: pub.data?.publicUrl || '' };
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
