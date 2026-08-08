import Modal from '@components/ui/Modal';
import { useChat } from '@context/ChatContext';

export default function ForwardModal({ isOpen, onClose, onPick, messageCount = 1 }) {
  const { conversations, activeChat } = useChat();

  const list = (conversations || []).filter((c) => String(c.id) !== String(activeChat?.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        messageCount > 1
          ? `فوروارد ${messageCount.toLocaleString('fa-IR')} پیام`
          : 'فوروارد پیام'
      }
      size="sm"
    >
      {list.length === 0 ? (
        <p className="text-ink-muted text-sm text-center py-6">گفتگوی دیگری برای فوروارد نیست</p>
      ) : (
        <div className="max-h-72 overflow-y-auto -mx-1 space-y-1">
          {list.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onPick?.(conv)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right hover:bg-white/10 transition-colors"
            >
              <img
                src={conv.avatar}
                alt=""
                className="w-10 h-10 rounded-xl object-cover bg-surface-muted shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-ink text-sm font-medium truncate">{conv.name}</div>
                <div className="text-ink-muted text-xs truncate">{conv.lastMessage || '—'}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
