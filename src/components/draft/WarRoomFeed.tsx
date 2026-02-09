/**
 * WarRoomFeed Component
 * Live ticker displaying draft events, trade alerts, scout reactions,
 * steal/reach indicators, and other war room drama.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../../styles';
import { WarRoomFeedEvent, FeedEventType, FeedUrgency } from '../../core/draft/DraftDayNarrator';

/**
 * Props for WarRoomFeed
 */
export interface WarRoomFeedProps {
  /** Feed events sorted newest first */
  events: WarRoomFeedEvent[];
  /** Maximum events to display */
  maxEvents?: number;
}

/**
 * Gets icon name for event type
 */
function getEventIcon(type: FeedEventType): string {
  switch (type) {
    case 'pick_announcement':
      return 'person-add';
    case 'trade_alert':
      return 'swap-horizontal';
    case 'trade_rumor':
      return 'chatbubble-ellipses';
    case 'steal_alert':
      return 'trending-up';
    case 'reach_alert':
      return 'trending-down';
    case 'scout_reaction':
      return 'eye';
    case 'user_target_taken':
      return 'alert-circle';
    case 'position_run':
      return 'repeat';
    case 'round_summary':
      return 'flag';
    case 'clock_warning':
      return 'time';
    case 'draft_milestone':
      return 'trophy';
    default:
      return 'information-circle';
  }
}

/**
 * Gets color for event urgency
 */
function getUrgencyColor(urgency: FeedUrgency): string {
  switch (urgency) {
    case 'critical':
      return colors.error;
    case 'high':
      return colors.warning;
    case 'medium':
      return colors.info;
    case 'low':
    default:
      return colors.textSecondary;
  }
}

/**
 * Gets accent bar color for event type
 */
function getEventAccentColor(type: FeedEventType): string {
  switch (type) {
    case 'steal_alert':
      return colors.success;
    case 'reach_alert':
      return colors.error;
    case 'trade_alert':
      return colors.accent;
    case 'user_target_taken':
      return colors.error;
    case 'clock_warning':
      return colors.warning;
    case 'scout_reaction':
      return colors.info;
    default:
      return colors.border;
  }
}

/**
 * Formats a timestamp relative to now
 */
function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

/**
 * Single feed event item
 */
function FeedEventItem({ event }: { event: WarRoomFeedEvent }): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const accentColor = getEventAccentColor(event.type);
  const urgencyColor = getUrgencyColor(event.urgency);
  const isCritical = event.urgency === 'critical' || event.urgency === 'high';

  return (
    <Animated.View
      style={[
        feedStyles.eventItem,
        isCritical && feedStyles.eventItemCritical,
        { opacity: fadeAnim, borderLeftColor: accentColor },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${event.urgency} priority: ${event.headline}. ${event.detail}. ${formatTimestamp(event.timestamp)}`}
    >
      <View style={feedStyles.eventHeader}>
        <View style={[feedStyles.iconContainer, { backgroundColor: urgencyColor + '15' }]}>
          <Ionicons
            name={getEventIcon(event.type) as 'alert-circle'}
            size={14}
            color={urgencyColor}
          />
        </View>
        <Text
          style={[feedStyles.headline, isCritical && feedStyles.headlineCritical]}
          numberOfLines={2}
        >
          {event.headline}
        </Text>
        <Text style={feedStyles.timestamp}>{formatTimestamp(event.timestamp)}</Text>
      </View>
      <Text style={feedStyles.detail} numberOfLines={3}>
        {event.detail}
      </Text>
    </Animated.View>
  );
}

/**
 * WarRoomFeed Component
 */
export function WarRoomFeed({ events, maxEvents = 50 }: WarRoomFeedProps): React.JSX.Element {
  const flatListRef = useRef<FlatList>(null);

  const displayEvents = events.slice(0, maxEvents);

  const renderEvent = useCallback(
    ({ item }: { item: WarRoomFeedEvent }) => <FeedEventItem event={item} />,
    []
  );

  const keyExtractor = useCallback((item: WarRoomFeedEvent) => item.id, []);

  return (
    <View style={feedStyles.container}>
      <View
        style={feedStyles.feedHeader}
        accessibilityRole="header"
        accessibilityLabel="War Room Feed, live updates"
      >
        <Ionicons name="radio" size={16} color={colors.error} />
        <Text style={feedStyles.feedTitle}>WAR ROOM FEED</Text>
        <View
          style={feedStyles.liveIndicator}
          accessibilityLabel="Live indicator"
          accessibilityRole="text"
        >
          <View style={feedStyles.liveDot} />
          <Text style={feedStyles.liveText}>LIVE</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={displayEvents}
        keyExtractor={keyExtractor}
        renderItem={renderEvent}
        contentContainerStyle={feedStyles.listContent}
        showsVerticalScrollIndicator={false}
        accessibilityRole="list"
        accessibilityLabel={`War room feed with ${displayEvents.length} events`}
        ListEmptyComponent={
          <View
            style={feedStyles.emptyContainer}
            accessibilityRole="text"
            accessibilityLabel="Waiting for draft to begin"
          >
            <Ionicons name="radio-outline" size={32} color={colors.textLight} />
            <Text style={feedStyles.emptyText}>Waiting for draft to begin...</Text>
          </View>
        }
      />
    </View>
  );
}

const feedStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    flex: 1,
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  liveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
    letterSpacing: 1,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  eventItem: {
    minHeight: accessibility.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
    borderLeftWidth: 3,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  eventItemCritical: {
    backgroundColor: colors.error + '08',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headlineCritical: {
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  detail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: 24 + 4, // icon width + gap
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
});

export default WarRoomFeed;
