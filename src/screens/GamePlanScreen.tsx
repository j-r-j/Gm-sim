/**
 * GamePlanScreen
 *
 * Weekly game plan and practice focus screen.
 * User allocates practice reps across focus areas and picks a game plan emphasis.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import {
  WeeklyGamePlan,
  PracticeFocusArea,
  GamePlanEmphasis,
  OpponentAnalysis,
  ALL_PRACTICE_FOCUS_AREAS,
  PRACTICE_FOCUS_LABELS,
  GAME_PLAN_EMPHASIS_LABELS,
  GAME_PLAN_EMPHASIS_DESCRIPTIONS,
  createDefaultGamePlan,
  updatePracticeFocus,
  setGamePlanEmphasis,
  confirmGamePlan,
} from '../core/gameplan';

export interface GamePlanScreenProps {
  week: number;
  opponentAnalysis: OpponentAnalysis | null;
  existingPlan: WeeklyGamePlan | null;
  onConfirm: (plan: WeeklyGamePlan) => void;
  onBack: () => void;
}

type GamePlanListItem =
  | { itemType: 'sectionHeader'; id: string; title: string; subtitle: string }
  | { itemType: 'practice'; id: string; area: PracticeFocusArea }
  | { itemType: 'emphasis'; id: string; emphasis: GamePlanEmphasis };


export function GamePlanScreen({
  week,
  opponentAnalysis,
  existingPlan,
  onConfirm,
  onBack,
}: GamePlanScreenProps): React.JSX.Element {
  const [plan, setPlan] = useState<WeeklyGamePlan>(existingPlan || createDefaultGamePlan(week));

  const totalAllocation = useMemo(
    () => Object.values(plan.practiceFocus).reduce((sum, v) => sum + v, 0),
    [plan.practiceFocus]
  );

  const listData = useMemo<GamePlanListItem[]>(
    () => [
      {
        itemType: 'sectionHeader' as const,
        id: 'practice-header',
        title: 'Practice Focus',
        subtitle: `Allocate practice reps (Total: ${totalAllocation}/100)`,
      },
      ...ALL_PRACTICE_FOCUS_AREAS.map((area) => ({
        itemType: 'practice' as const,
        id: `practice-${area}`,
        area,
      })),
      {
        itemType: 'sectionHeader' as const,
        id: 'emphasis-header',
        title: 'Game Plan Emphasis',
        subtitle: 'Choose your approach for this game',
      },
      ...(Object.keys(GAME_PLAN_EMPHASIS_LABELS) as GamePlanEmphasis[]).map((emphasis) => ({
        itemType: 'emphasis' as const,
        id: `emphasis-${emphasis}`,
        emphasis,
      })),
    ],
    [totalAllocation]
  );

  const handleFocusChange = useCallback((area: PracticeFocusArea, delta: number) => {
    setPlan((prev) => {
      const current = prev.practiceFocus[area];
      const newValue = Math.max(0, Math.min(50, current + delta));
      return updatePracticeFocus(prev, area, newValue);
    });
  }, []);

  const handleEmphasisSelect = useCallback((emphasis: GamePlanEmphasis) => {
    setPlan((prev) => setGamePlanEmphasis(prev, emphasis));
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(confirmGamePlan(plan));
  }, [onConfirm, plan]);

  const keyExtractor = useCallback((item: GamePlanListItem) => item.id, []);

  const renderItem = useCallback(
    ({ item, index }: { item: GamePlanListItem; index: number }) => {
      if (item.itemType === 'sectionHeader') {
        const isFirstSection = index === 0;
        return (
          <View
            style={[
              styles.card,
              styles.cardSectionHeader,
              !isFirstSection && styles.cardSpacer,
            ]}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </View>
        );
      }
      if (item.itemType === 'practice') {
        const practiceIndex = listData.findIndex((i) => i.id === item.id);
        const isLastPractice = practiceIndex === 8;
        return (
          <View
            style={[
              styles.cardSectionRow,
              isLastPractice && styles.cardSectionRowLast,
            ]}
          >
            <View style={[styles.focusRow, isLastPractice && styles.focusRowLast]}>
            <Text style={styles.focusLabel}>{PRACTICE_FOCUS_LABELS[item.area]}</Text>
            <View style={styles.focusControls}>
              <TouchableOpacity
                style={styles.focusButton}
                onPress={() => handleFocusChange(item.area, -5)}
                accessibilityLabel={`Decrease ${PRACTICE_FOCUS_LABELS[item.area]}`}
                accessibilityRole="button"
                hitSlop={accessibility.hitSlop}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.focusValueContainer}>
                <View
                  style={[
                    styles.focusBar,
                    { width: `${plan.practiceFocus[item.area]}%` },
                    plan.practiceFocus[item.area] > 15 && styles.focusBarHigh,
                    plan.practiceFocus[item.area] < 10 && styles.focusBarLow,
                  ]}
                />
                <Text style={styles.focusValue}>{plan.practiceFocus[item.area]}%</Text>
              </View>
              <TouchableOpacity
                style={styles.focusButton}
                onPress={() => handleFocusChange(item.area, 5)}
                accessibilityLabel={`Increase ${PRACTICE_FOCUS_LABELS[item.area]}`}
                accessibilityRole="button"
                hitSlop={accessibility.hitSlop}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          </View>
        );
      }
      const emphasisIndex = listData.findIndex((i) => i.id === item.id);
      const isLastEmphasis = emphasisIndex === listData.length - 1;
      return (
        <View style={[styles.cardSectionRow, isLastEmphasis && styles.cardSectionRowLast]}>
          <TouchableOpacity
            style={[
              styles.emphasisOption,
            plan.gamePlanEmphasis === item.emphasis && styles.emphasisOptionSelected,
          ]}
          onPress={() => handleEmphasisSelect(item.emphasis)}
          accessibilityLabel={`${GAME_PLAN_EMPHASIS_LABELS[item.emphasis]}: ${GAME_PLAN_EMPHASIS_DESCRIPTIONS[item.emphasis]}`}
          accessibilityRole="button"
          accessibilityState={{ selected: plan.gamePlanEmphasis === item.emphasis }}
        >
          <View style={styles.emphasisHeader}>
            <Text
              style={[
                styles.emphasisTitle,
                plan.gamePlanEmphasis === item.emphasis && styles.emphasisTitleSelected,
              ]}
            >
              {GAME_PLAN_EMPHASIS_LABELS[item.emphasis]}
            </Text>
            {plan.gamePlanEmphasis === item.emphasis && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </View>
          <Text style={styles.emphasisDesc}>
            {GAME_PLAN_EMPHASIS_DESCRIPTIONS[item.emphasis]}
          </Text>
        </TouchableOpacity>
        </View>
      );
    },
    [plan, listData, handleFocusChange, handleEmphasisSelect]
  );

  const ListHeaderComponent = useCallback(() => {
    if (!opponentAnalysis) return null;
    return (
      <View style={[styles.card, styles.headerCardSpacer]}>
        <Text style={styles.cardTitle}>Scouting Report: {opponentAnalysis.teamName}</Text>
        <Text style={styles.cardSubtitle}>{opponentAnalysis.record}</Text>

        {opponentAnalysis.weaknesses.length > 0 && (
          <View style={styles.analysisSection}>
            <Text style={styles.analysisSectionTitle}>Weaknesses</Text>
            {opponentAnalysis.weaknesses.map((w, i) => (
              <TouchableOpacity
                key={i}
                style={styles.weaknessItem}
                onPress={() => handleEmphasisSelect(w.suggestedEmphasis)}
                accessibilityLabel={`${w.area}: ${w.description}. Tap to set as emphasis.`}
                accessibilityRole="button"
              >
                <View style={styles.weaknessIcon}>
                  <Ionicons name="alert-circle" size={16} color={colors.warning} />
                </View>
                <View style={styles.weaknessText}>
                  <Text style={styles.weaknessArea}>{w.area}</Text>
                  <Text style={styles.weaknessDesc}>{w.description}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {opponentAnalysis.strengths.length > 0 && (
          <View style={styles.analysisSection}>
            <Text style={styles.analysisSectionTitle}>Strengths</Text>
            {opponentAnalysis.strengths.map((s, i) => (
              <View key={i} style={styles.strengthItem}>
                <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                <View style={styles.weaknessText}>
                  <Text style={styles.weaknessArea}>{s.area}</Text>
                  <Text style={styles.weaknessDesc}>{s.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [opponentAnalysis, handleEmphasisSelect]);

  const ListFooterComponent = useCallback(
    () => (
      <View style={styles.footerWrapper}>
        <TouchableOpacity
          style={[styles.confirmButton, plan.isSet && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={plan.isSet}
          accessibilityLabel={plan.isSet ? 'Game plan already set' : 'Confirm game plan'}
          accessibilityRole="button"
        >
          <Ionicons
            name={plan.isSet ? 'checkmark-circle' : 'clipboard'}
            size={24}
            color={colors.textOnPrimary}
          />
          <Text style={styles.confirmButtonText}>
            {plan.isSet ? 'Game Plan Set' : 'Confirm Game Plan'}
          </Text>
        </TouchableOpacity>
        <View style={styles.listFooterSpacer} />
      </View>
    ),
    [plan.isSet, handleConfirm]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>No items to display</Text>
      </View>
    ),
    []
  );

  const ItemSeparatorComponent = useCallback(
    ({ leadingItem }: { leadingItem: GamePlanListItem }) => {
      const isLastPractice =
        leadingItem.itemType === 'practice' &&
        leadingItem.id === `practice-${ALL_PRACTICE_FOCUS_AREAS[ALL_PRACTICE_FOCUS_AREAS.length - 1]}`;
      if (isLastPractice) {
        return <View style={styles.itemSeparator} />;
      }
      return null;
    },
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Week {week} Game Plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ListEmptyComponent={ListEmptyComponent}
        ItemSeparatorComponent={ItemSeparatorComponent}
        contentContainerStyle={styles.content}
        style={styles.scrollView}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  backText: { color: colors.textOnPrimary, fontSize: fontSize.md },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: { width: 70 },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  cardSpacer: { marginTop: spacing.md },
  headerCardSpacer: { marginBottom: spacing.md },
  cardSectionRow: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  cardSectionRowLast: {
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
    ...shadows.sm,
  },
  itemSeparator: { height: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardSectionHeader: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.md,
  },
  analysisSection: { marginTop: spacing.md },
  analysisSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  weaknessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  weaknessIcon: { width: 24, alignItems: 'center' },
  weaknessText: { flex: 1 },
  weaknessArea: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  weaknessDesc: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  focusRowLast: { borderBottomWidth: 0 },
  focusLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    width: 100,
    fontWeight: fontWeight.medium,
  },
  focusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  focusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  focusValueContainer: {
    flex: 1,
    height: 28,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  focusBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary + '40',
    borderRadius: borderRadius.sm,
  },
  focusBarHigh: { backgroundColor: colors.success + '50' },
  focusBarLow: { backgroundColor: colors.warning + '40' },
  focusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    zIndex: 1,
  },
  emphasisOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  emphasisOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  emphasisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emphasisTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emphasisTitleSelected: { color: colors.primary },
  emphasisDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minHeight: accessibility.minTouchTarget,
    ...shadows.md,
  },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  footerWrapper: { marginTop: spacing.md },
  listFooterSpacer: { height: spacing.xxxl },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default GamePlanScreen;
