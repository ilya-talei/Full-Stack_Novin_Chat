import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { useChat } from '@context/ChatContext';
import { useToast } from '@components/ui/Toast';
import Input from '@components/ui/Input';
import { ROUTES } from '@constants/routes';
import { TgCell, TgNavHeader, TgSection } from '../components/TgUi';

const BUILTIN = new Set(['all', 'unread', 'personal', 'groups', 'channels']);

export default function FoldersPage() {
  const navigate = useNavigate();
  const { settings, setSection } = useSettings();
  const { conversations, loadConversations } = useChat();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadConversations?.();
  }, [loadConversations]);

  const editing = useMemo(
    () => settings.folders.items.find((f) => f.id === editingId) || null,
    [settings.folders.items, editingId]
  );

  const addFolder = () => {
    const title = name.trim();
    if (!title) return;
    setSection('folders', {
      items: [
        ...settings.folders.items,
        { id: `f_${Date.now()}`, title, pinned: false, chatIds: [] },
      ],
    });
    setName('');
    addToast('پوشه اضافه شد', 'success');
  };

  const removeFolder = (id) => {
    if (BUILTIN.has(id) || id === 'all') return;
    setSection('folders', {
      items: settings.folders.items.filter((f) => f.id !== id),
    });
    if (editingId === id) setEditingId(null);
    addToast('پوشه حذف شد', 'success');
  };

  const toggleChatInFolder = (chatId) => {
    if (!editing) return;
    const current = Array.isArray(editing.chatIds) ? editing.chatIds : [];
    const nextIds = current.includes(chatId)
      ? current.filter((id) => id !== chatId)
      : [...current, chatId];
    setSection('folders', {
      items: settings.folders.items.map((f) =>
        f.id === editing.id ? { ...f, chatIds: nextIds } : f
      ),
    });
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="پوشه‌ها" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      <TgSection footer="برای پوشه‌های سفارشی، گفتگوها را انتخاب کنید.">
        {settings.folders.items.map((folder, i) => (
          <TgCell
            key={folder.id}
            title={folder.title}
            value={
              BUILTIN.has(folder.id)
                ? folder.pinned
                  ? 'پیش‌فرض'
                  : ''
                : `${(folder.chatIds || []).length} گفتگو`
            }
            chevron={!BUILTIN.has(folder.id)}
            last={i === settings.folders.items.length - 1}
            onClick={
              BUILTIN.has(folder.id)
                ? undefined
                : () => setEditingId((id) => (id === folder.id ? null : folder.id))
            }
            subtitle={
              BUILTIN.has(folder.id)
                ? 'پوشه سیستم'
                : editingId === folder.id
                  ? 'در حال ویرایش'
                  : 'برای مدیریت گفتگوها ضربه بزنید'
            }
          />
        ))}
      </TgSection>

      {editing ? (
        <TgSection footer={`گفتگوهای پوشه «${editing.title}»`}>
          {conversations.length === 0 ? (
            <TgCell title="گفتگویی نیست" chevron={false} last />
          ) : (
            conversations.map((c, i) => {
              const selected = (editing.chatIds || []).includes(c.id);
              return (
                <TgCell
                  key={c.id}
                  title={c.name}
                  subtitle={c.type === 'personal' ? 'شخصی' : c.type === 'groups' ? 'گروه' : 'کانال'}
                  chevron={false}
                  last={i === conversations.length - 1}
                  value={selected ? '✓' : ''}
                  onClick={() => toggleChatInFolder(c.id)}
                />
              );
            })
          )}
          <div className="px-3 py-3">
            <button
              type="button"
              onClick={() => removeFolder(editing.id)}
              className="w-full h-10 rounded-[10px] text-[#E53935] text-[15px] font-medium"
            >
              حذف پوشه
            </button>
          </div>
        </TgSection>
      ) : null}

      <TgSection>
        <div className="px-3 py-3 space-y-3">
          <Input
            label="نام پوشه جدید"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            onClick={addFolder}
            className="w-full h-11 rounded-[10px] bg-[#3390EC] text-white text-[16px] font-medium"
          >
            ایجاد پوشه
          </button>
        </div>
      </TgSection>
    </div>
  );
}
