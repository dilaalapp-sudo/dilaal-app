import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  fetchBrokerInbox,
  fetchConversationMessages,
  sendChatMessage,
  subscribeConversation,
  subscribeInbox,
  updateOfferStatus,
  type InboxItem,
} from '../lib/chat';
import type { ChatMessage } from '../types';

export const BrokerInbox: React.FC = () => {
  const { myBrokerId, currentUser, formatPrice, t } = useApp();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const seenIds = useRef<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  // Background refreshes must never blank the list with a loading screen.
  const loadInbox = async (silent = false) => {
    if (!myBrokerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const inbox = await fetchBrokerInbox(myBrokerId);
    setItems(inbox);
    setLoading(false);
  };

  useEffect(() => {
    void loadInbox();
  }, [myBrokerId]);

  // New buyer conversations/messages refresh the list while the inbox is open.
  useEffect(() => {
    if (!myBrokerId) return;
    return subscribeInbox('broker_id', myBrokerId, () => {
      void loadInbox(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBrokerId]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    seenIds.current = new Set();
    setMessages([]);
    setMessagesLoading(true);
    setError('');
    (async () => {
      const msgs = await fetchConversationMessages(selected.conversationId);
      if (!active) return;
      setMessagesLoading(false);
      if (!msgs) {
        setError('Could not load this conversation. Check chat access policies in Supabase.');
        return;
      }
      seenIds.current = new Set(msgs.map((m) => m.id));
      setMessages(msgs);
    })();
    const unsubscribe = subscribeConversation(selected.conversationId, (m) => {
      if (!active || seenIds.current.has(m.id)) return;
      seenIds.current.add(m.id);
      setMessages((prev) => [...prev, m]);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [selected]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selected]);

  const handleSelect = (item: InboxItem) => {
    setSelected(item);
    setInput('');
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const body = input.trim();
    if (!body || !selected || !myBrokerId || sending) return;
    const tempId = `local-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      sender: 'broker',
      senderName: currentUser.name || 'Broker',
      text: body,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSending(true);
    setInput('');
    setMessages((prev) => [...prev, optimistic]);
    const sent = await sendChatMessage({
      conversationId: selected.conversationId,
      listingId: selected.listingId,
      brokerId: myBrokerId,
      sender: 'broker',
      senderName: currentUser.name || 'Broker',
      body,
    });
    setSending(false);
    if (!sent) {
      setError('Message was not saved. Verify your chat policies grant this broker insert access.');
      return;
    }
    const duplicate = seenIds.current.has(sent.id);
    seenIds.current.add(sent.id);
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      return duplicate ? withoutTemp : [...withoutTemp, sent];
    });
    void loadInbox(true);
  };

  const handleOffer = async (msg: ChatMessage, status: 'accepted' | 'declined') => {
    if (!msg.offer || !selected || !myBrokerId) return;
    const ok = await updateOfferStatus(msg.offer.id, status);
    if (ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id && m.offer ? { ...m, offer: { ...m.offer, status } } : m
        )
      );
      await sendChatMessage({
        conversationId: selected.conversationId,
        listingId: selected.listingId,
        brokerId: myBrokerId,
        sender: 'system',
        senderName: 'System',
        body:
          status === 'accepted'
            ? `Broker accepted the offer at $${msg.offer.proposedPrice.toLocaleString()} USD.`
            : 'Broker declined the offer.',
      });
      void loadInbox();
    }
  };

  if (!selected) {
    return (
      <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-36">
        <div className="max-w-2xl mx-auto w-full px-3.5 sm:px-gutter pt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-extrabold text-on-surface">
                {t('brokerInbox', 'Broker Inbox')}
              </h1>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Conversations with buyers
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInbox(true)}
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
              <h3 className="text-sm font-bold text-on-surface">No buyer messages yet</h3>
              <p className="text-xs text-on-surface-variant max-w-xs mt-1.5 leading-relaxed">
                When a buyer contacts one of your listings, the conversation will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <button
                  key={item.conversationId}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full text-left bg-surface-container-lowest rounded-2xl p-3 flex items-center gap-3 border border-outline-variant/20 hover:bg-surface-container transition-colors cursor-pointer"
                >
                  {item.listingImage ? (
                    <img
                      src={item.listingImage}
                      alt={item.listingTitle}
                      className="w-11 h-11 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-surface-container text-outline flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">home_work</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-on-surface truncate">
                        {item.buyerName}
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
  }

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-36">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <section className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-outline-variant/15">
          <div className="px-3.5 sm:px-6 py-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-9 h-9 rounded-2xl bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high cursor-pointer shrink-0"
              title="Back to inbox"
            >
              <span className="material-symbols-outlined text-[19px]">arrow_back</span>
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-on-surface truncate">
                {selected.buyerName}
              </span>
              <span className="text-[11px] text-on-surface-variant truncate">
                {selected.listingTitle}
              </span>
            </div>
          </div>
        </section>

        <div className="flex-1 flex flex-col gap-2 px-3.5 sm:px-6 py-3">
          {error && (
            <div className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[11px] font-semibold rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          {messagesLoading ? (
            <div className="py-10 flex flex-col items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-primary text-xl">
                progress_activity
              </span>
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="py-10 text-center text-xs text-on-surface-variant">
              No messages in this conversation yet.
            </div>
          ) : (
            messages.map((msg) => {
              const fromBroker = msg.sender === 'broker';
              const fromSystem = msg.sender === 'system';
              if (fromSystem) {
                return (
                  <div key={msg.id} className="self-center max-w-[90%]">
                    <div className="bg-surface-container-high text-on-surface-variant text-[10px] font-semibold px-3 py-1.5 rounded-full text-center">
                      {msg.text}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] gap-1 ${
                    fromBroker ? 'self-end items-end' : 'self-start items-start'
                  }`}
                >
                  <span className="text-[10px] font-bold text-outline px-1">
                    {fromBroker ? 'You' : msg.senderName || selected.buyerName}
                  </span>
                  <div
                    className={`p-3 rounded-2xl text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-xs ${
                      fromBroker
                        ? 'bg-primary text-on-primary rounded-tr-xs'
                        : 'bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                    <div className="text-[10px] opacity-70 mt-1 text-right">{msg.timestamp}</div>
                  </div>

                  {msg.offer && (
                    <div className="w-full bg-surface-container-lowest rounded-2xl p-3 border-2 border-primary/20 shadow-sm flex flex-col gap-2 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary">Purchase Offer</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            msg.offer.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : msg.offer.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {msg.offer.status}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-on-surface-variant">
                          {msg.offer.assetSubject}
                        </span>
                        <span className="text-sm font-extrabold text-primary">
                          {formatPrice(msg.offer.proposedPrice)}
                        </span>
                      </div>
                      {msg.offer.status === 'active' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => void handleOffer(msg, 'accepted')}
                            className="py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOffer(msg, 'declined')}
                            className="py-2 rounded-xl bg-surface-container text-on-surface text-[11px] font-bold hover:bg-red-100 hover:text-red-700 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant/15 px-3.5 sm:px-6 py-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('typeMessage', 'Type a message…')}
              className="flex-1 bg-surface-container-low rounded-2xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
              title="Send"
            >
              <span className="material-symbols-outlined text-[20px]">
                {sending ? 'progress_activity' : 'send'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
