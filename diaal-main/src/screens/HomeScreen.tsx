import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { categoryPresentation } from '../lib/categories';
import { MatchmakerModal } from '../components/MatchmakerModal';

export const HomeScreen: React.FC = () => {
  const {
    listings,
    categories,
    brokers,
    openListingDetails,
    openBrokerProfile,
    openChatWithBroker,
    formatPrice,
    favorites,
    toggleFavorite,
    setActiveTab,
    setCurrentScreen,
    setSearchFilter,
    language,
    t,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMatchmakerOpen, setIsMatchmakerOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchFilter((prev) => ({
      ...prev,
      query: searchQuery,
    }));
    setActiveTab('search');
    setCurrentScreen('search');
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
    setSearchFilter((prev) => ({ ...prev, category: slug }));
  };

  // Filter listings by the category slugs configured in the admin panel.
  const filteredFeatured = listings.filter((l) => {
    if (!selectedCategory) return true;
    return l.category === selectedCategory;
  });

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-12">
      <div className="max-w-2xl mx-auto w-full">
        {/* Search & Filter Bar */}
        <section className="px-3.5 sm:px-gutter pt-3 sm:pt-4 pb-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">search</span>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholderHome', 'Search houses, land, vehicles in Mogadishu...')}
              className="w-full pl-9 sm:pl-11 pr-12 sm:pr-14 py-2.5 sm:py-3 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline text-xs sm:text-sm shadow-sm outline-none transition-shadow focus:shadow-md border border-outline-variant/20 focus:border-primary/40 truncate"
            />
            <div className="absolute inset-y-0 right-1 sm:right-1.5 flex items-center">
              <button
                type="button"
                aria-label={t('filterTitle', 'Filters')}
                onClick={() => {
                  setActiveTab('search');
                  setCurrentScreen('search');
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer hover:bg-tertiary-container"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-secondary-fixed">tune</span>
              </button>
            </div>
          </form>
        </section>

        {/* Horizontal Category Chips */}
        <section className="py-2">
          <div className="flex items-center gap-2 overflow-x-auto px-3.5 sm:px-gutter no-scrollbar py-0.5 scroll-smooth">
            <button
              onClick={() => handleCategoryClick('')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-primary-container text-on-primary shadow-md'
                  : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[17px] ${
                  selectedCategory === '' ? 'text-on-primary' : 'text-primary'
                }`}
              >
                grid_view
              </span>
              <span>{t('allCategories', 'All Assets')}</span>
            </button>
            {categories.map((category) => {
              const presentation = categoryPresentation(category);
              const isActive = selectedCategory === category.slug;
              const label = presentation.translationKey
                ? t(presentation.translationKey, category.name)
                : category.name;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold shrink-0 shadow-sm transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary shadow-md'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[17px] ${isActive ? 'text-on-primary' : presentation.color}`}>
                    {presentation.icon}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Featured Listings Carousel */}
        <section className="pt-3 pb-2 flex flex-col gap-2.5">
          <div className="px-3.5 sm:px-gutter flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 rounded-full bg-primary-container"></div>
              <div>
                <h2 className="text-base font-bold text-primary tracking-tight">{t('featuredListings', 'Featured Listings')}</h2>
                <p className="text-[11px] text-outline font-semibold">{t('featuredSubLive', 'Latest listings published to the marketplace')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('search');
                setCurrentScreen('search');
              }}
              className="text-xs text-secondary font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{t('seeAll', 'See all')}</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          {/* Carousel Track */}
          {filteredFeatured.length > 0 ? (
            <div className="flex gap-3 sm:gap-4 overflow-x-auto px-3.5 sm:px-gutter no-scrollbar py-2">
              {filteredFeatured.map((item) => (
                <article
                  key={item.id}
                  onClick={() => openListingDetails(item.id)}
                  className="w-[82vw] max-w-[285px] sm:w-[290px] shrink-0 rounded-2xl bg-surface-container-lowest shadow-md border border-outline-variant/20 overflow-hidden flex flex-col group cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-surface-container">
                    {item.image ? (
                      <img
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={item.image}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container text-outline">
                        <span className="material-symbols-outlined text-[36px]">home_work</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-transparent to-black/20"></div>

                    {/* Verified Deed Pill */}
                    {item.isVerified && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-[10px] font-bold shadow-md">
                        <span
                          className="material-symbols-outlined text-[14px] text-secondary-fixed"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {item.category === 'land' ? 'gavel' : 'verified'}
                        </span>
                        <span className="tracking-wide uppercase">{item.verifiedLabel || t('verifiedTag', 'Verified')}</span>
                      </div>
                    )}

                    {/* Favorite Button */}
                    <button
                      aria-label="Favorite property"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer ${
                        favorites[item.id] ? 'text-error' : 'text-outline hover:text-error'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: favorites[item.id] ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>

                    {/* Price overlay tag */}
                    <div className="absolute bottom-2.5 left-3 right-3 min-w-0 pointer-events-none">
                      <span className="text-[10px] sm:text-[11px] text-surface-container-lowest/80 block leading-tight">
                        {item.category === 'land'
                          ? t('totalInvestment', 'Total Investment')
                          : t('askingPrice', 'Asking Price')}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-surface-container-lowest tracking-tight truncate block">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col gap-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-on-surface truncate">
                        {(language === 'so' && item.titleSo) ? item.titleSo : item.title}
                      </h3>
                      <div className="flex items-center gap-1 text-outline text-xs mt-0.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">near_me</span>
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.category === 'car' ? (
                        <>
                          {item.categorySpecs?.year && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">calendar_today</span> {item.categorySpecs.year}
                            </span>
                          )}
                          {(item.categorySpecs?.mileage || item.area) && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">speed</span> {item.categorySpecs?.mileage || item.area}
                            </span>
                          )}
                          {item.categorySpecs?.transmission && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">settings</span> {item.categorySpecs.transmission}
                            </span>
                          )}
                        </>
                      ) : item.category === 'land' ? (
                        <>
                          {(item.categorySpecs?.plotDimensions || item.area) && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">straighten</span> {item.categorySpecs?.plotDimensions || item.area}
                            </span>
                          )}
                          {item.categorySpecs?.zoning && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">domain</span> {item.categorySpecs.zoning}
                            </span>
                          )}
                          {item.categorySpecs?.beaconsStatus && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">pin_drop</span> {item.categorySpecs.beaconsStatus}
                            </span>
                          )}
                        </>
                      ) : item.category === 'commercial' ? (
                        <>
                          {item.categorySpecs?.commercialType && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">apartment</span> {item.categorySpecs.commercialType}
                            </span>
                          )}
                          {item.area && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">square_foot</span> {item.area}
                            </span>
                          )}
                          {item.categorySpecs?.stories && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">stairs</span> {item.categorySpecs.stories}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {item.beds ? (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">bed</span> {item.beds} {t('beds', 'Beds')}
                            </span>
                          ) : null}
                          {item.baths ? (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">bathtub</span> {item.baths} {t('baths', 'Baths')}
                            </span>
                          ) : null}
                          {item.area && (
                            <span className="px-2 py-1 rounded-md bg-surface-container text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">square_foot</span> {item.area}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-1 flex items-center justify-between border-t border-surface-container">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-secondary"></div>
                        <span className="text-xs font-bold text-on-surface">{item.registryNumber}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openListingDetails(item.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer hover:bg-tertiary-container"
                      >
                        {item.category === 'land' ? t('viewMapAction', 'View Map') : item.category === 'car' ? t('bookTestAction', 'Book Test') : t('inspect', 'Inspect')}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mx-3.5 sm:px-gutter py-6 px-4 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center gap-2.5 my-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[26px]">home_work</span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-on-surface">
                {t('noListingsYet', 'No Listings Available Yet')}
              </h3>
              <p className="text-[11px] text-on-surface-variant max-w-sm">
                {t(
                  'noListingsSub',
                  'New verified properties appear here as soon as brokers post them.'
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('post');
                  setCurrentScreen('post');
                }}
                className="mt-1 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-sm hover:bg-tertiary-container flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                {t('postFirstListing', 'Post First Listing')}
              </button>
            </div>
          )}
        </section>

        {/* Interactive Quick Action Matchmaker Banner */}
        <section className="px-3.5 sm:px-gutter py-2.5">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-container to-tertiary text-on-primary p-3.5 sm:p-4 shadow-md flex items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-col gap-1 z-10 min-w-0">
              <div className="flex items-center gap-1.5 text-secondary-fixed">
                <span className="material-symbols-outlined text-[17px] sm:text-[18px]">handshake</span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                  {t('brokerMatchmaker', 'Broker Matchmaker')}
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold leading-tight text-surface-container-lowest">
                {t('findBroker', 'Find a Dilaal')}
              </p>
              <p className="text-[11px] sm:text-xs text-surface-variant truncate">
                {t('findBrokerSub', 'Answer a few questions to get matched with registered brokers.')}
              </p>
            </div>
            <button
              onClick={() => setIsMatchmakerOpen(true)}
              className="shrink-0 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-secondary-container hover:bg-secondary-fixed text-on-secondary font-bold text-xs shadow-md active:scale-95 transition-all z-10 flex items-center gap-1 cursor-pointer"
            >
              <span>{t('findNow', 'Find Now')}</span>
              <span className="material-symbols-outlined text-[16px] rtl:rotate-180">arrow_forward</span>
            </button>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-secondary-fixed/10 pointer-events-none blur-xl"></div>
          </div>
        </section>

        {/* Top Verified Dilaalo (Brokers) Story Row */}
        <section className="pt-3 pb-2 flex flex-col gap-2.5">
          <div className="px-3.5 sm:px-gutter flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 rounded-full bg-secondary-container"></div>
              <div>
                <h2 className="text-base font-bold text-primary tracking-tight">
                  {t('brokerDirectoryTitle', 'Dilaalo Directory')}
                </h2>
                <p className="text-[11px] text-outline font-semibold">
                  {t('brokerDirectorySub', 'Registered brokers on the platform')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDirectoryOpen(true)}
              className="text-xs text-secondary font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{t('directory', 'Directory')}</span>
              <span className="material-symbols-outlined text-[16px] rtl:rotate-180">chevron_right</span>
            </button>
          </div>

          {/* Broker Story Carousel */}
          {brokers.length > 0 ? (
            <div className="flex gap-2.5 sm:gap-3 overflow-x-auto px-3.5 sm:px-gutter no-scrollbar py-1">
              {brokers.map((broker) => (
                <div
                  key={broker.id}
                  className="w-[155px] sm:w-[170px] shrink-0 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col items-center text-center relative group"
                >
                  <div
                    className="relative w-14 h-14 sm:w-16 sm:h-16 mb-2 cursor-pointer"
                    onClick={() => openBrokerProfile(broker.id)}
                  >
                    {broker.avatar ? (
                      <img
                        alt={broker.name}
                        className="w-full h-full rounded-full object-cover shadow-md ring-2 ring-primary-fixed"
                        src={broker.avatar}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md text-base font-bold">
                        {broker.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                    )}
                    {broker.verificationStatus === 'approved' && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center shadow-sm">
                        <span
                          className="material-symbols-outlined text-[12px] sm:text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                      </div>
                    )}
                  </div>

                  <h3
                    className="text-xs font-bold text-on-surface truncate w-full cursor-pointer hover:text-primary"
                    onClick={() => openBrokerProfile(broker.id)}
                  >
                    {broker.name}
                  </h3>
                  {broker.coverage && (
                    <p className="text-[10px] sm:text-[11px] text-outline truncate w-full">
                      {broker.coverage}
                    </p>
                  )}

                  {(broker.rating > 0 || broker.deals > 0) && (
                    <div className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-xs text-on-surface">
                      <span
                        className="material-symbols-outlined text-[13px] text-secondary-container"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      {broker.rating > 0 && <span className="font-bold">{broker.rating}</span>}
                      {broker.deals > 0 && <span className="text-outline text-[10px]">({broker.deals})</span>}
                    </div>
                  )}

                  <button
                    onClick={() => openChatWithBroker(broker.id)}
                    className="mt-2.5 w-full py-1.5 rounded-lg bg-surface-container-high text-primary text-xs font-bold hover:bg-primary-container hover:text-on-primary transition-colors cursor-pointer"
                  >
                    {t('contact', 'Contact')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-3.5 sm:px-gutter p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">
                    {t('brokerDirectoryTitle', 'Broker Directory')}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant">
                    {t('brokerDirectorySub', 'Registered broker profiles will appear here')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                {t('inspect', 'Inspect')}
              </button>
            </div>
          )}
        </section>

        {/* Near You (Agagaarkaaga) Vertical Cards List */}
        <section className="px-3.5 sm:px-gutter pt-3 pb-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-5 rounded-full bg-primary-fixed-dim"></div>
              <div>
                <h2 className="text-base font-bold text-primary tracking-tight">
                  {t('nearYou', 'Near You')}
                </h2>
                <p className="text-[11px] text-outline font-semibold">
                  {t('nearYouSubLive', 'Latest listings added to the marketplace')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('search');
                setCurrentScreen('search');
              }}
              className="flex items-center gap-1 text-primary text-xs font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>{t('distance', 'Distance')}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {listings.length > 0 ? (
              listings.slice(0, 5).map((item) => (
                <article
                  key={item.id}
                  onClick={() => openListingDetails(item.id)}
                  className="flex flex-col sm:flex-row rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="relative h-44 sm:h-auto sm:w-44 shrink-0 bg-surface-container">
                    {item.image ? (
                      <img
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={item.image}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container text-outline">
                        <span className="material-symbols-outlined text-[36px]">home_work</span>
                      </div>
                    )}
                    {item.isVerified && (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-primary-container text-on-primary text-[11px] font-semibold">
                        {item.verifiedLabel || t('verifiedTag', 'Verified')}
                      </div>
                    )}
                    <button
                      aria-label="Save listing"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                      className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-surface-container-lowest/80 backdrop-blur-sm flex items-center justify-center shadow-sm active:scale-90 cursor-pointer ${
                        favorites[item.id] ? 'text-error' : 'text-outline hover:text-error'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={{ fontVariationSettings: favorites[item.id] ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-on-surface leading-snug">
                          {(language === 'so' && item.titleSo) ? item.titleSo : item.title}
                        </h3>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-primary leading-none block">
                            {formatPrice(item.price)}
                          </span>
                          <span className="text-[10px] text-outline">
                            {item.priceType === 'rent' ? t('month', '/month') : t('fixed', 'Fixed')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-outline text-xs mt-1">
                        <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
                        <span>{item.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {item.category === 'car' ? (
                        <>
                          {item.categorySpecs?.year && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">calendar_today</span> {item.categorySpecs.year}
                            </span>
                          )}
                          {(item.categorySpecs?.mileage || item.area) && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">speed</span> {item.categorySpecs?.mileage || item.area}
                            </span>
                          )}
                        </>
                      ) : item.category === 'land' ? (
                        <>
                          {(item.categorySpecs?.plotDimensions || item.area) && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">straighten</span> {item.categorySpecs?.plotDimensions || item.area}
                            </span>
                          )}
                          {item.categorySpecs?.zoning && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">domain</span> {item.categorySpecs.zoning}
                            </span>
                          )}
                        </>
                      ) : item.category === 'commercial' ? (
                        <>
                          {item.categorySpecs?.commercialType && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">apartment</span> {item.categorySpecs.commercialType}
                            </span>
                          )}
                          {item.area && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">square_foot</span> {item.area}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {item.beds ? (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">bed</span> {item.beds} {t('beds', 'Beds')}
                            </span>
                          ) : null}
                          {item.area && (
                            <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                              <span className="material-symbols-outlined text-[13px]">square_foot</span> {item.area}
                            </span>
                          )}
                        </>
                      )}
                      {item.category === 'car' && item.categorySpecs?.customsDutyPaid ? (
                        <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-primary">verified</span> {t('customsDutyPaid', 'Duty Paid')}
                        </span>
                      ) : item.isVerified ? (
                        <span className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface-variant flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-primary">verified</span> {t('verifiedTag', 'Verified')}
                        </span>
                      ) : null}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-surface-container">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.registryNumber && (
                          <>
                            <div className="w-5 h-5 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
                              <span className="material-symbols-outlined text-[12px]">tag</span>
                            </div>
                            <span className="text-xs text-on-surface-variant font-medium truncate">
                              {item.registryNumber}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openListingDetails(item.id);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold active:scale-95 transition-transform cursor-pointer"
                      >
                        {t('view', 'View')}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-outline text-[24px]">location_searching</span>
                <span className="text-xs font-semibold text-on-surface">
                  {t('noNearbyListings', 'No Nearby Listings Registered')}
                </span>
                <span className="text-[11px] text-on-surface-variant max-w-xs">
                  {t(
                    'noNearbySub',
                    'New properties submitted with GPS boundary coordinates will automatically appear here once approved.'
                  )}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Matchmaker Modal */}
      {isMatchmakerOpen && <MatchmakerModal onClose={() => setIsMatchmakerOpen(false)} />}

      {/* Broker Directory Modal */}
      {isDirectoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div>
                <h3 className="text-sm font-bold text-on-surface">
                  {t('brokerDirectoryTitle', 'Dilaalo Directory')}
                </h3>
                <p className="text-[10px] text-outline">
                  {t('brokerDirectorySub', 'Registered broker profiles on the platform')}
                </p>
              </div>
              <button
                onClick={() => setIsDirectoryOpen(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {brokers.length === 0 ? (
                <div className="py-8 px-4 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center gap-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[24px]">badge</span>
                  </div>
                  <h4 className="text-xs font-bold text-on-surface">
                    {t('noBrokersYet', 'No Brokers Registered Yet')}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant max-w-xs">
                    {t('noBrokersSub', 'Broker profiles will appear in this directory once they are registered.')}
                  </p>
                </div>
              ) : (
                brokers.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-3">
                    {b.avatar ? (
                      <img
                        alt={b.name}
                        src={b.avatar}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-fixed"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center ring-2 ring-primary-fixed shrink-0">
                        <span className="material-symbols-outlined text-[22px]">person</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-on-surface">{b.name}</h4>
                      {(b.licenseNumber || b.verificationStatus === 'approved') && (
                        <p className="text-[10px] text-outline truncate">
                          {[
                            b.licenseNumber,
                            b.verificationStatus === 'approved' ? t('verifiedTag', 'Verified') : null,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      )}
                      {(b.rating > 0 || b.deals > 0) && (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-secondary mt-0.5">
                          {b.rating > 0 && <span>★ {b.rating}</span>}
                          {b.deals > 0 && <span className="text-outline font-normal">({b.deals} deals)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      onClick={() => {
                        setIsDirectoryOpen(false);
                        openBrokerProfile(b.id);
                      }}
                      className="py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold cursor-pointer hover:bg-surface-container-high"
                    >
                      {t('navProfile', 'Profile')}
                    </button>
                    <button
                      onClick={() => {
                        setIsDirectoryOpen(false);
                        openChatWithBroker(b.id);
                      }}
                      className="py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow cursor-pointer hover:bg-tertiary-container"
                    >
                      {t('contact', 'Contact')}
                    </button>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
