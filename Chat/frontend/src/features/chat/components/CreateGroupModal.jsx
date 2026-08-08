import { useState, useEffect } from 'react';
import Modal from '@components/ui/Modal';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';
import Avatar from '@components/ui/Avatar';
import { contactsService } from '@services/contactsService';
import Spinner from '@components/ui/Spinner';

export default function CreateGroupModal({ isOpen, onClose, onSubmit, loading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingContacts(true);
    contactsService.getContacts().then(setContacts).finally(() => setLoadingContacts(false));
  }, [isOpen]);

  const toggleMember = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || selectedIds.length === 0) return;
    onSubmit({ name: name.trim(), description: description.trim(), memberIds: selectedIds });
    setName('');
    setDescription('');
    setSelectedIds([]);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ایجاد گروه جدید" size="lg">
      <div className="space-y-4">
        <Input
          label="نام گروه"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: تیم پروژه"
        />
        <Input
          label="توضیحات (اختیاری)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="درباره گروه..."
        />

        <div>
          <p className="text-sm text-ink-secondary mb-2">انتخاب اعضا ({selectedIds.length})</p>
          {loadingContacts ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl glass-card p-2">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggleMember(contact.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors ${
                    selectedIds.includes(contact.id)
                      ? 'bg-npurple-borders/30 border border-npurple-borders/50'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <Avatar src={contact.avatar} alt={contact.name} size="sm" online={contact.online} />
                  <span className="text-ink text-sm">{contact.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          loading={loading}
          disabled={!name.trim() || selectedIds.length === 0}
        >
          ایجاد گروه
        </Button>
      </div>
    </Modal>
  );
}
