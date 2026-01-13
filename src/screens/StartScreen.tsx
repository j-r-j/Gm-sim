/**
 * StartScreen
 * Welcome screen with New Game, Continue, and Settings options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { gameStorage, SaveSlot } from '../services/storage/GameStorage';
import { GameState, getGameStateSummary } from '../core/models/game/GameState';

const { width } = Dimensions.get('window');

interface SaveSlotInfo {
  slot: SaveSlot;
  exists: boolean;
  summary?: {
    userName: string;
    teamName: string;
    year: number;
    week: number;
    phase: string;
    record: string;
    seasonsPlayed: number;
  };
}

interface StartScreenProps {
  onNewGame: () => void;
  onContinue: (slot: SaveSlot) => void;
  onSettings: () => void;
}

export function StartScreen({ onNewGame, onContinue, onSettings }: StartScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [showContinueModal, setShowContinueModal] = useState(false);

  useEffect(() => {
    loadSaveSlots();
  }, []);

  const loadSaveSlots = async () => {
    setLoading(true);
    const slots: SaveSlotInfo[] = [];

    for (const slot of [0, 1, 2] as SaveSlot[]) {
      const exists = await gameStorage.slotExists(slot);
      let summary;

      if (exists) {
        const data = await gameStorage.load<GameState>(slot);
        if (data) {
          summary = getGameStateSummary(data);
        }
      }

      slots.push({ slot, exists, summary });
    }

    setSaveSlots(slots);
    setLoading(false);
  };

  const hasSavedGames = saveSlots.some((s) => s.exists);

  const handleContinue = () => {
    const existingSlots = saveSlots.filter((s) => s.exists);
    if (existingSlots.length === 1) {
      onContinue(existingSlots[0].slot);
    } else {
      setShowContinueModal(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🏈</Text>
          </View>
          <Text style={styles.title}>GM Sim</Text>
          <Text style={styles.subtitle}>Football General Manager</Text>
          <Text style={styles.tagline}>Build Your Dynasty</Text>
        </View>

        {/* Main Menu Buttons */}
        <View style={styles.menuSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onNewGame}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>New Game</Text>
            <Text style={styles.primaryButtonSubtext}>Start your GM career</Text>
          </TouchableOpacity>

          {hasSavedGames && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Continue</Text>
              <Text style={styles.secondaryButtonSubtext}>Load saved game</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={onSettings}
            activeOpacity={0.8}
          >
            <Text style={styles.tertiaryButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <Text style={styles.version}>v1.0.0</Text>
      </View>

      {/* Continue Modal - Select Save Slot */}
      {showContinueModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select Save</Text>

            {saveSlots.filter((s) => s.exists).map((slotInfo) => (
              <TouchableOpacity
                key={slotInfo.slot}
                style={styles.saveSlotButton}
                onPress={() => {
                  setShowContinueModal(false);
                  onContinue(slotInfo.slot);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.saveSlotHeader}>
                  <Text style={styles.saveSlotTitle}>
                    Slot {slotInfo.slot + 1}
                  </Text>
                  <Text style={styles.saveSlotTeam}>
                    {slotInfo.summary?.teamName}
                  </Text>
                </View>
                <View style={styles.saveSlotInfo}>
                  <Text style={styles.saveSlotDetail}>
                    {slotInfo.summary?.userName} • Year {slotInfo.summary?.year}
                  </Text>
                  <Text style={styles.saveSlotDetail}>
                    Record: {slotInfo.summary?.record} • {slotInfo.summary?.phase}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowContinueModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.lg,
  },
  logoIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: fontSize.display + 8,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.xl,
    color: colors.textOnPrimary,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.7,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  menuSection: {
    width: '100%',
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.lg,
  },
  primaryButtonText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  primaryButtonSubtext: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.md,
  },
  secondaryButtonText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  secondaryButtonSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  tertiaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: fontSize.lg,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  version: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    ...shadows.lg,
  },
  modalTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  saveSlotButton: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  saveSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  saveSlotTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  saveSlotTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveSlotInfo: {
    gap: spacing.xxs,
  },
  saveSlotDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default StartScreen;
