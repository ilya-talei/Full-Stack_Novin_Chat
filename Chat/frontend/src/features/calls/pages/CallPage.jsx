import { useEffect, useMemo, useState } from 'react';
import { FiPhone, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import Spinner from '@components/ui/Spinner';
import { useCall } from '@context/CallContext';
import { useChat } from '@context/ChatContext';
import { contactsService } from '@services/contactsService';
import { useToast } from '@components/ui/Toast';
import './call-page.css';

export default function CallPage() {
  const { isInCall, callContact, callConversation, error } = useCall();
  const { conversations } = useChat();
  const { addToast } = useToast();
  const [tab, setTab] = useState('contacts');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    contactsService
      .getContacts()
      .then((list) => {
        if (alive) setContacts(list);
      })
      .catch(() => {
        if (alive) addToast('بارگذاری مخاطبین ناموفق بود', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [addToast]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const groups = useMemo(
    () =>
      (conversations || []).filter(
        (c) => c.type === 'groups' || c.type === 'group'
      ),
    [conversations]
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [contacts, search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name?.toLowerCase().includes(q));
  }, [groups, search]);

  if (isInCall) {
    return (
      <div className="call-page call-page--busy">
        <p>تماس در جریان است...</p>
      </div>
    );
  }

  return (
    <div className="call-page">
      <header className="call-page__head">
        <h1>تماس</h1>
        <p className="call-page__sub">یک تماس واحد — دوربین را وسط تماس روشن کنید</p>
      </header>

      <div className="call-page__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'contacts'}
          className={tab === 'contacts' ? 'is-on' : ''}
          onClick={() => setTab('contacts')}
        >
          مخاطبین
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'groups'}
          className={tab === 'groups' ? 'is-on' : ''}
          onClick={() => setTab('groups')}
        >
          گروه‌ها
        </button>
      </div>

      <label className="call-page__search">
        <FiSearch size={16} aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو..."
        />
        {search ? (
          <button type="button" onClick={() => setSearch('')} aria-label="پاک کردن">
            <FiX size={14} />
          </button>
        ) : null}
      </label>

      <div className="call-page__list">
        {loading ? (
          <div className="call-page__empty">
            <Spinner />
          </div>
        ) : tab === 'contacts' ? (
          filteredContacts.length === 0 ? (
            <div className="call-page__empty">مخاطبی یافت نشد</div>
          ) : (
            filteredContacts.map((c) => (
              <div key={c.id} className="call-row">
                <Avatar src={c.avatar} alt={c.name} size="md" />
                <div className="call-row__meta">
                  <span className="call-row__name">{c.name}</span>
                  <span className="call-row__sub">
                    {c.online ? 'آنلاین' : c.username || c.phone || 'مخاطب'}
                  </span>
                </div>
                <div className="call-row__actions">
                  <button
                    type="button"
                    className="call-row__btn call-row__btn--primary"
                    title="تماس"
                    onClick={() => callContact(c, { video: false })}
                  >
                    <FiPhone size={18} />
                    تماس
                  </button>
                </div>
              </div>
            ))
          )
        ) : filteredGroups.length === 0 ? (
          <div className="call-page__empty">
            <FiUsers size={22} className="opacity-50 mb-2" />
            گروهی برای تماس نیست
            <span className="block text-xs mt-1 opacity-70">کانال‌ها قابل تماس نیستند</span>
          </div>
        ) : (
          filteredGroups.map((g) => (
            <div key={g.id} className="call-row">
              <Avatar src={g.avatar} alt={g.name} size="md" />
              <div className="call-row__meta">
                <span className="call-row__name">{g.name}</span>
                <span className="call-row__sub">{g.memberCount ?? '—'} عضو</span>
              </div>
              <div className="call-row__actions">
                <button
                  type="button"
                  className="call-row__btn call-row__btn--primary"
                  title="تماس گروهی"
                  onClick={() => callConversation(g, { video: false })}
                >
                  <FiPhone size={18} />
                  تماس
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
