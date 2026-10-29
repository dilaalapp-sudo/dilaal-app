import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCall } from '../context/CallContext';
import { DeedModal } from '../components/DeedModal';
import { ReportModal } from '../components/ReportModal';

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

  const listing =
    listings.find((l) => l.id === selectedListingId) || listings[0];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [isDeedModalOpen, setIsDeedModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(
    listing && listing.price > 0 ? String(listing.price) : ''
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">home_work</span>
        </div>
        <h3 className="text-base font-bold text-on-surface">No Listing Selected</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1.5 mb-6 leading-relaxed">
          The requested property listing is either unavailable or has not been published yet. Browse the marketplace or submit a new property.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen(activeTab === 'search' ? 'search' : 'home')}
            className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
          >
            Explore Marketplace
          </button>
          <button
            onClick={() => setCurrentScreen('post')}
            className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            Post a Listing
          </button>
        </div>
      </div>
    );
  }

  const galleryImages = (
    listing.gallery && listing.gallery.length > 0
      ? [listing.image, ...listing.gallery]
      : [listing.image].filter(Boolean)
  ).filter((img): img is string => typeof img === 'string' && img.trim().length > 0);

  const activeSlide = galleryImages.length > 0 ? currentSlide % galleryImages.length : 0;
  const broker = brokers.find((b) => b.id === listing.brokerId);
  const isVerifiedListing =
    listing.isVerified || listing.verificationStatus === 'approved';
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

  const similarListings = listings
    .filter((item) => item.id !== listing.id)
    .slice(0, 3);

  const handleNextSlide = () => {
    if (galleryImages.length < 2) return;
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrevSlide = () => {
    if (galleryImages.length < 2) return;
    setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?listing=${encodeURIComponent(listing.id)}`;
    const shareText = `DILAAL — ${listing.title}\n${formatPrice(listing.price)} ${listing.currency}\n${listing.locationDetails}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard?.writeText(shareUrl);
    } catch {
      return;
    }
    setToastMessage(t('linkCopied', 'Link copied to clipboard'));
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  };

  const handleSubmitOffer = () => {
    if (!isOfferValid) return;
    setIsOfferModalOpen(false);
    openChatWithBroker(listing.brokerId, listing.id, offerValue);
  };

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-32">
      <div className="max-w-2xl mx-auto w-full">
        {/* Interactive Media Hero Carousel Section */}
        <div className="relative w-full aspect-[16/11] bg-surface-container overflow-hidden select-none">
          {/* Active Image */}
          <div className="w-full h-full relative">
            {galleryImages.length > 0 ? (
              <img
                alt={`Property photo ${activeSlide + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
                src={galleryImages[activeSlide]}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-high text-outline gap-2">
                <span className="material-symbols-outlined text-5xl">home_work</span>
                <span className="text-xs font-semibold">{t('noPhotos', 'No photos available')}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-primary/30 pointer-events-none"></div>
          </div>

          {/* Top Overlaid Media Controls */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            {isVerifiedListing ? (
              <div
                onClick={() => setIsDeedModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/70 backdrop-blur-md text-on-primary text-xs font-bold shadow-sm pointer-events-auto cursor-pointer hover:bg-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">verified</span>
                <span>{listing.verifiedLabel || t('verifiedTag', 'Verified')}</span>
              </div>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={handleShare}
                className="w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center shadow-sm text-on-surface active:scale-90 transition-transform cursor-pointer hover:bg-surface-container-lowest"
                title="Share Listing"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
              </button>

              <button
                onClick={() => toggleFavorite(listing.id)}
                className={`w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center shadow-sm active:scale-90 transition-transform cursor-pointer ${
                  favorites[listing.id] ? 'text-secondary' : 'text-on-surface hover:text-secondary'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: favorites[listing.id] ? "'FILL' 1" : "'FILL' 0" }}
                >
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Carousel Badges & Gallery Pill */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
            {/* Counter Badge */}
            {galleryImages.length > 0 ? (
              <div className="px-2.5 py-1 rounded-full bg-primary/80 backdrop-blur-md text-on-primary text-xs font-semibold flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                <span>{activeSlide + 1} / {galleryImages.length}</span>
              </div>
            ) : (
              <span />
            )}

            {/* Gallery Lightbox Button */}
            {galleryImages.length > 0 && (
              <button
                onClick={() => setIsGalleryModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-secondary-container hover:bg-secondary-fixed text-on-secondary-container text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform cursor-pointer"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  photo_library
                </span>
                <span>{t('gallery', 'Gallery')}</span>
              </button>
            )}
          </div>

          {/* Carousel Nav Chevrons */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={handlePrevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/50 text-on-primary flex items-center justify-center active:bg-primary/70 backdrop-blur-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] rtl:rotate-180">chevron_left</span>
              </button>
              <button
                onClick={handleNextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary/50 text-on-primary flex items-center justify-center active:bg-primary/70 backdrop-blur-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px] rtl:rotate-180">chevron_right</span>
              </button>
            </>
          )}
        </div>

        {/* Content Body */}
        <div className="px-3.5 sm:px-margin flex flex-col gap-space-md pt-space-md">
          {/* Price & Header Identity */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                  {formatPrice(listing.price)}
                </span>
                <span className="text-xs text-outline font-medium">{listing.currency}</span>
              </div>
              <div className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant text-xs font-semibold">
                {listing.priceType === 'rent' ? t('forRent', 'For Rent') : t('forSale', 'For Sale')}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-on-surface leading-tight">
              {(language === 'so' && listing.titleSo) ? listing.titleSo : listing.title}
            </h2>

            <div className="flex items-start gap-1 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5 shrink-0">
                pin_drop
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {listing.locationDetails}
              </p>
            </div>
          </div>

          {/* Verification Banner (approved listings only) */}
          {isVerifiedListing && (
            <div
              onClick={() => setIsDeedModalOpen(true)}
              className="bg-primary text-on-primary rounded-2xl p-space-sm flex items-start gap-3 shadow-sm border border-primary-fixed/20 cursor-pointer hover:bg-surface-tint transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-tint flex items-center justify-center text-primary-fixed shrink-0">
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-xs font-bold text-tertiary-fixed tracking-wide uppercase">
                  {listing.verifiedLabel || t('verifiedListing', 'Verified Listing')}
                </span>
                <p className="text-xs text-on-primary-container leading-snug mt-0.5">
                  {listing.category === 'car'
                    ? t('verifiedVehicleRecord', 'Vehicle registration record on file.')
                    : t('verifiedRegistryRecord', 'Registry record on file.')}
                  {listing.registryNumber && (
                    <>
                      {' '}
                      <strong className="text-surface-bright underline">{listing.registryNumber}</strong>
                    </>
                  )}
                  {listing.verificationEvidence?.[0]?.issuerAuthority && (
                    <> • {listing.verificationEvidence[0].issuerAuthority}</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Category Specs Highlight Grid (real values only) */}
          {specItems.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {specItems.map((spec) => (
                <div
                  key={spec.label}
                  className="bg-surface-container-low rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-outline-variant/15"
                >
                  <span className="material-symbols-outlined text-primary text-[24px]">{spec.icon}</span>
                  <span className="text-xs font-bold text-on-surface mt-1 line-clamp-1">{spec.value}</span>
                  <span className="text-[11px] text-outline font-semibold">{spec.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description & Key Features */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-on-surface">Property Overview (Faahfaahin)</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {listing.description || t('noDescription', 'No description provided.')}
            </p>

            {listing.amenities && listing.amenities.length > 0 && (
              <>
                <div className="h-px bg-surface-container-highest w-full my-1"></div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-on-surface">Key Amenities & Infrastructure:</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {listing.amenities.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-on-surface-variant text-xs">
                        <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Neighborhood Location Panel */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">Neighborhood & Proximity</h3>
              <span className="text-xs text-secondary font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Private
              </span>
            </div>

            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-surface-container-high shadow-inner flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-surface-bright/90 shadow-md flex items-center justify-center text-primary mb-2">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  location_on
                </span>
              </div>
              <span className="text-xs font-bold text-on-surface bg-surface-bright/95 px-3 py-1 rounded-full shadow-sm max-w-full truncate">
                {listing.location || listing.locationDetails || t('locationUnavailable', 'Location not provided')}
              </span>
              <p className="text-[11px] text-on-surface-variant font-medium mt-1">
                {t('exactCoordinatesHidden', 'Exact coordinates are not published publicly.')}
              </p>
            </div>
          </div>

          {/* Verified Broker Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-outline-variant/20 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-outline font-bold uppercase tracking-wider">
                {t('brokerRep', 'Listing Broker')}
              </span>
              {broker?.tier && (
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-[11px] font-bold flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-[13px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  {broker.tier}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div
                className="relative shrink-0 cursor-pointer"
                onClick={() => openBrokerProfile(listing.brokerId)}
              >
                {listing.brokerAvatar || broker?.avatar ? (
                  <img
                    alt={listing.brokerName}
                    className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-primary-fixed"
                    src={listing.brokerAvatar || broker?.avatar}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-surface-container-high text-outline flex items-center justify-center shadow-sm ring-2 ring-primary-fixed">
                    <span className="material-symbols-outlined text-[26px]">person</span>
                  </div>
                )}
                {broker?.verificationStatus === 'approved' && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow">
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <h4
                  onClick={() => openBrokerProfile(listing.brokerId)}
                  className="text-sm font-bold text-on-surface truncate cursor-pointer hover:text-primary"
                >
                  {broker?.name || listing.brokerName}
                </h4>
                {broker?.licenseNumber && (
                  <span className="text-[11px] text-outline truncate">
                    {t('license', 'License')} {broker.licenseNumber}
                  </span>
                )}
                {(brokerRating > 0 || brokerDeals > 0) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {brokerRating > 0 && (
                      <span className="flex items-center text-secondary text-xs font-bold">★ {brokerRating}</span>
                    )}
                    {brokerDeals > 0 && (
                      <span className="text-[11px] text-on-surface-variant">({brokerDeals} deals)</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => openChatWithBroker(listing.brokerId, listing.id)}
                className="h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                <span>{t('chatBroker', 'Dilaal Chat')}</span>
              </button>
              <button
                onClick={() => {
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
                className="h-10 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                <span>{t('callBroker', 'Call Desk')}</span>
              </button>
            </div>

            {/* Evidence & Report Action */}
            <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-xs">
              <button
                onClick={() => setIsDeedModalOpen(true)}
                className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>{t('viewRegistryRecord', 'View Registry Record')}</span>
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="text-outline hover:text-error flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">flag</span>
                <span>{t('reportListing', 'Report Concern')}</span>
              </button>
            </div>
          </div>

          {/* Similar Listings */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface">{t('nearYou', 'Similar Properties')}</h3>
              <button
                onClick={() => {
                  setCurrentScreen(activeTab === 'search' ? 'search' : 'home');
                }}
                className="text-xs text-primary font-bold hover:underline cursor-pointer"
              >
                {t('seeAll', 'View All')}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {similarListings.length === 0 && (
                <div className="w-full py-6 text-center text-xs text-on-surface-variant">
                  {t('noSimilarListings', 'No other listings yet.')}
                </div>
              )}
              {similarListings.map((sim) => (
                  <div
                    key={sim.id}
                    onClick={() => openListingDetails(sim.id)}
                    className="min-w-[210px] w-[210px] bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20 flex flex-col shrink-0 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="w-full h-28 relative bg-surface-container">
                      {sim.image ? (
                        <img
                          alt={sim.title}
                          className="w-full h-full object-cover"
                          src={sim.image}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-3xl">home_work</span>
                        </div>
                      )}
                      {(sim.isVerified || sim.verificationStatus === 'approved') && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-primary text-on-primary text-[10px] font-bold">
                          {t('verifiedTag', 'Verified')}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-primary">{formatPrice(sim.price)}</span>
                      <span className="text-xs font-bold text-on-surface truncate">
                        {(language === 'so' && sim.titleSo) ? sim.titleSo : sim.title}
                      </span>
                      <span className="text-[11px] text-outline">{sim.location}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Diaspora Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 z-30 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-outline-variant/20 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-3.5 sm:px-6 py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="max-w-md mx-auto flex items-center gap-2 sm:gap-2.5">
            {/* Primary CTA: Make an Offer */}
            <button
              onClick={() => {
                setOfferAmount(listing.price > 0 ? String(listing.price) : '');
                setIsOfferModalOpen(true);
              }}
              className="h-11 sm:h-12 flex-1 rounded-xl sm:rounded-2xl bg-primary-container hover:bg-tertiary-container text-on-primary text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">gavel</span>
              <span>{t('makeOffer', 'Make an Offer')}</span>
            </button>
          </div>
        </div>

        {/* Interactive Offer Bottom Sheet */}
        {isOfferModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center p-0">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-t-3xl p-4 sm:p-6 flex flex-col gap-3.5 shadow-2xl animate-in slide-in-from-bottom duration-200 border-t border-outline-variant/30 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-base font-bold text-on-surface">{t('initiateOffer', 'Submit Escrow Offer')}</span>
                  <span className="text-xs text-outline">{t('offerRecipientNote', 'Sent directly to the listing broker')}</span>
                </div>
                <button
                  onClick={() => setIsOfferModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">{t('offeredPrice', 'Your Offer Amount (USD)')}</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-primary font-bold">
                    $
                  </span>
                  <input
                    className="w-full pl-8 pr-4 py-3 bg-surface-container-low rounded-xl text-lg font-bold text-on-surface outline-none focus:bg-surface-bright border border-outline-variant/30"
                    type="number"
                    min="1"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                  />
                </div>
                <span className="text-[11px] text-outline">
                  {t('depositRequired', '10% Escrow Down Payment')}:{' '}
                  <strong className="text-primary font-bold">
                    ${Math.round((isOfferValid ? offerValue : 0) * 0.1).toLocaleString()} USD
                  </strong>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-primary/10 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                  verified_user
                </span>
                <p className="text-xs text-primary leading-tight">
                  {t('offerSharedNotice', 'Your offer is shared with the broker. Escrow steps only begin once both parties confirm terms.')}
                </p>
              </div>

              <button
                onClick={handleSubmitOffer}
                disabled={!isOfferValid}
                className={`w-full h-12 text-on-primary text-sm font-bold rounded-xl shadow transition-all ${
                  isOfferValid
                    ? 'bg-primary-container hover:bg-tertiary-container active:scale-[0.98] cursor-pointer'
                    : 'bg-surface-container-highest text-outline cursor-not-allowed'
                }`}
              >
                {t('acceptOffer', 'Confirm & Notify Seller Dilaal')}
              </button>
            </div>
          </div>
        )}

        {/* Gallery Lightbox */}
        {isGalleryModalOpen && galleryImages.length > 0 && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">photo_library</span>
                  <h4 className="text-sm font-bold text-on-surface">
                    {t('gallery', 'Gallery')}: {listing.title}
                  </h4>
                </div>
                <button
                  onClick={() => setIsGalleryModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black shadow-inner">
                <img
                  alt={`Property photo ${activeSlide + 1}`}
                  className="w-full h-full object-contain"
                  src={galleryImages[activeSlide]}
                />
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevSlide}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] rtl:rotate-180">chevron_left</span>
                    </button>
                    <button
                      onClick={handleNextSlide}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] rtl:rotate-180">chevron_right</span>
                    </button>
                  </>
                )}
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                  {activeSlide + 1} / {galleryImages.length}
                </span>
              </div>

              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="w-full py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl cursor-pointer"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        )}

        {/* Deed Certificate Modal */}
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

        {/* Report Concern Modal */}
        {isReportModalOpen && (
          <ReportModal
            targetType="listing"
            targetId={listing.id}
            targetTitle={listing.title}
            onClose={() => setIsReportModalOpen(false)}
          />
        )}

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-on-primary rounded-xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-bottom duration-200">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
};
