import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { fetchBrokerReviews, submitBrokerReview } from '../lib/persistence';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

interface BrokerReview {
  id: string;
  name: string;
  location?: string;
  role?: string;
  stars: number;
  comment: string;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { paddingBottom: 24 },
    wrap: { width: '100%', maxWidth: 672, alignSelf: 'center' },
    cover: { height: 144, backgroundColor: colors.primaryContainer, overflow: 'hidden' },
    diamond: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderWidth: 1,
      borderColor: colors.primaryFixedDim,
      transform: [{ rotate: '45deg' }],
    },
    coverDot: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondaryFixed },
    identity: { paddingHorizontal: 14, marginTop: -56, alignItems: 'flex-start' },
    avatarWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
      padding: 4,
      backgroundColor: colors.surfaceContainerLowest,
      ...shadow.floating,
    },
    avatar: { width: '100%', height: '100%', borderRadius: 44 },
    avatarFallback: {
      width: '100%',
      height: '100%',
      borderRadius: 44,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedBadge: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surfaceContainerLowest,
    },
    ribbonRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
    verifiedRibbon: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainerHighest,
    },
    verifiedRibbonText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    xaqiijiyey: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.secondaryFixed,
    },
    xaqiijiyeyText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSecondaryFixed },
    name: { fontSize: 21, fontFamily: typography.bold, color: colors.onSurface, marginTop: 8, letterSpacing: -0.3 },
    brokerTitle: { fontSize: 13, fontFamily: typography.medium, color: colors.onSurfaceVariant, marginTop: 2 },
    licenseBox: {
      marginTop: 10,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    licenseText: { fontSize: 12, color: colors.onSurface, flexShrink: 1 },
    licenseStrong: { fontFamily: typography.bold, color: colors.primary },
    section: { paddingHorizontal: 14, marginTop: 16 },
    scorecard: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      ...shadow.card,
    },
    metricCell: {
      width: '48%',
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
    metricLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      flexShrink: 1,
    },
    metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8, flexWrap: 'wrap' },
    metricValue: { fontSize: 21, fontFamily: typography.bold, color: colors.primary },
    metricValueNeutral: { fontSize: 21, fontFamily: typography.bold, color: colors.onSurface },
    tierChip: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: colors.secondaryFixed,
    },
    tierChipText: { fontSize: 10, fontFamily: typography.bold, color: colors.onSecondaryFixed },
    metricSuffix: { fontSize: 12, color: colors.onSurfaceVariant, fontFamily: typography.medium },
    metricSuffixSmall: { fontSize: 11, fontFamily: typography.bold },
    infoCard: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      ...shadow.card,
      gap: 8,
    },
    infoHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoHeadText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
    },
    chipText: { fontSize: 12, fontFamily: typography.semibold, color: colors.onSurface },
    reachRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    reachText: { fontSize: 12, lineHeight: 18, color: colors.onSurface, flex: 1 },
    ctaCol: { paddingHorizontal: 14, marginTop: 16, gap: 8 },
    primaryCta: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      ...shadow.card,
    },
    primaryCtaText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    secondaryCta: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: colors.secondaryFixed,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryCtaText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSecondaryFixed },
    tabBarWrap: { paddingHorizontal: 14, marginTop: 24 },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabBtnActive: { backgroundColor: colors.surfaceContainerLowest, ...shadow.card },
    tabText: { fontSize: 11, fontFamily: typography.bold, color: colors.onSurfaceVariant, textAlign: 'center' },
    tabTextActive: { color: colors.primary },
    tabBody: { paddingHorizontal: 14, marginTop: 16, gap: 12 },
    emptyCard: {
      paddingVertical: 40,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: { fontSize: 11, color: colors.onSurfaceVariant, textAlign: 'center' },
    listingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    listingCard: {
      width: '48%',
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      overflow: 'hidden',
      ...shadow.card,
    },
    listingImage: { width: '100%', height: 112, backgroundColor: colors.surfaceContainer },
    listingImageFallback: {
      width: '100%',
      height: 112,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingVerified: {
      position: 'absolute',
      top: 8,
      left: 8,
      borderRadius: 999,
      backgroundColor: colors.primary + 'E6',
      paddingHorizontal: 6,
      paddingVertical: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    listingVerifiedText: { fontSize: 10, fontFamily: typography.bold, color: colors.surface },
    listingCategory: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      borderRadius: 4,
      backgroundColor: colors.surface + 'E6',
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    listingCategoryText: { fontSize: 10, fontFamily: typography.semibold, color: colors.onSurface },
    listingBody: { padding: 10, gap: 4, justifyContent: 'space-between', flex: 1 },
    listingTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    listingLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    listingLocation: { fontSize: 11, color: colors.onSurfaceVariant, flexShrink: 1 },
    listingPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 8,
    },
    listingPrice: { fontSize: 12, fontFamily: typography.bold, color: colors.primary },
    listingCurrency: { fontSize: 10, color: colors.onSurfaceVariant },
    reviewsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    reviewsLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    writeReviewBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: colors.primaryContainer,
    },
    writeReviewText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    reviewCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      ...shadow.card,
      gap: 10,
    },
    reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    reviewIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    reviewAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewAvatarText: { fontSize: 11, fontFamily: typography.bold, color: colors.onPrimary },
    reviewName: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    reviewStars: { flexDirection: 'row' },
    reviewComment: {
      fontSize: 12,
      color: colors.onSurface,
      fontStyle: 'italic',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 12,
      lineHeight: 18,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    credentialHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    credentialTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    credentialRow: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    credentialLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    credentialValue: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 1 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: colors.surfaceContainerLowest,
      width: '100%',
      maxWidth: 384,
      borderRadius: 24,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '55',
      ...shadow.floating,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, marginBottom: 4 },
    starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    input: {
      padding: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      fontSize: 12,
      fontFamily: typography.semibold,
      color: colors.onSurface,
    },
    textarea: { minHeight: 84, textAlignVertical: 'top', fontFamily: typography.sans },
    submitBtn: {
      width: '100%',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
    },
    submitBtnText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    modalBody: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },
  });

export const BrokerProfileScreen: React.FC = () => {
  const {
    brokers,
    selectedBrokerId,
    openChatWithBroker,
    openListingDetails,
    listings,
    formatPrice,
    setCurrentScreen,
    currentUser,
    refreshFromSupabase,
    t,
  } = useApp();

  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  const broker = brokers.find((b) => b.id === selectedBrokerId) || brokers[0];

  const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'credentials'>('listings');
  const [isEscrowModalOpen, setIsEscrowModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewsList, setReviewsList] = useState<BrokerReview[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!broker?.id) return;
    void fetchBrokerReviews(broker.id).then((rows) => {
      if (cancelled || !rows) return;
      setReviewsList(
        rows.map((row) => ({
          id: row.id,
          name: t('dilaalMember', 'Dilaal member'),
          stars: row.rating,
          comment: row.body,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broker?.id]);

  const handleAddReview = async () => {
    if (!broker || !reviewComment.trim()) return;

    setIsReviewSubmitting(true);
    setReviewError('');
    const res = await submitBrokerReview(broker.id, reviewRating, reviewComment.trim());
    setIsReviewSubmitting(false);

    if (!res.success && !res.missing) {
      setReviewError(
        res.error === 'Sign in to review a broker.'
          ? t('signInToReview', 'Sign in to share a review.')
          : t('reviewSubmitFailed', 'Your review could not be saved. Try again in a moment.')
      );
      return;
    }

    setReviewsList((prev) => [
      {
        id: `rev-${Date.now()}`,
        name: currentUser.name || t('you', 'You'),
        stars: reviewRating,
        comment: reviewComment.trim(),
      },
      ...prev,
    ]);

    setReviewComment('');
    setIsReviewModalOpen(false);
    if (res.success) void refreshFromSupabase();
  };

  const brokerListings = broker ? listings.filter((item) => item.brokerId === broker.id) : [];
  const isVerifiedBroker = broker?.verificationStatus === 'approved';
  const hasLanguages = Boolean(broker?.languages && broker.languages.length > 0);

  if (!broker) {
    return (
      <View style={styles.emptyCard}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.surfaceContainer,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="badge" size={30} color={colors.outline} />
        </View>
        <Text style={styles.emptyTitle}>No Broker Selected</Text>
        <Text style={styles.emptySub}>
          Registered brokers will appear here once their profiles are added.
        </Text>
        <Pressable
          onPress={() => setCurrentScreen('home')}
          style={[styles.primaryCta, { marginTop: 8, paddingHorizontal: 20, minHeight: 40 }]}
        >
          <Text style={styles.primaryCtaText}>Return to Marketplace</Text>
        </Pressable>
      </View>
    );
  }

  const metricCell = (
    label: string,
    icon: string,
    valueNode: React.ReactNode,
    iconColor: string = colors.primary
  ) => (
    <View style={styles.metricCell}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel} numberOfLines={1}>
          {label}
        </Text>
        <Icon name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.metricValueRow}>{valueNode}</View>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.wrap}>
          <View style={styles.cover}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View
                key={`d-${i}`}
                style={[
                  styles.diamond,
                  { left: ((i % 8) * 48) - 8, top: Math.floor(i / 8) * 72 + 8, opacity: 0.16 },
                ]}
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={`c-${i}`}
                style={[
                  styles.coverDot,
                  { left: (i % 8) * 48 + 16, top: Math.floor(i / 8) * 72 + 28, opacity: 0.16 },
                ]}
              />
            ))}
            <LinearGradient
              colors={['rgba(0,53,39,0.8)', 'transparent']}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </View>

          <View style={styles.identity}>
            <View style={{ position: 'relative' }}>
              <View style={styles.avatarWrap}>
                {broker.avatar ? (
                  <Image source={{ uri: broker.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Icon name="person" size={44} color={colors.outline} />
                  </View>
                )}
              </View>
              {isVerifiedBroker && (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={18} color={colors.onSecondary} />
                </View>
              )}
            </View>

            {isVerifiedBroker && (
              <View style={styles.ribbonRow}>
                <View style={styles.verifiedRibbon}>
                  <Icon name="verified" size={16} color={colors.primary} />
                  <Text style={styles.verifiedRibbonText}>{t('verifiedBroker', 'Verified Broker')}</Text>
                </View>
                <View style={styles.xaqiijiyey}>
                  <Icon name="shield" size={14} color={colors.onSecondaryFixed} />
                  <Text style={styles.xaqiijiyeyText}>Xaqiijiyey</Text>
                </View>
              </View>
            )}

            <Text style={styles.name}>{broker.name}</Text>
            <Text style={styles.brokerTitle}>{broker.title}</Text>

            {(broker.licenseNumber || broker.licenseAuthority) && (
              <View style={styles.licenseBox}>
                <Icon name="account_balance" size={20} color={colors.primary} />
                <Text style={styles.licenseText} numberOfLines={1}>
                  {broker.licenseAuthority}
                  {broker.licenseNumber ? (
                    <Text style={styles.licenseStrong}> {broker.licenseNumber}</Text>
                  ) : null}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.scorecard}>
              {metricCell(
                'Trust Score',
                'verified_user',
                <>
                  <Text style={styles.metricValue}>{broker.trustScore}%</Text>
                  <View style={styles.tierChip}>
                    <Text style={styles.tierChipText}>{broker.tier}</Text>
                  </View>
                </>,
                colors.secondary
              )}
              {metricCell(
                'Closed Deals',
                'handshake',
                <>
                  <Text style={styles.metricValueNeutral}>{broker.deals}</Text>
                  <Text style={styles.metricSuffix}>Escrows</Text>
                </>
              )}
              {metricCell(
                'Rating',
                'star',
                <>
                  <Text style={styles.metricValueNeutral}>{broker.rating}</Text>
                  <Text style={styles.metricSuffix}>({broker.reviewsCount} reviews)</Text>
                </>,
                colors.secondary
              )}
              {metricCell(
                'Avg Response',
                'bolt',
                <>
                  <Text style={styles.metricValue}>{broker.responseTime || '—'}</Text>
                  <Text
                    style={[
                      styles.metricSuffixSmall,
                      { color: broker.isOnline ? colors.primary : colors.outline },
                    ]}
                  >
                    {broker.isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                  </Text>
                </>
              )}
            </View>
          </View>

          {(hasLanguages || broker.coverage || broker.diasporaCoverage) && (
            <View style={styles.section}>
              <View style={{ gap: 10 }}>
                {hasLanguages && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoHead}>
                      <Icon name="translate" size={18} color={colors.onSurfaceVariant} />
                      <Text style={[styles.infoHeadText, { color: colors.onSurfaceVariant }]}>
                        Supported Languages
                      </Text>
                    </View>
                    <View style={styles.chipRow}>
                      {broker.languages.map((lang, idx) => (
                        <View key={idx} style={styles.chip}>
                          <Text style={styles.chipText}>{lang}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {(broker.coverage || broker.diasporaCoverage) && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoHead}>
                      <Icon name="travel_explore" size={18} color={colors.onSurfaceVariant} />
                      <Text style={[styles.infoHeadText, { color: colors.onSurfaceVariant }]}>
                        Regional & Diaspora Reach
                      </Text>
                    </View>
                    <View style={styles.reachRow}>
                      <Icon name="location_on" size={18} color={colors.primary} style={{ marginTop: 1 }} />
                      <Text style={styles.reachText}>
                        {broker.coverage ? <Text style={{ fontFamily: typography.bold }}>{broker.coverage}</Text> : null}
                        {broker.coverage && broker.diasporaCoverage ? '\n' : ''}
                        {broker.diasporaCoverage ? (
                          <Text style={{ fontFamily: typography.bold }}>{broker.diasporaCoverage}</Text>
                        ) : null}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.ctaCol}>
            <Pressable onPress={() => openChatWithBroker(broker.id)} style={styles.primaryCta}>
              <Icon name="chat" size={20} color={colors.onPrimary} />
              <Text style={styles.primaryCtaText}>Contact Dilaal (La Xiriir)</Text>
            </Pressable>
            <Pressable onPress={() => setIsEscrowModalOpen(true)} style={styles.secondaryCta}>
              <Icon name="verified_user" size={20} color={colors.secondary} />
              <Text style={styles.secondaryCtaText}>Request Escrow Deal</Text>
            </Pressable>
          </View>

          <View style={styles.tabBarWrap}>
            <View style={styles.tabBar}>
              {(
                [
                  { id: 'listings' as const, label: `Active Listings (${brokerListings.length})` },
                  { id: 'reviews' as const, label: `Client Reviews (${broker.reviewsCount})` },
                  { id: 'credentials' as const, label: 'Credentials' },
                ]
              ).map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {activeTab === 'listings' && (
            <View style={styles.tabBody}>
              {brokerListings.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Icon name="home_work" size={30} color={colors.outline} />
                  <Text style={styles.emptyTitle}>{t('noBrokerListings', 'No active listings')}</Text>
                  <Text style={styles.emptySub}>
                    {t('noBrokerListingsDesc', 'This broker has not published any listings yet.')}
                  </Text>
                </View>
              ) : (
                <View style={styles.listingsGrid}>
                  {brokerListings.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => openListingDetails(item.id)}
                      style={styles.listingCard}
                    >
                      <View style={{ position: 'relative' }}>
                        {item.image ? (
                          <Image source={{ uri: item.image }} style={styles.listingImage} />
                        ) : (
                          <View style={styles.listingImageFallback}>
                            <Icon name="home_work" size={30} color={colors.outline} />
                          </View>
                        )}
                        {(item.isVerified || item.verificationStatus === 'approved') && (
                          <View style={styles.listingVerified}>
                            <Icon name="verified" size={12} color={colors.surface} />
                            <Text style={styles.listingVerifiedText}>Verified</Text>
                          </View>
                        )}
                        <View style={styles.listingCategory}>
                          <Text style={styles.listingCategoryText}>{item.category}</Text>
                        </View>
                      </View>
                      <View style={styles.listingBody}>
                        <View>
                          <Text style={styles.listingTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.location ? (
                            <View style={styles.listingLocationRow}>
                              <Icon name="location_on" size={14} color={colors.onSurfaceVariant} />
                              <Text style={styles.listingLocation} numberOfLines={1}>
                                {item.location.split(',')[0]}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.listingPriceRow}>
                          <Text style={styles.listingPrice}>{formatPrice(item.price)}</Text>
                          <Text style={styles.listingCurrency}>{item.currency}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.tabBody}>
              <View style={styles.reviewsHead}>
                <Text style={styles.reviewsLabel}>{t('clientReviews', 'Client Reviews')}</Text>
                <Pressable onPress={() => setIsReviewModalOpen(true)} style={styles.writeReviewBtn}>
                  <Text style={styles.writeReviewText}>+ {t('writeReview', 'Write a Review')}</Text>
                </Pressable>
              </View>

              {reviewsList.length === 0 && (
                <View style={styles.emptyCard}>
                  <Icon name="reviews" size={30} color={colors.outline} />
                  <Text style={styles.emptyTitle}>{t('noReviewsYet', 'No reviews yet')}</Text>
                  <Text style={styles.emptySub}>
                    {t('noReviewsYetDesc', 'Be the first to share your experience with this broker.')}
                  </Text>
                </View>
              )}

              {reviewsList.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <View style={styles.reviewIdentity}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>
                          {rev.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </Text>
                      </View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={styles.reviewName}>{rev.name}</Text>
                        {rev.location ? (
                          <Text style={styles.emptySub}>{rev.location}</Text>
                        ) : null}
                        {rev.role ? <Text style={styles.emptySub}>{rev.role}</Text> : null}
                      </View>
                    </View>
                    <View style={styles.reviewStars}>
                      {Array.from({ length: rev.stars }).map((_, i) => (
                        <Icon key={i} name="star" size={16} color={colors.secondary} />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'credentials' && (
            <View style={styles.tabBody}>
              <View style={[styles.infoCard, { padding: 16, gap: 12 }]}>
                <View style={styles.credentialHead}>
                  <Icon name="verified" size={24} color={colors.primary} />
                  <Text style={styles.credentialTitle}>{t('credentials', 'Credentials')}</Text>
                </View>

                <View style={{ gap: 10 }}>
                  {(broker.licenseAuthority || broker.licenseNumber) && (
                    <View style={styles.credentialRow}>
                      <Icon name="policy" size={20} color={colors.primary} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.credentialLabel}>
                          {broker.licenseAuthority || t('brokerLicense', 'Broker License')}
                        </Text>
                        {broker.licenseNumber ? (
                          <Text style={styles.credentialValue}>
                            {t('licenseNumber', 'License number')}: {broker.licenseNumber}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}

                  <View style={styles.credentialRow}>
                    <Icon name="verified_user" size={20} color={colors.secondary} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.credentialLabel}>
                        {t('verificationStatus', 'Verification Status')}
                      </Text>
                      <Text style={styles.credentialValue}>{broker.verificationStatus}</Text>
                    </View>
                  </View>

                  {broker.coverage ? (
                    <View style={styles.credentialRow}>
                      <Icon name="location_on" size={20} color={colors.primary} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.credentialLabel}>{t('coverage', 'Coverage')}</Text>
                        <Text style={styles.credentialValue}>{broker.coverage}</Text>
                      </View>
                    </View>
                  ) : null}

                  {broker.diasporaCoverage ? (
                    <View style={styles.credentialRow}>
                      <Icon name="public" size={20} color={colors.primary} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.credentialLabel}>
                          {t('diasporaCoverage', 'Diaspora Coverage')}
                        </Text>
                        <Text style={styles.credentialValue}>{broker.diasporaCoverage}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isReviewModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReviewModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('writeReview', 'Write a Review')}</Text>
              <Pressable onPress={() => setIsReviewModalOpen(false)} style={styles.closeBtn}>
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.fieldLabel}>Your Rating</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable key={star} onPress={() => setReviewRating(star)}>
                      <Icon
                        name="star"
                        size={24}
                        color={star <= reviewRating ? colors.secondary : colors.outlineVariant}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Your Experience</Text>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Describe transaction speed, deed registration clarity, notary experience..."
                  placeholderTextColor={colors.outline}
                  multiline
                  style={[styles.input, styles.textarea]}
                />
              </View>

              {reviewError ? (
                <Text style={[styles.fieldLabel, { color: colors.error }]}>{reviewError}</Text>
              ) : null}

              <Pressable
                onPress={handleAddReview}
                disabled={isReviewSubmitting}
                style={[styles.submitBtn, isReviewSubmitting && { opacity: 0.7 }]}
              >
                <Text style={styles.submitBtnText}>
                  {isReviewSubmitting ? t('saving', 'Saving...') : t('submitReview', 'Submit Review')}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isEscrowModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEscrowModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Escrow Representation</Text>
              <Pressable onPress={() => setIsEscrowModalOpen(false)} style={styles.closeBtn}>
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>
            <Text style={styles.modalBody}>
              Start a direct conversation with{' '}
              <Text style={{ fontFamily: typography.bold }}>{broker.name}</Text> about escrow
              representation and title inspection.
            </Text>
            <Pressable
              onPress={() => {
                setIsEscrowModalOpen(false);
                openChatWithBroker(broker.id);
              }}
              style={styles.submitBtn}
            >
              <Text style={styles.submitBtnText}>Start Direct Negotiation</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};
