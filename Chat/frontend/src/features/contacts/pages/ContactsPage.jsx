import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactsService } from '@services/contactsService';
import { useChat } from '@context/ChatContext';
import Avatar from '@components/ui/Avatar';
import Button from '@components/ui/Button';
import Modal from '@components/ui/Modal';
import Input from '@components/ui/Input';
import Spinner from '@components/ui/Spinner';
import GlassPanel from '@components/ui/GlassPanel';
import { useToast } from '@components/ui/Toast';
import { useFetch } from '@hooks/useFetch';
import { FiMessageCircle, FiSearch } from 'react-icons/fi';
import { ROUTES } from '@constants/routes';

export default function ContactsPage() {
  const fetchContacts = useCallback(() => contactsService.getContacts(), []);
  const { data, loading, refetch } = useFetch(fetchContacts);
  const contacts = Array.isArray(data) ? data : [];
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const { addToast } = useToast();
  const { startChatWithContact } = useChat();
  const navigate = useNavigate();

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.name?.includes(search) ||
      c.phone?.includes(search) ||
      c.username?.includes(search)
  );

  const handleAdd = async () => {
    if (!newContact.name || !newContact.phone) return;
    await contactsService.addContact(newContact);
    addToast('مخاطب اضافه شد', 'success');
    setModalOpen(false);
    setNewContact({ name: '', phone: '' });
    refetch();
  };

  const handleBlock = async (id) => {
    await contactsService.blockContact(id);
    addToast('مخاطب مسدود شد', 'warning');
    refetch();
  };

  const handleStartChat = async (contact) => {
    try {
      await startChatWithContact(contact);
      addToast(`گفتگو با ${contact.name}`, 'success');
      navigate(ROUTES.HOME);
    } catch {
      addToast('خطا در شروع گفتگو', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-6 min-h-full">
      <div className="sticky top-0 z-20 glass-bar px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-ink">مخاطبین</h1>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            + افزودن
          </Button>
        </div>
        <div className="glass-input flex items-center gap-2 px-4 py-2 rounded-2xl">
          <FiSearch className="text-ink-muted" />
          <input
            className="bg-transparent outline-none flex-1 text-sm text-ink placeholder:text-ink-muted"
            placeholder="جستجوی مخاطب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-3 mt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-ink-muted">مخاطبی وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((contact) => (
              <GlassPanel
                key={contact.id}
                variant="card"
                className="flex items-center justify-between p-3 rounded-2xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={contact.avatar}
                    alt={contact.name}
                    size="sm"
                    online={contact.online}
                  />
                  <div className="min-w-0">
                    <div className="text-ink text-sm font-medium truncate">
                      {contact.name}
                    </div>
                    <div className="text-ink-muted text-xs ltr truncate">{contact.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartChat(contact)}
                    className="p-2 rounded-xl hover:bg-npurple-borders/20 text-npurple-borders transition-colors"
                    title="شروع گفتگو"
                  >
                    <FiMessageCircle size={18} />
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleBlock(contact.id)}>
                    مسدود
                  </Button>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="افزودن مخاطب">
        <div className="space-y-4">
          <Input
            label="نام"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
          />
          <Input
            label="شماره"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
          />
          <Button className="w-full" onClick={handleAdd}>
            ذخیره
          </Button>
        </div>
      </Modal>
    </div>
  );
}
