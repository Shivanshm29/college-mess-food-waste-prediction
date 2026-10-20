import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  Info,
  User,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'New Prediction', to: '/predictions/new', icon: PlusCircle },
    { name: 'Prediction History', to: '/predictions/history', icon: History },
    { name: 'Analytics & Trends', to: '/analytics', icon: BarChart3 },
    { name: 'Model Information', to: '/model-info', icon: Info },
    { name: 'Profile & Settings', to: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-16 z-40 h-full md:h-[calc(100vh-4rem)] w-64 bg-[#F8FAFC] border-r border-[#E2E8F0] transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
        aria-label="Main Navigation"
      >
        <div className="p-4">
          <div className="flex items-center justify-between md:hidden pb-3 mb-2 border-b border-[#E2E8F0]">
            <span className="font-semibold text-sm text-[#1E293B]">Navigation</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#64748B] hover:text-[#1E293B] rounded-md focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label="Close navigation sidebar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-l-4 border-[#2563EB]'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
