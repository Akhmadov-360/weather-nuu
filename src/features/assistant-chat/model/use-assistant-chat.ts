import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from '../api/stream-chat';
import { applyEvent, finishTurn, initialState, prepareRetry, startTurn, type ChatState } from './conversation';
import { MESSAGE_MAX_CHARS, type AssistantContext, type AssistantLang } from './events';
import { trimHistory } from './history';

export type ChatStream = typeof streamChat;

/**
 * One conversation with the assistant. It holds the state, asks the server, feeds the events through
 * `applyEvent` and cancels the request when the visitor stops it or the chat is closed. The dialogue is
 * kept only here (the server remembers nothing): closing the panel for good forgets it.
 */
export function useAssistantChat(options: { context: AssistantContext; lang: AssistantLang; stream?: ChatStream }) {
  const { context, lang, stream = streamChat } = options;
  const [state, setState] = useState<ChatState>(initialState);
  const latest = useRef(state);
  latest.current = state;
  const controller = useRef<AbortController | null>(null);

  const ask = useCallback(
    async (base: ChatState, text: string) => {
      const message = text.trim().slice(0, MESSAGE_MAX_CHARS);
      if (!message || base.status === 'streaming') return;
      const history = trimHistory(base.messages);
      const own = new AbortController();
      controller.current = own;
      setState(startTurn(base, message));
      try {
        for await (const event of stream({ message, history, lang, context, signal: own.signal })) {
          if (own.signal.aborted) break;
          setState((s) => applyEvent(s, event));
        }
      } finally {
        if (controller.current === own) controller.current = null;
        setState((s) => finishTurn(s));
      }
    },
    [context, lang, stream],
  );

  const send = useCallback((text: string) => void ask(latest.current, text), [ask]);

  const stop = useCallback(() => controller.current?.abort(), []);

  const retry = useCallback(() => {
    const { state: base, message } = prepareRetry(latest.current);
    if (message !== null) void ask(base, message);
  }, [ask]);

  // Closing the chat in the middle of an answer closes the connection too.
  useEffect(() => () => controller.current?.abort(), []);

  return { state, send, stop, retry };
}
