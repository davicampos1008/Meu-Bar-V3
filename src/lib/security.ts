/* ============================================================
 * CAMADA DE SEGURANÇA DO MEU BAR
 * Validação de URLs, uploads, senhas, sanitização e anti-spam
 * ============================================================ */

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Garante que uma URL externa usa apenas http: ou https:,
 * bloqueando javascript:, data:, vbscript: e caracteres de controle.
 */
export function safeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!trimmed) return null;

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : trimmed.includes('.')
      ? `https://${trimmed}`
      : '';

  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Remove traversal e caracteres inseguros de segmentos de pasta no Storage.
 */
export function sanitizeStorageSegment(segment: string, fallback = 'misc'): string {
  const clean = String(segment || '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40);
  return clean || fallback;
}

/**
 * Valida arquivos de imagem antes do upload (bloqueia SVG/HTML e arquivos gigantes).
 */
export function validateImageUpload(file: File): { ok: true } | { ok: false; error: string } {
  if (!file) return { ok: false, error: 'Nenhum arquivo selecionado.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: 'A imagem excede o limite máximo de 6 MB.' };
  }
  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(mime)) {
    return {
      ok: false,
      error: 'Formato não permitido. Envie apenas imagens JPG, PNG ou WebP.',
    };
  }
  return { ok: true };
}

/**
 * Valida PDF verificando extensão, MIME, tamanho e cabeçalho mágico (%PDF-).
 */
export async function validatePdfUpload(
  file: File
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!file) return { ok: false, error: 'Nenhum arquivo selecionado.' };
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, error: 'O PDF excede o limite máximo de 5 MB.' };
  }
  const lowerName = (file.name || '').toLowerCase();
  if (file.type !== 'application/pdf' || !lowerName.endsWith('.pdf')) {
    return { ok: false, error: 'Envie apenas arquivos no formato PDF válido (.pdf).' };
  }
  try {
    const headerBuf = await file.slice(0, 5).arrayBuffer();
    const headerStr = new TextDecoder('ascii').decode(headerBuf);
    if (!headerStr.startsWith('%PDF-')) {
      return { ok: false, error: 'O arquivo enviado não é um documento PDF autêntico.' };
    }
  } catch {
    return { ok: false, error: 'Não foi possível verificar o conteúdo do PDF.' };
  }
  return { ok: true };
}

/**
 * Avalia força da senha para criação de conta segura.
 */
export function evaluatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
  validForSignup: boolean;
  hint: string;
} {
  const pw = String(password || '');
  if (!pw) {
    return { score: 0, label: 'Vazia', validForSignup: false, hint: 'Mínimo 8 caracteres com letras e números.' };
  }
  const hasMinLen = pw.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbolOrUpper = /[A-Z]/.test(pw) && /[^a-zA-Z0-9]/.test(pw);

  if (!hasMinLen || !hasLetter || !hasDigit) {
    return {
      score: 1,
      label: 'Fraca',
      validForSignup: false,
      hint: 'Use pelo menos 8 caracteres combinando letras e números.',
    };
  }
  if (pw.length >= 10 && hasSymbolOrUpper) {
    return {
      score: 3,
      label: 'Forte',
      validForSignup: true,
      hint: 'Excelente! Senha forte e protegida.',
    };
  }
  return {
    score: 2,
    label: 'Boa',
    validForSignup: true,
    hint: 'Senha válida. Para ficar ainda mais forte, inclua maiúsculas e símbolos.',
  };
}

/**
 * Anti-spam simples no cliente para proteger envios públicos (pedidos, delivery, contato).
 */
const actionTimestamps = new Map<string, number>();

export function checkActionCooldown(
  actionKey: string,
  minIntervalMs: number
): { allowed: true } | { allowed: false; waitSeconds: number } {
  const now = Date.now();
  const prev = actionTimestamps.get(actionKey) || 0;
  const elapsed = now - prev;
  if (elapsed < minIntervalMs) {
    return { allowed: false, waitSeconds: Math.ceil((minIntervalMs - elapsed) / 1000) };
  }
  actionTimestamps.set(actionKey, now);
  return { allowed: true };
}
