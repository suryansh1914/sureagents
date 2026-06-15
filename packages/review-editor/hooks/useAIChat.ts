import { useAIChat as useSharedAIChat, type AIChatEntry, type PendingPermission } from '@sureagents/ui/hooks/useAIChat';
export type { AIChatEntry, PendingPermission };

interface UseAIChatOptions {
  patch: string;
  providerId?: string | null;
  model?: string | null;
  reasoningEffort?: string | null;
}

export function useAIChat({ patch, providerId, model, reasoningEffort }: UseAIChatOptions) {
  return useSharedAIChat({
    context: {
      mode: 'code-review',
      review: { patch },
    },
    providerId,
    model,
    reasoningEffort,
  });
}
