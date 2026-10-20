import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lock, MessageSquare, Send } from 'lucide-react';
import { chatApi } from '../../api/chat.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, formatTime } from '../../utils/format';
import { Avatar } from './Layout';
import Button from './Button';
import { EmptyState, ErrorState, Spinner } from './states';

const POLL_MS = 10000; // spec: poll every 10 s (Socket.io live updates are not wired up, see README)
const PAGE = 30;
const MAX_LEN = 2000;

const threadName = (t, role) =>
  t.counterpart?.name || t.otherParty?.name || (role === 'MEMBER' ? t.provider?.name : t.member?.name) || t.name || t.title || `Conversation ${t.id}`;
const threadPreview = (t) => (typeof t.lastMessage === 'string' ? t.lastMessage : t.lastMessage?.body) || 'No messages yet';

function MessageList({ threadId, role, userId, writable, onSent }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef(null);
  const stickToBottom = useRef(true);

    const isMine = useCallback(
     (m) => (role === 'MEMBER' ? m.senderUserId != null : m.senderProviderId != null),
     [role],
   );  

  const merge = (list, incoming) => {
    const map = new Map(list.filter((m) => !String(m.id).startsWith('tmp-')).map((m) => [String(m.id), m]));
    incoming.forEach((m) => map.set(String(m.id), m));
    return [...map.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  const loadLatest = useCallback(
    async (initial = false) => {
      try {
        const res = await chatApi.messages(threadId, { limit: PAGE });
        const list = asList(res, 'messages');
        setMessages((cur) => merge(cur, list));
        if (initial) setHasMore(list.length >= PAGE);
        setError(null);
        chatApi.markRead(threadId).catch(() => {});
      } catch (e) {
        if (initial) setError(e);
      } finally {
        if (initial) setLoading(false);
      }
    },
    [threadId],
  );

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setText('');
    stickToBottom.current = true;
    loadLatest(true);
    const t = setInterval(() => loadLatest(false), POLL_MS);
    return () => clearInterval(t);
  }, [loadLatest]);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!oldest) return;
    stickToBottom.current = false;
    try {
      // `before` cursor = id of the oldest loaded message (assumption: the spec only says "cursor")
      const res = await chatApi.messages(threadId, { before: oldest.id, limit: PAGE });
      const list = asList(res, 'messages');
      setMessages((cur) => merge(cur, list));
      setHasMore(list.length >= PAGE);
    } catch (e) {
      setSendError(e.message);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending || body.length > MAX_LEN) return;
    setSending(true);
    setSendError('');
    const temp = { id: `tmp-${Date.now()}`, body, createdAt: new Date().toISOString(), isMine: true, pending: true };
    stickToBottom.current = true;
    setMessages((cur) => [...cur, temp]);
    setText('');
    try {
      await chatApi.send(threadId, body);
      await loadLatest(false);
      onSent?.();
    } catch (err) {
      setMessages((cur) => cur.filter((m) => m.id !== temp.id));
      setText(body);
      setSendError(err.unavailable ? 'Messaging is not available on this server yet.' : err.code === 'FORBIDDEN' ? 'This conversation is read-only because access has ended.' : err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner label="Loading messages" />;
  if (error) return <div className="p-4"><ErrorState error={error} onRetry={() => { setLoading(true); setError(null); loadLatest(true); }} /></div>;

  let lastDay = '';
  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
        {hasMore && (
          <div className="text-center"><Button variant="ghost" size="sm" onClick={loadOlder}>Load older messages</Button></div>
        )}
        {messages.length === 0 && <p className="py-8 text-center text-ink-500">No messages yet. Say hello.</p>}
        {messages.map((m) => {
          const mine = isMine(m);
          const day = formatDate(m.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id}>
  {showDay && <p className="my-3 text-center text-xs text-ink-400">{day}</p>}
  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${mine ? 'rounded-br-sm bg-[#2E68F4] text-white' : 'rounded-bl-sm bg-ink-100 text-ink'} ${m.pending ? 'opacity-60' : ''}`}>
      <p className="whitespace-pre-wrap break-words">{m.body}</p>
      <p className={`mt-0.5 text-right text-[11px] ${mine ? 'text-white/70' : 'text-ink-400'}`}>
        {formatTime(m.createdAt)}
        {mine && !m.pending && (m.readAt ? ' · read' : ' · sent')}
      </p>
    </div>
  </div>
</div>
             
          );
        })}
        <div ref={bottomRef} />
      </div>
      {writable ? (
        <form onSubmit={send} className="border-t border-ink-100 p-3">
          {sendError && <p role="alert" className="mb-2 text-sm text-red-600">{sendError}</p>}
          <div className="flex items-end gap-2">
            <label htmlFor="chat-input" className="sr-only">Message</label>
            <textarea id="chat-input" rows={1} value={text} maxLength={MAX_LEN} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }} placeholder="Write a message" className="input max-h-32 resize-none" />
            <Button type="submit" icon={Send} loading={sending} disabled={!text.trim()} aria-label="Send message" />
          </div>
          <p className="mt-1 text-right text-xs text-ink-400">{text.length}/{MAX_LEN}</p>
        </form>
      ) : (
        <div className="flex items-center gap-2 border-t border-ink-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Access to this conversation has ended, so it is read-only.
        </div>
      )}
    </>
  );
}

/** Thread list + conversation. Works for every role that has chat access. */
export default function ChatPanel() {
  const { role, user } = useAuth();
  const threadsState = useAsync(() => chatApi.threads(), []);
  const [activeId, setActiveId] = useState(null);

  const threads = useMemo(() => asList(threadsState.data, 'threads'), [threadsState.data]);
  const active = threads.find((t) => String(t.id) === String(activeId));

  useEffect(() => {
    const t = setInterval(() => threadsState.reload(), POLL_MS * 3);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (threadsState.loading && !threadsState.data) return <Spinner label="Loading conversations" />;
  if (threadsState.error && !threadsState.data) return <ErrorState error={threadsState.error} onRetry={threadsState.reload} title="Messages unavailable" />;
  if (threads.length === 0) {
    return <EmptyState icon={MessageSquare} title="No conversations yet" message="A conversation opens after a coaching package or nutrition consultation is paid for." />;
  }

  return (
    <div className="card flex h-[calc(100vh-13rem)] min-h-[420px] overflow-hidden">
      <aside className={`w-full shrink-0 overflow-y-auto border-r border-ink-100 md:block md:w-72 ${active ? 'hidden' : 'block'}`} aria-label="Conversations">
        <ul>
          {threads.map((t) => {
            const name = threadName(t, role);
            const selected = String(t.id) === String(activeId);
            return (
              <li key={t.id}>
                <button type="button" onClick={() => setActiveId(t.id)} aria-current={selected || undefined} className={`flex w-full items-center gap-3 border-b border-ink-100 px-4 py-3 text-left hover:bg-ink-50 ${selected ? 'bg-brand-50' : ''}`}>
                  <Avatar name={name} src={t.counterpart?.photoUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block truncate text-sm text-ink-500">{threadPreview(t)}</span>
                  </span>
                  {t.unreadCount > 0 && <span className="rounded-full bg-signal px-2 py-0.5 text-xs font-medium text-white" aria-label={`${t.unreadCount} unread`}>{t.unreadCount}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
        {active ? (
          <>
            <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
              <button type="button" onClick={() => setActiveId(null)} className="rounded p-1 hover:bg-ink-50 md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
              <Avatar name={threadName(active, role)} size="sm" />
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{threadName(active, role)}</p>
                {(active.expiresAt || active.accessEndsAt) && <p className="text-xs text-ink-500">Access until {formatDate(active.expiresAt || active.accessEndsAt)}</p>}
              </div>
            </div>
            <MessageList key={active.id} threadId={active.id} role={role} userId={user?.id} writable={active.writable !== false} onSent={threadsState.reload} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-ink-500">Choose a conversation</div>
        )}
      </section>
    </div>
  );
}
