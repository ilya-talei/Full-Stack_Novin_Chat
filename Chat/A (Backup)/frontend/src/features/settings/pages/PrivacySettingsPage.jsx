import { useNavigate, useParams } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { ROUTES } from '@constants/routes';
import { TgCell, TgNavHeader, TgRadioRow, TgSection, TgToggle } from '../components/TgUi';

const LABELS = {
  everybody: 'همه',
  contacts: 'مخاطبین من',
  nobody: 'هیچ‌کس',
};

const PRIVACY_ITEMS = [
  { key: 'phoneVisibility', title: 'شماره تلفن' },
  { key: 'lastSeen', title: 'آخرین بازدید و آنلاین' },
  { key: 'profilePhoto', title: 'عکس پروفایل' },
  { key: 'bio', title: 'درباره' },
  { key: 'birthday', title: 'تاریخ تولد' },
  { key: 'forwards', title: 'بازنشر پیام‌ها' },
  { key: 'calls', title: 'تماس‌ها' },
  { key: 'voiceMessages', title: 'پیام‌های صوتی' },
  { key: 'groups', title: 'گروه‌ها و کانال‌ها' },
];

export function PrivacySettingsPage() {
  const navigate = useNavigate();
  const { settings, patch } = useSettings();

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="حریم خصوصی و امنیت" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />

      <TgSection footer="چه کسانی می‌توانند این اطلاعات را ببینند.">
        {PRIVACY_ITEMS.map((item, i) => (
          <TgCell
            key={item.key}
            title={item.title}
            value={LABELS[settings.privacy[item.key]] || settings.privacy[item.key]}
            onClick={() => navigate(`${ROUTES.SETTINGS_PRIVACY}/${item.key}`)}
            last={i === PRIVACY_ITEMS.length - 1}
          />
        ))}
      </TgSection>

      <TgSection footer="اگر غیرفعال باشد، دیگران نمی‌فهمند پیامشان را خوانده‌اید.">
        <TgCell
          title="رسید خوانده شدن"
          chevron={false}
          last
          right={
            <TgToggle
              checked={settings.privacy.readReceipts}
              onChange={(v) => patch('privacy.readReceipts', v)}
            />
          }
        />
      </TgSection>

      <TgSection>
        <TgCell
          title="دعوت با لینک"
          chevron={false}
          last
          right={
            <TgToggle
              checked={settings.privacy.inviteLink}
              onChange={(v) => patch('privacy.inviteLink', v)}
            />
          }
        />
      </TgSection>

      <TgSection>
        <TgCell
          title="دستگاه‌های فعال"
          onClick={() => navigate(ROUTES.SETTINGS_DEVICES)}
        />
        <TgCell
          title="مسدود کردن کاربران"
          onClick={() => navigate(ROUTES.CONTACTS)}
          last
        />
      </TgSection>
    </div>
  );
}

export function PrivacyOptionPage() {
  const navigate = useNavigate();
  const { key } = useParams();
  const { settings, patch } = useSettings();
  const item = PRIVACY_ITEMS.find((p) => p.key === key);

  if (!item) {
    return null;
  }

  const options = ['everybody', 'contacts', 'nobody'];

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title={item.title} onBack={() => navigate(ROUTES.SETTINGS_PRIVACY)} />
      <div className="h-3" />
      <TgSection>
        {options.map((opt, i) => (
          <TgRadioRow
            key={opt}
            title={LABELS[opt]}
            selected={settings.privacy[key] === opt}
            onSelect={() => patch(`privacy.${key}`, opt)}
            last={i === options.length - 1}
          />
        ))}
      </TgSection>
    </div>
  );
}
