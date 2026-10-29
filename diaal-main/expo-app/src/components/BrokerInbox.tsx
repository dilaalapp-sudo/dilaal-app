import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { useColors, typography, shadow, Palette } from '../theme';

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    wrap: { width: '100%', maxWidth: 672, alignSelf: 'center', flex: 1 },
    inboxContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 16, fontFamily: typography.extrabold, color: colors.onSurface },
    subtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skeleton: {
      height: 76,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '1A',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
      gap: 6,
      minHeight: 280,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: { fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    listingImage: { width: 44, height: 44, borderRadius: 12 },
    listingImageFallback: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    buyerName: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    time: { fontSize: 10, color: colors.outline },
    listing: { fontSize: 11, fontFamily: typography.semibold, color: colors.primary },
    last: { fontSize: 11, color: colors.onSurfaceVariant },
    convoHeader: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '26',
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    convoName: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    convoListing: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 1 },
    messages: { paddingHorizontal: 14, paddingVertical: 12, gap: 8, flexGrow: 1 },
    errorBox: {
      backgroundColor: colors.errorContainer,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    errorText: { fontSize: 11, fontFamily: typography.semibold, color: colors.onErrorContainer },
    loading: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    loadingText: { fontSize: 12, color: colors.onSurfaceVariant },
    noMessages: { textAlign: 'center', paddingVertical: 40, fontSize: 12, color: colors.onSurfaceVariant },
    systemRow: { alignSelf: 'center', maxWidth: '90%' },
    systemBubble: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    systemText: { fontSize: 10, fontFamily: typography.semibold, color: colors.onSurfaceVariant, textAlign: 'center' },
    msgCol: { maxWidth: '85%', gap: 4 },
    msgColSelf: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    msgColOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    sender: { fontSize: 10, fontFamily: typography.bold, color: colors.outline, paddingHorizontal: 4 },
    bubble: {
      padding: 12,
      borderRadius: 16,
      ...shadow.card,
    },
    bubbleSelf: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
    bubbleOther: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    bubbleText: { fontSize: 13, lineHeight: 19 },
    bubbleTextSelf: { color: colors.onPrimary },
    bubbleTextOther: { color: colors.onSurface },
    bubbleTime: { fontSize: 10, marginTop: 4, textAlign: 'right', opacity: 0.7 },
    bubbleTimeSelf: { color: colors.onPrimary },
    bubbleTimeOther: { color: colors.onSurfaceVariant },
    offerCard: {
      width: '100%',
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 12,
      borderWidth: 2,
      borderColor: colors.primary + '33',
      gap: 8,
      marginTop: 4,
    },
    offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    offerKicker: { fontSize: 11, fontFamily: typography.bold, color: colors.primary },
    offerStatus: { fontSize: 10, fontFamily: typography.bold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    offerMid: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    offerSubject: { fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
    offerPrice: { fontSize: 14, fontFamily: typography.extrabold, color: colors.primary },
    offerActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.success,
      alignItems: 'center',
    },
    acceptText: { fontSize: 11, fontFamily: typography.bold, color: '#ffffff' },
    declineBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
    },
    declineText: { fontSize: 11, fontFamily: typography.bold, color: colors.onSurface },
    composer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '26',
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.onSurface,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export const BrokerInbox: React.FC = () => {
  const { myBrokerId, currentUser, formatPrice, t } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const seenIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myBrokerId]);

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
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages, selected]);

  const handleSelect = (item: InboxItem) => {
    setSelected(item);
    setInput('');
  };

  const handleSend = async () => {
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
        prev.map((m) => (m.id === msg.id && m.offer ? { ...m, offer: { ...m.offer, status } } : m))
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
      <ScrollView style={styles.root} contentContainerStyle={styles.inboxContent} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 672, alignSelf: 'center', gap: 12 }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('brokerInbox', 'Broker Inbox')}</Text>
              <Text style={styles.subtitle}>Conversations with buyers</Text>
            </View>
            <Pressable onPress={() => void loadInbox(true)} style={styles.refreshBtn} accessibilityLabel="Refresh">
              <Icon name="refresh" size={19} color={colors.primary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ gap: 8 }}>
              <Skeleton style={styles.skeleton} />
              <Skeleton style={styles.skeleton} />
              <Skeleton style={styles.skeleton} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="forum" size={30} color={colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>No buyer messages yet</Text>
              <Text style={styles.emptySub}>
                When a buyer contacts one of your listings, the conversation will appear here.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {items.map((item) => (
                <Pressable key={item.conversationId} onPress={() => handleSelect(item)} style={styles.row}>
                  {item.listingImage ? (
                    <Image source={{ uri: item.listingImage }} style={styles.listingImage} />
                  ) : (
                    <View style={styles.listingImageFallback}>
                      <Icon name="home_work" size={20} color={colors.outline} />
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.buyerName} numberOfLines={1}>
                        {item.buyerName}
                      </Text>
                      <Text style={styles.time}>{item.lastAt}</Text>
                    </View>
                    <Text style={styles.listing} numberOfLines={1}>
                      {item.listingTitle}
                    </Text>
                    <Text style={styles.last} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.wrap}>
        <View style={styles.convoHeader}>
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn} accessibilityLabel="Back to inbox">
            <Icon name="arrow_back" size={19} color={colors.primary} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.convoName} numberOfLines={1}>
              {selected.buyerName}
            </Text>
            <Text style={styles.convoListing} numberOfLines={1}>
              {selected.listingTitle}
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {messagesLoading ? (
            <View style={styles.loading}>
              <Icon name="autorenew" size={20} color={colors.primary} />
              <Text style={styles.loadingText}>Loading messages…</Text>
            </View>
          ) : messages.length === 0 ? (
            <Text style={styles.noMessages}>No messages in this conversation yet.</Text>
          ) : (
            messages.map((msg) => {
              const fromBroker = msg.sender === 'broker';
              const fromSystem = msg.sender === 'system';

              if (fromSystem) {
                return (
                  <View key={msg.id} style={styles.systemRow}>
                    <View style={styles.systemBubble}>
                      <Text style={styles.systemText}>{msg.text}</Text>
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={msg.id}
                  style={[styles.msgCol, fromBroker ? styles.msgColSelf : styles.msgColOther]}
                >
                  <Text style={styles.sender}>
                    {fromBroker ? 'You' : msg.senderName || selected.buyerName}
                  </Text>
                  <View style={[styles.bubble, fromBroker ? styles.bubbleSelf : styles.bubbleOther]}>
                    <Text
                      style={[
                        styles.bubbleText,
                        fromBroker ? styles.bubbleTextSelf : styles.bubbleTextOther,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        styles.bubbleTime,
                        fromBroker ? styles.bubbleTimeSelf : styles.bubbleTimeOther,
                      ]}
                    >
                      {msg.timestamp}
                    </Text>
                  </View>

                  {msg.offer ? (
                    <View style={styles.offerCard}>
                      <View style={styles.offerTop}>
                        <Text style={styles.offerKicker}>Purchase Offer</Text>
                        <Text
                          style={[
                            styles.offerStatus,
                            {
                              backgroundColor:
                                msg.offer.status === 'accepted'
                                  ? colors.primaryFixed
                                  : msg.offer.status === 'declined'
                                  ? colors.errorContainer
                                  : colors.secondaryFixed,
                              color:
                                msg.offer.status === 'accepted'
                                  ? colors.primary
                                  : msg.offer.status === 'declined'
                                  ? colors.error
                                  : colors.onSecondaryFixed,
                            },
                          ]}
                        >
                          {msg.offer.status}
                        </Text>
                      </View>
                      <View style={styles.offerMid}>
                        <Text style={styles.offerSubject} numberOfLines={1}>
                          {msg.offer.assetSubject}
                        </Text>
                        <Text style={styles.offerPrice}>{formatPrice(msg.offer.proposedPrice)}</Text>
                      </View>
                      {msg.offer.status === 'active' ? (
                        <View style={styles.offerActions}>
                          <Pressable onPress={() => void handleOffer(msg, 'accepted')} style={styles.acceptBtn}>
                            <Text style={styles.acceptText}>Accept</Text>
                          </Pressable>
                          <Pressable onPress={() => void handleOffer(msg, 'declined')} style={styles.declineBtn}>
                            <Text style={styles.declineText}>Decline</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('typeMessage', 'Type a message…')}
            placeholderTextColor={colors.outline}
            style={styles.input}
            multiline
          />
          <Pressable
            onPress={() => void handleSend()}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
          >
            <Icon name={sending ? 'autorenew' : 'send'} size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
