/**
 * NewsScreen
 * Displays league news and headlines
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';

/**
 * News item data
 */
export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  fullText?: string;
  category: 'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency';
  date: string;
  week: number;
  year: number;
  relatedTeamIds: string[];
  relatedPlayerId?: string;
  isRead: boolean;
  priority: 'breaking' | 'normal' | 'minor';
}

/**
 * Props for NewsScreen
 */
export interface NewsScreenProps {
  /** News items */
  news: NewsItem[];
  /** Current week */
  currentWeek: number;
  /** Current year */
  currentYear: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when news item is marked as read */
  onMarkRead?: (newsId: string) => void;
  /** Callback to navigate to Rumor Mill */
  onRumorMill?: () => void;
}

type CategoryFilter = 'all' | NewsItem['category'];

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: 'All',
  trade: 'Trades',
  injury: 'Injuries',
  team: 'Team',
  league: 'League',
  yourTeam: 'Your Team',
  draft: 'Draft',
  freeAgency: 'Free Agency',
};

const CATEGORY_COLORS: Record<NewsItem['category'], string> = {
  trade: colors.warning,
  injury: colors.error,
  team: colors.info,
  league: colors.textSecondary,
  yourTeam: colors.primary,
  draft: colors.success,
  freeAgency: colors.accent,
};

/**
 * News card component
 */
function NewsCard({ item, onPress }: { item: NewsItem; onPress?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.newsCard,
        item.priority === 'breaking' && styles.breakingCard,
        !item.isRead && item.priority !== 'breaking' && styles.unreadCard,
      ]}
      onPress={() => {
        setExpanded(!expanded);
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] }]}>
          <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category]}</Text>
        </View>
        <Text style={styles.dateText}>Week {item.week}</Text>
      </View>

      <Text style={[styles.headline, !item.isRead && styles.unreadHeadline]}>{item.headline}</Text>

      <Text style={styles.summary} numberOfLines={expanded ? undefined : 2}>
        {item.summary}
      </Text>

      {expanded && item.fullText && <Text style={styles.fullText}>{item.fullText}</Text>}

      {item.priority === 'breaking' && (
        <View style={styles.breakingBadge}>
          <Text style={styles.breakingText}>BREAKING</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Empty state when no news
 */
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📰</Text>
      <Text style={styles.emptyTitle}>No News Yet</Text>
      <Text style={styles.emptyText}>News will appear here as the season progresses.</Text>
    </View>
  );
}

export function NewsScreen({
  news,
  currentWeek: _currentWeek,
  currentYear: _currentYear,
  onBack,
  onMarkRead,
  onRumorMill,
}: NewsScreenProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  // Filter news
  const filteredNews = useMemo(() => {
    let filtered = news;

    // Filter by category
    if (filter !== 'all') {
      filtered = filtered.filter((item) => item.category === filter);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.week !== b.week) return b.week - a.week;
      if (a.priority === 'breaking' && b.priority !== 'breaking') return -1;
      if (b.priority === 'breaking' && a.priority !== 'breaking') return 1;
      // Use date field for same-week sorting
      if (a.date && b.date) return b.date.localeCompare(a.date);
      return 0;
    });
  }, [news, filter]);

  // Count unread
  const unreadCount = useMemo(() => news.filter((n) => !n.isRead).length, [news]);

  const filterButtons: CategoryFilter[] = [
    'all',
    'yourTeam',
    'trade',
    'injury',
    'draft',
    'freeAgency',
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>News</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {onRumorMill ? (
          <TouchableOpacity onPress={onRumorMill} style={styles.rumorsButton}>
            <Text style={styles.rumorsText}>Rumors</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={filterButtons}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterButton, filter === item && styles.filterActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>
                {CATEGORY_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* News List */}
      {filteredNews.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard item={item} onPress={() => onMarkRead?.(item.id)} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  unreadBadgeText: {
    color: colors.background,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  placeholder: {
    width: 60,
  },
  rumorsButton: {
    padding: spacing.xs,
  },
  rumorsText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
  },
  newsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
  },
  breakingCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  headline: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  unreadHeadline: {
    fontWeight: fontWeight.bold,
  },
  summary: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fullText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  breakingBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  breakingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default NewsScreen;
