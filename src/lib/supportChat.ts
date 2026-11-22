import type { RealtimeChannel } from '@supabase/supabase-js';
import type { SupportMessage, SupportThread } from '../types/meubar';
import { sb } from './supabase';

export const SUPPORT_CHAT_SQL_SNIPPET = `-- Execute no SQL Editor do Supabase para ativar o Chat Direto de Suporte + Fix de Planos
-- (já incluído completo em supabase/schema_completo.sql)
create or replace function public.is_support_staff()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_agents jsonb;
begin
  if public.is_platform_admin() then return true; end if;
  if v_email = '' then return false; end if;
  select config -> 'support_agent_emails' into v_agents from public.platform_settings where id = 'default' limit 1;
  if v_agents is null or jsonb_typeof(v_agents) <> 'array' then return false; end if;
  return exists (select 1 from jsonb_array_elements_text(v_agents) as elem(val) where lower(trim(elem.val)) = v_email);
end; $$;
grant execute on function public.is_support_staff() to authenticated;`;

const LOCAL_THREADS_KEY = 'meubar_support_threads_fallback_v1';
const LOCAL_MSGS_KEY = 'meubar_support_messages_fallback_v1';

function readLocalThreads(): SupportThread[] {
  try {
    const raw = localStorage.getItem(LOCAL_THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportThread[]) : [];
  } catch {
    return [];
  }
}

function writeLocalThreads(list: SupportThread[]): void {
  try {
    localStorage.setItem(LOCAL_THREADS_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // ignore
  }
}

function readLocalMessages(threadId: string): SupportMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, SupportMessage[]>;
    return Array.isArray(map?.[threadId]) ? map[threadId] : [];
  } catch {
    return [];
  }
}

function appendLocalMessage(msg: SupportMessage): void {
  try {
    const raw = localStorage.getItem(LOCAL_MSGS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, SupportMessage[]>) : {};
    const prev = Array.isArray(map[msg.thread_id]) ? map[msg.thread_id] : [];
    if (!prev.some((x) => x.id === msg.id)) {
      map[msg.thread_id] = [...prev, msg].slice(-200);
      localStorage.setItem(LOCAL_MSGS_KEY, JSON.stringify(map));
    }
  } catch {
    // ignore
  }
}

function isMissingTableError(err?: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

export async function fetchStoreThreads(
  userId: string,
  barId?: string | null
): Promise<{ threads: SupportThread[]; needsSql?: boolean; error?: string }> {
  let q = sb
    .from('support_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(30);

  if (barId) {
    q = q.or(`bar_id.eq.${barId},user_id.eq.${userId}`);
  } else {
    q = q.eq('user_id', userId);
  }

  const res = await q;
  if (!res.error && Array.isArray(res.data)) {
    return { threads: res.data as SupportThread[] };
  }

  if (isMissingTableError(res.error)) {
    const local = readLocalThreads().filter(
      (t) => t.user_id === userId || (barId && t.bar_id === barId)
    );
    return { threads: local, needsSql: true };
  }
  return { threads: [], error: res.error?.message };
}

export async function fetchAllSupportThreads(): Promise<{
  threads: SupportThread[];
  needsSql?: boolean;
  error?: string;
}> {
  const res = await sb
    .from('support_threads')
    .select('*')
    .order('last_message_at', { ascending: false })
    .limit(120);

  if (!res.error && Array.isArray(res.data)) {
    return { threads: res.data as SupportThread[] };
  }
  if (isMissingTableError(res.error)) {
    return { threads: readLocalThreads(), needsSql: true };
  }
  return { threads: [], error: res.error?.message };
}

export async function fetchThreadMessages(
  threadId: string
): Promise<{ messages: SupportMessage[]; needsSql?: boolean; error?: string }> {
  const res = await sb
    .from('support_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(300);

  if (!res.error && Array.isArray(res.data)) {
    return { messages: res.data as SupportMessage[] };
  }
  if (isMissingTableError(res.error)) {
    return { messages: readLocalMessages(threadId), needsSql: true };
  }
  return { messages: [], error: res.error?.message };
}

export async function createOrGetStoreThread(params: {
  userId: string;
  userEmail?: string | null;
  barId?: string | null;
  barName: string;
  subject?: string;
}): Promise<{ thread: SupportThread | null; needsSql?: boolean; error?: string }> {
  const existing = await fetchStoreThreads(params.userId, params.barId);
  const openMatch = existing.threads.find(
    (t) =>
      t.status !== 'resolved' &&
      (params.barId ? t.bar_id === params.barId : t.user_id === params.userId)
  );
  if (openMatch) {
    return { thread: openMatch, needsSql: existing.needsSql };
  }

  const nowIso = new Date().toISOString();
  const payload = {
    bar_id: params.barId || null,
    bar_name: (params.barName || 'Minha conta').slice(0, 80),
    user_id: params.userId,
    user_email: params.userEmail?.trim().toLowerCase() || null,
    subject: (params.subject || 'Atendimento Meu Bar').slice(0, 120),
    status: 'open' as const,
    last_message_at: nowIso,
    unread_for_support: 0,
    unread_for_store: 0,
  };

  const ins = await sb.from('support_threads').insert(payload).select('*').single();
  if (!ins.error && ins.data) {
    return { thread: ins.data as SupportThread };
  }

  if (isMissingTableError(ins.error)) {
    const localThread: SupportThread = {
      id: `local-thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...payload,
      created_at: nowIso,
    };
    writeLocalThreads([localThread, ...readLocalThreads()]);
    return { thread: localThread, needsSql: true };
  }

  return { thread: null, error: ins.error?.message };
}

export async function sendSupportMessage(params: {
  threadId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string | null;
  senderRole: 'store' | 'support';
  body: string;
  threadMeta?: Partial<SupportThread>;
}): Promise<{ message: SupportMessage | null; needsSql?: boolean; error?: string }> {
  const cleanBody = params.body.trim().slice(0, 2000);
  if (!cleanBody) {
    return { message: null, error: 'Digite uma mensagem.' };
  }

  const payload = {
    thread_id: params.threadId,
    sender_id: params.senderId,
    sender_name: (params.senderName || 'Usuário').slice(0, 80),
    sender_email: params.senderEmail?.trim().toLowerCase() || null,
    sender_role: params.senderRole,
    body: cleanBody,
  };

  const ins = await sb.from('support_messages').insert(payload).select('*').single();
  if (!ins.error && ins.data) {
    const saved = ins.data as SupportMessage;
    void broadcastSupportEvent('message', saved);
    return { message: saved };
  }

  if (isMissingTableError(ins.error)) {
    const nowIso = new Date().toISOString();
    const localMsg: SupportMessage = {
      id: `local-msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...payload,
      created_at: nowIso,
    };
    appendLocalMessage(localMsg);
    const list = readLocalThreads();
    const updated = list.map((t) =>
      t.id === params.threadId
        ? {
            ...t,
            last_message: cleanBody.slice(0, 160),
            last_sender_role: params.senderRole,
            last_message_at: nowIso,
            unread_for_support:
              params.senderRole === 'store' ? (t.unread_for_support || 0) + 1 : 0,
            unread_for_store:
              params.senderRole === 'support' ? (t.unread_for_store || 0) + 1 : 0,
          }
        : t
    );
    writeLocalThreads(updated);
    void broadcastSupportEvent('message', localMsg);
    return { message: localMsg, needsSql: true };
  }

  return { message: null, error: ins.error?.message };
}

export async function markThreadRead(
  threadId: string,
  readerRole: 'store' | 'support'
): Promise<void> {
  const patch =
    readerRole === 'support' ? { unread_for_support: 0 } : { unread_for_store: 0 };
  const res = await sb.from('support_threads').update(patch).eq('id', threadId);
  if (res.error && isMissingTableError(res.error)) {
    const list = readLocalThreads().map((t) =>
      t.id === threadId ? { ...t, ...patch } : t
    );
    writeLocalThreads(list);
  }
}

export async function updateSupportThreadMeta(
  threadId: string,
  patch: Partial<Pick<SupportThread, 'status' | 'assigned_agent_email'>>
): Promise<{ ok: boolean; error?: string }> {
  const res = await sb.from('support_threads').update(patch).eq('id', threadId);
  if (!res.error) {
    void broadcastSupportEvent('thread_update', { id: threadId, ...patch });
    return { ok: true };
  }
  if (isMissingTableError(res.error)) {
    const list = readLocalThreads().map((t) =>
      t.id === threadId ? { ...t, ...patch } : t
    );
    writeLocalThreads(list);
    return { ok: true };
  }
  return { ok: false, error: res.error.message };
}

async function broadcastSupportEvent(event: string, payload: unknown): Promise<void> {
  try {
    const ch = sb.channel('meubar-support-live');
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 700);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(t);
          void ch
            .send({ type: 'broadcast', event, payload })
            .finally(() => {
              setTimeout(() => void sb.removeChannel(ch), 250);
              resolve();
            });
        }
      });
    });
  } catch {
    // ignore broadcast errors
  }
}

export function subscribeSupportRealtime(handlers: {
  threadId?: string | null;
  onMessage?: (msg: SupportMessage) => void;
  onThreadChange?: () => void;
}): () => void {
  const channelName = handlers.threadId
    ? `support-live-${handlers.threadId}`
    : 'support-live-desk';

  const ch: RealtimeChannel = sb
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        ...(handlers.threadId ? { filter: `thread_id=eq.${handlers.threadId}` } : {}),
      },
      (payload) => {
        const msg = payload.new as SupportMessage | undefined;
        if (msg && msg.id) handlers.onMessage?.(msg);
        handlers.onThreadChange?.();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_threads' },
      () => {
        handlers.onThreadChange?.();
      }
    )
    .on('broadcast', { event: 'message' }, (ev) => {
      const msg = ev?.payload as SupportMessage | undefined;
      if (!msg || !msg.id) return;
      if (handlers.threadId && msg.thread_id !== handlers.threadId) return;
      handlers.onMessage?.(msg);
      handlers.onThreadChange?.();
    })
    .on('broadcast', { event: 'thread_update' }, () => {
      handlers.onThreadChange?.();
    })
    .subscribe();

  return () => {
    void sb.removeChannel(ch);
  };
}
