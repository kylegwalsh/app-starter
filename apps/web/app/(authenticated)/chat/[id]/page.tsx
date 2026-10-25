'use client';

import { useParams, useRouter } from 'next/navigation';
import { useLayoutEffect } from 'react';
import { toast } from 'sonner';

import { ChatView, useChatContext } from '@/components/chat';

/** Existing conversation page — shows the conversation full screen */
const ChatConversationPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { openConversation } = useChatContext();

  // Show this conversation (a no-op if it's already active, e.g. just started or expanded from
  // the drawer). A layout effect starts the load before paint, so the first frame is the loading
  // skeleton rather than whatever conversation was showing before.
  useLayoutEffect(() => {
    let isCurrent = true;
    openConversation(id).catch(() => {
      // Ignore failures from a load this page has since moved on from
      if (!isCurrent) {
        return;
      }
      // The URL is stale (conversation deleted, wrong stage, hand-typed bad ID)
      toast.error(`Unable to load conversation ${id}`);
      router.replace('/chat');
    });
    return () => {
      isCurrent = false;
    };
  }, [id, openConversation, router]);

  return <ChatView />;
};

export default ChatConversationPage;
