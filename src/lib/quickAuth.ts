/**
 * Login Rápido com Último Perfil Salvo + Desbloqueio do Celular (Biometria / Face ID / Digital / PIN)
 *
 * Segurança:
 * - Nunca salva senha ou token em texto puro no localStorage.
 * - Salva apenas metadados não sensíveis do último perfil (nome, e-mail, foto, nome do bar).
 * - Usa WebAuthn Platform Authenticator (biometria/desbloqueio nativo do aparelho) e/ou PIN com hash SHA-256 + salt.
 */

export interface SavedQuickProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  barName?: string;
  biometricEnabled: boolean;
  credentialId?: string;
  pinHash?: string;
  pinSalt?: string;
  updatedAt: string;
}

const PROFILE_STORAGE_KEY = 'meubar_quick_profile_v1';
const LOCK_FLAG_KEY = 'meubar_quick_locked_v1';

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function getSavedQuickProfile(): SavedQuickProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedQuickProfile>;
    if (!parsed || !parsed.email || !parsed.userId) return null;
    return {
      userId: String(parsed.userId),
      email: String(parsed.email),
      displayName: String(parsed.displayName || parsed.email.split('@')[0] || 'Usuário'),
      avatarUrl: parsed.avatarUrl ? String(parsed.avatarUrl) : undefined,
      barName: parsed.barName ? String(parsed.barName) : undefined,
      biometricEnabled: Boolean(parsed.biometricEnabled),
      credentialId: parsed.credentialId ? String(parsed.credentialId) : undefined,
      pinHash: parsed.pinHash ? String(parsed.pinHash) : undefined,
      pinSalt: parsed.pinSalt ? String(parsed.pinSalt) : undefined,
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function saveQuickProfile(
  patch: Partial<SavedQuickProfile> & { userId: string; email: string }
): SavedQuickProfile {
  const existing = getSavedQuickProfile();
  const sameUser = existing && existing.userId === patch.userId;
  const next: SavedQuickProfile = {
    userId: patch.userId,
    email: patch.email.trim().toLowerCase(),
    displayName:
      patch.displayName?.trim() ||
      (sameUser ? existing.displayName : '') ||
      patch.email.split('@')[0] ||
      'Usuário',
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : sameUser ? existing.avatarUrl : undefined,
    barName: patch.barName !== undefined ? patch.barName : sameUser ? existing.barName : undefined,
    biometricEnabled:
      patch.biometricEnabled !== undefined
        ? patch.biometricEnabled
        : sameUser
          ? existing.biometricEnabled
          : false,
    credentialId:
      patch.credentialId !== undefined ? patch.credentialId : sameUser ? existing.credentialId : undefined,
    pinHash: patch.pinHash !== undefined ? patch.pinHash : sameUser ? existing.pinHash : undefined,
    pinSalt: patch.pinSalt !== undefined ? patch.pinSalt : sameUser ? existing.pinSalt : undefined,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota
  }
  return next;
}

export function clearQuickProfile(): void {
  try {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    localStorage.removeItem(LOCK_FLAG_KEY);
  } catch {
    // ignore
  }
}

export function isQuickLockActive(): boolean {
  try {
    return localStorage.getItem(LOCK_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setQuickLockActive(locked: boolean): void {
  try {
    if (locked) localStorage.setItem(LOCK_FLAG_KEY, '1');
    else localStorage.removeItem(LOCK_FLAG_KEY);
  } catch {
    // ignore
  }
}

export async function isDeviceBiometricAvailable(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !window.isSecureContext ||
    typeof window.PublicKeyCredential === 'undefined' ||
    !navigator.credentials
  ) {
    return false;
  }
  try {
    if (typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Registra o desbloqueio nativo do aparelho (Digital / Face ID / Windows Hello / PIN do celular)
 * vinculado a este perfil via WebAuthn Platform Authenticator.
 */
export async function registerDeviceBiometricUnlock(
  profile: Pick<SavedQuickProfile, 'userId' | 'email' | 'displayName'>
): Promise<{ ok: boolean; credentialId?: string; error?: string }> {
  const available = await isDeviceBiometricAvailable();
  if (!available) {
    return {
      ok: false,
      error:
        'Biometria nativa indisponível neste navegador/ambiente. Você pode definir um PIN rápido de 4 dígitos abaixo.',
    };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(profile.userId.slice(0, 64));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Meu Bar' },
        user: {
          id: userIdBytes,
          name: profile.email,
          displayName: profile.displayName || profile.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 45000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!cred || !cred.rawId) {
      return { ok: false, error: 'Cadastro biométrico cancelado.' };
    }
    const credentialId = toBase64Url(cred.rawId);
    saveQuickProfile({
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      biometricEnabled: true,
      credentialId,
    });
    return { ok: true, credentialId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('notallowed') || msg.toLowerCase().includes('abort')) {
      return { ok: false, error: 'Verificação cancelada ou bloqueada pelo dispositivo.' };
    }
    return {
      ok: false,
      error:
        'O navegador atual bloqueou a biometria (ex: janela incorporada). Use o PIN rápido de 4 dígitos.',
    };
  }
}

/**
 * Solicita o desbloqueio nativo do aparelho (Digital / Face ID / PIN do sistema).
 */
export async function verifyDeviceBiometricUnlock(
  credentialId: string
): Promise<{ ok: boolean; error?: string }> {
  const available = await isDeviceBiometricAvailable();
  if (!available) {
    return { ok: false, error: 'Desbloqueio biométrico indisponível neste aparelho.' };
  }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const idBytes = fromBase64Url(credentialId);
    const idBuffer = idBytes.buffer.slice(
      idBytes.byteOffset,
      idBytes.byteOffset + idBytes.byteLength
    ) as ArrayBuffer;
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: 'public-key', id: idBuffer }],
        userVerification: 'required',
        timeout: 45000,
      },
    });
    if (!assertion) {
      return { ok: false, error: 'Desbloqueio não confirmado.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Desbloqueio cancelado ou não reconhecido. Tente novamente.' };
  }
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveQuickPin(
  profile: Pick<SavedQuickProfile, 'userId' | 'email' | 'displayName'>,
  pin: string
): Promise<{ ok: boolean; error?: string }> {
  const clean = pin.replace(/\D+/g, '');
  if (clean.length < 4 || clean.length > 6) {
    return { ok: false, error: 'Digite um PIN de 4 a 6 números.' };
  }
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const pinSalt = toBase64Url(saltBytes);
  const pinHash = await sha256Hex(`${pinSalt}:${profile.userId}:${clean}`);
  saveQuickProfile({
    userId: profile.userId,
    email: profile.email,
    displayName: profile.displayName,
    biometricEnabled: true,
    pinSalt,
    pinHash,
  });
  return { ok: true };
}

export async function verifyQuickPin(
  profile: SavedQuickProfile,
  pin: string
): Promise<boolean> {
  if (!profile.pinHash || !profile.pinSalt) return false;
  const clean = pin.replace(/\D+/g, '');
  if (clean.length < 4) return false;
  const candidate = await sha256Hex(`${profile.pinSalt}:${profile.userId}:${clean}`);
  return candidate === profile.pinHash;
}
