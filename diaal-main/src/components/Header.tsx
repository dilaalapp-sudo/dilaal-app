import React from 'react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onHomeClick: () => void;
  onNotificationsClick: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onNotificationsClick,
  showBack = false,
  onBack,
}) => {
  const { notifications } = useApp();
  const unreadCount = notifications.filter((notification) => notification.unread).length;

  return (
    <header className="shrink-0 w-full z-40 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none">
      <div className="h-16 px-3 sm:px-6 flex items-center justify-between gap-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              aria-label="Back"
              className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] -ml-1 flex items-center justify-center text-on-surface hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[22px] sm:text-[24px] rtl:rotate-180">arrow_back</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onHomeClick}
            aria-label="Go to home"
            className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 cursor-pointer"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-700 dark:bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">domain</span>
            </div>
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-emerald-900 dark:text-emerald-300 font-sans">
              DILAAL
            </span>
          </button>
        </div>

        <button
          aria-label="Notifications"
          onClick={onNotificationsClick}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary transition-colors relative cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[19px] sm:text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
          )}
        </button>
      </div>
    </header>
  );
};
