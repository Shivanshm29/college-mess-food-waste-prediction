import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  Mail,
  Shield,
  Calendar,
  LogOut,
  Building2,
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E2E8F0]">
        <h1 className="text-2xl font-bold tracking-tight text-[#1E293B]">
          Profile & Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Review authenticated account credentials and session details.
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
        {/* Profile Card Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#2563EB] flex items-center justify-center font-bold text-2xl">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1E293B]">
              {user.full_name || user.username}
            </h2>
            <p className="text-sm text-[#64748B]">@{user.username}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="info">{user.role.toUpperCase()}</Badge>
              {user.is_active && (
                <Badge variant="success">Active Account</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Detailed User Information */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#F1F5F9] text-xs">
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <dt className="text-[#64748B] flex items-center gap-1.5 font-medium">
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Email Address</span>
            </dt>
            <dd className="font-semibold text-[#1E293B] mt-1 text-sm">{user.email}</dd>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <dt className="text-[#64748B] flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Access Role</span>
            </dt>
            <dd className="font-semibold text-[#1E293B] mt-1 text-sm capitalize">{user.role}</dd>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <dt className="text-[#64748B] flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Member Since</span>
            </dt>
            <dd className="font-semibold text-[#1E293B] mt-1 text-sm">
              {new Date(user.created_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>

          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            <dt className="text-[#64748B] flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Assigned Facility</span>
            </dt>
            <dd className="font-semibold text-[#1E293B] mt-1 text-sm">
              College Dining Hall
            </dd>
          </div>
        </dl>

        {/* System Settings & Stateless JWT Info */}
        <div className="pt-4 border-t border-[#F1F5F9] text-xs text-[#64748B] space-y-2">
          <h3 className="font-semibold text-[#334155]">Authentication & Security</h3>
          <p>
            Your session is secured using stateless JSON Web Tokens (JWT) signed with HS256.
            Password credentials are hashed using bcrypt with adaptive work factor salt.
          </p>
        </div>

        {/* Logout Action */}
        <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">Ready to end your session?</span>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] rounded-md text-sm font-medium hover:bg-[#FEE2E2] focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to log out of your mess manager session?"
        confirmLabel="Log Out"
        cancelLabel="Stay Logged In"
        isDestructive={false}
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
