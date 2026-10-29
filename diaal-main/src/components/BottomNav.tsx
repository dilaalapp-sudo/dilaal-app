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
  const { t } = useApp();
  return (
    <nav
      className="fixed-bottom-nav shrink-0 w-full z-40 bg-surface/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-outline-variant/20 dark:border-slate-800 shadow-[0_-2px_12px_rgba(6,78,59,0.06)] pb-[max(0.375rem,env(safe-area-inset-bottom,0px))] touch-manipulation pointer-events-auto"
      aria-label="Bottom Navigation"
    >
      <div className="flex justify-around items-center min-h-[58px] sm:min-h-16 px-1 max-w-lg mx-auto touch-manipulation">
        {/* Home */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          aria-label="Home"
          className={`flex-1 min-w-0 max-w-[80px] flex flex-col items-center justify-center gap-0.5 py-1 min-h-[48px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
            activeTab === 'home'
              ? 'text-primary-container dark:text-emerald-400 font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-emerald-300'
          }`}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span
              className="material-symbols-outlined text-[22px] sm:text-[24px] transition-transform duration-200"
              style={activeTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              home
            </span>
            {activeTab === 'home' && (
              <motion.span
                layoutId="navDot"
                className="w-1 h-1 rounded-full bg-secondary-container mt-0.5"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold truncate pointer-events-none">{t('navHome', 'Home')}</span>
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => onTabChange('search')}
          aria-label={t('navSearch', 'Search')}
          className={`flex-1 min-w-0 max-w-[80px] flex flex-col items-center justify-center gap-0.5 py-1 min-h-[48px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
            activeTab === 'search'
              ? 'text-primary-container dark:text-emerald-400 font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-emerald-300'
          }`}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span
              className="material-symbols-outlined text-[22px] sm:text-[24px] transition-transform duration-200"
              style={activeTab === 'search' ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              search
            </span>
            {activeTab === 'search' && (
              <motion.span
                layoutId="navDot"
                className="w-1 h-1 rounded-full bg-secondary-container mt-0.5"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold truncate pointer-events-none">{t('navSearch', 'Search')}</span>
        </button>

        {/* Elevated Post Action */}
        <button
          type="button"
          onClick={() => onTabChange('post')}
          aria-label={t('navPost', 'Post Listing')}
          className="flex-1 min-w-0 max-w-[80px] flex flex-col items-center justify-center relative -top-3 min-h-[48px] cursor-pointer group touch-manipulation active:scale-95"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-primary-container to-tertiary-container shadow-[0_4px_16px_rgba(6,78,59,0.4)] flex items-center justify-center text-on-primary transition-all group-hover:scale-105 group-hover:shadow-[0_6px_20px_rgba(6,78,59,0.5)]">
            <span className="material-symbols-outlined text-[26px] sm:text-[28px] transition-transform group-hover:rotate-90 duration-300">add</span>
          </div>
          <span
            className={`text-[10px] sm:text-[11px] mt-0.5 font-semibold truncate pointer-events-none ${
              activeTab === 'post' ? 'text-primary-container dark:text-emerald-400 font-bold' : 'text-on-surface-variant dark:text-slate-400'
            }`}
          >
            {t('navPost', 'Post')}
          </span>
        </button>

        {/* Chat with badge */}
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          aria-label={t('navChat', 'Chat')}
          className={`flex-1 min-w-0 max-w-[80px] flex flex-col items-center justify-center gap-0.5 py-1 min-h-[48px] transition-all relative cursor-pointer touch-manipulation active:scale-95 ${
            activeTab === 'chat'
              ? 'text-primary-container dark:text-emerald-400 font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-emerald-300'
          }`}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[22px] sm:text-[24px] transition-transform duration-200"
                style={activeTab === 'chat' ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                chat_bubble
              </span>
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full bg-secondary-container text-on-secondary font-bold text-[9px] sm:text-[10px] leading-tight min-w-[16px] text-center shadow-xs animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </div>
            {activeTab === 'chat' && (
              <motion.span
                layoutId="navDot"
                className="w-1 h-1 rounded-full bg-secondary-container mt-0.5"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold truncate pointer-events-none">{t('navChat', 'Chat')}</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          aria-label={t('navProfile', 'Profile')}
          className={`flex-1 min-w-0 max-w-[80px] flex flex-col items-center justify-center gap-0.5 py-1 min-h-[48px] transition-all cursor-pointer touch-manipulation active:scale-95 ${
            activeTab === 'profile'
              ? 'text-primary-container dark:text-emerald-400 font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-emerald-300'
          }`}
        >
          <div className="relative flex flex-col items-center pointer-events-none">
            <span
              className="material-symbols-outlined text-[22px] sm:text-[24px] transition-transform duration-200"
              style={activeTab === 'profile' ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              person
            </span>
            {activeTab === 'profile' && (
              <motion.span
                layoutId="navDot"
                className="w-1 h-1 rounded-full bg-secondary-container mt-0.5"
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              />
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold truncate pointer-events-none">{t('navProfile', 'Profile')}</span>
        </button>
      </div>
    </nav>
  );
};

