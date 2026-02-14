/**
 * CoachingTreeScreen
 * Displays coaching tree relationships, philosophy inheritance, and chemistry
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  CoachingTree,
  TreeName,
  RiskTolerance,
  COMPATIBLE_TREES,
  CONFLICTING_TREES,
} from '../core/models/staff/CoachingTree';
import { Coach } from '../core/models/staff/Coach';

/**
 * Props for CoachingTreeScreen
 */
export interface CoachingTreeScreenProps {
  gameState: GameState;
  coach: Coach;
  relatedCoaches: Coach[];
  onBack: () => void;
  onCoachSelect?: (coachId: string) => void;
}

/**
 * Gets display name for tree
 */
function getTreeDisplayName(treeName: TreeName): string {
  const treeNames: Record<TreeName, string> = {
    walsh: 'Bill Walsh Tree',
    parcells: 'Bill Parcells Tree',
    belichick: 'Bill Belichick Tree',
    shanahan: 'Mike Shanahan Tree',
    reid: 'Andy Reid Tree',
    coughlin: 'Tom Coughlin Tree',
    dungy: 'Tony Dungy Tree',
    holmgren: 'Mike Holmgren Tree',
    gruden: 'Jon Gruden Tree',
    payton: 'Sean Payton Tree',
  };
  return treeNames[treeName];
}

/**
 * Gets description for tree
 */
function getTreeDescription(treeName: TreeName): string {
  const descriptions: Record<TreeName, string> = {
    walsh:
      'Known for the West Coast Offense, emphasizing short, horizontal passing and ball control.',
    parcells:
      'Defensive-minded with a physical running game approach. Values discipline and toughness.',
    belichick:
      'Defensive genius known for game planning and adaptability. No personnel is indispensable.',
    shanahan: 'Zone-blocking running scheme innovator. Creative offensive play-calling.',
    reid: 'Offensive innovator known for developing quarterbacks and creative formations.',
    coughlin: 'Disciplinarian with attention to detail. Strong in preparation and fundamentals.',
    dungy: 'Pioneered the Tampa 2 defense. Known for character-first coaching philosophy.',
    holmgren:
      'Quarterback developer and offensive tactician. Walsh disciple who spread the system.',
    gruden: 'Aggressive offensive playcaller. High energy and detail-oriented preparation.',
    payton:
      'Creative offensive mind. Known for innovative trick plays and quarterback development.',
  };
  return descriptions[treeName];
}

/**
 * Gets color for risk tolerance
 */
function getRiskToleranceColor(risk: RiskTolerance): string {
  switch (risk) {
    case 'conservative':
      return colors.primary;
    case 'balanced':
      return colors.warning;
    case 'aggressive':
      return colors.error;
  }
}

/**
 * Gets chemistry relationship description
 */
function getChemistryDescription(
  coach1Tree: TreeName,
  coach2Tree: TreeName
): { type: 'compatible' | 'conflicting' | 'neutral'; description: string } {
  if (coach1Tree === coach2Tree) {
    return { type: 'compatible', description: 'Same coaching tree - Strong chemistry' };
  }

  if (COMPATIBLE_TREES[coach1Tree]?.includes(coach2Tree)) {
    return { type: 'compatible', description: 'Compatible trees - Positive chemistry' };
  }

  if (CONFLICTING_TREES[coach1Tree]?.includes(coach2Tree)) {
    return { type: 'conflicting', description: 'Conflicting philosophies - Negative chemistry' };
  }

  return { type: 'neutral', description: 'Neutral relationship' };
}

/**
 * Tree Node Component - Displays a coach in the tree diagram
 */
function TreeNode({
  coach,
  isMainCoach,
  onPress,
}: {
  coach: Coach;
  isMainCoach: boolean;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.treeNode, isMainCoach && styles.mainTreeNode]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${coach.firstName} ${coach.lastName}, ${coach.role}, generation ${coach.tree.generation}${isMainCoach ? ', current coach' : ''}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <Text style={[styles.treeNodeName, isMainCoach && styles.mainTreeNodeName]}>
        {coach.firstName} {coach.lastName}
      </Text>
      <Text style={styles.treeNodeRole}>{coach.role}</Text>
      <Text style={styles.treeNodeGen}>Gen {coach.tree.generation}</Text>
    </TouchableOpacity>
  );
}

/**
 * Philosophy Card Component
 */
function PhilosophyCard({ tree }: { tree: CoachingTree }): React.JSX.Element {
  return (
    <View style={styles.philosophyCard}>
      <Text style={styles.cardTitle}>Philosophy</Text>

      <View style={styles.philosophyRow}>
        <Text style={styles.philosophyLabel}>Offensive Tendency:</Text>
        <Text style={styles.philosophyValue}>{tree.philosophy.offensiveTendency}</Text>
      </View>

      <View style={styles.philosophyRow}>
        <Text style={styles.philosophyLabel}>Defensive Tendency:</Text>
        <Text style={styles.philosophyValue}>{tree.philosophy.defensiveTendency}</Text>
      </View>

      <View style={styles.philosophyRow}>
        <Text style={styles.philosophyLabel}>Risk Tolerance:</Text>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: getRiskToleranceColor(tree.philosophy.riskTolerance) + '20' },
          ]}
        >
          <Text
            style={[
              styles.riskText,
              { color: getRiskToleranceColor(tree.philosophy.riskTolerance) },
            ]}
          >
            {tree.philosophy.riskTolerance.charAt(0).toUpperCase() +
              tree.philosophy.riskTolerance.slice(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Chemistry Card Component
 */
function ChemistryCard({
  mainCoach,
  otherCoach,
  onPress,
}: {
  mainCoach: Coach;
  otherCoach: Coach;
  onPress?: () => void;
}): React.JSX.Element {
  const chemistry = getChemistryDescription(mainCoach.tree.treeName, otherCoach.tree.treeName);

  const chemistryColors = {
    compatible: colors.success,
    conflicting: colors.error,
    neutral: colors.textSecondary,
  };

  return (
    <TouchableOpacity
      style={styles.chemistryCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${otherCoach.firstName} ${otherCoach.lastName}, ${otherCoach.role}, ${chemistry.description}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.chemistryHeader}>
        <Text style={styles.chemistryName}>
          {otherCoach.firstName} {otherCoach.lastName}
        </Text>
        <Text style={styles.chemistryRole}>{otherCoach.role}</Text>
      </View>
      <Text style={styles.chemistryTree}>{getTreeDisplayName(otherCoach.tree.treeName)}</Text>
      <View
        style={[styles.chemistryBadge, { backgroundColor: chemistryColors[chemistry.type] + '20' }]}
      >
        <Text style={[styles.chemistryText, { color: chemistryColors[chemistry.type] }]}>
          {chemistry.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Coaching Tree Screen Component
 */
export function CoachingTreeScreen({
  coach,
  relatedCoaches,
  onBack,
  onCoachSelect,
}: CoachingTreeScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'tree' | 'philosophy' | 'chemistry'>('tree');

  const tree = coach.tree;

  // Filter coaches in same tree
  const sameTreeCoaches = relatedCoaches.filter(
    (c) => c.tree.treeName === tree.treeName && c.id !== coach.id
  );

  // Filter coaches with compatible trees
  const compatibleCoaches = relatedCoaches.filter(
    (c) =>
      c.id !== coach.id &&
      c.tree.treeName !== tree.treeName &&
      COMPATIBLE_TREES[tree.treeName]?.includes(c.tree.treeName)
  );

  // Filter coaches with conflicting trees
  const conflictingCoaches = relatedCoaches.filter(
    (c) => c.id !== coach.id && CONFLICTING_TREES[tree.treeName]?.includes(c.tree.treeName)
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Coaching Tree" onBack={onBack} testID="coaching-tree-header" />

      {/* Coach Info */}
      <View style={styles.coachInfo}>
        <Text style={styles.coachName}>
          {coach.firstName} {coach.lastName}
        </Text>
        <Text style={styles.treeName}>{getTreeDisplayName(tree.treeName)}</Text>
        <Text style={styles.generation}>Generation {tree.generation}</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tree' && styles.tabActive]}
          onPress={() => setActiveTab('tree')}
          accessibilityLabel={`Tree tab${activeTab === 'tree' ? ', selected' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'tree' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'tree' && styles.tabTextActive]}>Tree</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'philosophy' && styles.tabActive]}
          onPress={() => setActiveTab('philosophy')}
          accessibilityLabel={`Philosophy tab${activeTab === 'philosophy' ? ', selected' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'philosophy' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'philosophy' && styles.tabTextActive]}>
            Philosophy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chemistry' && styles.tabActive]}
          onPress={() => setActiveTab('chemistry')}
          accessibilityLabel={`Chemistry tab${activeTab === 'chemistry' ? ', selected' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'chemistry' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'chemistry' && styles.tabTextActive]}>
            Chemistry
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Tree Tab */}
        {activeTab === 'tree' && (
          <View style={styles.section}>
            {/* Tree Description */}
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionTitle}>{getTreeDisplayName(tree.treeName)}</Text>
              <Text style={styles.descriptionText}>{getTreeDescription(tree.treeName)}</Text>
            </View>

            {/* Tree Lineage */}
            <View style={styles.lineageSection}>
              <Text style={styles.sectionTitle}>Coaches in This Tree</Text>

              {/* Main Coach */}
              <View style={styles.treeContainer}>
                <TreeNode coach={coach} isMainCoach={true} />
              </View>

              {/* Same Tree Coaches */}
              {sameTreeCoaches.length > 0 && (
                <View style={styles.relatedCoaches}>
                  <Text style={styles.subsectionTitle}>Same Tree ({sameTreeCoaches.length})</Text>
                  {sameTreeCoaches.map((c) => (
                    <TreeNode
                      key={c.id}
                      coach={c}
                      isMainCoach={false}
                      onPress={() => onCoachSelect?.(c.id)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Compatible Trees Info */}
            <View style={styles.compatibilitySection}>
              <Text style={styles.sectionTitle}>Tree Compatibility</Text>
              <View style={styles.compatibilityRow}>
                <Text style={styles.compatibilityLabel}>Compatible With:</Text>
                <Text style={styles.compatibilityValue}>
                  {COMPATIBLE_TREES[tree.treeName]?.map(getTreeDisplayName).join(', ') || 'None'}
                </Text>
              </View>
              <View style={styles.compatibilityRow}>
                <Text style={styles.compatibilityLabel}>Conflicts With:</Text>
                <Text style={styles.compatibilityValue}>
                  {CONFLICTING_TREES[tree.treeName]?.map(getTreeDisplayName).join(', ') || 'None'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Philosophy Tab */}
        {activeTab === 'philosophy' && (
          <View style={styles.section}>
            <PhilosophyCard tree={tree} />

            <View style={styles.philosophyExplanation}>
              <Text style={styles.sectionTitle}>How Philosophy Affects Gameplay</Text>

              <View style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>Offensive Tendency</Text>
                <Text style={styles.explanationText}>
                  Influences play calling, formation preferences, and how the team approaches game
                  situations. A pass-heavy tendency means more aggressive downfield attacks.
                </Text>
              </View>

              <View style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>Defensive Tendency</Text>
                <Text style={styles.explanationText}>
                  Shapes the defensive scheme and coverage preferences. Aggressive defenses blitz
                  more often, while conservative ones focus on preventing big plays.
                </Text>
              </View>

              <View style={styles.explanationCard}>
                <Text style={styles.explanationTitle}>Risk Tolerance</Text>
                <Text style={styles.explanationText}>
                  Determines fourth-down decisions, two-point conversions, and game management.
                  Aggressive coaches go for it more often in close games.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Chemistry Tab */}
        {activeTab === 'chemistry' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Chemistry</Text>
            <Text style={styles.sectionDesc}>
              Coaching tree relationships affect staff chemistry and coordination.
            </Text>

            {/* Compatible Staff */}
            {compatibleCoaches.length > 0 && (
              <View style={styles.chemistrySection}>
                <Text style={styles.subsectionTitle}>
                  Compatible Staff ({compatibleCoaches.length})
                </Text>
                {compatibleCoaches.map((c) => (
                  <ChemistryCard
                    key={c.id}
                    mainCoach={coach}
                    otherCoach={c}
                    onPress={() => onCoachSelect?.(c.id)}
                  />
                ))}
              </View>
            )}

            {/* Conflicting Staff */}
            {conflictingCoaches.length > 0 && (
              <View style={styles.chemistrySection}>
                <Text style={styles.subsectionTitle}>
                  Conflicting Staff ({conflictingCoaches.length})
                </Text>
                {conflictingCoaches.map((c) => (
                  <ChemistryCard
                    key={c.id}
                    mainCoach={coach}
                    otherCoach={c}
                    onPress={() => onCoachSelect?.(c.id)}
                  />
                ))}
              </View>
            )}

            {compatibleCoaches.length === 0 && conflictingCoaches.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No significant chemistry effects with current staff
                </Text>
              </View>
            )}

            {/* Chemistry Explanation */}
            <View style={styles.chemistryExplanation}>
              <Text style={styles.explanationTitle}>Chemistry Impact</Text>
              <Text style={styles.explanationText}>
                • Same tree, same generation: +5 to +8 chemistry{'\n'}• Same tree, adjacent
                generation: +3 to +5 chemistry{'\n'}• Compatible trees: +1 to +3 chemistry{'\n'}•
                Conflicting trees: -2 to -5 chemistry{'\n'}• Opposing risk tolerance: -4 to -8
                chemistry
              </Text>
            </View>
          </View>
        )}
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
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  coachInfo: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    alignItems: 'center',
  },
  coachName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  treeName: {
    fontSize: fontSize.md,
    color: colors.primary,
    marginTop: 4,
  },
  generation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
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
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  subsectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  descriptionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  lineageSection: {
    marginTop: spacing.md,
  },
  treeContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  treeNode: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 150,
    marginBottom: spacing.sm,
  },
  mainTreeNode: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  treeNodeName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  mainTreeNodeName: {
    color: colors.primary,
  },
  treeNodeRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  treeNodeGen: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  relatedCoaches: {
    marginTop: spacing.sm,
  },
  compatibilitySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  compatibilityRow: {
    marginBottom: spacing.sm,
  },
  compatibilityLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  compatibilityValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  philosophyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  philosophyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  philosophyLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  philosophyValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  riskText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  philosophyExplanation: {
    marginTop: spacing.md,
  },
  explanationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  explanationTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  explanationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  chemistrySection: {
    marginBottom: spacing.md,
  },
  chemistryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  chemistryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  chemistryName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  chemistryRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chemistryTree: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  chemistryBadge: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  chemistryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  chemistryExplanation: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
