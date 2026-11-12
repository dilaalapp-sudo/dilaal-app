import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { useColors, typography, shadow, Palette } from '../theme';
import { SUPPORTED_COUNTRIES } from '../data/countries';
import { Language, Currency, CountryCode, UserRole } from '../types';

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

  const colors = useColors();
  const styles = makeStyles(colors, isDarkMode);

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
  const initials =
    currentUser?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '';

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
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    location: currentUser?.location || '',
  });

  const [userPic, setUserPic] = useState<string>('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

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
    setSearchFilter((prev) => ({ ...prev, query }));
    setActiveTab('search');
    setCurrentScreen('search');
  };

  const handleSaveProfile = () => {
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

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(t('photoPermissionNeeded', 'Allow photo access to update your picture'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setCustomAvatarUrl(result.assets[0].uri);
    }
  };

  const hasActiveDeal = Boolean(
    escrowDeal && escrowDeal.dealNumber && escrowDeal.dealNumber.trim() !== ''
  );

  const activeCountry = SUPPORTED_COUNTRIES[selectedCountry];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Identity Header */}
        <View style={styles.identityCard}>
          <View style={styles.auraTop} />
          <View style={styles.auraBottom} />

          <Pressable
            onPress={() => {
              setEditForm({
                name: currentUser?.name || '',
                email: currentUser?.email || '',
                phone: currentUser?.phone || '',
                location: currentUser?.location || '',
              });
              setIsEditProfileOpen(true);
            }}
            style={styles.editBtn}
          >
            <Icon name="edit" size={15} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {userPic ? (
                <Image source={{ uri: userPic }} style={styles.avatarImage} />
              ) : initials ? (
                <Text style={styles.avatarInitials}>{initials}</Text>
              ) : (
                <Icon name="person" size={38} color={colors.primary} />
              )}
            </View>
            <Pressable
              onPress={() => {
                setCustomAvatarUrl(userPic);
                setIsAvatarModalOpen(true);
              }}
              style={styles.cameraBtn}
            >
              <Icon name="photo_camera" size={16} color={colors.onPrimary} />
            </Pressable>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.identitySub}>
            {roleLabel} • {locationLabel}
          </Text>

          <Pressable
            onPress={() => setIsTrustCenterOpen(true)}
            style={[
              styles.kycBadge,
              kycStatus === 'approved'
                ? { backgroundColor: colors.primaryFixed }
                : kycStatus === 'pending'
                ? { backgroundColor: colors.tertiaryFixed }
                : { backgroundColor: colors.surfaceContainer },
            ]}
          >
            <Icon
              name={
                kycStatus === 'approved'
                  ? 'verified_user'
                  : kycStatus === 'pending'
                  ? 'pending'
                  : 'shield'
              }
              size={15}
              color={kycStatus === 'approved' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.kycBadgeText,
                kycStatus === 'approved'
                  ? { color: colors.primary }
                  : { color: colors.onSurfaceVariant },
              ]}
            >
              {kycStatus === 'approved'
                ? t('kycVerifiedBadge', 'Identity Verified')
                : kycStatus === 'pending'
                ? t('kycPendingBadge', 'Verification Pending')
                : t('kycUnverifiedBadge', 'Identity Not Verified')}
            </Text>
            <Icon name="chevron_right" size={15} color={colors.primary} />
          </Pressable>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Pressable style={styles.statCard} onPress={() => setIsSavedListingsOpen(true)}>
            <Text style={styles.statValue}>{savedListings.length}</Text>
            <View style={styles.statLabelRow}>
              <Icon name="bookmark" size={12} color={colors.primary} />
              <Text style={styles.statLabel}>{t('savedHomes', 'Saved Assets')}</Text>
            </View>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => setCurrentScreen('deal')}>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>{hasActiveDeal ? '1' : '0'}</Text>
              {hasActiveDeal && <View style={styles.liveDot} />}
            </View>
            <Text style={[styles.statLabel, styles.statLabelPrimary]} numberOfLines={1}>
              {hasActiveDeal ? escrowDeal.dealNumber : t('activeDealsTitle', 'Active Deals')}
            </Text>
          </Pressable>

          <Pressable style={styles.statCard} onPress={() => setIsMyListingsModalOpen(true)}>
            <Text style={styles.statValue}>{userListings.length}</Text>
            <View style={styles.statLabelRow}>
              <Icon name="add_business" size={12} color={colors.secondary} />
              <Text style={styles.statLabel}>{t('myListings', 'My Listings')}</Text>
            </View>
          </Pressable>
        </View>

        {/* Escrow Banner */}
        <View style={styles.escrowBanner}>
          <View style={styles.escrowLeft}>
            <View style={styles.escrowIcon}>
              <Icon name="gavel" size={22} color={colors.primaryFixed} />
            </View>
            <View style={styles.flexMin}>
              <Text style={styles.escrowTitle} numberOfLines={1}>
                {t('shariaSovereignEscrow', 'Escrow Deal')}
              </Text>
              <Text style={styles.escrowSub} numberOfLines={2}>
                {hasActiveDeal
                  ? t('dealProtectedInTrust', 'Review milestones and payment status')
                  : t(
                      'escrowProtectedSub',
                      'Payment status is recorded against your active deal'
                    )}
              </Text>
            </View>
          </View>
          <Pressable style={styles.escrowBtn} onPress={() => setCurrentScreen('deal')}>
            <Text style={styles.escrowBtnText}>
              {hasActiveDeal ? t('trackDeal', 'Track Deal') : t('inspect', 'Inspect')}
            </Text>
          </Pressable>
        </View>

        {/* Portfolio & Activity */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('portfolioActivity', 'Portfolio & Activity')}</Text>

          <Pressable style={styles.linkRow} onPress={() => setIsSavedListingsOpen(true)}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="bookmark" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('savedListings', 'Saved Listings')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {language === 'so'
                    ? 'Hantida La Keydiyey'
                    : language === 'ar'
                    ? 'الأصول المحفوظة'
                    : 'Bookmarked assets'}
                </Text>
              </View>
            </View>
            <View style={styles.linkRight}>
              <View style={styles.countPillPrimary}>
                <Text style={styles.countPillPrimaryText}>{savedListings.length}</Text>
              </View>
              <Icon name="chevron_right" size={18} color={colors.outline} />
            </View>
          </Pressable>

          <View style={styles.card}>
            <Pressable
              style={styles.linkRowBare}
              onPress={() => setIsSavedSearchesModalOpen(true)}
            >
              <View style={styles.linkLeft}>
                <View style={styles.iconTile}>
                  <Icon name="notifications_active" size={20} color={colors.secondary} />
                </View>
                <View style={styles.flexMin}>
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {t('savedSearchesAndAlerts', 'Saved Searches & Alerts')}
                  </Text>
                  <Text style={styles.linkSub} numberOfLines={1}>
                    {t('manageAlerts', 'Manage alert notifications')}
                  </Text>
                </View>
              </View>
              <View style={styles.linkRight}>
                <View style={styles.countPillNeutral}>
                  <Text style={styles.countPillNeutralText}>{savedSearches.length}</Text>
                </View>
                <Icon name="chevron_right" size={18} color={colors.outline} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Role & Market Configuration */}
        <View style={styles.group}>
          <View style={styles.groupHead}>
            <Text style={styles.groupLabel}>
              {t('marketConfig', 'Market Configuration')}
            </Text>
            <View style={styles.prefPill}>
              <Text style={styles.prefPillText}>{t('preferences', 'Preferences')}</Text>
            </View>
          </View>

          <View style={styles.configCard}>
            <View style={styles.configSection}>
              <View style={styles.configHead}>
                <View style={styles.configIconTile}>
                  <Icon name="public" size={19} color={colors.primary} />
                </View>
                <View style={styles.flexMin}>
                  <Text style={styles.configTitle}>
                    {t('targetJurisdiction', 'Target Market Jurisdiction')}
                  </Text>
                  <Text style={styles.configSub}>
                    {t(
                      'targetJurisdictionSub',
                      'Cadastral authority & deed verification rules'
                    )}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.countrySelector}
                onPress={() => setIsCountryModalOpen(true)}
              >
                <View style={styles.flexMin}>
                  <Text style={styles.countrySelectorText} numberOfLines={1}>
                    {activeCountry?.name} — {activeCountry?.registryAuthority}
                  </Text>
                </View>
                <Icon name="unfold_more" size={18} color={colors.outline} />
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.unitRow}>
              <View style={styles.linkLeft}>
                <View style={styles.configIconTile}>
                  <Icon name="straighten" size={19} color={colors.primary} />
                </View>
                <View style={styles.flexMin}>
                  <Text style={styles.configTitle}>{t('measurementUnit', 'Measurement Unit')}</Text>
                  <Text style={styles.configSub} numberOfLines={1}>
                    {areaUnit === 'sqm'
                      ? t('metricSystem', 'Square Meters (m² - Metric system)')
                      : t('imperialSystem', 'Square Feet (sqft - Imperial system)')}
                  </Text>
                </View>
              </View>

              <View style={styles.unitToggle}>
                <Pressable
                  onPress={() => {
                    setAreaUnit('sqm');
                    showToast('Unit changed to square meters (m²)');
                  }}
                  style={[styles.unitBtn, areaUnit === 'sqm' && styles.unitBtnActive]}
                >
                  <Text
                    style={[styles.unitBtnText, areaUnit === 'sqm' && styles.unitBtnTextActive]}
                  >
                    m² <Text style={styles.unitHint}>(Metric)</Text>
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setAreaUnit('sqft');
                    showToast('Unit changed to square feet (sqft)');
                  }}
                  style={[styles.unitBtn, areaUnit === 'sqft' && styles.unitBtnActive]}
                >
                  <Text
                    style={[styles.unitBtnText, areaUnit === 'sqft' && styles.unitBtnTextActive]}
                  >
                    sqft <Text style={styles.unitHint}>(Imperial)</Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Compliance, Safety & Support */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>
            {t('complianceSafetySupport', 'Compliance, Safety & Support')}
          </Text>

          {isStaff && (
            <Pressable style={styles.linkRow} onPress={() => setCurrentScreen('admin')}>
              <View style={styles.linkLeft}>
                <View style={styles.iconTileEmerald}>
                  <Icon name="fact_check" size={20} color="#047857" />
                </View>
                <View style={styles.flexMin}>
                  <Text style={styles.linkTitle} numberOfLines={1}>
                    {t('complianceHub', 'Compliance & Reviewer Hub')}
                  </Text>
                  <Text style={styles.linkSub} numberOfLines={1}>
                    {t('complianceHubSub', 'Title deed audits & moderation queue')}
                  </Text>
                </View>
              </View>
              <Icon name="chevron_right" size={18} color={colors.outline} />
            </Pressable>
          )}

          <Pressable style={styles.linkRow} onPress={() => setCurrentScreen('safety')}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="shield_with_heart" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('safetyDisputesDesk', 'Safety, Disputes & Support Desk')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {t('safetyDisputesSub', 'Mediation, ticket desk & safety rules')}
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.outline} />
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => setCurrentScreen('legal')}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="gavel" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('legalPrivacySafety', 'Legal, Privacy & Data Safety')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {t('legalPrivacySub', 'Terms, data export & account purge')}
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.outline} />
          </Pressable>
        </View>

        {/* System Preferences */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('systemPreferences', 'System Preferences')}</Text>

          <Pressable style={styles.linkRow} onPress={() => setIsLangModalOpen(true)}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="language" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('interfaceLanguage', 'Interface Language')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {language === 'so'
                    ? 'Af-Soomaali, English & العربية'
                    : language === 'ar'
                    ? 'العربية، الصومالية، الإنجليزية'
                    : 'English, Af-Soomaali & العربية'}
                </Text>
              </View>
            </View>
            <View style={styles.linkRight}>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>
                  {language === 'so' ? 'Soomaali' : language === 'ar' ? 'العربية' : 'English'}
                </Text>
              </View>
              <Icon name="chevron_right" size={18} color={colors.outline} />
            </View>
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => setIsCurrencyModalOpen(true)}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="currency_exchange" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('preferredCurrency', 'Preferred Currency')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  USD, GBP, EUR, AED, SOS, SLSH
                </Text>
              </View>
            </View>
            <View style={styles.linkRight}>
              <View style={styles.valuePill}>
                <Text style={styles.valuePillText}>{currency}</Text>
              </View>
              <Icon name="chevron_right" size={18} color={colors.outline} />
            </View>
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              toggleDarkMode();
              showToast(isDarkMode ? 'Light mode enabled' : 'Dark mode enabled');
            }}
          >
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon
                  name={isDarkMode ? 'dark_mode' : 'light_mode'}
                  size={20}
                  color={colors.primaryContainer}
                />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('darkMode', 'Dark Mode')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
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
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.switchTrack,
                { backgroundColor: isDarkMode ? colors.primaryContainer : colors.outlineVariant },
              ]}
            >
              <View
                style={[
                  styles.switchKnob,
                  {
                    backgroundColor: colors.surfaceContainerLowest,
                    transform: [{ translateX: isDarkMode ? 20 : 0 }],
                  },
                ]}
              >
                {isDarkMode && <Icon name="check" size={14} color={colors.primaryContainer} />}
              </View>
            </View>
          </Pressable>
        </View>

        {/* Legal & Concierge */}
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t('legalConcierge', 'Legal & Concierge')}</Text>

          <Pressable style={styles.linkRow} onPress={() => setIsCharterOpen(true)}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTile}>
                <Icon name="description" size={20} color={colors.primaryContainer} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('legalCharter', 'Legal & Privacy')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {t('legalCharterSubReal', 'Platform terms & privacy')}
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.outline} />
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => setIsConciergeModalOpen(true)}>
            <View style={styles.linkLeft}>
              <View style={styles.iconTilePrimary}>
                <Icon name="support_agent" size={20} color={colors.primary} />
              </View>
              <View style={styles.flexMin}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {t('conciergeDesk', 'Dilaal Concierge Desk')}
                </Text>
                <Text style={styles.linkSub} numberOfLines={1}>
                  {t('supportDeskSub', 'Contact support for help with your account')}
                </Text>
              </View>
            </View>
            <Icon name="chevron_right" size={18} color={colors.outline} />
          </Pressable>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutWrap}>
          <Pressable style={styles.signOutBtn} onPress={() => setIsSignOutModalOpen(true)}>
            <Icon name="logout" size={18} color={colors.onErrorContainer} />
            <Text style={styles.signOutText}>{t('signOut', 'Sign Out')}</Text>
          </Pressable>
          <View style={styles.versionWrap}>
            <Text style={styles.versionTitle}>{t('versionInfo', 'DILAAL App')}</Text>
            <Text style={styles.versionSub}>{activeCountry?.registryAuthority || ''}</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Toast */}
      {toastMessage && (
        <View style={styles.toast} pointerEvents="none">
          <Icon name="check_circle" size={16} color="#34d399" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* 1. Edit Profile */}
      <Sheet
        visible={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Profile Details"
        titleIcon="manage_accounts"
        styles={styles}
        colors={colors}
      >
        <View style={{ gap: 10 }}>
          <View>
            <Text style={styles.fieldLabel}>{t('fullNameLabel', 'Full Legal Name')}</Text>
            <TextInput
              value={editForm.name}
              onChangeText={(name) => setEditForm({ ...editForm, name })}
              placeholder={t('fullNameLabel', 'Full Legal Name')}
              placeholderTextColor={colors.outline}
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>{t('emailLabel', 'Email Address')}</Text>
              <TextInput
                value={editForm.email}
                onChangeText={(email) => setEditForm({ ...editForm, email })}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="name@example.com"
                placeholderTextColor={colors.outline}
                style={styles.fieldInput}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.fieldLabel}>{t('phoneLabel', 'Phone Number')}</Text>
              <TextInput
                value={editForm.phone}
                onChangeText={(phone) => setEditForm({ ...editForm, phone })}
                keyboardType="phone-pad"
                placeholder="+252..."
                placeholderTextColor={colors.outline}
                style={styles.fieldInput}
              />
            </View>
          </View>
          <View>
            <Text style={styles.fieldLabel}>{t('primaryLocationLabel', 'Primary Location')}</Text>
            <TextInput
              value={editForm.location}
              onChangeText={(location) => setEditForm({ ...editForm, location })}
              placeholder="Mogadishu, Banadir"
              placeholderTextColor={colors.outline}
              style={styles.fieldInput}
            />
          </View>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setIsEditProfileOpen(false)}>
              <Text style={styles.cancelBtnText}>{t('cancel', 'Cancel')}</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.flex1]} onPress={handleSaveProfile}>
              <Text style={styles.primaryBtnText}>{t('saveChanges', 'Save Changes')}</Text>
            </Pressable>
          </View>
        </View>
      </Sheet>

      {/* 2. Saved Searches */}
      <Sheet
        visible={isSavedSearchesModalOpen}
        onClose={() => setIsSavedSearchesModalOpen(false)}
        title={t('savedSearchesAndAlerts', 'Saved Searches & Alerts')}
        titleIcon="notifications_active"
        titleColor={colors.secondary}
        scroll
        styles={styles}
        colors={colors}
      >
        <View style={styles.alertCreate}>
          <Text style={styles.alertCreateTitle}>Create New Market Alert:</Text>
          <View style={styles.alertCreateRow}>
            <TextInput
              value={newSearchQuery}
              onChangeText={setNewSearchQuery}
              placeholder={t('searchAlertPlaceholder', 'Search keyword or location')}
              placeholderTextColor={colors.outline}
              style={styles.alertInput}
            />
            <Pressable
              style={styles.alertAddBtn}
              onPress={() => {
                if (!newSearchQuery.trim()) return;
                saveCurrentSearch(newSearchQuery.trim());
                setNewSearchQuery('');
                showToast('New search alert saved');
              }}
            >
              <Text style={styles.alertAddText}>Add</Text>
            </Pressable>
          </View>
        </View>

        {savedSearches.length > 0 ? (
          savedSearches.map((s) => (
            <View key={s.id} style={styles.alertRow}>
              <Pressable
                style={styles.flexMin}
                onPress={() => {
                  setIsSavedSearchesModalOpen(false);
                  handleAlertClick(s.query || s.name);
                }}
              >
                <Text style={styles.alertName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.alertQuery} numberOfLines={1}>
                  {s.query ? `Query: "${s.query}"` : 'All matches in category'}
                </Text>
              </Pressable>
              <View style={styles.alertActions}>
                <Pressable
                  style={styles.runBtn}
                  onPress={() => {
                    setIsSavedSearchesModalOpen(false);
                    handleAlertClick(s.query || s.name);
                  }}
                >
                  <Text style={styles.runBtnText}>Run</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => {
                    deleteSavedSearch(s.id);
                    showToast('Alert removed');
                  }}
                >
                  <Icon name="delete" size={15} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyModalText}>
            {t(
              'noSavedSearchesDesc',
              'No saved searches yet. Add a query above to save it here.'
            )}
          </Text>
        )}
      </Sheet>

      {/* 3. My Listings */}
      <Sheet
        visible={isMyListingsModalOpen}
        onClose={() => setIsMyListingsModalOpen(false)}
        title={`${t('myListings', 'My Listings')} (${userListings.length})`}
        titleIcon="real_estate_agent"
        scroll
        styles={styles}
        colors={colors}
      >
        {userListings.length > 0 ? (
          <View style={{ gap: 10 }}>
            {userListings.map((l) => (
              <Pressable
                key={l.id}
                style={styles.listingRow}
                onPress={() => {
                  setIsMyListingsModalOpen(false);
                  openListingDetails(l.id);
                }}
              >
                {l.image ? (
                  <Image source={{ uri: l.image }} style={styles.listingThumb} />
                ) : (
                  <View style={styles.listingThumbEmpty}>
                    <Icon name="home_work" size={22} color={colors.outline} />
                  </View>
                )}
                <View style={styles.flexMin}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {language === 'so' && l.titleSo ? l.titleSo : l.title}
                  </Text>
                  <Text style={styles.listingLocation} numberOfLines={1}>
                    {l.location}
                  </Text>
                  <View style={styles.listingMetaRow}>
                    <Text style={styles.listingPrice}>${l.price.toLocaleString()}</Text>
                    <View style={styles.verificationPill}>
                      <Text style={styles.verificationPillText}>
                        {l.verificationStatus || 'published'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Icon name="chevron_right" size={18} color={colors.outline} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyModalCenter}>
            <Icon name="home_work" size={30} color={colors.outline} />
            <Text style={styles.emptyModalTitle}>
              {t('noPropertiesListed', 'No Listings Yet')}
            </Text>
            <Text style={styles.emptyModalText}>
              {language === 'so'
                ? 'Weli ma aadan soo gelin wax hanti ah.'
                : language === 'ar'
                ? 'لم تقم بنشر أي عقارات حتى الآن.'
                : 'You have not published any assets yet.'}
            </Text>
          </View>
        )}

        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            setIsMyListingsModalOpen(false);
            setActiveTab('post');
            setCurrentScreen('post');
          }}
        >
          <Icon name="add_circle" size={16} color={colors.onPrimary} />
          <Text style={styles.primaryBtnText}>{t('postNewProperty', 'Post a New Property')}</Text>
        </Pressable>
      </Sheet>

      {/* 4. Saved Listings */}
      <Sheet
        visible={isSavedListingsOpen}
        onClose={() => setIsSavedListingsOpen(false)}
        title={`${t('savedHomes', 'Saved Assets')} (${savedListings.length})`}
        titleIcon="bookmark"
        scroll
        styles={styles}
        colors={colors}
      >
        {savedListings.length > 0 ? (
          <View style={{ gap: 10 }}>
            {savedListings.map((l) => (
              <Pressable
                key={l.id}
                style={styles.listingRow}
                onPress={() => {
                  setIsSavedListingsOpen(false);
                  openListingDetails(l.id);
                }}
              >
                {l.image ? (
                  <Image source={{ uri: l.image }} style={styles.listingThumb} />
                ) : (
                  <View style={styles.listingThumbEmpty}>
                    <Icon name="home_work" size={22} color={colors.outline} />
                  </View>
                )}
                <View style={styles.flexMin}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {language === 'so' && l.titleSo ? l.titleSo : l.title}
                  </Text>
                  <Text style={styles.listingLocation} numberOfLines={1}>
                    {l.location}
                  </Text>
                  <Text style={styles.listingPrice}>${l.price.toLocaleString()}</Text>
                </View>
                <Pressable
                  style={styles.savedRemoveBtn}
                  onPress={() => {
                    toggleFavorite(l.id);
                    showToast('Listing removed from saved');
                  }}
                >
                  <Icon name="delete" size={15} color={colors.error} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyModalCenter}>
            <Icon name="favorite_border" size={30} color={colors.outline} />
            <Text style={styles.emptyModalText}>
              {t('noResultsFound', 'No saved properties yet.')}
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                setIsSavedListingsOpen(false);
                setActiveTab('search');
                setCurrentScreen('search');
              }}
            >
              <Text style={styles.primaryBtnText}>{t('browseListings', 'Browse Listings')}</Text>
            </Pressable>
          </View>
        )}
      </Sheet>

      {/* 5. Trust Center */}
      <Sheet
        visible={isTrustCenterOpen}
        onClose={() => setIsTrustCenterOpen(false)}
        title={t('identityKyc', 'Identity & KYC Verification')}
        titleIcon="shield"
        styles={styles}
        colors={colors}
      >
        <View style={{ gap: 8 }}>
          <View style={styles.trustRow}>
            <View style={styles.trustLeft}>
              <Icon name="badge" size={18} color={colors.primary} />
              <View style={styles.flexMin}>
                <Text style={styles.trustLabel}>
                  {t('identityKyc', 'Identity & KYC Verification')}
                </Text>
                <Text style={styles.trustValue} numberOfLines={1}>
                  {currentUser?.email?.trim() || t('notProvided', 'Not provided')}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.trustStatus,
                {
                  color:
                    kycStatus === 'approved'
                      ? colors.primary
                      : kycStatus === 'pending'
                      ? colors.pending
                      : colors.outline,
                },
              ]}
            >
              {kycLabel}
            </Text>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustLeft}>
              <Icon name="call" size={18} color={colors.secondary} />
              <View style={styles.flexMin}>
                <Text style={styles.trustLabel}>{t('phoneLabel', 'Phone Number')}</Text>
                <Text style={styles.trustValue} numberOfLines={1}>
                  {phoneLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustLeft}>
              <Icon name="location_on" size={18} color={colors.tertiary} />
              <View style={styles.flexMin}>
                <Text style={styles.trustLabel}>
                  {t('primaryLocationLabel', 'Primary Location')}
                </Text>
                <Text style={styles.trustValue} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.trustNote}>
          {t('kycDocsNone', 'No verification documents are on file for this account.')}
        </Text>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => setIsTrustCenterOpen(false)}
        >
          <Text style={styles.primaryBtnText}>{t('closeTrustCenter', 'Close Trust Center')}</Text>
        </Pressable>
      </Sheet>

      {/* 6. Legal Charter */}
      <Sheet
        visible={isCharterOpen}
        onClose={() => setIsCharterOpen(false)}
        title={t('trustCharterHeader', 'Legal & Privacy')}
        titleIcon="description"
        styles={styles}
        colors={colors}
      >
        <View style={styles.charterBox}>
          <Text style={styles.charterText}>
            {t(
              'charterNoRecords',
              'No personalized charter, notarization, or escrow clearance records are on file for this account. Platform terms and privacy details are published on the Legal & Privacy screen.'
            )}
          </Text>
        </View>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primaryContainer }]}
          onPress={() => {
            setIsCharterOpen(false);
            setCurrentScreen('legal');
          }}
        >
          <Text style={styles.primaryBtnText}>{t('openLegalPrivacy', 'Open Legal & Privacy')}</Text>
        </Pressable>
      </Sheet>

      {/* 7. Language */}
      <Sheet
        visible={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        title={t('selectLanguage', 'Select Language')}
        titleIcon="language"
        styles={styles}
        colors={colors}
      >
        <View style={{ gap: 8 }}>
          {[
            { id: 'so', label: 'Af-Soomaali', sub: 'Soomaali (Dalka & Qurbaha)' },
            { id: 'en', label: 'English', sub: 'Global Diaspora Edition' },
            { id: 'ar', label: 'العربية', sub: 'Arabic (الخليج والصومال)' },
          ].map((item) => {
            const isActive = language === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.optionRow, isActive && styles.optionRowActive]}
                onPress={() => {
                  setLanguage(item.id as Language);
                  setIsLangModalOpen(false);
                  showToast(`Language set to: ${item.label}`);
                }}
              >
                <View style={styles.flexMin}>
                  <Text style={[styles.optionTitle, isActive && styles.optionTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.optionSub, isActive && styles.optionSubActive]}>
                    {item.sub}
                  </Text>
                </View>
                {isActive && <Icon name="check" size={16} color={colors.onPrimary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* 8. Currency */}
      <Sheet
        visible={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        title={t('selectCurrency', 'Select Default Currency')}
        titleIcon="currency_exchange"
        styles={styles}
        colors={colors}
      >
        <View style={{ gap: 8 }}>
          {[
            { id: 'USD', label: 'USD ($)', sub: 'United States Dollar (Standard)' },
            { id: 'GBP', label: 'GBP (£)', sub: 'British Pound (UK Diaspora)' },
            { id: 'EUR', label: 'EUR (€)', sub: 'Euro (EU Diaspora)' },
            { id: 'AED', label: 'AED (د.إ)', sub: 'UAE Dirham (Gulf Escrow)' },
            { id: 'SOS', label: 'SOS (Sh.So)', sub: 'Somali Shilling' },
            { id: 'SLSH', label: 'SLSH (Sl.Sh)', sub: 'Somaliland Shilling' },
          ].map((item) => {
            const isActive = currency === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.optionRow, isActive && styles.optionRowActive]}
                onPress={() => {
                  setCurrency(item.id as Currency);
                  setIsCurrencyModalOpen(false);
                  showToast(`Currency set to: ${item.label}`);
                }}
              >
                <View style={styles.flexMin}>
                  <Text style={[styles.optionTitle, isActive && styles.optionTitleActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.optionSub, isActive && styles.optionSubActive]}>
                    {item.sub}
                  </Text>
                </View>
                {isActive && <Icon name="check" size={16} color={colors.onPrimary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* 9. Country Selector */}
      <Sheet
        visible={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        title={t('targetJurisdiction', 'Target Market Jurisdiction')}
        titleIcon="public"
        scroll
        styles={styles}
        colors={colors}
      >
        <View style={{ gap: 8 }}>
          {Object.values(SUPPORTED_COUNTRIES).map((country) => {
            const isActive = selectedCountry === country.code;
            return (
              <Pressable
                key={country.code}
                style={[styles.optionRow, isActive && styles.optionRowActive]}
                onPress={() => {
                  setSelectedCountry(country.code as CountryCode);
                  setIsCountryModalOpen(false);
                  showToast(`Jurisdiction set to: ${country.name || country.code}`);
                }}
              >
                <View style={styles.flexMin}>
                  <Text style={[styles.optionTitle, isActive && styles.optionTitleActive]}>
                    {country.name}
                  </Text>
                  <Text style={[styles.optionSub, isActive && styles.optionSubActive]}>
                    {country.registryAuthority}
                  </Text>
                </View>
                {isActive && <Icon name="check" size={16} color={colors.onPrimary} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* 10. Avatar */}
      <Sheet
        visible={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title={t('updateProfilePhoto', 'Update Profile Photo')}
        titleIcon="account_circle"
        styles={styles}
        colors={colors}
      >
        <View style={styles.avatarPreviewWrap}>
          <View style={styles.avatarPreview}>
            {customAvatarUrl.trim() || userPic ? (
              <Image
                source={{ uri: customAvatarUrl.trim() || userPic }}
                style={styles.avatarImage}
              />
            ) : initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <Icon name="person" size={36} color={colors.primary} />
            )}
          </View>
          <Text style={styles.avatarPreviewLabel}>
            {displayName} • {locationLabel}
          </Text>
        </View>

        <View>
          <Text style={styles.fieldLabel}>{t('uploadFromDevice', 'Upload From Device')}:</Text>
          <Pressable style={styles.uploadBtn} onPress={pickAvatar}>
            <Icon name="photo_camera" size={16} color={colors.primary} />
            <Text style={styles.uploadBtnText}>Choose Photo</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.fieldLabel}>{t('orCustomUrl', 'Or Custom Image URL')}:</Text>
          <TextInput
            value={customAvatarUrl}
            onChangeText={setCustomAvatarUrl}
            placeholder="https://..."
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            style={[styles.fieldInput, { fontFamily: typography.medium }]}
          />
        </View>

        <View style={styles.modalActions}>
          <Pressable style={styles.cancelBtn} onPress={() => setIsAvatarModalOpen(false)}>
            <Text style={styles.cancelBtnText}>{t('cancel', 'Cancel')}</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, styles.flex1, { backgroundColor: colors.primaryContainer }]}
            onPress={() => {
              setUserPic(customAvatarUrl.trim());
              showToast(t('profilePhotoUpdated', 'Profile photo updated'));
              setIsAvatarModalOpen(false);
            }}
          >
            <Text style={styles.primaryBtnText}>{t('savePhoto', 'Save Photo')}</Text>
          </Pressable>
        </View>
      </Sheet>

      {/* 11. Concierge */}
      <Sheet
        visible={isConciergeModalOpen}
        onClose={() => setIsConciergeModalOpen(false)}
        title={t('conciergeDesk', 'Dilaal Concierge Desk')}
        titleIcon="support_agent"
        styles={styles}
        colors={colors}
      >
        <View style={styles.conciergeRow}>
          <View style={styles.iconTilePrimary}>
            <Icon name="support_agent" size={20} color={colors.primary} />
          </View>
          <View style={styles.flexMin}>
            <Text style={styles.configTitle}>{t('supportTeam', 'Support Team')}</Text>
            <Text style={styles.configSub}>
              {t('supportTeamSub', 'Reach our team through the support ticket desk')}
            </Text>
          </View>
        </View>
        <Pressable
          style={[styles.secondaryBtnFull]}
          onPress={() => {
            setIsConciergeModalOpen(false);
            setCurrentScreen('safety');
          }}
        >
          <Icon name="confirmation_number" size={17} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>
            {t('openTicketDesk', 'Open Support Ticket Desk')}
          </Text>
        </Pressable>
      </Sheet>

      {/* 12. Sign Out */}
      <Modal
        visible={isSignOutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSignOutModalOpen(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsSignOutModalOpen(false)} />
          <View style={styles.signOutCard}>
            <View style={styles.signOutIconHalo}>
              <View style={styles.signOutIcon}>
                <Icon name="logout" size={24} color={colors.onErrorContainer} />
              </View>
            </View>
            <Text style={styles.signOutTitle}>
              {t('signOutDialogTitle', 'Sign Out of DILAAL?')}
            </Text>
            <Text style={styles.signOutBody}>
              {t('signOutDialogDescReal', 'You will return to the welcome screen.')}
            </Text>
            <View style={styles.signOutActions}>
              <Pressable
                onPress={() => {
                  setIsSignOutModalOpen(false);
                  logout();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('signOut', 'Sign Out')}
                style={({ pressed }) => [
                  styles.signOutDangerBtn,
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Icon name="logout" size={17} color={colors.onError} />
                <Text style={styles.signOutDangerText}>{t('signOut', 'Sign Out')}</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsSignOutModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={t('staySignedIn', 'Stay Signed In')}
                style={({ pressed }) => [
                  styles.signOutCancelBtn,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={styles.signOutCancelText}>{t('staySignedIn', 'Stay Signed In')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  titleIcon?: string;
  titleColor?: string;
  center?: boolean;
  scroll?: boolean;
  styles: ReturnType<typeof makeStyles>;
  colors: Palette;
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  titleIcon,
  titleColor,
  center,
  scroll,
  styles,
  colors,
  children,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.backdrop}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheetCard, center && { alignItems: 'center' }]}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleWrap}>
            {titleIcon && (
              <Icon name={titleIcon} size={20} color={titleColor || colors.primary} />
            )}
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {title}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={16} color={colors.outline} />
          </Pressable>
        </View>

        {scroll ? (
          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ gap: 12 }}>{children}</View>
        )}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const makeStyles = (colors: Palette, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    content: {
      width: '100%',
      maxWidth: 672,
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 120,
      gap: 16,
    },
    flex1: { flex: 1 },
    flexMin: { flex: 1, minWidth: 0 },
    identityCard: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 20,
      ...shadow.card,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}33`,
      alignItems: 'center',
      overflow: 'hidden',
    },
    auraTop: {
      position: 'absolute',
      top: -48,
      right: -48,
      width: 144,
      height: 144,
      borderRadius: 72,
      backgroundColor: `${colors.primaryFixed}33`,
    },
    auraBottom: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      width: 128,
      height: 128,
      borderRadius: 64,
      backgroundColor: `${colors.secondaryFixed}33`,
    },
    editBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}33`,
    },
    editBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
    },
    avatarWrap: { marginBottom: 12, marginTop: 8 },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      overflow: 'hidden',
      backgroundColor: colors.primaryFixed,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primaryFixed,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: {
      fontSize: 30,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    cameraBtn: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surfaceContainerLowest,
    },
    displayName: {
      fontSize: 20,
      fontFamily: typography.bold,
      color: colors.onSurface,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    identitySub: {
      fontSize: 12,
      fontFamily: typography.medium,
      color: colors.onSurfaceVariant,
      marginTop: 2,
      textAlign: 'center',
    },
    kycBadge: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    kycBadgeText: { fontSize: 12, fontFamily: typography.bold },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
    },
    statValue: {
      fontSize: 20,
      fontFamily: typography.bold,
      color: colors.primaryContainer,
      lineHeight: 24,
    },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.secondaryContainer,
    },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    statLabel: {
      fontSize: 11,
      fontFamily: typography.medium,
      color: colors.onSurfaceVariant,
      flexShrink: 1,
    },
    statLabelPrimary: {
      color: colors.primary,
      fontFamily: typography.bold,
      marginTop: 6,
      textAlign: 'center',
    },
    escrowBanner: {
      backgroundColor: colors.primaryContainer,
      borderRadius: 24,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderWidth: 1,
      borderColor: `${colors.primaryFixed}33`,
    },
    escrowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
    escrowIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    escrowTitle: {
      fontSize: 14,
      fontFamily: typography.bold,
      color: isDark ? colors.onPrimaryContainer : '#faf8ff',
    },
    escrowSub: {
      fontSize: 11,
      color: colors.onPrimaryContainer,
      lineHeight: 15,
      marginTop: 1,
    },
    escrowBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLowest,
    },
    escrowBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.primaryContainer,
    },
    group: { gap: 10 },
    groupHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    groupLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.outline,
      textTransform: 'uppercase',
      letterSpacing: 1,
      paddingHorizontal: 4,
    },
    prefPill: {
      backgroundColor: `${colors.primaryFixed}4d`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    prefPillText: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    linkRow: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 14,
      ...shadow.card,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    linkRowBare: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
    linkRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTileEmerald: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: isDark ? '#022c22' : '#d1fae5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTilePrimary: {
      width: 40,
      height: 40,
      borderRadius: 16,
      backgroundColor: colors.primaryFixed,
      alignItems: 'center',
      justifyContent: 'center',
    },
    linkTitle: {
      fontSize: 13,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    linkSub: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      marginTop: 1,
    },
    countPillPrimary: {
      paddingHorizontal: 10,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.primaryFixed,
    },
    countPillPrimaryText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    countPillNeutral: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
    },
    countPillNeutralText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
    },
    card: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 16,
      padding: 14,
      ...shadow.card,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
    },
    configCard: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 16,
      gap: 20,
      ...shadow.card,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
    },
    configSection: { gap: 10 },
    configHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    configIconTile: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${colors.primaryFixed}66`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    configTitle: {
      fontSize: 13,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    configSub: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      marginTop: 1,
      lineHeight: 15,
    },
    divider: { height: 1, backgroundColor: `${colors.outlineVariant}26` },
    countrySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}4d`,
    },
    countrySelectorText: {
      fontSize: 13,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    unitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    unitToggle: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}33`,
    },
    unitBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
    },
    unitBtnActive: { backgroundColor: colors.primary },
    unitBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
    },
    unitBtnTextActive: { color: colors.onPrimary },
    unitHint: { fontSize: 10, opacity: 0.8 },
    switchTrack: {
      width: 48,
      height: 28,
      borderRadius: 14,
      padding: 2,
      justifyContent: 'center',
    },
    switchKnob: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    valuePill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
    },
    valuePillText: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    signOutWrap: { alignItems: 'center', gap: 6, paddingTop: 4, paddingBottom: 8 },
    signOutBtn: {
      width: '100%',
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.errorContainer,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    signOutText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onErrorContainer,
    },
    versionWrap: { alignItems: 'center', marginTop: 4 },
    versionTitle: {
      fontSize: 11,
      fontFamily: typography.semibold,
      color: colors.outline,
    },
    versionSub: { fontSize: 10, color: colors.outline, marginTop: 2, textAlign: 'center' },

    /* Modal */
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      zIndex: 100,
    },
    sheetCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '86%',
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}4d`,
      ...shadow.floating,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      paddingBottom: 10,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceContainer,
    },
    sheetTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
    sheetTitle: {
      fontSize: 14,
      fontFamily: typography.bold,
      color: colors.onSurface,
      flexShrink: 1,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetScroll: { flexGrow: 0 },
    fieldLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.onSurfaceVariant,
      marginBottom: 4,
    },
    fieldInput: {
      width: '100%',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}40`,
      color: colors.onSurface,
      fontSize: 12,
      fontFamily: typography.sans,
    },
    fieldRow: { flexDirection: 'row', gap: 8 },
    modalActions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignSelf: 'stretch',
    },
    primaryBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onPrimary,
    },
    secondaryBtnFull: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
    },
    secondaryBtnText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    alertCreate: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      gap: 8,
    },
    alertCreateTitle: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    alertCreateRow: { flexDirection: 'row', gap: 8 },
    alertInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}33`,
      color: colors.onSurface,
      fontSize: 12,
      fontFamily: typography.sans,
    },
    alertAddBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.primary,
      justifyContent: 'center',
    },
    alertAddText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onPrimary,
    },
    alertRow: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    alertName: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    alertQuery: { fontSize: 10, color: colors.onSurfaceVariant, marginTop: 1 },
    alertActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    runBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.primaryContainer,
    },
    runBtnText: {
      fontSize: 10,
      fontFamily: typography.bold,
      color: colors.onPrimary,
    },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyModalText: {
      paddingVertical: 16,
      textAlign: 'center',
      fontSize: 12,
      color: colors.outline,
      lineHeight: 18,
    },
    emptyModalCenter: {
      paddingVertical: 16,
      alignItems: 'center',
      gap: 6,
    },
    emptyModalTitle: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
      textAlign: 'center',
    },
    listingRow: {
      padding: 10,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLow,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}26`,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    listingThumb: { width: 56, height: 56, borderRadius: 12 },
    listingThumbEmpty: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    listingTitle: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    listingLocation: { fontSize: 10, color: colors.outline, marginTop: 1 },
    listingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    listingPrice: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    verificationPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      backgroundColor: colors.primaryFixed,
    },
    verificationPillText: {
      fontSize: 9,
      fontFamily: typography.bold,
      color: colors.primary,
    },
    savedRemoveBtn: { padding: 6 },
    trustRow: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    trustLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
    trustLabel: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    trustValue: { fontSize: 10, color: colors.outline, marginTop: 1 },
    trustStatus: { fontSize: 10, fontFamily: typography.bold },
    trustNote: { fontSize: 10, color: colors.outline, lineHeight: 15 },
    charterBox: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainerLow,
    },
    charterText: {
      fontSize: 11,
      color: colors.onSurfaceVariant,
      lineHeight: 17,
    },
    optionRow: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    optionRowActive: { backgroundColor: colors.primaryContainer },
    optionTitle: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    optionTitleActive: { color: colors.onPrimary },
    optionSub: { fontSize: 10, color: colors.outline, marginTop: 1 },
    optionSubActive: { color: colors.onPrimary, opacity: 0.8 },
    avatarPreviewWrap: { alignItems: 'center', gap: 6, paddingVertical: 4 },
    avatarPreview: {
      width: 80,
      height: 80,
      borderRadius: 40,
      overflow: 'hidden',
      backgroundColor: colors.primaryFixed,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    avatarPreviewLabel: { fontSize: 11, color: colors.outline, textAlign: 'center' },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
    },
    uploadBtnText: {
      fontSize: 12,
      fontFamily: typography.semibold,
      color: colors.primary,
    },
    conciergeRow: {
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLow,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    signOutCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: 28,
      paddingHorizontal: 22,
      paddingTop: 26,
      paddingBottom: 22,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}4d`,
      ...shadow.floating,
    },
    signOutIconHalo: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: `${colors.errorContainer}80`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.errorContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutTitle: {
      marginTop: 16,
      fontSize: 17,
      fontFamily: typography.bold,
      color: colors.onSurface,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    signOutBody: {
      marginTop: 6,
      fontSize: 12.5,
      lineHeight: 19,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      maxWidth: 260,
    },
    signOutActions: { width: '100%', gap: 10, marginTop: 22 },
    signOutDangerBtn: {
      height: 50,
      borderRadius: 16,
      backgroundColor: colors.error,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    signOutDangerText: {
      fontSize: 13.5,
      fontFamily: typography.bold,
      color: colors.onError,
    },
    signOutCancelBtn: {
      height: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: `${colors.outlineVariant}cc`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    signOutCancelText: {
      fontSize: 13.5,
      fontFamily: typography.bold,
      color: colors.onSurface,
    },
    toast: {
      position: 'absolute',
      bottom: 96,
      alignSelf: 'center',
      maxWidth: '86%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: 'rgba(15,23,42,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      ...shadow.floating,
    },
    toastText: {
      fontSize: 12,
      fontFamily: typography.bold,
      color: '#ffffff',
      flexShrink: 1,
    },
  });
