import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { SpecChip } from '../lib/listingSpecs';
import { useColors, typography } from '../theme';

interface SpecChipsProps {
  chips: SpecChip[];
  size?: 'sm' | 'md';
}

export const SpecChips: React.FC<SpecChipsProps> = ({ chips, size = 'sm' }) => {
  const colors = useColors();
  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((chip, index) => (
        <View key={`${chip.icon}-${index}`} style={[styles.chip, { backgroundColor: colors.surfaceContainer }]}>
          <Icon
            name={chip.icon}
            size={size === 'sm' ? 13 : 14}
            color={chip.icon === 'verified' ? colors.primary : colors.onSurfaceVariant}
          />
          <Text style={[styles.text, { color: colors.onSurfaceVariant, fontSize: size === 'sm' ? 11 : 12 }]} numberOfLines={1}>
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '100%',
  },
  text: { fontFamily: typography.semibold, flexShrink: 1 },
});
