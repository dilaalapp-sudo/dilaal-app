import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, TabId } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  unreadChatCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadChatCount = 0,
}) => {
  const { t, language } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const rtl = language === 'ar';

  const tab = (id: TabId, icon: string, label: string) => {
    const active = activeTab === id;
    return (
      <Pressable
        key={id}
        onPress={() => onTabChange(id)}
        style={[styles.tab, rtl && { flexDirection: 'row-reverse' }]}
        accessibilityLabel={label}
      >
        <View style={styles.iconWrap}>
          <Icon name={icon} size={23} color={active ? colors.primaryContainer : colors.onSurfaceVariant} />
          {id === 'chat' && unreadChatCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.secondaryContainer }]}>
              <Text style={styles.badgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </View>
        <View style={[styles.bottomLine, { backgroundColor: active ? colors.secondaryContainer : 'transparent' }]} />
        <Text
          style={[
            styles.label,
            { color: active ? colors.primaryContainer : colors.onSurfaceVariant },
            active && { fontFamily: typography.bold },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.nav,
        {
          paddingBottom: Math.max(insets.bottom, 6),
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant + '33',
        },
      ]}
    >
      <View style={[styles.row, rtl && { flexDirection: 'row-reverse' }]}>
        {tab('home', 'home', t('navHome', 'Home'))}
        {tab('search', 'search', t('navSearch', 'Search'))}

        <Pressable
          key="post"
          onPress={() => onTabChange('post')}
          style={styles.postTab}
          accessibilityLabel={t('navPost', 'Post')}
        >
          <View style={[styles.postBtn, shadow.floating]}>
            <Icon name="add" size={28} color="#ffffff" />
          </View>
          <Text
            style={[
              styles.postLabel,
              {
                color:
                  activeTab === 'post' ? colors.primaryContainer : colors.onSurfaceVariant,
              },
              activeTab === 'post' && { fontFamily: typography.bold },
            ]}
          >
            {t('navPost', 'Post')}
          </Text>
        </Pressable>

        {tab('chat', 'chat_bubble', t('navChat', 'Chat'))}
        {tab('profile', 'person', t('navProfile', 'Profile'))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 56,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    maxWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 1,
  },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  bottomLine: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  label: { fontSize: 10, fontFamily: typography.semibold, marginTop: 1 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#663500', fontSize: 9, fontFamily: typography.bold },
  postTab: {
    flex: 1,
    maxWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  postBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postLabel: {
    fontSize: 10,
    fontFamily: typography.semibold,
    marginTop: 2,
  },
});
