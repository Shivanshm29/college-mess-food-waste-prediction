import React from 'react';
import { CheckCircle2, XCircle, HelpCircle, Clock, AlertCircle } from 'lucide-react';
import { IntentionChoice } from '../../types/student';

interface StudentBadgeProps {
  status?: IntentionChoice | 'pending' | 'closed' | 'published' | 'unscheduled' | string;
  size?: 'sm' | 'md';
  className?: string;
  customLabel?: string;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  customLabel,
}) => {
  let badgeStyle = 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
  let Icon = HelpCircle;
  let label = customLabel || 'Not answered';

  switch (status) {
    case 'likely':
      badgeStyle = 'bg-[#D8F3DC] text-[#1B4332] border-[#95D5B2] font-semibold';
      Icon = CheckCircle2;
      label = customLabel || 'Likely to attend';
      break;
    case 'unlikely':
      badgeStyle = 'bg-[#FDF2EE] text-[#9C4221] border-[#F4C5B6] font-semibold';
      Icon = XCircle;
      label = customLabel || 'Not likely to attend';
      break;
    case 'unsure':
      badgeStyle = 'bg-[#F1F5F9] text-[#4A5568] border-[#CBD5E1] font-semibold';
      Icon = HelpCircle;
      label = customLabel || 'Unsure yet';
      break;
    case 'closed':
      badgeStyle = 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB] font-medium';
      Icon = Clock;
      label = customLabel || 'Response closed';
      break;
    case 'pending':
      badgeStyle = 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A] font-medium';
      Icon = AlertCircle;
      label = customLabel || 'Response pending';
      break;
    case 'published':
      badgeStyle = 'bg-[#EBF7EE] text-[#2D6A4F] border-[#B7E4C7] font-medium';
      Icon = CheckCircle2;
      label = customLabel || 'Published menu';
      break;
    default:
      badgeStyle = 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]';
      Icon = HelpCircle;
      label = customLabel || String(status);
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs transition-colors ${sizeClass} ${badgeStyle} ${className}`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
