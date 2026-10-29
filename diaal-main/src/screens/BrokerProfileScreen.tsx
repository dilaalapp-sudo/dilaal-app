import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { fetchBrokerReviews, submitBrokerReview } from '../lib/persistence';

interface BrokerReview {
  id: string;
  name: string;
  location?: string;
  role?: string;
  stars: number;
  comment: string;
}

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

  const broker =
    brokers.find((b) => b.id === selectedBrokerId) || brokers[0];

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

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const brokerListings = broker
    ? listings.filter((item) => item.brokerId === broker.id)
    : [];
  const isVerifiedBroker = broker?.verificationStatus === 'approved';
  const hasLanguages = Boolean(broker?.languages && broker.languages.length > 0);

  if (!broker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-4 shadow-sm">
          <span className="material-symbols-outlined text-3xl">badge</span>
        </div>
        <h3 className="text-base font-bold text-on-surface">No Broker Selected</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mt-1.5 mb-6 leading-relaxed">
          Registered brokers will appear here once their profiles are added.
        </p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-2xl shadow-sm hover:bg-primary-container transition-colors cursor-pointer"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-32">
      <div className="max-w-2xl mx-auto w-full pb-12">
        {/* Top Profile Hero Section */}
        <div className="relative w-full">
          {/* Somali Geometric Emerald Pattern Cover Banner */}
          <div className="h-36 w-full bg-primary-container relative overflow-hidden flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full opacity-15"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 400 150"
            >
              <pattern id="somali-geo-pattern" patternUnits="userSpaceOnUse" width="32" height="32">
                <path d="M16 0 L32 16 L16 32 L0 16 Z" fill="none" stroke="#95d3ba" strokeWidth="1.2" />
                <circle cx="16" cy="16" r="3.5" fill="#ffdcc3" />
                <path
                  d="M0 0 L8 8 M24 24 L32 32 M32 0 L24 8 M8 24 L0 32"
                  stroke="#95d3ba"
                  strokeWidth="0.8"
                />
              </pattern>
              <rect width="100%" height="100%" fill="url(#somali-geo-pattern)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
          </div>

          {/* Profile Identity Header Overlap */}
          <div className="px-3.5 sm:px-gutter -mt-14 relative z-10 flex flex-col items-start">
            <div className="relative">
              {/* Avatar Wrapper */}
              <div className="w-24 h-24 rounded-full p-1 bg-surface-container-lowest shadow-md relative">
                {broker.avatar ? (
                  <img
                    alt={broker.name}
                    className="w-full h-full rounded-full object-cover"
                    src={broker.avatar}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-surface-container-high text-outline flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                )}
                {/* Verified Badge Overlap */}
                {isVerifiedBroker && (
                  <div
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md ring-2 ring-surface-container-lowest"
                    title={t('verifiedBroker', 'Verified Broker')}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Trust Ribbon & Verified Shield */}
            {isVerifiedBroker && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-primary">
                  <span
                    className="material-symbols-outlined text-[16px] text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    verified
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {t('verifiedBroker', 'Verified Broker')}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  <span>Xaqiijiyey</span>
                </div>
              </div>
            )}

            {/* Name & Title */}
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface mt-2 tracking-tight">
              {broker.name}
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5 font-medium">
              {broker.title}
            </p>

            {/* License & Registration (real data only) */}
            {(broker.licenseNumber || broker.licenseAuthority) && (
              <div className="mt-2.5 w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low text-on-surface border border-outline-variant/20 shadow-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">account_balance</span>
                <span className="text-xs text-on-surface truncate">
                  {broker.licenseAuthority}
                  {broker.licenseNumber && (
                    <>
                      {' '}
                      <strong className="text-primary font-bold">{broker.licenseNumber}</strong>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Trust & Performance Scorecard (4-Metric Bento Grid) */}
        <div className="px-3.5 sm:px-gutter mt-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm">
            {/* Metric 1: Trust Score */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between border border-outline-variant/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Trust Score</span>
                <span
                  className="material-symbols-outlined text-[18px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary">{broker.trustScore}%</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed font-bold">
                  {broker.tier}
                </span>
              </div>
            </div>

            {/* Metric 2: Closed Deals */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between border border-outline-variant/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Closed Deals</span>
                <span className="material-symbols-outlined text-[18px] text-primary">handshake</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-on-surface">{broker.deals}</span>
                <span className="text-xs text-on-surface-variant font-medium">Escrows</span>
              </div>
            </div>

            {/* Metric 3: Rating */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between border border-outline-variant/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Rating</span>
                <span
                  className="material-symbols-outlined text-[18px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-on-surface">{broker.rating}</span>
                <span className="text-xs text-on-surface-variant">({broker.reviewsCount} reviews)</span>
              </div>
            </div>

            {/* Metric 4: Avg Response */}
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col justify-between border border-outline-variant/15">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-on-surface-variant">Avg Response</span>
                <span className="material-symbols-outlined text-[18px] text-primary">bolt</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-primary-container">{broker.responseTime || '—'}</span>
                <span className={`text-[11px] font-bold ${broker.isOnline ? 'text-primary' : 'text-outline'}`}>
                  {broker.isOnline ? t('online', 'Online') : t('offline', 'Offline')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Languages & Reach (rendered from real fields) */}
        {(hasLanguages || broker.coverage || broker.diasporaCoverage) && (
          <div className="px-3.5 sm:px-gutter mt-4 flex flex-col gap-2.5">
            {hasLanguages && (
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">translate</span>
                  <span className="text-xs font-bold uppercase tracking-wide">Supported Languages</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {broker.languages.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-surface-container text-xs font-semibold text-on-surface"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(broker.coverage || broker.diasporaCoverage) && (
              <div className="p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                  <span className="text-xs font-bold uppercase tracking-wide">Regional & Diaspora Reach</span>
                </div>
                <div className="flex items-start gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">location_on</span>
                  <p className="text-xs leading-relaxed text-on-surface">
                    {broker.coverage && <strong>{broker.coverage}</strong>}
                    {broker.coverage && broker.diasporaCoverage && <br />}
                    {broker.diasporaCoverage && <strong>{broker.diasporaCoverage}</strong>}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action CTAs */}
        <div className="px-3.5 sm:px-gutter mt-4 flex flex-col gap-2">
          <button
            onClick={() => openChatWithBroker(broker.id)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-primary text-on-primary flex items-center justify-center gap-2 shadow-md hover:bg-surface-tint active:scale-[0.99] transition-all cursor-pointer font-bold text-xs"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span>Contact Dilaal (La Xiriir)</span>
          </button>
          <button
            onClick={() => setIsEscrowModalOpen(true)}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center gap-2 hover:bg-secondary-fixed-dim transition-colors cursor-pointer font-bold text-xs"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">verified_user</span>
            <span>Request Escrow Deal</span>
          </button>
        </div>

        {/* Interactive Tab Switcher */}
        <div className="px-3.5 sm:px-gutter mt-6">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <button
              onClick={() => setActiveTab('listings')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'listings'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Active Listings ({brokerListings.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Client Reviews ({broker.reviewsCount})
            </button>
            <button
              onClick={() => setActiveTab('credentials')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Credentials
            </button>
          </div>
        </div>

        {/* Tab 1: Active Listings Grid */}
        {activeTab === 'listings' && (
          <div className="px-3.5 sm:px-gutter mt-4">
            {brokerListings.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-outline">home_work</span>
                <p className="text-xs font-bold text-on-surface">{t('noBrokerListings', 'No active listings')}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {t('noBrokerListingsDesc', 'This broker has not published any listings yet.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {brokerListings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openListingDetails(item.id)}
                    className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-28 w-full bg-surface-container">
                      {item.image ? (
                        <img
                          alt={item.title}
                          className="w-full h-full object-cover"
                          src={item.image}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-outline">
                          <span className="material-symbols-outlined text-3xl">home_work</span>
                        </div>
                      )}
                      {(item.isVerified || item.verificationStatus === 'approved') && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-primary/90 text-surface text-[10px] font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">verified</span> Verified
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-surface/90 text-on-surface text-[10px] font-semibold">
                        {item.category}
                      </span>
                    </div>
                    <div className="p-2.5 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-on-surface truncate">{item.title}</h3>
                        {item.location && (
                          <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">location_on</span>{' '}
                            {item.location.split(',')[0]}
                          </p>
                        )}
                      </div>
                      <div className="mt-2.5 pt-2 flex items-baseline justify-between bg-surface-container-low px-2 py-1 rounded-lg">
                        <span className="text-xs font-bold text-primary">{formatPrice(item.price)}</span>
                        <span className="text-[10px] text-on-surface-variant">{item.currency}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reviews */}
        {activeTab === 'reviews' && (
          <div className="px-gutter mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">{t('clientReviews', 'Client Reviews')}</span>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-xs cursor-pointer hover:bg-tertiary-container"
              >
                + {t('writeReview', 'Write a Review')}
              </button>
            </div>

            {reviewsList.length === 0 && (
              <div className="py-10 px-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-outline">reviews</span>
                <p className="text-xs font-bold text-on-surface">{t('noReviewsYet', 'No reviews yet')}</p>
                <p className="text-[11px] text-on-surface-variant">
                  {t('noReviewsYetDesc', 'Be the first to share your experience with this broker.')}
                </p>
              </div>
            )}

            {reviewsList.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                      {rev.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-on-surface">{rev.name}</h4>
                        {rev.location && (
                          <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-[10px] font-semibold text-on-surface-variant">
                            {rev.location}
                          </span>
                        )}
                      </div>
                      {rev.role && <span className="text-[11px] text-on-surface-variant">{rev.role}</span>}
                    </div>
                  </div>
                  <div className="flex text-secondary">
                    {[...Array(rev.stars)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-[16px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-on-surface italic bg-surface-container-low p-3 rounded-xl leading-relaxed border border-outline-variant/15">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Credentials (real fields only) */}
        {activeTab === 'credentials' && (
          <div className="px-gutter mt-4 flex flex-col gap-3">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">verified</span>
                <h4 className="text-sm font-bold text-on-surface">{t('credentials', 'Credentials')}</h4>
              </div>

              <div className="flex flex-col gap-2.5">
                {(broker.licenseAuthority || broker.licenseNumber) && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">policy</span>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {broker.licenseAuthority || t('brokerLicense', 'Broker License')}
                      </span>
                      {broker.licenseNumber && (
                        <span className="text-[11px] text-on-surface-variant">
                          {t('licenseNumber', 'License number')}: {broker.licenseNumber}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                    verified_user
                  </span>
                  <div>
                    <span className="text-xs font-bold text-on-surface block">
                      {t('verificationStatus', 'Verification Status')}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">{broker.verificationStatus}</span>
                  </div>
                </div>

                {broker.coverage && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">location_on</span>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {t('coverage', 'Coverage')}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{broker.coverage}</span>
                    </div>
                  </div>
                )}

                {broker.diasporaCoverage && (
                  <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/15 flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">public</span>
                    <div>
                      <span className="text-xs font-bold text-on-surface block">
                        {t('diasporaCoverage', 'Diaspora Coverage')}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{broker.diasporaCoverage}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Write Review Modal */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface">{t('writeReview', 'Write a Review')}</h3>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleAddReview} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">Your Rating</label>
                  <div className="flex items-center gap-1 text-secondary">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="cursor-pointer"
                      >
                        <span
                          className="material-symbols-outlined text-[24px]"
                          style={{
                            fontVariationSettings: star <= reviewRating ? "'FILL' 1" : "'FILL' 0",
                          }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface">Your Experience</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe transaction speed, deed registration clarity, notary experience..."
                    className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs outline-none focus:bg-surface-bright"
                  />
                </div>

                {reviewError && (
                  <p className="text-[11px] font-semibold text-error">{reviewError}</p>
                )}

                <button
                  type="submit"
                  disabled={isReviewSubmitting}
                  className="w-full py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl shadow cursor-pointer hover:bg-tertiary-container transition-colors disabled:opacity-70"
                >
                  {isReviewSubmitting
                    ? t('saving', 'Saving...')
                    : t('submitReview', 'Submit Review')}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Escrow Request Modal */}
        {isEscrowModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-on-surface">Initiate Escrow Representation</h3>
                <button
                  onClick={() => setIsEscrowModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Start a direct conversation with <strong>{broker.name}</strong> about escrow representation
                and title inspection.
              </p>
              <button
                onClick={() => {
                  setIsEscrowModalOpen(false);
                  openChatWithBroker(broker.id);
                }}
                className="w-full py-3 bg-primary-container text-on-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-tertiary-container transition-colors"
              >
                Start Direct Negotiation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
