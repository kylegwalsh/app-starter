import { type InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/core/api';

/** Page size — large enough to fill the sidebar on most displays in one fetch */
export const CHAT_LIST_PAGE_SIZE = 35;

/** A single page of the conversation list, as returned by the API */
export type ConversationListPage = (typeof api.chat.conversations.$get.$infer)['data'];

/** Query key for the conversation list — shared so optimistic writes hit the same entry */
export const chatListQueryKey = api.chat.conversations.$get.getQueryKey();

/**
 * Shared infinite-query options for the conversation list. The chat provider
 * also uses these directly so its optimistic writes land on the same cache entry.
 */
export const chatListInfiniteOptions = api.chat.conversations.$get.infiniteQueryOptions({
  query: { limit: String(CHAT_LIST_PAGE_SIZE) },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: ConversationListPage) => lastPage.nextCursor,
});

/** Aggregated infinite-query cache shape */
export type ConversationListInfiniteData = InfiniteData<ConversationListPage, string | undefined>;

/** Loads the current user's conversations as a paginated infinite list */
export const useConversations = () => useInfiniteQuery(chatListInfiniteOptions);
