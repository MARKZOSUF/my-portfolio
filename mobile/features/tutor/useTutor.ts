import { useCallback, useState } from 'react';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { toMessage } from '@/utils/errors';
import type { ChatMessage } from '@/components/tutor/ChatBubble';

function id(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Conversational tutor state with optimistic user messages. */
export function useTutor(noteId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const ask = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      const optimistic: ChatMessage = { id: id(), role: 'user', content: trimmed, createdAt: new Date().toISOString(), pending: true };
      setMessages((prev) => [...prev, optimistic]);
      setBusy(true);
      setError(undefined);
      try {
        const reply = await api.post<{ answer: string }>(API.tutor.ask, { question: trimmed, note_id: noteId ?? null });
        setMessages((prev) => [
          ...prev.map((m) => (m.id === optimistic.id ? { ...m, pending: false } : m)),
          { id: id(), role: 'assistant', content: reply.answer, createdAt: new Date().toISOString() },
        ]);
      } catch (e) {
        setError(toMessage(e));
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      } finally {
        setBusy(false);
      }
    },
    [noteId],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(undefined);
  }, []);

  return { messages, busy, error, ask, clear };
}
