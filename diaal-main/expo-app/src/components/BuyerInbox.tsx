import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { fetchBuyerInbox, subscribeInbox, type BuyerInboxItem } from '../lib/chat';
import { Icon } from './Icon';
import { Skeleton } from './Skeleton';
import { useColors, typography, shadow, Palette } from '../theme';

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.surface },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24, gap: 12 },
    wrap: { width: '100%', maxWidth: 672, alignSelf: 'center', gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    title: { fontSize: 16, fontFamily: typography.extrabold, color: colors.onSurface },
    subtitle: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skeleton: {
      height: 76,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainer,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '1A',
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 24,
      gap: 6,
      minHeight: 280,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    emptyTitle: { fontSize: 14, fontFamily: typography.bold, color: colors.onSurface },
    emptySub: { fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
    browseBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.primary,
      ...shadow.card,
    },
    browseText: { fontSize: 12, fontFamily: typography.bold, color: colors.onPrimary },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant + '33',
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, minWidth: 0, gap: 2 },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 12, fontFamily: typography.bold, color: colors.onSurface, flexShrink: 1 },
    time: { fontSize: 10, color: colors.outline },
    listing: { fontSize: 11, fontFamily: typography.semibold, color: colors.primary },
    last: { fontSize: 11, color: colors.onSurfaceVariant },
  });

export const BuyerInbox: React.FC = () => {
  const { authUserId, openChatWithBroker, setCurrentScreen, t } = useApp();
  const colors = useColors();
  const styles = makeStyles(colors);

  const [items, setItems] = useState<BuyerInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.wrap}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('yourChats', 'Your Chats')}</Text>
            <Text style={styles.subtitle}>Conversations with brokers</Text>
          </View>
          <Pressable onPress={() => void load(true)} style={styles.refreshBtn} accessibilityLabel="Refresh">
            <Icon name="refresh" size={19} color={colors.primary} />
          </Pressable>
        </View>

        {loading ? (
          <View style={{ gap: 8 }}>
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
            <Skeleton style={styles.skeleton} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon name="forum" size={30} color={colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySub}>
              Contact a broker from a listing or the Dilaalo Directory and your conversation will
              appear here.
            </Text>
            <Pressable onPress={() => setCurrentScreen('home')} style={styles.browseBtn}>
              <Text style={styles.browseText}>Browse Listings</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {items.map((item) => (
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
                style={styles.row}
              >
                {item.brokerAvatar ? (
                  <Image source={{ uri: item.brokerAvatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Icon name="person" size={20} color={colors.outline} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.brokerName}
                    </Text>
                    <Text style={styles.time}>{item.lastAt}</Text>
                  </View>
                  <Text style={styles.listing} numberOfLines={1}>
                    {item.listingTitle}
                  </Text>
                  <Text style={styles.last} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};
