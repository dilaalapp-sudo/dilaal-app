import React, { useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { SUPPORTED_COUNTRIES } from '../data/countries';
import { CITY_COORDINATES } from '../data/cityCoordinates';
import { ListingMap, type MapPin } from '../components/ListingMap';
import { CountryCode } from '../types';

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
    currency,
    saveCurrentSearch,
    hasMoreListings,
    loadingMoreListings,
    loadMoreListings,
    language,
    t,
  } = useApp();

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isSatellite, setIsSatellite] = useState(false);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(listings[0]?.id || null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'verified'>('featured');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [mapToast, setMapToast] = useState<string | null>(null);

  // City options come from the supported-country configuration, never from a hardcoded list
  const allCities = useMemo(() => {
    const names = (Object.keys(SUPPORTED_COUNTRIES) as CountryCode[]).flatMap(
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
          ...(SUPPORTED_COUNTRIES[selectedCountryCode as CountryCode]?.cities || []).map((cityName) => ({
            id: cityName.toLowerCase(),
            label: cityName,
          })),
        ];

  // When a specific city is chosen, fly the map to that city's centre.
  const cityFocus = useMemo(() => {
    if (selectedCity === 'all') return null;
    const coords = CITY_COORDINATES[selectedCity];
    if (!coords) return null;
    return { center: coords, zoom: 12 };
  }, [selectedCity]);

  // Live filter computation
  const filteredListings = listings.filter((l) => {    // Country filter
    if (selectedCountryCode !== 'all' && l.countryCode !== selectedCountryCode) {
      return false;
    }

    // City filter
    if (selectedCity !== 'all') {
      const locLower = l.location.toLowerCase();
      if (!locLower.includes(selectedCity.toLowerCase())) return false;
    }

    // Text search query
    if (searchFilter.query) {
      const q = searchFilter.query.toLowerCase().trim();
      const match =
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category
    if (searchFilter.category !== 'all') {
      if (l.category !== searchFilter.category) return false;
    }

    // Bedrooms
    if (searchFilter.bedrooms !== 'Any') {
      const targetBeds = parseInt(searchFilter.bedrooms, 10);
      if (searchFilter.bedrooms === '4+') {
        if (!l.beds || l.beds < 4) return false;
      } else if (l.beds !== targetBeds) {
        return false;
      }
    }

    // Deed verified
    if (searchFilter.deedVerified && !l.isVerified) {
      return false;
    }

    // Price
    if (l.price < searchFilter.minPrice || l.price > searchFilter.maxPrice) {
      return false;
    }

    return true;
  });

  // Sorted listings
  const sortedListings = [...filteredListings].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'verified') return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    return 0; // featured
  });

  // Map pins derived from real listing coordinates; (0,0) means "no coordinates"
  const mappableListings = useMemo(
    () =>
      filteredListings
        .filter(
          (item) =>
            Number.isFinite(item.lat) &&
            Number.isFinite(item.lng) &&
            !(item.lat === 0 && item.lng === 0)
        )
        .slice(0, 8),
    [filteredListings]
  );

  const MAP_PINS = useMemo<MapPin[]>(
    () =>
      mappableListings.map((item) => ({
        id: item.id,
        lat: item.lat,
        lng: item.lng,
        icon:
          item.category === 'land'
            ? 'landscape'
            : item.category === 'car'
              ? 'directions_car'
              : 'home',
        priceLabel: formatPrice(item.price, true),
      })),
    [mappableListings, formatPrice]
  );

  // Active pin listing
  const activePinListing =
    selectedPinId && MAP_PINS.some((pin) => pin.id === selectedPinId)
      ? listings.find((l) => l.id === selectedPinId) || null
      : null;

  // Cycle through pins on map
  const handleNextPin = () => {
    if (MAP_PINS.length === 0) return;
    const currentIdx = MAP_PINS.findIndex((p) => p.id === selectedPinId);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % MAP_PINS.length;
    setSelectedPinId(MAP_PINS[nextIdx].id);
  };

  const handlePrevPin = () => {
    if (MAP_PINS.length === 0) return;
    const currentIdx = MAP_PINS.findIndex((p) => p.id === selectedPinId);
    const prevIdx =
      currentIdx === -1 ? MAP_PINS.length - 1 : (currentIdx - 1 + MAP_PINS.length) % MAP_PINS.length;
    setSelectedPinId(MAP_PINS[prevIdx].id);
  };

  const activeFiltersCount =
    (searchFilter.category !== 'all' ? 1 : 0) +
    (selectedCity !== 'all' ? 1 : 0) +
    (searchFilter.bedrooms !== 'Any' ? 1 : 0) +
    (searchFilter.deedVerified ? 1 : 0) +
    (Number.isFinite(searchFilter.maxPrice) ? 1 : 0) +
    (searchFilter.query.trim().length > 0 ? 1 : 0);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (map) {
      if (MAP_PINS.length > 1) {
        const bounds = L.latLngBounds(MAP_PINS.map((p) => [p.lat, p.lng] as [number, number]));
        map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      } else if (MAP_PINS.length === 1) {
        map.flyTo([MAP_PINS[0].lat, MAP_PINS[0].lng], 13);
      } else {
        map.setView([2.0469, 45.3182], 12);
      }
    }
    const firstPin = mappableListings[0];
    if (firstPin) {
      setSelectedPinId(firstPin.id);
      setMapToast(`Centered on ${firstPin.location.split(',')[0]}`);
    } else {
      setMapToast(t('noMapPins', 'No listings with map coordinates match your filters'));
    }
    setTimeout(() => setMapToast(null), 2500);
  };

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-24 relative select-none sm:select-auto">
      {/* Top Header Controls */}
      <div className="sticky top-0 z-30 w-full bg-surface/95 backdrop-blur-md border-b border-outline-variant/15 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-2.5 flex flex-col gap-2">
          {/* Main Search Bar Row */}
          <div className="flex items-center gap-2">
            {/* Search Input Box */}
            <div className="flex-1 bg-surface-container-lowest rounded-2xl shadow-xs px-3.5 py-2 sm:py-2.5 flex items-center gap-2.5 border border-outline-variant/25 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0">
                search
              </span>
              <input
                aria-label="Search destinations or assets"
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-on-surface focus:outline-none placeholder:text-outline truncate"
                type="text"
                value={searchFilter.query}
                onChange={(e) =>
                  setSearchFilter((prev) => ({ ...prev, query: e.target.value }))
                }
                placeholder={t('searchPlaceholder', 'Search houses, land, vehicles, Toyota Land Cruiser...')}
              />
              {searchFilter.query && (
                <button
                  onClick={() => setSearchFilter((prev) => ({ ...prev, query: '' }))}
                  className="w-5 h-5 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-surface-container-highest cursor-pointer shrink-0"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-[13px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Trigger Button */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={`min-h-[44px] px-3.5 sm:px-4 rounded-2xl border flex items-center gap-1.5 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/25 hover:bg-surface-container'
              }`}
              title="Open filters"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              <span className="hidden xs:inline">{t('searchFilterTitle', 'Filters')}</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Save Search Button */}
            <button
              onClick={() => {
                saveCurrentSearch(searchFilter.query ? `Search: ${searchFilter.query}` : 'Custom Filter Alert');
                setMapToast('Search saved to alerts');
                setTimeout(() => setMapToast(null), 2000);
              }}
              className="min-h-[44px] px-3 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest hover:bg-surface-container text-on-surface flex items-center gap-1 text-xs font-semibold cursor-pointer shrink-0"
              title="Save current search criteria"
            >
              <span className="material-symbols-outlined text-[17px] text-primary">bookmark_add</span>
              <span className="hidden sm:inline">{t('saveSearch', 'Save Alert')}</span>
            </button>
          </div>

          {/* Sub-row 1: Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
              const isActive = searchFilter.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    setSearchFilter((prev) => ({
                      ...prev,
                      category: cat.id,
                    }))
                  }
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sub-row 2: Country Jurisdictions */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { code: 'all', label: 'Global (All)' },
              { code: 'SO', label: '🇸🇴 Somalia' },
              { code: 'KE', label: '🇰🇪 Kenya' },
              { code: 'AE', label: '🇦🇪 UAE' },
              { code: 'GB', label: '🇬🇧 UK' },
              { code: 'TR', label: '🇹🇷 Turkey' },
              { code: 'US', label: '🇺🇸 USA' },
            ].map((countryItem) => {
              const isSelected = selectedCountryCode === countryItem.code;
              return (
                <button
                  key={countryItem.code}
                  onClick={() => {
                    setSelectedCountryCode(countryItem.code);
                    setSelectedCity('all');
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {countryItem.label}
                </button>
              );
            })}
          </div>

          {/* Sub-row 3: Dynamic City Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {availableCities.map((city) => {
              const isSelected = selectedCity === city.id;
              return (
                <button
                  key={city.id}
                  onClick={() => {
                    setSelectedCity(city.id);
                    setSelectedPinId(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-surface-container-highest text-primary font-bold border border-primary/30'
                      : 'text-on-surface-variant hover:text-on-surface bg-surface-container-lowest/80 border border-outline-variant/15'
                  }`}
                >
                  {city.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full relative">
        {viewMode === 'map' ? (
          /* MAP VIEW */
          <div className="relative w-full flex-1 min-h-[calc(100vh-220px)] overflow-hidden bg-surface-container-low">
            {/* Real interactive map (OpenStreetMap tiles, price pins at listing coordinates) */}
            <div className="absolute inset-0 z-0">
              <ListingMap
                pins={MAP_PINS}
                selectedId={selectedPinId}
                satellite={isSatellite}
                focus={cityFocus}
                onSelectPin={setSelectedPinId}
                onMapReady={(map) => {
                  mapRef.current = map;
                }}
              />
            </div>

            {/* Map Action Floating Controls (Top Right) */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
              {/* Recenter */}
              <button
                aria-label="Recenter Map"
                onClick={handleRecenter}
                className="w-10 h-10 rounded-2xl bg-surface-container-lowest text-on-surface shadow-md flex items-center justify-center hover:bg-surface-container active:scale-95 transition-all cursor-pointer border border-outline-variant/20"
                title="Recenter Map"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">
                  my_location
                </span>
              </button>

              {/* Satellite Toggle */}
              <button
                aria-label="Toggle Satellite"
                onClick={() => setIsSatellite(!isSatellite)}
                className={`w-10 h-10 rounded-2xl shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-outline-variant/20 ${
                  isSatellite
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest text-primary hover:bg-surface-container'
                }`}
                title="Toggle Satellite Imagery"
              >
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex flex-col bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant/20 overflow-hidden">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="w-10 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-b border-outline-variant/15"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="w-10 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
              </div>
            </div>

            {/* Map Zero-State Overlay */}
            {false && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-surface-container-lowest/95 backdrop-blur-md px-5 py-4 rounded-3xl border border-outline-variant/30 shadow-xl text-center max-w-xs pointer-events-auto">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2.5">
                  <span className="material-symbols-outlined text-2xl">location_off</span>
                </div>
                <h4 className="text-xs font-bold text-on-surface">{t('noMapListings', 'No Properties Found on Map')}</h4>
                <p className="text-[11px] text-on-surface-variant mt-1 mb-3">
                  {t(
                    'noMapListingsSub',
                    'Listings with saved coordinates will appear here once they match your filters.'
                  )}
                </p>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary-container transition-all cursor-pointer"
                >
                  {t('viewList', 'View Listings')}
                </button>
              </div>
            )}

            {/* Floating Property Preview Card at Bottom of Map (With Prev/Next & Favorite) */}
            <AnimatePresence>
              {activePinListing && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute bottom-16 sm:bottom-20 left-3 right-3 sm:left-6 sm:right-auto sm:w-[410px] z-30"
                >
                  <div className="bg-surface-container-lowest/98 backdrop-blur-xl rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col p-3 gap-2.5">
                    {/* Top Row: Thumbnail + Details */}
                    <div
                      className="flex gap-3 cursor-pointer"
                      onClick={() => openListingDetails(activePinListing.id)}
                    >
                      {/* Image Thumbnail with Verified Badge & Favorite */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-surface-container shrink-0">
                        {activePinListing.image ? (
                          <img
                            alt={activePinListing.title}
                            className="w-full h-full object-cover"
                            src={activePinListing.image}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-[28px]">home_work</span>
                          </div>
                        )}
                        {activePinListing.isVerified && (
                          <div className="absolute top-1.5 left-1.5 bg-primary/90 text-on-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[9px] font-bold backdrop-blur-xs">
                            <span
                              className="material-symbols-outlined text-[10px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                            <span>{activePinListing.verifiedLabel || t('verifiedTag', 'Verified')}</span>
                          </div>
                        )}
                      </div>

                      {/* Content Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-secondary truncate">
                              {activePinListing.location.split(',')[0]}
                            </span>
                            {/* Dismiss button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPinId(null);
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer shrink-0 -mr-1"
                              title="Close preview"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-on-surface line-clamp-1">
                            {(language === 'so' && activePinListing.titleSo)
                              ? activePinListing.titleSo
                              : activePinListing.title}
                          </h4>

                          {(activePinListing.beds || activePinListing.area) && (
                            <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1.5">
                              {activePinListing.beds ? (
                                <span>{activePinListing.beds} {t('beds', 'Bed')}</span>
                              ) : null}
                              {activePinListing.beds && activePinListing.area ? <span>•</span> : null}
                              {activePinListing.area && <span>{activePinListing.area}</span>}
                            </div>
                          )}
                        </div>

                        {/* Price & Action Row */}
                        <div className="flex items-baseline justify-between pt-1 border-t border-outline-variant/15">
                          <span className="text-base sm:text-lg font-extrabold text-primary">
                            {formatPrice(activePinListing.price)}
                          </span>
                          <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 hover:underline">
                            {t('inspect', 'Inspect Details')}
                            <span className="material-symbols-outlined text-[14px] rtl:rotate-180">
                              arrow_forward
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Prev / Next Pin Stepper */}
                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/15 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevPin();
                          }}
                          className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                          title="Previous Property"
                        >
                          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                          <span>{t('back', 'Prev')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextPin();
                          }}
                          className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold flex items-center gap-0.5 cursor-pointer text-[11px]"
                          title="Next Property"
                        >
                          <span>{t('seeAll', 'Next')}</span>
                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(activePinListing.id);
                        }}
                        className="flex items-center gap-1 text-on-surface-variant hover:text-red-500 font-semibold cursor-pointer text-[11px]"
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            favorites[activePinListing.id] ? 'text-red-500' : ''
                          }`}
                          style={
                            favorites[activePinListing.id]
                              ? { fontVariationSettings: "'FILL' 1" }
                              : undefined
                          }
                        >
                          favorite
                        </span>
                        <span>{favorites[activePinListing.id] ? t('verifiedTag', 'Saved') : t('saveSearch', 'Save')}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-4 flex flex-col gap-3.5">
            {/* Sort & Count Header */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs sm:text-sm font-bold text-on-surface">
                {sortedListings.length} {t('featuredListings', 'properties')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-outline font-medium hidden xs:inline">{t('sortBy', 'Sort by')}:</span>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'verified'
                    )
                  }
                  className="bg-surface-container-lowest border border-outline-variant/25 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-on-surface focus:outline-none cursor-pointer"
                >
                  <option value="featured">{t('featured', 'Featured')}</option>
                  <option value="price-asc">{t('priceLowHigh', 'Price: Low to High')}</option>
                  <option value="price-desc">{t('priceHighLow', 'Price: High to Low')}</option>
                  <option value="verified">{t('deedVerifiedOnly', 'Deed Verified')}</option>
                </select>
              </div>
            </div>

            {/* Listings Grid Cards */}
            {sortedListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedListings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openListingDetails(item.id)}
                    className="bg-surface-container-lowest rounded-3xl border border-outline-variant/25 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group"
                  >
                    {/* Property Image Banner */}
                    <div className="relative w-full h-48 sm:h-52 bg-surface-container overflow-hidden">
                      {item.image ? (
                        <img
                          alt={item.title}
                          src={item.image}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-[40px]">home_work</span>
                        </div>
                      )}
                      {/* Verified Badge */}
                      {item.isVerified && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-primary/90 text-on-primary px-2.5 py-0.5 rounded-full text-xs font-bold backdrop-blur-xs shadow-sm">
                          <span
                            className="material-symbols-outlined text-[13px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            verified
                          </span>
                          <span>{item.verifiedLabel || t('verifiedTag', 'Verified')}</span>
                        </div>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(item.id);
                        }}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 transition-colors cursor-pointer"
                        title="Save to favorites"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            favorites[item.id] ? 'text-red-500' : 'text-white'
                          }`}
                          style={
                            favorites[item.id]
                              ? { fontVariationSettings: "'FILL' 1" }
                              : undefined
                          }
                        >
                          favorite
                        </span>
                      </button>

                      {/* Location Ribbon */}
                      <div className="absolute bottom-3 left-3 bg-inverse-surface/85 text-inverse-on-surface px-2.5 py-0.5 rounded-lg text-xs font-semibold backdrop-blur-xs">
                        {item.location}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col gap-2 flex-1 justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg sm:text-xl font-extrabold text-primary">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary/15 text-secondary">
                            {item.priceType === 'rent' ? t('month', '/ month') : t('fixed', 'Fixed Price')}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                          {(language === 'so' && item.titleSo) ? item.titleSo : item.title}
                        </h4>
                        {(() => {
                          const specs =
                            item.category === 'car'
                              ? [
                                  item.categorySpecs?.year,
                                  item.categorySpecs?.transmission,
                                  item.categorySpecs?.mileage || item.area,
                                ]
                              : item.category === 'land'
                              ? [
                                  item.categorySpecs?.plotDimensions,
                                  item.area,
                                  item.categorySpecs?.zoning,
                                ]
                              : item.category === 'commercial'
                              ? [
                                  item.categorySpecs?.commercialType,
                                  item.area,
                                  item.categorySpecs?.stories,
                                ]
                              : [
                                  item.beds ? `${item.beds} ${t('beds', 'Bed')}` : null,
                                  item.baths ? `${item.baths} ${t('baths', 'Bath')}` : null,
                                  item.area,
                                ];
                          const summary = specs.filter(Boolean).join(' • ');
                          return summary ? (
                            <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5 font-medium">
                              {summary}
                            </p>
                          ) : null;
                        })()}
                      </div>

                      {/* Broker & Direct Action */}
                      <div className="flex items-center justify-between pt-3 border-t border-outline-variant/15 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.brokerAvatar ? (
                            <img
                              alt={item.brokerName}
                              src={item.brokerAvatar}
                              className="w-7 h-7 rounded-full object-cover border border-outline-variant/30 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center border border-outline-variant/30 shrink-0">
                              <span className="material-symbols-outlined text-[15px]">person</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-on-surface font-semibold truncate">
                              {item.brokerName}
                            </span>
                            {(item.brokerRating > 0 || item.brokerDeals > 0) && (
                              <span className="text-[10px] text-outline">
                                {item.brokerRating > 0 && `★ ${item.brokerRating}`}
                                {item.brokerDeals > 0 &&
                                  ` (${item.brokerDeals} deals)`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openChatWithBroker(item.brokerId, item.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Chat with Broker"
                          >
                            <span className="material-symbols-outlined text-[15px]">chat</span>
                            <span className="hidden xs:inline">{t('chatBroker', 'Chat')}</span>
                          </button>
                          <span className="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            {t('inspect', 'Details')}
                            <span className="material-symbols-outlined text-[15px] rtl:rotate-180">
                              arrow_forward
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {hasMoreListings ? (
                  <button
                    type="button"
                    onClick={() => void loadMoreListings()}
                    disabled={loadingMoreListings}
                    className="col-span-full mx-auto px-5 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/25 text-xs font-bold text-primary disabled:opacity-60 cursor-pointer"
                  >
                    {loadingMoreListings
                      ? t('loadingMore', 'Loading more assets...')
                      : t('loadMoreAssets', 'Load more assets')}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="py-16 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/20 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3">
                  <span className="material-symbols-outlined text-[32px]">search_off</span>
                </div>
                <h3 className="text-base font-bold text-on-surface">
                  {t('noResultsFound', 'No properties match your filters')}
                </h3>
                <p className="text-xs text-outline mt-1 max-w-sm">
                  {t('tryAdjusting', 'Try adjusting your price range, location, or asset category.')}
                </p>
                <button
                  onClick={() => {
                    resetSearchFilter();
                    setSelectedCity('all');
                  }}
                  className="mt-4 px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container active:scale-95 transition cursor-pointer"
                >
                  {t('resetFilters', 'Reset All Filters')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Center Map / List View Switcher (Thumb Zone) */}
      <div className="fixed bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white dark:bg-surface-container-highest dark:text-on-surface shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-xs border border-white/10"
        >
          <span className="material-symbols-outlined text-[17px]">
            {viewMode === 'map' ? 'format_list_bulleted' : 'map'}
          </span>
          <span>
            {viewMode === 'map' ? `${t('viewList', 'List')} (${sortedListings.length})` : t('viewMap', 'Map')}
          </span>
        </button>
      </div>

      {/* Slide-Over Filter Drawer Modal */}
      <AnimatePresence>
        {isFilterSheetOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterSheetOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            />

            {/* Modal Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-w-xl bg-surface-container-lowest rounded-t-3xl shadow-2xl z-10 flex flex-col max-h-[85vh] overflow-hidden border-t border-outline-variant/30"
            >
              {/* Grab Handle */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-outline-variant rounded-full"></div>
              </div>

              {/* Sheet Header */}
              <div className="px-5 py-3 border-b border-outline-variant/20 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-on-surface">{t('searchFilterTitle', 'Discovery Filters')}</h3>
                  <p className="text-xs text-outline font-medium">
                    {t('appTagline', 'Filter real estate and asset listings')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      resetSearchFilter();
                      setSelectedCountryCode('all');
                      setSelectedCity('all');
                    }}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {t('resetFilters', 'Reset All')}
                  </button>
                  <button
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-surface-container-high cursor-pointer ml-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Filters Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
                {/* 1. Country Jurisdiction */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    {t('targetJurisdiction', 'Country Jurisdiction')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: 'all', label: t('allCategories', 'All Global') },
                      { code: 'SO', label: '🇸🇴 Somalia' },
                      { code: 'KE', label: '🇰🇪 Kenya' },
                      { code: 'AE', label: '🇦🇪 UAE' },
                      { code: 'GB', label: '🇬🇧 UK' },
                      { code: 'TR', label: '🇹🇷 Turkey' },
                      { code: 'US', label: '🇺🇸 USA' },
                    ].map((countryItem) => {
                      const active = selectedCountryCode === countryItem.code;
                      return (
                        <button
                          key={countryItem.code}
                          onClick={() => {
                            setSelectedCountryCode(countryItem.code);
                            setSelectedCity('all');
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                            active
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {countryItem.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. City / Region */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    {t('locationLabel', 'City / Municipal Region')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableCities.map((c) => {
                      const active = selectedCity === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCity(c.id);
                            setSelectedPinId(null);
                          }}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer border ${
                            active
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {c.id === 'all' ? t('allCategories', 'All Cities') : c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Asset Category Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    {t('categoryLabel', 'Asset Category')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                        <button
                          key={cat.id}
                          onClick={() =>
                            setSearchFilter((prev) => ({
                              ...prev,
                              category: cat.id,
                            }))
                          }
                          className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                            active
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {cat.icon}
                          </span>
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Price Ceiling Slider */}
                <div className="flex flex-col gap-2.5 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/15">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                      {t('priceRange', 'Price Ceiling')}
                    </span>
                    <span className="text-sm font-extrabold text-primary">
                      {Number.isFinite(searchFilter.maxPrice)
                        ? `Up to $${searchFilter.maxPrice.toLocaleString()} USD`
                        : 'Any price'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={Number.isFinite(searchFilter.maxPrice) ? searchFilter.maxPrice : 500000}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setSearchFilter((prev) => ({
                        ...prev,
                        maxPrice: next >= 500000 ? Number.POSITIVE_INFINITY : next,
                      }));
                    }}
                    className="w-full accent-primary cursor-pointer h-2 bg-surface-container rounded-lg"
                  />
                  <div className="flex justify-between items-center text-[10px] text-outline font-medium">
                    <span>$10,000</span>
                    <span>$250,000</span>
                    <span>$500,000+</span>
                  </div>
                </div>

                {/* 4. Bedrooms Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    {t('bedrooms', 'Bedrooms')}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {['Any', '1', '2', '3', '4+'].map((bed) => {
                      const active = searchFilter.bedrooms === bed;
                      return (
                        <button
                          key={bed}
                          onClick={() =>
                            setSearchFilter((prev) => ({
                              ...prev,
                              bedrooms: bed,
                            }))
                          }
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            active
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {bed === 'Any' ? t('allCategories', 'Any') : bed}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Deed Verified Toggle */}
                <div className="bg-surface-container-low rounded-2xl p-3 flex items-center justify-between border border-outline-variant/15">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-xs">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-on-surface">{t('deedVerifiedOnly', 'Municipality Deed Verified')}</div>
                      <div className="text-[11px] text-outline">
                        {t('officialGovNotary', 'Registry record on file')}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setSearchFilter((prev) => ({
                        ...prev,
                        deedVerified: !prev.deedVerified,
                      }))
                    }
                    className={`w-12 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      searchFilter.deedVerified
                        ? 'bg-primary justify-end'
                        : 'bg-surface-container-highest justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-xs flex items-center justify-center">
                      {searchFilter.deedVerified && (
                        <span className="material-symbols-outlined text-[12px] text-primary">
                          check
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {/* 6. Verified badge is shown per listing from registry status; no separate escrow guarantee filter. */}
              </div>

              {/* Modal Footer Sticky Action */}
              <div className="px-5 py-3 border-t border-outline-variant/20 bg-surface-container-lowest flex items-center gap-3">
                <button
                  onClick={() => {
                    resetSearchFilter();
                    setSelectedCity('all');
                  }}
                  className="py-3 px-4 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  {t('resetFilters', 'Clear All')}
                </button>
                <button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1 py-3 px-5 rounded-2xl bg-primary text-on-primary font-bold text-xs shadow-md hover:bg-primary-container active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t('applyFilters', 'Show Properties')} ({filteredListings.length})</span>
                  <span className="material-symbols-outlined text-[16px] rtl:rotate-180">arrow_forward</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      {mapToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-inverse-surface text-inverse-on-surface rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            my_location
          </span>
          <span>{mapToast}</span>
        </div>
      )}
    </div>
  );
};
