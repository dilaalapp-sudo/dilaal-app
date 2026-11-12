import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Icon } from './Icon';
import { useColors, typography } from '../theme';
import { CONTENT_MAX_WIDTH } from '../responsive';

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
  const { notifications, language, currentUser, t } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = width < 360 ? 12 : width >= 600 ? 24 : 14;
  const unreadCount = notifications.filter((n) => n.unread).length;
  const rtl = language === 'ar';

  const fullName = currentUser?.name?.trim() || '';
  const firstName = fullName ? fullName.split(/\s+/)[0] : t('appName', 'DILAAL');
  const initial = (fullName || 'D').charAt(0).toUpperCase();
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('goodMorning', 'Good morning')
      : hour < 18
        ? t('goodAfternoon', 'Good afternoon')
        : t('goodEvening', 'Good evening');

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top, backgroundColor: '#003527' },
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['#0a5f46', '#003527']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.curveLarge} />
      <View pointerEvents="none" style={styles.curveSmall} />

      <View style={[styles.row, { paddingHorizontal: gutter, maxWidth: CONTENT_MAX_WIDTH }]}>
        <View style={[styles.left, rtl && { flexDirection: 'row-reverse' }]}>
          {showBack && onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel={t('back', 'Back')}
            >
              <Icon name={rtl ? 'arrow_forward' : 'arrow_back'} size={22} color="#ffffff" />
            </Pressable>
          ) : null}

          <Pressable
            onPress={onHomeClick}
            style={styles.identity}
            accessibilityRole="button"
            accessibilityLabel={t('appName', 'DILAAL')}
          >
            <View style={styles.avatar}>
              {fullName ? (
                <Text style={styles.avatarText} maxFontSizeMultiplier={1.2}>
                  {initial}
                </Text>
              ) : (
                <Icon name="domain" size={20} color="#003527" />
              )}
            </View>
            <View style={styles.textCol}>
              <View style={styles.greetingRow}>
                <Icon name="wb_sunny" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.greeting} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                  {greeting}
                </Text>
              </View>
              <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {firstName}
              </Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={onNotificationsClick}
          hitSlop={8}
          style={styles.bell}
          accessibilityRole="button"
          accessibilityLabel={t('notifications', 'Notifications')}
        >
          <Icon name="notifications" size={21} color="#ffffff" />
          {unreadCount > 0 && (
            <View style={[styles.dot, { backgroundColor: colors.secondaryContainer }]} />
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    zIndex: 40,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  curveLarge: {
    position: 'absolute',
    top: -110,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  curveSmall: {
    position: 'absolute',
    top: -10,
    right: -90,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    width: '100%',
    alignSelf: 'center',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 11, flexShrink: 1, minWidth: 0 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: typography.extrabold, color: '#003527' },
  textCol: { flexShrink: 1, minWidth: 0 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  greeting: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: 'rgba(255,255,255,0.78)',
  },
  name: {
    fontSize: 17,
    fontFamily: typography.extrabold,
    color: '#ffffff',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#003527',
  },
});
