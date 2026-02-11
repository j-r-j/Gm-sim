/**
 * DraftTradeCalculatorScreen
 * Simple pick value chart and two-panel trade evaluator
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
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
import { ScreenHeader } from '../components';

/**
 * Represents a draft pick available for trade evaluation
 */
export interface TradeCalcPick {
  id: string;
  round: number;
  pickNumber: number | null;
  year: number;
  teamAbbreviation: string;
  label: string;
}

/**
 * Props for DraftTradeCalculatorScreen
 */
export interface DraftTradeCalculatorScreenProps {
  picks: TradeCalcPick[];
  onBack: () => void;
}

/**
 * Draft pick value chart - higher picks have higher values
 * Based on a simplified Jimmy Johnson trade value chart
 */
const PICK_VALUES: Record<number, number[]> = {
  1: [
    3000, 2600, 2200, 1800, 1700, 1600, 1500, 1400, 1350, 1300, 1250, 1200, 1150, 1100, 1050, 1000,
    950, 900, 875, 850, 800, 780, 760, 740, 720, 700, 680, 660, 640, 620, 600, 590,
  ],
  2: [
    580, 560, 540, 520, 500, 480, 460, 450, 440, 430, 420, 410, 400, 390, 380, 370, 360, 350, 340,
    330, 320, 310, 300, 290, 285, 280, 275, 270, 265, 260, 255, 250,
  ],
  3: [
    245, 240, 235, 230, 225, 220, 215, 210, 206, 202, 198, 194, 190, 186, 182, 178, 174, 170, 166,
    162, 158, 155, 152, 149, 146, 143, 140, 137, 134, 131, 128, 125,
  ],
  4: [
    122, 119, 116, 113, 110, 108, 106, 104, 102, 100, 98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 78,
    76, 74, 72, 70, 69, 68, 67, 66, 65, 64, 63,
  ],
  5: [
    62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 40, 39,
    38, 37, 36, 35, 34, 33, 32, 31,
  ],
  6: [
    30, 29.5, 29, 28.5, 28, 27.5, 27, 26.5, 26, 25.5, 25, 24.5, 24, 23.5, 23, 22.5, 22, 21.5, 21,
    20.5, 20, 19.5, 19, 18.5, 18, 17.5, 17, 16.5, 16, 15.5, 15, 14.5,
  ],
  7: [
    14, 13.5, 13, 12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5,
    3, 2.5, 2, 2, 1.5, 1.5, 1, 1, 1, 1,
  ],
};

/**
 * Get the trade value of a pick
 */
function getPickValue(round: number, pickInRound: number): number {
  const roundValues = PICK_VALUES[round];
  if (!roundValues) return 0;
  const index = Math.min(Math.max(pickInRound - 1, 0), roundValues.length - 1);
  return roundValues[index];
}

/**
 * Get the trade value of a TradeCalcPick
 */
function getTradeCalcPickValue(pick: TradeCalcPick): number {
  const pickInRound = pick.pickNumber ? ((pick.pickNumber - 1) % 32) + 1 : 16; // Default to middle of round if unknown
  return getPickValue(pick.round, pickInRound);
}

/**
 * Get fairness label based on value difference
 */
function getFairnessLabel(
  sideAValue: number,
  sideBValue: number
): { label: string; color: string } {
  if (sideAValue === 0 && sideBValue === 0) {
    return { label: 'Add picks to compare', color: colors.textSecondary };
  }
  const diff = Math.abs(sideAValue - sideBValue);
  const maxVal = Math.max(sideAValue, sideBValue);
  if (maxVal === 0) {
    return { label: 'Add picks to compare', color: colors.textSecondary };
  }
  const pctDiff = diff / maxVal;

  if (pctDiff <= 0.1) {
    return { label: 'Fair Trade', color: colors.success };
  } else if (pctDiff <= 0.25) {
    return { label: 'Slightly Uneven', color: colors.warning };
  } else {
    return { label: 'Unfair Trade', color: colors.error };
  }
}

type TabType = 'calculator' | 'chart';

/**
 * Pick Value Chart Row
 */
function PickValueRow({
  round,
  pickInRound,
  value,
}: {
  round: number;
  pickInRound: number;
  value: number;
}) {
  const overall = (round - 1) * 32 + pickInRound;
  return (
    <View style={styles.chartRow}>
      <Text style={styles.chartPick}>
        R{round} P{pickInRound}
      </Text>
      <Text style={styles.chartOverall}>#{overall}</Text>
      <View style={styles.chartBarContainer}>
        <View style={[styles.chartBar, { width: `${Math.min((value / 3000) * 100, 100)}%` }]} />
      </View>
      <Text style={styles.chartValue}>{Math.round(value)}</Text>
    </View>
  );
}

/**
 * Selected pick chip in the trade evaluator
 */
function PickChip({
  pick,
  value,
  onRemove,
}: {
  pick: TradeCalcPick;
  value: number;
  onRemove: () => void;
}) {
  return (
    <View style={styles.pickChip}>
      <View style={styles.pickChipInfo}>
        <Text style={styles.pickChipLabel}>{pick.label}</Text>
        <Text style={styles.pickChipValue}>{Math.round(value)} pts</Text>
      </View>
      <TouchableOpacity
        style={styles.pickChipRemove}
        onPress={onRemove}
        accessibilityLabel={`Remove ${pick.label}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Ionicons name="close" size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Trade side panel
 */
function TradeSidePanel({
  title,
  selectedPicks,
  totalValue,
  availablePicks,
  onAddPick,
  onRemovePick,
}: {
  title: string;
  selectedPicks: TradeCalcPick[];
  totalValue: number;
  availablePicks: TradeCalcPick[];
  onAddPick: (pick: TradeCalcPick) => void;
  onRemovePick: (pickId: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedIds = new Set(selectedPicks.map((p) => p.id));
  const remaining = availablePicks.filter((p) => !selectedIds.has(p.id));

  return (
    <View style={styles.tradePanel}>
      <Text style={styles.tradePanelTitle}>{title}</Text>

      {/* Selected picks */}
      <View style={styles.selectedPicks}>
        {selectedPicks.length === 0 ? (
          <Text style={styles.noPicks}>No picks selected</Text>
        ) : (
          selectedPicks.map((pick) => (
            <PickChip
              key={pick.id}
              pick={pick}
              value={getTradeCalcPickValue(pick)}
              onRemove={() => onRemovePick(pick.id)}
            />
          ))
        )}
      </View>

      {/* Total value */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Value:</Text>
        <Text style={styles.totalValue}>{Math.round(totalValue)} pts</Text>
      </View>

      {/* Add pick button */}
      <TouchableOpacity
        style={styles.addPickButton}
        onPress={() => setShowPicker(!showPicker)}
        accessibilityLabel={`Add pick to ${title}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Ionicons
          name={showPicker ? 'chevron-up' : 'add-circle'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.addPickText}>{showPicker ? 'Hide picks' : 'Add pick'}</Text>
      </TouchableOpacity>

      {/* Pick picker */}
      {showPicker && (
        <View style={styles.pickPicker}>
          {remaining.length === 0 ? (
            <Text style={styles.noMorePicks}>No more picks available</Text>
          ) : (
            remaining.slice(0, 20).map((pick) => (
              <TouchableOpacity
                key={pick.id}
                style={styles.pickPickerItem}
                onPress={() => {
                  onAddPick(pick);
                  setShowPicker(false);
                }}
                accessibilityLabel={`Select ${pick.label}`}
                accessibilityRole="button"
              >
                <Text style={styles.pickPickerLabel}>{pick.label}</Text>
                <Text style={styles.pickPickerValue}>
                  {Math.round(getTradeCalcPickValue(pick))} pts
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Draft Trade Calculator Screen
 */
export function DraftTradeCalculatorScreen({
  picks,
  onBack,
}: DraftTradeCalculatorScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [sideAPicks, setSideAPicks] = useState<TradeCalcPick[]>([]);
  const [sideBPicks, setSideBPicks] = useState<TradeCalcPick[]>([]);

  const sideAValue = useMemo(
    () => sideAPicks.reduce((sum, p) => sum + getTradeCalcPickValue(p), 0),
    [sideAPicks]
  );
  const sideBValue = useMemo(
    () => sideBPicks.reduce((sum, p) => sum + getTradeCalcPickValue(p), 0),
    [sideBPicks]
  );

  const fairness = getFairnessLabel(sideAValue, sideBValue);

  // Generate chart data for display (first 3 rounds in detail, summary for 4-7)
  const chartData = useMemo(() => {
    const data: { round: number; pickInRound: number; value: number }[] = [];
    for (let round = 1; round <= 7; round++) {
      const step = round <= 2 ? 1 : round <= 4 ? 4 : 8;
      for (let pick = 1; pick <= 32; pick += step) {
        data.push({
          round,
          pickInRound: pick,
          value: getPickValue(round, pick),
        });
      }
    }
    return data;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Trade Calculator" onBack={onBack} testID="trade-calc-header" />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calculator' && styles.tabActive]}
          onPress={() => setActiveTab('calculator')}
        >
          <Text style={[styles.tabText, activeTab === 'calculator' && styles.tabTextActive]}>
            Calculator
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chart' && styles.tabActive]}
          onPress={() => setActiveTab('chart')}
        >
          <Text style={[styles.tabText, activeTab === 'chart' && styles.tabTextActive]}>
            Value Chart
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'calculator' ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Fairness indicator */}
          <View style={[styles.fairnessCard, { borderColor: fairness.color }]}>
            <Text style={[styles.fairnessLabel, { color: fairness.color }]}>{fairness.label}</Text>
            {sideAValue > 0 && sideBValue > 0 && (
              <Text style={styles.fairnessDiff}>
                Difference: {Math.round(Math.abs(sideAValue - sideBValue))} pts
                {sideAValue > sideBValue
                  ? ' (Side A favored)'
                  : sideAValue < sideBValue
                    ? ' (Side B favored)'
                    : ''}
              </Text>
            )}
          </View>

          {/* Two-panel trade evaluator */}
          <View style={styles.tradePanels}>
            <TradeSidePanel
              title="Side A"
              selectedPicks={sideAPicks}
              totalValue={sideAValue}
              availablePicks={picks}
              onAddPick={(pick) => setSideAPicks([...sideAPicks, pick])}
              onRemovePick={(id) => setSideAPicks(sideAPicks.filter((p) => p.id !== id))}
            />

            <View style={styles.panelDivider}>
              <Ionicons name="swap-horizontal" size={20} color={colors.textSecondary} />
            </View>

            <TradeSidePanel
              title="Side B"
              selectedPicks={sideBPicks}
              totalValue={sideBValue}
              availablePicks={picks}
              onAddPick={(pick) => setSideBPicks([...sideBPicks, pick])}
              onRemovePick={(id) => setSideBPicks(sideBPicks.filter((p) => p.id !== id))}
            />
          </View>

          {/* Reset button */}
          {(sideAPicks.length > 0 || sideBPicks.length > 0) && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSideAPicks([]);
                setSideBPicks([]);
              }}
              accessibilityLabel="Reset calculator"
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={chartData}
          keyExtractor={(item) => `r${item.round}-p${item.pickInRound}`}
          renderItem={({ item }) => (
            <PickValueRow round={item.round} pickInRound={item.pickInRound} value={item.value} />
          )}
          style={styles.content}
          contentContainerStyle={styles.chartContainer}
          ListHeaderComponent={
            <View style={styles.chartHeader}>
              <Text style={styles.chartHeaderText}>Draft Pick Trade Value Chart</Text>
              <Text style={styles.chartSubtext}>Higher values indicate more valuable picks</Text>
            </View>
          }
          stickyHeaderIndices={[0]}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  // Fairness card
  fairnessCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    padding: spacing.lg,
    alignItems: 'center',
  },
  fairnessLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  fairnessDiff: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Trade panels
  tradePanels: {
    gap: spacing.sm,
  },
  tradePanel: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  tradePanelTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  panelDivider: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  // Selected picks
  selectedPicks: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  noPicks: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // Pick chip
  pickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pickChipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickChipLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  pickChipValue: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  pickChipRemove: {
    padding: spacing.xs,
  },
  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // Add pick button
  addPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  addPickText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  // Pick picker
  pickPicker: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    maxHeight: 200,
  },
  pickPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickPickerLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  pickPickerValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  noMorePicks: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Reset button
  resetButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  // Chart styles
  chartContainer: {
    padding: spacing.md,
  },
  chartHeader: {
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },
  chartHeaderText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chartSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  chartPick: {
    width: 55,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  chartOverall: {
    width: 35,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  chartBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  chartValue: {
    width: 40,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
  },
});

export default DraftTradeCalculatorScreen;
