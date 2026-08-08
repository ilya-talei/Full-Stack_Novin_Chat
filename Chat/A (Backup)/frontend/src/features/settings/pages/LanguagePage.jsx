import { useNavigate } from 'react-router-dom';
import { useSettings } from '@context/SettingsContext';
import { ROUTES } from '@constants/routes';
import { TgNavHeader, TgRadioRow, TgSection } from '../components/TgUi';

export default function LanguagePage() {
  const navigate = useNavigate();
  const { settings, patch } = useSettings();

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="زبان" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      <TgSection footer="Changing language updates layout direction (RTL/LTR) across the app. تغییر زبان جهت صفحه را عوض می‌کند.">
        <TgRadioRow
          title="فارسی"
          selected={settings.language === 'fa'}
          onSelect={() => patch('language', 'fa')}
        />
        <TgRadioRow
          title="English"
          selected={settings.language === 'en'}
          onSelect={() => patch('language', 'en')}
          last
        />
      </TgSection>
    </div>
  );
}
