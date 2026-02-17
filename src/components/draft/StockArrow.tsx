/**
 * StockArrow Component
 * A small trending indicator showing prospect stock direction.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles';

export interface StockArrowProps {
  direction: 'up' | 'down' | 'steady';
  size?: number;
}

const ARROW_CONFIG: Record<
  StockArrowProps['direction'],
  { icon: 'trending-up' | 'trending-down' | 'remove'; color: string; label: string }
> = {
  up: { icon: 'trending-up', color: colors.success, label: 'Stock rising' },
  down: { icon: 'trending-down', color: colors.error, label: 'Stock falling' },
  steady: { icon: 'remove', color: colors.textLight, label: 'Stock steady' },
};

export function StockArrow({ direction, size = 14 }: StockArrowProps): React.JSX.Element {
  const config = ARROW_CONFIG[direction];

  return (
    <View style={styles.container} accessibilityLabel={config.label} accessibilityRole="image">
      <Ionicons name={config.icon} size={size} color={config.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StockArrow;
