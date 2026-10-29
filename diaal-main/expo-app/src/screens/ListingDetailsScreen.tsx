import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLinking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';
import { DeedModal } from '../components/DeedModal';
import { ReportModal } from '../components/ReportModal';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { paddingBottom: 16 },
    body: { paddingHorizontal: 14, paddingTop: 16, gap: 16 },
    hero: { width: '100%', aspectRatio: 16 / 11, backgroundColor: colors.surfaceContainer },
    heroEmpty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surfaceContainerHigh,
    },
    heroEmptyText: { fontSize: 12, fontFamily: typography.semibold, color: colors.outline },
    topControls: {
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      zIndex: 10,
    },
    verifiedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,53,39,0.72)',
    },
    verifiedPillText: { color: '#ffffff', fontSize: 12, fontFamily: typography.bold },
    heroActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    roundBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.86)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomOverlay: {
      position: 'absolute',
      bottom: 12,
      left: 16,
      right: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 10,
    },
    counterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(0,53,39,0.82)',
    },
    counterText: { color: '#ffffff', fontSize: 12, fontFamily: typography.semibold },
    galleryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.secondaryContainer,
    },
    galleryBtnText: { color: colors.onSecondaryContainer, fontSize: 12, fontFamily: typography.bold },
    chevron: {
      position: 'absolute',
      top: '50%',
      marginTop: -16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,53,39,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
    priceLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, flexShrink: 1 },
    price: { fontSize: 26, fontFamily: typography.bold, color: colors.primary, letterSpacing: -0.5 },
    currency: { fontSize: 12, fontFamily: typography.medium, color: colors.outline, marginBottom: 3 },
    priceType: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainerHigh,
    },
    priceTypeText: { fontSize: 12, fontFamily: typography.semibold, color: colors.onSurfaceVariant },
    title: { fontSize: 21, fontFamily: typography.bold, color: colors.onSurface, lineHeight: 27 },
    locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    locationText: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18, flex: 1 },
    verifiedBanner: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.primaryFixed + '33',
    },
    verifiedIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    verifiedKicker: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.tertiaryFixed,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    verifiedBody: { fontSize: 12, color: colors.onPrimaryContainer, lineHeight: 17, marginTop: 2 },
    verifiedStrong: { color: colors.surfaceBright, textDecorationLine: 'underline', fontFamily: typography.bold },
    specsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    specCell: {
      width: '31.6%',
      backgroundColor: colors.surfaceContainerLow,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
    },
    specValue: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, marginTop: 4 },
    specLabel: { fontSize: 11, fontFamily: typography.semibold, color: colors.outline, marginTop: 1 },
    card: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      ...shadow.card,
    },
    cardTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    desc: { fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 19 },
    divider: { height: 1, backgroundColor: colors.surfaceContainerHighest, width: '100%', marginVertical: 4 },
    sectionLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amenity: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6 },
    amenityText: { fontSize: 12, color: colors.onSurfaceVariant, flexShrink: 1 },
    lockedPanel: {
      width: '100%',
      height: 176,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
      overflow: 'hidden',
    },
    lockPin: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceBright,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
    },
    lockedPill: {
      backgroundColor: colors.surfaceBright,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
      maxWidth: '100%',
    },
    lockedPillText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    lockedSub: { fontSize: 11, fontFamily: typography.medium, color: colors.onSurfaceVariant },
    brokerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    kicker: { fontSize: 11, fontFamily: typography.bold, color: colors.outline, textTransform: 'uppercase', letterSpacing: 0.6 },
    tierPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.secondaryFixed,
    },
    tierText: { fontSize: 11, fontFamily: typography.bold, color: colors.onSecondaryFixedVariant },
    brokerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    brokerAvatar: { width: 56, height: 56, borderRadius: 28 },
    brokerAvatarFallback: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brokerBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brokerName: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    brokerMeta: { fontSize: 11, color: colors.outline },
    brokerStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    brokerStar: { fontSize: 12, fontFamily: typography.bold, color: colors.secondary },
    brokerDeals: { fontSize: 11, color: colors.onSurfaceVariant },
    brokerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    brokerActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerHigh,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    brokerActionText: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    evidenceRow: {
      paddingTop: 10,
      marginTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '26',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    evidenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    evidenceText: { fontSize: 12, fontFamily: typography.semibold, color: colors.primary },
    reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reportText: { fontSize: 12, color: colors.outline },
    similarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    seeAll: { fontSize: 12, fontFamily: typography.bold, color: colors.primary },
    similarRow: { gap: 12, paddingBottom: 6 },
    similarCard: {
      width: 210,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    similarImage: { width: '100%', height: 112, backgroundColor: colors.surfaceContainer },
    similarImageFallback: {
      width: '100%',
      height: 112,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    similarVerified: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: colors.primary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    similarVerifiedText: { fontSize: 10, fontFamily: typography.bold, color: colors.onPrimary },
    similarBody: { padding: 10, gap: 2 },
    similarPrice: { fontSize: 14, fontFamily: typography.bold, color: colors.primary },
    similarTitle: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface },
    similarLocation: { fontSize: 11, color: colors.outline },
    actionBar: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopWidth: 1,
      borderTopColor: colors.outlineVariant + '33',
      paddingHorizontal: 14,
      paddingTop: 10,
    },
    actionInner: { maxWidth: 448, width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 10 },
    offerBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      ...shadow.card,
    },
    offerText: { fontSize: 13, fontFamily: typography.bold, color: colors.onPrimary },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: { fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
    emptyActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    emptyPrimary: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    emptyPrimaryText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    emptySecondary: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerHigh,
    },
    emptySecondaryText: { fontSize: 12, fontFamily: typography.semibold, color: colors.onSurface },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    offerSheet: {
      backgroundColor: colors.surfaceContainerLowest,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 18,
      gap: 14,
      borderTopWidth: 1,
      borderColor: colors.outlineVariant + '55',
    },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    sheetTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    sheetSub: { fontSize: 12, color: colors.outline },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldLabel: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, marginBottom: 6 },
    amountWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '55',
      borderRadius: 12,
      paddingLeft: 14,
    },
    dollar: { fontSize: 18, fontFamily: typography.bold, color: colors.primary },
    amountInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 6,
      fontSize: 18,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    depositNote: { fontSize: 11, color: colors.outline, marginTop: 6 },
    depositValue: { fontFamily: typography.bold, color: colors.primary },
    offerNotice: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.primary + '1A',
      alignItems: 'flex-start',
    },
    offerNoticeText: { fontSize: 12, color: colors.primary, lineHeight: 17, flex: 1 },
    submitOffer: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submitOfferText: { fontSize: 14, fontFamily: typography.bold, color: colors.onPrimary },
    gallerySheet: {
      width: '100%',
      maxWidth: 512,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '55',
      ...shadow.floating,
    },
    galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    galleryTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    galleryImageWrap: { width: '100%', height: 256, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
    galleryImage: { width: '100%', height: '100%' },
    galleryNav: {
      position: 'absolute',
      top: '50%',
      marginTop: -16,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryCounter: {
      position: 'absolute',
      bottom: 12,
      alignSelf: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    galleryCounterText: { color: '#ffffff', fontSize: 12, fontFamily: typography.semibold },
    galleryClose: {
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    galleryCloseText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    toast: {
      position: 'absolute',
      bottom: 90,
      alignSelf: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      ...shadow.floating,
    },
    toastText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
  });

export const ListingDetailsScreen: React.FC = () => {
  const {
    listings,
    brokers,
    selectedListingId,
    openListingDetails,
    openBrokerProfile,
    openChatWithBroker,
    formatPrice,
    favorites,
    toggleFavorite,
    setCurrentScreen,
    activeTab,
    language,
    t,
  } = useApp();

  const { startCall, session: callSession } = useCall();

  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const listing = listings.find((l) => l.id === selectedListingId) || listings[0];

  const galleryRef = useRef<FlatList<string> | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isDeedModalOpen, setIsDeedModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(listing && listing.price > 0 ? String(listing.price) : '');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!listing) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Icon name="home_work" size={30} color={colors.outline} />
        </View>
        <Text style={styles.emptyTitle}>No Listing Selected</Text>
        <Text style={styles.emptySub}>
          The requested property listing is either unavailable or has not been published yet. Browse
          the marketplace or submit a new property.
        </Text>
        <View style={styles.emptyActions}>
          <Pressable
            onPress={() => setCurrentScreen(activeTab === 'search' ? 'search' : 'home')}
            style={styles.emptyPrimary}
          >
            <Text style={styles.emptyPrimaryText}>Explore Marketplace</Text>
          </Pressable>
          <Pressable onPress={() => setCurrentScreen('post')} style={styles.emptySecondary}>
            <Text style={styles.emptySecondaryText}>Post a Listing</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const galleryImages = (
    listing.gallery && listing.gallery.length > 0
      ? [listing.image, ...listing.gallery]
      : [listing.image].filter(Boolean)
  ).filter((img): img is string => typeof img === 'string' && img.trim().length > 0);

  const activeSlide = galleryImages.length > 0 ? currentSlide % galleryImages.length : 0;
  const broker = brokers.find((b) => b.id === listing.brokerId);
  const isVerifiedListing = listing.isVerified || listing.verificationStatus === 'approved';
  const brokerRating = broker?.rating ?? listing.brokerRating;
  const brokerDeals = broker?.deals ?? listing.brokerDeals;
  const offerValue = Number(offerAmount);
  const isOfferValid = Number.isFinite(offerValue) && offerValue > 0;

  const specs = listing.categorySpecs;
  const specItems: { icon: string; value: string; label: string }[] = [];
  if (listing.category === 'house') {
    if (listing.beds) specItems.push({ icon: 'bed', value: String(listing.beds), label: 'Bedrooms (Qol)' });
    if (listing.baths) specItems.push({ icon: 'bathtub', value: String(listing.baths), label: 'Bathrooms (Suuli)' });
    if (listing.area) specItems.push({ icon: 'square_foot', value: listing.area, label: 'Lot Compound' });
    if (listing.garage) specItems.push({ icon: 'directions_car', value: String(listing.garage), label: 'Car Garage' });
  } else if (listing.category === 'land') {
    if (specs?.plotDimensions) specItems.push({ icon: 'straighten', value: specs.plotDimensions, label: 'Dimensions (Boos)' });
    if (listing.area) specItems.push({ icon: 'square_foot', value: listing.area, label: 'Total Land Area' });
    if (specs?.beaconsStatus) specItems.push({ icon: 'pin_drop', value: specs.beaconsStatus, label: 'GPS Cadastral' });
    if (specs?.boundaryFencing) specItems.push({ icon: 'fence', value: specs.boundaryFencing, label: 'Boundary Wall' });
    if (specs?.roadAccess) specItems.push({ icon: 'add_road', value: specs.roadAccess, label: 'Road Frontage' });
    if (specs?.zoning) specItems.push({ icon: 'domain', value: specs.zoning, label: 'Zoning Code' });
  } else if (listing.category === 'car') {
    if (specs?.year) specItems.push({ icon: 'calendar_today', value: specs.year, label: 'Model Year' });
    if (specs?.mileage) specItems.push({ icon: 'speed', value: specs.mileage, label: 'Odometer' });
    if (specs?.transmission) specItems.push({ icon: 'settings', value: specs.transmission, label: 'Gearbox' });
    if (specs?.fuelType) specItems.push({ icon: 'local_gas_station', value: specs.fuelType, label: 'Fuel System' });
    if (specs?.driveType) specItems.push({ icon: 'tire_repair', value: specs.driveType, label: 'Drivetrain' });
    if (specs?.customsDutyPaid === true) specItems.push({ icon: 'receipt_long', value: 'Customs Duty Paid', label: 'Port Customs' });
  } else if (listing.category === 'rental') {
    if (listing.beds) specItems.push({ icon: 'bed', value: String(listing.beds), label: 'Bedrooms (Qol)' });
    if (listing.baths) specItems.push({ icon: 'bathtub', value: String(listing.baths), label: 'Bathrooms (Suuli)' });
    if (specs?.furnishing) specItems.push({ icon: 'chair', value: specs.furnishing, label: 'Furnishing' });
    if (specs?.floorLevel) specItems.push({ icon: 'layers', value: specs.floorLevel, label: 'Floor Level' });
    if (specs?.leaseTerm) specItems.push({ icon: 'contract', value: specs.leaseTerm, label: 'Min. Lease' });
    if (specs?.securityDeposit) specItems.push({ icon: 'shield', value: specs.securityDeposit, label: 'Deposit' });
  } else if (listing.category === 'commercial') {
    if (specs?.commercialType) specItems.push({ icon: 'apartment', value: specs.commercialType, label: 'Commercial Type' });
    if (listing.area) specItems.push({ icon: 'square_foot', value: listing.area, label: 'Total Floor Area' });
    if (specs?.stories) specItems.push({ icon: 'stairs', value: specs.stories, label: 'Floor Levels' });
    if (specs?.parkingBays) specItems.push({ icon: 'local_parking', value: specs.parkingBays, label: 'Parking Spaces' });
    if (specs?.generatorCapacity) specItems.push({ icon: 'electric_bolt', value: specs.generatorCapacity, label: 'Standby Power' });
    if (specs?.streetFrontage) specItems.push({ icon: 'storefront', value: specs.streetFrontage, label: 'Street Frontage' });
  }

  const similarListings = listings.filter((item) => item.id !== listing.id).slice(0, 3);

  const goToSlide = (next: number) => {
    if (galleryImages.length < 1) return;
    const normalized = (next + galleryImages.length) % galleryImages.length;
    setCurrentSlide(normalized);
    galleryRef.current?.scrollToIndex({ index: normalized, animated: true });
  };

  const onHeroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (galleryImages.length === 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(idx);
  };

  const handleShare = async () => {
    try {
      const shareUrl = ExpoLinking.createURL(`listing/${listing.id}`);
      await Share.share({
        message: `DILAAL — ${listing.title}\n${listing.locationDetails}\n${formatPrice(listing.price)} ${listing.currency}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // Sharing can be cancelled without changing screen state.
    }
  };

  const handleSubmitOffer = () => {
    if (!isOfferValid) return;
    setIsOfferModalOpen(false);
    openChatWithBroker(listing.brokerId, listing.id, offerValue);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 672, alignSelf: 'center' }}>
          <View style={[styles.hero, { width }]}>
            <FlatList
              ref={galleryRef}
              data={galleryImages}
              keyExtractor={(img, idx) => `${img}-${idx}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onHeroScrollEnd}
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={{ width, height: '100%' }} resizeMode="cover" />
              )}
              ListEmptyComponent={
                <View style={[styles.heroEmpty, { width }]}>
                  <Icon name="home_work" size={42} color={colors.outline} />
                  <Text style={styles.heroEmptyText}>{t('noPhotos', 'No photos available')}</Text>
                </View>
              }
            />
            <LinearGradient
              colors={['rgba(0,53,39,0.8)', 'transparent', 'rgba(0,53,39,0.3)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />

            <View style={styles.topControls}>
              {isVerifiedListing ? (
                <Pressable onPress={() => setIsDeedModalOpen(true)} style={styles.verifiedPill}>
                  <Icon name="verified" size={16} color={colors.tertiaryFixed} />
                  <Text style={styles.verifiedPillText}>
                    {listing.verifiedLabel || t('verifiedTag', 'Verified')}
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}

              <View style={styles.heroActions}>
                <Pressable onPress={handleShare} style={styles.roundBtn}>
                  <Icon name="share" size={18} color={colors.onSurface} />
                </Pressable>
                <Pressable onPress={() => toggleFavorite(listing.id)} style={styles.roundBtn}>
                  <Icon
                    name="favorite"
                    size={20}
                    color={favorites[listing.id] ? colors.secondary : colors.onSurface}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.bottomOverlay}>
              {galleryImages.length > 0 ? (
                <View style={styles.counterPill}>
                  <Icon name="photo_camera" size={14} color="#ffffff" />
                  <Text style={styles.counterText}>
                    {activeSlide + 1} / {galleryImages.length}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              {galleryImages.length > 0 && (
                <Pressable onPress={() => setIsGalleryModalOpen(true)} style={styles.galleryBtn}>
                  <Icon name="photo_library" size={18} color={colors.onSecondaryContainer} />
                  <Text style={styles.galleryBtnText}>{t('gallery', 'Gallery')}</Text>
                </Pressable>
              )}
            </View>

            {galleryImages.length > 1 && (
              <>
                <Pressable onPress={() => goToSlide(activeSlide - 1)} style={[styles.chevron, { left: 8 }]}>
                  <Icon name="chevron_left" size={20} color="#ffffff" />
                </Pressable>
                <Pressable onPress={() => goToSlide(activeSlide + 1)} style={[styles.chevron, { right: 8 }]}>
                  <Icon name="chevron_right" size={20} color="#ffffff" />
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.body}>
            <View style={{ gap: 4 }}>
              <View style={styles.priceRow}>
                <View style={styles.priceLine}>
                  <Text style={styles.price}>{formatPrice(listing.price)}</Text>
                  <Text style={styles.currency}>{listing.currency}</Text>
                </View>
                <View style={styles.priceType}>
                  <Text style={styles.priceTypeText}>
                    {listing.priceType === 'rent' ? t('forRent', 'For Rent') : t('forSale', 'For Sale')}
                  </Text>
                </View>
              </View>

              <Text style={styles.title}>
                {language === 'so' && listing.titleSo ? listing.titleSo : listing.title}
              </Text>

              <View style={styles.locationRow}>
                <Icon name="pin_drop" size={18} color={colors.secondary} style={{ marginTop: 1 }} />
                <Text style={styles.locationText}>{listing.locationDetails}</Text>
              </View>
            </View>

            {isVerifiedListing && (
              <Pressable onPress={() => setIsDeedModalOpen(true)} style={styles.verifiedBanner}>
                <View style={styles.verifiedIcon}>
                  <Icon name="verified_user" size={24} color={colors.primaryFixed} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedKicker}>
                    {listing.verifiedLabel || t('verifiedListing', 'Verified Listing')}
                  </Text>
                  <Text style={styles.verifiedBody}>
                    {listing.category === 'car'
                      ? t('verifiedVehicleRecord', 'Vehicle registration record on file.')
                      : t('verifiedRegistryRecord', 'Registry record on file.')}
                    {listing.registryNumber ? (
                      <Text style={styles.verifiedStrong}> {listing.registryNumber}</Text>
                    ) : null}
                    {listing.verificationEvidence?.[0]?.issuerAuthority
                      ? ` • ${listing.verificationEvidence[0].issuerAuthority}`
                      : ''}
                  </Text>
                </View>
              </Pressable>
            )}

            {specItems.length > 0 && (
              <View style={styles.specsGrid}>
                {specItems.map((spec) => (
                  <View key={spec.label} style={styles.specCell}>
                    <Icon name={spec.icon} size={24} color={colors.primary} />
                    <Text style={styles.specValue} numberOfLines={1}>
                      {spec.value}
                    </Text>
                    <Text style={styles.specLabel} numberOfLines={1}>
                      {spec.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <View style={{ gap: 12 }}>
                <Text style={styles.cardTitle}>Property Overview (Faahfaahin)</Text>
                <Text style={styles.desc}>
                  {listing.description || t('noDescription', 'No description provided.')}
                </Text>

                {listing.amenities && listing.amenities.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={{ gap: 8 }}>
                      <Text style={styles.sectionLabel}>Key Amenities & Infrastructure:</Text>
                      <View style={styles.amenityGrid}>
                        {listing.amenities.map((item, idx) => (
                          <View key={`${item}-${idx}`} style={styles.amenity}>
                            <Icon name="check_circle" size={18} color={colors.primary} />
                            <Text style={styles.amenityText} numberOfLines={1}>
                              {item}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <View style={{ gap: 12 }}>
                <View style={styles.similarHeader}>
                  <Text style={styles.cardTitle}>Neighborhood & Proximity</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="lock" size={14} color={colors.secondary} />
                    <Text style={{ fontSize: 12, fontFamily: typography.semibold, color: colors.secondary }}>
                      Private
                    </Text>
                  </View>
                </View>

                <View style={styles.lockedPanel}>
                  <View style={styles.lockPin}>
                    <Icon name="location_on" size={28} color={colors.primary} />
                  </View>
                  <View style={styles.lockedPill}>
                    <Text style={styles.lockedPillText} numberOfLines={1}>
                      {listing.location ||
                        listing.locationDetails ||
                        t('locationUnavailable', 'Location not provided')}
                    </Text>
                  </View>
                  <Text style={styles.lockedSub}>
                    {t('exactCoordinatesHidden', 'Exact coordinates are not published publicly.')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={{ gap: 8 }}>
                <View style={styles.brokerTop}>
                  <Text style={styles.kicker}>{t('brokerRep', 'Listing Broker')}</Text>
                  {broker?.tier ? (
                    <View style={styles.tierPill}>
                      <Icon name="star" size={13} color={colors.onSecondaryFixedVariant} />
                      <Text style={styles.tierText}>{broker.tier}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.brokerRow}>
                  <Pressable
                    onPress={() => openBrokerProfile(listing.brokerId)}
                    style={{ position: 'relative' }}
                  >
                    {listing.brokerAvatar || broker?.avatar ? (
                      <Image
                        source={{ uri: listing.brokerAvatar || broker?.avatar }}
                        style={[styles.brokerAvatar, { borderWidth: 2, borderColor: colors.primaryFixed }]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.brokerAvatarFallback,
                          { borderWidth: 2, borderColor: colors.primaryFixed },
                        ]}
                      >
                        <Icon name="person" size={26} color={colors.outline} />
                      </View>
                    )}
                    {broker?.verificationStatus === 'approved' && (
                      <View style={styles.brokerBadge}>
                        <Icon name="verified" size={13} color={colors.onPrimary} />
                      </View>
                    )}
                  </Pressable>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Pressable onPress={() => openBrokerProfile(listing.brokerId)}>
                      <Text style={styles.brokerName} numberOfLines={1}>
                        {broker?.name || listing.brokerName}
                      </Text>
                    </Pressable>
                    {broker?.licenseNumber ? (
                      <Text style={styles.brokerMeta} numberOfLines={1}>
                        {t('license', 'License')} {broker.licenseNumber}
                      </Text>
                    ) : null}
                    {brokerRating > 0 || brokerDeals > 0 ? (
                      <View style={styles.brokerStats}>
                        {brokerRating > 0 && (
                          <Text style={styles.brokerStar}>★ {brokerRating}</Text>
                        )}
                        {brokerDeals > 0 && (
                          <Text style={styles.brokerDeals}>({brokerDeals} deals)</Text>
                        )}
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.brokerActions}>
                  <Pressable
                    onPress={() => openChatWithBroker(listing.brokerId, listing.id)}
                    style={styles.brokerActionBtn}
                  >
                    <Icon name="chat" size={18} color={colors.onSurface} />
                    <Text style={styles.brokerActionText}>{t('chatBroker', 'Dilaal Chat')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void startCall({
                        listingId: listing.id,
                        brokerId: listing.brokerId,
                        calleeUserId: broker?.ownerId,
                        kind: 'audio',
                        peerName: broker?.name || listing.brokerName,
                        peerAvatar: listing.brokerAvatar || broker?.avatar,
                      });
                    }}
                    disabled={Boolean(callSession)}
                    style={[styles.brokerActionBtn, Boolean(callSession) && { opacity: 0.4 }]}
                  >
                    <Icon name="call" size={18} color={colors.onSurface} />
                    <Text style={styles.brokerActionText}>{t('callBroker', 'Call Desk')}</Text>
                  </Pressable>
                </View>

                <View style={styles.evidenceRow}>
                  <Pressable onPress={() => setIsDeedModalOpen(true)} style={styles.evidenceBtn}>
                    <Icon name="verified" size={15} color={colors.primary} />
                    <Text style={styles.evidenceText}>
                      {t('viewRegistryRecord', 'View Registry Record')}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => setIsReportModalOpen(true)} style={styles.reportBtn}>
                    <Icon name="flag" size={15} color={colors.outline} />
                    <Text style={styles.reportText}>{t('reportListing', 'Report Concern')}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={styles.similarHeader}>
                <Text style={styles.cardTitle}>{t('nearYou', 'Similar Properties')}</Text>
                <Pressable onPress={() => setCurrentScreen(activeTab === 'search' ? 'search' : 'home')}>
                  <Text style={styles.seeAll}>{t('seeAll', 'View All')}</Text>
                </Pressable>
              </View>

              {similarListings.length === 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.onSurfaceVariant,
                    textAlign: 'center',
                    paddingVertical: 18,
                  }}
                >
                  {t('noSimilarListings', 'No other listings yet.')}
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.similarRow}
                >
                  {similarListings.map((sim) => (
                    <Pressable
                      key={sim.id}
                      onPress={() => openListingDetails(sim.id)}
                      style={styles.similarCard}
                    >
                      <View style={{ position: 'relative' }}>
                        {sim.image ? (
                          <Image source={{ uri: sim.image }} style={styles.similarImage} />
                        ) : (
                          <View style={styles.similarImageFallback}>
                            <Icon name="home_work" size={30} color={colors.outline} />
                          </View>
                        )}
                        {(sim.isVerified || sim.verificationStatus === 'approved') && (
                          <View style={styles.similarVerified}>
                            <Text style={styles.similarVerifiedText}>{t('verifiedTag', 'Verified')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.similarBody}>
                        <Text style={styles.similarPrice}>{formatPrice(sim.price)}</Text>
                        <Text style={styles.similarTitle} numberOfLines={1}>
                          {language === 'so' && sim.titleSo ? sim.titleSo : sim.title}
                        </Text>
                        <Text style={styles.similarLocation} numberOfLines={1}>
                          {sim.location}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.actionInner}>
          <Pressable
            onPress={() => {
              setOfferAmount(listing.price > 0 ? String(listing.price) : '');
              setIsOfferModalOpen(true);
            }}
            style={styles.offerBtn}
          >
            <Icon name="gavel" size={18} color={colors.onPrimary} />
            <Text style={styles.offerText}>{t('makeOffer', 'Make an Offer')}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={isOfferModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOfferModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={[styles.sheetOverlay, { justifyContent: 'flex-end' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsOfferModalOpen(false)} />
          <View style={[styles.offerSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{t('initiateOffer', 'Submit Escrow Offer')}</Text>
                <Text style={styles.sheetSub}>
                  {t('offerRecipientNote', 'Sent directly to the listing broker')}
                </Text>
              </View>
              <Pressable onPress={() => setIsOfferModalOpen(false)} style={styles.closeBtn}>
                <Icon name="close" size={18} color={colors.onSurface} />
              </Pressable>
            </View>

            <View>
              <Text style={styles.fieldLabel}>{t('offeredPrice', 'Your Offer Amount (USD)')}</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.dollar}>$</Text>
                <TextInput
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                  keyboardType="number-pad"
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={colors.outline}
                />
              </View>
              <Text style={styles.depositNote}>
                {t('depositRequired', '10% Escrow Down Payment')}:{' '}
                <Text style={styles.depositValue}>
                  ${Math.round((isOfferValid ? offerValue : 0) * 0.1).toLocaleString()} USD
                </Text>
              </Text>
            </View>

            <View style={styles.offerNotice}>
              <Icon name="verified_user" size={20} color={colors.primary} />
              <Text style={styles.offerNoticeText}>
                {t(
                  'offerSharedNotice',
                  'Your offer is shared with the broker. Escrow steps only begin once both parties confirm terms.'
                )}
              </Text>
            </View>

            <Pressable
              onPress={handleSubmitOffer}
              disabled={!isOfferValid}
              style={[
                styles.submitOffer,
                { backgroundColor: isOfferValid ? colors.primaryContainer : colors.surfaceContainerHighest },
              ]}
            >
              <Text
                style={[
                  styles.submitOfferText,
                  !isOfferValid && { color: colors.outline },
                ]}
              >
                {t('acceptOffer', 'Confirm & Notify Seller Dilaal')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isGalleryModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGalleryModalOpen(false)}
      >
        <View style={[styles.sheetOverlay, { alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
          <View style={styles.gallerySheet}>
            <View style={styles.galleryHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Icon name="photo_library" size={24} color={colors.secondary} />
                <Text style={styles.galleryTitle} numberOfLines={1}>
                  {t('gallery', 'Gallery')}: {listing.title}
                </Text>
              </View>
              <Pressable onPress={() => setIsGalleryModalOpen(false)} style={styles.closeBtn}>
                <Icon name="close" size={14} color={colors.outline} />
              </Pressable>
            </View>

            <View style={styles.galleryImageWrap}>
              {galleryImages.length > 0 && (
                <Image
                  source={{ uri: galleryImages[activeSlide] }}
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
              )}
              {galleryImages.length > 1 && (
                <>
                  <Pressable onPress={() => goToSlide(activeSlide - 1)} style={[styles.galleryNav, { left: 8 }]}>
                    <Icon name="chevron_left" size={20} color="#ffffff" />
                  </Pressable>
                  <Pressable onPress={() => goToSlide(activeSlide + 1)} style={[styles.galleryNav, { right: 8 }]}>
                    <Icon name="chevron_right" size={20} color="#ffffff" />
                  </Pressable>
                </>
              )}
              <View style={styles.galleryCounter}>
                <Text style={styles.galleryCounterText}>
                  {activeSlide + 1} / {galleryImages.length}
                </Text>
              </View>
            </View>

            <Pressable onPress={() => setIsGalleryModalOpen(false)} style={styles.galleryClose}>
              <Text style={styles.galleryCloseText}>{t('close', 'Close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {isDeedModalOpen && (
        <DeedModal
          registryNumber={listing.registryNumber}
          propertyTitle={listing.title}
          evidence={listing.verificationEvidence}
          issuingAuthority={listing.verificationEvidence?.[0]?.issuerAuthority}
          verificationStatus={listing.verificationStatus}
          isVerified={listing.isVerified}
          onClose={() => setIsDeedModalOpen(false)}
        />
      )}

      {isReportModalOpen && (
        <ReportModal
          targetType="listing"
          targetId={listing.id}
          targetTitle={listing.title}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {showToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};
