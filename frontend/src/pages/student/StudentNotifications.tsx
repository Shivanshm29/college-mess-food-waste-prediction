import React, { useState, useEffect } from 'react';
import { studentApi } from '../../api/student';
import { StudentNotification } from '../../types/student';
import { LiveAnnouncer } from '../../components/LiveAnnouncer';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Utensils,
  Megaphone,
  Check,
  CheckCheck,
} from 'lucide-react';

export const StudentNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'announcements' | 'reminders'>('all');
  const [announcement, setAnnouncement] = useState<string>('');

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await studentApi.getNotifications();
      setNotifications(res);
    } catch (err: any) {
      setError(err.message || 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notifId: number) => {
    try {
      await studentApi.markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setAnnouncement('Notification marked as read.');
    } catch (err: any) {
      setAnnouncement('Could not mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    for (const n of unread) {
      try {
        await studentApi.markNotificationRead(n.id);
      } catch (err) {
        // continue
      }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setAnnouncement('All notifications marked as read.');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'menu_change':
        return <Utensils className="w-4 h-4 text-[#D97706]" aria-hidden="true" />;
      case 'reminder':
        return <Clock className="w-4 h-4 text-[#2D6A4F]" aria-hidden="true" />;
      case 'announcement':
      default:
        return <Megaphone className="w-4 h-4 text-[#1B4332]" aria-hidden="true" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'menu_change':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            Menu Change
          </span>
        );
      case 'reminder':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EBF7EE] text-[#1B4332] border border-[#B7E4C7]">
            Cutoff Reminder
          </span>
        );
      case 'announcement':
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F3F0] text-[#242926] border border-[#CCD5CA]">
            Announcement
          </span>
        );
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'announcements') return n.category === 'announcement';
    if (filter === 'reminders') return n.category === 'reminder' || n.category === 'menu_change';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <LiveAnnouncer message={announcement} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1D1B] tracking-tight">
            Mess Notices & Reminders
          </h1>
          <p className="text-xs sm:text-sm text-[#68746C] mt-0.5">
            Important announcements, menu changes, and meal cutoff alerts from the mess committee.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-[#CCD5CA] text-[#2D6A4F] hover:bg-[#FAFBF9] self-start sm:self-auto transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F1F3F0] rounded-lg border border-[#E2E6DF] w-fit">
        {(
          [
            { key: 'all', label: 'All Notices' },
            { key: 'unread', label: `Unread (${unreadCount})` },
            { key: 'announcements', label: 'Announcements' },
            { key: 'reminders', label: 'Reminders & Changes' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filter === tab.key
                ? 'bg-white text-[#1B4332] shadow-2xs'
                : 'text-[#68746C] hover:text-[#1A1D1B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-[#FBEBE8] border border-[#F5C2B6] rounded-xl flex items-center gap-2 text-xs text-[#9C4221]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Notifications list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white border border-[#E8ECE6] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-[#E8ECE6] rounded-xl p-10 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-[#2D6A4F] mx-auto opacity-70" />
          <h2 className="text-sm font-bold text-[#1A1D1B]">All Caught Up</h2>
          <p className="text-xs text-[#68746C] max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You have no unread notices right now.'
              : 'There are no notices matching this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3" role="feed" aria-label="Notices and announcements">
          {filteredNotifications.map((notif) => (
            <article
              key={notif.id}
              className={`p-4 rounded-xl border transition-all ${
                notif.is_read
                  ? 'bg-white border-[#E8ECE6]'
                  : 'bg-[#FAFBF9] border-[#B7E4C7] ring-1 ring-[#2D6A4F]/20'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-[#E8ECE6] shrink-0 mt-0.5">
                    {getCategoryIcon(notif.category)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-[#1A1D1B]">{notif.title}</h2>
                      {getCategoryBadge(notif.category)}
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-[#4C554F] leading-relaxed">{notif.message}</p>
                    <div className="text-[11px] text-[#8A968E] pt-1">
                      {new Date(notif.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {!notif.is_read && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 text-[#68746C] hover:text-[#2D6A4F] hover:bg-[#EBF7EE] rounded-md transition-colors shrink-0"
                    title="Mark as read"
                    aria-label={`Mark "${notif.title}" as read`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
