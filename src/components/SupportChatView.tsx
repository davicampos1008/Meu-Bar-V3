import React, { useEffect, useMemo, useRef, useState } from 'react';
import { savePlatformConfig } from '../lib/saas';
import { checkActionCooldown } from '../lib/security';
import {
  createOrGetStoreThread,
  fetchAllSupportThreads,
  fetchStoreThreads,
  fetchThreadMessages,
  markThreadRead,
  sendSupportMessage,
  subscribeSupportRealtime,
  SUPPORT_CHAT_SQL_SNIPPET,
  updateSupportThreadMeta,
} from '../lib/supportChat';
import type {
  Bar,
  PlatformSaaSConfig,
  SupportMessage,
  SupportThread,
} from '../types/meubar';

function fmtTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STORE_QUICK_TOPICS = [
  'Quero ativar o Plano Pro na minha loja',
  'Preciso de ajuda com cardápio QR ou impressora',
  'Dúvida sobre estoque, pedidos ou delivery',
  'Quero sugerir uma melhoria para o Meu Bar',
];

const SUPPORT_QUICK_REPLIES = [
  'Olá! Sou do suporte Meu Bar. Como posso te ajudar hoje?',
  'Seu Plano Pro foi ativado! Atualize a tela para conferir os recursos liberados.',
  'Pode me informar o @ da sua loja ou enviar detalhes do que aconteceu?',
  'Tudo certo por aqui! Se precisar de mais alguma coisa, é só chamar.',
];

export const StoreSupportChatView: React.FC<{
  userId: string;
  userEmail?: string | null;
  actorName: string;
  bar: Bar | null;
  initialMessage?: string;
  onUnreadChange?: (count: number) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
}> = ({
  userId,
  userEmail,
  actorName,
  bar,
  initialMessage,
  onUnreadChange,
  onBack,
  onToast,
}) => {
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState(initialMessage || '');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialMessage) setText(initialMessage);
  }, [initialMessage]);

  const loadConversation = async () => {
    setLoading(true);
    const listRes = await fetchStoreThreads(userId, bar?.id || null);
    if (listRes.needsSql) setNeedsSql(true);
    const openOrLatest =
      listRes.threads.find((t) => t.status !== 'resolved') || listRes.threads[0] || null;
    if (openOrLatest) {
      setThread(openOrLatest);
      const msgRes = await fetchThreadMessages(openOrLatest.id);
      if (msgRes.needsSql) setNeedsSql(true);
      setMessages(msgRes.messages);
      if ((openOrLatest.unread_for_store || 0) > 0) {
        await markThreadRead(openOrLatest.id, 'store');
        onUnreadChange?.(0);
      }
    } else {
      setThread(null);
      setMessages([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadConversation();
  }, [userId, bar?.id]);

  useEffect(() => {
    if (!thread?.id) return;
    const unsub = subscribeSupportRealtime({
      threadId: thread.id,
      onMessage: (incoming) => {
        setMessages((prev) =>
          prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
        );
        if (incoming.sender_role === 'support') {
          void markThreadRead(thread.id, 'store');
          onUnreadChange?.(0);
        }
      },
      onThreadChange: () => {
        void fetchStoreThreads(userId, bar?.id || null).then((r) => {
          const updated = r.threads.find((x) => x.id === thread.id);
          if (updated) setThread(updated);
        });
      },
    });
    return unsub;
  }, [thread?.id, userId, bar?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (overrideText?: string) => {
    const body = (overrideText ?? text).trim();
    if (!body || sending) return;

    const cd = checkActionCooldown('support_store_send', 900);
    if (!cd.allowed) {
      onToast(`Aguarde ${cd.waitSeconds}s para enviar outra mensagem.`);
      return;
    }

    setSending(true);
    let activeThread = thread;
    if (!activeThread || activeThread.status === 'resolved') {
      const created = await createOrGetStoreThread({
        userId,
        userEmail,
        barId: bar?.id || null,
        barName: bar?.name || actorName || 'Minha conta',
        subject: body.slice(0, 72),
      });
      if (created.needsSql) setNeedsSql(true);
      if (!created.thread) {
        setSending(false);
        onToast(created.error || 'Não foi possível iniciar o atendimento.');
        return;
      }
      activeThread = created.thread;
      setThread(activeThread);
    }

    const res = await sendSupportMessage({
      threadId: activeThread.id,
      senderId: userId,
      senderName: bar ? `${actorName} (${bar.name})` : actorName,
      senderEmail: userEmail,
      senderRole: 'store',
      body,
    });
    setSending(false);
    if (res.needsSql) setNeedsSql(true);
    if (!res.message) {
      onToast(res.error || 'Erro ao enviar mensagem.');
      return;
    }
    setMessages((prev) =>
      prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]
    );
    if (!overrideText) setText('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button type="button" className="b g sm" onClick={onBack}>
          ← Voltar
        </button>
        <button
          type="button"
          className="b g sm"
          onClick={() => void loadConversation()}
        >
          🔄 Atualizar
        </button>
      </div>

      <div className="panel !p-3.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs font-semibold text-[var(--ac)]">
              Atendimento Direto · Meu Bar
            </div>
            <h1 className="!mt-0.5 !mb-0 text-xl">💬 Chat com o Suporte</h1>
            <p className="mu text-xs !mt-1">
              Converse direto dentro do app com nossa equipe para dúvidas, planos, impressora ou ajustes na sua loja
              {bar ? ` (${bar.name})` : ''}.
            </p>
          </div>
          {thread && (
            <span
              className={`chip ${thread.status === 'resolved' ? 'st1' : 'on'}`}
            >
              {thread.status === 'resolved' ? '✓ Resolvido' : '● Em atendimento'}
            </span>
          )}
        </div>
        {thread?.assigned_agent_email && (
          <div className="mt-2 text-[11px] text-[var(--ok)] font-semibold">
            🎧 Atendente responsável: {thread.assigned_agent_email}
          </div>
        )}
      </div>

      {needsSql && (
        <div className="panel !border-amber-400/50 text-xs">
          <b>Modo local temporário:</b> para sincronizar mensagens na nuvem entre lojas e equipe de suporte em aparelhos diferentes, o administrador deve rodar o <code>supabase/schema_completo.sql</code> atualizado no Supabase.
        </div>
      )}

      {/* Tópicos rápidos quando não há mensagens */}
      {!loading && messages.length === 0 && (
        <div className="panel !p-3.5 space-y-2">
          <div className="text-xs font-bold text-[var(--fg)]">
            Como podemos ajudar agora? Toque em um assunto ou escreva abaixo:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STORE_QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className="b g sm !text-xs !py-1.5 !text-left"
                disabled={sending}
                onClick={() => void handleSend(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Área de mensagens */}
      <div className="panel !p-3 flex flex-col gap-2.5 min-h-[300px] max-h-[55vh] overflow-y-auto">
        {loading ? (
          <p className="mu text-xs text-center my-auto">Carregando conversa…</p>
        ) : messages.length === 0 ? (
          <div className="my-auto text-center py-6 space-y-1">
            <div className="text-2xl">💬</div>
            <div className="text-sm font-bold">Nenhuma mensagem ainda</div>
            <p className="mu text-xs">
              Envie sua dúvida abaixo. Nossa equipe responde diretamente aqui no app.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_role === 'store';
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border ${
                    isMine
                      ? 'bg-[var(--ac)] text-[var(--on-ac)] border-transparent rounded-br-sm'
                      : 'bg-[var(--s2)] text-[var(--tx)] border-[var(--bd)] rounded-bl-sm'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-80 mb-0.5">
                    {isMine ? m.sender_name || 'Você' : `🎧 ${m.sender_name || 'Suporte Meu Bar'}`}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="text-[10px] opacity-70 mt-1 text-right tabular-nums">
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Caixa de envio */}
      <div className="panel !p-2.5 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva sua mensagem para o suporte..."
          rows={2}
          maxLength={2000}
          className="!mt-0 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          type="button"
          className="b shrink-0"
          disabled={sending || !text.trim()}
          onClick={() => void handleSend()}
        >
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  );
};

export const SupportDeskView: React.FC<{
  userId: string;
  userEmail?: string | null;
  actorName: string;
  config: PlatformSaaSConfig;
  canManageTeam: boolean;
  focusBarId?: string | null;
  focusBarName?: string | null;
  focusOwnerEmail?: string | null;
  onConfigUpdated?: (next: PlatformSaaSConfig) => void;
  onToast: (msg: string) => void;
}> = ({
  userId,
  userEmail,
  actorName,
  config,
  canManageTeam,
  focusBarId,
  focusBarName,
  focusOwnerEmail,
  onConfigUpdated,
  onToast,
}) => {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | 'resolved'>('open');
  const [query, setQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [needsSql, setNeedsSql] = useState(false);

  // Gestão de equipe de suporte (somente Super Admin)
  const [newAgentEmail, setNewAgentEmail] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = async (silent = false) => {
    if (!silent) setLoadingThreads(true);
    const res = await fetchAllSupportThreads();
    if (res.needsSql) setNeedsSql(true);
    setThreads(res.threads);
    if (!silent) setLoadingThreads(false);
    return res.threads;
  };

  const loadMessages = async (threadId: string) => {
    setLoadingMsgs(true);
    const res = await fetchThreadMessages(threadId);
    if (res.needsSql) setNeedsSql(true);
    setMessages(res.messages);
    setLoadingMsgs(false);
    await markThreadRead(threadId, 'support');
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, unread_for_support: 0 } : t))
    );
  };

  useEffect(() => {
    void loadThreads().then(async (list) => {
      if (focusBarId) {
        const match = list.find((t) => t.bar_id === focusBarId);
        if (match) {
          setSelectedId(match.id);
          return;
        }
        if (focusBarName) {
          const created = await createOrGetStoreThread({
            userId,
            userEmail: focusOwnerEmail || null,
            barId: focusBarId,
            barName: focusBarName,
            subject: `Atendimento · ${focusBarName}`,
          });
          if (created.thread) {
            setThreads((prev) => [created.thread!, ...prev]);
            setSelectedId(created.thread.id);
          }
        }
      } else if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    });
  }, [focusBarId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const unsub = subscribeSupportRealtime({
      onMessage: (incoming) => {
        if (incoming.thread_id === selectedId) {
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );
          if (incoming.sender_role === 'store') {
            void markThreadRead(incoming.thread_id, 'support');
          }
        }
        void loadThreads(true);
      },
      onThreadChange: () => {
        void loadThreads(true);
      },
    });
    return unsub;
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => {
      if (statusFilter === 'open' && t.status === 'resolved') return false;
      if (statusFilter === 'resolved' && t.status !== 'resolved') return false;
      if (!q) return true;
      return (
        (t.bar_name || '').toLowerCase().includes(q) ||
        (t.user_email || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q) ||
        (t.last_message || '').toLowerCase().includes(q)
      );
    });
  }, [threads, statusFilter, query]);

  const selectedThread = threads.find((t) => t.id === selectedId) || null;
  const openCount = threads.filter((t) => t.status !== 'resolved').length;
  const totalUnread = threads.reduce((s, t) => s + (t.unread_for_support || 0), 0);

  const handleSendReply = async (override?: string) => {
    if (!selectedThread) return;
    const body = (override ?? replyText).trim();
    if (!body || sending) return;

    const cd = checkActionCooldown('support_desk_send', 500);
    if (!cd.allowed) {
      onToast(`Aguarde ${cd.waitSeconds}s.`);
      return;
    }

    setSending(true);
    const res = await sendSupportMessage({
      threadId: selectedThread.id,
      senderId: userId,
      senderName: actorName || 'Suporte Meu Bar',
      senderEmail: userEmail,
      senderRole: 'support',
      body,
    });
    setSending(false);
    if (!res.message) {
      onToast(res.error || 'Erro ao enviar resposta.');
      return;
    }
    setMessages((prev) =>
      prev.some((m) => m.id === res.message!.id) ? prev : [...prev, res.message!]
    );
    if (!override) setReplyText('');
    if (!selectedThread.assigned_agent_email && userEmail) {
      await updateSupportThreadMeta(selectedThread.id, {
        assigned_agent_email: userEmail.toLowerCase(),
      });
    }
    void loadThreads(true);
  };

  const handleAssignSelf = async () => {
    if (!selectedThread || !userEmail) return;
    const res = await updateSupportThreadMeta(selectedThread.id, {
      assigned_agent_email: userEmail.toLowerCase(),
    });
    if (res.ok) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThread.id
            ? { ...t, assigned_agent_email: userEmail.toLowerCase() }
            : t
        )
      );
      onToast('Atendimento assumido por você!');
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedThread) return;
    const nextStatus = selectedThread.status === 'resolved' ? 'open' : 'resolved';
    const res = await updateSupportThreadMeta(selectedThread.id, { status: nextStatus });
    if (res.ok) {
      setThreads((prev) =>
        prev.map((t) => (t.id === selectedThread.id ? { ...t, status: nextStatus } : t))
      );
      onToast(
        nextStatus === 'resolved'
          ? 'Chamado marcado como resolvido!'
          : 'Chamado reaberto!'
      );
    }
  };

  const handleAddSupportAgent = async () => {
    const clean = newAgentEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      onToast('Digite um e-mail válido para a equipe de suporte.');
      return;
    }
    const existing = config.support_agent_emails || [];
    if (existing.includes(clean)) {
      onToast('Este e-mail já faz parte da equipe de suporte.');
      return;
    }
    setSavingTeam(true);
    const nextCfg: PlatformSaaSConfig = {
      ...config,
      support_agent_emails: [...existing, clean],
    };
    const res = await savePlatformConfig(nextCfg);
    setSavingTeam(false);
    onConfigUpdated?.(nextCfg);
    setNewAgentEmail('');
    onToast(
      res.ok
        ? `${clean} adicionado à equipe de suporte!`
        : `Salvo localmente (${res.error}).`
    );
  };

  const handleRemoveSupportAgent = async (emailToRemove: string) => {
    setSavingTeam(true);
    const nextCfg: PlatformSaaSConfig = {
      ...config,
      support_agent_emails: (config.support_agent_emails || []).filter(
        (e) => e !== emailToRemove
      ),
    };
    await savePlatformConfig(nextCfg);
    setSavingTeam(false);
    onConfigUpdated?.(nextCfg);
    onToast(`${emailToRemove} removido da equipe de suporte.`);
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="panel !m-0 !p-3">
          <div className="text-[11px] text-[var(--mut)]">Conversas abertas</div>
          <div className="text-xl font-bold tabular-nums mt-0.5 text-[var(--ac)]">
            {openCount}
          </div>
        </div>
        <div className="panel !m-0 !p-3">
          <div className="text-[11px] text-[var(--mut)]">Não lidas</div>
          <div className="text-xl font-bold tabular-nums mt-0.5 text-[var(--ok)]">
            {totalUnread}
          </div>
        </div>
        <div className="panel !m-0 !p-3">
          <div className="text-[11px] text-[var(--mut)]">Equipe suporte</div>
          <div className="text-xl font-bold tabular-nums mt-0.5">
            {(config.support_agent_emails || []).length + 1}
          </div>
        </div>
      </div>

      {needsSql && (
        <div className="panel !border-amber-400/50 space-y-2 text-xs">
          <div className="font-bold text-[var(--ac)]">
            Ativar sincronização na nuvem do Chat de Suporte
          </div>
          <p className="mu text-xs !m-0">
            Execute o arquivo <b>supabase/schema_completo.sql</b> atualizado no SQL Editor do Supabase para criar as tabelas <code>support_threads</code> e <code>support_messages</code> com segurança RLS.
          </p>
          <button
            type="button"
            className="b g sm"
            onClick={() => {
              void navigator.clipboard?.writeText(SUPPORT_CHAT_SQL_SNIPPET);
              onToast('Trecho SQL copiado! (Use o arquivo supabase/schema_completo.sql completo)');
            }}
          >
            📋 Copiar referência SQL
          </button>
        </div>
      )}

      {/* Gestão da Equipe de Suporte (somente Super Admin) */}
      {canManageTeam && (
        <div className="panel !p-3.5 space-y-2.5">
          <div>
            <h2 className="!m-0 text-base">🎧 Equipe de Suporte Delegada</h2>
            <p className="mu text-xs !mt-0.5">
              Adicione e-mails de pessoas da sua equipe. Elas terão acesso <b>apenas</b> à Central de Suporte para conversar com as lojas (sem acesso ao financeiro, planos VIP ou anúncios).
            </p>
          </div>
          <div className="row">
            <input
              type="email"
              value={newAgentEmail}
              onChange={(e) => setNewAgentEmail(e.target.value)}
              placeholder="atendente@seudominio.com"
              className="grow !mt-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAddSupportAgent();
              }}
            />
            <button
              type="button"
              className="b sm shrink-0"
              disabled={savingTeam}
              onClick={() => void handleAddSupportAgent()}
            >
              + Adicionar atendente
            </button>
          </div>
          {(config.support_agent_emails || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(config.support_agent_emails || []).map((em) => (
                <span
                  key={em}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-[var(--bd)] bg-[var(--s2)]"
                >
                  <span>🎧 {em}</span>
                  <button
                    type="button"
                    className="bg-transparent border-0 text-[var(--dn)] font-bold cursor-pointer p-0 text-xs"
                    disabled={savingTeam}
                    onClick={() => void handleRemoveSupportAgent(em)}
                    title="Remover atendente"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Layout 2 colunas: Lista de conversas + Chat ativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Lista de conversas */}
        <div className="lg:col-span-5 panel !p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="!m-0 text-base">Conversas com Lojas</h2>
            <button
              type="button"
              className="b g sm"
              onClick={() => void loadThreads()}
            >
              🔄
            </button>
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar loja, e-mail ou assunto..."
            className="!mt-0"
          />

          <div className="flex gap-1.5 flex-wrap">
            {(
              [
                { id: 'open', label: `Abertos (${openCount})` },
                { id: 'all', label: `Todos (${threads.length})` },
                { id: 'resolved', label: 'Resolvidos' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${statusFilter === f.id ? 'on' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
            {loadingThreads ? (
              <p className="mu text-xs">Carregando atendimentos…</p>
            ) : filteredThreads.length === 0 ? (
              <p className="mu text-xs py-4 text-center">
                Nenhuma conversa neste filtro ainda. Quando uma loja chamar no chat do app, ela aparece aqui em tempo real.
              </p>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left rounded-xl p-2.5 border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[var(--ac)] bg-[var(--s2)]'
                        : 'border-[var(--bd)] bg-transparent hover:bg-[var(--s2)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[var(--tx)] truncate">
                        🏪 {t.bar_name || 'Loja'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(t.unread_for_support || 0) > 0 && (
                          <span className="badge-warn">{t.unread_for_support}</span>
                        )}
                        <span className="text-[10px] text-[var(--mut)] tabular-nums">
                          {fmtTime(t.last_message_at)}
                        </span>
                      </div>
                    </div>
                    {t.user_email && (
                      <div className="text-[11px] text-[var(--mut)] truncate">
                        {t.user_email}
                      </div>
                    )}
                    <div className="text-xs text-[var(--tx)]/80 truncate mt-1">
                      {t.last_message || t.subject || 'Nova conversa'}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span
                        className={
                          t.status === 'resolved'
                            ? 'text-[var(--ok)] font-semibold'
                            : 'text-[var(--ac)] font-semibold'
                        }
                      >
                        {t.status === 'resolved' ? '✓ Resolvido' : '● Aberto'}
                      </span>
                      {t.assigned_agent_email && (
                        <span className="text-[var(--mut)] truncate">
                          · Atendente: {t.assigned_agent_email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversa selecionada */}
        <div className="lg:col-span-7 panel !p-3 flex flex-col gap-2.5">
          {!selectedThread ? (
            <div className="my-auto text-center py-12 space-y-1.5">
              <div className="text-3xl">🎧</div>
              <div className="font-bold text-sm">Selecione uma conversa à esquerda</div>
              <p className="mu text-xs">
                Todas as mensagens das lojas chegam aqui em tempo real.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 flex-wrap pb-2 border-b border-[var(--bd)]">
                <div className="min-w-0">
                  <div className="font-bold text-base truncate">
                    🏪 {selectedThread.bar_name}
                  </div>
                  <div className="text-xs text-[var(--mut)] truncate">
                    {selectedThread.user_email || 'Sem e-mail'}
                    {selectedThread.assigned_agent_email
                      ? ` · Atendente: ${selectedThread.assigned_agent_email}`
                      : ' · Sem atendente atribuído'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    className="b g sm"
                    onClick={() => void handleAssignSelf()}
                  >
                    🎧 Assumir
                  </button>
                  <button
                    type="button"
                    className={`b sm ${selectedThread.status === 'resolved' ? 'g' : 'ok'}`}
                    onClick={() => void handleToggleStatus()}
                  >
                    {selectedThread.status === 'resolved' ? 'Reabrir' : '✓ Resolver'}
                  </button>
                </div>
              </div>

              {/* Respostas rápidas */}
              <div className="flex flex-wrap gap-1">
                {SUPPORT_QUICK_REPLIES.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    className="px-2 py-1 rounded-lg text-[11px] border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] cursor-pointer hover:border-[var(--ac)]"
                    onClick={() => setReplyText(qr)}
                  >
                    ⚡ {qr.slice(0, 34)}…
                  </button>
                ))}
              </div>

              {/* Stream de mensagens */}
              <div className="flex flex-col gap-2 min-h-[240px] max-h-[380px] overflow-y-auto p-1">
                {loadingMsgs ? (
                  <p className="mu text-xs text-center my-auto">Carregando mensagens…</p>
                ) : messages.length === 0 ? (
                  <p className="mu text-xs text-center my-auto">
                    Envie a primeira mensagem para iniciar este atendimento.
                  </p>
                ) : (
                  messages.map((m) => {
                    const isSupport = m.sender_role === 'support';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed border ${
                            isSupport
                              ? 'bg-[var(--ac)] text-[var(--on-ac)] border-transparent rounded-br-sm'
                              : 'bg-[var(--s2)] text-[var(--tx)] border-[var(--bd)] rounded-bl-sm'
                          }`}
                        >
                          <div className="text-[10px] font-bold opacity-80 mb-0.5">
                            {isSupport
                              ? `🎧 ${m.sender_name || 'Suporte'}`
                              : `🏪 ${m.sender_name || selectedThread.bar_name}`}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className="text-[10px] opacity-70 mt-1 text-right tabular-nums">
                            {fmtTime(m.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Input de resposta */}
              <div className="flex items-end gap-2 pt-2 border-t border-[var(--bd)]">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder para a loja..."
                  rows={2}
                  maxLength={2000}
                  className="!mt-0 flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendReply();
                    }
                  }}
                />
                <button
                  type="button"
                  className="b shrink-0"
                  disabled={sending || !replyText.trim()}
                  onClick={() => void handleSendReply()}
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
