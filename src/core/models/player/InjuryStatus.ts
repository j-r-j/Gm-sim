/**
 * Injury severity levels
 */
export type InjurySeverity =
  | 'none' // Healthy
  | 'questionable' // May play, minor issue
  | 'doubtful' // Unlikely to play
  | 'out' // Will not play this week
  | 'ir' // Injured reserve, out multiple weeks
  | 'pup' // Physically unable to perform
  | 'nfi'; // Non-football injury

/**
 * Types of injuries
 */
export type InjuryType =
  | 'none'
  | 'concussion'
  | 'hamstring'
  | 'knee'
  | 'ankle'
  | 'shoulder'
  | 'back'
  | 'foot'
  | 'hand'
  | 'elbow'
  | 'groin'
  | 'ribs'
  | 'neck'
  | 'achilles'
  | 'acl'
  | 'mcl'
  | 'other';

/**
 * Injury status for a player
 */
export interface InjuryStatus {
  /** Current injury severity */
  severity: InjurySeverity;

  /** Type of injury */
  type: InjuryType;

  /** Estimated weeks until full recovery (0 if healthy) */
  weeksRemaining: number;

  /** Whether the injury is publicly known */
  isPublic: boolean;

  /** Lingering effect on performance after recovery (0-100%, 0 = no effect) */
  lingeringEffect: number;
}

/**
 * Creates a healthy injury status
 */
export function createHealthyStatus(): InjuryStatus {
  return {
    severity: 'none',
    type: 'none',
    weeksRemaining: 0,
    isPublic: true,
    lingeringEffect: 0,
  };
}

/**
 * Checks if a player is healthy
 */
export function isHealthy(status: InjuryStatus): boolean {
  return status.severity === 'none';
}

/**
 * Checks if a player can play this week
 */
export function canPlay(status: InjuryStatus): boolean {
  return (
    status.severity === 'none' ||
    status.severity === 'questionable' ||
    status.severity === 'doubtful'
  );
}

/**
 * Checks if a player is on long-term injured status
 */
export function isLongTermInjured(status: InjuryStatus): boolean {
  return status.severity === 'ir' || status.severity === 'pup' || status.severity === 'nfi';
}

/**
 * Gets a display string for injury status
 */
export function getInjuryDisplayString(status: InjuryStatus): string {
  if (status.severity === 'none') {
    return 'Healthy';
  }

  const severityDisplay: Record<InjurySeverity, string> = {
    none: 'Healthy',
    questionable: 'Questionable',
    doubtful: 'Doubtful',
    out: 'Out',
    ir: 'IR',
    pup: 'PUP',
    nfi: 'NFI',
  };

  const typeDisplay = status.type !== 'none' && status.type !== 'other' ? ` (${status.type})` : '';

  return `${severityDisplay[status.severity]}${typeDisplay}`;
}

/**
 * Validates an injury status object
 */
export function validateInjuryStatus(status: InjuryStatus): boolean {
  const validSeverities: InjurySeverity[] = [
    'none',
    'questionable',
    'doubtful',
    'out',
    'ir',
    'pup',
    'nfi',
  ];

  const validTypes: InjuryType[] = [
    'none',
    'concussion',
    'hamstring',
    'knee',
    'ankle',
    'shoulder',
    'back',
    'foot',
    'hand',
    'elbow',
    'groin',
    'ribs',
    'neck',
    'achilles',
    'acl',
    'mcl',
    'other',
  ];

  return (
    validSeverities.includes(status.severity) &&
    validTypes.includes(status.type) &&
    status.weeksRemaining >= 0 &&
    status.lingeringEffect >= 0 &&
    status.lingeringEffect <= 100
  );
}

/**
 * Calculates performance modifier based on injury status.
 * FOR ENGINE USE ONLY.
 */
export function getInjuryPerformanceModifier(status: InjuryStatus): number {
  if (status.severity === 'none') {
    // Apply lingering effect if any
    return 1 - status.lingeringEffect / 100;
  }

  // Reduced performance when playing through injury
  switch (status.severity) {
    case 'questionable':
      return 0.9 - status.lingeringEffect / 100;
    case 'doubtful':
      return 0.75 - status.lingeringEffect / 100;
    default:
      return 0; // Should not be playing
  }
}
