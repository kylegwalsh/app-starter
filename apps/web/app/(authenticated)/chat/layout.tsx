import { ChatSidebar } from '@/components/chat';

/** Layout for the chat pages — sidebar + main content area */
const ChatLayout: FC = ({ children }) => {
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
};

export default ChatLayout;
