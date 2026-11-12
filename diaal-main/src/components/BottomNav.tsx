import React from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';

export type TabId = 'home' | 'search' | 'post' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  unreadChatCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
}) => {
  const { t, isDarkMode } = useApp();
  const bg = isDarkMode ? 'bg-surface-container' : 'bg-white';
  const border = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const shadow = 'shadow-lg';
  const iconBase = 'material-symbols-outlined text-[24px] transition-transform duration-200';
  const labelBase = 'text-[11px] sm:text-[12px] font-medium truncate pointer-events-none';

  const pillClass = `fixed-bottom-nav shrink-0 w-full z-40 border border-outline-variant/20 ${border} bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(15,23,42,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] touch-manipulation pointer-events-auto`;
  const pillInner = `flex justify-around items-center min-h-[76px] sm:min-h-[84px] px-3 sm:px-4 max-w-4xl mx-auto touch-manipulation`;

  const tabClass = (active: boolean) =>
    `flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 min-h-[60px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
      active ? 'text-primary-container dark:text-emerald-400 font-bold' : 'text-on-surface-variant dark:text-slate-500 hover:text-primary dark:hover:text-emerald-300'
    }`;

  return (
    <nav className={pillClass} aria-label="Bottom Navigation">
      <div className={pillInner}>
        {/* Home */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          aria-label={t('navHome', 'Home')}
          className={tabClass(activeTab === 'home')}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span
              className={`${iconBase} ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}
              style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              home
            </span>
            {activeTab === 'home' && (
              <motion.span
                layoutId="navDot"
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className={`w-full ${labelBase} ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-bold`}>
            {t('navHome', 'Home')}
          </span>
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => onTabChange('search')}
          aria-label={t('navSearch', 'Search')}
          className={tabClass(activeTab === 'search')}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span className={iconBase}>search</span>
            {activeTab === 'search' && (
              <motion.span
                layoutId="navDot"
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className={`w-full ${labelBase}`}>{t('navSearch', 'Search')}</span>
        </button>

        {/* Elevated Post Action */}
        <button
          type="button"
          onClick={() => onTabChange('post')}
          aria-label={t('navPost', 'Post Listing')}
          className="flex-1 min-w-0 flex flex-col items-center justify-center relative -top-4 min-h-[60px] cursor-pointer group touch-manipulation active:scale-95"
        >
          <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-700 shadow-lg flex items-center justify-center text-white transition-all group-hover:scale-105 group-hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]">
            <span className="material-symbols-outlined text-[28px] sm:text-[32px] transition-transform group-hover:rotate-90 duration-300">add</span>
          </div>
          <span className={`absolute bottom-0 mt-1 w-full text-[11px] sm:text-[12px] font-bold text-center ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {t('navPost', 'Post')}
          </span>
        </button>

        {/* Chat with badge */}
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          aria-label={t('navChat', 'Chat')}
          className={tabClass(activeTab === 'chat')}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span className={iconBase}>chat_bubble</span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-red-600 dark:bg-red-500 text-white font-bold text-[8px] sm:text-[9px] leading-tight min-w-[14px] text-center shadow-xs animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            {activeTab === 'chat' && (
              <motion.span
                layoutId="navDot"
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className={`w-full ${labelBase}`}>{t('navChat', 'Chat')}</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          aria-label={t('navProfile', 'Profile')}
          className={tabClass(activeTab === 'profile')}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span className={iconBase}>person</span>
            {activeTab === 'profile' && (
              <motion.span
                layoutId="navDot"
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className={`w-full ${labelBase}`}>{t('navProfile', 'Profile')}</span>
        </button>
      </div>
    </nav>
  );
};
