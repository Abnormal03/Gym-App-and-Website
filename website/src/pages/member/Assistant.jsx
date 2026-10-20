import { useEffect, useRef, useState } from 'react';
import { Bot, RefreshCw, Send, User } from 'lucide-react';
import { chatbotApi } from '../../api/chatbot.api';
import { PageHeader } from '../../components/common/Layout';
import Button from '../../components/common/Button';

const CHIPS = ['How do I book?', 'Payment problem', 'Workout tips'];
const MAX_CONTEXT = 10; // the app sends the last 10 messages on each request

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [locale, setLocale] = useState('en');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages, pending, error]);

  const ask = async (history) => {
    setPending(true);
    setError(null);
    try {
      const res = await chatbotApi.send(history.slice(-MAX_CONTEXT).map(({ role, content }) => ({ role, content })), locale);
      setMessages((cur) => [...cur, { role: 'assistant', content: res.reply, fallback: Boolean(res.fallback) }]);
    } catch (e) {
      setError(e.status === 429 ? 'You are sending messages too quickly. Wait a minute and retry.' : e.message);
    } finally {
      setPending(false);
    }
  };

  const send = (content) => {
    const clean = content.trim();
    if (!clean || pending) return;
    const history = [...messages, { role: 'user', content: clean }];
    setMessages(history);
    setText('');
    ask(history);
  };

  return (
    <>
      <PageHeader title="Help assistant" subtitle="Ask about booking, payments, packages or general training. Not medical advice." actions={
        <label className="flex items-center gap-2 text-sm">Language
          <select value={locale} onChange={(e) => setLocale(e.target.value)} className="input w-auto py-1.5"><option value="en">English</option><option value="am">Amharic</option></select>
        </label>
      } />
      <div className="card flex h-[calc(100vh-15rem)] min-h-[420px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <Bot className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
              <p className="mt-2 text-ink-600">How can I help?</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {CHIPS.map((c) => <button key={c} type="button" onClick={() => send(c)} className="rounded-full border border-ink-200 px-3.5 py-1.5 text-sm hover:bg-ink-50">{c}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-ink-100' : 'bg-brand-50 text-brand'}`}>{m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}<span className="sr-only">{m.role === 'user' ? 'You' : 'Assistant'}</span></span>
              <p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 ${m.role === 'user' ? 'bg-brand text-white' : m.fallback ? 'bg-amber-50 text-amber-900' : 'bg-ink-100'}`}>{m.content}</p>
            </div>
          ))}
          {pending && <p className="text-sm text-ink-500" role="status">The assistant is typing...</p>}
          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>{error}</span>
              <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => ask(messages)}>Retry</Button>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-ink-100 p-3">
          <label htmlFor="assistant-input" className="sr-only">Your message</label>
          <input id="assistant-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Type your question" className="input" />
          <Button type="submit" icon={Send} loading={pending} disabled={!text.trim()} aria-label="Send" />
        </form>
      </div>
    </>
  );
}
