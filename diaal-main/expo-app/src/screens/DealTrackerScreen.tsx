import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  Share,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

const deriveAuditReference = (
  dealNumber: string,
  assetId: string,
  agreedPrice: number,
  depositAmount: number
): string => {
  const input = `${dealNumber}|${assetId}|${agreedPrice}|${depositAmount}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `AUD-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: { width: '100%', maxWidth: 672, alignSelf: 'center', paddingBottom: 64 },
    pagePad: { paddingHorizontal: 14 },
    noDeal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
    noDealIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    noDealTitle: { fontSize: 16, fontFamily: typography.bold, color: colors.onSurface },
    noDealText: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 320,
      marginBottom: 16,
    },
    cta: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, backgroundColor: colors.primary },
    ctaText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    headerBanner: {
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: colors.surfaceContainerHigh,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      ...shadow.card,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondaryContainer },
    liveKicker: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    headerTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    dealPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      flexShrink: 0,
    },
    dealNumber: { fontSize: 12, fontFamily: typography.bold, color: colors.primary },
    overviewCard: {
      marginVertical: 10,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      gap: 12,
      ...shadow.card,
    },
    overviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    assetImageWrap: {
      width: 88,
      height: 88,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assetImage: { width: '100%', height: '100%' },
    assetLocation: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      backgroundColor: colors.primary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    assetLocationText: { fontSize: 9, fontFamily: typography.bold, color: colors.onPrimary },
    overviewBody: { flex: 1, minWidth: 0, gap: 4 },
    chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    categoryPill: {
      backgroundColor: colors.primaryFixed,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    categoryText: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.onPrimaryFixed,
      textTransform: 'uppercase',
    },
    escrowPill: {
      backgroundColor: colors.secondaryFixed,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    escrowPillText: { fontSize: 10, fontFamily: typography.bold, color: colors.onSecondaryFixed },
    assetTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    priceText: { fontSize: 20, fontFamily: typography.bold, color: colors.primary },
    priceMeta: { fontSize: 11, fontFamily: typography.medium, color: colors.onSurfaceVariant },
    peopleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    person: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 130 },
    personIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personIconAlt: { backgroundColor: colors.surfaceContainerHighest },
    personLabel: { fontSize: 10, color: colors.onSurfaceVariant },
    personValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    personValue: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    sandbox: {
      marginVertical: 8,
      backgroundColor: '#fffbeb',
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: '#fde68a',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    sandboxIcon: { marginTop: 1 },
    sandboxTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    sandboxTitle: { fontSize: 13, fontFamily: typography.bold, color: '#451a03' },
    sandboxTag: {
      backgroundColor: '#fde68a',
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    sandboxTagText: { fontSize: 10, fontFamily: typography.bold, color: '#78350f' },
    sandboxText: { fontSize: 11, lineHeight: 16, color: '#92400e', marginTop: 2 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
      marginBottom: 16,
      gap: 8,
    },
    sectionTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    progressPill: {
      backgroundColor: colors.primaryFixed,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    progressText: { fontSize: 11, fontFamily: typography.bold, color: colors.primary },
    timeline: { position: 'relative', gap: 16 },
    timelineLine: {
      position: 'absolute',
      left: 19,
      top: 16,
      bottom: 32,
      width: 2,
      backgroundColor: colors.primaryFixed,
    },
    milestoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    milestoneRowMuted: { opacity: 0.6 },
    node: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      ...shadow.card,
    },
    nodeDone: { backgroundColor: colors.primaryContainer },
    nodeActive: { backgroundColor: colors.secondaryContainer },
    nodePending: { backgroundColor: colors.surfaceContainerHigh },
    card: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '40',
      padding: 14,
      ...shadow.card,
    },
    cardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginBottom: 4,
    },
    cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondaryContainer },
    milestoneKicker: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.secondary,
      textTransform: 'uppercase',
    },
    statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    statusPillDone: { backgroundColor: colors.primaryFixed },
    statusPillActive: { backgroundColor: colors.secondaryFixed },
    statusPillText: { fontSize: 10, fontFamily: typography.bold },
    milestoneTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    milestoneText: { fontSize: 12, lineHeight: 18, color: colors.onSurfaceVariant, marginTop: 4 },
    methodList: { gap: 8, marginTop: 12 },
    methodLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.onSurface,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    method: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 12,
      backgroundColor: colors.surfaceContainerLowest,
      borderColor: colors.outlineVariant + '33',
    },
    methodSelected: { backgroundColor: colors.primary + '0D', borderColor: colors.primary },
    methodTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    methodLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    methodIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodIconPrimary: { backgroundColor: colors.primaryContainer },
    methodIconNeutral: { backgroundColor: colors.surfaceContainerHigh },
    methodTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    methodSub: { fontSize: 10, color: colors.onSurfaceVariant, marginTop: 1 },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { backgroundColor: colors.primary },
    radioOff: { backgroundColor: colors.surfaceContainerHighest },
    methodInputRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.primary + '33',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    methodInputLabel: { fontSize: 10, color: colors.outline },
    methodInput: {
      flex: 1,
      backgroundColor: colors.surfaceContainer,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    payBlock: { marginTop: 16 },
    errorBox: {
      marginBottom: 8,
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.errorContainer,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    errorText: { flex: 1, fontSize: 11, fontFamily: typography.semibold, color: colors.onErrorContainer },
    payBtn: {
      width: '100%',
      backgroundColor: colors.primaryContainer,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...shadow.card,
    },
    payBtnText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary, flexShrink: 1 },
    secureNote: {
      fontSize: 11,
      fontFamily: typography.medium,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 8,
    },
    paidBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.primaryFixed + '4D',
      borderWidth: 1,
      borderColor: colors.primaryFixed,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    paidLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    paidText: { fontSize: 12, fontFamily: typography.bold, color: colors.primary, flexShrink: 1 },
    receiptBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    receiptBtnText: { fontSize: 11, fontFamily: typography.bold, color: colors.onPrimary },
    standardCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    standardBody: { flex: 1, minWidth: 0 },
    standardTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    standardSub: { fontSize: 11, color: colors.onSurfaceVariant },
    advanceBtn: {
      marginTop: 8,
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceContainer,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    advanceText: { fontSize: 10, fontFamily: typography.bold, color: colors.primary },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
    badgeNeutral: { backgroundColor: colors.surfaceContainer },
    badgePrimary: { backgroundColor: colors.primaryFixed },
    badgeMuted: { backgroundColor: colors.surfaceContainerHighest },
    badgeText: { fontSize: 10, fontFamily: typography.semibold, color: colors.onSurfaceVariant },
    badgeTextPrimary: { color: colors.primary, fontFamily: typography.bold },
    support: {
      marginTop: 24,
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    supportLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    supportIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceContainerLowest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    supportTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    supportText: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 1 },
    supportBtn: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexShrink: 0,
    },
    supportBtnText: { fontSize: 12, fontFamily: typography.bold, color: colors.primary },
    toast: {
      position: 'absolute',
      bottom: 24,
      alignSelf: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      ...shadow.floating,
    },
    toastText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    successCard: {
      width: '100%',
      maxWidth: 384,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      ...shadow.floating,
    },
    successIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primaryFixed,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    successTitle: { fontSize: 16, fontFamily: typography.bold, color: colors.onSurface },
    successText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 8,
    },
    refBox: {
      width: '100%',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 12,
      marginVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    refLabel: { fontSize: 11, fontFamily: typography.medium, color: colors.onSurfaceVariant },
    refValue: { fontSize: 12, fontFamily: typography.bold, color: colors.primary },
    successActions: { width: '100%', flexDirection: 'row', gap: 8 },
    successAction: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    successActionGhost: { backgroundColor: colors.surfaceContainer },
    successActionPrimary: { backgroundColor: colors.primaryContainer },
    successActionText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    successActionPrimaryText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    receiptCard: {
      width: '100%',
      maxWidth: 448,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '4D',
      gap: 16,
      ...shadow.floating,
    },
    receiptHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceContainer,
    },
    receiptTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    receiptNumber: { fontSize: 10, color: colors.outline },
    receiptBody: {
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary + '33',
      padding: 16,
      gap: 8,
    },
    receiptLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    receiptLabel: { fontSize: 12, color: colors.outline },
    receiptValue: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1, textAlign: 'right' },
    receiptValueLarge: { fontSize: 14, fontFamily: typography.bold, color: colors.primary },
    receiptValueSecondary: { color: colors.secondary },
    receiptNotice: {
      backgroundColor: '#fffbeb',
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    receiptNoticeText: { fontSize: 11, lineHeight: 16, color: '#92400e' },
    downloadBtn: {
      width: '100%',
      backgroundColor: colors.primaryContainer,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    downloadText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
  });

export const DealTrackerScreen: React.FC = () => {
  const { escrowDeal, payEscrowDeposit, advanceDealMilestone, setCurrentScreen, formatPrice, t } =
    useApp();
  const colors = useColors();
  const styles = makeStyles(colors);

  const [selectedChannel, setSelectedChannel] = useState<'mobile_money' | 'card' | 'bank_wire'>(
    'mobile_money'
  );
  const [mobilePhone, setMobilePhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSelectChannel = (channel: 'mobile_money' | 'card' | 'bank_wire') => {
    setSelectedChannel(channel);
    setPaymentError(null);
  };

  const handlePay = () => {
    setPaymentError(null);

    if (selectedChannel === 'mobile_money' && mobilePhone.replace(/\D/g, '').length < 7) {
      setPaymentError(
        t('enterMobileNumber', 'Enter the mobile money number that will receive the payment request.')
      );
      return;
    }
    if (selectedChannel === 'card' && cardNumber.replace(/\D/g, '').length < 12) {
      setPaymentError(t('enterCardNumber', 'Enter a valid card number.'));
      return;
    }

    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      payEscrowDeposit(selectedChannel);
      setIsSuccessModalOpen(true);
    }, 1000);
  };

  const hasActiveDeal = Boolean(
    escrowDeal && escrowDeal.dealNumber && escrowDeal.dealNumber.trim() !== ''
  );
  const completedMilestones = escrowDeal.milestones.filter((m) => m.status === 'completed').length;
  const totalMilestones = escrowDeal.milestones.length;
  const depositPercent =
    escrowDeal.agreedPrice > 0
      ? Math.round((escrowDeal.depositAmount / escrowDeal.agreedPrice) * 100)
      : null;
  const auditReference = deriveAuditReference(
    escrowDeal.dealNumber,
    escrowDeal.assetId,
    escrowDeal.agreedPrice,
    escrowDeal.depositAmount
  );

  if (!hasActiveDeal) {
    return (
      <View style={styles.noDeal}>
        <View style={styles.noDealIcon}>
          <Icon name="gavel" size={30} color={colors.outline} />
        </View>
        <Text style={styles.noDealTitle}>
          {t('noActiveEscrowTitle', 'No Active Escrow Transactions')}
        </Text>
        <Text style={styles.noDealText}>
          {t(
            'noActiveEscrowDesc',
            'When a seller accepts your offer, deal milestones and payment status will appear here.'
          )}
        </Text>
        <Pressable onPress={() => setCurrentScreen('home')} style={styles.cta}>
          <Text style={styles.ctaText}>{t('exploreVerifiedListings', 'Explore Listings')}</Text>
        </Pressable>
      </View>
    );
  }

  const handleDownloadReceipt = async () => {
    const receiptData = {
      title: 'DILAAL Escrow Transaction Summary',
      reference: escrowDeal.dealNumber,
      dealNumber: escrowDeal.dealNumber,
      assetTitle: escrowDeal.assetTitle,
      agreedPrice: escrowDeal.agreedPrice,
      depositAmount: escrowDeal.depositAmount,
      currentMilestoneId: escrowDeal.currentMilestoneId,
      selectedChannel: escrowDeal.selectedPaymentChannel,
      depositPaid: escrowDeal.depositPaid,
      mode: escrowDeal.isSandbox ? 'Sandbox' : 'Standard',
      timestamp: new Date().toISOString(),
      auditReference,
      disclaimer: escrowDeal.sandboxNotice || 'This receipt reflects the current recorded deal state.',
    };
    await Share.share({
      title: `DILAAL-ESCROW-RECEIPT-${escrowDeal.dealNumber.replace(/[^a-zA-Z0-9]/g, '')}`,
      message: JSON.stringify(receiptData, null, 2),
    });
    setToastMessage(t('escrowSummaryDownloaded', 'Escrow summary record downloaded.'));
    setIsReceiptModalOpen(false);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const renderChannel = (
    channel: 'mobile_money' | 'card' | 'bank_wire',
    icon: string,
    title: string,
    subtitle: string,
    primaryIcon: boolean,
    input?: React.ReactNode
  ) => {
    const selected = selectedChannel === channel;
    return (
      <Pressable
        onPress={() => handleSelectChannel(channel)}
        style={[styles.method, selected && styles.methodSelected]}
      >
        <View style={styles.methodTop}>
          <View style={styles.methodLeft}>
            <View
              style={[
                styles.methodIcon,
                primaryIcon ? styles.methodIconPrimary : styles.methodIconNeutral,
              ]}
            >
              <Icon
                name={icon}
                size={20}
                color={primaryIcon ? colors.onPrimary : colors.onSurface}
              />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.methodTitle}>{title}</Text>
              <Text style={styles.methodSub}>{subtitle}</Text>
            </View>
          </View>
          <View style={[styles.radio, selected ? styles.radioOn : styles.radioOff]}>
            <Icon name="check" size={14} color={selected ? colors.onPrimary : 'transparent'} />
          </View>
        </View>
        {selected && input ? <View style={styles.methodInputRow}>{input}</View> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pagePad}>
          <View style={styles.headerBanner}>
            <View style={styles.headerLeft}>
              <View style={styles.liveDot} />
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.liveKicker}>{t('activeDeals', 'Live Transaction')}</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {t('dealTrackerTitle', 'Deal Tracker')}
                </Text>
              </View>
            </View>
            <View style={styles.dealPill}>
              <Icon name="verified" size={15} color={colors.primary} />
              <Text style={styles.dealNumber}>{escrowDeal.dealNumber}</Text>
            </View>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewTop}>
              <View style={styles.assetImageWrap}>
                {escrowDeal.assetImage ? (
                  <Image source={{ uri: escrowDeal.assetImage }} style={styles.assetImage} />
                ) : (
                  <Icon name="apartment" size={30} color={colors.outline} />
                )}
                {escrowDeal.assetLocation ? (
                  <View style={styles.assetLocation}>
                    <Text style={styles.assetLocationText} numberOfLines={1}>
                      {escrowDeal.assetLocation}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.overviewBody}>
                <View style={styles.chipsRow}>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{escrowDeal.assetCategory}</Text>
                  </View>
                  <View style={styles.escrowPill}>
                    <Text style={styles.escrowPillText}>{t('underEscrow', 'Under Escrow')}</Text>
                  </View>
                </View>
                <Text style={styles.assetTitle} numberOfLines={1}>
                  {escrowDeal.assetTitle}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceText}>{formatPrice(escrowDeal.agreedPrice)}</Text>
                  <Text style={styles.priceMeta}>{t('agreedUsd', 'Agreed USD')}</Text>
                </View>
              </View>
            </View>

            <View style={styles.peopleGrid}>
              <View style={styles.person}>
                <View style={styles.personIcon}>
                  <Icon name="real_estate_agent" size={18} color={colors.onPrimary} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.personLabel}>{t('brokerDilaalLabel', 'Broker / Dilaal')}</Text>
                  <View style={styles.personValueRow}>
                    <Text style={styles.personValue} numberOfLines={1}>
                      {escrowDeal.brokerName}
                    </Text>
                    <Icon name="star" size={14} color={colors.secondary} />
                  </View>
                </View>
              </View>

              {escrowDeal.escrowOfficer ? (
                <View style={styles.person}>
                  <View style={[styles.personIcon, styles.personIconAlt]}>
                    <Icon name="gavel" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={styles.personLabel}>
                      {t('escrowOfficerLabel', 'Escrow Officer')}
                    </Text>
                    <Text style={styles.personValue} numberOfLines={1}>
                      {escrowDeal.escrowOfficer}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {escrowDeal.isSandbox ? (
            <View style={styles.sandbox}>
              <Icon
                name="science"
                size={22}
                color="#d97706"
                style={styles.sandboxIcon}
              />
              <View style={{ flex: 1 }}>
                <View style={styles.sandboxTitleRow}>
                  <Text style={styles.sandboxTitle}>
                    {t('sandboxTrackerTitle', 'Escrow Transaction Tracker (Sandbox Pilot)')}
                  </Text>
                  <View style={styles.sandboxTag}>
                    <Text style={styles.sandboxTagText}>{t('demoMode', 'Demo Mode')}</Text>
                  </View>
                </View>
                <Text style={styles.sandboxText}>
                  <Text style={{ fontFamily: typography.bold }}>
                    {t('operationalDisclosure', 'Operational Disclosure:')}{' '}
                  </Text>
                  {escrowDeal.sandboxNotice ||
                    t(
                      'sandboxFallbackNotice',
                      'This workflow demonstrates the multi-step closing process. Live fund custody requires integration with a licensed bank or authorized escrow trust in the relevant jurisdiction.'
                    )}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {t('milestonesTitle', 'Milestones (Daba-galka)')}
            </Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>
                {completedMilestones} of {totalMilestones} {t('completedLabel', 'Completed')}
              </Text>
            </View>
          </View>

          <View style={styles.timeline}>
            <View style={styles.timelineLine} />

            {escrowDeal.milestones.map((m, index) => {
              const isCurrent = m.id === escrowDeal.currentMilestoneId;
              const isCompleted = m.status === 'completed';

              if (index === 0) {
                return (
                  <View key={m.id} style={styles.milestoneRow}>
                    <View
                      style={[
                        styles.node,
                        isCompleted ? styles.nodeDone : styles.nodeActive,
                      ]}
                    >
                      <Icon
                        name={isCompleted ? 'check' : 'account_balance_wallet'}
                        size={22}
                        color={isCompleted ? colors.onPrimary : colors.onSecondaryContainer}
                      />
                    </View>

                    <View style={styles.card}>
                      <View style={styles.cardHead}>
                        <View style={styles.cardHeadLeft}>
                          <View style={styles.activeDot} />
                          <Text style={styles.milestoneKicker}>
                            {isCompleted ? 'Completed' : 'Active Milestone'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusPill,
                            isCompleted ? styles.statusPillDone : styles.statusPillActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: isCompleted ? colors.primary : colors.onSecondaryFixed },
                            ]}
                          >
                            {isCompleted ? 'Paid & Escrowed' : 'Action Needed'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.milestoneTitle}>{m.title}</Text>
                      <Text style={styles.milestoneText}>
                        {depositPercent !== null
                          ? t('initialPercentDownPayment', 'Initial {percent}% Down Payment').replace(
                              '{percent}',
                              String(depositPercent)
                            )
                          : t('initialEscrowDeposit', 'Initial Escrow Deposit')}{' '}
                        (
                        <Text style={{ color: colors.primary, fontFamily: typography.bold }}>
                          {formatPrice(escrowDeal.depositAmount)}
                        </Text>
                        ){' '}
                        {t(
                          'escrowHeldCopy',
                          'held securely in multi-signature escrow until title transfer.'
                        )}
                      </Text>

                      {!escrowDeal.depositPaid ? (
                        <>
                          <View style={styles.methodList}>
                            <Text style={styles.methodLabel}>Select Payment Channel</Text>

                            {renderChannel(
                              'mobile_money',
                              'phone_android',
                              'Mobile Money Instant',
                              'Hormuud EVC Plus • Telesom Zaad • Sahal',
                              true,
                              <>
                                <Text style={styles.methodInputLabel}>
                                  {t('merchantPush', 'Merchant Push:')}
                                </Text>
                                <TextInput
                                  value={mobilePhone}
                                  onChangeText={(value) => {
                                    setMobilePhone(value);
                                    setPaymentError(null);
                                  }}
                                  keyboardType="phone-pad"
                                  placeholder={t('mobileNumberPlaceholder', 'Enter mobile number')}
                                  placeholderTextColor={colors.outline}
                                  style={styles.methodInput}
                                />
                              </>
                            )}

                            {renderChannel(
                              'card',
                              'credit_card',
                              'Diaspora Global Card',
                              'Visa • Mastercard • Apple Pay (Instant)',
                              false,
                              <>
                                <Text style={styles.methodInputLabel}>
                                  {t('cardNumberLabel', 'Card:')}
                                </Text>
                                <TextInput
                                  value={cardNumber}
                                  onChangeText={(value) => {
                                    setCardNumber(value);
                                    setPaymentError(null);
                                  }}
                                  keyboardType="numeric"
                                  placeholder={t('cardNumberPlaceholder', 'Enter card number')}
                                  placeholderTextColor={colors.outline}
                                  style={styles.methodInput}
                                />
                              </>
                            )}

                            {renderChannel(
                              'bank_wire',
                              'account_balance',
                              'Bank Wire / Remittance',
                              'Dahabshiil • IBS Bank • Salaam Somali',
                              false
                            )}
                          </View>

                          <View style={styles.payBlock}>
                            {paymentError ? (
                              <View style={styles.errorBox}>
                                <Icon name="error" size={14} color={colors.onErrorContainer} />
                                <Text style={styles.errorText}>{paymentError}</Text>
                              </View>
                            ) : null}

                            <Pressable
                              onPress={handlePay}
                              disabled={isPaying}
                              style={[styles.payBtn, isPaying && { opacity: 0.7 }]}
                            >
                              {isPaying ? (
                                <Icon name="progress_activity" size={18} color={colors.onPrimary} />
                              ) : (
                                <>
                                  <Icon name="verified_user" size={20} color={colors.onPrimary} />
                                  <Text style={styles.payBtnText}>
                                    {t(
                                      'paySecurelyToEscrow',
                                      'Pay {amount} Securely to Escrow'
                                    ).replace('{amount}', formatPrice(escrowDeal.depositAmount))}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                            <Text style={styles.secureNote}>
                              {t(
                                'securePaymentNotice',
                                'Bixi Lacagta Ammaanka • Sandbox payment session'
                              )}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.paidBox}>
                          <View style={styles.paidLeft}>
                            <Icon name="task_alt" size={16} color={colors.primary} />
                            <Text style={styles.paidText}>
                              {t(
                                'depositLockedInEscrow',
                                'Deposit {amount} Locked in Escrow'
                              ).replace('{amount}', formatPrice(escrowDeal.depositAmount))}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => setIsReceiptModalOpen(true)}
                            style={styles.receiptBtn}
                          >
                            <Text style={styles.receiptBtnText}>{t('receipt', 'Receipt')}</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                );
              }

              return (
                <View
                  key={m.id}
                  style={[
                    styles.milestoneRow,
                    !isCompleted && !isCurrent ? styles.milestoneRowMuted : null,
                  ]}
                >
                  <View
                    style={[
                      styles.node,
                      isCompleted
                        ? styles.nodeDone
                        : isCurrent
                        ? styles.nodeActive
                        : styles.nodePending,
                    ]}
                  >
                    <Icon
                      name={isCompleted ? 'check' : isCurrent ? 'workspace_premium' : 'lock'}
                      size={20}
                      color={
                        isCompleted
                          ? colors.onPrimary
                          : isCurrent
                          ? colors.onSecondaryContainer
                          : colors.onSurfaceVariant
                      }
                    />
                  </View>

                  <View style={styles.standardCard}>
                    <View style={styles.standardBody}>
                      <Text style={styles.standardTitle} numberOfLines={1}>
                        {m.title}
                      </Text>
                      <Text style={styles.standardSub}>{m.subtitle}</Text>
                      {isCurrent &&
                      escrowDeal.depositPaid &&
                      !isCompleted &&
                      index < totalMilestones - 1 ? (
                        <Pressable
                          onPress={() =>
                            advanceDealMilestone(
                              t(
                                'milestoneAdvancedByUser',
                                'Milestone marked advanced by the user.'
                              )
                            )
                          }
                          style={styles.advanceBtn}
                        >
                          <Text style={styles.advanceText}>
                            {t('advanceStage', 'Advance to Next Stage')}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {m.date ? (
                      <View style={[styles.badge, styles.badgeNeutral]}>
                        <Text style={styles.badgeText}>{m.date}</Text>
                      </View>
                    ) : m.badge ? (
                      <View style={[styles.badge, styles.badgePrimary]}>
                        <Text style={[styles.badgeText, styles.badgeTextPrimary]}>{m.badge}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, styles.badgeMuted]}>
                        <Text style={styles.badgeText}>{isCompleted ? 'Done' : 'Pending'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.support}>
            <View style={styles.supportLeft}>
              <View style={styles.supportIcon}>
                <Icon name="contact_support" size={22} color={colors.primary} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.supportTitle}>
                  {t('needHelpWithEscrow', 'Need Help with Escrow?')}
                </Text>
                <Text style={styles.supportText}>
                  {t(
                    'supportTeamHelp',
                    'Contact the support team for help with this transaction.'
                  )}
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setCurrentScreen('safety')} style={styles.supportBtn}>
              <Icon name="contact_support" size={16} color={colors.primary} />
              <Text style={styles.supportBtnText}>{t('support', 'Support')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {toastMessage ? (
        <View style={styles.toast}>
          <Icon name="receipt_long" size={16} color={colors.tertiaryFixed} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <Modal
        visible={isSuccessModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSuccessModalOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <Icon name="task_alt" size={32} color={colors.primary} />
            </View>
            <Text style={styles.successTitle}>
              {t('escrowDepositRecorded', 'Escrow Deposit Recorded')}
            </Text>
            <Text style={styles.successText}>
              {t(
                'depositSessionRecorded',
                'A sandbox deposit session for {amount} has been recorded for this deal. Selected channel: {channel}.'
              )
                .replace('{amount}', formatPrice(escrowDeal.depositAmount))
                .replace('{channel}', selectedChannel.replace('_', ' '))}
            </Text>

            <View style={styles.refBox}>
              <Text style={styles.refLabel}>{t('dealReference', 'Deal Reference')}</Text>
              <Text style={styles.refValue}>{escrowDeal.dealNumber}</Text>
            </View>

            <View style={styles.successActions}>
              <Pressable
                onPress={() => setIsSuccessModalOpen(false)}
                style={[styles.successAction, styles.successActionGhost]}
              >
                <Text style={styles.successActionText}>Close</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsSuccessModalOpen(false);
                  setIsReceiptModalOpen(true);
                }}
                style={[styles.successAction, styles.successActionPrimary]}
              >
                <Text style={styles.successActionPrimaryText}>View Receipt</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isReceiptModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReceiptModalOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptHead}>
              <View>
                <Text style={styles.receiptTitle}>
                  {t('escrowReceiptTitle', 'Escrow Deposit Receipt')}
                </Text>
                <Text style={styles.receiptNumber}>#{escrowDeal.dealNumber}</Text>
              </View>
              <Pressable
                onPress={() => setIsReceiptModalOpen(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            <View style={styles.receiptBody}>
              <View style={styles.receiptLine}>
                <Text style={styles.receiptLabel}>
                  {t('escrowDepositLabel', 'Escrow Deposit:')}
                </Text>
                <Text style={styles.receiptValueLarge}>
                  {formatPrice(escrowDeal.depositAmount)}
                </Text>
              </View>
              <View style={styles.receiptLine}>
                <Text style={styles.receiptLabel}>
                  {t('agreedPropertyValue', 'Agreed Property Value:')}
                </Text>
                <Text style={styles.receiptValue}>{formatPrice(escrowDeal.agreedPrice)}</Text>
              </View>
              {escrowDeal.escrowOfficer ? (
                <View style={styles.receiptLine}>
                  <Text style={styles.receiptLabel}>
                    {t('escrowOfficerLabel', 'Escrow Officer')}:
                  </Text>
                  <Text style={styles.receiptValue}>{escrowDeal.escrowOfficer}</Text>
                </View>
              ) : null}
              <View style={styles.receiptLine}>
                <Text style={styles.receiptLabel}>{t('statusLabel', 'Status:')}</Text>
                <Text style={[styles.receiptValue, styles.receiptValueSecondary]}>
                  {t('depositLoggedStatus', 'Deposit Logged')}
                  {escrowDeal.isSandbox ? ` • ${t('sandboxState', 'Sandbox State')}` : ''}
                  {` • ${t('milestoneStatus', 'Milestone {current} of {total}')
                    .replace('{current}', String(escrowDeal.currentMilestoneId))
                    .replace('{total}', String(totalMilestones))}`}
                </Text>
              </View>
            </View>

            {escrowDeal.isSandbox ? (
              <View style={styles.receiptNotice}>
                <Text style={styles.receiptNoticeText}>
                  <Text style={{ fontFamily: typography.bold }}>
                    {t('sandboxPilotDisclosure', 'Sandbox Pilot Disclosure:')}{' '}
                  </Text>
                  {escrowDeal.sandboxNotice ||
                    t(
                      'sandboxFallbackNotice',
                      'This workflow demonstrates the multi-step closing process. Live fund custody requires integration with a licensed bank or authorized escrow trust in the relevant jurisdiction.'
                    )}
                </Text>
              </View>
            ) : null}

            <Pressable onPress={() => void handleDownloadReceipt()} style={styles.downloadBtn}>
              <Icon name="download" size={16} color={colors.onPrimary} />
              <Text style={styles.downloadText}>
                {t('downloadEscrowSummary', 'Download Escrow Summary (.json)')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
