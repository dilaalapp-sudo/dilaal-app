import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { listingSpecChips } from '../lib/listingSpecs';
import { MatchmakerModal } from '../components/MatchmakerModal';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';
import { SpecChips } from '../components/SpecChips';
import { useColors, typography, shadow } from '../theme';

export const HomeScreen: React.FC = () => {
  const {
    listings,
    categories,
    openListingDetails,
    formatPrice,
    favorites,
    toggleFavorite,
    setActiveTab,
    setCurrentScreen,
    setSearchFilter,
    language,
    t,
  } = useApp();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width >= 600 ? 24 : 14;
  const featuredCardWidth = Math.round(Math.min(Math.max(width * 0.72, 260), 330));

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState(false);

  const accentOf = (cls: string) => (cls.includes('secondary') ? colors.secondary : colors.primary);

  const handleSearchSubmit = () => {
    setSearchFilter((prev) => ({ ...prev, query: searchQuery }));
    setActiveTab('search');
    setCurrentScreen('search');
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
    setSearchFilter((prev) => ({ ...prev, category: slug }));
  };

  const filteredFeatured = listings.filter((l) => {
    if (!selectedCategory) return true;
    return l.category === selectedCategory;
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search & Filter Bar */}
        <View style={[styles.searchSection, { paddingHorizontal: gutter }]}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
            ]}
          >
            <Icon name="search" size={20} color={colors.outline} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              placeholder={t('searchPlaceholderHome', 'Search houses, land, vehicles in Mogadishu...')}
              placeholderTextColor={colors.outline}
              style={[styles.searchInput, { color: colors.onSurface }]}
            />
            <Pressable
              onPress={() => {
                setActiveTab('search');
                setCurrentScreen('search');
              }}
              style={[styles.filterBtn, { backgroundColor: colors.primaryContainer }]}
            >
              <Icon name="tune" size={19} color={colors.secondaryFixed} />
            </Pressable>
          </View>
        </View>

        {/* Category chips */}
        <View style={styles.chipsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipsRow, { paddingHorizontal: gutter }]}>
            <Pressable
              onPress={() => handleCategoryClick('')}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedCategory === '' ? colors.primaryContainer : colors.surfaceContainerLowest,
                },
              ]}
            >
              <Icon
                name="grid_view"
                size={17}
                color={selectedCategory === '' ? colors.onPrimary : colors.primary}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: selectedCategory === '' ? colors.onPrimary : colors.onSurfaceVariant },
                ]}
              >
                {t('allCategories', 'All Assets')}
              </Text>
            </Pressable>

            {categories.map((category) => {
              const presentation = categoryPresentation(category);
              const isActive = selectedCategory === category.slug;
              const label = presentation.translationKey
                ? t(presentation.translationKey, category.name)
                : category.name;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => handleCategoryClick(category.slug)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primaryContainer : colors.surfaceContainerLowest,
                    },
                  ]}
                >
                  <Icon
                    name={presentation.icon}
                    size={17}
                    color={isActive ? colors.onPrimary : accentOf(presentation.color)}
                  />
                  <Text style={[styles.chipText, { color: isActive ? colors.onPrimary : colors.onSurfaceVariant }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Featured carousel */}
        <View style={styles.featuredSection}>
          <SectionHeader
            title={t('featuredListings', 'Featured Listings')}
            subtitle={t('featuredSubLive', 'Latest listings published to the marketplace')}
            action={
              <Pressable
                onPress={() => {
                  setActiveTab('search');
                  setCurrentScreen('search');
                }}
                style={styles.seeAll}
              >
                <Text style={[styles.seeAllText, { color: colors.secondary }]}>{t('seeAll', 'See all')}</Text>
                <Icon name="chevron_right" size={16} color={colors.secondary} />
              </Pressable>
            }
          />

          {filteredFeatured.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.featuredRow, { paddingHorizontal: gutter }]}
              decelerationRate="fast"
            >
              {filteredFeatured.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openListingDetails(item.id)}
                  style={[
                    styles.featuredCard,
                    { width: featuredCardWidth },
                    { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
                    shadow.card,
                  ]}
                >
                  <View style={[styles.featuredImageWrap, { backgroundColor: colors.surfaceContainer }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.featuredImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.imageFallback}>
                        <Icon name="home_work" size={36} color={colors.outline} />
                      </View>
                    )}
                    <LinearGradient
                      colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,53,39,0.75)']}
                      locations={[0, 0.4, 1]}
                      style={StyleSheet.absoluteFillObject}
                      pointerEvents="none"
                    />

                    {item.isVerified && (
                      <View style={[styles.verifiedPill, { backgroundColor: colors.primaryContainer }]}>
                        <Icon
                          name={item.category === 'land' ? 'gavel' : 'verified'}
                          size={14}
                          color={colors.secondaryFixed}
                        />
                        <Text style={[styles.verifiedText, { color: colors.onPrimary }]} numberOfLines={1}>
                          {item.verifiedLabel || t('verifiedTag', 'Verified')}
                        </Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => toggleFavorite(item.id)}
                      style={[styles.favBtn, { backgroundColor: colors.surfaceContainerLowest + 'E6' }]}
                    >
                      <Icon
                        name="favorite"
                        size={18}
                        color={favorites[item.id] ? colors.error : colors.outline}
                      />
                    </Pressable>

                    <View style={styles.priceOverlay} pointerEvents="none">
                      <Text style={styles.priceLabel} numberOfLines={1}>
                        {item.category === 'land'
                          ? t('totalInvestment', 'Total Investment')
                          : t('askingPrice', 'Asking Price')}
                      </Text>
                      <Text style={styles.priceValue} numberOfLines={1}>
                        {formatPrice(item.price)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.featuredBody}>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={1}>
                        {language === 'so' && item.titleSo ? item.titleSo : item.title}
                      </Text>
                      <View style={styles.locationRow}>
                        <Icon name="near_me" size={15} color={colors.primary} />
                        <Text style={[styles.locationText, { color: colors.outline }]} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    </View>

                    <SpecChips chips={listingSpecChips(item, t, 'featured')} />

                    <View style={[styles.cardFooter, { borderTopColor: colors.surfaceContainer }]}>
                      <View style={styles.registryRow}>
                        <View style={[styles.registryDot, { backgroundColor: colors.secondary }]} />
                        <Text style={[styles.registry, { color: colors.onSurface }]} numberOfLines={1}>
                          {item.registryNumber}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => openListingDetails(item.id)}
                        style={[styles.smallPrimary, { backgroundColor: colors.primaryContainer }]}
                      >
                        <Text style={[styles.smallPrimaryText, { color: colors.onPrimary }]}>
                          {item.category === 'land'
                            ? t('viewMapAction', 'View Map')
                            : item.category === 'car'
                              ? t('bookTestAction', 'Book Test')
                              : t('inspect', 'Inspect')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { marginHorizontal: gutter, backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '4D' },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainer }]}>
                <Icon name="home_work" size={26} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                {t('noListingsYet', 'No Listings Available Yet')}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.onSurfaceVariant }]}>
                {t(
                  'noListingsSub',
                  'New verified properties appear here as soon as brokers post them.'
                )}
              </Text>
              <Pressable
                onPress={() => {
                  setActiveTab('post');
                  setCurrentScreen('post');
                }}
                style={[styles.emptyBtn, { backgroundColor: colors.primaryContainer }]}
              >
                <Icon name="add_circle" size={16} color={colors.onPrimary} />
                <Text style={[styles.emptyBtnText, { color: colors.onPrimary }]}>
                  {t('postFirstListing', 'Post First Listing')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Matchmaker banner */}
        <View style={[styles.matchSection, { paddingHorizontal: gutter }]}>
          <LinearGradient
            colors={['#003527', '#064e3b', '#003625']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.matchBanner}
          >
            <View style={styles.matchTextCol}>
              <View style={styles.matchTagRow}>
                <Icon name="handshake" size={17} color={colors.secondaryFixed} />
                <Text style={[styles.matchTag, { color: colors.secondaryFixed }]}>
                  {t('brokerMatchmaker', 'Broker Matchmaker')}
                </Text>
              </View>
              <Text style={styles.matchTitle}>{t('findBroker', 'Find a Dilaal')}</Text>
              <Text style={styles.matchSub} numberOfLines={1}>
                {t('findBrokerSub', 'Answer a few questions to get matched with registered brokers.')}
              </Text>
            </View>
            <Pressable
              onPress={() => setIsMatchmakerOpen(true)}
              style={[styles.matchBtn, { backgroundColor: colors.secondaryContainer }]}
            >
              <Text style={[styles.matchBtnText, { color: colors.onSecondary }]}>
                {t('findNow', 'Find Now')}
              </Text>
              <Icon name="arrow_forward" size={16} color={colors.onSecondary} />
            </Pressable>
          </LinearGradient>
        </View>

        {/* Near You */}
        <View style={[styles.nearSection, { paddingHorizontal: gutter }]}>
          <SectionHeader
            title={t('nearYou', 'Near You')}
            subtitle={t('nearYouSubLive', 'Latest listings added to the marketplace')}
            accent={colors.primaryFixedDim}
            action={
              <Pressable
                onPress={() => {
                  setActiveTab('search');
                  setCurrentScreen('search');
                }}
                style={styles.seeAll}
              >
                <Icon name="tune" size={16} color={colors.primary} />
                <Text style={[styles.distanceText, { color: colors.primary }]}>
                  {t('distance', 'Distance')}
                </Text>
              </Pressable>
            }
          />

          <View style={styles.nearList}>
            {listings.length > 0 ? (
              listings.slice(0, 5).map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openListingDetails(item.id)}
                  style={[
                    styles.nearCard,
                    { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
                    shadow.card,
                  ]}
                >
                  <View style={[styles.nearImageWrap, { backgroundColor: colors.surfaceContainer }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.nearImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.imageFallback}>
                        <Icon name="home_work" size={36} color={colors.outline} />
                      </View>
                    )}
                    {item.isVerified && (
                      <View style={[styles.nearVerified, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={styles.nearVerifiedText} numberOfLines={1}>
                          {item.verifiedLabel || t('verifiedTag', 'Verified')}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => toggleFavorite(item.id)}
                      style={[styles.nearFav, { backgroundColor: colors.surfaceContainerLowest + 'CC' }]}
                    >
                      <Icon
                        name="favorite"
                        size={16}
                        color={favorites[item.id] ? colors.error : colors.outline}
                      />
                    </Pressable>
                  </View>

                  <View style={styles.nearBody}>
                    <View>
                      <View style={styles.nearTitleRow}>
                        <Text style={[styles.nearTitle, { color: colors.onSurface }]} numberOfLines={2}>
                          {language === 'so' && item.titleSo ? item.titleSo : item.title}
                        </Text>
                        <View style={styles.nearPriceCol}>
                          <Text style={[styles.nearPrice, { color: colors.primary }]} numberOfLines={1}>
                            {formatPrice(item.price)}
                          </Text>
                          <Text style={[styles.nearPriceType, { color: colors.outline }]}>
                            {item.priceType === 'rent' ? t('month', '/month') : t('fixed', 'Fixed')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.locationRow}>
                        <Icon name="location_on" size={16} color={colors.secondary} />
                        <Text style={[styles.nearLocation, { color: colors.outline }]} numberOfLines={1}>
                          {item.location}
                        </Text>
                      </View>
                    </View>

                    <SpecChips chips={listingSpecChips(item, t, 'compact')} />

                    <View style={[styles.cardFooter, { borderTopColor: colors.surfaceContainer }]}>
                      <View style={styles.registryRow}>
                        {!!item.registryNumber && (
                          <>
                            <View style={[styles.tagIcon, { backgroundColor: colors.secondaryFixed }]}>
                              <Icon name="tag" size={12} color={colors.onSecondaryFixed} />
                            </View>
                            <Text style={[styles.nearRegistry, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                              {item.registryNumber}
                            </Text>
                          </>
                        )}
                      </View>
                      <Pressable
                        onPress={() => openListingDetails(item.id)}
                        style={[styles.smallPrimary, { backgroundColor: colors.primaryContainer }]}
                      >
                        <Text style={[styles.smallPrimaryText, { color: colors.onPrimary }]}>
                          {t('view', 'View')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <View
                style={[
                  styles.nearEmpty,
                  { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '4D' },
                ]}
              >
                <Icon name="location_searching" size={24} color={colors.outline} />
                <Text style={[styles.nearEmptyTitle, { color: colors.onSurface }]}>
                  {t('noNearbyListings', 'No Nearby Listings Registered')}
                </Text>
                <Text style={[styles.nearEmptyDesc, { color: colors.onSurfaceVariant }]}>
                  {t(
                    'noNearbySub',
                    'New properties submitted with GPS boundary coordinates will automatically appear here once approved.'
                  )}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {isMatchmakerOpen && <MatchmakerModal onClose={() => setIsMatchmakerOpen(false)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 120 },
  searchSection: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    ...shadow.card,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: typography.sans, paddingVertical: 0 },
  filterBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipsSection: { paddingVertical: 8 },
  chipsRow: { paddingHorizontal: 14, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    ...shadow.card,
  },
  chipText: { fontSize: 12, fontFamily: typography.semibold },
  featuredSection: { paddingTop: 12, paddingBottom: 8, gap: 10 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontSize: 12, fontFamily: typography.bold },
  distanceText: { fontSize: 12, fontFamily: typography.bold },
  featuredRow: { paddingHorizontal: 14, gap: 12, paddingVertical: 8 },
  featuredCard: { width: 278, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  featuredImageWrap: { height: 176, width: '100%' },
  featuredImage: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  verifiedPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: '70%',
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  priceOverlay: { position: 'absolute', left: 12, right: 12, bottom: 10 },
  priceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  priceValue: { fontSize: 17, fontFamily: typography.bold, color: '#ffffff', letterSpacing: -0.3 },
  featuredBody: { padding: 14, gap: 10 },
  cardTitle: { fontSize: 14, fontFamily: typography.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 12, flexShrink: 1 },
  cardFooter: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  registryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  registryDot: { width: 8, height: 8, borderRadius: 4 },
  registry: { fontSize: 12, fontFamily: typography.bold },
  smallPrimary: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  smallPrimaryText: { fontSize: 12, fontFamily: typography.bold },
  emptyCard: {
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 13, fontFamily: typography.bold },
  emptyDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16, maxWidth: 320 },
  emptyBtn: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyBtnText: { fontSize: 12, fontFamily: typography.bold },
  matchSection: { paddingHorizontal: 14, paddingVertical: 10 },
  matchBanner: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    overflow: 'hidden',
    ...shadow.card,
  },
  matchTextCol: { flex: 1, gap: 3 },
  matchTagRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  matchTag: {
    fontSize: 10,
    fontFamily: typography.bold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  matchTitle: { fontSize: 15, fontFamily: typography.bold, color: '#ffffff' },
  matchSub: { fontSize: 11, color: '#dae2fd' },
  matchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    ...shadow.card,
  },
  matchBtnText: { fontSize: 12, fontFamily: typography.bold },
  nearSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24, gap: 12 },
  nearList: { gap: 12 },
  nearCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  nearImageWrap: { height: 170, width: '100%' },
  nearImage: { width: '100%', height: '100%' },
  nearVerified: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '70%',
  },
  nearVerifiedText: { fontSize: 11, fontFamily: typography.semibold, color: '#ffffff' },
  nearFav: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearBody: { padding: 14, gap: 8 },
  nearTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  nearTitle: { fontSize: 14, fontFamily: typography.bold, lineHeight: 19, flex: 1 },
  nearPriceCol: { alignItems: 'flex-end' },
  nearPrice: { fontSize: 16, fontFamily: typography.bold },
  nearPriceType: { fontSize: 10 },
  nearLocation: { fontSize: 12, flexShrink: 1 },
  tagIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  nearRegistry: { fontSize: 12, fontFamily: typography.medium, flexShrink: 1 },
  nearEmpty: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 8,
  },
  nearEmptyTitle: { fontSize: 12, fontFamily: typography.semibold },
  nearEmptyDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16, maxWidth: 300 },
});
