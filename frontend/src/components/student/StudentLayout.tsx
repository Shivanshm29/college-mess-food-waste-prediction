import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../api/student';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  MessageSquareText,
  Bell,
  User,
  LogOut,
  Menu as MenuIcon,
  X,
  UtensilsCrossed,
  MapPin,
  Shield,
  ChevronRight,
} from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Fetch notifications to show unread badge
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifs = await studentApi.getNotifications();
        const unread = notifs.filter((n) => !n.is_read).length;
        setUnreadNotifCount(unread);
      } catch {
        // Fallback gracefully
      }
    };
    fetchNotifs();
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Meal Schedule', path: '/student/schedule', icon: CalendarDays },
    { name: 'My Meal Plans', path: '/student/plans', icon: ClipboardCheck },
    { name: 'Menu & Feedback', path: '/student/feedback', icon: MessageSquareText },
    {
      name: 'Notifications',
      path: '/student/notifications',
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { name: 'Profile & Settings', path: '/student/profile', icon: User },
  ];

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const getPageTitle = () => {
    const current = navItems.find((item) => location.pathname.startsWith(item.path));
    return current ? current.name : 'Student Portal';
  };

  return (
    <div className="min-h-screen bg-[#F9FAF7] flex flex-col md:flex-row text-[#242926]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#1B4332] text-white flex-shrink-0 border-r border-[#153427] select-none">
        {/* Brand header */}
        <div className="p-5 border-b border-[#2D6A4F]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2D6A4F] flex items-center justify-center text-[#D8F3DC] border border-[#52B788]/30 shadow-2xs">
              <UtensilsCrossed className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight block text-[#F8F9FA]">CampusBites</span>
              <span className="text-[11px] text-[#95D5B2] block leading-tight">Student Dining Portal</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Student Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#2D6A4F] text-white shadow-2xs font-semibold'
                      : 'text-[#D8F3DC] hover:bg-[#24533E] hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#E57373] text-white">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Student Profile Card in Sidebar Footer */}
        <div className="p-3 border-t border-[#2D6A4F]/60">
          <div className="p-2.5 bg-[#143225] rounded-xl flex items-center justify-between border border-[#2D6A4F]/40">
            <NavLink
              to="/student/profile"
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
              title="View student profile & preferences"
            >
              <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-xs font-bold text-white border border-[#74C69D]/40 shrink-0">
                {(user?.full_name || user?.username || 'S')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-[11px] text-[#95D5B2] truncate flex items-center gap-1">
                  <span>{user?.hostel_block || 'Hostel A'}</span>
                  {user?.room_number && <span>• Rm {user.room_number}</span>}
                </p>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-[#95D5B2] hover:text-white rounded-md hover:bg-[#2D6A4F] transition-colors shrink-0"
              title="Sign out of student portal"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-[#E8ECE6] px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#4C554F] hover:text-[#1A1D1B] rounded-lg hover:bg-[#F1F3F0] focus-visible:ring-2 focus-visible:ring-[#2D6A4F]"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#1A1D1B] tracking-tight">
                {getPageTitle()}
              </h1>
              <p className="text-xs text-[#68746C] hidden sm:flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#2D6A4F]" aria-hidden="true" />
                <span>Central Campus Mess • {user?.hostel_block || 'Hostel Dining Hall'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Today's Date Tag */}
            <span className="text-xs font-medium text-[#2D6A4F] bg-[#EBF7EE] px-2.5 py-1 rounded-md border border-[#D8F3DC]">
              {todayFormatted}
            </span>

            {/* Quick Notification Bell */}
            <NavLink
              to="/student/notifications"
              className="relative p-2 text-[#4C554F] hover:text-[#1A1D1B] rounded-lg hover:bg-[#F1F3F0] transition-colors"
              aria-label={`Notifications (${unreadNotifCount} unread)`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E57373]" />
              )}
            </NavLink>

            {/* User Profile avatar shortcut */}
            <NavLink
              to="/student/profile"
              className="hidden sm:flex items-center gap-2 p-1.5 text-xs font-semibold text-[#1A1D1B] rounded-lg hover:bg-[#F1F3F0] transition-colors"
              title="Student Profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#EBF7EE] border border-[#B7E4C7] flex items-center justify-center text-[#1B4332] text-xs font-bold">
                {(user?.full_name || user?.username || 'S')[0].toUpperCase()}
              </div>
              <span className="hidden lg:inline">{user?.full_name || user?.username}</span>
            </NavLink>

            {/* Direct Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-[#68746C] hover:text-[#9C4221] rounded-lg hover:bg-[#FDF2EE] transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar (Touch-friendly 56px touch bar) */}
        <nav
          aria-label="Mobile quick navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8ECE6] py-1.5 px-3 z-30 flex items-center justify-around shadow-lg"
        >
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isMatch = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-md min-w-[56px] text-center ${
                  isMatch ? 'text-[#1B4332] font-semibold' : 'text-[#68746C]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isMatch ? 'text-[#2D6A4F]' : ''}`} />
                <span className="text-[10px] tracking-tight">{item.name.split(' ')[0]}</span>
              </NavLink>
            );
          })}
          <NavLink
            to="/student/profile"
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-md min-w-[56px] text-center ${
              location.pathname.startsWith('/student/profile')
                ? 'text-[#1B4332] font-semibold'
                : 'text-[#68746C]'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[10px] tracking-tight">Profile</span>
          </NavLink>
        </nav>

        {/* Mobile Slide-out Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Content */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#1B4332] text-white p-5 z-50 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#2D6A4F]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] flex items-center justify-center text-[#D8F3DC]">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">CampusBites</span>
                    <span className="text-[11px] text-[#95D5B2] block">Student Dining Portal</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-[#95D5B2] hover:text-white rounded-lg hover:bg-[#2D6A4F]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-1 flex-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                          isActive
                            ? 'bg-[#2D6A4F] text-white font-semibold'
                            : 'text-[#D8F3DC] hover:bg-[#24533E]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-[#E57373] text-white">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>

              {/* Drawer Footer with Student Info & Logout */}
              <div className="pt-4 border-t border-[#2D6A4F] space-y-3">
                <div className="p-3 bg-[#143225] rounded-xl flex items-center gap-3 border border-[#2D6A4F]/40">
                  <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(user?.full_name || user?.username || 'S')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-[11px] text-[#95D5B2] truncate">
                      {user?.hostel_block || 'Hostel A'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-transparent text-[#95D5B2] hover:text-white text-xs font-medium rounded-lg border border-[#2D6A4F]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
