import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, typography } from '../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  accent,
  action,
}) => {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.bar, { backgroundColor: accent || colors.primaryContainer }]} />
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={[styles.subtitle, { color: colors.outline }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  bar: { width: 8, height: 20, borderRadius: 4 },
  texts: { flex: 1 },
  title: { fontSize: 16, fontFamily: typography.bold, letterSpacing: -0.3 },
  subtitle: { fontSize: 11, fontFamily: typography.semibold, marginTop: 1 },
});
