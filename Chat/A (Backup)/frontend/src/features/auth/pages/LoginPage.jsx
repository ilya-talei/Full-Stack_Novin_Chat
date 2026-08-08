import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/ui/Toast';
import { ROUTES } from '@constants/routes';
import { config } from '@constants/config';
import LoginForm from '../components/LoginForm';
import Button from '@components/ui/Button';
import ThemeToggle from '@components/ui/ThemeToggle';
import logo from '@/assets/logoss.svg';

function BrandPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-surface-app dark:bg-ngray-900 p-12 border-l border-hairline/10">
      <div className="absolute inset-0 bg-gradient-to-br from-npurple-borders/20 via-transparent to-transparent" />
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-npurple-borders/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-nsecondary-500/10 blur-3xl" />
      <div className="absolute top-1/3 left-1/4 h-40 w-40 rounded-full border border-npurple-borders/20" />
      <div className="absolute bottom-1/4 right-1/3 h-24 w-24 rounded-full border border-hairline/10" />

      <div className="relative z-10">
        <img src={logo} alt={config.appName} className="h-12 w-auto" />
      </div>

      <div className="relative z-10 space-y-6">
        <h1 className="text-4xl font-bold leading-tight text-ink">
          گفتگوی سریع،
          <br />
          <span className="text-npurple-borders">امن و ساده</span>
        </h1>
        <p className="max-w-sm text-lg leading-relaxed text-ink-secondary">
          با {config.appName} به راحتی با دوستان، همکاران و تیم خود در ارتباط باشید.
        </p>
        <div className="flex gap-3 pt-2 flex-wrap">
          {['پیام‌رسانی لحظه‌ای', 'گروه و کانال', 'تماس صوتی'].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-hairline/10 bg-surface-muted/80 px-4 py-1.5 text-sm text-ink-secondary"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      <p className="relative z-10 text-sm text-ink-muted">
        © {new Date().getFullYear()} {config.appName}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || ROUTES.HOME;

  const handleLogin = async (data) => {
    try {
      await login(
        { username: data.username, password: data.password },
        data.rememberMe
      );
      addToast('ورود موفقیت‌آمیز بود', 'success');
      navigate(from, { replace: true });
    } catch {
      addToast('خطا در ورود', 'error');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 chat-bg relative">
      <div className="absolute top-4 left-4 z-20">
        <ThemeToggle compact />
      </div>

      <BrandPanel />

      <div className="flex flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center lg:hidden">
            <img src={logo} alt={config.appName} className="mx-auto mb-4 h-10" />
          </div>

          <div className="rounded-2xl border border-hairline/10 surface-elevated p-8 shadow-2xl shadow-black/10 backdrop-blur-sm">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-ink">خوش آمدید</h2>
              <p className="mt-2 text-sm text-ink-secondary">برای ادامه وارد حساب خود شوید</p>
            </div>

            <LoginForm onSubmit={handleLogin} loading={loading} error={error} />

            <p className="mt-4 text-center text-xs text-ink-muted">
              لوکال: admin / 123456 یا user / 123456
            </p>
          </div>

          {import.meta.env.DEV && !config.useMockAuth && (
            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                loading={loading}
                onClick={() =>
                  handleLogin({ username: 'admin', password: '123456', rememberMe: true })
                }
              >
                ورود سریع با admin
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
