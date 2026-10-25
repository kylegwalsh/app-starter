'use client';

import { useEffect } from 'react';

import { ChatView, useChatContext } from '@/components/chat';

/** New conversation page */
const ChatPage = () => {
  const { startNewConversation } = useChatContext();

  // When landing on the /chat page, we clear any active conversations that
  // may be active in the chat drawer (fresh conversation)
  useEffect(() => {
    startNewConversation();
  }, [startNewConversation]);

  return <ChatView />;
};

export default ChatPage;
