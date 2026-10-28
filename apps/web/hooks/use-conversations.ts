import { type InfiniteData, type QueryClient, useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Page size — large enough to fill the sidebar on most displays in one fetch */
export const CHAT_LIST_PAGE_SIZE = 35;

/** A single page of the conversation list, as returned by the API */
export type ConversationListPage = (typeof api.chat.conversations.$get.$infer)['data'];

/** Shared infinite-query options for the conversation list */
export const chatListInfiniteOptions = api.chat.conversations.$get.infiniteQueryOptions({
  query: { limit: String(CHAT_LIST_PAGE_SIZE) },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: ConversationListPage) => lastPage.nextCursor,
});

/**
 * Cache key for the conversation list, for updating or refetching it from elsewhere (e.g. adding
 * a new conversation). Read from the infinite query's options so it matches exactly —
 * `api.chat.conversations.$get.getQueryKey()` builds a regular-query key, which never matches.
 */
export const chatListQueryKey = chatListInfiniteOptions.queryKey;

/** Aggregated infinite-query cache shape */
export type ConversationListInfiniteData = InfiniteData<ConversationListPage, string | undefined>;

type ConversationListItem = ConversationListPage['items'][number];

/** Optimistic edits to the cached conversation list */
export const conversationListCache = {
  /** Replaces the items on every loaded page */
  updateItems: (
    queryClient: QueryClient,
    update: (items: ConversationListItem[]) => ConversationListItem[],
  ) =>
    queryClient.setQueryData<ConversationListInfiniteData>(chatListQueryKey, (old) =>
      old
        ? { ...old, pages: old.pages.map((page) => ({ ...page, items: update(page.items) })) }
        : old,
    ),
  /** Adds a conversation to the top of the first page */
  prepend: (queryClient: QueryClient, item: ConversationListItem) =>
    queryClient.setQueryData<ConversationListInfiniteData>(chatListQueryKey, (old) => {
      const [firstPage, ...rest] = old?.pages ?? [];
      if (!old || !firstPage) {
        return { pages: [{ items: [item], nextCursor: undefined }], pageParams: [undefined] };
      }
      return { ...old, pages: [{ ...firstPage, items: [item, ...firstPage.items] }, ...rest] };
    }),
};

/** Loads the current user's conversations as a paginated infinite list */
export const useConversations = () => useInfiniteQuery(chatListInfiniteOptions);
