import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Utensils, AlertCircle } from 'lucide-react';
import { LiveAnnouncer } from '../components/LiveAnnouncer';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    email: z.string().email('Please enter a valid email address'),
    full_name: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const [selectedRole, setSelectedRole] = useState<'student' | 'manager'>('student');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      full_name: '',
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      setAnnouncement('Registering new account...');
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        full_name: data.full_name || undefined,
        role: selectedRole,
      });
      setAnnouncement('Account registered successfully! Redirecting...');
      if (selectedRole === 'student') {
        navigate('/student/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check inputs and try again.';
      setServerError(msg);
      setAnnouncement(`Registration error: ${msg}`);
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
          {selectedRole === 'student' ? 'Create Student Account' : 'Create Manager Account'}
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          {selectedRole === 'student'
            ? 'Hostel Mess Planning & Wellness Portal'
            : 'Hostel Mess Operations & Demand Prediction'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-[#E2E8F0] sm:rounded-lg sm:px-10">
          {/* Role Switcher */}
          <div className="mb-6 flex items-center p-1 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedRole === 'student'
                  ? 'bg-white text-[#1B4332] shadow-sm'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('manager')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                selectedRole === 'manager'
                  ? 'bg-white text-[#2563EB] shadow-sm'
                  : 'text-[#64748B] hover:text-[#1E293B]'
              }`}
            >
              Mess Manager
            </button>
          </div>

          {serverError && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md flex items-start gap-2.5 text-sm text-[#B91C1C]"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-medium">Registration Error</p>
                <p>{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#1E293B]">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                aria-invalid={errors.username ? 'true' : 'false'}
                aria-describedby={errors.username ? 'username-error' : undefined}
                {...register('username')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-[#1E293B] shadow-sm sm:text-sm ${
                  errors.username ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                }`}
                placeholder="mess_manager"
              />
              {errors.username && (
                <p id="username-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1E293B]">
                Official Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                {...register('email')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-[#1E293B] shadow-sm sm:text-sm ${
                  errors.email ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                }`}
                placeholder="manager@college.edu"
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-[#1E293B]">
                Full Name (Optional)
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                {...register('full_name')}
                className="mt-1 block w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-[#1E293B] shadow-sm sm:text-sm"
                placeholder="Prof. / Mr. Mess Incharge"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1E293B]">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')}
                  className={`block w-full rounded-md border px-3 py-2 pr-10 text-[#1E293B] shadow-sm sm:text-sm ${
                    errors.password ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#1E293B]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-[#1E293B]">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-invalid={errors.confirm_password ? 'true' : 'false'}
                aria-describedby={errors.confirm_password ? 'confirm_password-error' : undefined}
                {...register('confirm_password')}
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-[#1E293B] shadow-sm sm:text-sm ${
                  errors.confirm_password ? 'border-[#B91C1C]' : 'border-[#CBD5E1]'
                }`}
                placeholder="••••••••"
              />
              {errors.confirm_password && (
                <p id="confirm_password-error" role="alert" className="mt-1 text-xs text-[#B91C1C]">
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
            <p>
              Already registered?{' '}
              <Link to="/login" className="font-medium text-[#2563EB] hover:underline px-1">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
