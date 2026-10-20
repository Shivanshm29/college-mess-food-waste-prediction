import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Utensils, AlertCircle } from 'lucide-react';
import { LiveAnnouncer } from '../components/LiveAnnouncer';

const loginSchema = z.object({
  username_or_email: z.string().min(3, 'Username or email must be at least 3 characters'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username_or_email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      setAnnouncement('Authenticating credentials...');
      await login(data);
      setAnnouncement('Login successful, redirecting to portal...');
      const saved = localStorage.getItem('user_data');
      let target = '/dashboard';
      if (saved) {
        try {
          const u = JSON.parse(saved);
          target = u.role === 'student' ? '/student/dashboard' : '/dashboard';
        } catch {
          target = '/dashboard';
        }
      }
      navigate(target, { replace: true });
    } catch (err: any) {
      const msg = err.message || 'Invalid username or password. Please try again.';
      setServerError(msg);
      setAnnouncement(`Login failed: ${msg}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <LiveAnnouncer message={announcement} />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] mb-3">
          <Utensils className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          Mess Planning & Waste Prediction
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Hostel Mess Operations Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#E2E8F0] sm:rounded-lg sm:px-10">
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6">
            Sign In to Mess Portal
          </h2>

          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start gap-2.5 text-sm text-[#B91C1C]"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">Authentication Error</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="username_or_email"
                className="block text-sm font-medium text-[#1E293B]"
              >
                Username or Email Address
              </label>
              <div className="mt-1">
                <input
                  id="username_or_email"
                  type="text"
                  autoComplete="username"
                  aria-invalid={errors.username_or_email ? 'true' : 'false'}
                  aria-describedby={errors.username_or_email ? 'username_or_email-error' : undefined}
                  {...register('username_or_email')}
                  className={`block w-full rounded-md border px-3 py-2 text-[#1E293B] placeholder-[#94A3B8] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB] sm:text-sm ${
                    errors.username_or_email
                      ? 'border-[#B91C1C] focus-visible:ring-[#B91C1C]'
                      : 'border-[#CBD5E1]'
                  }`}
                  placeholder="manager or manager@college.edu"
                />
              </div>
              {errors.username_or_email && (
                <p
                  id="username_or_email-error"
                  role="alert"
                  className="mt-1 text-xs text-[#B91C1C]"
                >
                  {errors.username_or_email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1E293B]"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                  className={`block w-full rounded-md border px-3 py-2 pr-10 text-[#1E293B] placeholder-[#94A3B8] shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563EB] sm:text-sm ${
                    errors.password
                      ? 'border-[#B91C1C] focus-visible:ring-[#B91C1C]'
                      : 'border-[#CBD5E1]'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B] focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1 text-xs text-[#B91C1C]"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            <p>
              Need a new manager account?{' '}
              <Link
                to="/register"
                className="font-medium text-[#2563EB] hover:underline focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded px-1"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
