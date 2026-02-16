/**
 * WarRoomFeed Component
 * Live ticker displaying draft events, trade alerts, scout reactions,
 * steal/reach indicators, and other war room drama.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Easing } from 'react-native';
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
  /** Compact ticker mode - shows single line */
  compact?: boolean;
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
 * Compact ticker showing only the latest event as a single-line strip.
 * Pulses opacity for critical/high urgency events.
 */
function CompactTicker({ events }: { events: WarRoomFeedEvent[] }): React.JSX.Element {
  const latestEvent = events.length > 0 ? events[0] : null;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isCritical = latestEvent
    ? latestEvent.urgency === 'critical' || latestEvent.urgency === 'high'
    : false;

  useEffect(() => {
    if (isCritical) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCritical, pulseAnim]);

  if (!latestEvent) {
    return (
      <View
        style={compactStyles.ticker}
        accessibilityRole="text"
        accessibilityLabel="War room ticker, waiting for events"
      >
        <Ionicons name="radio-outline" size={14} color={colors.textLight} />
        <Text style={compactStyles.tickerTextEmpty}>Waiting for draft...</Text>
      </View>
    );
  }

  const urgencyColor = getUrgencyColor(latestEvent.urgency);

  return (
    <Animated.View
      style={[compactStyles.ticker, { opacity: pulseAnim }]}
      accessibilityRole="text"
      accessibilityLabel={`Latest: ${latestEvent.headline}`}
    >
      <Ionicons
        name={getEventIcon(latestEvent.type) as 'alert-circle'}
        size={14}
        color={urgencyColor}
      />
      <Text style={[compactStyles.tickerText, isCritical && { color: urgencyColor }]} numberOfLines={1}>
        {latestEvent.headline}
      </Text>
      <View style={compactStyles.liveDotSmall} />
    </Animated.View>
  );
}

/**
 * WarRoomFeed Component
 */
export function WarRoomFeed({ events, maxEvents = 50, compact = false }: WarRoomFeedProps): React.JSX.Element {
  const flatListRef = useRef<FlatList>(null);

  const renderEvent = useCallback(
    ({ item }: { item: WarRoomFeedEvent }) => <FeedEventItem event={item} />,
    []
  );

  const keyExtractor = useCallback((item: WarRoomFeedEvent) => item.id, []);

  if (compact) {
    return <CompactTicker events={events} />;
  }

  const displayEvents = events.slice(0, maxEvents);

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

const compactStyles = StyleSheet.create({
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    minHeight: 36,
  },
  tickerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnDark,
  },
  tickerTextEmpty: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
});

export default WarRoomFeed;
