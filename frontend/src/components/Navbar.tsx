import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, LogOut, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-[#475569] hover:text-[#1E293B] hover:bg-[#F8FAFC] rounded-md focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-[#1E293B] font-semibold text-base sm:text-lg hover:text-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md px-1"
          >
            <div className="w-8 h-8 rounded bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
              <UtensilsCrossed className="w-4 h-4" aria-hidden="true" />
            </div>
            <span>College Mess Planning & Waste Prediction</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm text-[#334155] hover:text-[#2563EB] px-2 py-1.5 rounded-md hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                aria-label={`View profile for ${user.username}`}
              >
                <div className="w-7 h-7 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569] font-medium text-xs">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline font-medium">{user.full_name || user.username}</span>
              </Link>

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] border border-[#FECACA] px-2.5 py-1.5 rounded-md focus-visible:ring-2 focus-visible:ring-[#B91C1C]"
                title="Log out of application"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
