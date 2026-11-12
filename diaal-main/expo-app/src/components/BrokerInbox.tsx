import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
import { uploadChatAttachment } from '../lib/storage';
import { useColors, typography, shadow, Palette } from '../theme';

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    wrap: { width: '100%', maxWidth: 672, alignSelf: 'center', flex: 1 },
    inboxContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 },
    inboxInner: { width: '100%', maxWidth: 672, alignSelf: 'center', gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 18, fontFamily: typography.extrabold, color: colors.onSurface, letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
    refreshBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.success + '14',
      borderWidth: 1,
      borderColor: colors.success + '26',
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBox: {
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.onSurface, paddingVertical: 8 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.outline,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    countPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
    },
    countText: { fontSize: 10, fontFamily: typography.bold, color: colors.onSurfaceVariant },
    list: { gap: 10 },
    skeleton: {
      height: 84,
      borderRadius: 18,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '1A',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 56,
      paddingHorizontal: 24,
      gap: 6,
      minHeight: 280,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.success + '14',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      ...shadow.card,
    },
    listingImage: { width: 52, height: 52, borderRadius: 16 },
    listingImageFallback: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0, gap: 3 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    buyerName: { fontSize: 13, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    time: { fontSize: 10.5, color: colors.outline },
    listingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listing: { fontSize: 11, fontFamily: typography.semibold, color: colors.success, flexShrink: 1 },
    last: { fontSize: 11.5, color: colors.onSurfaceVariant },
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
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.success + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buyerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buyerInitial: { fontSize: 15, fontFamily: typography.extrabold, color: colors.onPrimaryContainer },
    convoName: { fontSize: 14.5, fontFamily: typography.extrabold, color: colors.onSurface, letterSpacing: -0.2 },
    convoListing: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 1 },
    messages: { paddingHorizontal: 14, paddingVertical: 14, gap: 10, flexGrow: 1 },
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
    msgCol: { maxWidth: '86%', gap: 4 },
    msgColSelf: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    msgColOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    sender: { fontSize: 10, fontFamily: typography.bold, color: colors.outline, paddingHorizontal: 6 },
    bubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      ...shadow.card,
    },
    bubbleSelf: { backgroundColor: colors.primary, borderTopRightRadius: 6 },
    bubbleOther: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    bubbleText: { fontSize: 13.5, lineHeight: 20 },
    bubbleTextSelf: { color: colors.onPrimary },
    bubbleTextOther: { color: colors.onSurface },
    bubbleTime: { fontSize: 9.5, marginTop: 4, textAlign: 'right', opacity: 0.7 },
    bubbleTimeSelf: { color: colors.onPrimary },
    bubbleTimeOther: { color: colors.onSurfaceVariant },
    mediaCol: { gap: 8, marginTop: 2 },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 210 },
    voicePlay: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voiceWave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
    voiceBar: { width: 3.5, borderRadius: 2 },
    voiceMeta: { alignItems: 'flex-end', gap: 2 },
    voiceDur: { fontSize: 10.5, fontFamily: typography.semibold },
    mediaImage: {
      width: 220,
      height: 165,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
    },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
    docName: { fontSize: 12.5, fontFamily: typography.semibold },
    docMeta: { fontSize: 10.5, marginTop: 1 },
    offerCard: {
      width: '100%',
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1.5,
      borderColor: colors.success + '40',
      gap: 8,
      marginTop: 4,
      ...shadow.card,
    },
    offerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    offerKicker: { fontSize: 11, fontFamily: typography.bold, color: colors.success },
    offerStatus: { fontSize: 10, fontFamily: typography.bold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    offerMid: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
    offerSubject: { fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
    offerPrice: { fontSize: 15, fontFamily: typography.extrabold, color: colors.primary },
    offerActions: { flexDirection: 'row', gap: 8 },
    acceptBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.success,
      alignItems: 'center',
    },
    acceptText: { fontSize: 11, fontFamily: typography.bold, color: '#ffffff' },
    declineBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
    },
    declineText: { fontSize: 11, fontFamily: typography.bold, color: colors.onSurface },
    composerSection: {
      paddingHorizontal: 12,
      paddingTop: 8,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '26',
    },
    composerCard: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      paddingHorizontal: 12,
      paddingVertical: 6,
      ...shadow.card,
    },
    input: {
      flex: 1,
      fontSize: 13.5,
      color: colors.onSurface,
      paddingVertical: 9,
      maxHeight: 96,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    composerIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 3,
    },
    composerIconActive: { backgroundColor: '#ef4444' },
    attachStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.errorContainer,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 8,
    },
    attachStatusText: {
      flexShrink: 1,
      fontSize: 11,
      fontFamily: typography.semibold,
      color: colors.onErrorContainer,
    },
    drawer: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
      ...shadow.card,
    },
    drawerItem: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: colors.surfaceContainerLow,
    },
    drawerIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    drawerLabel: { fontSize: 10.5, fontFamily: typography.semibold, color: colors.onSurface },
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
  const [query, setQuery] = useState('');
  const seenIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<ScrollView | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackSecs, setPlaybackSecs] = useState(0);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  useEffect(
    () => () => {
      void soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    },
    []
  );

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordSecs((secs) => secs + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.buyerName.toLowerCase().includes(q) ||
        item.listingTitle.toLowerCase().includes(q) ||
        item.lastMessage.toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleSelect = (item: InboxItem) => {
    setSelected(item);
    setInput('');
    setAttachmentError('');
    setIsAttachOpen(false);
  };

  const appendSent = (sent: ChatMessage, tempId?: string) => {
    const duplicate = seenIds.current.has(sent.id);
    seenIds.current.add(sent.id);
    setMessages((prev) => {
      const base = tempId ? prev.filter((m) => m.id !== tempId) : prev;
      return duplicate ? base : [...base, sent];
    });
    void loadInbox(true);
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
    appendSent(sent, tempId);
  };

  const pickAndSendPhoto = async () => {
    if (!selected || !myBrokerId || uploadingAttachment || isRecording) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || 'Photo.jpg';
    const mimeType = asset.mimeType || 'image/jpeg';

    setAttachmentError('');
    setIsAttachOpen(false);
    setUploadingAttachment(true);
    const uploaded = await uploadChatAttachment(asset.uri, selected.conversationId, mimeType);
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || 'Upload failed. Please try again.');
      return;
    }

    const sent = await sendChatMessage({
      conversationId: selected.conversationId,
      listingId: selected.listingId,
      brokerId: myBrokerId,
      sender: 'broker',
      senderName: currentUser.name || 'Broker',
      body: `Attached Document: ${name}`,
      attachment: {
        id: `f-${Date.now()}`,
        title: name,
        type: 'image',
        image: '',
        size: 'Photo',
        storagePath: uploaded.path,
        mimeType,
      },
    });
    if (!sent) {
      setAttachmentError('Photo was not saved. Check your chat permissions.');
      return;
    }
    appendSent(sent);
  };

  const pickAndSendDocument = async () => {
    if (!selected || !myBrokerId || uploadingAttachment || isRecording) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.name || 'Document';
    const mimeType = asset.mimeType || 'application/octet-stream';

    setAttachmentError('');
    setIsAttachOpen(false);
    setUploadingAttachment(true);
    const uploaded = await uploadChatAttachment(asset.uri, selected.conversationId, mimeType);
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || 'Upload failed. Please try again.');
      return;
    }

    const sent = await sendChatMessage({
      conversationId: selected.conversationId,
      listingId: selected.listingId,
      brokerId: myBrokerId,
      sender: 'broker',
      senderName: currentUser.name || 'Broker',
      body: `Attached Document: ${name}`,
      attachment: {
        id: `f-${Date.now()}`,
        title: name,
        type: 'pdf',
        image: '',
        size: asset.size ? `${Math.max(1, Math.round(asset.size / 1024))} KB` : 'File',
        storagePath: uploaded.path,
        mimeType,
      },
    });
    if (!sent) {
      setAttachmentError('File was not saved. Check your chat permissions.');
      return;
    }
    appendSent(sent);
  };

  const handleStartRecording = async () => {
    if (!selected || !myBrokerId) return;
    if (Platform.OS === 'web') {
      setAttachmentError('Voice recording is available in the installed app.');
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone needed',
          'Allow microphone access to record a voice note.'
        );
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingMessageId(null);
        setPlaybackSecs(0);
      }
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      setAttachmentError('');
      setRecordSecs(0);
      setIsRecording(true);
    } catch (err) {
      console.warn('[DILAAL] recording start failed:', err);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      setAttachmentError('Could not start recording.');
    }
  };

  const handleStopRecording = async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (!recording) return;

    let uri: string | null = null;
    let durationMs = recordSecs * 1000;
    try {
      const status = await recording.getStatusAsync();
      if (status.durationMillis) durationMs = status.durationMillis;
      await recording.stopAndUnloadAsync();
      uri = recording.getURI();
    } catch (err) {
      console.warn('[DILAAL] recording stop failed:', err);
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    setRecordSecs(0);

    const secs = Math.round(durationMs / 1000);
    if (!uri || secs < 1 || !selected || !myBrokerId) return;

    setUploadingAttachment(true);
    setAttachmentError('');
    const uploaded = await uploadChatAttachment(uri, selected.conversationId, 'audio/m4a');
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || 'Voice note upload failed.');
      return;
    }

    const sent = await sendChatMessage({
      conversationId: selected.conversationId,
      listingId: selected.listingId,
      brokerId: myBrokerId,
      sender: 'broker',
      senderName: currentUser.name || 'Broker',
      body: 'Voice Memo (Audio Transmission)',
      isAudio: true,
      audioDuration: formatSecs(secs),
      audioOrigin: 'Broker Device',
      attachment: {
        id: `voice-${Date.now()}`,
        title: 'Voice Memo',
        type: 'audio',
        url: uri,
        storagePath: uploaded.path,
        mimeType: 'audio/m4a',
      },
    });
    if (!sent) {
      setAttachmentError('Voice note was not saved. Check your chat permissions.');
      return;
    }
    appendSent(sent);
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
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.inboxContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inboxInner}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('brokerInbox', 'Inbox')}</Text>
              <Text style={styles.subtitle}>
                {items.length === 1 ? '1 conversation with a buyer' : `${items.length} conversations with buyers`}
              </Text>
            </View>
            <Pressable
              onPress={() => void loadInbox(true)}
              style={styles.refreshBtn}
              accessibilityLabel="Refresh"
            >
              <Icon name="refresh" size={18} color={colors.success} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Icon name="search" size={18} color={colors.outline} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchChats', 'Search chats')}
              placeholderTextColor={colors.outline}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                <Icon name="close" size={16} color={colors.outline} />
              </Pressable>
            ) : null}
          </View>

          {!loading && items.length > 0 ? (
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>{t('recentChats', 'Recent')}</Text>
              <View style={styles.countPill}>
                <Text style={styles.countText}>{filtered.length}</Text>
              </View>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.list}>
              <Skeleton style={styles.skeleton} />
              <Skeleton style={styles.skeleton} />
              <Skeleton style={styles.skeleton} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="forum" size={30} color={colors.success} />
              </View>
              <Text style={styles.emptyTitle}>No buyer messages yet</Text>
              <Text style={styles.emptySub}>
                When a buyer contacts one of your listings, the conversation will appear here.
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="search" size={28} color={colors.success} />
              </View>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptySub}>Try a different buyer name, listing, or message.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((item) => (
                <Pressable
                  key={item.conversationId}
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  {item.listingImage ? (
                    <Image source={{ uri: item.listingImage }} style={styles.listingImage} />
                  ) : (
                    <View style={styles.listingImageFallback}>
                      <Icon name="home_work" size={22} color={colors.onPrimaryContainer} />
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={styles.buyerName} numberOfLines={1}>
                        {item.buyerName}
                      </Text>
                      <Text style={styles.time}>{item.lastAt}</Text>
                    </View>
                    <View style={styles.listingRow}>
                      <Icon name="home_work" size={12} color={colors.success} />
                      <Text style={styles.listing} numberOfLines={1}>
                        {item.listingTitle}
                      </Text>
                    </View>
                    <Text style={styles.last} numberOfLines={1}>
                      {item.lastMessage}
                    </Text>
                  </View>
                  <Icon name="chevron_right" size={18} color={colors.outlineVariant} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  const initial = (selected.buyerName || 'B').charAt(0).toUpperCase();

  const formatSecs = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  const togglePlayback = async (msg: ChatMessage) => {
    const uri = msg.attachments?.find((att) => att.type === 'audio')?.url;
    if (playingMessageId === msg.id) {
      await soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      setPlayingMessageId(null);
      setPlaybackSecs(0);
      return;
    }
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setPlayingMessageId(null);
    setPlaybackSecs(0);
    if (!uri) {
      setError(t('voiceMissing', 'Original voice audio is not available for this message.'));
      return;
    }
    try {
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, (status) => {
        if (!status.isLoaded) return;
        if (typeof status.positionMillis === 'number') {
          setPlaybackSecs(Math.floor(status.positionMillis / 1000));
        }
        if (status.didJustFinish) {
          void soundRef.current?.unloadAsync().catch(() => {});
          soundRef.current = null;
          setPlayingMessageId(null);
          setPlaybackSecs(0);
        }
      });
      soundRef.current = sound;
      setPlayingMessageId(msg.id);
    } catch {
      setError(t('voicePlayFailed', 'Could not play this voice note.'));
    }
  };

  const renderMedia = (msg: ChatMessage, self: boolean) => {
    const audio = msg.attachments?.find((att) => att.type === 'audio');
    const visuals = msg.attachments?.filter((att) => att.type !== 'audio') ?? [];
    if (!audio && !msg.isAudio && visuals.length === 0) return null;
    const isPlaying = playingMessageId === msg.id;
    const hasAudio = Boolean(audio?.url);
    const tint = self ? colors.onPrimary : colors.onSurface;
    const muted = self ? colors.onPrimary : colors.onSurfaceVariant;
    return (
      <View style={styles.mediaCol}>
        {audio || msg.isAudio ? (
          <View style={styles.voiceRow}>
            <Pressable
              onPress={() => void togglePlayback(msg)}
              style={[styles.voicePlay, !hasAudio && { opacity: 0.55 }]}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play_arrow'}
                size={22}
                color={colors.primary}
              />
            </Pressable>
            <View style={styles.voiceWave}>
              {[8, 14, 20, 12, 18, 10, 16, 22, 13, 9, 17, 11].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.voiceBar,
                    {
                      height: h,
                      backgroundColor: isPlaying ? colors.secondaryContainer : tint,
                      opacity: isPlaying ? 1 : 0.45,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.voiceMeta}>
              <Text style={[styles.voiceDur, { color: tint }]}>
                {hasAudio
                  ? isPlaying
                    ? formatSecs(playbackSecs)
                    : msg.audioDuration || '0:05'
                  : 'Unavailable'}
              </Text>
              <Icon name="mic" size={12} color={muted} />
            </View>
          </View>
        ) : null}

        {visuals.map((att) =>
          att.image ? (
            <Image key={att.id} source={{ uri: att.image }} style={styles.mediaImage} />
          ) : (
            <View key={att.id} style={styles.docRow}>
              <Icon name="description" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: tint }]} numberOfLines={1}>
                  {att.title}
                </Text>
                <Text style={[styles.docMeta, { color: muted }]}>
                  {att.type === 'pdf' ? 'PDF document' : att.size || 'Attachment'}
                </Text>
              </View>
            </View>
          )
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.wrap}>
        <View style={styles.convoHeader}>
          <Pressable onPress={() => setSelected(null)} style={styles.backBtn} accessibilityLabel="Back to inbox">
            <Icon name="arrow_back" size={20} color={colors.success} />
          </Pressable>
          <View style={styles.buyerAvatar}>
            <Text style={styles.buyerInitial}>{initial}</Text>
          </View>
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
              <Icon name="autorenew" size={20} color={colors.success} />
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

              const media = renderMedia(msg, fromBroker);
              const placeholder = /^(Attached Document:|Voice Memo \(Audio Transmission\))/.test(
                msg.text || ''
              );
              const showText =
                Boolean(msg.text) &&
                !((msg.isAudio || Boolean(msg.attachments?.length)) && placeholder);

              return (
                <View
                  key={msg.id}
                  style={[styles.msgCol, fromBroker ? styles.msgColSelf : styles.msgColOther]}
                >
                  <Text style={styles.sender}>
                    {fromBroker ? 'You' : msg.senderName || selected.buyerName}
                  </Text>
                  <View style={[styles.bubble, fromBroker ? styles.bubbleSelf : styles.bubbleOther]}>
                    {showText ? (
                      <Text
                        style={[
                          styles.bubbleText,
                          fromBroker ? styles.bubbleTextSelf : styles.bubbleTextOther,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    ) : null}
                    {media}
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
                      {msg.offer.status === 'active' && !fromBroker ? (
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

        <View style={[styles.composerSection, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {isAttachOpen ? (
            <View style={styles.drawer}>
              <Pressable onPress={() => void pickAndSendPhoto()} style={styles.drawerItem}>
                <View style={[styles.drawerIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="photo_camera" size={20} color={colors.onPrimary} />
                </View>
                <Text style={styles.drawerLabel}>Photo</Text>
              </Pressable>

              <Pressable onPress={() => void pickAndSendDocument()} style={styles.drawerItem}>
                <View style={[styles.drawerIcon, { backgroundColor: colors.secondary }]}>
                  <Icon name="attach_file" size={20} color={colors.onSecondary} />
                </View>
                <Text style={styles.drawerLabel}>File</Text>
              </Pressable>
            </View>
          ) : null}

          {uploadingAttachment || attachmentError ? (
            <View style={styles.attachStatus}>
              <Icon
                name={uploadingAttachment ? 'progress_activity' : 'error'}
                size={14}
                color={colors.onErrorContainer}
              />
              <Text style={styles.attachStatusText}>
                {uploadingAttachment ? 'Uploading attachment…' : attachmentError}
              </Text>
            </View>
          ) : null}

          <View style={styles.composerCard}>
            <Pressable
              onPress={() => setIsAttachOpen((open) => !open)}
              disabled={uploadingAttachment || isRecording}
              style={[
                styles.composerIcon,
                isAttachOpen && { backgroundColor: colors.primaryContainer },
              ]}
              accessibilityLabel="Attach file"
            >
              <Icon
                name="attach_file"
                size={18}
                color={isAttachOpen ? colors.onPrimary : colors.primary}
              />
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                isRecording
                  ? `Recording voice note (${recordSecs}s)…`
                  : t('typeMessage', 'Type a message…')
              }
              placeholderTextColor={colors.outline}
              style={styles.input}
              multiline
            />

            <Pressable
              onPress={() => {
                if (isRecording) {
                  void handleStopRecording();
                } else {
                  void handleStartRecording();
                }
              }}
              style={[styles.composerIcon, isRecording && styles.composerIconActive]}
              accessibilityLabel={isRecording ? 'Stop recording' : 'Record voice memo'}
            >
              <Icon
                name={isRecording ? 'stop' : 'mic'}
                size={17}
                color={isRecording ? '#ffffff' : colors.primary}
              />
            </Pressable>

            <Pressable
              onPress={() => void handleSend()}
              disabled={!input.trim() || sending}
              style={[styles.sendBtn, (!input.trim() || sending) && { opacity: 0.4 }]}
              accessibilityLabel="Send message"
            >
              <Icon name={sending ? 'autorenew' : 'send'} size={19} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
