import List from "../list/List";
import Chat from "../chat/Chat";
import Detail from "../detail/Detail";
import useChatStore from "../../lib/chatStore";

/**
 * Mobile (<768px): sidebar HOẶC khung chat (theo chatId).
 * Tablet (md+): sidebar ~32% + chat.
 * Desktop (lg+): thêm panel Detail.
 */
const ChatLayout = () => {
  const { chatId } = useChatStore();
  const isChatOpen = Boolean(chatId);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:flex-row">
      <aside
        className={`flex min-h-0 w-full shrink-0 flex-col border-white/10 md:w-[32%] md:min-w-[260px] md:max-w-[380px] md:border-r lg:w-[30%] ${
          isChatOpen ? "hidden md:flex" : "flex"
        }`}
        aria-label="Danh sách cuộc trò chuyện"
      >
        <List />
      </aside>

      {isChatOpen && (
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          aria-label="Khung trò chuyện"
        >
          <Chat />
        </section>
      )}

      {!isChatOpen && (
        <div className="hidden flex-1 items-center justify-center p-6 text-center text-sm text-slate-400 md:flex">
          Chọn một cuộc trò chuyện để bắt đầu nhắn tin
        </div>
      )}

      {isChatOpen && (
        <aside
          className="hidden min-h-0 shrink-0 flex-col border-l border-white/10 lg:flex lg:w-[28%] lg:max-w-[340px]"
          aria-label="Thông tin cuộc trò chuyện"
        >
          <Detail />
        </aside>
      )}
    </div>
  );
};

export default ChatLayout;
