import { Link } from 'react-router-dom';
import Button from '@components/ui/Button';
import { ROUTES } from '@constants/routes';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] chat-bg text-ink gap-6 px-4">
      <h1 className="text-8xl font-bold text-npurple-borders">404</h1>
      <p className="text-xl text-ink-secondary">صفحه مورد نظر یافت نشد</p>
      <Link to={ROUTES.HOME}>
        <Button>بازگشت به خانه</Button>
      </Link>
    </div>
  );
}
