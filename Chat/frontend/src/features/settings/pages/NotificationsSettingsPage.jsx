import { useNavigate } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import { ROUTES } from '@constants/routes';
import { TgCell, TgNavHeader, TgSection, TgToggle } from '../components/TgUi';

function ToggleRow({ title, subtitle, path, last }) {
  const { settings, patch } = useSettings();
  const value = path.split('.').reduce((acc, k) => acc?.[k], settings);
  return (
    <TgCell
      title={title}
      subtitle={subtitle}
      chevron={false}
      last={last}
      right={<TgToggle checked={Boolean(value)} onChange={(v) => patch(path, v)} />}
    />
  );
}

export default function NotificationsSettingsPage() {
  const navigate = useNavigate();
  const { resetSection } = useSettings();
  const { addToast } = useToast();

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="اعلان‌ها و صداها" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />

      <TgSection footer="اعلان پیام‌های خصوصی، گروه و کانال.">
        <ToggleRow title="گفتگوهای خصوصی" path="notifications.privateChats" />
        <ToggleRow title="گروه‌ها" path="notifications.groups" />
        <ToggleRow title="کانال‌ها" path="notifications.channels" last />
      </TgSection>

      <TgSection>
        <ToggleRow title="واکنش‌ها" path="notifications.reactions" />
        <ToggleRow title="منشن‌ها" path="notifications.mentions" />
        <ToggleRow title="پیام‌های پین شده" path="notifications.pinnedMessages" />
        <ToggleRow title="پیوستن مخاطب" path="notifications.contactJoined" last />
      </TgSection>

      <TgSection footer="پیش‌نمایش متن پیام در اعلان.">
        <ToggleRow title="صدا" path="notifications.sound" />
        <ToggleRow title="لرزش" path="notifications.vibrate" />
        <ToggleRow title="پیش‌نمایش پیام" path="notifications.preview" />
        <ToggleRow title="شمارش خوانده‌نشده" path="notifications.countUnread" last />
      </TgSection>

      <TgSection>
        <ToggleRow title="صدای داخل برنامه" path="notifications.inAppSounds" />
        <ToggleRow title="لرزش داخل برنامه" path="notifications.inAppVibrate" />
        <ToggleRow title="پیش‌نمایش داخل برنامه" path="notifications.inAppPreview" last />
      </TgSection>

      <TgSection>
        <TgCell
          title="بازنشانی همه اعلان‌ها"
          danger
          chevron={false}
          last
          onClick={() => {
            resetSection('notifications');
            addToast('اعلان‌ها بازنشانی شد', 'success');
          }}
        />
      </TgSection>
    </div>
  );
}
