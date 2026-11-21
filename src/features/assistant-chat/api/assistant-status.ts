import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { ENV } from '@/shared/config/env';

const StatusSchema = z.object({ enabled: z.boolean() });
export type AssistantStatus = z.infer<typeof StatusSchema>;

const OFF: AssistantStatus = { enabled: false };

/**
 * Is the assistant switched on at the server? Anything but a clear "yes" counts as "no", so a broken or
 * missing answer hides the button instead of showing one that fails. Mock mode needs no server.
 */
export async function fetchAssistantStatus(options: { baseUrl: string | null; mock: boolean }): Promise<AssistantStatus> {
  if (options.mock) return { enabled: true };
  if (!options.baseUrl) return OFF;
  try {
    const response = await fetch(`${options.baseUrl}/v1/assistant/status`);
    if (!response.ok) return OFF;
    const parsed = StatusSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : OFF;
  } catch {
    return OFF;
  }
}

/** `enabled: true` does not promise the model answers right now: the chat still has its own error state. */
export function useAssistantStatus() {
  return useQuery({
    queryKey: ['assistant', 'status'],
    queryFn: () => fetchAssistantStatus({ baseUrl: ENV.exportBaseUrl, mock: ENV.assistantMock }),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
