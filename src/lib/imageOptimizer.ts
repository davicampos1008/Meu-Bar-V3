export type ImagePreset = 'recipe' | 'banner' | 'logo' | 'avatar' | 'general';

interface PresetSpec {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  minQuality: number;
  maxTargetBytes: number;
}

const PRESET_SPECS: Record<ImagePreset, PresetSpec> = {
  recipe: {
    maxWidth: 960,
    maxHeight: 960,
    quality: 0.84,
    minQuality: 0.7,
    maxTargetBytes: 135 * 1024,
  },
  banner: {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 0.84,
    minQuality: 0.7,
    maxTargetBytes: 185 * 1024,
  },
  logo: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.86,
    minQuality: 0.72,
    maxTargetBytes: 90 * 1024,
  },
  avatar: {
    maxWidth: 480,
    maxHeight: 480,
    quality: 0.84,
    minQuality: 0.7,
    maxTargetBytes: 75 * 1024,
  },
  general: {
    maxWidth: 960,
    maxHeight: 960,
    quality: 0.82,
    minQuality: 0.68,
    maxTargetBytes: 140 * 1024,
  },
};

export function inferImagePresetFromFolder(folder?: string): ImagePreset {
  const f = String(folder || '').toLowerCase();
  if (f.includes('logo')) return 'logo';
  if (f.includes('banner') || f.includes('partner')) return 'banner';
  if (f.includes('avatar') || f.includes('profile')) return 'avatar';
  if (f.includes('recipe') || f.includes('catalog') || f.includes('drink')) return 'recipe';
  return 'general';
}

function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    } catch {
      resolve(null);
    }
  });
}

async function decodeImageSource(
  blob: Blob
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        cleanup: () => {
          try {
            bitmap.close();
          } catch {
            // ignore
          }
        },
      };
    } catch {
      // Fallback para HTMLImageElement abaixo
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
      el.src = objectUrl;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

/**
 * Padroniza qualquer imagem (galeria, câmera ou web) para WebP leve de alta nitidez
 * (com fallback automático para JPEG apenas se o navegador não suportar WebP).
 */
export async function optimizeImageFile(
  file: File,
  preset: ImagePreset = 'general'
): Promise<File> {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) {
    return file;
  }

  const spec = PRESET_SPECS[preset] || PRESET_SPECS.general;
  let decoded: Awaited<ReturnType<typeof decodeImageSource>> | null = null;

  try {
    decoded = await decodeImageSource(file);
    const srcW = decoded.width;
    const srcH = decoded.height;
    if (!srcW || !srcH) return file;

    const scale = Math.min(1, spec.maxWidth / srcW, spec.maxHeight / srcH);
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    decoded.draw(ctx, targetW, targetH);

    // Tenta WebP primeiro (menor uso de memória preservando nitidez e transparência)
    let preferredMime: 'image/webp' | 'image/jpeg' = 'image/webp';
    let bestBlob = await encodeCanvasBlob(canvas, 'image/webp', spec.quality);

    if (!bestBlob || bestBlob.type !== 'image/webp') {
      preferredMime = 'image/jpeg';
      bestBlob = await encodeCanvasBlob(canvas, 'image/jpeg', spec.quality);
    }

    if (!bestBlob) return file;

    // Ajuste fino suave apenas se passar do alvo de memória, sem sacrificar qualidade visual
    let q = spec.quality;
    while (bestBlob.size > spec.maxTargetBytes && q - 0.06 >= spec.minQuality) {
      q = Number((q - 0.06).toFixed(2));
      const next = await encodeCanvasBlob(canvas, preferredMime, q);
      if (!next || next.size >= bestBlob.size) break;
      bestBlob = next;
    }

    const baseName = (file.name || 'imagem').replace(/\.[a-z0-9]+$/i, '') || 'imagem';
    const ext = preferredMime === 'image/webp' ? 'webp' : 'jpg';
    return new File([bestBlob], `${baseName}.${ext}`, {
      type: preferredMime,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    decoded?.cleanup();
  }
}
