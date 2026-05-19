'use client';

import { ChatProvider } from '@/components/chat/chat-provider';
import { ChatView } from '@/components/chat/chat-view';

/** New conversation page */
const ChatPage = () => {
  return (
    <ChatProvider>
      <ChatView />
    </ChatProvider>
  );
};

export default ChatPage;
