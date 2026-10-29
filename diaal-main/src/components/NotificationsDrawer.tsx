import React from 'react';
import { useApp } from '../context/AppContext';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    notifications,
    markNotificationsAsRead,
    setCurrentScreen,
    setActiveTab,
    t,
    language,
  } = useApp();

  if (!isNotificationsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 rtl:pl-0 rtl:pr-10">
        <div className="w-screen max-w-sm bg-surface-container-lowest shadow-2xl flex flex-col border-l rtl:border-l-0 rtl:border-r border-outline-variant/20 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">notifications</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface">{t('notifications', 'Notifications')}</h3>
                <span className="text-[10px] text-outline">Marketplace Updates</span>
              </div>
            </div>
            <button
              onClick={() => setIsNotificationsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Quick Mark Read */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-surface-container-low flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant font-semibold">
                {notifications.filter((n) => n.unread).length}{' '}
                {language === 'so' ? 'Cusbooneysiin' : language === 'ar' ? 'تحديثات جديدة' : 'Unread Updates'}
              </span>
              <button
                onClick={markNotificationsAsRead}
                className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
              >
                {language === 'so' ? 'Dhammaan akhri' : language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2.5 py-10">
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[28px]">notifications_off</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface">
                  {t('noNotifications', 'No Notifications Yet')}
                </h4>
                <p className="text-[11px] text-on-surface-variant max-w-[240px] leading-relaxed">
                  {t(
                    'noNotificationsSub',
                    'Updates about your listings, messages, and verification status will appear here.'
                  )}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.title.includes('Offer')) {
                      setActiveTab('chat');
                      setCurrentScreen('chat');
                    } else if (n.title.includes('Escrow') || n.title.includes('Deposit')) {
                      setCurrentScreen('deal');
                    } else {
                      setCurrentScreen('details');
                    }
                    setIsNotificationsOpen(false);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    n.unread
                      ? 'bg-primary/5 border-primary/30 shadow-xs'
                      : 'bg-surface-container-low border-outline-variant/15 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {n.unread && <span className="w-2 h-2 rounded-full bg-secondary-container"></span>}
                      <h4 className="text-xs font-bold text-on-surface">{n.title}</h4>
                    </div>
                    <span className="text-[10px] text-outline shrink-0">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{n.desc}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
