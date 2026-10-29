import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Language, Currency, CountryCode, UserRole, AreaUnit } from '../types';
import { SUPPORTED_COUNTRIES } from '../data/countries';

export const ProfileScreen: React.FC = () => {
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    isDarkMode,
    toggleDarkMode,
    setCurrentScreen,
    listings,
    favorites,
    toggleFavorite,
    openListingDetails,
    setSearchFilter,
    setActiveTab,
    userRole,
    setUserRole,
    selectedCountry,
    setSelectedCountry,
    areaUnit,
    setAreaUnit,
    escrowDeal,
    savedSearches,
    saveCurrentSearch,
    deleteSavedSearch,
    currentUser,
    setCurrentUser,
    logout,
    authUserId,
    myBrokerId,
    t,
  } = useApp();

  // Real, context-backed profile values (no fabricated defaults)
  const isStaff = currentUser?.role === 'reviewer' || currentUser?.role === 'admin';
  const kycStatus = currentUser?.kycStatus || 'unverified';
  const displayName = currentUser?.name?.trim() || t('guestUser', 'Guest user');
  const locationLabel = currentUser?.location?.trim() || t('notProvided', 'Not provided');
  const phoneLabel = currentUser?.phone?.trim() || t('notProvided', 'Not provided');
  const roleLabel =
    currentUser?.role === 'broker'
      ? t('roleBroker', 'Broker')
      : currentUser?.role === 'seller'
      ? t('roleSeller', 'Seller')
      : currentUser?.role === 'reviewer'
      ? t('roleReviewer', 'Reviewer')
      : currentUser?.role === 'admin'
      ? t('roleAdmin', 'Admin')
      : currentUser?.role === 'buyer'
      ? t('roleBuyer', 'Buyer')
      : t('roleGuest', 'Guest');
  const kycLabel =
    kycStatus === 'approved'
      ? t('statusVerified', 'Verified')
      : kycStatus === 'pending'
      ? t('statusPending', 'Pending')
      : t('statusUnverified', 'Unverified');
  const initials = currentUser?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '';

  // Modal Visibility States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSavedListingsOpen, setIsSavedListingsOpen] = useState(false);
  const [isSavedSearchesModalOpen, setIsSavedSearchesModalOpen] = useState(false);
  const [isMyListingsModalOpen, setIsMyListingsModalOpen] = useState(false);
  const [isTrustCenterOpen, setIsTrustCenterOpen] = useState(false);
  const [isCharterOpen, setIsCharterOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isConciergeModalOpen, setIsConciergeModalOpen] = useState(false);

  // Edit Profile Form State (bound to currentUser)
  const [editForm, setEditForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    location: currentUser?.location || '',
  });

  // Custom Avatar / Photo (starts empty: initials or neutral icon until user supplies one)
  const [userPic, setUserPic] = useState<string>('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Async States & Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newSearchQuery, setNewSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  const savedListings = listings.filter((l) => favorites[l.id]);
  const userListings = listings.filter(
    (l) =>
      (authUserId && l.ownerId === authUserId) ||
      (myBrokerId && l.brokerId === myBrokerId)
  );

  const handleAlertClick = (query: string) => {
    setSearchFilter((prev) => ({
      ...prev,
      query,
    }));
    setActiveTab('search');
    setCurrentScreen('search');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setCurrentUser((prev) => ({
      ...prev,
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim() || undefined,
      location: editForm.location.trim() || undefined,
    }));
    setIsEditProfileOpen(false);
    showToast(t('profileUpdatedMsg', 'Profile information updated'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomAvatarUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const hasActiveDeal = Boolean(escrowDeal && escrowDeal.dealNumber && escrowDeal.dealNumber.trim() !== '');

  return (
    <div className="flex flex-col w-full bg-surface font-sans text-on-surface pb-36">
      <div className="max-w-2xl mx-auto w-full px-3.5 sm:px-gutter pt-3 sm:pt-4 pb-8 flex flex-col gap-4">
        
        {/* Profile Identity Header */}
        <div className="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center relative overflow-hidden">
          {/* Ambient emerald aura */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary-fixed/20 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-secondary-fixed/20 blur-2xl pointer-events-none"></div>

          {/* Edit Profile Top Right Action */}
          <button
            type="button"
            onClick={() => {
              setEditForm({
                name: currentUser?.name || '',
                email: currentUser?.email || '',
                phone: currentUser?.phone || '',
                location: currentUser?.location || '',
              });
              setIsEditProfileOpen(true);
            }}
            className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/20"
            title="Edit Profile"
          >
            <span className="material-symbols-outlined text-[15px] text-primary">edit</span>
            <span className="hidden xs:inline">Edit</span>
          </button>

          {/* Avatar with edit trigger */}
          <div className="relative mb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-md bg-primary-fixed ring-2 ring-primary-fixed flex items-center justify-center">
              {userPic ? (
                <img
                  alt={displayName}
                  className="w-full h-full object-cover"
                  src={userPic}
                />
              ) : initials ? (
                <span className="text-2xl sm:text-3xl font-bold text-primary">{initials}</span>
              ) : (
                <span className="material-symbols-outlined text-[38px] text-primary">person</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomAvatarUrl(userPic);
                setIsAvatarModalOpen(true);
              }}
              aria-label="Change photo"
              className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer hover:bg-tertiary-container"
            >
              <span className="material-symbols-outlined text-[15px] sm:text-[16px]">photo_camera</span>
            </button>
          </div>

          {/* Names & Title */}
          <h1 className="text-base sm:text-xl font-bold text-on-surface tracking-tight">
            {displayName}
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5 font-medium">
            {roleLabel} • {locationLabel}
          </p>

          {/* KYC Status Badge */}
          <button
            type="button"
            onClick={() => setIsTrustCenterOpen(true)}
            className={`mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs cursor-pointer transition-colors ${
              kycStatus === 'approved'
                ? 'bg-primary-fixed text-primary hover:bg-primary-fixed-dim'
                : kycStatus === 'pending'
                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span
              className="material-symbols-outlined text-[15px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {kycStatus === 'approved' ? 'verified_user' : kycStatus === 'pending' ? 'hourglass_top' : 'shield_person'}
            </span>
            <span>
              {kycStatus === 'approved'
                ? t('kycVerifiedBadge', 'Identity Verified')
                : kycStatus === 'pending'
                ? t('kycPendingBadge', 'Verification Pending')
                : t('kycUnverifiedBadge', 'Identity Not Verified')}
            </span>
            <span className="material-symbols-outlined text-[15px] rtl:rotate-180">chevron_right</span>
          </button>
        </div>

        {/* Quick Stats Bento Strip (All Interactive) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Saved Assets */}
          <button
            type="button"
            onClick={() => setIsSavedListingsOpen(true)}
            className="bg-surface-container-lowest rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-outline-variant/15 cursor-pointer hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <span className="text-xl font-bold text-primary-container leading-none">
              {savedListings.length}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1.5 leading-tight font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-primary">bookmark</span>
              {t('savedHomes', 'Saved Assets')}
            </span>
          </button>

          {/* 2. Active Escrow Deal */}
          <button
            type="button"
            onClick={() => setCurrentScreen('deal')}
            className="bg-surface-container-lowest rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-outline-variant/15 cursor-pointer hover:border-primary/40 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-1">
              <span className="text-xl font-bold text-primary-container leading-none">
                {hasActiveDeal ? '1' : '0'}
              </span>
              {hasActiveDeal && (
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse"></span>
              )}
            </div>
            <span className="text-[11px] text-primary font-bold mt-1.5 leading-tight truncate max-w-full">
              {hasActiveDeal ? escrowDeal.dealNumber : t('activeDealsTitle', 'Active Deals')}
            </span>
          </button>

          {/* 3. Listed Assets */}
          <button
            type="button"
            onClick={() => setIsMyListingsModalOpen(true)}
            className="bg-surface-container-lowest rounded-2xl p-3 flex flex-col items-center justify-center text-center shadow-xs border border-outline-variant/15 cursor-pointer hover:bg-surface-container-low active:scale-95 transition-all"
          >
            <span className="text-xl font-bold text-primary-container leading-none">
              {userListings.length}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1.5 leading-tight font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-secondary">add_business</span>
              {t('myListings', 'My Listings')}
            </span>
          </button>
        </div>

        {/* Escrow Protection Banner */}
        <div className="bg-primary-container text-on-primary rounded-3xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden border border-primary-fixed/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-surface-container-lowest/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-primary-fixed">gavel</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-bold text-surface-bright truncate">
                {t('shariaSovereignEscrow', 'Escrow Deal')}
              </span>
              <span className="text-[11px] text-on-primary-container leading-tight">
                {hasActiveDeal
                  ? t('dealProtectedInTrust', 'Review milestones and payment status')
                  : t('escrowProtectedSub', 'Payment status is recorded against your active deal')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setCurrentScreen('deal')}
            className="px-3.5 py-2 rounded-xl bg-surface-container-lowest text-primary-container text-xs font-bold shrink-0 active:scale-95 transition-transform shadow-xs cursor-pointer hover:bg-surface"
            type="button"
          >
            {hasActiveDeal ? t('trackDeal', 'Track Deal') : t('inspect', 'Inspect')}
          </button>
        </div>

        {/* Group: Portfolio & Activity */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
            {t('portfolioActivity', 'Portfolio & Activity')}
          </span>

          {/* Saved Listings */}
          <button
            type="button"
            onClick={() => setIsSavedListingsOpen(true)}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">bookmark</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('savedListings', 'Saved Listings')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {language === 'so' ? 'Hantida La Keydiyey' : language === 'ar' ? 'الأصول المحفوظة' : 'Bookmarked assets'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary text-xs font-bold">
                {savedListings.length}
              </span>
              <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
            </div>
          </button>

          {/* Saved Searches & Alerts */}
          <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsSavedSearchesModalOpen(true)}
              className="flex items-center justify-between gap-3 text-left w-full cursor-pointer hover:opacity-90"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-secondary">
                  <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                    {t('savedSearchesAndAlerts', 'Saved Searches & Alerts')}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{t('manageAlerts', 'Manage alert notifications')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant">
                  {savedSearches.length}
                </span>
                <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
              </div>
            </button>
          </div>
        </div>

        {/* Group: Role & Market Configuration */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-outline">
              {t('roleMarketConfig', 'Role & Market Configuration')}
            </span>
            <span className="text-[10px] text-primary font-bold bg-primary-fixed/30 px-2 py-0.5 rounded-full">
              {t('preferences', 'Preferences')}
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 shadow-xs border border-outline-variant/15 flex flex-col gap-5">
            {/* 1. Platform Persona / Role */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-fixed/40 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[19px]">badge</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-bold text-on-surface">
                      {t('platformRole', 'Platform Role')}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {t('switchPerspective', 'Switch market capabilities & perspective')}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-primary text-on-primary shrink-0 shadow-xs">
                  {userRole === 'buyer'
                    ? t('roleBuyer', 'Buyer')
                    : userRole === 'seller'
                    ? t('roleSeller', 'Seller')
                    : userRole === 'broker'
                    ? t('roleBroker', 'Broker')
                    : userRole === 'reviewer'
                    ? t('roleReviewer', 'Reviewer')
                    : t('roleGuest', 'Guest')}
                </span>
              </div>

              {/* Persona selector pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                {[
                  { id: 'buyer', label: t('roleBuyer', 'Buyer / Investor'), icon: 'person' },
                  { id: 'seller', label: t('roleSeller', 'Property Owner'), icon: 'home' },
                  { id: 'broker', label: t('roleBroker', 'Licensed Broker'), icon: 'badge' },
                  ...(isStaff
                    ? [{ id: 'reviewer', label: t('roleReviewer', 'Cadastre Auditor'), icon: 'gavel' }]
                    : []),
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setUserRole(item.id as UserRole);
                      showToast(`Switched perspective to: ${item.label}`);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      userRole === item.id
                        ? 'bg-primary text-on-primary shadow-xs font-bold'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{item.icon}</span>
                    <span className="truncate">{item.label.split('/')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px w-full bg-outline-variant/15" />

            {/* 2. Target Market Jurisdiction */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed/40 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">public</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-bold text-on-surface">
                    {t('targetJurisdiction', 'Target Market Jurisdiction')}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {t('targetJurisdictionSub', 'Cadastral authority & deed verification rules')}
                  </span>
                </div>
              </div>

              {/* Styled Country selector with Flag and Authority */}
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    const nextCountry = e.target.value as CountryCode;
                    setSelectedCountry(nextCountry);
                    showToast(`Jurisdiction set to: ${SUPPORTED_COUNTRIES[nextCountry]?.name || nextCountry}`);
                  }}
                  className="w-full appearance-none px-3.5 py-3 pr-10 rtl:pr-3.5 rtl:pl-10 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs sm:text-sm font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all shadow-xs"
                >
                  {Object.values(SUPPORTED_COUNTRIES).map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} — {country.registryAuthority}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 flex items-center px-3.5 text-outline">
                  <span className="material-symbols-outlined text-[18px]">unfold_more</span>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-outline-variant/15" />

            {/* 3. Measurement Unit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-fixed/40 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">straighten</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-on-surface">
                    {t('measurementUnit', 'Measurement Unit')}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    {areaUnit === 'sqm' ? t('metricSystem', 'Square Meters (m² - Metric system)') : t('imperialSystem', 'Square Feet (sqft - Imperial system)')}
                  </span>
                </div>
              </div>

              {/* Unit Toggle Buttons */}
              <div className="flex gap-1 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/20 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAreaUnit('sqm');
                    showToast('Unit changed to square meters (m²)');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    areaUnit === 'sqm'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>m²</span>
                  <span className="text-[10px] opacity-80">(Metric)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAreaUnit('sqft');
                    showToast('Unit changed to square feet (sqft)');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    areaUnit === 'sqft'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span>sqft</span>
                  <span className="text-[10px] opacity-80">(Imperial)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Group: Compliance, Safety & Support */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
            {t('complianceSafetySupport', 'Compliance, Safety & Support')}
          </span>

          {/* Reviewer / Admin Hub — staff only */}
          {isStaff && (
            <button
              type="button"
              onClick={() => setCurrentScreen('admin')}
              className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[20px]">fact_check</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                    {t('complianceHub', 'Compliance & Reviewer Hub')}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">{t('complianceHubSub', 'Title deed audits & moderation queue')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
            </button>
          )}

          {/* Safety & Dispute Center */}
          <button
            type="button"
            onClick={() => setCurrentScreen('safety')}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">shield_with_heart</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('safetyDisputesDesk', 'Safety, Disputes & Support Desk')}
                </span>
                <span className="text-[11px] text-on-surface-variant">{t('safetyDisputesSub', 'Mediation, ticket desk & safety rules')}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
          </button>

          {/* Legal, Privacy & Google Play Data Safety */}
          <button
            type="button"
            onClick={() => setCurrentScreen('legal')}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('legalPrivacySafety', 'Legal, Privacy & Data Safety')}
                </span>
                <span className="text-[11px] text-on-surface-variant">{t('legalPrivacySub', 'Terms, data export & account purge')}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
          </button>

        </div>

        {/* Group: Preferences & Currency */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
            {t('systemPreferences', 'System Preferences')}
          </span>

          {/* 1. Language Switcher */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsLangModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsLangModalOpen(true);
              }
            }}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 hover:bg-surface-container-low active:scale-[0.99] transition-all text-left cursor-pointer select-none"
            title="Change interface language"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">language</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('interfaceLanguage', 'Interface Language')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {language === 'so'
                    ? 'Af-Soomaali, English & العربية'
                    : language === 'ar'
                    ? 'العربية، الصومالية، الإنجليزية'
                    : 'English, Af-Soomaali & العربية'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-[11px] font-bold">
                {language === 'so' ? 'Soomaali' : language === 'ar' ? 'العربية' : 'English'}
              </span>
              <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
            </div>
          </div>

          {/* 2. Currency Switcher */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsCurrencyModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsCurrencyModalOpen(true);
              }
            }}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 hover:bg-surface-container-low active:scale-[0.99] transition-all text-left cursor-pointer select-none"
            title="Change default display currency"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('preferredCurrency', 'Preferred Currency')}
                </span>
                <span className="text-[11px] text-on-surface-variant">USD, GBP, EUR, AED, SOS, SLSH</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface text-[11px] font-bold">
                {currency}
              </span>
              <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
            </div>
          </div>

          {/* 3. Dark Mode Toggle */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              toggleDarkMode();
              showToast(isDarkMode ? 'Light mode enabled' : 'Dark mode enabled');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDarkMode();
                showToast(isDarkMode ? 'Light mode enabled' : 'Dark mode enabled');
              }
            }}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 hover:bg-surface-container-low active:scale-[0.99] transition-all text-left cursor-pointer select-none"
            title="Toggle Dark Mode"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">
                  {isDarkMode ? 'dark_mode' : 'light_mode'}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('darkMode', 'Dark Mode')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {language === 'so'
                    ? isDarkMode
                      ? 'Daaran (Dark Mode)'
                      : 'Damsan (Light Mode)'
                    : language === 'ar'
                    ? isDarkMode
                      ? 'مفعل (Dark Mode)'
                      : 'معطل (Light Mode)'
                    : isDarkMode
                    ? 'Active (Dark Theme)'
                    : 'Inactive (Light Theme)'}
                </span>
              </div>
            </div>

            <div
              role="switch"
              aria-checked={isDarkMode}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none ${
                isDarkMode ? 'bg-primary-container' : 'bg-outline-variant'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-container-lowest shadow-md transition-transform flex items-center justify-center ${
                  isDarkMode ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                }`}
              >
                {isDarkMode && (
                  <span className="material-symbols-outlined text-[14px] text-primary-container">
                    check
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Group: Legal & Concierge */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
            {t('legalConcierge', 'Legal & Concierge')}
          </span>

          {/* Legal Charter */}
          <button
            type="button"
            onClick={() => setIsCharterOpen(true)}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container-low transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-surface-container flex items-center justify-center shrink-0 text-primary-container">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('legalCharter', 'Legal & Privacy')}
                </span>
                <span className="text-[11px] text-on-surface-variant">{t('legalCharterSubReal', 'Platform terms & privacy')}</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px] shrink-0 rtl:rotate-180">
              chevron_right
            </span>
          </button>

          {/* Support Desk */}
          <button
            type="button"
            onClick={() => setIsConciergeModalOpen(true)}
            className="w-full bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-outline-variant/15 flex items-center justify-between gap-3 hover:bg-surface-container-low transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[20px]">support_agent</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                  {t('conciergeDesk', 'Dilaal Concierge Desk')}
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {t('supportDeskSub', 'Contact support for help with your account')}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px] shrink-0 rtl:rotate-180">
              chevron_right
            </span>
          </button>
        </div>

        {/* Sign Out Button (Replaces window.confirm with Custom Modal) */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <button
            onClick={() => setIsSignOutModalOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-error-container text-on-error-container text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-xs cursor-pointer hover:bg-error-container/80"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{t('signOut', 'Sign Out')}</span>
          </button>
          <div className="flex flex-col items-center text-center mt-1">
            <span className="text-[11px] text-outline font-semibold">
              {t('versionInfo', 'DILAAL App')}
            </span>
            <span className="text-[10px] text-outline/80 mt-0.5">
              {SUPPORTED_COUNTRIES[selectedCountry]?.registryAuthority || ''}
            </span>
          </div>
        </div>

        {/* ================= MODALS & DRAWERS ================= */}

        {/* 1. Edit Profile Modal */}
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">manage_accounts</span>
                  <h3 className="text-sm font-bold text-on-surface">Edit Profile Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    {t('fullNameLabel', 'Full Legal Name')}
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-on-surface outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      {t('emailLabel', 'Email Address')}
                    </label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-on-surface outline-none focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      {t('phoneLabel', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-on-surface outline-none focus:border-primary text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                    {t('primaryLocationLabel', 'Primary Location')}
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-on-surface outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs font-bold text-on-surface hover:bg-surface-container-high cursor-pointer"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary-container cursor-pointer"
                  >
                    {t('saveChanges', 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Saved Searches & Alerts Modal */}
        {isSavedSearchesModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">notifications_active</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('savedSearchesAndAlerts', 'Saved Searches & Alerts')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSavedSearchesModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Add New Quick Alert */}
              <div className="p-3 rounded-2xl bg-surface-container flex flex-col gap-2">
                <span className="text-[11px] font-bold text-on-surface">Create New Market Alert:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSearchQuery}
                    onChange={(e) => setNewSearchQuery(e.target.value)}
                    placeholder={t('searchAlertPlaceholder', 'Search keyword or location')}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-xs outline-none focus:border-primary text-on-surface"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSearchQuery.trim()) return;
                      saveCurrentSearch(newSearchQuery.trim());
                      setNewSearchQuery('');
                      showToast('New search alert saved');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shrink-0 cursor-pointer hover:bg-primary-container"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* List of active alerts */}
              {savedSearches.length > 0 ? (
                <div className="space-y-2">
                  {savedSearches.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => {
                          setIsSavedSearchesModalOpen(false);
                          handleAlertClick(s.query || s.name);
                        }}
                        className="flex-1 cursor-pointer min-w-0"
                      >
                        <h4 className="text-xs font-bold text-on-surface truncate">{s.name}</h4>
                        <p className="text-[10px] text-on-surface-variant truncate">
                          {s.query ? `Query: "${s.query}"` : 'All matches in category'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSavedSearchesModalOpen(false);
                            handleAlertClick(s.query || s.name);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary text-[10px] font-bold cursor-pointer"
                        >
                          Run
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteSavedSearch(s.id);
                            showToast('Alert removed');
                          }}
                          className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-error hover:bg-error-container cursor-pointer"
                          title="Delete alert"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-outline text-xs">
                  {t('noSavedSearchesDesc', 'No saved searches yet. Add a query above to save it here.')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. My Listings Modal */}
        {isMyListingsModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">real_estate_agent</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('myListings', 'My Listed Properties')} ({userListings.length})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMyListingsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {userListings.length > 0 ? (
                <div className="space-y-2.5">
                  {userListings.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setIsMyListingsModalOpen(false);
                        openListingDetails(l.id);
                      }}
                      className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      {l.image ? (
                        <img
                          alt={l.title}
                          src={l.image}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-outline">
                          <span className="material-symbols-outlined text-[22px]">home_work</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-on-surface truncate">{(language === 'so' && l.titleSo) ? l.titleSo : l.title}</h4>
                        <p className="text-[10px] text-outline truncate">{l.location}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-primary">${l.price.toLocaleString()}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary-fixed text-primary">
                            {l.verificationStatus || 'published'}
                          </span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline text-[18px] rtl:rotate-180">chevron_right</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-3xl">add_home_work</span>
                  <p className="text-xs text-on-surface font-bold">{t('noPropertiesListed', 'No Properties Listed Yet')}</p>
                  <p className="text-[11px] text-on-surface-variant max-w-xs">
                    {language === 'so'
                      ? 'Weli ma aadan soo gelin wax hanti ah xogtaada Supabase.'
                      : language === 'ar'
                      ? 'لم تقم بنشر أي عقارات في قاعدة بيانات سوبابيز حتى الآن.'
                      : 'You have not published any properties to your live Supabase database yet.'}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMyListingsModalOpen(false);
                  setActiveTab('post');
                  setCurrentScreen('post');
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary-container flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                {t('postNewProperty', 'Post a New Property')}
              </button>
            </div>
          </div>
        )}

        {/* 4. Saved Listings Modal */}
        {isSavedListingsOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">bookmark</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('savedHomes', 'Saved Assets')} ({savedListings.length})</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSavedListingsOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {savedListings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {savedListings.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        setIsSavedListingsOpen(false);
                        openListingDetails(l.id);
                      }}
                      className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between gap-3 cursor-pointer hover:bg-surface-container transition-colors"
                    >
                      {l.image ? (
                        <img
                          alt={l.title}
                          src={l.image}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-outline">
                          <span className="material-symbols-outlined text-[22px]">home_work</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-on-surface truncate">{(language === 'so' && l.titleSo) ? l.titleSo : l.title}</h4>
                        <p className="text-[10px] text-outline truncate">{l.location}</p>
                        <span className="text-xs font-bold text-primary">${l.price.toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(l.id);
                          showToast('Listing removed from saved');
                        }}
                        className="text-error hover:scale-110 p-1 cursor-pointer"
                        title="Remove"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-outline text-3xl">favorite_border</span>
                  <p className="text-xs text-outline">{t('noResultsFound', 'No saved properties yet.')}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavedListingsOpen(false);
                      setActiveTab('search');
                      setCurrentScreen('search');
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
                  >
                    {t('browseListings', 'Browse Listings')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Trust Center Modal */}
        {isTrustCenterOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">shield</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('identityKyc', 'Identity & KYC Verification')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTrustCenterOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                    <div className="min-w-0">
                      <span className="font-bold block">{t('identityKyc', 'Identity & KYC Verification')}</span>
                      <span className="text-[10px] text-outline block truncate">
                        {currentUser?.email?.trim() || t('notProvided', 'Not provided')}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold shrink-0 ${
                      kycStatus === 'approved'
                        ? 'text-primary'
                        : kycStatus === 'pending'
                        ? 'text-tertiary'
                        : 'text-outline'
                    }`}
                  >
                    {kycLabel}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[18px]">call</span>
                    <div className="min-w-0">
                      <span className="font-bold block">{t('phoneLabel', 'Phone Number')}</span>
                      <span className="text-[10px] text-outline block truncate">{phoneLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-tertiary text-[18px]">location_on</span>
                    <div className="min-w-0">
                      <span className="font-bold block">{t('primaryLocationLabel', 'Primary Location')}</span>
                      <span className="text-[10px] text-outline block truncate">{locationLabel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-outline leading-relaxed">
                {t('kycDocsNone', 'No verification documents are on file for this account.')}
              </p>

              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsTrustCenterOpen(false)}
                  className="w-full py-2.5 bg-primary-container text-on-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-tertiary-container"
                >
                  {t('closeTrustCenter', 'Close Trust Center')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. Legal Charter Modal */}
        {isCharterOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-md w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3 max-h-[80vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">description</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('trustCharterHeader', 'Legal & Privacy')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCharterOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="space-y-3 text-xs text-on-surface leading-relaxed">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <p className="text-on-surface-variant text-[11px]">
                    {t(
                      'charterNoRecords',
                      'No personalized charter, notarization, or escrow clearance records are on file for this account. Platform terms and privacy details are published on the Legal & Privacy screen.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCharterOpen(false);
                    setCurrentScreen('legal');
                  }}
                  className="flex-1 py-2.5 bg-primary-container text-on-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-tertiary-container"
                >
                  {t('openLegalPrivacy', 'Open Legal & Privacy')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. Language Selection Modal */}
        {isLangModalOpen && (
          <div
            onClick={() => setIsLangModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-3 border border-outline-variant/20 animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-1 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">language</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('selectLanguage', 'Select Language')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLangModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'so', label: 'Af-Soomaali', sub: 'Soomaali (Dalka & Qurbaha)' },
                  { id: 'en', label: 'English', sub: 'Global Diaspora Edition' },
                  { id: 'ar', label: 'العربية', sub: 'Arabic (الخليج والصومال)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setLanguage(item.id as Language);
                      setIsLangModalOpen(false);
                      showToast(`Language set to: ${item.label}`);
                    }}
                    className={`p-3 rounded-xl flex items-center justify-between text-left rtl:text-right transition-colors cursor-pointer ${
                      language === item.id
                        ? 'bg-primary-container text-on-primary font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className={`text-[10px] ${language === item.id ? 'opacity-80' : 'text-outline'}`}>
                        {item.sub}
                      </p>
                    </div>
                    {language === item.id && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. Currency Selection Modal */}
        {isCurrencyModalOpen && (
          <div
            onClick={() => setIsCurrencyModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-container-lowest max-w-sm w-full rounded-2xl p-5 shadow-2xl flex flex-col gap-3 border border-outline-variant/20 animate-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between pb-1 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">currency_exchange</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('selectCurrency', 'Select Default Currency')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCurrencyModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'USD', label: 'USD ($)', sub: 'United States Dollar (Standard)' },
                  { id: 'GBP', label: 'GBP (£)', sub: 'British Pound (UK Diaspora)' },
                  { id: 'EUR', label: 'EUR (€)', sub: 'Euro (EU Diaspora)' },
                  { id: 'AED', label: 'AED (د.إ)', sub: 'UAE Dirham (Gulf Escrow)' },
                  { id: 'SOS', label: 'SOS (Sh.So)', sub: 'Somali Shilling' },
                  { id: 'SLSH', label: 'SLSH (Sl.Sh)', sub: 'Somaliland Shilling' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrency(item.id as Currency);
                      setIsCurrencyModalOpen(false);
                      showToast(`Currency set to: ${item.label}`);
                    }}
                    className={`p-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                      currency === item.id
                        ? 'bg-primary-container text-on-primary font-bold'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className={`text-[10px] ${currency === item.id ? 'opacity-80' : 'text-outline'}`}>
                        {item.sub}
                      </p>
                    </div>
                    {currency === item.id && (
                      <span className="material-symbols-outlined text-sm">check</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 9. Avatar Selection Modal */}
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_circle</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('updateProfilePhoto', 'Update Profile Photo')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Current Preview */}
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="w-20 h-20 rounded-full overflow-hidden shadow-md ring-2 ring-primary bg-primary-fixed flex items-center justify-center">
                  {customAvatarUrl.trim() || userPic ? (
                    <img
                      alt="Preview"
                      className="w-full h-full object-cover"
                      src={customAvatarUrl.trim() || userPic}
                    />
                  ) : initials ? (
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  ) : (
                    <span className="material-symbols-outlined text-[36px] text-primary">person</span>
                  )}
                </div>
                <span className="text-[11px] text-outline">{displayName} • {locationLabel}</span>
              </div>

              {/* Upload photo from local files */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">{t('uploadFromDevice', 'Upload From Device')}:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs text-on-surface file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-container file:text-primary hover:file:bg-surface-container-high cursor-pointer"
                />
              </div>

              {/* Or custom URL */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-outline">{t('orCustomUrl', 'Or Custom Image URL')}:</label>
                <input
                  type="text"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container text-xs font-bold text-on-surface cursor-pointer hover:bg-surface-container-high"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserPic(customAvatarUrl.trim());
                    showToast(t('profilePhotoUpdated', 'Profile photo updated'));
                    setIsAvatarModalOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-md cursor-pointer hover:bg-tertiary-container"
                >
                  {t('savePhoto', 'Save Photo')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 10. In-App Concierge Modal */}
        {isConciergeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-3.5 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">support_agent</span>
                  <h3 className="text-sm font-bold text-on-surface">{t('conciergeDesk', 'Dilaal Concierge Desk')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConciergeModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-outline cursor-pointer hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-xl">support_agent</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">{t('supportTeam', 'Support Team')}</h4>
                  <p className="text-[10px] text-outline">{t('supportTeamSub', 'Reach our team through the support ticket desk')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConciergeModalOpen(false);
                    setCurrentScreen('safety');
                  }}
                  className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] text-primary">confirmation_number</span>
                  <span>{t('openTicketDesk', 'Open Support Ticket Desk')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 12. Sign Out Confirmation Dialog (Sovereign In-App Modal) */}
        {isSignOutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-center">
              <div className="w-12 h-12 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">logout</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">{t('signOutDialogTitle', 'Sign Out of DILAAL?')}</h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {t('signOutDialogDescReal', 'You will return to the welcome screen.')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignOutModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface cursor-pointer"
                >
                  {t('staySignedIn', 'Stay Signed In')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignOutModalOpen(false);
                    logout();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-error hover:bg-error/90 text-on-error text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('signOut', 'Sign Out')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <span className="material-symbols-outlined text-[16px] text-emerald-400 dark:text-emerald-600">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
};
