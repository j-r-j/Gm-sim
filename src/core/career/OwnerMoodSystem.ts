/**
 * Owner Mood System
 * Tracks owner satisfaction, generates mood events, and affects trust level
 */

import { Owner } from '../models/owner/Owner';
import { applyPatienceChange } from '../models/owner/PatienceMeter';

/**
 * Owner mood states (hidden from user)
 */
export type OwnerMood =
  | 'elated'
  | 'pleased'
  | 'content'
  | 'neutral'
  | 'concerned'
  | 'frustrated'
  | 'angry'
  | 'furious';

/**
 * Mood event types that can affect owner satisfaction
 */
export type MoodEventType =
  | 'win'
  | 'loss'
  | 'blowoutWin'
  | 'blowoutLoss'
  | 'playoffWin'
  | 'playoffLoss'
  | 'superBowlWin'
  | 'superBowlLoss'
  | 'draftSuccess'
  | 'draftDisappointment'
  | 'signingSuccess'
  | 'signingFailure'
  | 'tradeSuccess'
  | 'tradeFailure'
  | 'mediaPositive'
  | 'mediaNegative'
  | 'playerConflict'
  | 'coachConflict'
  | 'fanRally'
  | 'fanProtest'
  | 'rivalryWin'
  | 'rivalryLoss'
  | 'streakWin'
  | 'streakLoss'
  | 'recordBreaking'
  | 'injury'
  | 'scandal';

/**
 * A mood event that occurred
 */
export interface MoodEvent {
  type: MoodEventType;
  description: string;
  moodImpact: number; // -50 to +50
  patienceImpact: number; // -30 to +30
  trustImpact: number; // -20 to +20
  week: number;
  season: number;
}

/**
 * Owner mood state tracking
 */
export interface OwnerMoodState {
  currentMood: OwnerMood;
  moodValue: number; // 0-100, hidden
  recentEvents: MoodEvent[];
  weeklyMoodHistory: Array<{ week: number; mood: OwnerMood; value: number }>;
  satisfactionStreak: number; // Positive = happy streak, negative = unhappy streak
}

/**
 * Base mood impacts for event types
 */
const MOOD_EVENT_IMPACTS: Record<
  MoodEventType,
  { mood: number; patience: number; trust: number }
> = {
  win: { mood: 5, patience: 2, trust: 1 },
  loss: { mood: -5, patience: -3, trust: -1 },
  blowoutWin: { mood: 10, patience: 4, trust: 2 },
  blowoutLoss: { mood: -12, patience: -6, trust: -3 },
  playoffWin: { mood: 20, patience: 10, trust: 5 },
  playoffLoss: { mood: -15, patience: -8, trust: -4 },
  superBowlWin: { mood: 50, patience: 30, trust: 15 },
  superBowlLoss: { mood: -10, patience: -5, trust: -2 },
  draftSuccess: { mood: 15, patience: 8, trust: 5 },
  draftDisappointment: { mood: -10, patience: -6, trust: -4 },
  signingSuccess: { mood: 12, patience: 6, trust: 4 },
  signingFailure: { mood: -8, patience: -5, trust: -3 },
  tradeSuccess: { mood: 15, patience: 7, trust: 5 },
  tradeFailure: { mood: -12, patience: -7, trust: -5 },
  mediaPositive: { mood: 8, patience: 3, trust: 2 },
  mediaNegative: { mood: -10, patience: -5, trust: -3 },
  playerConflict: { mood: -8, patience: -4, trust: -3 },
  coachConflict: { mood: -10, patience: -5, trust: -4 },
  fanRally: { mood: 10, patience: 5, trust: 3 },
  fanProtest: { mood: -15, patience: -8, trust: -5 },
  rivalryWin: { mood: 15, patience: 5, trust: 3 },
  rivalryLoss: { mood: -15, patience: -6, trust: -3 },
  streakWin: { mood: 8, patience: 4, trust: 2 },
  streakLoss: { mood: -10, patience: -5, trust: -2 },
  recordBreaking: { mood: 20, patience: 8, trust: 5 },
  injury: { mood: -5, patience: -2, trust: 0 },
  scandal: { mood: -25, patience: -12, trust: -8 },
};

/**
 * Creates initial mood state
 */
export function createOwnerMoodState(): OwnerMoodState {
  return {
    currentMood: 'neutral',
    moodValue: 50,
    recentEvents: [],
    weeklyMoodHistory: [],
    satisfactionStreak: 0,
  };
}

/**
 * Calculates mood from value
 */
export function getMoodFromValue(value: number): OwnerMood {
  if (value >= 90) return 'elated';
  if (value >= 75) return 'pleased';
  if (value >= 60) return 'content';
  if (value >= 45) return 'neutral';
  if (value >= 35) return 'concerned';
  if (value >= 25) return 'frustrated';
  if (value >= 15) return 'angry';
  return 'furious';
}

/**
 * Gets user-visible mood description (no raw numbers)
 */
export function getMoodDescription(
  mood: OwnerMood
): 'very happy' | 'happy' | 'satisfied' | 'neutral' | 'concerned' | 'unhappy' | 'very unhappy' {
  const descriptions: Record<OwnerMood, ReturnType<typeof getMoodDescription>> = {
    elated: 'very happy',
    pleased: 'happy',
    content: 'satisfied',
    neutral: 'neutral',
    concerned: 'concerned',
    frustrated: 'unhappy',
    angry: 'very unhappy',
    furious: 'very unhappy',
  };

  return descriptions[mood];
}

/**
 * Applies owner personality modifiers to event impacts
 */
function applyPersonalityModifiers(
  owner: Owner,
  eventType: MoodEventType,
  baseImpact: { mood: number; patience: number; trust: number }
): { mood: number; patience: number; trust: number } {
  const { traits, secondaryTraits } = owner.personality;

  let moodMod = baseImpact.mood;
  let patienceMod = baseImpact.patience;
  let trustMod = baseImpact.trust;

  // Patient owners less affected by negative events
  if (baseImpact.mood < 0 && traits.patience > 60) {
    const reduction = (traits.patience - 60) / 100;
    moodMod = moodMod * (1 - reduction * 0.3);
    patienceMod = patienceMod * (1 - reduction * 0.3);
  }

  // Impatient owners more affected by losses
  if (baseImpact.mood < 0 && traits.patience < 40) {
    const increase = (40 - traits.patience) / 100;
    moodMod = moodMod * (1 + increase * 0.4);
    patienceMod = patienceMod * (1 + increase * 0.4);
  }

  // PR-obsessed owners more affected by media events
  if (secondaryTraits.includes('prObsessed')) {
    if (eventType === 'mediaPositive' || eventType === 'mediaNegative') {
      moodMod = moodMod * 1.5;
      patienceMod = patienceMod * 1.3;
    }
    if (eventType === 'fanProtest' || eventType === 'fanRally') {
      moodMod = moodMod * 1.4;
    }
  }

  // Win-now owners more affected by playoff results
  if (secondaryTraits.includes('winNow') || secondaryTraits.includes('championshipOrBust')) {
    if (
      eventType === 'playoffWin' ||
      eventType === 'playoffLoss' ||
      eventType === 'superBowlWin' ||
      eventType === 'superBowlLoss'
    ) {
      moodMod = moodMod * 1.5;
      patienceMod = patienceMod * 1.3;
    }
  }

  // High-ego owners more sensitive to scandals
  if (traits.ego > 70 && eventType === 'scandal') {
    moodMod = moodMod * 1.4;
    trustMod = trustMod * 1.5;
  }

  // Loyal owners give more trust on success
  if (traits.loyalty > 70 && baseImpact.trust > 0) {
    trustMod = trustMod * 1.3;
  }

  return {
    mood: Math.round(moodMod),
    patience: Math.round(patienceMod),
    trust: Math.round(trustMod),
  };
}

/**
 * Creates a mood event
 */
export function createMoodEvent(
  type: MoodEventType,
  description: string,
  owner: Owner,
  week: number,
  season: number
): MoodEvent {
  const baseImpact = MOOD_EVENT_IMPACTS[type];
  const modifiedImpact = applyPersonalityModifiers(owner, type, baseImpact);

  return {
    type,
    description,
    moodImpact: modifiedImpact.mood,
    patienceImpact: modifiedImpact.patience,
    trustImpact: modifiedImpact.trust,
    week,
    season,
  };
}

/**
 * Processes a mood event and updates state
 */
export function processMoodEvent(
  state: OwnerMoodState,
  owner: Owner,
  event: MoodEvent
): { newState: OwnerMoodState; ownerUpdates: Partial<Owner> } {
  // Update mood value
  let newMoodValue = state.moodValue + event.moodImpact;
  newMoodValue = Math.max(0, Math.min(100, newMoodValue));

  // Calculate new mood
  const newMood = getMoodFromValue(newMoodValue);

  // Update satisfaction streak
  let newStreak = state.satisfactionStreak;
  if (event.moodImpact > 0) {
    newStreak = newStreak >= 0 ? newStreak + 1 : 1;
  } else if (event.moodImpact < 0) {
    newStreak = newStreak <= 0 ? newStreak - 1 : -1;
  }

  // Keep only recent events (last 10)
  const recentEvents = [...state.recentEvents, event].slice(-10);

  // Calculate owner updates
  const newPatience = applyPatienceChange(owner.patienceMeter, event.patienceImpact);
  const newTrust = Math.max(0, Math.min(100, owner.trustLevel + event.trustImpact));

  return {
    newState: {
      currentMood: newMood,
      moodValue: newMoodValue,
      recentEvents,
      weeklyMoodHistory: [
        ...state.weeklyMoodHistory,
        { week: event.week, mood: newMood, value: newMoodValue },
      ].slice(-17), // Keep one season of history
      satisfactionStreak: newStreak,
    },
    ownerUpdates: {
      patienceMeter: newPatience,
      trustLevel: newTrust,
    },
  };
}

/**
 * Gets mood trend description
 */
export function getMoodTrend(state: OwnerMoodState): 'improving' | 'stable' | 'declining' {
  if (state.weeklyMoodHistory.length < 3) return 'stable';

  const recent = state.weeklyMoodHistory.slice(-3);
  const avgRecent = recent.reduce((sum, h) => sum + h.value, 0) / recent.length;
  const firstValue = recent[0].value;

  if (avgRecent > firstValue + 5) return 'improving';
  if (avgRecent < firstValue - 5) return 'declining';
  return 'stable';
}

/**
 * Gets satisfaction streak description
 */
export function getStreakDescription(
  streak: number
): 'hot streak' | 'doing well' | 'neutral' | 'struggling' | 'cold streak' {
  if (streak >= 5) return 'hot streak';
  if (streak >= 2) return 'doing well';
  if (streak <= -5) return 'cold streak';
  if (streak <= -2) return 'struggling';
  return 'neutral';
}

/**
 * Calculates weekly mood decay (moods drift toward neutral over time)
 */
export function applyMoodDecay(state: OwnerMoodState): OwnerMoodState {
  const targetMood = 50;
  const decayRate = 0.1; // 10% toward neutral per week

  const newMoodValue = state.moodValue + (targetMood - state.moodValue) * decayRate;

  return {
    ...state,
    moodValue: Math.round(newMoodValue),
    currentMood: getMoodFromValue(Math.round(newMoodValue)),
  };
}

/**
 * Gets summary of recent events for display
 */
export function getRecentEventsSummary(state: OwnerMoodState): {
  positiveEvents: number;
  negativeEvents: number;
  neutralEvents: number;
  netSentiment: 'positive' | 'neutral' | 'negative';
} {
  const positiveEvents = state.recentEvents.filter((e) => e.moodImpact > 0).length;
  const negativeEvents = state.recentEvents.filter((e) => e.moodImpact < 0).length;
  const neutralEvents = state.recentEvents.filter((e) => e.moodImpact === 0).length;

  const netSentiment: 'positive' | 'neutral' | 'negative' =
    positiveEvents > negativeEvents ? 'positive' : negativeEvents > positiveEvents ? 'negative' : 'neutral';

  return { positiveEvents, negativeEvents, neutralEvents, netSentiment };
}

/**
 * Gets owner's current sentiment for display (hides raw numbers)
 */
export function getOwnerSentiment(state: OwnerMoodState): {
  mood: string;
  trend: string;
  outlook: string;
} {
  const moodDesc = getMoodDescription(state.currentMood);
  const trend = getMoodTrend(state);

  const trendText =
    trend === 'improving'
      ? 'Things are looking up'
      : trend === 'declining'
        ? 'Concerns are growing'
        : 'Holding steady';

  let outlook: string;
  if (state.moodValue >= 70 && trend !== 'declining') {
    outlook = 'The owner is confident in your leadership';
  } else if (state.moodValue >= 50) {
    outlook = 'The owner is cautiously optimistic';
  } else if (state.moodValue >= 30) {
    outlook = 'The owner expects improvement';
  } else {
    outlook = 'The owner is losing patience';
  }

  return {
    mood: moodDesc,
    trend: trendText,
    outlook,
  };
}

/**
 * Determines if owner should make a public statement based on mood
 */
export function shouldMakePublicStatement(state: OwnerMoodState): {
  shouldSpeak: boolean;
  type: 'praise' | 'support' | 'concern' | 'criticism' | 'warning' | null;
} {
  // Very high or very low moods trigger statements
  if (state.moodValue >= 85) {
    return { shouldSpeak: true, type: 'praise' };
  }
  if (state.moodValue >= 70 && state.satisfactionStreak >= 3) {
    return { shouldSpeak: true, type: 'support' };
  }
  if (state.moodValue <= 30 && state.moodValue > 20) {
    return { shouldSpeak: true, type: 'concern' };
  }
  if (state.moodValue <= 20 && state.moodValue > 10) {
    return { shouldSpeak: true, type: 'criticism' };
  }
  if (state.moodValue <= 10) {
    return { shouldSpeak: true, type: 'warning' };
  }

  return { shouldSpeak: false, type: null };
}

/**
 * Generates a public statement from the owner
 */
export function generateOwnerStatement(
  owner: Owner,
  type: 'praise' | 'support' | 'concern' | 'criticism' | 'warning'
): string {
  const statements: Record<typeof type, string[]> = {
    praise: [
      `"I couldn't be happier with the direction of this franchise."`,
      `"Our front office is doing an incredible job building this team."`,
      `"This is exactly the kind of success I envisioned when I hired our GM."`,
    ],
    support: [
      `"We believe in our leadership and the plan we have in place."`,
      `"I'm confident in the decisions being made at the top."`,
      `"Our GM has my full support as we continue building."`,
    ],
    concern: [
      `"We need to see improvement, and we need to see it soon."`,
      `"I'm not satisfied with where we are right now."`,
      `"Changes may need to be made if things don't turn around."`,
    ],
    criticism: [
      `"The results have been unacceptable. We expect better."`,
      `"I'm very disappointed in our performance this season."`,
      `"Our fans deserve better, and they're going to get it."`,
    ],
    warning: [
      `"Everyone's job is on the line. No one is safe."`,
      `"If things don't change immediately, there will be consequences."`,
      `"I've seen enough. Major changes are coming."`,
    ],
  };

  const options = statements[type];
  return options[Math.floor(Math.random() * options.length)];
}
