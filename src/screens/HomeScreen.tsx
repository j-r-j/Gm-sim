/**
 * HomeScreen
 * Main menu for navigating to different features of the app.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';

export type Screen = 'home' | 'gamecast' | 'draftBoard' | 'playerProfile';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

interface MenuButtonProps {
  title: string;
  subtitle: string;
  onPress: () => void;
  color?: string;
}

function MenuButton({
  title,
  subtitle,
  onPress,
  color = colors.primary,
}: MenuButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.menuButton, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuButtonTitle}>{title}</Text>
      <Text style={styles.menuButtonSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export function HomeScreen({ onNavigate }: HomeScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GM Sim</Text>
        <Text style={styles.subtitle}>NFL General Manager Simulation</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Demo Screens</Text>

        <MenuButton
          title="Gamecast"
          subtitle="Watch live game simulation with play-by-play"
          onPress={() => onNavigate('gamecast')}
          color={colors.success}
        />

        <MenuButton
          title="Draft Board"
          subtitle="Evaluate and compare draft prospects"
          onPress={() => onNavigate('draftBoard')}
          color={colors.secondary}
        />

        <MenuButton
          title="Player Profile"
          subtitle="View detailed player skills and traits"
          onPress={() => onNavigate('playerProfile')}
          color={colors.info}
        />

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Web Preview Mode</Text>
          <Text style={styles.infoText}>
            This is a demo view of the app's screens. The full game logic and simulation engine are
            connected - tap any screen to explore the UI.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  menuButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  menuButtonTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  menuButtonSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.info + '15',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.info,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});

export default HomeScreen;
