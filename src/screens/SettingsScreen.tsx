/**
 * SettingsScreen
 * User preferences and game settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { GameSettings, SimulationSpeed } from '../core/models/game/GameState';

/**
 * Props for SettingsScreen
 */
export interface SettingsScreenProps {
  /** Current settings */
  settings: GameSettings;
  /** Callback to update settings */
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  /** Callback to go back */
  onBack: () => void;
  /** Callback to clear save data */
  onClearData?: () => void;
  /** App version */
  version?: string;
}

/**
 * Setting row with toggle
 */
function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textSecondary}
      />
    </View>
  );
}

/**
 * Setting row with options
 */
function SelectSetting({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.optionButton, value === option.value && styles.optionButtonActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.optionText, value === option.value && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/**
 * Section header
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// Default settings fallback
const DEFAULT_SETTINGS: GameSettings = {
  simulationSpeed: 'normal',
  autoSaveEnabled: true,
  notificationsEnabled: true,
};

export function SettingsScreen({
  settings,
  onUpdateSettings,
  onBack,
  onClearData,
  version = '1.0.0',
}: SettingsScreenProps) {
  // Use fallback for safety if settings is undefined
  const safeSettings = settings ?? DEFAULT_SETTINGS;

  const handleClearData = () => {
    Alert.alert(
      'Clear Save Data',
      'This will permanently delete all saved games. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => {
            onClearData?.();
            Alert.alert('Data Cleared', 'All save data has been deleted.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Game Settings */}
        <SectionHeader title="Game" />
        <View style={styles.section}>
          <SelectSetting
            label="Simulation Speed"
            description="Speed of game simulations"
            options={[
              { label: 'Slow', value: 'slow' },
              { label: 'Normal', value: 'normal' },
              { label: 'Fast', value: 'fast' },
            ]}
            value={safeSettings.simulationSpeed}
            onChange={(value) => onUpdateSettings({ simulationSpeed: value as SimulationSpeed })}
          />
          <ToggleSetting
            label="Auto-Save"
            description="Automatically save after each week"
            value={safeSettings.autoSaveEnabled}
            onChange={(value) => onUpdateSettings({ autoSaveEnabled: value })}
          />
          <ToggleSetting
            label="Notifications"
            description="Show in-game notifications"
            value={safeSettings.notificationsEnabled}
            onChange={(value) => onUpdateSettings({ notificationsEnabled: value })}
          />
        </View>

        {/* Data Management */}
        <SectionHeader title="Data" />
        <View style={styles.section}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Text style={styles.dangerButtonText}>Clear All Save Data</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>{version}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Developer</Text>
            <Text style={styles.aboutValue}>GM Sim Team</Text>
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  settingDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  optionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.background,
    fontWeight: fontWeight.medium,
  },
  dangerButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  aboutValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default SettingsScreen;
