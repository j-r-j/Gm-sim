# Implementation Guide

> Code patterns and standards for consistent implementation across the NFL GM Simulator.

## Table of Contents

1. [Component Patterns](#component-patterns)
2. [Screen Structure](#screen-structure)
3. [State Management](#state-management)
4. [Navigation Patterns](#navigation-patterns)
5. [Error Handling](#error-handling)
6. [Accessibility](#accessibility)
7. [Testing Standards](#testing-standards)

---

## Component Patterns

### Button Component Standard

All buttons must follow this pattern for consistency and accessibility:

```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '@ui/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  accessibilityHint,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 44, // CRITICAL: Touch target minimum
    minWidth: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  danger: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  sm: {
    paddingVertical: spacing.sm,
  },
  md: {
    paddingVertical: spacing.md,
  },
  lg: {
    paddingVertical: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.white,
  },
  ghostText: {
    color: colors.primary,
  },
});
```

### Card Component Standard

```tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, shadows } from '@ui/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  accessibilityLabel,
}) => {
  return (
    <View
      style={[styles.base, styles[variant], style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  default: {
    ...shadows.sm,
  },
  elevated: {
    ...shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
```

### Player Card Pattern

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Player } from '@core/models';
import { colors, spacing, typography } from '@ui/theme';
import { PositionBadge } from './PositionBadge';
import { RatingBadge } from './RatingBadge';
import { StatusIndicator } from './StatusIndicator';

interface PlayerCardProps {
  player: Player;
  onPress?: () => void;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onPress,
  compact = false,
}) => {
  const Content = (
    <View style={[styles.container, compact && styles.compact]}>
      <PositionBadge position={player.position} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
        {!compact && (
          <Text style={styles.details}>
            Age {player.age} • ${(player.salary / 1000000).toFixed(1)}M
          </Text>
        )}
      </View>
      <RatingBadge rating={player.overall} />
      <StatusIndicator status={player.injuryStatus} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityLabel={`${player.name}, ${player.position}, overall ${player.overall}`}
        accessibilityRole="button"
        accessibilityHint="Double tap to view player details"
        style={styles.touchable}
      >
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
};

const styles = StyleSheet.create({
  touchable: {
    minHeight: 44, // Touch target
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  compact: {
    padding: spacing.sm,
  },
  info: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  name: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.textPrimary,
  },
  details: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
```

---

## Screen Structure

### Standard Screen Template

Every screen should follow this structure:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameState } from '@core/models';
import { ScreenHeader } from '@ui/components/ScreenHeader';
import { LoadingScreen } from '@ui/components/LoadingScreen';
import { ErrorScreen } from '@ui/components/ErrorScreen';
import { colors, spacing } from '@ui/theme';

interface ScreenNameProps {
  gameState: GameState;
  onNavigate: (screen: string, params?: object) => void;
  onUpdateGameState: (newState: GameState) => void;
}

export const ScreenName: React.FC<ScreenNameProps> = ({
  gameState,
  onNavigate,
  onUpdateGameState,
}) => {
  // 1. State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  // 2. Effects
  useEffect(() => {
    loadData();
  }, []);

  // 3. Callbacks
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Load data...
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [gameState]);

  const handlePrimaryAction = useCallback(() => {
    // Handle primary action
    onNavigate('NextScreen');
  }, [onNavigate]);

  // 4. Render states
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (error) {
    return <ErrorScreen error={error} onRetry={loadData} />;
  }

  // 5. Main render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Screen Title"
        onBack={() => onNavigate('Dashboard')}
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {/* Screen content */}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl, // Extra padding for bottom
  },
});
```

### Screen Header Standard

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@ui/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel: string;
  };
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>

      {rightAction ? (
        <TouchableOpacity
          onPress={rightAction.onPress}
          style={styles.rightButton}
          accessibilityLabel={rightAction.accessibilityLabel}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={rightAction.icon as any} size={24} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  title: {
    flex: 1,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
```

---

## State Management

### GameState Updates

Always use immutable updates:

```tsx
// ✅ CORRECT: Immutable update
const updatePlayerInjury = (
  gameState: GameState,
  playerId: string,
  injury: Injury
): GameState => {
  const player = gameState.players[playerId];
  if (!player) return gameState;

  return {
    ...gameState,
    players: {
      ...gameState.players,
      [playerId]: {
        ...player,
        injuryStatus: injury.status,
        injury: injury,
      },
    },
  };
};

// ❌ WRONG: Mutation
const updatePlayerInjuryBad = (gameState: GameState, playerId: string, injury: Injury) => {
  gameState.players[playerId].injury = injury; // NEVER DO THIS
  return gameState;
};
```

### Week Progression State Machine

```tsx
import { GameState } from '@core/models';

export type WeekPhase =
  | 'pre_game'
  | 'simulating'
  | 'post_game'
  | 'week_summary'
  | 'ready_to_advance';

interface WeekFlowState {
  phase: WeekPhase;
  canAdvance: boolean;
  nextAction: NextAction;
}

interface NextAction {
  label: string;
  description: string;
  action: () => void;
  disabled: boolean;
  disabledReason?: string;
}

export const getWeekFlowState = (gameState: GameState): WeekFlowState => {
  const { currentWeek, currentPhase } = gameState.league.calendar;

  // Determine current phase based on game state flags
  if (!gameState.weekFlags?.preGameViewed) {
    return {
      phase: 'pre_game',
      canAdvance: false,
      nextAction: {
        label: `Play Week ${currentWeek}`,
        description: getMatchupDescription(gameState),
        action: () => navigateToPreGame(),
        disabled: false,
      },
    };
  }

  if (!gameState.weekFlags?.gameSimulated) {
    return {
      phase: 'simulating',
      canAdvance: false,
      nextAction: {
        label: 'Simulate Game',
        description: 'Your game is ready to play',
        action: () => startSimulation(),
        disabled: false,
      },
    };
  }

  if (!gameState.weekFlags?.postGameViewed) {
    return {
      phase: 'post_game',
      canAdvance: false,
      nextAction: {
        label: 'View Results',
        description: 'See how your team did',
        action: () => navigateToPostGame(),
        disabled: false,
      },
    };
  }

  if (!gameState.weekFlags?.weekSummaryViewed) {
    return {
      phase: 'week_summary',
      canAdvance: false,
      nextAction: {
        label: 'Week Summary',
        description: 'View league results',
        action: () => navigateToWeekSummary(),
        disabled: false,
      },
    };
  }

  return {
    phase: 'ready_to_advance',
    canAdvance: true,
    nextAction: {
      label: `Advance to Week ${currentWeek + 1}`,
      description: 'Move to the next week',
      action: () => advanceWeek(),
      disabled: false,
    },
  };
};
```

### Offseason Phase Manager

```tsx
export type OffseasonPhase =
  | 'season_end'
  | 'coaching_decisions'
  | 'contract_management'
  | 'combine'
  | 'free_agency'
  | 'draft'
  | 'udfa'
  | 'otas'
  | 'training_camp'
  | 'preseason'
  | 'final_cuts'
  | 'season_start';

interface PhaseConfig {
  phase: OffseasonPhase;
  order: number;
  name: string;
  description: string;
  isRequired: boolean;
  canSkip: boolean;
  completionCheck: (gameState: GameState) => boolean;
  primaryAction: {
    label: string;
    screen: string;
  };
}

export const OFFSEASON_PHASES: PhaseConfig[] = [
  {
    phase: 'season_end',
    order: 1,
    name: 'Season Recap',
    description: 'Review your season performance',
    isRequired: true,
    canSkip: false,
    completionCheck: (gs) => gs.offseasonState?.seasonRecapViewed ?? false,
    primaryAction: { label: 'View Recap', screen: 'SeasonRecap' },
  },
  {
    phase: 'coaching_decisions',
    order: 2,
    name: 'Coaching Decisions',
    description: 'Evaluate and adjust your coaching staff',
    isRequired: true,
    canSkip: true, // Can keep current staff
    completionCheck: (gs) => gs.offseasonState?.coachingDecisionsMade ?? false,
    primaryAction: { label: 'Review Staff', screen: 'CoachingDecisions' },
  },
  {
    phase: 'contract_management',
    order: 3,
    name: 'Contract Management',
    description: 'Handle expiring contracts and cap space',
    isRequired: true,
    canSkip: true, // Can keep all contracts
    completionCheck: (gs) => gs.offseasonState?.contractsReviewed ?? false,
    primaryAction: { label: 'Manage Contracts', screen: 'ContractManagement' },
  },
  {
    phase: 'combine',
    order: 4,
    name: 'NFL Combine',
    description: 'Scout draft prospects at the combine',
    isRequired: false,
    canSkip: true,
    completionCheck: (gs) => gs.offseasonState?.combineViewed ?? false,
    primaryAction: { label: 'View Combine', screen: 'CombineProDay' },
  },
  {
    phase: 'free_agency',
    order: 5,
    name: 'Free Agency',
    description: 'Sign free agents to fill roster needs',
    isRequired: true,
    canSkip: true, // Can skip if roster is full
    completionCheck: (gs) => gs.offseasonState?.freeAgencyComplete ?? false,
    primaryAction: { label: 'Enter Market', screen: 'FreeAgency' },
  },
  {
    phase: 'draft',
    order: 6,
    name: 'NFL Draft',
    description: 'Select the next generation of stars',
    isRequired: true,
    canSkip: false,
    completionCheck: (gs) => gs.offseasonState?.draftComplete ?? false,
    primaryAction: { label: 'Enter Draft Room', screen: 'DraftRoom' },
  },
  {
    phase: 'udfa',
    order: 7,
    name: 'Undrafted Free Agents',
    description: 'Sign undrafted players',
    isRequired: false,
    canSkip: true,
    completionCheck: (gs) => gs.offseasonState?.udfaComplete ?? false,
    primaryAction: { label: 'View UDFAs', screen: 'UDFA' },
  },
  {
    phase: 'otas',
    order: 8,
    name: 'OTAs',
    description: 'Organized team activities begin',
    isRequired: false,
    canSkip: true,
    completionCheck: (gs) => gs.offseasonState?.otasComplete ?? false,
    primaryAction: { label: 'Start OTAs', screen: 'OTAs' },
  },
  {
    phase: 'training_camp',
    order: 9,
    name: 'Training Camp',
    description: 'Evaluate and develop your roster',
    isRequired: true,
    canSkip: true,
    completionCheck: (gs) => gs.offseasonState?.trainingCampComplete ?? false,
    primaryAction: { label: 'Start Camp', screen: 'TrainingCamp' },
  },
  {
    phase: 'preseason',
    order: 10,
    name: 'Preseason',
    description: 'Exhibition games to evaluate players',
    isRequired: true,
    canSkip: true,
    completionCheck: (gs) => gs.offseasonState?.preseasonComplete ?? false,
    primaryAction: { label: 'Play Preseason', screen: 'Preseason' },
  },
  {
    phase: 'final_cuts',
    order: 11,
    name: 'Final Roster Cuts',
    description: 'Trim roster to 53 players',
    isRequired: true,
    canSkip: false, // Must have valid roster
    completionCheck: (gs) => {
      const team = gs.teams[gs.userTeamId];
      return team.roster.active.length <= 53;
    },
    primaryAction: { label: 'Manage Roster', screen: 'FinalCuts' },
  },
  {
    phase: 'season_start',
    order: 12,
    name: 'Season Start',
    description: 'Your team is ready for the new season',
    isRequired: true,
    canSkip: false,
    completionCheck: (gs) => gs.league.calendar.currentPhase === 'regularSeason',
    primaryAction: { label: 'Start Season', screen: 'Dashboard' },
  },
];

export const getCurrentOffseasonPhase = (gameState: GameState): PhaseConfig | null => {
  if (gameState.league.calendar.currentPhase !== 'offseason') {
    return null;
  }

  for (const phase of OFFSEASON_PHASES) {
    if (!phase.completionCheck(gameState)) {
      return phase;
    }
  }

  return null;
};

export const getOffseasonProgress = (gameState: GameState): number => {
  let completed = 0;
  for (const phase of OFFSEASON_PHASES) {
    if (phase.completionCheck(gameState)) {
      completed++;
    } else {
      break; // Stop at first incomplete phase
    }
  }
  return completed / OFFSEASON_PHASES.length;
};
```

---

## Navigation Patterns

### Single Flow Navigation

```tsx
// NavigationService.ts
type Screen =
  | 'Start'
  | 'TeamSelection'
  | 'StaffDecision'
  | 'Dashboard'
  | 'PreGame'
  | 'GameSimulation'
  | 'PostGame'
  | 'WeekSummary'
  // ... all other screens

interface NavigationState {
  currentScreen: Screen;
  params: Record<string, unknown>;
  history: Screen[];
}

export const NavigationService = {
  // Get the next screen in a flow
  getNextScreen: (current: Screen, gameState: GameState): Screen => {
    const flows: Record<string, () => Screen> = {
      // New game flow
      Start: () => 'TeamSelection',
      TeamSelection: () => 'StaffDecision',
      StaffDecision: () => gameState.needsStaffHiring ? 'StaffHiring' : 'Dashboard',
      StaffHiring: () => 'Dashboard',

      // Weekly flow
      Dashboard: () => 'PreGame',
      PreGame: () => 'GameSimulation',
      GameSimulation: () => 'PostGame',
      PostGame: () => 'WeekSummary',
      WeekSummary: () => 'Dashboard', // Back to hub

      // Offseason flow
      SeasonRecap: () => 'CoachingDecisions',
      CoachingDecisions: () => 'ContractManagement',
      ContractManagement: () => 'Combine',
      Combine: () => 'FreeAgency',
      FreeAgency: () => 'DraftRoom',
      DraftRoom: () => 'UDFA',
      UDFA: () => 'OTAs',
      OTAs: () => 'TrainingCamp',
      TrainingCamp: () => 'Preseason',
      Preseason: () => 'FinalCuts',
      FinalCuts: () => 'Dashboard', // New season
    };

    return flows[current]?.() ?? 'Dashboard';
  },

  // Can the user go back from this screen?
  canGoBack: (screen: Screen): boolean => {
    const noBackScreens: Screen[] = [
      'GameSimulation', // Can't back out of active sim
      'DraftRoom',      // Draft is in progress
    ];
    return !noBackScreens.includes(screen);
  },

  // Get the "safe" screen to return to
  getSafeReturn: (screen: Screen): Screen => {
    // Dashboard is always safe
    return 'Dashboard';
  },
};
```

### Breadcrumb Component

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@ui/theme';

interface BreadcrumbItem {
  label: string;
  screen: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (screen: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <View style={styles.container} accessibilityRole="navigation">
      {items.map((item, index) => (
        <React.Fragment key={item.screen}>
          {index > 0 && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textMuted}
              style={styles.separator}
            />
          )}
          <TouchableOpacity
            onPress={() => onNavigate(item.screen)}
            disabled={index === items.length - 1}
            accessibilityLabel={`Navigate to ${item.label}`}
            accessibilityRole="link"
            style={styles.item}
          >
            <Text
              style={[
                styles.text,
                index === items.length - 1 && styles.currentText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  item: {
    minHeight: 32,
    justifyContent: 'center',
  },
  separator: {
    marginHorizontal: spacing.xs,
  },
  text: {
    fontSize: typography.sm,
    color: colors.primary,
  },
  currentText: {
    color: colors.textPrimary,
    fontWeight: typography.semibold,
  },
});
```

---

## Error Handling

### Error Boundary

```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@ui/components/Button';
import { colors, spacing, typography } from '@ui/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Button
            label="Try Again"
            onPress={this.handleRetry}
            variant="primary"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
```

### Error Screen

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@ui/components/Button';
import { colors, spacing, typography } from '@ui/theme';

interface ErrorScreenProps {
  error: Error;
  onRetry?: () => void;
  onGoBack?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
  onGoBack,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.message}>
          {error.message || 'Something went wrong. Please try again.'}
        </Text>
        <View style={styles.actions}>
          {onRetry && (
            <Button
              label="Try Again"
              onPress={onRetry}
              variant="primary"
              accessibilityHint="Retry the failed action"
            />
          )}
          {onGoBack && (
            <Button
              label="Go Back"
              onPress={onGoBack}
              variant="secondary"
              accessibilityHint="Return to the previous screen"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.display,
    fontWeight: typography.bold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.md * 1.5,
  },
  actions: {
    gap: spacing.md,
    width: '100%',
    maxWidth: 300,
  },
});
```

---

## Accessibility

### Required Accessibility Props

Every interactive element MUST have:

```tsx
// ✅ REQUIRED for all touchables
<TouchableOpacity
  accessibilityLabel="Clear description of what this does"
  accessibilityRole="button" // or 'link', 'checkbox', etc.
  accessibilityState={{ disabled: isDisabled, selected: isSelected }}
  accessibilityHint="Optional hint for non-obvious actions"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  style={{ minHeight: 44, minWidth: 44 }} // Touch target
>
```

### Status Indicators

Never use color alone - always include icon and/or text:

```tsx
// ✅ CORRECT: Color + Icon + Text
<View style={styles.status}>
  <Ionicons
    name={status === 'success' ? 'checkmark-circle' : 'alert-circle'}
    size={16}
    color={status === 'success' ? colors.success : colors.error}
  />
  <Text style={styles.statusText}>
    {status === 'success' ? 'Active' : 'Injured'}
  </Text>
</View>

// ❌ WRONG: Color only
<View style={{ backgroundColor: player.injured ? 'red' : 'green' }} />
```

### Focus Management

```tsx
import { useRef, useEffect } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';

// Focus on element when screen loads
const MyScreen = () => {
  const headerRef = useRef<Text>(null);

  useEffect(() => {
    // Give focus to header for screen readers
    if (headerRef.current) {
      const node = findNodeHandle(headerRef.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  }, []);

  return (
    <Text ref={headerRef} accessibilityRole="header">
      Screen Title
    </Text>
  );
};
```

---

## Testing Standards

### Component Tests

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlayerCard } from './PlayerCard';
import { mockPlayer } from '@tests/mocks';

describe('PlayerCard', () => {
  it('renders player information correctly', () => {
    const { getByText, getByLabelText } = render(
      <PlayerCard player={mockPlayer} />
    );

    expect(getByText(mockPlayer.name)).toBeTruthy();
    expect(getByText(mockPlayer.position)).toBeTruthy();
    expect(getByLabelText(/overall/i)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <PlayerCard player={mockPlayer} onPress={onPress} />
    );

    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('meets accessibility requirements', () => {
    const { getByRole } = render(
      <PlayerCard player={mockPlayer} onPress={() => {}} />
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBeTruthy();
    expect(button.props.accessibilityHint).toBeTruthy();
  });
});
```

### Flow Tests

```tsx
import { getWeekFlowState, advanceWeek } from './weekFlow';
import { createMockGameState } from '@tests/mocks';

describe('Week Flow', () => {
  it('prevents advancing without completing game', () => {
    const gameState = createMockGameState({
      weekFlags: { preGameViewed: true, gameSimulated: false },
    });

    const flowState = getWeekFlowState(gameState);

    expect(flowState.canAdvance).toBe(false);
    expect(flowState.phase).toBe('simulating');
  });

  it('allows advancing after all steps complete', () => {
    const gameState = createMockGameState({
      weekFlags: {
        preGameViewed: true,
        gameSimulated: true,
        postGameViewed: true,
        weekSummaryViewed: true,
      },
    });

    const flowState = getWeekFlowState(gameState);

    expect(flowState.canAdvance).toBe(true);
    expect(flowState.phase).toBe('ready_to_advance');
  });

  it('advances week correctly', () => {
    const gameState = createMockGameState({
      league: { calendar: { currentWeek: 5 } },
    });

    const newState = advanceWeek(gameState);

    expect(newState.league.calendar.currentWeek).toBe(6);
  });
});
```

### Accessibility Tests

```tsx
import { render } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('Dashboard has no accessibility violations', async () => {
    const { container } = render(<Dashboard gameState={mockGameState} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('all buttons have minimum touch target', () => {
    const { getAllByRole } = render(<Dashboard gameState={mockGameState} />);
    const buttons = getAllByRole('button');

    buttons.forEach(button => {
      const { minHeight, minWidth } = button.props.style;
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  });
});
```

---

*Last Updated: January 2026*
