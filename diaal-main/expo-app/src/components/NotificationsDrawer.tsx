import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';

export const NotificationsDrawer: React.FC = () => {
  const {
    isNotificationsOpen,
    setIsNotificationsOpen,
    notifications,
    markNotificationsAsRead,
    setCurrentScreen,
    setActiveTab,
    t,
    language,
  } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!isNotificationsOpen) return null;

  const unread = notifications.filter((n) => n.unread).length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setIsNotificationsOpen(false)}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={() => setIsNotificationsOpen(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surfaceContainerLowest,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              borderLeftColor: colors.outlineVariant + '40',
            },
          ]}
        >
          <View style={[styles.panelHeader, { borderBottomColor: colors.surfaceContainer }]}>
            <View style={styles.headerLeft}>
              <Icon name="notifications" size={22} color={colors.primary} />
              <View>
                <Text style={[styles.title, { color: colors.onSurface }]}>{t('notifications', 'Notifications')}</Text>
                <Text style={[styles.subtitle, { color: colors.outline }]}>Marketplace Updates</Text>
              </View>
            </View>
            <Pressable onPress={() => setIsNotificationsOpen(false)} style={[styles.closeBtn, { backgroundColor: colors.surfaceContainer }]}>
              <Icon name="close" size={16} color={colors.outline} />
            </Pressable>
          </View>

          {notifications.length > 0 && (
            <View style={[styles.markRow, { backgroundColor: colors.surfaceContainerLow }]}>
              <Text style={[styles.unreadText, { color: colors.onSurfaceVariant }]}>
                {unread} {language === 'so' ? 'Cusbooneysiin' : language === 'ar' ? 'تحديثات جديدة' : 'Unread Updates'}
              </Text>
              <Pressable onPress={markNotificationsAsRead}>
                <Text style={[styles.markBtn, { color: colors.primary }]}>
                  {language === 'so' ? 'Dhammaan akhri' : language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                </Text>
              </Pressable>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.list}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainer }]}>
                  <Icon name="notifications_off" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                  {t('noNotifications', 'No Notifications Yet')}
                </Text>
                <Text style={[styles.emptySub, { color: colors.onSurfaceVariant }]}>
                  {t(
                    'noNotificationsSub',
                    'Updates about your listings, messages, and verification status will appear here.'
                  )}
                </Text>
              </View>
            ) : (
              notifications.map((n) => (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    if (n.title.includes('Offer')) {
                      setActiveTab('chat');
                      setCurrentScreen('chat');
                    } else if (n.title.includes('Escrow') || n.title.includes('Deposit')) {
                      setCurrentScreen('deal');
                    } else {
                      setCurrentScreen('details');
                    }
                    setIsNotificationsOpen(false);
                  }}
                  style={[
                    styles.card,
                    {
                      backgroundColor: n.unread ? colors.primary + '0D' : colors.surfaceContainerLow,
                      borderColor: n.unread ? colors.primary + '4D' : colors.outlineVariant + '26',
                      opacity: n.unread ? 1 : 0.85,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      {n.unread && <View style={[styles.unreadDot, { backgroundColor: colors.secondaryContainer }]} />}
                      <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                        {n.title}
                      </Text>
                    </View>
                    <Text style={[styles.time, { color: colors.outline }]}>{n.time}</Text>
                  </View>
                  <Text style={[styles.desc, { color: colors.onSurfaceVariant }]}>{n.desc}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    width: 330,
    maxWidth: '88%',
    height: '100%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    ...shadow.floating,
  },
  panelHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, fontFamily: typography.bold },
  subtitle: { fontSize: 10, marginTop: 1 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  markRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unreadText: { fontSize: 11, fontFamily: typography.semibold },
  markBtn: { fontSize: 11, fontFamily: typography.bold },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontFamily: typography.bold },
  emptySub: { fontSize: 11, textAlign: 'center', lineHeight: 17, maxWidth: 240 },
  card: { padding: 12, borderRadius: 16, borderWidth: 1, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  cardTitle: { fontSize: 12, fontFamily: typography.bold, flexShrink: 1 },
  time: { fontSize: 10 },
  desc: { fontSize: 11, lineHeight: 16 },
});
