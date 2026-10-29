import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';

interface MatchmakerModalProps {
  onClose: () => void;
}

const CITY_COUNTRY: Record<string, string> = {
  Mogadishu: 'SO',
  Hargeisa: 'SO',
  Garowe: 'SO',
};

const ASSET_CATEGORIES: Record<string, string[]> = {
  villa: ['house', 'rental'],
  land: ['land'],
  cars: ['car'],
};

const BUDGET_BOUNDS: Record<string, [number, number]> = {
  '<$50k': [0, 50000],
  '$100k - $250k': [100000, 250000],
  '$250k+': [250000, Number.POSITIVE_INFINITY],
};

export const MatchmakerModal: React.FC<MatchmakerModalProps> = ({ onClose }) => {
  const { brokers, listings, openBrokerProfile, openChatWithBroker, t } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [targetCity, setTargetCity] = useState('Mogadishu');
  const [assetType, setAssetType] = useState('villa');
  const [budgetRange, setBudgetRange] = useState('$100k - $250k');
  const [matched, setMatched] = useState(false);

  const cityCountry = CITY_COUNTRY[targetCity];
  const categorySet = ASSET_CATEGORIES[assetType] || [];
  const [minBudget, maxBudget] = BUDGET_BOUNDS[budgetRange] || [0, Number.POSITIVE_INFINITY];

  const matchingBrokers = brokers.filter((broker) => {
    const regionMatch =
      !cityCountry ||
      broker.countryCode === cityCountry ||
      (broker.coverage || '').toLowerCase().includes(targetCity.toLowerCase()) ||
      (broker.diasporaCoverage || '').toLowerCase().includes(targetCity.toLowerCase());
    if (!regionMatch) return false;

    const brokerListings = listings.filter((listing) => listing.brokerId === broker.id);
    if (brokerListings.length === 0) return true;

    const assetMatch = brokerListings.some((listing) => categorySet.includes(listing.category));
    const budgetMatch = brokerListings.some(
      (listing) => listing.price >= minBudget && listing.price <= maxBudget
    );
    return assetMatch && budgetMatch;
  });

  const optionStyle = (active: boolean, accent: 'primary' | 'secondary' = 'primary') => [
    styles.option,
    {
      backgroundColor: active
        ? accent === 'primary'
          ? colors.primaryContainer
          : colors.secondaryContainer
        : colors.surfaceContainerLow,
    },
  ];
  const optionText = (active: boolean, accent: 'primary' | 'secondary' = 'primary') => [
    styles.optionText,
    {
      color: active
        ? accent === 'primary'
          ? colors.onPrimary
          : colors.onSecondaryContainer
        : colors.onSurface,
    },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant + '4D', marginTop: insets.top + 24 }]}>
          <View style={[styles.header, { borderBottomColor: colors.surfaceContainer }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: colors.secondaryFixed }]}>
                <Icon name="verified_user" size={20} color={colors.onSecondaryFixed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.onSurface }]}>
                  {t('matchmakerTitle', 'Diaspora Dilaal Matchmaker')}
                </Text>
                <Text style={[styles.sub, { color: colors.outline }]}>
                  {t('matchmakerSub', 'Match with a licensed homeland broker')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={[styles.close, { backgroundColor: colors.surfaceContainer }]}>
              <Icon name="close" size={15} color={colors.outline} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!matched ? (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('homelandRegion', 'Homeland Region / City')}
                  </Text>
                  <View style={styles.grid}>
                    {['Mogadishu', 'Hargeisa', 'Garowe'].map((city) => (
                      <Pressable
                        key={city}
                        onPress={() => setTargetCity(city)}
                        style={[optionStyle(targetCity === city), styles.gridItem]}
                      >
                        <Text style={optionText(targetCity === city)}>{city}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('assetCategory', 'Asset Category')}
                  </Text>
                  <View style={styles.grid}>
                    {[
                      { id: 'villa', label: t('housesAndVillas', 'Houses & Villas') },
                      { id: 'land', label: t('landAndPlots', 'Land & Boos') },
                      { id: 'cars', label: t('cars', 'Vehicles') },
                    ].map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => setAssetType(item.id)}
                        style={[optionStyle(assetType === item.id), styles.gridItem]}
                      >
                        <Text style={optionText(assetType === item.id)} numberOfLines={1}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>
                    {t('targetInvestmentTier', 'Target Investment Tier')}
                  </Text>
                  <View style={styles.grid}>
                    {['<$50k', '$100k - $250k', '$250k+'].map((tier) => (
                      <Pressable
                        key={tier}
                        onPress={() => setBudgetRange(tier)}
                        style={[optionStyle(budgetRange === tier, 'secondary'), styles.gridItem]}
                      >
                        <Text style={optionText(budgetRange === tier, 'secondary')} numberOfLines={1}>
                          {tier}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable
                  onPress={() => setMatched(true)}
                  style={[styles.primaryBtn, { backgroundColor: colors.primaryContainer }]}
                >
                  <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
                    {t('findBrokerAction', 'Find a Matching Broker')}
                  </Text>
                  <Icon name="arrow_forward" size={16} color={colors.onPrimary} />
                </Pressable>
              </View>
            ) : matchingBrokers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainer }]}>
                  <Icon name="search_off" size={32} color={colors.outline} />
                </View>
                <View style={{ gap: 4, alignItems: 'center' }}>
                  <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                    {t('noBrokerMatch', 'No brokers match yet')}
                  </Text>
                  <Text style={[styles.emptyDesc, { color: colors.onSurfaceVariant }]}>
                    {t(
                      'noBrokerMatchDesc',
                      'No registered broker matches this city, asset type, and budget. Try adjusting your filters or browse the marketplace.'
                    )}
                  </Text>
                </View>
                <View style={styles.twoCol}>
                  <Pressable
                    onPress={() => setMatched(false)}
                    style={[styles.secondaryBtn, { backgroundColor: colors.surfaceContainer }]}
                  >
                    <Text style={[styles.btnText, { color: colors.onSurface }]}>
                      {t('adjustFilters', 'Adjust Filters')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={onClose}
                    style={[styles.secondaryBtn, { backgroundColor: colors.primaryContainer }]}
                  >
                    <Text style={[styles.btnText, { color: colors.onPrimary }]}>{t('close', 'Close')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={styles.resultsHead}>
                  <Text style={[styles.resultsLabel, { color: colors.secondary }]}>
                    {t('matchingBrokers', 'Matching Brokers')} ({matchingBrokers.length})
                  </Text>
                  <Pressable onPress={() => setMatched(false)}>
                    <Text style={[styles.adjustLink, { color: colors.primary }]}>
                      {t('adjustFilters', 'Adjust Filters')}
                    </Text>
                  </Pressable>
                </View>

                {matchingBrokers.map((broker) => (
                  <View
                    key={broker.id}
                    style={[styles.brokerCard, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant + '26' }]}
                  >
                    <View style={styles.brokerRow}>
                      {broker.avatar ? (
                        <Image source={{ uri: broker.avatar }} style={styles.brokerAvatar} />
                      ) : (
                        <View style={[styles.brokerAvatar, styles.avatarFallback, { backgroundColor: colors.surfaceContainerHigh }]}>
                          <Icon name="person" size={22} color={colors.outline} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.brokerName, { color: colors.onSurface }]} numberOfLines={1}>
                          {broker.name}
                        </Text>
                        <Text style={[styles.brokerTitle, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                          {broker.title}
                        </Text>
                      </View>
                    </View>

                    <View style={{ gap: 4 }}>
                      {(broker.coverage || broker.diasporaCoverage) && (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaLabel, { color: colors.outline }]}>{t('coverage', 'Coverage')}:</Text>
                          <Text style={[styles.metaValue, { color: colors.onSurface }]} numberOfLines={1}>
                            {[broker.coverage, broker.diasporaCoverage].filter(Boolean).join(' • ')}
                          </Text>
                        </View>
                      )}
                      {broker.licenseNumber && (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaLabel, { color: colors.outline }]}>{t('licenseNumber', 'License')}:</Text>
                          <Text style={[styles.metaValue, { color: colors.onSurface, fontFamily: typography.bold }]}>
                            {broker.licenseNumber}
                          </Text>
                        </View>
                      )}
                      {(broker.rating > 0 || broker.reviewsCount > 0) && (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaLabel, { color: colors.outline }]}>{t('rating', 'Rating')}:</Text>
                          <Text style={[styles.metaValue, { color: colors.onSurface, fontFamily: typography.bold }]}>
                            {broker.rating} ({broker.reviewsCount} {t('reviews', 'reviews')})
                          </Text>
                        </View>
                      )}
                      {broker.responseTime && (
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaLabel, { color: colors.outline }]}>{t('responseTime', 'Response Time')}:</Text>
                          <Text style={[styles.metaValue, { color: colors.onSurface, fontFamily: typography.bold }]}>
                            {broker.responseTime}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.twoCol}>
                      <Pressable
                        onPress={() => {
                          onClose();
                          openBrokerProfile(broker.id);
                        }}
                        style={[styles.secondaryBtn, { backgroundColor: colors.surfaceContainer }]}
                      >
                        <Text style={[styles.btnText, { color: colors.onSurface }]} numberOfLines={1}>
                          {t('viewFullProfile', 'View Full Profile')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          onClose();
                          openChatWithBroker(broker.id);
                        }}
                        style={[styles.secondaryBtn, { backgroundColor: colors.primaryContainer }]}
                      >
                        <Text style={[styles.btnText, { color: colors.onPrimary }]} numberOfLines={1}>
                          {t('startDirectChat', 'Start Direct Chat')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    maxHeight: '86%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.floating,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontFamily: typography.bold },
  sub: { fontSize: 10, marginTop: 1 },
  close: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 4 },
  label: { fontSize: 12, fontFamily: typography.bold },
  grid: { flexDirection: 'row', gap: 8 },
  gridItem: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  option: { borderRadius: 12 },
  optionText: { fontSize: 12, fontFamily: typography.bold },
  primaryBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.card,
  },
  primaryBtnText: { fontSize: 12, fontFamily: typography.bold },
  emptyWrap: { alignItems: 'center', gap: 16, paddingVertical: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: typography.bold },
  emptyDesc: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  twoCol: { flexDirection: 'row', gap: 8, width: '100%' },
  secondaryBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 12, fontFamily: typography.bold },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsLabel: { fontSize: 10, fontFamily: typography.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  adjustLink: { fontSize: 11, fontFamily: typography.bold },
  brokerCard: { padding: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
  brokerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brokerAvatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  brokerName: { fontSize: 12, fontFamily: typography.bold },
  brokerTitle: { fontSize: 11, marginTop: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metaLabel: { fontSize: 11 },
  metaValue: { fontSize: 11, fontFamily: typography.semibold, flexShrink: 1, textAlign: 'right' },
});
