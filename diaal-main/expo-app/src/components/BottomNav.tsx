import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, TabId } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography, shadow } from '../theme';
import { NAV_MAX_WIDTH } from '../responsive';

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
  const { width } = useWindowDimensions();
  const rtl = language === 'ar';

  // Three tiers so the bar stays proportionate from 320 dp phones to iPads.
  const isTablet = width >= 600;
  const isCompact = width < 360;
  const maxNavWidth = isTablet ? 640 : NAV_MAX_WIDTH;
  const sideInset = insets.left + insets.right;
  const navWidth = Math.min(
    width - (isTablet ? 64 : isCompact ? 20 : 28) - sideInset,
    maxNavWidth
  );
  const rowGutter = isTablet ? 56 : isCompact ? 10 : 20;
  const rowHeight = isTablet ? 86 : isCompact ? 68 : 74;
  const iconSize = isTablet ? 26 : isCompact ? 22 : 23;
  const iconPillW = isTablet ? 56 : isCompact ? 46 : 50;
  const iconPillH = isTablet ? 42 : isCompact ? 36 : 38;
  const postSize = isTablet ? 68 : isCompact ? 56 : 60;
  const labelSize = isTablet ? 12.5 : isCompact ? 11 : 11.5;
  const lift = Math.max(insets.bottom, 4) + (isTablet ? 12 : 16);

  const tab = (id: TabId, icon: string, label: string) => {
    const active = activeTab === id;
    return (
      <Pressable
        key={id}
        onPress={() => onTabChange(id)}
        style={styles.tab}
        accessibilityLabel={label}
      >
        <View
          style={[
            styles.iconPill,
            { width: iconPillW, height: iconPillH },
            active && { backgroundColor: colors.success + '1F' },
          ]}
        >
          <Icon
            name={icon}
            size={iconSize}
            color={active ? colors.success : colors.outline}
          />
          {id === 'chat' && unreadChatCount > 0 && (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.secondaryContainer, borderColor: colors.surfaceContainerLowest },
              ]}
            >
              <Text style={styles.badgeText}>{unreadChatCount}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.label,
            { color: active ? colors.success : colors.outline, fontSize: labelSize },
            active && { fontFamily: typography.bold },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        <View
          style={[
            styles.dot,
            { backgroundColor: active ? colors.success : 'transparent' },
          ]}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.nav,
        {
          marginTop: 6,
          marginBottom: lift,
          width: navWidth,
          alignSelf: 'center',
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.outlineVariant + '26',
        },
      ]}
    >
      <View
        style={[
          styles.row,
          { paddingHorizontal: rowGutter, height: rowHeight },
          rtl && { flexDirection: 'row-reverse' },
        ]}
      >
        {tab('home', 'home', t('navHome', 'Home'))}
        {tab('search', 'search', t('navSearch', 'Search'))}

        <Pressable
          key="post"
          onPress={() => onTabChange('post')}
          style={styles.postTab}
          accessibilityLabel={t('navPost', 'Post')}
        >
          <View
            style={[
              styles.postBtn,
              shadow.floating,
              {
                width: postSize,
                height: postSize,
                borderRadius: postSize / 2,
                top: isTablet ? -6 : -4,
                backgroundColor: colors.success,
                borderColor: colors.surfaceContainerLowest,
              },
            ]}
          >
            <Icon name="add" size={isTablet ? 34 : 30} color="#ffffff" />
          </View>
        </Pressable>

        {tab('chat', 'chat_bubble', t('navChat', 'Chat'))}
        {tab('profile', 'person', t('navProfile', 'Profile'))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    borderRadius: 32,
    borderWidth: 1,
    zIndex: 40,
    shadowColor: '#0b1410',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 74,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    gap: 2,
  },
  iconPill: {
    width: 50,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11.5, fontFamily: typography.semibold, letterSpacing: 0.1 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#663500', fontSize: 9, fontFamily: typography.bold },
  postTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  postBtn: {
    position: 'absolute',
    top: -4,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
