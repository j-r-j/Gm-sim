/**
 * WeeklyDigestScreen
 * Curated weekly news summary with top stories and highlights
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import { WeeklyDigest } from '../core/news/WeeklyDigest';
import { NewsItem } from '../core/news/NewsGenerators';
import { Rumor } from '../core/news/RumorMill';
import { NewsFeedCategory, StoryPriority } from '../core/news/StoryTemplates';

/**
 * Props for WeeklyDigestScreen
 */
export interface WeeklyDigestScreenProps {
  gameState: GameState;
  digest: WeeklyDigest;
  onBack: () => void;
  onNewsSelect?: (newsId: string) => void;
  onRumorSelect?: (rumorId: string) => void;
  onPlayerSelect?: (playerId: string) => void;
}

type SectionType = 'overview' | 'stories' | 'rumors' | 'categories';

/**
 * Gets display name for category
 */
function getCategoryDisplay(category: NewsFeedCategory): string {
  const categoryNames: Record<NewsFeedCategory, string> = {
    injury: 'Injuries',
    trade: 'Trades',
    signing: 'Signings',
    performance: 'Performance',
    milestone: 'Milestones',
    draft: 'Draft',
    coaching: 'Coaching',
    rumor: 'Rumors',
    league: 'League News',
  };
  return categoryNames[category];
}

/**
 * Gets icon for category
 */
function getCategoryIcon(category: NewsFeedCategory): string {
  const categoryIcons: Record<NewsFeedCategory, string> = {
    injury: '🏥',
    trade: '🔄',
    signing: '✍️',
    performance: '⭐',
    milestone: '🏆',
    draft: '📋',
    coaching: '📣',
    rumor: '💬',
    league: '🏈',
  };
  return categoryIcons[category];
}

/**
 * Gets color for priority
 */
function getPriorityColor(priority: StoryPriority): string {
  switch (priority) {
    case 'breaking':
      return colors.error;
    case 'high':
      return colors.warning;
    case 'medium':
      return colors.primary;
    case 'low':
      return colors.textSecondary;
  }
}

/**
 * News Story Card Component
 */
function StoryCard({
  news,
  onPress,
  onPlayerSelect,
}: {
  news: NewsItem;
  onPress?: () => void;
  onPlayerSelect?: (playerId: string) => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.storyCard, !news.isRead && styles.unreadCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.storyHeader}>
        <View style={styles.storyMeta}>
          <Text style={styles.categoryIcon}>{getCategoryIcon(news.category)}</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(news.priority) + '20' },
            ]}
          >
            <Text style={[styles.priorityText, { color: getPriorityColor(news.priority) }]}>
              {news.priority.toUpperCase()}
            </Text>
          </View>
          {news.revealsTraitHint && (
            <View style={styles.traitHintBadge}>
              <Text style={styles.traitHintText}>INSIGHT</Text>
            </View>
          )}
        </View>
        {!news.isRead && <View style={styles.unreadDot} />}
      </View>

      <Text style={styles.storyHeadline}>{news.headline}</Text>
      <Text style={styles.storyBody} numberOfLines={2}>
        {news.body}
      </Text>

      <View style={styles.storyFooter}>
        <Text style={styles.storyTimestamp}>Week {news.week}</Text>
        {news.playerId && onPlayerSelect && (
          <TouchableOpacity
            style={styles.viewPlayerButton}
            onPress={() => onPlayerSelect(news.playerId!)}
          >
            <Text style={styles.viewPlayerText}>View Player</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Rumor Preview Card Component
 */
function RumorPreviewCard({
  rumor,
  onPress,
}: {
  rumor: Rumor;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.rumorPreviewCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rumorPreviewHeader}>
        <Text style={styles.rumorIcon}>💬</Text>
        <Text style={styles.rumorConfidence}>
          {rumor.sourceConfidence.charAt(0).toUpperCase() + rumor.sourceConfidence.slice(1)} Source
        </Text>
      </View>
      <Text style={styles.rumorPreviewHeadline} numberOfLines={2}>
        {rumor.headline}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Category Summary Card Component
 */
function CategorySummaryCard({
  category,
  count,
  onPress,
}: {
  category: NewsFeedCategory;
  count: number;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.categoryCardIcon}>{getCategoryIcon(category)}</Text>
      <Text style={styles.categoryCardName}>{getCategoryDisplay(category)}</Text>
      <Text style={styles.categoryCardCount}>{count}</Text>
    </TouchableOpacity>
  );
}

/**
 * Weekly Digest Screen Component
 */
export function WeeklyDigestScreen({
  digest,
  onBack,
  onNewsSelect,
  onRumorSelect,
  onPlayerSelect,
}: WeeklyDigestScreenProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<SectionType>('overview');

  // Count news by category
  const categoryCounts: Partial<Record<NewsFeedCategory, number>> = {};
  for (const story of digest.topStories) {
    categoryCounts[story.category] = (categoryCounts[story.category] || 0) + 1;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Weekly Digest" onBack={onBack} testID="weekly-digest-header" />

      {/* Section Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'overview' && styles.tabActive]}
          onPress={() => setActiveSection('overview')}
        >
          <Text style={[styles.tabText, activeSection === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'stories' && styles.tabActive]}
          onPress={() => setActiveSection('stories')}
        >
          <Text style={[styles.tabText, activeSection === 'stories' && styles.tabTextActive]}>
            Stories ({digest.topStories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'rumors' && styles.tabActive]}
          onPress={() => setActiveSection('rumors')}
        >
          <Text style={[styles.tabText, activeSection === 'rumors' && styles.tabTextActive]}>
            Rumors ({digest.activeRumors.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'categories' && styles.tabActive]}
          onPress={() => setActiveSection('categories')}
        >
          <Text style={[styles.tabText, activeSection === 'categories' && styles.tabTextActive]}>
            By Type
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <View style={styles.section}>
            {/* Digest Header */}
            <View style={styles.digestHeader}>
              <Text style={styles.weekLabel}>
                Season {digest.season}, Week {digest.week}
              </Text>
              <Text style={styles.digestHeadline}>{digest.headline}</Text>
              <Text style={styles.digestSummary}>{digest.summary}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{digest.totalNewsCount}</Text>
                <Text style={styles.statLabel}>Total Stories</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{digest.unreadCount}</Text>
                <Text style={styles.statLabel}>Unread</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{digest.activeRumors.length}</Text>
                <Text style={styles.statLabel}>Active Rumors</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{digest.traitHintingNews.length}</Text>
                <Text style={styles.statLabel}>Insights</Text>
              </View>
            </View>

            {/* Trait Hints Section */}
            {digest.traitHintingNews.length > 0 && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Hidden Trait Hints</Text>
                <Text style={styles.subsectionDesc}>
                  These stories may reveal information about hidden player traits
                </Text>
                {digest.traitHintingNews.slice(0, 3).map((news) => (
                  <StoryCard
                    key={news.id}
                    news={news}
                    onPress={() => onNewsSelect?.(news.id)}
                    onPlayerSelect={onPlayerSelect}
                  />
                ))}
              </View>
            )}

            {/* Quick Category Overview */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>News by Category</Text>
              <View style={styles.categoryGrid}>
                {digest.categoriesWithNews.map((category) => (
                  <CategorySummaryCard
                    key={category}
                    category={category}
                    count={categoryCounts[category] || 0}
                    onPress={() => setActiveSection('categories')}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Stories Section */}
        {activeSection === 'stories' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Stories</Text>
            {digest.topStories.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No major stories this week</Text>
              </View>
            ) : (
              digest.topStories.map((news) => (
                <StoryCard
                  key={news.id}
                  news={news}
                  onPress={() => onNewsSelect?.(news.id)}
                  onPlayerSelect={onPlayerSelect}
                />
              ))
            )}
          </View>
        )}

        {/* Rumors Section */}
        {activeSection === 'rumors' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Rumors</Text>
            <Text style={styles.sectionDesc}>
              Remember: Not all rumors are true. Use your judgment.
            </Text>
            {digest.activeRumors.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No active rumors this week</Text>
              </View>
            ) : (
              digest.activeRumors.map((rumor) => (
                <RumorPreviewCard
                  key={rumor.id}
                  rumor={rumor}
                  onPress={() => onRumorSelect?.(rumor.id)}
                />
              ))
            )}
          </View>
        )}

        {/* Categories Section */}
        {activeSection === 'categories' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stories by Category</Text>
            {digest.categoriesWithNews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No stories this week</Text>
              </View>
            ) : (
              digest.categoriesWithNews.map((category) => (
                <View key={category} style={styles.categorySection}>
                  <View style={styles.categorySectionHeader}>
                    <Text style={styles.categoryIcon}>{getCategoryIcon(category)}</Text>
                    <Text style={styles.categorySectionTitle}>{getCategoryDisplay(category)}</Text>
                    <Text style={styles.categorySectionCount}>
                      {categoryCounts[category] || 0} stories
                    </Text>
                  </View>
                  {digest.topStories
                    .filter((s) => s.category === category)
                    .map((news) => (
                      <StoryCard
                        key={news.id}
                        news={news}
                        onPress={() => onNewsSelect?.(news.id)}
                        onPlayerSelect={onPlayerSelect}
                      />
                    ))}
                </View>
              ))
            )}
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
    fontSize: fontSize.xs,
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
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  digestHeader: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  weekLabel: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  digestHeadline: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  digestSummary: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subsection: {
    marginTop: spacing.md,
  },
  subsectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subsectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '48%',
    flexGrow: 1,
  },
  categoryCardIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  categoryCardName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  categoryCardCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: 2,
  },
  storyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryIcon: {
    fontSize: 16,
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  traitHintBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success + '20',
  },
  traitHintText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  storyHeadline: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  storyBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  storyTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  viewPlayerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  viewPlayerText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  rumorPreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  rumorPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  rumorIcon: {
    fontSize: 16,
  },
  rumorConfidence: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  rumorPreviewHeadline: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categorySectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  categorySectionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
