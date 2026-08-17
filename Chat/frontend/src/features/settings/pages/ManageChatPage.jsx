import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCamera,
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '@components/ui/Avatar';
import Spinner from '@components/ui/Spinner';
import { useToast } from '@components/ui/Toast';
import { ROUTES } from '@constants/routes';
import { contactsService } from '@services/contactsService';
import { chatManagementService } from '@services/chatManagementService';
import { TgCell, TgNavHeader, TgSection, TgToggle } from '../components/TgUi';

const DEFAULT_PERMISSION_LABELS = {
  send_messages: 'ارسال متن',
  send_photos: 'ارسال عکس',
  send_videos: 'ارسال ویدیو',
  send_files: 'ارسال فایل',
  send_voice: 'ارسال پیام صوتی',
  send_video_messages: 'ارسال پیام ویدیویی',
  send_stickers: 'ارسال استیکر',
  send_gifs: 'ارسال GIF',
  send_links: 'ارسال لینک',
  send_polls: 'ساخت نظرسنجی',
  add_members: 'افزودن عضو',
  change_info: 'تغییر اطلاعات',
  pin_messages: 'سنجاق کردن پیام',
};

const ADMIN_PERMISSION_LABELS = {
  change_info: 'تغییر اطلاعات',
  post_messages: 'ارسال پیام',
  edit_messages: 'ویرایش پیام‌ها',
  delete_messages: 'حذف پیام‌ها',
  ban_users: 'مسدود کردن کاربران',
  invite_users: 'دعوت کاربران',
  pin_messages: 'سنجاق پیام‌ها',
  add_admins: 'افزودن مدیر',
  manage_call: 'مدیریت تماس',
  manage_topics: 'مدیریت موضوعات',
  anonymous: 'ناشناس ماندن',
};

const SLOW_MODES = [
  [0, 'خاموش'],
  [10, '۱۰ ثانیه'],
  [30, '۳۰ ثانیه'],
  [60, '۱ دقیقه'],
  [300, '۵ دقیقه'],
  [900, '۱۵ دقیقه'],
  [3600, '۱ ساعت'],
];

function textInputClass() {
  return 'w-full rounded-xl border border-hairline/20 bg-transparent px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted/60 focus:border-[#3390EC]';
}

function PermissionRows({ labels, value, onChange, disabled = false }) {
  return Object.entries(labels).map(([key, label], index, rows) => (
    <TgCell
      key={key}
      title={label}
      chevron={false}
      last={index === rows.length - 1}
      right={
        <TgToggle
          checked={value[key] !== false}
          disabled={disabled}
          onChange={(checked) => onChange({ ...value, [key]: checked })}
        />
      }
    />
  ));
}

function MemberEditor({ member, chatId, onChange, onClose }) {
  const { addToast } = useToast();
  const [role, setRole] = useState(member.role);
  const [restricted, setRestricted] = useState(member.restricted);
  const [customTitle, setCustomTitle] = useState(member.customTitle);
  const [permissions, setPermissions] = useState(member.adminPermissions);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      let updated = member;
      if (restricted !== member.restricted) {
        updated = await chatManagementService.setRestriction(chatId, member.id, restricted);
      }
      if (role === 'admin') {
        updated = await chatManagementService.updateAdmin(chatId, member.id, {
          role: member.role,
          customTitle,
          adminPermissions: permissions,
        });
      } else if (member.role === 'admin') {
        updated = await chatManagementService.removeAdmin(chatId, member.id);
      }
      onChange({ ...member, ...updated, role, restricted, customTitle, adminPermissions: permissions });
      addToast('دسترسی عضو ذخیره شد', 'success');
      onClose();
    } catch (err) {
      addToast(err?.message || 'ذخیره دسترسی ناموفق بود', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-hairline/[0.08] bg-black/[0.025] px-3.5 py-4 dark:bg-white/[0.025]">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRole(role === 'admin' ? 'member' : 'admin')}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-[14px] ${
            role === 'admin'
              ? 'border-[#3390EC] bg-[#3390EC]/10 text-[#3390EC]'
              : 'border-hairline/20 text-ink'
          }`}
        >
          <FiShield className="ml-1 inline" /> مدیر
        </button>
        <button
          type="button"
          onClick={() => setRestricted(!restricted)}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-[14px] ${
            restricted
              ? 'border-[#E53935] bg-[#E53935]/10 text-[#E53935]'
              : 'border-hairline/20 text-ink'
          }`}
        >
          محدودسازی
        </button>
      </div>

      {role === 'admin' ? (
        <div className="mt-4">
          <input
            value={customTitle}
            maxLength={32}
            onChange={(event) => setCustomTitle(event.target.value)}
            placeholder="عنوان سفارشی مدیر"
            className={textInputClass()}
          />
          <p className="mb-2 mt-4 text-[13px] font-medium text-ink-muted">مجوزهای مدیر</p>
          <div className="overflow-hidden rounded-xl border border-hairline/[0.08] bg-[rgb(var(--surface-elevated))]">
            <PermissionRows
              labels={ADMIN_PERMISSION_LABELS}
              value={permissions}
              onChange={setPermissions}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] text-ink-muted">
          انصراف
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-xl bg-[#3390EC] px-5 py-2 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </button>
      </div>
    </div>
  );
}

export default function ManageChatPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const avatarInputRef = useRef(null);
  const previewUrlRef = useRef('');
  const [chat, setChat] = useState(null);
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [busyMemberId, setBusyMemberId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [chatData, memberData] = await Promise.all([
        chatManagementService.getChat(chatId),
        chatManagementService.getMembers(chatId),
      ]);
      setChat(chatData);
      setMembers(memberData);
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات مدیریت ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => {
      window.clearTimeout(timer);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [load]);

  const patchChat = (key, value) => setChat((current) => ({ ...current, [key]: value }));

  const saveChat = async () => {
    if (!chat.name.trim()) {
      addToast('نام گروه یا کانال نمی‌تواند خالی باشد', 'error');
      return;
    }
    if (chat.isPublic && !/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(chat.username)) {
      addToast('نام کاربری عمومی باید ۵ تا ۳۲ کاراکتر لاتین باشد', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await chatManagementService.updateChat(chatId, chat);
      setChat((current) => ({ ...current, ...updated }));
      addToast('تنظیمات ذخیره شد', 'success');
    } catch (err) {
      addToast(err?.message || 'ذخیره تنظیمات ناموفق بود', 'error');
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      addToast('فقط تصویر JPG، PNG یا WebP مجاز است', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('حجم تصویر باید کمتر از ۵ مگابایت باشد', 'error');
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    patchChat('avatar', previewUrlRef.current);
    setAvatarUploading(true);
    try {
      const uploaded = await chatManagementService.uploadAvatar(chatId, file);
      if (typeof uploaded === 'string' && /^https?:\/\//i.test(uploaded)) {
        patchChat('avatar', uploaded);
      }
      addToast('تصویر گفتگو به‌روز شد', 'success');
    } catch (err) {
      addToast(err?.message || 'آپلود تصویر ناموفق بود', 'error');
      load();
    } finally {
      setAvatarUploading(false);
    }
  };

  const openContacts = async () => {
    setAddOpen(true);
    if (contacts.length) return;
    try {
      setContacts(await contactsService.getContacts());
    } catch (err) {
      addToast(err?.message || 'دریافت مخاطبین ناموفق بود', 'error');
    }
  };

  const memberIds = useMemo(() => new Set(members.map((member) => member.id)), [members]);
  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();
    return contacts.filter(
      (contact) =>
        !memberIds.has(contact.id) &&
        (!query ||
          contact.name.toLowerCase().includes(query) ||
          contact.username?.toLowerCase().includes(query))
    );
  }, [contactSearch, contacts, memberIds]);

  const addMember = async (contact) => {
    setBusyMemberId(contact.id);
    try {
      const added = await chatManagementService.addMember(chatId, contact.id);
      setMembers((current) => [...current, { ...added, ...contact }]);
      addToast('عضو اضافه شد', 'success');
    } catch (err) {
      addToast(err?.message || 'افزودن عضو ناموفق بود', 'error');
    } finally {
      setBusyMemberId(null);
    }
  };

  const removeMember = async (member) => {
    setBusyMemberId(member.id);
    try {
      await chatManagementService.removeMember(chatId, member.id);
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setRemovingMemberId(null);
      addToast('عضو حذف شد', 'success');
    } catch (err) {
      addToast(err?.message || 'حذف عضو ناموفق بود', 'error');
    } finally {
      setBusyMemberId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-full justify-center bg-[rgb(var(--surface-panel))] py-20"><Spinner /></div>;
  }

  if (error || !chat) {
    return (
      <div className="min-h-full bg-[rgb(var(--surface-panel))]">
        <TgNavHeader title="مدیریت گفتگو" onBack={() => navigate(ROUTES.SETTINGS_MANAGED_CHATS)} />
        <div className="px-5 py-20 text-center">
          <p className="text-[#E53935]">{error || 'گفتگو یافت نشد.'}</p>
          <button type="button" onClick={load} className="mt-4 text-[#3390EC]">تلاش دوباره</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader
        title={chat.type === 'channel' ? 'مدیریت کانال' : 'مدیریت گروه'}
        onBack={() => navigate(ROUTES.SETTINGS_MANAGED_CHATS)}
        right={
          <button
            type="button"
            disabled={saving}
            onClick={saveChat}
            className="px-2 py-1 text-[16px] font-medium text-[#3390EC] disabled:opacity-50"
          >
            {saving ? '…' : 'ذخیره'}
          </button>
        }
      />

      <div className="flex flex-col items-center px-4 pb-5 pt-6">
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => avatarInputRef.current?.click()}
          className="group relative rounded-full disabled:opacity-70"
          aria-label="تغییر تصویر گفتگو"
        >
          <Avatar src={chat.avatar} alt={chat.name} size="lg" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white transition-colors group-hover:bg-black/50">
            {avatarUploading ? <Spinner /> : <FiCamera size={25} />}
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={pickAvatar}
        />
        <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-2 text-[14px] text-[#3390EC]">
          تغییر تصویر
        </button>
      </div>

      <TgSection footer="نام و توضیحات برای همه اعضا قابل مشاهده است.">
        <div className="space-y-3 px-3 py-3">
          <input
            value={chat.name}
            maxLength={80}
            onChange={(event) => patchChat('name', event.target.value)}
            placeholder="نام"
            className={textInputClass()}
          />
          <textarea
            value={chat.description}
            maxLength={255}
            rows={3}
            onChange={(event) => patchChat('description', event.target.value)}
            placeholder="توضیحات"
            className={`${textInputClass()} resize-none`}
          />
        </div>
      </TgSection>

      <TgSection footer={chat.isPublic ? 'با نام کاربری عمومی، دیگران می‌توانند گفتگو را پیدا کنند.' : 'فقط کاربران دارای لینک دعوت می‌توانند وارد شوند.'}>
        <TgCell
          title={chat.isPublic ? 'عمومی' : 'خصوصی'}
          subtitle="نوع دسترسی گفتگو"
          chevron={false}
          last={!chat.isPublic}
          right={<TgToggle checked={chat.isPublic} onChange={(value) => patchChat('isPublic', value)} />}
        />
        {chat.isPublic ? (
          <div className="px-3 py-3">
            <div className="flex items-center rounded-xl border border-hairline/20 px-3 focus-within:border-[#3390EC]">
              <span className="text-ink-muted">@</span>
              <input
                dir="ltr"
                value={chat.username}
                maxLength={32}
                onChange={(event) =>
                  patchChat('username', event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                }
                placeholder="public_username"
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-left text-[15px] text-ink outline-none"
              />
            </div>
          </div>
        ) : null}
      </TgSection>

      <TgSection>
        <TgCell
          title="نمایش تاریخچه برای اعضای جدید"
          chevron={false}
          right={<TgToggle checked={chat.historyVisible} onChange={(value) => patchChat('historyVisible', value)} />}
        />
        <TgCell
          title="امضای مدیر"
          subtitle="نام مدیر کنار پیام‌های مدیریتی نمایش داده شود"
          chevron={false}
          right={<TgToggle checked={chat.signaturesEnabled} onChange={(value) => patchChat('signaturesEnabled', value)} />}
        />
        <div className="flex min-h-[52px] items-center gap-3 px-3.5">
          <span className="flex-1 text-[16px] text-ink">حالت آهسته</span>
          <select
            value={chat.slowModeSeconds}
            onChange={(event) => patchChat('slowModeSeconds', Number(event.target.value))}
            className="max-w-[48%] bg-transparent py-2 text-[15px] text-[#3390EC] outline-none"
          >
            {SLOW_MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </TgSection>

      <TgSection footer="این مجوزها به‌صورت پیش‌فرض برای اعضای عادی اعمال می‌شوند.">
        <button
          type="button"
          onClick={() => setPermissionsOpen(!permissionsOpen)}
          className="flex min-h-[52px] w-full items-center gap-3 px-3.5 text-right"
          aria-expanded={permissionsOpen}
        >
          <FiShield className="text-[#3390EC]" size={20} />
          <span className="flex-1 text-[16px] text-ink">مجوزهای پیش‌فرض اعضا</span>
          {permissionsOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {permissionsOpen ? (
          <div className="border-t border-hairline/[0.08]">
            <PermissionRows
              labels={DEFAULT_PERMISSION_LABELS}
              value={chat.defaultPermissions}
              onChange={(value) => patchChat('defaultPermissions', value)}
            />
          </div>
        ) : null}
      </TgSection>

      <TgSection footer={`${members.length.toLocaleString('fa-IR')} عضو`}>
        <button
          type="button"
          onClick={() => setMembersOpen(!membersOpen)}
          className="flex min-h-[52px] w-full items-center gap-3 px-3.5 text-right"
          aria-expanded={membersOpen}
        >
          <FiUsers className="text-[#3390EC]" size={20} />
          <span className="flex-1 text-[16px] text-ink">اعضا و مدیران</span>
          {membersOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {membersOpen ? (
          <div className="border-t border-hairline/[0.08]">
            <button
              type="button"
              onClick={openContacts}
              className="flex min-h-[50px] w-full items-center gap-3 border-b border-hairline/[0.08] px-3.5 text-[#3390EC]"
            >
              <FiPlus size={20} />
              <span>افزودن عضو از مخاطبین</span>
            </button>

            {addOpen ? (
              <div className="border-b border-hairline/[0.08] bg-black/[0.02] p-3 dark:bg-white/[0.02]">
                <div className="flex items-center rounded-xl border border-hairline/20 px-3">
                  <FiSearch className="text-ink-muted" />
                  <input
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder="جستجوی مخاطب"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[14px] text-ink outline-none"
                  />
                  <button type="button" onClick={() => setAddOpen(false)} className="text-[13px] text-[#3390EC]">بستن</button>
                </div>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl bg-[rgb(var(--surface-elevated))]">
                  {filteredContacts.length ? filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      disabled={busyMemberId === contact.id}
                      onClick={() => addMember(contact)}
                      className="flex min-h-[56px] w-full items-center gap-3 border-b border-hairline/[0.08] px-3 text-right last:border-0 disabled:opacity-50"
                    >
                      <Avatar src={contact.avatar} alt={contact.name} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{contact.name}</span>
                      <FiPlus className="text-[#3390EC]" />
                    </button>
                  )) : (
                    <p className="p-5 text-center text-[13px] text-ink-muted">مخاطب قابل افزودنی یافت نشد.</p>
                  )}
                </div>
              </div>
            ) : null}

            {members.map((member) => (
              <div key={member.id} className="border-b border-hairline/[0.08] last:border-0">
                <div className="flex min-h-[66px] items-center gap-3 px-3.5">
                  <Avatar src={member.avatar} alt={member.name} size="sm" />
                  <button
                    type="button"
                    onClick={() =>
                      member.role === 'owner'
                        ? null
                        : setEditingMemberId(editingMemberId === member.id ? null : member.id)
                    }
                    className="min-w-0 flex-1 text-right"
                  >
                    <span className="block truncate text-[15px] text-ink">{member.name}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-muted">
                      {member.role === 'owner'
                        ? 'مالک'
                        : member.role === 'admin'
                          ? <><FiShield /> {member.customTitle || 'مدیر'}</>
                          : <><FiUser /> عضو</>}
                      {member.restricted ? ' · محدودشده' : ''}
                    </span>
                  </button>
                  {member.role !== 'owner' ? (
                  <button
                    type="button"
                    disabled={busyMemberId === member.id}
                    onClick={() =>
                      setRemovingMemberId(removingMemberId === member.id ? null : member.id)
                    }
                    aria-label={`حذف ${member.name}`}
                    className="p-2 text-[#E53935] disabled:opacity-50"
                  >
                    <FiTrash2 size={18} />
                  </button>
                  ) : null}
                </div>
                {removingMemberId === member.id ? (
                  <div className="flex items-center gap-2 border-t border-hairline/[0.08] bg-[#E53935]/[0.06] px-3.5 py-3">
                    <p className="min-w-0 flex-1 text-[13px] text-ink">
                      «{member.name}» از گفتگو حذف شود؟
                    </p>
                    <button
                      type="button"
                      onClick={() => setRemovingMemberId(null)}
                      className="px-2 py-1.5 text-[13px] text-ink-muted"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      disabled={busyMemberId === member.id}
                      onClick={() => removeMember(member)}
                      className="rounded-lg bg-[#E53935] px-3 py-1.5 text-[13px] text-white disabled:opacity-50"
                    >
                      حذف
                    </button>
                  </div>
                ) : null}
                {editingMemberId === member.id ? (
                  <MemberEditor
                    member={member}
                    chatId={chatId}
                    onClose={() => setEditingMemberId(null)}
                    onChange={(updated) =>
                      setMembers((current) =>
                        current.map((item) => item.id === updated.id ? updated : item)
                      )
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </TgSection>
    </div>
  );
}
