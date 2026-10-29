import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, UrlTile, Region } from '../components/MapView';
import Slider from '@react-native-community/slider';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { SUPPORTED_COUNTRIES } from '../data/countries';
import { CITY_COORDINATES } from '../data/cityCoordinates';
import { Icon } from '../components/Icon';
import { SpecChips } from '../components/SpecChips';
import { listingSpecChips } from '../lib/listingSpecs';
import { useColors, typography, shadow } from '../theme';

const MOGADISHU: Region = { latitude: 2.0469, longitude: 45.3182, latitudeDelta: 0.35, longitudeDelta: 0.35 };

const COUNTRY_OPTIONS = [
  { code: 'all', label: 'Global (All)' },
  { code: 'SO', label: '🇸🇴 Somalia' },
  { code: 'KE', label: '🇰🇪 Kenya' },
  { code: 'AE', label: '🇦🇪 UAE' },
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'TR', label: '🇹🇷 Turkey' },
  { code: 'US', label: '🇺🇸 USA' },
];

type SortBy = 'featured' | 'price-asc' | 'price-desc' | 'verified';

export const SearchScreen: React.FC = () => {
  const {
    listings,
    categories,
    openListingDetails,
    openChatWithBroker,
    formatPrice,
    searchFilter,
    setSearchFilter,
    resetSearchFilter,
    favorites,
    toggleFavorite,
    saveCurrentSearch,
    hasMoreListings,
    loadingMoreListings,
    loadMoreListings,
    language,
    t,
  } = useApp();
  const colors = useColors();
  const mapRef = useRef<MapView | null>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isSatellite, setIsSatellite] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(listings[0]?.id || null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [mapToast, setMapToast] = useState<string | null>(null);

  const flashToast = (message: string, ms = 2000) => {
    setMapToast(message);
    setTimeout(() => setMapToast(null), ms);
  };

  const allCities = useMemo(() => {
    const names = (Object.keys(SUPPORTED_COUNTRIES) as (keyof typeof SUPPORTED_COUNTRIES)[]).flatMap(
      (code) => SUPPORTED_COUNTRIES[code].cities || []
    );
    return Array.from(new Set(names)).map((cityName) => ({
      id: cityName.toLowerCase(),
      label: cityName,
    }));
  }, []);

  const availableCities =
    selectedCountryCode === 'all'
      ? [{ id: 'all', label: t('allCities', 'All Cities') }, ...allCities]
      : [
          { id: 'all', label: t('allCities', 'All Cities') },
          ...(
            SUPPORTED_COUNTRIES[selectedCountryCode as keyof typeof SUPPORTED_COUNTRIES]?.cities || []
          ).map((cityName) => ({ id: cityName.toLowerCase(), label: cityName })),
        ];

  useEffect(() => {
    if (selectedCity === 'all') return;
    const coords = CITY_COORDINATES[selectedCity];
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords[0], longitude: coords[1], latitudeDelta: 0.12, longitudeDelta: 0.12 },
      450
    );
  }, [selectedCity]);

  const filteredListings = listings.filter((l) => {
    if (selectedCountryCode !== 'all' && l.countryCode !== selectedCountryCode) return false;

    if (selectedCity !== 'all') {
      if (!l.location.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    }

    if (searchFilter.query) {
      const q = searchFilter.query.toLowerCase().trim();
      const match =
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (searchFilter.category !== 'all' && l.category !== searchFilter.category) return false;

    if (searchFilter.bedrooms !== 'Any') {
      const targetBeds = parseInt(searchFilter.bedrooms, 10);
      if (searchFilter.bedrooms === '4+') {
        if (!l.beds || l.beds < 4) return false;
      } else if (l.beds !== targetBeds) {
        return false;
      }
    }

    if (searchFilter.deedVerified && !l.isVerified) return false;
    if (l.price < searchFilter.minPrice || l.price > searchFilter.maxPrice) return false;

    return true;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'verified') return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    return 0;
  });

  const mappableListings = useMemo(
    () =>
      filteredListings
        .filter(
          (item) =>
            Number.isFinite(item.lat) && Number.isFinite(item.lng) && !(item.lat === 0 && item.lng === 0)
        )
        .slice(0, 8),
    [filteredListings]
  );

  const mapPins = useMemo(
    () =>
      mappableListings.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        priceLabel: formatPrice(item.price, true),
      })),
    [mappableListings, formatPrice]
  );

  const activePinListing =
    selectedPinId && mapPins.some((pin) => pin.id === selectedPinId)
      ? listings.find((l) => l.id === selectedPinId) || null
      : null;

  const handleNextPin = () => {
    if (mapPins.length === 0) return;
    const currentIdx = mapPins.findIndex((p) => p.id === selectedPinId);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % mapPins.length;
    setSelectedPinId(mapPins[nextIdx].id);
  };

  const handlePrevPin = () => {
    if (mapPins.length === 0) return;
    const currentIdx = mapPins.findIndex((p) => p.id === selectedPinId);
    const prevIdx =
      currentIdx === -1 ? mapPins.length - 1 : (currentIdx - 1 + mapPins.length) % mapPins.length;
    setSelectedPinId(mapPins[prevIdx].id);
  };

  const activeFiltersCount =
    (searchFilter.category !== 'all' ? 1 : 0) +
    (selectedCity !== 'all' ? 1 : 0) +
    (searchFilter.bedrooms !== 'Any' ? 1 : 0) +
    (searchFilter.deedVerified ? 1 : 0) +
    (Number.isFinite(searchFilter.maxPrice) ? 1 : 0) +
    (searchFilter.query.trim().length > 0 ? 1 : 0);

  const handleRecenter = () => {
    if (mappableListings.length > 1) {
      mapRef.current?.fitToCoordinates(
        mappableListings.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
      );
    } else if (mappableListings.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: mappableListings[0].lat,
          longitude: mappableListings[0].lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        400
      );
    } else {
      mapRef.current?.animateToRegion(MOGADISHU, 400);
    }

    const firstPin = mappableListings[0];
    if (firstPin) {
      setSelectedPinId(firstPin.id);
      flashToast(`Centered on ${firstPin.location.split(',')[0]}`);
    } else {
      flashToast(t('noMapPins', 'No listings with map coordinates match your filters'), 2500);
    }
  };

  const zoomBy = async (factor: number) => {
    const camera = await mapRef.current?.getCamera();
    if (!camera) return;
    mapRef.current?.animateCamera(
      { ...camera, zoom: Math.max(2, Math.min(19, (camera.zoom || 12) + factor)) },
      { duration: 200 }
    );
  };

  const sortLabel =
    sortBy === 'price-asc'
      ? t('priceLowHigh', 'Price: Low to High')
      : sortBy === 'price-desc'
        ? t('priceHighLow', 'Price: High to Low')
        : sortBy === 'verified'
          ? t('deedVerifiedOnly', 'Deed Verified')
          : t('featured', 'Featured');

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      {/* Header controls */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant + '26' },
        ]}
      >
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '40' },
            ]}
          >
            <Icon name="search" size={20} color={colors.primary} />
            <TextInput
              value={searchFilter.query}
              onChangeText={(value) => setSearchFilter((prev) => ({ ...prev, query: value }))}
              placeholder={t('searchPlaceholder', 'Search houses, land, vehicles, Toyota Land Cruiser...')}
              placeholderTextColor={colors.outline}
              style={[styles.searchInput, { color: colors.onSurface }]}
            />
            {!!searchFilter.query && (
              <Pressable
                onPress={() => setSearchFilter((prev) => ({ ...prev, query: '' }))}
                style={[styles.clearBtn, { backgroundColor: colors.surfaceContainer }]}
              >
                <Icon name="close" size={13} color={colors.onSurfaceVariant} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFiltersCount > 0 ? colors.primary : colors.surfaceContainerLowest,
                borderColor: activeFiltersCount > 0 ? colors.primary : colors.outlineVariant + '40',
              },
            ]}
          >
            <Icon name="tune" size={18} color={activeFiltersCount > 0 ? colors.onPrimary : colors.onSurface} />
            {activeFiltersCount > 0 && (
              <View style={[styles.filterCount, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.filterCountText, { color: colors.onSecondary }]}>{activeFiltersCount}</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              saveCurrentSearch(searchFilter.query ? `Search: ${searchFilter.query}` : 'Custom Filter Alert');
              flashToast('Search saved to alerts');
            }}
            style={[
              styles.saveBtn,
              { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '40' },
            ]}
          >
            <Icon name="bookmark_add" size={17} color={colors.primary} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {[
            { id: 'all', label: t('allCategories', 'All Assets'), icon: 'apps' },
            ...categories.map((category) => {
              const presentation = categoryPresentation(category);
              return {
                id: category.slug,
                label: presentation.translationKey
                  ? t(presentation.translationKey, category.name)
                  : category.name,
                icon: presentation.icon,
              };
            }),
          ].map((cat) => {
            const active = searchFilter.category === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSearchFilter((prev) => ({ ...prev, category: cat.id }))}
                style={[styles.catPill, { backgroundColor: active ? colors.primary : colors.surfaceContainer }]}
              >
                <Icon name={cat.icon} size={14} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={[styles.catPillText, { color: active ? colors.onPrimary : colors.onSurfaceVariant }]}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRowTight}>
          {COUNTRY_OPTIONS.map((countryItem) => {
            const active = selectedCountryCode === countryItem.code;
            return (
              <Pressable
                key={countryItem.code}
                onPress={() => {
                  setSelectedCountryCode(countryItem.code);
                  setSelectedCity('all');
                }}
                style={[styles.countryPill, { backgroundColor: active ? colors.secondary : colors.surfaceContainer }]}
              >
                <Text style={[styles.countryText, { color: active ? colors.onSecondary : colors.onSurfaceVariant }]}>
                  {countryItem.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRowTight}>
          {availableCities.map((city) => {
            const active = selectedCity === city.id;
            return (
              <Pressable
                key={city.id}
                onPress={() => {
                  setSelectedCity(city.id);
                  setSelectedPinId(null);
                }}
                style={[
                  styles.cityPill,
                  {
                    backgroundColor: active ? colors.surfaceContainerHighest : colors.surfaceContainerLowest,
                    borderColor: active ? colors.primary + '4D' : colors.outlineVariant + '26',
                  },
                ]}
              >
                <Text style={[styles.cityText, { color: active ? colors.primary : colors.onSurfaceVariant }]}>
                  {city.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {viewMode === 'map' ? (
        <View style={[styles.mapWrap, { backgroundColor: colors.surfaceContainerLow }]}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={MOGADISHU}
            mapType={Platform.OS === 'android' ? 'none' : 'standard'}
            toolbarEnabled={false}
            showsCompass={false}
            rotateEnabled={false}
          >
            <UrlTile
              urlTemplate={
                isSatellite
                  ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              }
              maximumZ={19}
              flipY={false}
            />
            {mapPins.map((pin) => {
              const selected = pin.id === selectedPinId;
              return (
                <Marker
                  key={pin.id}
                  coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                  onPress={() => setSelectedPinId(pin.id)}
                  tracksViewChanges={false}
                >
                  <View
                    style={[
                      styles.pin,
                      {
                        backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
                        borderColor: selected ? colors.primary : colors.primaryContainer + '40',
                      },
                      shadow.card,
                    ]}
                  >
                    <Text style={[styles.pinText, { color: selected ? colors.onPrimary : colors.primary }]}>
                      {pin.priceLabel}
                    </Text>
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Floating map controls */}
          <View style={styles.mapControls}>
            <Pressable
              onPress={handleRecenter}
              style={[
                styles.mapBtn,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
              ]}
            >
              <Icon name="my_location" size={20} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setIsSatellite(!isSatellite)}
              style={[
                styles.mapBtn,
                {
                  backgroundColor: isSatellite ? colors.primary : colors.surfaceContainerLowest,
                  borderColor: colors.outlineVariant + '33',
                },
              ]}
            >
              <Icon name="layers" size={20} color={isSatellite ? colors.onPrimary : colors.primary} />
            </Pressable>
            <View
              style={[
                styles.zoomBox,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
              ]}
            >
              <Pressable
                onPress={() => zoomBy(1)}
                style={[styles.zoomBtn, { borderBottomColor: colors.outlineVariant + '26' }]}
              >
                <Icon name="add" size={18} color={colors.onSurface} />
              </Pressable>
              <Pressable onPress={() => zoomBy(-1)} style={styles.zoomBtn}>
                <Icon name="remove" size={18} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>

          {mapPins.length === 0 && (
            <View style={styles.mapEmpty} pointerEvents="box-none">
              <View
                style={[
                  styles.mapEmptyCard,
                  { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '4D' },
                ]}
              >
                <View style={[styles.mapEmptyIcon, { backgroundColor: colors.primary + '1A' }]}>
                  <Icon name="location_off" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.mapEmptyTitle, { color: colors.onSurface }]}>
                  {t('noMapListings', 'No Properties Found on Map')}
                </Text>
                <Text style={[styles.mapEmptySub, { color: colors.onSurfaceVariant }]}>
                  {t(
                    'noMapListingsSub',
                    'Listings with saved coordinates will appear here once they match your filters.'
                  )}
                </Text>
                <Pressable
                  onPress={() => setViewMode('list')}
                  style={[styles.mapEmptyBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.mapEmptyBtnText, { color: colors.onPrimary }]}>
                    {t('viewList', 'View Listings')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {activePinListing && (
            <View
              style={[
                styles.preview,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '4D' },
                shadow.floating,
              ]}
            >
              <Pressable style={styles.previewTop} onPress={() => openListingDetails(activePinListing.id)}>
                <View style={[styles.previewImageWrap, { backgroundColor: colors.surfaceContainer }]}>
                  {activePinListing.image ? (
                    <Image source={{ uri: activePinListing.image }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.center}>
                      <Icon name="home_work" size={28} color={colors.outline} />
                    </View>
                  )}
                  {activePinListing.isVerified && (
                    <View style={[styles.previewVerified, { backgroundColor: colors.primary + 'E6' }]}>
                      <Icon name="verified" size={10} color={colors.onPrimary} />
                      <Text
                        style={[styles.previewVerifiedText, { color: colors.onPrimary }]}
                        numberOfLines={1}
                      >
                        {activePinListing.verifiedLabel || t('verifiedTag', 'Verified')}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.previewInfo}>
                  <View style={styles.previewLocationRow}>
                    <Text style={[styles.previewLocation, { color: colors.secondary }]} numberOfLines={1}>
                      {activePinListing.location.split(',')[0]}
                    </Text>
                    <Pressable onPress={() => setSelectedPinId(null)} style={styles.previewClose}>
                      <Icon name="close" size={15} color={colors.outline} />
                    </Pressable>
                  </View>
                  <Text style={[styles.previewTitle, { color: colors.onSurface }]} numberOfLines={1}>
                    {language === 'so' && activePinListing.titleSo
                      ? activePinListing.titleSo
                      : activePinListing.title}
                  </Text>
                  {(activePinListing.beds || activePinListing.area) && (
                    <Text style={[styles.previewMeta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                      {[
                        activePinListing.beds ? `${activePinListing.beds} ${t('beds', 'Bed')}` : null,
                        activePinListing.area,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </Text>
                  )}
                  <View style={[styles.previewPriceRow, { borderTopColor: colors.outlineVariant + '26' }]}>
                    <Text style={[styles.previewPrice, { color: colors.primary }]} numberOfLines={1}>
                      {formatPrice(activePinListing.price)}
                    </Text>
                    <View style={styles.inspectRow}>
                      <Text style={[styles.inspectLink, { color: colors.primary }]}>
                        {t('inspect', 'Inspect Details')}
                      </Text>
                      <Icon name="arrow_forward" size={14} color={colors.primary} />
                    </View>
                  </View>
                </View>
              </Pressable>

              <View style={[styles.previewFooter, { borderTopColor: colors.outlineVariant + '26' }]}>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={handlePrevPin}
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceContainer }]}
                  >
                    <Icon name="chevron_left" size={14} color={colors.onSurface} />
                    <Text style={[styles.stepText, { color: colors.onSurface }]}>{t('back', 'Prev')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleNextPin}
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceContainer }]}
                  >
                    <Text style={[styles.stepText, { color: colors.onSurface }]}>{t('seeAll', 'Next')}</Text>
                    <Icon name="chevron_right" size={14} color={colors.onSurface} />
                  </Pressable>
                </View>

                <Pressable onPress={() => toggleFavorite(activePinListing.id)} style={styles.saveFav}>
                  <Icon
                    name="favorite"
                    size={16}
                    color={favorites[activePinListing.id] ? colors.error : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.stepText, { color: colors.onSurfaceVariant }]}>
                    {favorites[activePinListing.id] ? t('verifiedTag', 'Saved') : t('saveSearch', 'Save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.listHeader}>
            <Text style={[styles.listCount, { color: colors.onSurface }]}>
              {sortedListings.length} {t('featuredListings', 'properties')}
            </Text>
            <Pressable
              onPress={() => setIsSortOpen(true)}
              style={[
                styles.sortBtn,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '40' },
              ]}
            >
              <Text style={[styles.sortText, { color: colors.onSurface }]} numberOfLines={1}>
                {sortLabel}
              </Text>
              <Icon name="expand_more" size={16} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {sortedListings.length > 0 ? (
            <View style={{ gap: 14 }}>
              {sortedListings.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openListingDetails(item.id)}
                  style={[
                    styles.card,
                    { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '40' },
                    shadow.card,
                  ]}
                >
                  <View style={[styles.cardImageWrap, { backgroundColor: colors.surfaceContainer }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.cardImage} />
                    ) : (
                      <View style={styles.center}>
                        <Icon name="home_work" size={40} color={colors.outline} />
                      </View>
                    )}
                    {item.isVerified && (
                      <View style={[styles.cardVerified, { backgroundColor: colors.primary + 'E6' }]}>
                        <Icon name="verified" size={13} color={colors.onPrimary} />
                        <Text style={[styles.cardVerifiedText, { color: colors.onPrimary }]} numberOfLines={1}>
                          {item.verifiedLabel || t('verifiedTag', 'Verified')}
                        </Text>
                      </View>
                    )}
                    <Pressable onPress={() => toggleFavorite(item.id)} style={styles.cardFav}>
                      <Icon name="favorite" size={18} color={favorites[item.id] ? colors.error : '#ffffff'} />
                    </Pressable>
                    <View style={styles.cardLocationRibbon}>
                      <Text style={styles.cardLocationText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View>
                      <View style={styles.cardPriceRow}>
                        <Text style={[styles.cardPrice, { color: colors.primary }]} numberOfLines={1}>
                          {formatPrice(item.price)}
                        </Text>
                        <View style={[styles.priceTypePill, { backgroundColor: colors.secondary + '26' }]}>
                          <Text style={[styles.priceTypeText, { color: colors.secondary }]}>
                            {item.priceType === 'rent' ? t('month', '/ month') : t('fixed', 'Fixed Price')}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={1}>
                        {language === 'so' && item.titleSo ? item.titleSo : item.title}
                      </Text>
                      <View style={{ marginTop: 6 }}>
                        <SpecChips chips={listingSpecChips(item, t, 'compact')} />
                      </View>
                    </View>

                    <View style={[styles.cardFooter, { borderTopColor: colors.outlineVariant + '26' }]}>
                      <View style={styles.brokerMini}>
                        {item.brokerAvatar ? (
                          <Image source={{ uri: item.brokerAvatar }} style={styles.brokerMiniAvatar} />
                        ) : (
                          <View
                            style={[
                              styles.brokerMiniAvatar,
                              styles.center,
                              { backgroundColor: colors.surfaceContainer },
                            ]}
                          >
                            <Icon name="person" size={15} color={colors.onSurfaceVariant} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.brokerMiniName, { color: colors.onSurface }]} numberOfLines={1}>
                            {item.brokerName}
                          </Text>
                          {(item.brokerRating > 0 || item.brokerDeals > 0) && (
                            <Text style={[styles.brokerMiniMeta, { color: colors.outline }]} numberOfLines={1}>
                              {item.brokerRating > 0 ? `★ ${item.brokerRating}` : ''}
                              {item.brokerDeals > 0 ? ` (${item.brokerDeals} deals)` : ''}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable
                          onPress={() => openChatWithBroker(item.brokerId, item.id)}
                          style={[styles.chatBtn, { backgroundColor: colors.surfaceContainer }]}
                        >
                          <Icon name="chat" size={15} color={colors.primary} />
                        </Pressable>
                        <View style={styles.inspectRow}>
                          <Text style={[styles.inspectLink, { color: colors.primary }]}>{t('inspect', 'Details')}</Text>
                          <Icon name="arrow_forward" size={15} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
              {hasMoreListings ? (
                <Pressable
                  onPress={() => void loadMoreListings()}
                  disabled={loadingMoreListings}
                  style={[
                    styles.loadMore,
                    {
                      borderColor: colors.outlineVariant + '40',
                      opacity: loadingMoreListings ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    {loadingMoreListings
                      ? t('loadingMore', 'Loading more assets...')
                      : t('loadMoreAssets', 'Load more assets')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View
              style={[
                styles.emptyList,
                { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '33' },
              ]}
            >
              <View style={[styles.emptyListIcon, { backgroundColor: colors.surfaceContainer }]}>
                <Icon name="search_off" size={32} color={colors.outline} />
              </View>
              <Text style={[styles.emptyListTitle, { color: colors.onSurface }]}>
                {t('noResultsFound', 'No properties match your filters')}
              </Text>
              <Text style={[styles.emptyListSub, { color: colors.outline }]}>
                {t('tryAdjusting', 'Try adjusting your price range, location, or asset category.')}
              </Text>
              <Pressable
                onPress={() => {
                  resetSearchFilter();
                  setSelectedCity('all');
                }}
                style={[styles.resetBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.resetBtnText, { color: colors.onPrimary }]}>
                  {t('resetFilters', 'Reset All Filters')}
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Map/list switch */}
      <View style={styles.switchWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          style={[styles.switchBtn, shadow.floating]}
        >
          <Icon name={viewMode === 'map' ? 'format_list_bulleted' : 'map'} size={17} color="#ffffff" />
          <Text style={styles.switchText}>
            {viewMode === 'map' ? `${t('viewList', 'List')} (${sortedListings.length})` : t('viewMap', 'Map')}
          </Text>
        </Pressable>
      </View>

      {/* Sort sheet */}
      <Modal visible={isSortOpen} transparent animationType="fade" onRequestClose={() => setIsSortOpen(false)}>
        <Pressable style={styles.sortOverlay} onPress={() => setIsSortOpen(false)}>
          <View style={[styles.sortCard, { backgroundColor: colors.surfaceContainerLowest }]}>
            {(
              [
                ['featured', t('featured', 'Featured')],
                ['price-asc', t('priceLowHigh', 'Price: Low to High')],
                ['price-desc', t('priceHighLow', 'Price: High to Low')],
                ['verified', t('deedVerifiedOnly', 'Deed Verified')],
              ] as [SortBy, string][]
            ).map(([value, label]) => (
              <Pressable
                key={value}
                onPress={() => {
                  setSortBy(value);
                  setIsSortOpen(false);
                }}
                style={[
                  styles.sortOption,
                  { backgroundColor: sortBy === value ? colors.primary + '14' : 'transparent' },
                ]}
              >
                <Text style={[styles.sortOptionText, { color: colors.onSurface }]}>{label}</Text>
                {sortBy === value && <Icon name="check" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Filter sheet */}
      <Modal
        visible={isFilterSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterSheetOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsFilterSheetOpen(false)} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surfaceContainerLowest, borderTopColor: colors.outlineVariant + '4D' },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.outlineVariant }]} />
            </View>

            <View style={[styles.sheetHeader, { borderBottomColor: colors.outlineVariant + '33' }]}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.onSurface }]}>
                  {t('searchFilterTitle', 'Discovery Filters')}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.outline }]}>
                  {t('appTagline', 'Filter real estate and asset listings')}
                </Text>
              </View>
              <View style={styles.sheetHeaderActions}>
                <Pressable
                  onPress={() => {
                    resetSearchFilter();
                    setSelectedCountryCode('all');
                    setSelectedCity('all');
                  }}
                >
                  <Text style={[styles.sheetReset, { color: colors.primary }]}>
                    {t('resetFilters', 'Reset All')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsFilterSheetOpen(false)}
                  style={[styles.sheetClose, { backgroundColor: colors.surfaceContainer }]}
                >
                  <Icon name="close" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetLabel, { color: colors.onSurface }]}>
                {t('targetJurisdiction', 'Country Jurisdiction')}
              </Text>
              <View style={styles.optionGrid}>
                {COUNTRY_OPTIONS.map((countryItem) => {
                  const active = selectedCountryCode === countryItem.code;
                  return (
                    <Pressable
                      key={countryItem.code}
                      onPress={() => {
                        setSelectedCountryCode(countryItem.code);
                        setSelectedCity('all');
                      }}
                      style={[
                        styles.optionCell,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                          borderColor: active ? colors.primary : colors.outlineVariant + '33',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.optionCellText, { color: active ? colors.onPrimary : colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {countryItem.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sheetLabel, { color: colors.onSurface }]}>
                {t('locationLabel', 'City / Municipal Region')}
              </Text>
              <View style={styles.optionGrid}>
                {availableCities.map((c) => {
                  const active = selectedCity === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setSelectedCity(c.id);
                        setSelectedPinId(null);
                      }}
                      style={[
                        styles.optionCell,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                          borderColor: active ? colors.primary : colors.outlineVariant + '33',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.optionCellText, { color: active ? colors.onPrimary : colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {c.id === 'all' ? t('allCategories', 'All Cities') : c.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sheetLabel, { color: colors.onSurface }]}>
                {t('categoryLabel', 'Asset Category')}
              </Text>
              <View style={styles.optionGrid}>
                {[
                  { id: 'all', label: t('allCategories', 'All Assets'), icon: 'apps' },
                  ...categories.map((category) => {
                    const presentation = categoryPresentation(category);
                    return {
                      id: category.slug,
                      label: presentation.translationKey
                        ? t(presentation.translationKey, category.name)
                        : category.name,
                      icon: presentation.icon,
                    };
                  }),
                ].map((cat) => {
                  const active = searchFilter.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSearchFilter((prev) => ({ ...prev, category: cat.id }))}
                      style={[
                        styles.optionCell,
                        styles.optionCellRow,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                          borderColor: active ? colors.primary : colors.outlineVariant + '33',
                        },
                      ]}
                    >
                      <Icon name={cat.icon} size={16} color={active ? colors.onPrimary : colors.onSurface} />
                      <Text
                        style={[styles.optionCellText, { color: active ? colors.onPrimary : colors.onSurface }]}
                        numberOfLines={1}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View
                style={[
                  styles.priceBlock,
                  { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '26' },
                ]}
              >
                <View style={styles.priceBlockHead}>
                  <Text style={[styles.sheetLabel, { color: colors.onSurface }]}>
                    {t('priceRange', 'Price Ceiling')}
                  </Text>
                  <Text style={[styles.priceBlockValue, { color: colors.primary }]}>
                    {Number.isFinite(searchFilter.maxPrice)
                      ? `Up to $${searchFilter.maxPrice.toLocaleString()} USD`
                      : 'Any price'}
                  </Text>
                </View>
                <Slider
                  minimumValue={10000}
                  maximumValue={500000}
                  step={5000}
                  value={Number.isFinite(searchFilter.maxPrice) ? searchFilter.maxPrice : 500000}
                  onValueChange={(value) =>
                    setSearchFilter((prev) => ({
                      ...prev,
                      maxPrice: value >= 500000 ? Number.POSITIVE_INFINITY : value,
                    }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.surfaceContainerHighest}
                  thumbTintColor={colors.primary}
                />
                <View style={styles.priceScale}>
                  <Text style={[styles.priceScaleText, { color: colors.outline }]}>$10,000</Text>
                  <Text style={[styles.priceScaleText, { color: colors.outline }]}>$250,000</Text>
                  <Text style={[styles.priceScaleText, { color: colors.outline }]}>$500,000+</Text>
                </View>
              </View>

              <Text style={[styles.sheetLabel, { color: colors.onSurface }]}>{t('bedrooms', 'Bedrooms')}</Text>
              <View style={styles.bedGrid}>
                {['Any', '1', '2', '3', '4+'].map((bed) => {
                  const active = searchFilter.bedrooms === bed;
                  return (
                    <Pressable
                      key={bed}
                      onPress={() => setSearchFilter((prev) => ({ ...prev, bedrooms: bed }))}
                      style={[
                        styles.bedCell,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceContainer,
                          borderColor: active ? colors.primary : colors.outlineVariant + '33',
                        },
                      ]}
                    >
                      <Text style={[styles.optionCellText, { color: active ? colors.onPrimary : colors.onSurface }]}>
                        {bed === 'Any' ? t('allCategories', 'Any') : bed}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setSearchFilter((prev) => ({ ...prev, deedVerified: !prev.deedVerified }))}
                style={[
                  styles.verifiedBlock,
                  { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '26' },
                ]}
              >
                <View style={styles.verifiedLeft}>
                  <View style={[styles.verifiedIcon, { backgroundColor: colors.primary }]}>
                    <Icon name="verified" size={18} color={colors.onPrimary} />
                  </View>
                  <View>
                    <Text style={[styles.verifiedTitle, { color: colors.onSurface }]}>
                      {t('deedVerifiedOnly', 'Municipality Deed Verified')}
                    </Text>
                    <Text style={[styles.verifiedSub, { color: colors.outline }]}>
                      {t('officialGovNotary', 'Registry record on file')}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.switchTrack,
                    {
                      backgroundColor: searchFilter.deedVerified
                        ? colors.primary
                        : colors.surfaceContainerHighest,
                      justifyContent: searchFilter.deedVerified ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <View style={styles.switchThumb}>
                    {searchFilter.deedVerified && <Icon name="check" size={12} color={colors.primary} />}
                  </View>
                </View>
              </Pressable>
            </ScrollView>

            <View style={[styles.sheetFooter, { borderTopColor: colors.outlineVariant + '33' }]}>
              <Pressable
                onPress={() => {
                  resetSearchFilter();
                  setSelectedCity('all');
                }}
                style={styles.sheetClear}
              >
                <Text style={[styles.sheetClearText, { color: colors.onSurfaceVariant }]}>
                  {t('resetFilters', 'Clear All')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsFilterSheetOpen(false)}
                style={[styles.sheetApply, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.sheetApplyText, { color: colors.onPrimary }]}>
                  {t('applyFilters', 'Show Properties')} ({filteredListings.length})
                </Text>
                <Icon name="arrow_forward" size={16} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {!!mapToast && (
        <View style={styles.toast}>
          <Icon name="check_circle" size={16} color={colors.secondary} />
          <Text style={styles.toastText}>{mapToast}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: typography.semibold, paddingVertical: 0 },
  clearBtn: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  filterBtn: {
    height: 42,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  filterCount: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountText: { fontSize: 10, fontFamily: typography.bold },
  saveBtn: { height: 42, width: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillRow: { gap: 6, paddingVertical: 2, paddingRight: 10 },
  pillRowTight: { gap: 6, paddingRight: 10 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  catPillText: { fontSize: 11, fontFamily: typography.bold },
  countryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countryText: { fontSize: 11, fontFamily: typography.bold },
  cityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  cityText: { fontSize: 11, fontFamily: typography.semibold },
  mapWrap: { flex: 1, overflow: 'hidden' },
  pin: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pinText: { fontSize: 11, fontFamily: typography.extrabold },
  mapControls: { position: 'absolute', top: 12, right: 12, gap: 8, alignItems: 'center' },
  mapBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  zoomBox: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', ...shadow.card },
  zoomBtn: { width: 40, height: 34, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  mapEmpty: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  mapEmptyCard: { width: 260, padding: 18, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 6, ...shadow.floating },
  mapEmptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  mapEmptyTitle: { fontSize: 12, fontFamily: typography.bold, textAlign: 'center' },
  mapEmptySub: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  mapEmptyBtn: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  mapEmptyBtnText: { fontSize: 12, fontFamily: typography.bold },
  preview: { position: 'absolute', left: 12, right: 12, bottom: 16, borderRadius: 22, borderWidth: 1, padding: 10, gap: 8 },
  previewTop: { flexDirection: 'row', gap: 10 },
  previewImageWrap: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  previewVerified: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, maxWidth: 84 },
  previewVerifiedText: { fontSize: 8, fontFamily: typography.bold, flexShrink: 1 },
  previewInfo: { flex: 1, justifyContent: 'space-between', paddingVertical: 1 },
  previewLocationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  previewLocation: { fontSize: 11, fontFamily: typography.bold, flex: 1 },
  previewClose: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  previewTitle: { fontSize: 13, fontFamily: typography.bold },
  previewMeta: { fontSize: 11, fontFamily: typography.medium },
  previewPriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 5, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  previewPrice: { fontSize: 16, fontFamily: typography.extrabold, flexShrink: 1 },
  inspectRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  inspectLink: { fontSize: 11, fontFamily: typography.bold },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  stepper: { flexDirection: 'row', gap: 6 },
  stepBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  stepText: { fontSize: 11, fontFamily: typography.semibold },
  saveFav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listContent: { padding: 14, gap: 14, paddingBottom: 90 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  listCount: { fontSize: 13, fontFamily: typography.bold },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, maxWidth: 200 },
  sortText: { fontSize: 11, fontFamily: typography.semibold, flexShrink: 1 },
  card: { borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  cardImageWrap: { height: 190, width: '100%' },
  cardImage: { width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardVerified: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, maxWidth: '70%' },
  cardVerifiedText: { fontSize: 11, fontFamily: typography.bold, flexShrink: 1 },
  cardFav: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  cardLocationRibbon: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(40,48,68,0.85)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, maxWidth: '70%' },
  cardLocationText: { fontSize: 11, fontFamily: typography.semibold, color: '#eef0ff' },
  cardBody: { padding: 14, gap: 6 },
  cardPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardPrice: { fontSize: 19, fontFamily: typography.extrabold, flexShrink: 1 },
  priceTypePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priceTypeText: { fontSize: 10, fontFamily: typography.bold },
  cardTitle: { fontSize: 14, fontFamily: typography.bold, marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, gap: 8 },
  brokerMini: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  brokerMiniAvatar: { width: 28, height: 28, borderRadius: 14 },
  brokerMiniName: { fontSize: 11, fontFamily: typography.semibold },
  brokerMiniMeta: { fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  emptyList: { alignItems: 'center', padding: 24, borderRadius: 22, borderWidth: 1, gap: 6 },
  emptyListIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyListTitle: { fontSize: 15, fontFamily: typography.bold, textAlign: 'center' },
  emptyListSub: { fontSize: 11, textAlign: 'center', maxWidth: 280 },
  resetBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14 },
  resetBtnText: { fontSize: 12, fontFamily: typography.bold },
  loadMore: { marginTop: 12, paddingVertical: 12, borderRadius: 999, borderWidth: 1, alignItems: 'center' },
  loadMoreText: { fontSize: 12, fontFamily: typography.bold },
  switchWrap: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#0f172a' },
  switchText: { color: '#ffffff', fontSize: 12, fontFamily: typography.bold },
  sortOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sortCard: { width: '100%', maxWidth: 340, borderRadius: 18, paddingVertical: 6, ...shadow.floating },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 6, borderRadius: 10 },
  sortOptionText: { fontSize: 13, fontFamily: typography.semibold },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, overflow: 'hidden' },
  sheetHandleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 15, fontFamily: typography.bold },
  sheetSub: { fontSize: 11, marginTop: 1 },
  sheetHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetReset: { fontSize: 11, fontFamily: typography.bold },
  sheetClose: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 18, gap: 10 },
  sheetLabel: { fontSize: 11, fontFamily: typography.bold, letterSpacing: 0.7, textTransform: 'uppercase', marginTop: 4 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionCell: { width: '31%', paddingVertical: 9, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionCellRow: { flexDirection: 'row', gap: 5 },
  optionCellText: { fontSize: 11, fontFamily: typography.semibold },
  priceBlock: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 4, marginTop: 4 },
  priceBlockHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  priceBlockValue: { fontSize: 13, fontFamily: typography.extrabold },
  priceScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  priceScaleText: { fontSize: 10, fontFamily: typography.medium },
  bedGrid: { flexDirection: 'row', gap: 8 },
  bedCell: { flex: 1, paddingVertical: 9, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  verifiedBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, padding: 12, gap: 10, marginTop: 4 },
  verifiedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  verifiedIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verifiedTitle: { fontSize: 12, fontFamily: typography.bold },
  verifiedSub: { fontSize: 11, marginTop: 1 },
  switchTrack: { width: 48, height: 26, borderRadius: 13, padding: 2, flexDirection: 'row', alignItems: 'center' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  sheetClear: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12 },
  sheetClearText: { fontSize: 12, fontFamily: typography.bold },
  sheetApply: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  sheetApplyText: { fontSize: 12, fontFamily: typography.bold },
  toast: { position: 'absolute', bottom: 76, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#283044', ...shadow.floating },
  toastText: { color: '#eef0ff', fontSize: 11, fontFamily: typography.bold },
});
