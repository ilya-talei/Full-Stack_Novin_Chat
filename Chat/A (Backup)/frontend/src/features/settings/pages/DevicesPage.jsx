import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMonitor } from 'react-icons/fi';
import { useToast } from '@components/ui/Toast';
import Spinner from '@components/ui/Spinner';
import { settingsService } from '@services/settingsService';
import { ROUTES } from '@constants/routes';
import { TgCell, TgIcon, TgNavHeader, TgSection } from '../components/TgUi';

export default function DevicesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await settingsService.getSessions();
      setSessions(list);
    } catch {
      addToast('خطا در دریافت دستگاه‌ها', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const terminateOthers = async () => {
    try {
      await settingsService.terminateOtherSessions();
      addToast('سایر نشست‌ها پایان یافت', 'success');
      await load();
    } catch {
      addToast('عملیات ناموفق بود', 'error');
    }
  };

  return (
    <div className="min-h-full pb-28 bg-[rgb(var(--surface-panel))]">
      <TgNavHeader title="دستگاه‌ها" onBack={() => navigate(ROUTES.ACCOUNT)} />
      <div className="h-3" />
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <TgSection footer="این دستگاه‌ها هم‌اکنون به حساب شما دسترسی دارند.">
            {sessions.length === 0 ? (
              <TgCell title="نشست فعالی نیست" chevron={false} last />
            ) : (
              sessions.map((session, i) => (
                <TgCell
                  key={session.id}
                  icon={
                    <TgIcon color="#007AFF">
                      <FiMonitor size={16} />
                    </TgIcon>
                  }
                  title={`${session.name}${session.isCurrent ? ' (این دستگاه)' : ''}`}
                  subtitle={`${session.platform} · ${session.location}`}
                  value={session.lastActive}
                  chevron={false}
                  last={i === sessions.length - 1}
                />
              ))
            )}
          </TgSection>
          <TgSection>
            <TgCell
              title="پایان سایر نشست‌ها"
              danger
              chevron={false}
              last
              onClick={terminateOthers}
            />
          </TgSection>
        </>
      )}
    </div>
  );
}
