import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  showIcon = true,
}) => {
  const getStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
      case 'warning':
        return 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
      case 'danger':
        return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
      case 'info':
        return 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]';
      default:
        return 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]';
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    const iconClass = 'w-3.5 h-3.5 mr-1 flex-shrink-0';
    switch (variant) {
      case 'success':
        return <CheckCircle2 className={iconClass} aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className={iconClass} aria-hidden="true" />;
      case 'danger':
        return <XCircle className={iconClass} aria-hidden="true" />;
      case 'info':
        return <Info className={iconClass} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStyles()} ${className}`}
    >
      {getIcon()}
      <span>{children}</span>
    </span>
  );
};
