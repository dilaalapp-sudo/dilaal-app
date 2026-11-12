import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, TextInput } from 'react-native';
import { useApp } from '../context/AppContext';
import { fetchBuyerInbox, subscribeInbox, type BuyerInboxItem } from '../lib/chat';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { useColors, typography, shadow, Palette } from '../theme';

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 },
    wrap: { width: '100%', maxWidth: 672, alignSelf: 'center', gap: 14 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 18, fontFamily: typography.extrabold, color: colors.onSurface, letterSpacing: -0.3 },
    subtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
    refreshBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.success + '14',
      borderWidth: 1,
      borderColor: colors.success + '26',
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBox: {
      height: 46,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.onSurface, paddingVertical: 8 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: {
      fontSize: 11,
      fontFamily: typography.bold,
      color: colors.outline,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    countPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surfaceContainer,
    },
    countText: { fontSize: 10, fontFamily: typography.bold, color: colors.onSurfaceVariant },
    list: { gap: 10 },
    skeleton: {
      height: 84,
      borderRadius: 18,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '1A',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 56,
      paddingHorizontal: 24,
      gap: 6,
      minHeight: 280,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.success + '14',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 15, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: {
      fontSize: 12,
      color: colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 280,
    },
    browseBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.success,
      ...shadow.card,
    },
    browseText: { fontSize: 12, fontFamily: typography.bold, color: '#ffffff' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '26',
      ...shadow.card,
    },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0, gap: 3 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 13, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    time: { fontSize: 10.5, color: colors.outline },
    listingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    listing: { fontSize: 11, fontFamily: typography.semibold, color: colors.success, flexShrink: 1 },
    last: { fontSize: 11.5, color: colors.onSurfaceVariant },
    chevron: { paddingLeft: 2 },
  });

export const BuyerInbox: React.FC = () => {
  const { authUserId, openChatWithBroker, setCurrentScreen, t } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors);

  const [items, setItems] = useState<BuyerInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async (silent = false) => {
    if (!authUserId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setItems(await fetchBuyerInbox(authUserId));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!authUserId) return;
    return subscribeInbox('buyer_id', authUserId, () => {
      void load(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.brokerName.toLowerCase().includes(q) ||
        item.listingTitle.toLowerCase().includes(q) ||
        item.lastMessage.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('yourChats', 'Chats')}</Text>
            <Text style={styles.subtitle}>
              {items.length === 1 ? '1 conversation with a broker' : `${items.length} conversations with brokers`}
            </Text>
          </View>
          <Pressable
            onPress={() => void load(true)}
            style={styles.refreshBtn}
            accessibilityLabel="Refresh"
          >
            <Icon name="refresh" size={18} color={colors.success} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.outline} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchChats', 'Search chats')}
            placeholderTextColor={colors.outline}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
              <Icon name="close" size={16} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>

        {!loading && items.length > 0 ? (
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>{t('recentChats', 'Recent')}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{filtered.length}</Text>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.list}>
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="forum" size={30} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>{t('noChatsYet', 'No chats yet')}</Text>
            <Text style={styles.emptySub}>
              Contact a broker from a listing or the Dilaalo Directory and your conversation will
              appear here.
            </Text>
            <Pressable onPress={() => setCurrentScreen('home')} style={styles.browseBtn}>
              <Text style={styles.browseText}>{t('browseListings', 'Browse Listings')}</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="search" size={28} color={colors.success} />
            </View>
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptySub}>Try a different broker name, listing, or message.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((item) => (
              <Pressable
                key={item.conversationId}
                onPress={() =>
                  void openChatWithBroker(
                    item.brokerId,
                    item.listingId || undefined,
                    undefined,
                    item.conversationId
                  )
                }
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                {item.brokerAvatar ? (
                  <Image source={{ uri: item.brokerAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Icon name="person" size={22} color={colors.onPrimaryContainer} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.brokerName}
                    </Text>
                    <Text style={styles.time}>{item.lastAt}</Text>
                  </View>
                  <View style={styles.listingRow}>
                    <Icon name="home_work" size={12} color={colors.success} />
                    <Text style={styles.listing} numberOfLines={1}>
                      {item.listingTitle}
                    </Text>
                  </View>
                  <Text style={styles.last} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
                <Icon name="chevron_right" size={18} color={colors.outlineVariant} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};
