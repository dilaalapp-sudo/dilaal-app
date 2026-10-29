import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography } from '../theme';

interface HeaderProps {
  onHomeClick: () => void;
  onNotificationsClick: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onNotificationsClick,
  showBack = false,
  onBack,
}) => {
  const { notifications, language } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const unreadCount = notifications.filter((n) => n.unread).length;
  const rtl = language === 'ar';

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant + '40' }]}>
      <View style={styles.row}>
        <View style={[styles.left, rtl && { flexDirection: 'row-reverse' }]}>
          {showBack && onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
              <Icon name={rtl ? 'arrow_forward' : 'arrow_back'} size={24} color={colors.onSurface} />
            </Pressable>
          ) : null}

          <Pressable onPress={onHomeClick} style={[styles.brand, rtl && { flexDirection: 'row-reverse' }]}>
            <View style={styles.logo}>
              <Icon name="domain" size={19} color="#ffffff" />
            </View>
            <Text style={[styles.brandText, { color: colors.primary }]}>DILAAL</Text>
          </Pressable>
        </View>

        <Pressable onPress={onNotificationsClick} hitSlop={8} style={styles.bell}>
          <Icon name="notifications" size={22} color={colors.onSurfaceVariant} />
          {unreadCount > 0 && <View style={[styles.dot, { backgroundColor: colors.secondaryContainer }]} />}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    zIndex: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: 58,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 17, fontFamily: typography.extrabold, letterSpacing: -0.4 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
