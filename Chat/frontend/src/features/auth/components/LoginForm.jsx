import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@utils/validators';
import Input from '@components/ui/Input';
import Button from '@components/ui/Button';

export default function LoginForm({ onSubmit, loading, error }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: '123456',
      rememberMe: true,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="نام کاربری"
        {...register('username')}
        error={errors.username?.message}
        placeholder="نام کاربری خود را وارد کنید"
        autoComplete="username"
      />
      <Input
        label="رمز عبور"
        type="password"
        {...register('password')}
        error={errors.password?.message}
        placeholder="••••••••"
        autoComplete="current-password"
      />

      <label className="flex items-center gap-2.5 text-ink-secondary text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          {...register('rememberMe')}
          className="h-4 w-4 rounded border-hairline/20 accent-npurple-borders"
        />
        مرا به خاطر بسپار
      </label>

      {error && (
        <p className="text-nerror text-sm text-center bg-nerror/10 py-2 rounded-lg">{error}</p>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        ورود
      </Button>
    </form>
  );
}
