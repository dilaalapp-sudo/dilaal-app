import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { uploadChatAttachment } from '../lib/storage';
import { subscribeTyping } from '../lib/chat';
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';
import { BrokerInbox } from '../components/BrokerInbox';
import { BuyerInbox } from '../components/BuyerInbox';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';
import { useColors, typography, shadow, Palette } from '../theme';
import type { ChatMessage } from '../types';

const WAVE_HEIGHTS = [3, 5, 7, 4, 3, 6, 8, 5, 2, 6, 4, 7, 5, 3, 5, 4, 6, 3];

// Mono 64 kbps AAC keeps a one-minute note around 480 KB.
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
    wrap: { flex: 1, width: '100%', maxWidth: 672, alignSelf: 'center' },
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '1F',
    },
    headerRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.success + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarWrap: { position: 'relative' },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderWidth: 2,
      borderColor: colors.success + '33',
    },
    avatarFallback: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primaryContainer,
      borderWidth: 2,
      borderColor: colors.success + '33',
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.success,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    nameBlock: { flexShrink: 1, gap: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    name: { fontSize: 15, fontFamily: typography.extrabold, color: colors.onSurface, flexShrink: 1, letterSpacing: -0.2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    status: { fontSize: 11, fontFamily: typography.semibold },
    statusOnline: { color: colors.success },
    statusOffline: { color: colors.outline },
    title: { fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
    callRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    callBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.success + '14',
      borderWidth: 1,
      borderColor: colors.success + '26',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ribbonWrap: { paddingHorizontal: 14, paddingBottom: 10 },
    ribbon: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      ...shadow.card,
    },
    ribbonLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    ribbonImage: { width: 46, height: 46, borderRadius: 14 },
    ribbonFallback: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ribbonBody: { flexShrink: 1, gap: 2 },
    ribbonTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    registry: {
      fontSize: 9.5,
      fontFamily: typography.bold,
      color: colors.success,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    location: { fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
    ribbonPrice: { fontSize: 13.5, fontFamily: typography.extrabold, color: colors.onSurface },
    ribbonMeta: { fontFamily: typography.sans, color: colors.onSurfaceVariant },
    inspectBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.success,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    inspectText: { fontSize: 11.5, fontFamily: typography.bold, color: '#ffffff' },
    stream: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 130, gap: 12, flexGrow: 1 },
    protocol: {
      maxWidth: 448,
      width: '100%',
      alignSelf: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 18,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    protocolIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    protocolTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.success },
    protocolText: { fontSize: 11, color: colors.onSurfaceVariant, lineHeight: 15 },
    dateSep: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
    datePill: {
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 3,
    },
    dateText: { fontSize: 10, fontFamily: typography.semibold, color: colors.onSurfaceVariant },
    skeletonBlock: { height: 48, borderRadius: 16, backgroundColor: colors.surfaceContainerHigh },
    skeletonRow: { flexDirection: 'row' },
    empty: { paddingVertical: 48, paddingHorizontal: 16, alignItems: 'center', gap: 4 },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.primaryContainer + '33',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface, textAlign: 'center' },
    emptySub: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 320,
      marginTop: 4,
    },
    brokerCol: { maxWidth: '86%', alignSelf: 'flex-start', gap: 8 },
    brokerBubble: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      borderTopLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      gap: 4,
      ...shadow.card,
    },
    brokerSender: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    brokerSenderText: { fontSize: 10.5, fontFamily: typography.bold, color: colors.success },
    brokerText: { fontSize: 13.5, lineHeight: 20, color: colors.onSurface },
    brokerTime: { fontSize: 9.5, color: colors.outline, alignSelf: 'flex-end', marginTop: 2 },
    offerCard: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.primary + '33',
      overflow: 'hidden',
      gap: 12,
      marginVertical: 4,
      ...shadow.floating,
    },
    offerGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 6,
    },
    offerHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      paddingTop: 4,
    },
    offerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    offerIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    offerTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    offerKicker: { fontSize: 11, fontFamily: typography.bold, color: colors.secondary },
    offerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      flexShrink: 0,
    },
    offerPillDot: { width: 6, height: 6, borderRadius: 3 },
    offerPillText: { fontSize: 10, fontFamily: typography.bold },
    offerPriceBox: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 16,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    offerLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    offerLabel: { fontSize: 12, fontFamily: typography.medium, color: colors.onSurfaceVariant },
    offerValue: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    offerPriceLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '1A',
      gap: 8,
    },
    priceKicker: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.outline,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    offerPrice: { fontSize: 20, fontFamily: typography.extrabold, color: colors.primary },
    offerOldPrice: { fontSize: 12, color: colors.outline, textDecorationLine: 'line-through' },
    discountPill: {
      backgroundColor: colors.primaryFixed,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    discountText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimaryFixed },
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
    termsText: { fontSize: 11, lineHeight: 17, color: colors.onSurface, flexShrink: 1 },
    termsStrong: { fontFamily: typography.bold },
    validity: {
      backgroundColor: colors.surfaceContainer,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    validityLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    validityLabel: { fontSize: 12, color: colors.onSurfaceVariant },
    validityValue: { fontSize: 12, fontFamily: typography.bold, color: colors.secondary },
    offerActions: { gap: 8, paddingTop: 4 },
    acceptOfferBtn: {
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...shadow.card,
    },
    acceptOfferText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary, flexShrink: 1 },
    offerSecondaryRow: { flexDirection: 'row', gap: 8 },
    counterBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    counterText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    declineBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    declineText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurfaceVariant },
    userCol: { maxWidth: '86%', alignSelf: 'flex-end', alignItems: 'flex-end', gap: 6 },
    userBubble: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      borderTopRightRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...shadow.card,
    },
    userText: { fontSize: 13.5, lineHeight: 20, color: colors.onPrimary },
    userMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 4,
    },
    userTime: { fontSize: 9.5, color: colors.onPrimary, opacity: 0.72 },
    voiceBubble: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      borderTopRightRadius: 6,
      padding: 12,
      gap: 8,
      width: 288,
      ...shadow.floating,
    },
    voiceBubbleIncoming: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopRightRadius: 18,
      borderTopLeftRadius: 6,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waveRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 24, paddingHorizontal: 4 },
    waveBar: { width: 4, borderRadius: 2, backgroundColor: colors.onPrimary, opacity: 0.45 },
    waveBarActive: { backgroundColor: colors.secondaryContainer, opacity: 1 },
    waveMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    waveTime: { fontSize: 10, fontFamily: typography.semibold, color: colors.onPrimary, opacity: 0.8 },
    waveTimeIncoming: { color: colors.onSurfaceVariant },
    waveLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    voiceFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: colors.onPrimary + '33',
    },
    voiceFooterIncoming: { borderTopColor: colors.outlineVariant + '33' },
    voiceFooterText: { fontSize: 10, color: colors.onPrimary, opacity: 0.8 },
    voiceFooterTextIncoming: { color: colors.onSurfaceVariant },
    attachmentBubble: {
      width: 264,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      borderTopRightRadius: 6,
      padding: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      gap: 8,
      ...shadow.card,
    },
    attachmentBubbleIncoming: { borderTopRightRadius: 18, borderTopLeftRadius: 6 },
    attachmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    attachmentTile: {
      width: '47%',
      aspectRatio: 1,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceContainer,
    },
    attachmentTileSingle: { width: '100%', aspectRatio: 4 / 3 },
    attachmentTileImage: { width: '100%', height: '100%' },
    attachmentTileFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceContainerHigh,
      padding: 8,
      gap: 2,
    },
    attachmentTileLabel: { fontSize: 10, fontFamily: typography.bold, color: colors.onSurface },
    attachmentOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 6,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    attachmentOverlayText: { color: '#ffffff', fontSize: 10, fontFamily: typography.semibold, flexShrink: 1 },
    attachmentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    attachmentMetaText: { fontSize: 10, fontFamily: typography.medium, color: colors.onSurfaceVariant },
    attachmentMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    attachmentMetaStrong: { fontSize: 10, fontFamily: typography.bold, color: colors.primary },
    composerSection: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '26',
      paddingHorizontal: 12,
      paddingTop: 10,
      gap: 10,
    },
    drawer: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 18,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      flexDirection: 'row',
      gap: 8,
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
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    plusBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      flexShrink: 0,
      marginBottom: 1,
    },
    plusBtnOpen: {
      backgroundColor: colors.success,
      borderColor: colors.success,
      transform: [{ rotate: '45deg' }],
    },
    plusBtnClosed: {
      backgroundColor: colors.surfaceContainerLow,
      borderColor: colors.outlineVariant + '33',
    },
    inputBox: {
      flex: 1,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 22,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '40',
      ...shadow.card,
    },
    input: { flex: 1, fontSize: 13.5, color: colors.onSurface, paddingVertical: 9, maxHeight: 96 },
    micBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
      marginBottom: 5,
    },
    micIdle: { backgroundColor: colors.surfaceContainer },
    micActive: { backgroundColor: '#ef4444' },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...shadow.card,
    },
    sendActive: { backgroundColor: colors.success },
    sendIdle: { backgroundColor: colors.surfaceContainer, shadowOpacity: 0, elevation: 0 },
    noBroker: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      gap: 6,
    },
    noBrokerIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    noBrokerTitle: { fontSize: 16, fontFamily: typography.bold, color: colors.onSurface },
    noBrokerText: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 320,
      marginBottom: 16,
    },
    primaryCta: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    primaryCtaText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    counterModal: {
      width: '100%',
      maxWidth: 384,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
      ...shadow.floating,
    },
    counterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.outlineVariant + '33',
    },
    counterTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    closeCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterField: { gap: 4 },
    counterLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    counterInput: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '40',
      fontSize: 14,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    counterTextarea: { minHeight: 64, textAlignVertical: 'top', fontFamily: undefined },
    counterSubmit: {
      width: '100%',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      ...shadow.card,
    },
    counterSubmitOn: { backgroundColor: colors.primary },
    counterSubmitOff: { backgroundColor: colors.surfaceContainerHighest, shadowOpacity: 0, elevation: 0 },
    counterSubmitText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    counterSubmitTextOff: { color: colors.outline },
    previewBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    previewCard: {
      width: '100%',
      maxWidth: 448,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
      ...shadow.floating,
    },
    previewHeader: {
      backgroundColor: colors.primary,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    previewTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary, flexShrink: 1 },
    previewBody: {
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      minHeight: 220,
    },
    previewImage: { width: '100%', height: 320, borderRadius: 12 },
    previewDoc: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    previewDocLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    previewFooter: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '26',
      gap: 8,
    },
    previewFooterText: { fontSize: 11, fontFamily: typography.medium, color: colors.outline },
    previewCloseBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    previewCloseText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
  });

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

  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const broker = brokers.find((b) => b.id === selectedBrokerId);
  const relatedListing = listings.find((l) => l.id === selectedListingId);

  const [inputText, setInputText] = useState('');
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackSecs, setPlaybackSecs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isAttachmentDrawerOpen, setIsAttachmentDrawerOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<{ title: string; image: string } | null>(
    null
  );
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState(
    relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
  );
  const [counterNote, setCounterNote] = useState('');

  const scrollRef = useRef<ScrollView | null>(null);

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

  const counterValue = Number(counterPrice);
  const isCounterValid = Number.isFinite(counterValue) && counterValue > 0;

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [chatMessages, isRecording]);

  // Opening a conversation clears its unread badge and records a read receipt.
  useEffect(() => {
    if (activeConversationId) markConversationAsRead(activeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, chatMessages.length]);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSecs((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  };

  const handleStartRecording = async () => {
    if (Platform.OS === 'web') {
      setAttachmentError(t('voiceWebOnly', 'Voice recording is available in the installed app.'));
      return;
    }
    if (!activeConversationId) {
      setAttachmentError(t('voiceNeedsChat', 'Open a conversation before recording.'));
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('micPermission', 'Microphone needed'),
          t('micPermissionBody', 'Allow microphone access to record a voice note.')
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
      setAttachmentError(null);
      setRecordSecs(0);
      setIsRecording(true);
    } catch (err) {
      console.warn('[DILAAL] recording start failed:', err);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      setAttachmentError(t('voiceRecordFailed', 'Could not start recording.'));
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
    if (!uri || secs < 1) return;
    if (!activeConversationId) {
      setAttachmentError(t('voiceNeedsChat', 'Open a conversation before recording.'));
      return;
    }

    setUploadingAttachment(true);
    setAttachmentError(null);
    const uploaded = await uploadChatAttachment(uri, activeConversationId, 'audio/m4a');
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || t('voiceUploadFailed', 'Voice note upload failed.'));
      return;
    }
    sendVoiceNote(formatDuration(secs), {
      storagePath: uploaded.path,
      url: uri,
      mimeType: 'audio/m4a',
    });
  };

  const toggleVoicePlayback = async (msg: ChatMessage) => {
    const audioAttachment = msg.attachments?.find((att) => att.type === 'audio');
    const uri = audioAttachment?.url;

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
      setAttachmentError(
        t('voiceMissing', 'Original voice audio is not available for this message.')
      );
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (typeof status.positionMillis === 'number') {
            setPlaybackSecs(Math.floor(status.positionMillis / 1000));
          }
          if (status.didJustFinish) {
            if (soundRef.current) {
              void soundRef.current.unloadAsync().catch(() => {});
              soundRef.current = null;
            }
            setPlayingMessageId(null);
            setPlaybackSecs(0);
          }
        }
      );
      soundRef.current = sound;
      setPlayingMessageId(msg.id);
    } catch (err) {
      console.warn('[DILAAL] voice playback failed:', err);
      setAttachmentError(t('voicePlayFailed', 'Could not play this voice note.'));
    }
  };

  const handleSendCounter = () => {
    if (!isCounterValid) return;
    counterOffer(counterValue, counterNote.trim());
    setIsCounterModalOpen(false);
  };

  const handleBackToChats = () => {
    setSelectedBrokerId('');
    setSelectedListingId('');
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await sendPickedFile(
      asset.uri,
      asset.fileName || 'Photo.jpg',
      'image',
      asset.mimeType || 'image/jpeg'
    );
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await sendPickedFile(asset.uri, asset.name || 'Document.pdf', 'pdf', 'application/pdf');
  };

  const sendPickedFile = async (
    uri: string,
    name: string,
    kind: 'image' | 'pdf',
    mimeType: string
  ) => {
    if (!activeConversationId) {
      setAttachmentError(t('attachmentNeedsConversation', 'Start the conversation before attaching a file.'));
      return;
    }
    setAttachmentError(null);
    setUploadingAttachment(true);
    const uploaded = await uploadChatAttachment(uri, activeConversationId, mimeType);
    setUploadingAttachment(false);
    if (uploaded.error || !uploaded.path) {
      setAttachmentError(uploaded.error || t('attachmentUploadFailed', 'Upload failed. Please try again.'));
      return;
    }
    sendAttachment(name, kind, '', {
      storagePath: uploaded.path,
      mimeType,
      size: kind === 'image' ? 'Photo' : 'PDF',
    });
    setIsAttachmentDrawerOpen(false);
  };

  if (!broker) {
    if (myBrokerId) {
      return <BrokerInbox />;
    }
    if (authUserId) {
      return <BuyerInbox />;
    }
    return (
      <View style={styles.noBroker}>
        <View style={styles.noBrokerIcon}>
          <Icon name="forum" size={30} color={colors.outline} />
        </View>
        <Text style={styles.noBrokerTitle}>No Active Conversations</Text>
        <Text style={styles.noBrokerText}>
          Open a listing and contact its broker to negotiate terms, schedule inspections, and track
          your deal.
        </Text>
        <Pressable onPress={() => setCurrentScreen('home')} style={styles.primaryCta}>
          <Text style={styles.primaryCtaText}>Browse Listings</Text>
        </Pressable>
      </View>
    );
  }

  const renderOfferCard = (msg: ChatMessage) => {
    const offer = msg.offer;
    if (!offer) return null;
    const accepted = offer.status === 'accepted';
    const declined = offer.status === 'declined';
    const pillBg = accepted
      ? colors.primaryFixed
      : declined
      ? colors.errorContainer
      : colors.secondaryFixed;
    const pillFg = accepted
      ? colors.onPrimaryFixed
      : declined
      ? colors.error
      : colors.onSecondaryFixed;
    const dotColor = accepted ? colors.success : declined ? colors.error : colors.secondaryContainer;

    return (
      <View style={styles.offerCard}>
        <LinearGradient
          colors={['#047857', '#f59e0b', '#047857']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.offerGradient}
        />

        <View style={styles.offerHeader}>
          <View style={styles.offerHeaderLeft}>
            <View style={styles.offerIcon}>
              <Icon name="verified_user" size={20} color={colors.onPrimaryContainer} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.offerTitle}>Purchase Offer</Text>
              <Text style={styles.offerKicker}>Escrow Offer</Text>
            </View>
          </View>

          <View style={[styles.offerPill, { backgroundColor: pillBg }]}>
            <View style={[styles.offerPillDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.offerPillText, { color: pillFg }]} numberOfLines={1}>
              {accepted ? 'Aqbalay • Accepted' : declined ? 'Declined' : 'Active • Dalab Furan'}
            </Text>
          </View>
        </View>

        <View style={styles.offerPriceBox}>
          <View style={styles.offerLine}>
            <Text style={styles.offerLabel}>Asset Subject:</Text>
            <Text style={styles.offerValue} numberOfLines={1}>
              {offer.assetSubject}
            </Text>
          </View>

          <View style={styles.offerPriceLine}>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.priceKicker}>Proposed Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.offerPrice}>
                  ${offer.proposedPrice.toLocaleString()} USD
                </Text>
                <Text style={styles.offerOldPrice}>
                  ${offer.originalPrice.toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.discountPill}>
              <Text style={styles.discountText}>-{offer.discountPercent}% Discount</Text>
            </View>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={styles.termsRow}>
            <Icon name="account_balance_wallet" size={17} color={colors.primary} />
            <Text style={styles.termsText}>
              <Text style={styles.termsStrong}>Escrow Terms: </Text>
              {offer.escrowTerms}
            </Text>
          </View>
          <View style={styles.termsRow}>
            <Icon name="verified" size={17} color={colors.secondary} />
            <Text style={styles.termsText}>
              <Text style={styles.termsStrong}>Title Reference: </Text>
              {offer.titleGuarantee}
            </Text>
          </View>
        </View>

        <View style={styles.validity}>
          <View style={styles.validityLeft}>
            <Icon name="hourglass_top" size={15} color={colors.secondary} />
            <Text style={styles.validityLabel}>Validity Period:</Text>
          </View>
          <Text style={styles.validityValue}>{offer.expiryTime}</Text>
        </View>

        <View style={styles.offerActions}>
          <Pressable
            onPress={() => {
              if (offer.status === 'accepted') {
                setCurrentScreen('deal');
              } else {
                acceptOffer();
                setTimeout(() => setCurrentScreen('deal'), 350);
              }
            }}
            style={styles.acceptOfferBtn}
          >
            <Icon
              name={accepted ? 'task_alt' : 'check_circle'}
              size={18}
              color={colors.onPrimary}
            />
            <Text style={styles.acceptOfferText}>
              {accepted
                ? 'Offer Accepted • Open Escrow Tracker →'
                : 'Accept Offer & Lock Escrow (Aqbal Dalabka)'}
            </Text>
          </Pressable>

          {offer.status === 'active' ? (
            <View style={styles.offerSecondaryRow}>
              <Pressable
                onPress={() => {
                  setCounterPrice(
                    relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
                  );
                  setCounterNote('');
                  setIsCounterModalOpen(true);
                }}
                style={styles.counterBtn}
              >
                <Icon name="edit_note" size={16} color={colors.onSurface} />
                <Text style={styles.counterText}>Counter Offer</Text>
              </Pressable>
              <Pressable onPress={declineOffer} style={styles.declineBtn}>
                <Icon name="close" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.declineText}>Decline</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderVoiceNote = (msg: ChatMessage, incoming = false) => {
    if (!msg.isAudio) return null;
    const isPlaying = playingMessageId === msg.id;
    const hasAudio = Boolean(msg.attachments?.some((att) => att.type === 'audio' && att.url));
    return (
      <View style={[styles.voiceBubble, incoming && styles.voiceBubbleIncoming]}>
        <View style={styles.voiceRow}>
          <Pressable
            onPress={() => void toggleVoicePlayback(msg)}
            style={[styles.playBtn, !hasAudio && { opacity: 0.55 }]}
          >
            <Icon
              name={isPlaying ? 'pause' : 'play_arrow'}
              size={24}
              color={colors.primary}
            />
          </Pressable>

          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.waveRow}>
              {WAVE_HEIGHTS.map((height, i) => (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    isPlaying && styles.waveBarActive,
                    {
                      height: height * 2.8,
                      backgroundColor: isPlaying
                        ? colors.secondaryContainer
                        : incoming
                        ? colors.primary
                        : colors.onPrimary,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.waveMeta}>
              <Text style={[styles.waveTime, incoming && styles.waveTimeIncoming]}>
                {isPlaying ? formatDuration(playbackSecs) : msg.audioDuration || '—'}
              </Text>
              <View style={styles.waveLabel}>
                <Icon name="mic" size={13} color={incoming ? colors.primary : colors.onPrimary} />
                <Text style={[styles.waveTime, incoming && styles.waveTimeIncoming]}>
                  Voice Memo
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.voiceFooter, incoming && styles.voiceFooterIncoming]}>
          <Text style={[styles.voiceFooterText, incoming && styles.voiceFooterTextIncoming]}>
            {msg.audioOrigin || t('voiceNote', 'Voice Note')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.voiceFooterText, incoming && styles.voiceFooterTextIncoming]}>
              {msg.timestamp}
            </Text>
            <Icon name="done_all" size={14} color={incoming ? colors.primary : colors.onPrimary} />
          </View>
        </View>
      </View>
    );
  };

  const renderAttachments = (msg: ChatMessage, incoming = false) => {
    const visualAttachments = msg.attachments?.filter((att) => att.type !== 'audio');
    if (!visualAttachments || visualAttachments.length === 0) return null;
    const count = visualAttachments.length;
    return (
      <View style={[styles.attachmentBubble, incoming && styles.attachmentBubbleIncoming]}>
        <View style={styles.attachmentGrid}>
          {visualAttachments.map((att) => (
            <Pressable
              key={att.id}
              onPress={() => setPreviewAttachment({ title: att.title, image: att.image || '' })}
              style={[styles.attachmentTile, count === 1 && styles.attachmentTileSingle]}
            >
              {att.image ? (
                <Image source={{ uri: att.image }} style={styles.attachmentTileImage} />
              ) : (
                <View style={styles.attachmentTileFallback}>
                  <Icon name="description" size={24} color={colors.primary} />
                  <Text style={styles.attachmentTileLabel} numberOfLines={1}>
                    {att.title}
                  </Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.attachmentOverlay}
              >
                <Icon name={att.type === 'pdf' ? 'description' : 'image'} size={12} color="#ffffff" />
                <Text style={styles.attachmentOverlayText} numberOfLines={1}>
                  {att.title}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
        <View style={styles.attachmentMeta}>
          <Text style={styles.attachmentMetaText}>
            {count} {count === 1 ? 'attachment' : 'attachments'}
          </Text>
          <View style={styles.attachmentMetaRight}>
            <Text style={styles.attachmentMetaStrong}>{msg.timestamp}</Text>
            <Icon name="done_all" size={14} color={colors.primary} />
          </View>
        </View>
      </View>
    );
  };

  const canSend = Boolean(inputText.trim());

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.identity}>
              <Pressable
                onPress={handleBackToChats}
                style={styles.backBtn}
                accessibilityLabel="Back to chats"
              >
                <Icon name="arrow_back" size={20} color={colors.success} />
              </Pressable>
              <View style={styles.avatarWrap}>
                {broker.avatar ? (
                  <Image source={{ uri: broker.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Icon name="person" size={22} color={colors.outline} />
                  </View>
                )}
                {broker.isOnline ? <View style={styles.onlineDot} /> : null}
              </View>
              <View style={styles.nameBlock}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {broker.name}
                  </Text>
                  {broker.verificationStatus === 'approved' ? (
                    <Icon name="verified" size={16} color={colors.primary} />
                  ) : null}
                </View>
                <View style={styles.statusRow}>
                  <Text
                    style={[
                      styles.status,
                      peerTyping || broker.isOnline ? styles.statusOnline : styles.statusOffline,
                    ]}
                  >
                    {peerTyping
                      ? t('typing', 'Typing...')
                      : broker.isOnline
                        ? t('online', 'Online')
                        : t('offline', 'Offline')}
                  </Text>
                  {broker.title ? (
                    <>
                      <Text style={styles.title}>•</Text>
                      <Text style={styles.title} numberOfLines={1}>
                        {broker.title}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={styles.callRow}>
              <Pressable
                onPress={() => {
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
                style={[styles.callBtn, Boolean(callSession) && { opacity: 0.4 }]}
                accessibilityLabel={t('callBroker', 'Voice Call')}
              >
                <Icon name="call" size={18} color={colors.success} />
              </Pressable>
              <Pressable
                onPress={() => {
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
                style={[styles.callBtn, Boolean(callSession) && { opacity: 0.4 }]}
                accessibilityLabel={t('inspect', 'Live Video Inspection')}
              >
                <Icon name="videocam" size={18} color={colors.success} />
              </Pressable>
            </View>
          </View>

          {relatedListing ? (
            <View style={styles.ribbonWrap}>
              <View style={styles.ribbon}>
                <View style={styles.ribbonLeft}>
                  {relatedListing.image ? (
                    <Image source={{ uri: relatedListing.image }} style={styles.ribbonImage} />
                  ) : (
                    <View style={styles.ribbonFallback}>
                      <Icon name="home_work" size={20} color={colors.outline} />
                    </View>
                  )}
                  <View style={styles.ribbonBody}>
                    <View style={styles.ribbonTop}>
                      {relatedListing.registryNumber ? (
                        <Text style={styles.registry}>{relatedListing.registryNumber}</Text>
                      ) : null}
                      <Text style={styles.location} numberOfLines={1}>
                        {relatedListing.location}
                      </Text>
                    </View>
                    <Text style={styles.ribbonPrice} numberOfLines={1}>
                      {formatPrice(relatedListing.price)}{' '}
                      <Text style={styles.ribbonMeta}>
                        • {relatedListing.beds ? `${relatedListing.beds}-Bed ` : ''}
                        {relatedListing.category}
                      </Text>
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => openListingDetails(relatedListing.id)}
                  style={styles.inspectBtn}
                >
                  <Text style={styles.inspectText}>{t('inspect', 'Listing')}</Text>
                  <Icon name="open_in_new" size={14} color="#ffffff" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.stream}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.protocol}>
            <View style={styles.protocolIcon}>
              <Icon name="gavel" size={17} color={colors.onPrimaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.protocolTitle}>
                {t('dealTrackerTitle', 'Transaction Escrow Protocol')}
              </Text>
              <Text style={styles.protocolText}>
                {t(
                  'dealNoticeSandbox',
                  'Milestone-tracked offer negotiations with notary verification oversight.'
                )}
              </Text>
            </View>
          </View>

          <View style={styles.dateSep}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>
                Today,{' '}
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {hasMoreMessages && chatMessages.length > 0 && (
            <Pressable
              onPress={() => void loadOlderMessages()}
              disabled={loadingOlderMessages}
              style={{
                alignSelf: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: colors.surfaceContainer,
                opacity: loadingOlderMessages ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: typography.bold, color: colors.onSurfaceVariant }}>
                {loadingOlderMessages
                  ? t('loadingOlderMessages', 'Loading earlier messages...')
                  : t('loadOlderMessages', 'Load earlier messages')}
              </Text>
            </Pressable>
          )}

          {chatMessages.length === 0 && chatLoading ? (
            <View style={{ gap: 12, paddingVertical: 8 }}>
              <View style={styles.skeletonRow}>
                <Skeleton style={[styles.skeletonBlock, { width: 176 }]} />
              </View>
              <View style={[styles.skeletonRow, { justifyContent: 'flex-end' }]}>
                <Skeleton style={[styles.skeletonBlock, { width: 208 }]} />
              </View>
              <View style={styles.skeletonRow}>
                <Skeleton style={[styles.skeletonBlock, { width: 144 }]} />
              </View>
            </View>
          ) : chatMessages.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="chat" size={30} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Direct Inquiry with {broker.name}</Text>
              <Text style={styles.emptySub}>
                Send a message to schedule an inspection, ask for registry documents, or propose
                purchase terms.
              </Text>
            </View>
          ) : (
            chatMessages.map((msg) => {
              if (msg.sender === 'broker') {
                const placeholder = /^(Attached Document:|Voice Memo \(Audio Transmission\))/.test(
                  msg.text || ''
                );
                const showText =
                  Boolean(msg.text) &&
                  !((msg.isAudio || Boolean(msg.attachments?.length)) && placeholder);
                return (
                  <View key={msg.id} style={styles.brokerCol}>
                    {showText ? (
                      <View style={styles.brokerBubble}>
                        <View style={styles.brokerSender}>
                          <Text style={styles.brokerSenderText}>
                            {msg.senderName || broker.name}
                          </Text>
                          <Icon name="verified" size={13} color={colors.primary} />
                        </View>
                        <Text style={styles.brokerText}>{msg.text}</Text>
                        <Text style={styles.brokerTime}>{msg.timestamp}</Text>
                      </View>
                    ) : null}

                    {renderVoiceNote(msg, true)}
                    {renderAttachments(msg, true)}
                    {renderOfferCard(msg)}
                  </View>
                );
              }

              const placeholder = /^(Attached Document:|Voice Memo \(Audio Transmission\))/.test(
                msg.text || ''
              );
              const showText =
                Boolean(msg.text) &&
                !((msg.isAudio || Boolean(msg.attachments?.length)) && placeholder);

              return (
                <View key={msg.id} style={styles.userCol}>
                  {showText ? (
                    <View style={styles.userBubble}>
                      <Text style={styles.userText}>{msg.text}</Text>
                      <View style={styles.userMeta}>
                        <Text style={styles.userTime}>{msg.timestamp}</Text>
                        <Icon name="done_all" size={14} color={colors.onPrimary} />
                      </View>
                    </View>
                  ) : null}

                  {renderVoiceNote(msg)}
                  {renderAttachments(msg)}
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.composerSection, { paddingBottom: 100 }]}>
          {isAttachmentDrawerOpen ? (
            <View style={styles.drawer}>
              <Pressable onPress={() => void pickImage()} style={styles.drawerItem}>
                <View style={[styles.drawerIcon, { backgroundColor: colors.primaryContainer }]}>
                  <Icon name="photo_camera" size={20} color={colors.onPrimary} />
                </View>
                <Text style={styles.drawerLabel}>{t('uploadPhoto', 'Photo')}</Text>
              </Pressable>

              <Pressable onPress={() => void pickDocument()} style={styles.drawerItem}>
                <View style={[styles.drawerIcon, { backgroundColor: colors.secondary }]}>
                  <Icon name="description" size={20} color={colors.onSecondary} />
                </View>
                <Text style={styles.drawerLabel}>{t('uploadDocument', 'Document')}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  acceptOffer();
                  setIsAttachmentDrawerOpen(false);
                }}
                style={styles.drawerItem}
              >
                <View style={[styles.drawerIcon, { backgroundColor: colors.success }]}>
                  <Icon name="payments" size={20} color="#ffffff" />
                </View>
                <Text style={styles.drawerLabel}>
                  {t('payEscrowDeposit', 'Escrow Pay')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setCounterPrice(
                    relatedListing && relatedListing.price > 0 ? String(relatedListing.price) : ''
                  );
                  setCounterNote('');
                  setIsCounterModalOpen(true);
                  setIsAttachmentDrawerOpen(false);
                }}
                style={styles.drawerItem}
              >
                <View style={[styles.drawerIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
                  <Icon name="real_estate_agent" size={20} color={colors.primary} />
                </View>
                <Text style={styles.drawerLabel}>{t('counterOffer', 'Counter')}</Text>
              </Pressable>
            </View>
          ) : null}

          {(uploadingAttachment || attachmentError) && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.errorContainer,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginBottom: 8,
              }}
            >
              <Icon
                name={uploadingAttachment ? 'progress_activity' : 'error'}
                size={14}
                color={colors.onErrorContainer}
              />
              <Text
                style={{
                  flexShrink: 1,
                  fontSize: 11,
                  fontFamily: typography.semibold,
                  color: colors.onErrorContainer,
                }}
              >
                {uploadingAttachment
                  ? t('uploadingAttachment', 'Uploading attachment…')
                  : attachmentError}
              </Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setIsAttachmentDrawerOpen((open) => !open)}
              style={[styles.plusBtn, isAttachmentDrawerOpen ? styles.plusBtnOpen : styles.plusBtnClosed]}
              accessibilityLabel={t('attachFiles', 'Attach files')}
            >
              <Icon
                name="add"
                size={22}
                color={isAttachmentDrawerOpen ? colors.onPrimary : colors.onSurface}
              />
            </Pressable>

            <View style={styles.inputBox}>
              <TextInput
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (text.trim()) typingChannelRef.current?.notifyTyping();
                }}
                placeholder={
                  isRecording
                    ? `${t('voiceNote', 'Recording')} (${recordSecs}s)`
                    : t('sendMsgPlaceholder', 'Discuss title deed, offer, or inspection...')
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
                style={[styles.micBtn, isRecording ? styles.micActive : styles.micIdle]}
                accessibilityLabel={
                  isRecording ? t('voiceNote', 'Stop Recording') : t('voiceNote', 'Record Voice Memo')
                }
              >
                <Icon name={isRecording ? 'stop' : 'mic'} size={18} color={isRecording ? '#ffffff' : colors.primary} />
              </Pressable>
            </View>

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={[styles.sendBtn, canSend ? styles.sendActive : styles.sendIdle]}
              accessibilityLabel={t('sendBtn', 'Send message')}
            >
              <Icon
                name="send"
                size={20}
                color={canSend ? colors.onPrimary : colors.outline}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal
        visible={isCounterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCounterModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.counterModal}>
            <View style={styles.counterHeader}>
              <Text style={styles.counterTitle}>Propose Counter Offer</Text>
              <Pressable
                onPress={() => setIsCounterModalOpen(false)}
                style={styles.closeCircle}
                accessibilityLabel="Close"
              >
                <Icon name="close" size={16} color={colors.outline} />
              </Pressable>
            </View>

            <View style={styles.counterField}>
              <Text style={styles.counterLabel}>Counter Price (USD)</Text>
              <TextInput
                value={counterPrice}
                onChangeText={setCounterPrice}
                keyboardType="numeric"
                style={styles.counterInput}
                placeholderTextColor={colors.outline}
              />
            </View>

            <View style={styles.counterField}>
              <Text style={styles.counterLabel}>Amended Closing Terms</Text>
              <TextInput
                value={counterNote}
                onChangeText={setCounterNote}
                multiline
                style={[styles.counterInput, styles.counterTextarea]}
                placeholderTextColor={colors.outline}
              />
            </View>

            <Pressable
              onPress={handleSendCounter}
              disabled={!isCounterValid}
              style={[
                styles.counterSubmit,
                isCounterValid ? styles.counterSubmitOn : styles.counterSubmitOff,
              ]}
            >
              <Text
                style={[
                  styles.counterSubmitText,
                  !isCounterValid && styles.counterSubmitTextOff,
                ]}
              >
                Submit Counter Offer to Broker
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(previewAttachment)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewAttachment(null)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewAttachment?.title}
              </Text>
              <Pressable
                onPress={() => setPreviewAttachment(null)}
                style={[
                  styles.closeCircle,
                  { backgroundColor: colors.primaryContainer },
                ]}
                accessibilityLabel="Close preview"
              >
                <Icon name="close" size={16} color={colors.onPrimary} />
              </Pressable>
            </View>

            <View style={styles.previewBody}>
              {previewAttachment?.image ? (
                <Image
                  source={{ uri: previewAttachment.image }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewDoc}>
                  <Icon name="description" size={48} color={colors.primary} />
                  <Text style={styles.previewDocLabel}>{previewAttachment?.title}</Text>
                </View>
              )}
            </View>

            <View style={styles.previewFooter}>
              <Text style={styles.previewFooterText}>
                {t('attachmentPreview', 'Attachment preview')}
              </Text>
              <Pressable
                onPress={() => setPreviewAttachment(null)}
                style={styles.previewCloseBtn}
              >
                <Text style={styles.previewCloseText}>{t('close', 'Close')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
