import { useState } from 'react';
import Modal from '@components/ui/Modal';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';

export default function CreateChannelModal({ isOpen, onClose, onSubmit, loading, placement = 'center' }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), isPublic });
    setName('');
    setDescription('');
    setIsPublic(true);
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="ایجاد کانال جدید" size="md" placement={placement}>
      <div className="space-y-4">
        <Input
          label="نام کانال"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: اخبار فناوری"
        />
        <Input
          label="توضیحات (اختیاری)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="درباره کانال..."
        />

        <label className="flex items-center justify-between glass-card rounded-xl p-3 cursor-pointer">
          <div>
            <p className="text-ink text-sm">کانال عمومی</p>
            <p className="text-ink-muted text-xs mt-0.5">هر کسی می‌تواند عضو شود</p>
          </div>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-5 w-5 accent-npurple-borders"
          />
        </label>

        <Button className="w-full" onClick={handleSubmit} loading={loading} disabled={!name.trim()}>
          ایجاد کانال
        </Button>
      </div>
    </Modal>
  );
}
