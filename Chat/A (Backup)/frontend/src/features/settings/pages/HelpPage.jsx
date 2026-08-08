import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import Input from '@components/ui/Input';
import { TgCell, TgNavHeader, TgSection } from '../components/TgUi';

const FAQ = [
  {
    q: 'نوین چت چیست؟',
    a: 'پیام‌رسان امن برای ارتباط سریع با گفتگوهای شخصی، گروه و کانال.',
  },
  {
    q: 'چطور مخاطب اضافه کنم؟',
    a: 'از بخش مخاطبین یا جستجوی نام کاربری می‌توانید مخاطب جدید اضافه کنید.',
  },
  {
    q: 'اعلان‌ها کار نمی‌کنند',
    a: 'تنظیمات اعلان سیستم و بخش «اعلان‌ها و صداها» در برنامه را بررسی کنید.',
  },
  {
    q: 'چطور حساب را حذف کنم؟',
    a: 'از مسیر حساب من → حذف حساب کاربری می‌توانید حساب را برای همیشه حذف کنید.',
  },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const { settings, setSection } = useSettings();
  const { addToast } = useToast();
  const [openId, setOpenId] = useState(0);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');

  const submitQuestion = () => {
    const text = question.trim();
    if (!text) {
      addToast('متن سوال را وارد کنید', 'warning');
      return;
    }
    const tickets = Array.isArray(settings.help?.tickets) ? settings.help.tickets : [];
    setSection('help', {
      tickets: [
        {
          id: `t_${Date.now()}`,
          text,
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
        ...tickets,
      ].slice(0, 20),
    });
    setQuestion('');
    setAskOpen(false);
    addToast('سوال ثبت شد. پشتیبانی به‌زودی پاسخ می‌دهد.', 'success');
    window.location.href = `mailto:support@novin.chat?subject=${encodeURIComponent(
      'سوال از نوین چت'
    )}&body=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="راهنما" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      <TgSection>
        {FAQ.map((item, i) => (
          <TgCell
            key={item.q}
            title={item.q}
            subtitle={openId === i ? item.a : 'برای مشاهده پاسخ ضربه بزنید'}
            chevron={false}
            last={i === FAQ.length - 1}
            onClick={() => setOpenId((cur) => (cur === i ? -1 : i))}
          />
        ))}
      </TgSection>

      <TgSection>
        <TgCell
          title="سوال بپرسید"
          subtitle="پشتیبانی: support@novin.chat"
          last={!askOpen}
          onClick={() => setAskOpen((v) => !v)}
        />
        {askOpen ? (
          <div className="px-3 py-3 space-y-3 border-t border-hairline/[0.08]">
            <Input
              label="سوال شما"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              type="button"
              onClick={submitQuestion}
              className="w-full h-11 rounded-[10px] bg-[#3390EC] text-white text-[16px] font-medium"
            >
              ارسال سوال
            </button>
          </div>
        ) : null}
      </TgSection>

      {(settings.help?.tickets || []).length > 0 ? (
        <TgSection footer="سوال‌های ثبت‌شده روی این حساب.">
          {settings.help.tickets.slice(0, 5).map((t, i, arr) => (
            <TgCell
              key={t.id}
              title={t.text}
              value={t.status === 'pending' ? 'در انتظار' : t.status}
              chevron={false}
              last={i === arr.length - 1}
            />
          ))}
        </TgSection>
      ) : null}

      <TgSection>
        <TgCell title="نسخه" value="1.0.0" chevron={false} last />
      </TgSection>
    </div>
  );
}
