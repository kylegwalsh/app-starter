import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { orpc, type RouterOutputs } from '@/core/orpc';

/** Page size — large enough to fill the sidebar on most displays in one fetch */
export const CHAT_LIST_PAGE_SIZE = 35;

/**
 * Shared infinite-query options for the conversation list. The chat provider
 * also uses these directly so its optimistic writes land on the same cache entry.
 */
export const chatListInfiniteOptions = orpc.chat.list.infiniteOptions({
  input: (cursor: string | undefined) => ({ cursor, limit: CHAT_LIST_PAGE_SIZE }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

/** Aggregated infinite-query cache shape */
export type ConversationListInfiniteData = InfiniteData<RouterOutputs['chat']['list'], string | undefined>;

/** Loads the current user's conversations as a paginated infinite list */
export const useConversations = () => useInfiniteQuery(chatListInfiniteOptions);
