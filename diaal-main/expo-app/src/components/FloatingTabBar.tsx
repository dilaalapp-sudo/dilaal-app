import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';

export type FloatingTabId = 'home' | 'search' | 'add' | 'chat' | 'profile';

export interface FloatingTabBarProps {
  /** React Navigation bottom-tabs state (optional, for navigator integration) */
  state?: {
    index: number;
    routes: { key: string; name: string; params?: unknown }[];
  };
  /** React Navigation descriptors (optional) */
  descriptors?: Record<
    string,
    {
      options?: {
        tabBarLabel?: string;
        title?: string;
        tabBarAccessibilityLabel?: string;
        tabBarTestID?: string;
      };
    }
  >;
  /** React Navigation navigation (optional) */
  navigation?: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: unknown) => void;
  };
  /** Fallback active tab id for custom navigation */
  activeTab?: FloatingTabId | string;
  /** Fallback tab change handler for custom navigation */
  onTabChange?: (tab: FloatingTabId | string) => void;
  /** Center add action */
  onAddPress?: () => void;
  /** Optional unread badge for chat */
  unreadChatCount?: number;
}

const THEME = {
  accent: '#1E8E5A',
  inactive: '#6B7280',
  highlight: '#DDF0E8',
  white: '#FFFFFF',
  barHeight: 68,
  sideMargin: 16,
  radius: 34,
  iconSize: 22,
};

type Slot = {
  id: FloatingTabId;
  label: string;
  accessibilityLabel: string;
  renderIcon: (active: boolean, color: string) => React.ReactNode;
};

const triggerHaptic = () => {
  try {
    // Optional dependency; safe no-op if unavailable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('expo-haptics');
    if (Haptics?.selectionAsync) {
      void Haptics.selectionAsync();
    } else if (Haptics?.impactAsync && Haptics.ImpactFeedbackStyle?.Light) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // no-op
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabSlotItem: React.FC<{
  slot: Slot;
  active: boolean;
  onPress: () => void;
  badge?: number;
  testID?: string;
}> = ({ slot, active, onPress, badge, testID }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(progress, {
        toValue: active ? 1 : 0,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
  }, [active, progress]);

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const color = active ? THEME.accent : THEME.inactive;
  const highlightStyle = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [
      {
        scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
      },
    ],
  };
  const dotStyle = {
    opacity: progress,
    transform: [
      {
        scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
      },
    ],
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityLabel={slot.accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.slot, { transform: [{ scale }] }]}
      hitSlop={6}
    >
      <View style={styles.iconArea}>
        <Animated.View style={[styles.highlight, highlightStyle]} />
        <View style={styles.iconWrap}>{slot.renderIcon(active, color)}</View>
        {typeof badge === 'number' && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {slot.label}
      </Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </AnimatedPressable>
  );
};

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  descriptors,
  navigation,
  activeTab,
  onTabChange,
  onAddPress,
  unreadChatCount = 0,
}) => {
  const insets = useSafeAreaInsets();

  const routeName = state ? state.routes[state.index]?.name : undefined;
  const resolvedActive: string =
    activeTab ??
    routeName ??
    'home';

  const slots: Slot[] = useMemo(
    () => [
      {
        id: 'home',
        label: 'Home',
        accessibilityLabel: 'Home tab',
        renderIcon: (_active, color) => <Ionicons name="home-outline" size={THEME.iconSize} color={color} />,
      },
      {
        id: 'search',
        label: 'Search',
        accessibilityLabel: 'Search tab',
        renderIcon: (_active, color) => <Ionicons name="search-outline" size={THEME.iconSize} color={color} />,
      },
      {
        id: 'add',
        label: 'Add',
        accessibilityLabel: 'Add new listing',
        renderIcon: () => <Feather name="plus" size={28} color={THEME.white} />,
      },
      {
        id: 'chat',
        label: 'Chat',
        accessibilityLabel: 'Chat tab',
        renderIcon: (_active, color) => (
          <Ionicons name="chatbubble-ellipses-outline" size={THEME.iconSize} color={color} />
        ),
      },
      {
        id: 'profile',
        label: 'Profile',
        accessibilityLabel: 'Profile tab',
        renderIcon: (_active, color) => <Ionicons name="person-outline" size={THEME.iconSize} color={color} />,
      },
    ],
    []
  );

  const handlePress = (id: FloatingTabId) => {
    triggerHaptic();

    if (id === 'add') {
      if (onAddPress) {
        onAddPress();
        return;
      }
      if (onTabChange) {
        onTabChange('add');
        return;
      }
    }

    if (state && navigation) {
      // Try to find a matching route by common name/id; fall back to index mapping.
      const idxMap: Record<FloatingTabId, number> = { home: 0, search: 1, add: 2, chat: 3, profile: 4 };
      const byName = state.routes.findIndex((r) => r.name.toLowerCase() === id);
      const routeIndex = byName >= 0 ? byName : idxMap[id];
      const route = state.routes[routeIndex];
      if (route) {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
        return;
      }
    }

    onTabChange?.(id);
  };

  const isActive = (slot: Slot): boolean => {
    const active = String(resolvedActive).toLowerCase();
    if (slot.id === 'add') return active === 'add' || active === 'post';
    return active === slot.id;
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 0) + 12 }]}
    >
      <View style={styles.bar}>
        {slots.map((slot) => {
          if (slot.id === 'add') {
            return (
              <View key={slot.id} style={styles.centerSlot}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={slot.accessibilityLabel}
                  onPress={() => handlePress('add')}
                  onPressIn={(e) => {
                    // quick scale via inline not necessary; keep simple
                  }}
                  style={({ pressed }) => [styles.addButton, pressed && { transform: [{ scale: 0.95 }] }]}
                >
                  {slot.renderIcon(false, THEME.white)}
                </AnimatedPressable>
              </View>
            );
          }
          const active = isActive(slot);
          return (
            <TabSlotItem
              key={slot.id}
              slot={slot}
              active={active}
              badge={slot.id === 'chat' ? unreadChatCount : undefined}
              onPress={() => handlePress(slot.id)}
              testID={state && descriptors ? undefined : `tab-${slot.id}`}
            />
          );
        })}
      </View>
    </View>
  );
};

export default FloatingTabBar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: THEME.sideMargin,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: THEME.barHeight,
    backgroundColor: THEME.white,
    borderRadius: THEME.radius,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  slot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconArea: {
    width: 40,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.highlight,
    borderRadius: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.accent,
    marginTop: 2,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 4,
    borderColor: THEME.white,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.white,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
