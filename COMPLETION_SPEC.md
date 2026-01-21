# NFL GM Simulator - Completion Specification

> **Ralph Wiggum Completion Prompt**: A systematic guide to transform this 25% production-ready app into a 95%+ ship-ready application.

## Current State: 25% Production Ready

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Game Engine | 90% | 95% | Small |
| UI Components | 5% | 95% | **CRITICAL** |
| Accessibility | 3% | 95% | **CRITICAL** |
| Error Handling | 10% | 95% | **CRITICAL** |
| Loading States | 0% | 95% | **CRITICAL** |
| Test Coverage | 6% | 80% | High |

---

## Phase 1: Foundation (BLOCKING - Do First)

### 1.1 Create Screen Template

Every screen MUST follow this exact pattern:

```tsx
// src/screens/[ScreenName].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameState } from '@core/models';
import {
  ScreenHeader,
  Button,
  LoadingScreen,
  ErrorScreen
} from '../components';
import { colors, spacing } from '../styles';

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

  // 2. Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Load data...
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Loading state
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  // 4. Error state
  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={loadData}
        onGoBack={() => onNavigate('Dashboard')}
      />
    );
  }

  // 5. Main render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Screen Title"
        onBack={() => onNavigate('Dashboard')}
      />
      <ScrollView style={styles.content}>
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
});
```

### 1.2 Screens to Update (Priority Order)

**Tier 1 - Core Flow (Do These First)**

| Screen | File | Changes Required |
|--------|------|------------------|
| GMDashboardScreen | `src/screens/GMDashboardScreen.tsx` | Add ScreenHeader, use PrimaryActionCard for main action, migrate MenuCards to Button |
| RosterScreen | `src/screens/RosterScreen.tsx` | Add loading/error states, use ScreenHeader, use Button for all actions |
| ScheduleScreen | `src/screens/ScheduleScreen.tsx` | Add ScreenHeader, loading state |
| StandingsScreen | `src/screens/StandingsScreen.tsx` | Add ScreenHeader |
| LiveGameSimulationScreen | `src/screens/LiveGameSimulationScreen.tsx` | Add error handling, integrate WeekFlowManager gates |
| PostGameSummaryScreen | `src/screens/PostGameSummaryScreen.tsx` | Add ScreenHeader, use Button, add WeekFlowManager |

**Tier 2 - Offseason Flow**

| Screen | File | Changes Required |
|--------|------|------------------|
| OffseasonScreen | `src/screens/OffseasonScreen.tsx` | Replace PhaseTimeline with OffseasonProgressBar, use Button |
| DraftRoomScreen | `src/screens/DraftRoomScreen.tsx` | Add loading states, OffseasonProgressBar context, error handling |
| FreeAgencyScreen | `src/screens/FreeAgencyScreen.tsx` | Add loading/error states, use Button for all actions |
| TrainingCampScreen | `src/screens/TrainingCampScreen.tsx` | Add OffseasonProgressBar, use Button |
| FinalCutsScreen | `src/screens/FinalCutsScreen.tsx` | Add OffseasonProgressBar, loading states |
| ContractManagementScreen | `src/screens/ContractManagementScreen.tsx` | Add loading/error, use Button |

**Tier 3 - Supporting Screens**

| Screen | File | Changes Required |
|--------|------|------------------|
| TeamSelectionScreen | `src/screens/TeamSelectionScreen.tsx` | Use Button for team selection |
| StartScreen | `src/screens/StartScreen.tsx` | Use Button for save slots |
| DepthChartScreenV2 | `src/screens/DepthChartScreenV2.tsx` | Add ScreenHeader, loading state |
| TradeScreen | `src/screens/TradeScreen.tsx` | Add loading/error states |
| NewsScreen | `src/screens/NewsScreen.tsx` | Add ScreenHeader |
| FinancesScreen | `src/screens/FinancesScreen.tsx` | Add ScreenHeader |
| StaffScreen | `src/screens/StaffScreen.tsx` | Add ScreenHeader, use Button |
| SettingsScreen | `src/screens/SettingsScreen.tsx` | Use Button for all settings |

**Tier 4 - Remaining Screens (All Others)**

Apply same pattern to remaining 30+ screens.

---

## Phase 2: Accessibility Compliance

### 2.1 Button Migration Checklist

For EVERY `TouchableOpacity` in the codebase, replace with `Button`:

```tsx
// BEFORE (Bad)
<TouchableOpacity onPress={handlePress}>
  <Text>Click Me</Text>
</TouchableOpacity>

// AFTER (Good)
<Button
  label="Click Me"
  onPress={handlePress}
  accessibilityHint="Description of what this does"
/>
```

### 2.2 Accessibility Requirements Per Screen

Every interactive element MUST have:

```tsx
// Buttons
<Button
  label="Action Name"              // REQUIRED
  accessibilityHint="What happens" // REQUIRED for non-obvious actions
  onPress={handler}
/>

// Custom touchables (if Button doesn't work)
<TouchableOpacity
  accessibilityLabel="What this is"
  accessibilityRole="button"
  accessibilityHint="What happens when tapped"
  accessibilityState={{ disabled: isDisabled }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  style={{ minHeight: 44, minWidth: 44 }}
>

// Lists
<FlatList
  accessibilityRole="list"
  renderItem={({ item }) => (
    <View accessibilityRole="listitem">
      ...
    </View>
  )}
/>

// Headers
<Text accessibilityRole="header">Section Title</Text>

// Status indicators (NEVER color-only)
<View>
  <Ionicons name="checkmark-circle" /> {/* Icon */}
  <Text>Status: Active</Text>        {/* Text */}
</View>
```

### 2.3 Screens Requiring Accessibility Audit

Run through each screen and verify:

- [ ] All buttons use Button component
- [ ] All buttons have accessibilityLabel
- [ ] Complex actions have accessibilityHint
- [ ] Status indicators have icon + text (not just color)
- [ ] Headers have accessibilityRole="header"
- [ ] Lists have proper roles
- [ ] Touch targets are 44x44 minimum

---

## Phase 3: Dashboard Integration

### 3.1 GMDashboardScreen Updates

```tsx
// src/screens/GMDashboardScreen.tsx

// ADD these imports
import {
  ScreenHeader,
  Button,
  PrimaryActionCard,
  LoadingScreen,
  ErrorScreen
} from '../components';
import { getWeekFlowState } from '../services/flow';

// REPLACE custom ActionPrompt with PrimaryActionCard
const flowState = getWeekFlowState(gameState);

<PrimaryActionCard
  actionLabel={flowState.nextAction.label}
  description={flowState.nextAction.description}
  secondaryInfo={flowState.nextAction.secondaryInfo}
  onPress={() => onNavigate(flowState.nextAction.targetScreen)}
  actionType={flowState.nextAction.type}
  icon={flowState.nextAction.icon as keyof typeof Ionicons.glyphMap}
/>

// REPLACE all menu TouchableOpacity with Button
<Button
  label="Roster"
  variant="secondary"
  onPress={() => onNavigate('Roster')}
  accessibilityHint="View and manage your team roster"
/>
```

### 3.2 Job Security Meter Enhancement

```tsx
// Job security must have icon + text, not just color
<View style={styles.jobSecurityContainer}>
  <Ionicons
    name={getSecurityIcon(patienceMeter.status)}
    size={20}
    color={getSecurityColor(patienceMeter.status)}
  />
  <Text style={styles.jobSecurityLabel}>
    Job Security: {patienceMeter.status}
  </Text>
  <View style={styles.progressBar}>
    <View
      style={[
        styles.progressFill,
        { width: `${patienceMeter.currentPatience}%` }
      ]}
    />
  </View>
  <Text style={styles.percentage}>{patienceMeter.currentPatience}%</Text>
</View>
```

---

## Phase 4: Offseason Flow Integration

### 4.1 OffseasonScreen Updates

```tsx
// src/screens/OffseasonScreen.tsx

// REMOVE custom PhaseTimeline (lines 139-199)
// REMOVE custom ProgressBar (lines 201-214)

// ADD import
import { OffseasonProgressBar, OFFSEASON_PHASES } from '../components';

// USE OffseasonProgressBar instead
<OffseasonProgressBar
  currentPhaseIndex={currentPhaseIndex}
  completedPhases={completedPhases}
  onPhasePress={(phase, index) => {
    if (index <= currentPhaseIndex) {
      navigateToPhase(phase.id);
    }
  }}
/>
```

### 4.2 All Offseason Screens Must Show Progress

Every offseason-related screen should include:

```tsx
// At the top of each offseason screen
const offseasonState = gameState.offseasonState;
const completedPhases = getCompletedPhases(offseasonState);
const currentIndex = getCurrentPhaseIndex(offseasonState);

// In the render, show context
<OffseasonProgressBar
  currentPhaseIndex={currentIndex}
  completedPhases={completedPhases}
  compact={true}  // Use compact mode in sub-screens
/>
```

---

## Phase 5: Week Flow Integration

### 5.1 Weekly Progression Enforcement

The following screens MUST integrate WeekFlowManager:

```tsx
// src/screens/LiveGameSimulationScreen.tsx
import { markGameSimulated, getWeekFlowState } from '../services/flow';

// After game completes:
const updatedState = markGameSimulated(gameState);
onUpdateGameState(updatedState);

// src/screens/PostGameSummaryScreen.tsx
import { markPostGameViewed, getWeekFlowState } from '../services/flow';

// When user views results:
const updatedState = markPostGameViewed(gameState);
onUpdateGameState(updatedState);

// src/screens/WeeklyDigestScreen.tsx
import { markWeekSummaryViewed, advanceWeek, getWeekFlowState } from '../services/flow';

// When user views summary:
const updatedState = markWeekSummaryViewed(gameState);

// Advance week button
const handleAdvanceWeek = () => {
  const newState = advanceWeek(gameState);
  if (newState) {
    onUpdateGameState(newState);
    onNavigate('Dashboard');
  }
};
```

### 5.2 Gate Enforcement

Users cannot skip steps. Show remaining steps:

```tsx
import { getRemainingSteps, getWeekFlowProgress } from '../services/flow';

const remaining = getRemainingSteps(flowState.flags);
const progress = getWeekFlowProgress(flowState.flags);

// Show progress
<Text>Week Progress: {Math.round(progress * 100)}%</Text>

// Show what's left
{remaining.length > 0 && (
  <Text>Remaining: {remaining.join(', ')}</Text>
)}
```

---

## Phase 6: Loading & Error States

### 6.1 Loading State Pattern

```tsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    // Async operation
    await someAsyncOperation();
  } catch (err) {
    setError(err as Error);
  } finally {
    setLoading(false);
  }
};

if (loading) {
  return <LoadingScreen message="Loading roster..." />;
}

if (error) {
  return (
    <ErrorScreen
      error={error}
      onRetry={loadData}
      onGoBack={() => onNavigate('Dashboard')}
    />
  );
}
```

### 6.2 Screens Requiring Loading States

| Screen | Loading Message |
|--------|----------------|
| RosterScreen | "Loading roster..." |
| FreeAgencyScreen | "Loading free agents..." |
| DraftRoomScreen | "Setting up draft room..." |
| TradeScreen | "Processing trade..." |
| ContractManagementScreen | "Loading contracts..." |
| ScoutingReportsScreen | "Generating scouting reports..." |
| LiveGameSimulationScreen | "Simulating game..." |
| StatsScreen | "Loading statistics..." |

---

## Phase 7: Testing Requirements

### 7.1 Screen Tests

Every screen needs a test file:

```tsx
// src/screens/__tests__/[ScreenName].test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScreenName } from '../ScreenName';
import { createMockGameState } from '../../tests/mocks';

describe('ScreenName', () => {
  const mockGameState = createMockGameState();
  const mockNavigate = jest.fn();
  const mockUpdateGameState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByText } = render(
      <ScreenName
        gameState={mockGameState}
        onNavigate={mockNavigate}
        onUpdateGameState={mockUpdateGameState}
      />
    );
    expect(getByText('Screen Title')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    const { getByText } = render(
      <ScreenName
        gameState={mockGameState}
        onNavigate={mockNavigate}
        onUpdateGameState={mockUpdateGameState}
      />
    );
    expect(getByText(/loading/i)).toBeTruthy();
  });

  it('handles errors gracefully', async () => {
    // Mock error scenario
    const { getByText } = render(
      <ScreenName
        gameState={mockGameState}
        onNavigate={mockNavigate}
        onUpdateGameState={mockUpdateGameState}
      />
    );

    await waitFor(() => {
      expect(getByText(/try again/i)).toBeTruthy();
    });
  });

  it('has proper accessibility', () => {
    const { getAllByRole } = render(
      <ScreenName
        gameState={mockGameState}
        onNavigate={mockNavigate}
        onUpdateGameState={mockUpdateGameState}
      />
    );

    const buttons = getAllByRole('button');
    buttons.forEach(button => {
      expect(button.props.accessibilityLabel).toBeTruthy();
    });
  });
});
```

### 7.2 Accessibility Tests

```tsx
// src/tests/accessibility.test.tsx
import { render } from '@testing-library/react-native';

const screens = [
  'GMDashboardScreen',
  'RosterScreen',
  // ... all screens
];

describe('Accessibility Compliance', () => {
  screens.forEach(screenName => {
    it(`${screenName} has proper touch targets`, () => {
      // Test all buttons have minHeight: 44
    });

    it(`${screenName} has accessibility labels`, () => {
      // Test all interactive elements have labels
    });

    it(`${screenName} status indicators have icons`, () => {
      // Test no color-only indicators
    });
  });
});
```

---

## Completion Checklist

### Phase 1: Foundation ☐
- [ ] Create base screen template
- [ ] Update GMDashboardScreen
- [ ] Update RosterScreen
- [ ] Update ScheduleScreen
- [ ] Update StandingsScreen
- [ ] Update LiveGameSimulationScreen
- [ ] Update PostGameSummaryScreen

### Phase 2: Accessibility ☐
- [ ] Migrate all TouchableOpacity to Button (48 screens)
- [ ] Add accessibilityLabel to all buttons
- [ ] Add accessibilityHint to complex actions
- [ ] Ensure 44x44 touch targets
- [ ] Add icon+text to all status indicators

### Phase 3: Dashboard ☐
- [ ] Integrate PrimaryActionCard
- [ ] Enhance job security meter
- [ ] Use Button for all menu items
- [ ] Add ScreenHeader

### Phase 4: Offseason ☐
- [ ] Replace PhaseTimeline with OffseasonProgressBar
- [ ] Add OffseasonProgressBar to DraftRoomScreen
- [ ] Add OffseasonProgressBar to FreeAgencyScreen
- [ ] Add OffseasonProgressBar to TrainingCampScreen
- [ ] Add OffseasonProgressBar to PreseasonScreen
- [ ] Add OffseasonProgressBar to FinalCutsScreen

### Phase 5: Week Flow ☐
- [ ] Integrate WeekFlowManager in LiveGameSimulationScreen
- [ ] Integrate WeekFlowManager in PostGameSummaryScreen
- [ ] Integrate WeekFlowManager in WeeklyDigestScreen
- [ ] Show progress gates on Dashboard
- [ ] Enforce step completion

### Phase 6: Loading/Error ☐
- [ ] Add loading states to all async screens
- [ ] Add error handling to all async screens
- [ ] Test error recovery flows

### Phase 7: Testing ☐
- [ ] Add tests for all 48 screens
- [ ] Add accessibility tests
- [ ] Add flow integration tests
- [ ] Achieve 80% coverage

---

## Verification Commands

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format:check

# Tests
npm test

# Test coverage
npm run test:coverage
```

---

## Success Criteria

**Production Ready = ALL of the following:**

1. ✓ All 48 screens use Button component
2. ✓ All 48 screens have ScreenHeader (where applicable)
3. ✓ All async screens have loading states
4. ✓ All async screens have error handling
5. ✓ All interactive elements have accessibility labels
6. ✓ All status indicators have icon + text
7. ✓ All touch targets are 44x44 minimum
8. ✓ WeekFlowManager integrated in season screens
9. ✓ OffseasonProgressBar used in offseason screens
10. ✓ 80%+ test coverage
11. ✓ Zero TypeScript errors
12. ✓ Zero ESLint errors (warnings OK)
13. ✓ All screens render without crash

---

*Last Updated: January 2026*
*Target Completion: 95%+ Production Ready*
