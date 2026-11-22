import type { Bar, StaffAccount, StaffRoleKey } from '../types/meubar';
import { getBarOpsData } from './opsUtils';

export interface StaffRoleMeta {
  key: StaffRoleKey;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const STAFF_ROLES: StaffRoleMeta[] = [
  {
    key: 'garcom',
    label: 'Garçom',
    shortLabel: 'Garçom',
    icon: '🍽️',
    description: 'Estação do Garçom, mesas, lançamentos e chamados',
  },
  {
    key: 'barman',
    label: 'Barman',
    shortLabel: 'Barman',
    icon: '🍸',
    description: 'Fila de preparo de drinks com receitas detalhadas',
  },
  {
    key: 'cozinha',
    label: 'Cozinha',
    shortLabel: 'Cozinha',
    icon: '🍳',
    description: 'Fila KDS da cozinha para porções e pratos',
  },
  {
    key: 'caixa',
    label: 'Caixa (Terminal)',
    shortLabel: 'Caixa',
    icon: '💵',
    description: 'Tela exclusiva do Caixa: comandas, cobrança, 2ª tela e edição com senha ADM',
  },
  {
    key: 'delivery',
    label: 'Delivery',
    shortLabel: 'Delivery',
    icon: '🛵',
    description: 'Painel de pedidos externos e despacho de motoboys',
  },
  {
    key: 'estoque',
    label: 'Estoque',
    shortLabel: 'Estoque',
    icon: '🍾',
    description: 'Controle de insumos, garrafas e cardápio',
  },
  {
    key: 'gerente',
    label: 'Gerente (ADM Loja)',
    shortLabel: 'Gerente',
    icon: '🛡️',
    description: 'Acesso administrativo completo da loja e liberação de descontos',
  },
];

export const STAFF_ROLE_BY_KEY: Record<StaffRoleKey, StaffRoleMeta> = STAFF_ROLES.reduce(
  (acc, item) => {
    acc[item.key] = item;
    return acc;
  },
  {} as Record<StaffRoleKey, StaffRoleMeta>
);

export interface ActiveStaffSession {
  barId: string;
  staffId: string;
  username: string;
  loggedInAt: string;
}

function staffSessionKey(barId: string): string {
  return `meubar_staff_session_${barId}`;
}

export function normalizeStaffUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 32);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i += 1) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(arr);
}

/**
 * Gera hash SHA-256 com salt aleatório (nunca armazena senhas ou PINs em texto puro).
 */
export async function hashStoreSecret(
  secret: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const clean = String(secret || '').trim();
  const salt = existingSalt || generateSalt();
  const data = new TextEncoder().encode(`meubar-store-v1:${salt}:${clean}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return { hash: bytesToHex(new Uint8Array(digest)), salt };
  }
  // Fallback determinístico raro para ambientes sem SubtleCrypto
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 1) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return { hash: (h >>> 0).toString(16).padStart(8, '0'), salt };
}

export async function verifyStoreSecret(
  secret: string,
  expectedHash?: string,
  salt?: string
): Promise<boolean> {
  if (!expectedHash || !salt) return false;
  const clean = String(secret || '').trim();
  if (!clean) return false;
  const { hash } = await hashStoreSecret(clean, salt);
  if (hash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i += 1) {
    diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function hasStoreManagerPin(bar?: Partial<Bar> | null): boolean {
  const ops = getBarOpsData(bar);
  return Boolean(ops.manager_pin_hash && ops.manager_pin_salt);
}

export async function verifyStoreManagerPin(
  bar: Partial<Bar> | null | undefined,
  inputPin: string
): Promise<{ ok: boolean; reason?: string; approverName?: string }> {
  const ops = getBarOpsData(bar);
  const clean = String(inputPin || '').trim();
  if (!clean) {
    return { ok: false, reason: 'Digite a senha de gerente ou dono.' };
  }

  // 1. Verifica contra a Senha ADM da loja (manager_pin_hash)
  if (ops.manager_pin_hash && ops.manager_pin_salt) {
    const okPin = await verifyStoreSecret(clean, ops.manager_pin_hash, ops.manager_pin_salt);
    if (okPin) {
      return { ok: true, approverName: 'Senha ADM da Loja' };
    }
  }

  // 2. Também aceita senha de qualquer funcionário ativo com função 'gerente'
  const managers = (ops.staff_accounts || []).filter(
    (s) => s.active && Array.isArray(s.roles) && s.roles.includes('gerente')
  );
  for (const mgr of managers) {
    const okMgr = await verifyStoreSecret(clean, mgr.password_hash, mgr.password_salt);
    if (okMgr) {
      return { ok: true, approverName: `Gerente ${mgr.name}` };
    }
  }

  if (!ops.manager_pin_hash && managers.length === 0) {
    return {
      ok: false,
      reason:
        'Nenhuma Senha ADM foi cadastrada ainda. Cadastre em Gestão → Configurações (Senha de Gerente/Dono).',
    };
  }

  return { ok: false, reason: 'Senha de gerente/dono incorreta.' };
}

export async function authenticateStaffAccount(
  bar: Partial<Bar> | null | undefined,
  usernameInput: string,
  passwordInput: string
): Promise<{ ok: boolean; staff?: StaffAccount; error?: string }> {
  const ops = getBarOpsData(bar);
  const cleanUser = normalizeStaffUsername(usernameInput);
  const cleanPass = String(passwordInput || '').trim();
  if (!cleanUser || !cleanPass) {
    return { ok: false, error: 'Informe login e senha do funcionário.' };
  }
  const accounts = ops.staff_accounts || [];
  const found = accounts.find((a) => normalizeStaffUsername(a.username) === cleanUser);
  if (!found) {
    return { ok: false, error: 'Funcionário não encontrado nesta loja.' };
  }
  if (!found.active) {
    return { ok: false, error: 'Este acesso de funcionário está desativado pelo gerente.' };
  }
  if (!found.roles || found.roles.length === 0) {
    return { ok: false, error: 'Nenhuma função foi atribuída a este funcionário ainda.' };
  }
  const ok = await verifyStoreSecret(cleanPass, found.password_hash, found.password_salt);
  if (!ok) {
    return { ok: false, error: 'Senha incorreta.' };
  }
  return { ok: true, staff: found };
}

export function getActiveStaffSession(barId: string): ActiveStaffSession | null {
  try {
    const raw = sessionStorage.getItem(staffSessionKey(barId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveStaffSession;
    if (!parsed || !parsed.staffId || parsed.barId !== barId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveStaffSession(barId: string, staff: StaffAccount): ActiveStaffSession {
  const session: ActiveStaffSession = {
    barId,
    staffId: staff.id,
    username: staff.username,
    loggedInAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(staffSessionKey(barId), JSON.stringify(session));
  } catch {
    // ignore
  }
  return session;
}

export function clearActiveStaffSession(barId: string): void {
  try {
    sessionStorage.removeItem(staffSessionKey(barId));
  } catch {
    // ignore
  }
}

export interface StaffWorkspaceViewOption {
  id: string;
  label: string;
  icon: string;
  roleKey: StaffRoleKey;
}

/**
 * Calcula exatamente quais telas um funcionário pode ver com base nas funções atribuídas.
 * Atualiza automaticamente em tempo real sempre que o ADM altera `staff.roles`.
 */
export function getAllowedViewsForRoles(roles: StaffRoleKey[]): StaffWorkspaceViewOption[] {
  const set = new Set<StaffRoleKey>(roles || []);
  const out: StaffWorkspaceViewOption[] = [];

  if (set.has('garcom')) {
    out.push({ id: 'station_garcom', label: 'Garçom', icon: '🍽️', roleKey: 'garcom' });
  }
  if (set.has('barman')) {
    out.push({ id: 'station_bar', label: 'Barman', icon: '🍸', roleKey: 'barman' });
  }
  if (set.has('cozinha')) {
    out.push({ id: 'station_cozinha', label: 'Cozinha', icon: '🍳', roleKey: 'cozinha' });
  }
  if (set.has('caixa')) {
    out.push({ id: 'terminal_caixa', label: 'Caixa', icon: '💵', roleKey: 'caixa' });
  }
  if (set.has('delivery')) {
    out.push({ id: 'delivery', label: 'Delivery', icon: '🛵', roleKey: 'delivery' });
  }
  if (set.has('estoque')) {
    out.push({ id: 'stock', label: 'Estoque', icon: '🍾', roleKey: 'estoque' });
  }
  if (set.has('gerente')) {
    out.push({ id: 'full_panel', label: 'Painel Completo', icon: '🛡️', roleKey: 'gerente' });
  }

  return out;
}
