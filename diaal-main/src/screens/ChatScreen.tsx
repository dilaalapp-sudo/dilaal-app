import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';
import { BrokerInbox } from '../components/BrokerInbox';
import { BuyerInbox } from '../components/BuyerInbox';
import { uploadChatAttachment } from '../lib/storage';
import { subscribeTyping } from '../lib/chat';

export const ChatScreen: React.FC = () => {
  const {
    brokers,
    selectedBrokerId,
    myBrokerId,
    authUserId,
    activeConversationId,
    chatMessages,
    chatLoading,
    hasMoreMessages,
    loadingOlderMessages,
    loadOlderMessages,
    sendMessage,
    sendVoiceNote,
    sendAttachment,
    acceptOffer,
    counterOffer,
    declineOffer,
    chatSending,
    openListingDetails,
    setCurrentScreen,
    setSelectedBrokerId,
    setSelectedListingId,
    listings,
    selectedListingId,
    formatPrice,
    markConversationAsRead,
    t,
  } = useApp();

  const { startCall, session: callSession } = useCall();

  const broker = brokers.find((b) => b.id === selectedBrokerId);

  const relatedListing = listings.find((l) => l.id === selectedListingId);

  const [inputText, setInputText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioPlaybackSecs, setAudioPlaybackSecs] = useState(0);
  const [playingDuration, setPlayingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [isAttachmentDrawerOpen, setIsAttachmentDrawerOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ title: string; image: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState(
    relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
  );
  const [counterNote, setCounterNote] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ephemeral peer typing signal (Realtime broadcast, cleared after inactivity).
  const [peerTyping, setPeerTyping] = useState(false);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<{ notifyTyping: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    if (!activeConversationId) return;
    const channel = subscribeTyping(activeConversationId, (typing) => {
      setPeerTyping(typing);
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      if (typing) {
        typingStopRef.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    });
    typingChannelRef.current = channel;
    return () => {
      channel.stop();
      typingChannelRef.current = null;
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      setPeerTyping(false);
    };
  }, [activeConversationId]);

  // Opening a conversation clears its unread badge and records a read receipt.
  useEffect(() => {
    if (activeConversationId) markConversationAsRead(activeConversationId);
    // markConversationAsRead is recreated each render; key the effect on the
    // conversation plus the newest message so receipts stay fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, chatMessages.length]);

  const counterValue = Number(counterPrice);
  const isCounterValid = Number.isFinite(counterValue) && counterValue > 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const parseDuration = (value?: string) => {
    if (!value) return 0;
    const [m, s] = value.split(':').map(Number);
    return (Number.isFinite(m) ? m : 0) * 60 + (Number.isFinite(s) ? s : 0);
  };

  const handleAttachmentFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'pdf'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!activeConversationId) {
      setAttachmentError(t('attachmentNeedsConversation', 'Start the conversation before attaching a file.'));
      return;
    }
    setAttachmentError(null);
    setUploadingAttachment(true);
    const uploaded = await uploadChatAttachment(file, activeConversationId);
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || t('attachmentUploadFailed', 'Upload failed. Please try again.'));
      return;
    }
    const size =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    sendAttachment(file.name, type, '', {
      storagePath: uploaded.path,
      mimeType: file.type,
      size,
    });
    setIsAttachmentDrawerOpen(false);
  };

  // Auto-scroll on new messages. Anchor to the scroll container's bottom:
  // scrollIntoView would align the end marker to the top edge and hide the
  // latest bubbles behind the sticky sub-header.
  useEffect(() => {
    const container = messagesEndRef.current?.closest('main');
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, isRecording]);

  // Audio note playback timer (capped at the recorded duration)
  useEffect(() => {
    let interval: any;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioPlaybackSecs((prev) => {
          if (playingDuration > 0 && prev >= playingDuration) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio, playingDuration]);

  // Voice note recording simulation
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recordSecs < 1) {
      setRecordSecs(0);
      return;
    }
    sendVoiceNote(formatDuration(recordSecs));
    setRecordSecs(0);
  };

  const handleSendCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCounterValid) return;
    counterOffer(counterValue, counterNote.trim());
    setIsCounterModalOpen(false);
  };

  // Return to the conversation list (broker or buyer inbox).
  const handleBackToChats = () => {
    setSelectedBrokerId('');
    setSelectedListingId('');
  };

  if (!broker) {
    if (myBrokerId) {
      return <BrokerInbox />;
    }
    if (authUserId) {
      return <BuyerInbox />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">forum</span>
        </div>
        <h3 className="text-base font-bold text-on-surface">No Active Conversations</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1.5 mb-6 leading-relaxed">
          Open a listing and contact its broker to negotiate terms, schedule inspections, and track your deal.
        </p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
        >
          Browse Listings
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col relative">
        {/* Sticky Broker Context Sub-Header */}
        <section className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-outline-variant/15 shadow-xs">
          <div className="px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            {/* Broker Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBackToChats}
                className="w-9 h-9 -ml-1 rounded-2xl flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all cursor-pointer shrink-0"
                title={t('backToChats', 'Back to chats')}
                aria-label="Back to chats"
              >
                <span className="material-symbols-outlined text-[22px]">arrow_back</span>
              </button>
              <div className="relative shrink-0">
                {broker.avatar ? (
                  <img
                    alt={broker.name}
                    className="w-11 h-11 rounded-full object-cover shadow-sm ring-2 ring-primary/20"
                    src={broker.avatar}
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-surface-container-high text-outline flex items-center justify-center shadow-sm ring-2 ring-primary/20">
                    <span className="material-symbols-outlined text-[22px]">person</span>
                  </div>
                )}
                {broker.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-surface" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                    {broker.name}
                  </h1>
                  {broker.verificationStatus === 'approved' && (
                    <span
                      className="material-symbols-outlined text-primary text-[16px] shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
                  <span className={`font-bold ${peerTyping || broker.isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-outline'}`}>
                    {peerTyping
                      ? t('typing', 'Typing...')
                      : broker.isOnline
                        ? t('online', 'Online')
                        : t('offline', 'Offline')}
                  </span>
                  {broker.title && (
                    <>
                      <span>•</span>
                      <span className="truncate">{broker.title}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Inspection Calls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (!broker) return;
                  void startCall({
                    conversationId: activeConversationId || undefined,
                    listingId: selectedListingId || undefined,
                    brokerId: broker.id,
                    calleeUserId: broker.ownerId,
                    kind: 'audio',
                    peerName: broker.name,
                    peerAvatar: broker.avatar,
                  });
                }}
                disabled={Boolean(callSession)}
                className="w-9 h-9 rounded-2xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-transform active:scale-95 text-primary cursor-pointer border border-outline-variant/20 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('callBroker', 'Voice Call')}
              >
                <span className="material-symbols-outlined text-[19px]">call</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!broker) return;
                  void startCall({
                    conversationId: activeConversationId || undefined,
                    listingId: selectedListingId || undefined,
                    brokerId: broker.id,
                    calleeUserId: broker.ownerId,
                    kind: 'video',
                    peerName: broker.name,
                    peerAvatar: broker.avatar,
                  });
                }}
                disabled={Boolean(callSession)}
                className="w-9 h-9 rounded-2xl bg-surface-container flex items-center justify-center hover:bg-surface-container-high transition-transform active:scale-95 text-primary cursor-pointer border border-outline-variant/20 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('inspect', 'Live Video Inspection')}
              >
                <span className="material-symbols-outlined text-[19px]">videocam</span>
              </button>
            </div>
          </div>

          {/* Compact Property Subject Ribbon */}
          {relatedListing && (
            <div className="px-3.5 sm:px-6 pb-2">
              <div className="bg-surface-container-lowest rounded-2xl p-2 sm:p-2.5 flex items-center justify-between gap-2.5 shadow-2xs border border-outline-variant/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  {relatedListing.image ? (
                    <img
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                      alt={relatedListing.title}
                      src={relatedListing.image}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-surface-container text-outline flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">home_work</span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      {relatedListing.registryNumber && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tight">
                          {relatedListing.registryNumber}
                        </span>
                      )}
                      <span className="text-[11px] text-on-surface-variant truncate">
                        {relatedListing.location}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface truncate font-extrabold">
                      {formatPrice(relatedListing.price)}{' '}
                      <span className="text-on-surface-variant font-normal">
                        • {relatedListing.beds ? `${relatedListing.beds}-Bed ` : ''}{relatedListing.category}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openListingDetails(relatedListing.id)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1 hover:bg-primary-container active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    <span>{t('inspect', 'Listing')}</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Message Stream Timeline */}
        <div className="flex-1 px-3.5 sm:px-6 pt-3 pb-4 flex flex-col gap-3">
          {/* Transaction Escrow Protocol Banner */}
          <div className="mx-auto w-full max-w-md">
            <div className="bg-surface-container-low rounded-2xl p-2.5 flex items-center gap-2.5 shadow-2xs border border-outline-variant/15">
              <div className="w-8 h-8 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[17px]">gavel</span>
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-xs text-primary font-bold">{t('dealTrackerTitle', 'Transaction Escrow Protocol')}</p>
                <p className="text-[11px] text-on-surface-variant leading-tight">
                  {t('dealNoticeSandbox', 'Milestone-tracked offer negotiations with notary verification oversight.')}
                </p>
              </div>
            </div>
          </div>

          {/* Date Separator */}
          <div className="flex items-center justify-center my-1">
            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-3 py-0.5 rounded-full shadow-2xs">
              Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Message List or Zero State */}
          {chatMessages.length === 0 && chatLoading ? (
            <div className="flex flex-col gap-3 py-2" aria-label="Loading messages">
              {[
                { self: false, w: 'w-44' },
                { self: true, w: 'w-52' },
                { self: false, w: 'w-36' },
              ].map((row, i) => (
                <div key={i} className={`flex ${row.self ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`h-12 ${row.w} rounded-2xl bg-surface-container-high/70 animate-pulse`}
                  />
                </div>
              ))}
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">chat</span>
              </div>
              <h4 className="text-sm font-bold text-on-surface">Direct Inquiry with {broker.name}</h4>
              <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                Send a message to schedule an inspection, ask for registry documents, or propose purchase terms.
              </p>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <button
                  type="button"
                  onClick={() => void loadOlderMessages()}
                  disabled={loadingOlderMessages}
                  className="self-center px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-bold cursor-pointer hover:bg-surface-container-high disabled:opacity-60"
                >
                  {loadingOlderMessages
                    ? t('loadingOlderMessages', 'Loading earlier messages...')
                    : t('loadOlderMessages', 'Load earlier messages')}
                </button>
              )}
              {chatMessages.map((msg) => {
            // Broker Messages
            if (msg.sender === 'broker') {
              return (
                <div key={msg.id} className="flex flex-col gap-2 max-w-[88%] sm:max-w-[80%] self-start">
                  {msg.text && (
                    <div className="bg-surface-container-lowest text-on-surface p-3 sm:p-3.5 rounded-2xl rounded-tl-xs shadow-xs border border-outline-variant/20 flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-[11px] text-primary font-bold mb-0.5">
                        <span>{msg.senderName || broker.name}</span>
                        <span
                          className="material-symbols-outlined text-[13px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line">
                        {msg.text}
                      </p>
                      <span className="self-end text-[10px] text-outline mt-0.5">{msg.timestamp}</span>
                    </div>
                  )}

                  {/* Escrow Purchase Offer Card */}
                  {msg.offer && (
                    <div className="w-full my-1">
                      <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-lg border-2 border-primary/20 relative overflow-hidden flex flex-col gap-3">
                        {/* Top Gradient Banner */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600" />

                        {/* Offer Header */}
                        <div className="flex items-start justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                              <span
                                className="material-symbols-outlined text-[20px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                verified_user
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm font-bold text-on-surface">
                                Purchase Offer
                              </span>
                              <span className="text-[11px] text-secondary font-bold">
                                Escrow Offer
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                              msg.offer.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                                : msg.offer.status === 'declined'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                msg.offer.status === 'accepted'
                                  ? 'bg-emerald-500'
                                  : msg.offer.status === 'declined'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500 animate-pulse'
                              }`}
                            />
                            <span>
                              {msg.offer.status === 'accepted'
                                ? 'Aqbalay • Accepted'
                                : msg.offer.status === 'declined'
                                ? 'Declined'
                                : 'Active • Dalab Furan'}
                            </span>
                          </span>
                        </div>

                        {/* Price & Spec Highlight */}
                        <div className="bg-surface-container-low rounded-2xl p-3 flex flex-col gap-2 border border-outline-variant/15">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-on-surface-variant font-medium">Asset Subject:</span>
                            <span className="text-on-surface font-bold truncate max-w-[200px]">
                              {msg.offer.assetSubject}
                            </span>
                          </div>

                          <div className="flex justify-between items-baseline pt-1 border-t border-outline-variant/10">
                            <div>
                              <span className="text-[10px] text-outline uppercase font-bold tracking-wider">
                                Proposed Price
                              </span>
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg sm:text-xl font-extrabold text-primary">
                                  ${msg.offer.proposedPrice.toLocaleString()} USD
                                </span>
                                <span className="text-xs line-through text-outline">
                                  ${msg.offer.originalPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              -{msg.offer.discountPercent}% Discount
                            </span>
                          </div>
                        </div>

                        {/* Escrow Legal Terms */}
                        <div className="flex flex-col gap-2 text-xs py-0.5">
                          <div className="flex items-start gap-2 text-on-surface">
                            <span className="material-symbols-outlined text-primary text-[17px] mt-0.5 shrink-0">
                              account_balance_wallet
                            </span>
                            <p className="text-[11px] leading-relaxed">
                              <strong className="font-bold">Escrow Terms:</strong> {msg.offer.escrowTerms}
                            </p>
                          </div>
                          <div className="flex items-start gap-2 text-on-surface">
                            <span className="material-symbols-outlined text-secondary text-[17px] mt-0.5 shrink-0">
                              verified
                            </span>
                            <p className="text-[11px] leading-relaxed">
                              <strong className="font-bold">Title Reference:</strong> {msg.offer.titleGuarantee}
                            </p>
                          </div>
                        </div>

                        {/* Validity Countdown */}
                        <div className="bg-surface-container rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[15px] text-secondary">
                              hourglass_top
                            </span>
                            <span>Validity Period:</span>
                          </div>
                          <span className="text-secondary font-bold">{msg.offer.expiryTime}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (msg.offer?.status === 'accepted') {
                                setCurrentScreen('deal');
                              } else {
                                acceptOffer();
                                setTimeout(() => setCurrentScreen('deal'), 350);
                              }
                            }}
                            className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer bg-primary text-on-primary hover:bg-primary-container active:scale-98"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {msg.offer?.status === 'accepted' ? 'task_alt' : 'check_circle'}
                            </span>
                            <span>
                              {msg.offer?.status === 'accepted'
                                ? 'Offer Accepted • Open Escrow Tracker →'
                                : 'Accept Offer & Lock Escrow (Aqbal Dalabka)'}
                            </span>
                          </button>

                          {msg.offer.status === 'active' && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setCounterPrice(
                                    relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
                                  );
                                  setCounterNote('');
                                  setIsCounterModalOpen(true);
                                }}
                                className="py-2.5 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/20"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                <span>Counter Offer</span>
                              </button>
                              <button
                                type="button"
                                onClick={declineOffer}
                                className="py-2.5 px-3 rounded-xl bg-surface-container-low hover:bg-red-100 hover:text-red-700 text-on-surface-variant text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/20"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                                <span>Decline</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            // User Messages
            return (
              <div key={msg.id} className="flex flex-col items-end max-w-[88%] sm:max-w-[80%] self-end gap-1.5">
                {msg.text && (
                  <div className="bg-primary text-on-primary p-3 sm:p-3.5 rounded-2xl rounded-tr-xs shadow-xs text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                    {msg.text}
                    <div className="text-[10px] text-primary-fixed mt-1 text-right flex items-center justify-end gap-1">
                      <span>{msg.timestamp}</span>
                      <span className="material-symbols-outlined text-[14px]">done_all</span>
                    </div>
                  </div>
                )}

                {/* Voice Note Bubble */}
                {msg.isAudio && (
                  <div className="bg-primary text-on-primary p-3 sm:p-3.5 rounded-2xl rounded-tr-xs shadow-md flex flex-col gap-2 w-72 sm:w-80">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlayingAudio) {
                            setIsPlayingAudio(false);
                            return;
                          }
                          const duration = parseDuration(msg.audioDuration);
                          if (duration <= 0) return;
                          setPlayingDuration(duration);
                          setAudioPlaybackSecs(0);
                          setIsPlayingAudio(true);
                        }}
                        className="w-10 h-10 rounded-full bg-surface text-primary flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer shrink-0"
                      >
                        <span className="material-symbols-outlined text-[24px]">
                          {isPlayingAudio ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      <div className="flex flex-col flex-1 gap-1 min-w-0">
                        {/* Audio Waveform Simulation */}
                        <div className="flex items-end gap-1 h-6 w-full px-1">
                          {[3, 5, 7, 4, 3, 6, 8, 5, 2, 6, 4, 7, 5, 3, 5, 4, 6, 3].map((height, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full transition-all ${
                                isPlayingAudio ? 'bg-secondary animate-pulse' : 'bg-primary-fixed'
                              }`}
                              style={{ height: `${height * 2.8}px` }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-primary-fixed text-[10px] font-semibold">
                          <span>
                            {isPlayingAudio
                              ? formatDuration(audioPlaybackSecs)
                              : msg.audioDuration || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">mic</span> Voice Memo
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-primary-fixed pt-1.5 border-t border-on-primary/20">
                      <span>{msg.audioOrigin || t('voiceNote', 'Voice Note')}</span>
                      <span className="flex items-center gap-1">
                        {msg.timestamp}
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Attachments Bubble */}
                {msg.attachments && (
                  <div className="bg-surface-container-lowest p-2 sm:p-2.5 rounded-2xl rounded-tr-xs shadow-xs border border-outline-variant/20 flex flex-col gap-2 w-64 sm:w-72">
                    <div className="grid grid-cols-2 gap-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          onClick={() =>
                            setPreviewAttachment({
                              title: att.title,
                              image: att.image || '',
                            })
                          }
                          className="relative rounded-xl overflow-hidden bg-surface-container aspect-square cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          {att.image ? (
                            <img alt={att.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src={att.image} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-high text-on-surface p-2 text-center">
                              <span className="material-symbols-outlined text-2xl text-primary">description</span>
                              <span className="text-[10px] font-bold truncate max-w-full">{att.title}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-white text-[10px] font-semibold truncate flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">
                                {att.type === 'pdf' ? 'description' : 'image'}
                              </span>
                              {att.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-1 text-[10px] text-on-surface-variant font-medium">
                      <span>{msg.attachments.length} {msg.attachments.length === 1 ? 'attachment' : 'attachments'}</span>
                      <span className="flex items-center gap-1 text-primary font-bold">
                        {msg.timestamp}
                        <span className="material-symbols-outlined text-[14px]">done_all</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sticky Above-BottomNav Floating Input Region */}
        <section className="sticky bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="max-w-2xl mx-auto px-3 sm:px-6 py-2 flex flex-col gap-2">
            {(uploadingAttachment || attachmentError) && (
              <div className="flex items-center gap-1.5 rounded-lg bg-error/10 px-2.5 py-1.5 text-error">
                <span className="material-symbols-outlined text-[14px]">
                  {uploadingAttachment ? 'progress_activity' : 'error'}
                </span>
                <span className="text-[11px] font-semibold">
                  {uploadingAttachment
                    ? t('uploadingAttachment', 'Uploading attachment…')
                    : attachmentError}
                </span>
              </div>
            )}
            {/* Attachment Drawer Grid */}
            <AnimatePresence>
              {isAttachmentDrawerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-surface-container-lowest rounded-2xl p-2.5 shadow-md border border-outline-variant/20 grid grid-cols-4 gap-2 overflow-hidden"
                >
                  <label className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAttachmentFile(e, 'image')}
                    />
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                    </div>
                    <span className="text-[11px] font-semibold text-on-surface">{t('uploadPhoto', 'Photo')}</span>
                  </label>

                  <label className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => handleAttachmentFile(e, 'pdf')}
                    />
                    <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </div>
                    <span className="text-[11px] font-semibold text-on-surface">{t('uploadDocument', 'Document')}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      acceptOffer();
                      setIsAttachmentDrawerOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">payments</span>
                    </div>
                    <span className="text-[11px] font-semibold text-on-surface">{t('payEscrowDeposit', 'Escrow Pay')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCounterPrice(
                        relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
                      );
                      setCounterNote('');
                      setIsCounterModalOpen(true);
                      setIsAttachmentDrawerOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest text-primary flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">real_estate_agent</span>
                    </div>
                    <span className="text-[11px] font-semibold text-on-surface">{t('counterOffer', 'Counter')}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Row */}
            <form onSubmit={handleSend} className="flex items-center gap-2">
              {/* Plus Attachment Toggle */}
              <button
                type="button"
                onClick={() => setIsAttachmentDrawerOpen(!isAttachmentDrawerOpen)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 cursor-pointer border ${
                  isAttachmentDrawerOpen
                    ? 'bg-primary text-on-primary border-primary rotate-45'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high border-outline-variant/20'
                }`}
                title={t('attachFiles', 'Attach files')}
              >
                <span className="material-symbols-outlined text-[22px]">add</span>
              </button>

              {/* Text Input Box */}
              <div className="flex-1 bg-surface-container-lowest rounded-2xl flex items-center px-3.5 py-1.5 sm:py-2 shadow-xs border border-outline-variant/25 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    if (e.target.value.trim()) typingChannelRef.current?.notifyTyping();
                  }}
                  placeholder={
                    isRecording
                      ? `${t('voiceNote', 'Recording')} (${recordSecs}s)`
                      : t('sendMsgPlaceholder', 'Discuss title deed, offer, or inspection...')
                  }
                  className="w-full bg-transparent text-on-surface placeholder:text-outline text-xs sm:text-sm focus:outline-none"
                />

                {/* Voice Note Record Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    if (isRecording) {
                      handleStopRecording();
                    } else {
                      setIsRecording(true);
                    }
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ml-1.5 active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse shadow-md'
                      : 'bg-surface-container text-primary hover:bg-surface-container-high'
                  }`}
                  title={isRecording ? t('voiceNote', 'Stop Recording') : t('voiceNote', 'Record Voice Memo')}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRecording ? 'stop' : 'mic'}
                  </span>
                </button>
              </div>

              {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !isRecording) || chatSending}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-all shrink-0 cursor-pointer ${
                    inputText.trim() && !chatSending
                      ? 'bg-primary text-on-primary shadow-md hover:bg-primary-container active:scale-98'
                      : 'bg-surface-container text-outline cursor-not-allowed'
                  }`}
                title={t('sendBtn', 'Send message')}
              >
                <span className="material-symbols-outlined text-[20px] rtl:rotate-180">send</span>
              </button>
            </form>
          </div>
        </section>

        {/* Counter Offer Modal */}
        <AnimatePresence>
          {isCounterModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-surface-container-lowest rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                  <h3 className="text-sm font-bold text-on-surface">Propose Counter Offer</h3>
                  <button
                    onClick={() => setIsCounterModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <form onSubmit={handleSendCounter} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface">Counter Price (USD)</label>
                    <input
                      type="number"
                      min="1"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 text-sm font-bold text-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface">Amended Closing Terms</label>
                    <textarea
                      rows={2}
                      value={counterNote}
                      onChange={(e) => setCounterNote(e.target.value)}
                      className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 text-xs text-on-surface focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isCounterValid}
                    className={`w-full py-3 text-xs font-bold rounded-xl shadow-md transition-all ${
                      isCounterValid
                        ? 'bg-primary text-on-primary cursor-pointer hover:bg-primary-container'
                        : 'bg-surface-container-highest text-outline cursor-not-allowed'
                    }`}
                  >
                    Submit Counter Offer to Broker
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Document Fullscreen Preview Modal */}
        <AnimatePresence>
          {previewAttachment && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-surface-container-lowest rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-outline-variant/30"
              >
                <div className="p-3.5 bg-primary text-on-primary flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{previewAttachment.title}</span>
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="w-7 h-7 rounded-full bg-primary-container text-on-primary flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <div className="p-4 bg-surface-container flex items-center justify-center max-h-[60vh] overflow-hidden">
                  {previewAttachment.image ? (
                    <img
                      alt={previewAttachment.title}
                      className="max-h-[50vh] w-auto object-contain rounded-xl shadow-md"
                      src={previewAttachment.image}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl text-primary">description</span>
                      <span className="text-xs font-bold mt-2">{previewAttachment.title}</span>
                    </div>
                  )}
                </div>
                <div className="p-3.5 bg-surface-container-lowest flex items-center justify-between border-t border-outline-variant/15">
                  <span className="text-[11px] text-outline font-medium">{t('attachmentPreview', 'Attachment preview')}</span>
                  <button
                    onClick={() => setPreviewAttachment(null)}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs cursor-pointer hover:bg-primary-container transition-colors"
                  >
                    {t('close', 'Close')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
