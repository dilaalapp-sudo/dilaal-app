import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fetchBuyerInbox, subscribeInbox, type BuyerInboxItem } from '../lib/chat';

export const BuyerInbox: React.FC = () => {
  const { authUserId, openChatWithBroker, setCurrentScreen, t } = useApp();

  const [items, setItems] = useState<BuyerInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    if (!authUserId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setItems(await fetchBuyerInbox(authUserId));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!authUserId) return;
    return subscribeInbox('buyer_id', authUserId, () => {
      void load(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-36">
      <div className="max-w-2xl mx-auto w-full px-3.5 sm:px-gutter pt-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-on-surface">{t('yourChats', 'Your Chats')}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Conversations with brokers
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className="w-9 h-9 rounded-2xl bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high cursor-pointer"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[19px]">refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[76px] rounded-2xl bg-surface-container animate-pulse border border-outline-variant/10"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4">
              <span className="material-symbols-outlined text-3xl">forum</span>
            </div>
            <h3 className="text-sm font-bold text-on-surface">No chats yet</h3>
            <p className="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
              Contact a broker from a listing or the Dilaalo Directory and your conversation will appear here.
            </p>
            <button
              onClick={() => setCurrentScreen('home')}
              className="mt-5 px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
            >
              Browse Listings
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <button
                key={item.conversationId}
                type="button"
                onClick={() =>
                  void openChatWithBroker(
                    item.brokerId,
                    item.listingId || undefined,
                    undefined,
                    item.conversationId
                  )
                }
                className="w-full text-left bg-surface-container-lowest rounded-2xl p-3 flex items-center gap-3 border border-outline-variant/20 hover:bg-surface-container transition-colors cursor-pointer"
              >
                {item.brokerAvatar ? (
                  <img
                    src={item.brokerAvatar}
                    alt={item.brokerName}
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-surface-container text-outline flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-on-surface truncate">
                      {item.brokerName}
                    </span>
                    <span className="text-[10px] text-outline shrink-0">{item.lastAt}</span>
                  </div>
                  <span className="text-[11px] text-primary font-semibold truncate">
                    {item.listingTitle}
                  </span>
                  <span className="text-[11px] text-on-surface-variant truncate">
                    {item.lastMessage}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
