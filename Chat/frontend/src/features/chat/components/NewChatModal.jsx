import { useState, useEffect } from 'react';
import Modal from '@components/ui/Modal';
import Input from '@components/ui/Input';
import Avatar from '@components/ui/Avatar';
import Spinner from '@components/ui/Spinner';
import { contactsService } from '@services/contactsService';
import { useDebounce } from '@hooks/useDebounce';

export default function NewChatModal({ isOpen, onClose, onSelectContact, placement = 'center' }) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const fetch = debouncedSearch
      ? contactsService.searchContacts(debouncedSearch)
      : contactsService.getContacts();
    fetch.then(setContacts).finally(() => setLoading(false));
  }, [isOpen, debouncedSearch]);

  const handleSelect = (contact) => {
    onSelectContact(contact);
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="گفتگوی جدید" size="md" placement={placement}>
      <div className="space-y-4">
        <Input
          placeholder="جستجوی مخاطب..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : contacts.length === 0 ? (
          <p className="text-center text-ink-muted py-8 text-sm">مخاطبی یافت نشد</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleSelect(contact)}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass-card hover:bg-white/10 transition-colors"
              >
                <Avatar src={contact.avatar} alt={contact.name} size="sm" online={contact.online} />
                <div className="text-right">
                  <div className="text-ink text-sm">{contact.name}</div>
                  <div className="text-ink-muted text-xs ltr">{contact.phone}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
