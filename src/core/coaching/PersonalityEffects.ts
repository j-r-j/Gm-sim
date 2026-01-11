/**
 * Personality Effects
 * Handles personality type interactions, staff chemistry, and conflict detection.
 * Chemistry values are HIDDEN from UI.
 */

import { Coach } from '../models/staff/Coach';

/**
 * Personality types for coaches
 */
export type PersonalityType =
  | 'analytical'
  | 'aggressive'
  | 'conservative'
  | 'innovative'
  | 'oldSchool'
  | 'playersCoach';

/**
 * Personality interaction result
 */
export interface PersonalityInteraction {
  type: 'synergy' | 'neutral' | 'conflict';
  strength: number; // 1-5 for synergy/conflict intensity
  description: string;
}

/**
 * Staff chemistry result
 */
export interface StaffChemistryResult {
  overallChemistry: number; // -10 to +10 (hidden)
  interactions: PersonalityInteraction[];
  conflicts: ConflictInfo[];
  synergies: SynergyInfo[];
  qualitativeDescription: StaffChemistryDescription;
}

/**
 * Conflict information
 */
export interface ConflictInfo {
  coach1Id: string;
  coach2Id: string;
  coach1Name: string;
  coach2Name: string;
  conflictType: ConflictType;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
}

/**
 * Synergy information
 */
export interface SynergyInfo {
  coach1Id: string;
  coach2Id: string;
  coach1Name: string;
  coach2Name: string;
  synergyType: SynergyType;
  strength: 'weak' | 'moderate' | 'strong';
  description: string;
}

/**
 * Types of conflicts
 */
export type ConflictType =
  | 'philosophy_clash'
  | 'ego_clash'
  | 'style_mismatch'
  | 'communication_breakdown'
  | 'authority_conflict';

/**
 * Types of synergies
 */
export type SynergyType =
  | 'shared_vision'
  | 'complementary_skills'
  | 'mentorship'
  | 'trust_bond'
  | 'communication_excellence';

/**
 * Qualitative description for UI (no numbers)
 */
export interface StaffChemistryDescription {
  level: 'excellent' | 'good' | 'average' | 'poor' | 'dysfunctional';
  summary: string;
  strengths: string[];
  concerns: string[];
}

/**
 * Personality compatibility matrix
 * Values: positive = synergy, negative = conflict, 0 = neutral
 */
const PERSONALITY_COMPATIBILITY: Record<PersonalityType, Record<PersonalityType, number>> = {
  analytical: {
    analytical: 2,
    aggressive: -2,
    conservative: 3,
    innovative: 1,
    oldSchool: 0,
    playersCoach: 1,
  },
  aggressive: {
    analytical: -2,
    aggressive: -3, // Two aggressive personalities clash
    conservative: -4,
    innovative: 2,
    oldSchool: -1,
    playersCoach: 0,
  },
  conservative: {
    analytical: 3,
    aggressive: -4,
    conservative: 2,
    innovative: -2,
    oldSchool: 3,
    playersCoach: 1,
  },
  innovative: {
    analytical: 1,
    aggressive: 2,
    conservative: -2,
    innovative: 1,
    oldSchool: -3,
    playersCoach: 2,
  },
  oldSchool: {
    analytical: 0,
    aggressive: -1,
    conservative: 3,
    innovative: -3,
    oldSchool: 2,
    playersCoach: 1,
  },
  playersCoach: {
    analytical: 1,
    aggressive: 0,
    conservative: 1,
    innovative: 2,
    oldSchool: 1,
    playersCoach: 3,
  },
};

/**
 * Conflict descriptions by type
 */
const CONFLICT_DESCRIPTIONS: Record<ConflictType, string[]> = {
  philosophy_clash: [
    'Fundamental disagreement on team strategy',
    'Different views on player development approach',
    'Conflicting ideas about game preparation',
  ],
  ego_clash: [
    'Power struggle affecting staff dynamics',
    'Credit disputes over team success',
    'Competing for influence with front office',
  ],
  style_mismatch: [
    'Incompatible coaching methods',
    'Different communication preferences',
    'Contrasting approaches to player motivation',
  ],
  communication_breakdown: [
    'Lack of information sharing between coaches',
    'Miscommunication on game day decisions',
    'Poor coordination during practices',
  ],
  authority_conflict: [
    'Unclear chain of command',
    'Overstepping of responsibilities',
    'Resistance to direction from above',
  ],
};

/**
 * Synergy descriptions by type
 */
const SYNERGY_DESCRIPTIONS: Record<SynergyType, string[]> = {
  shared_vision: [
    'United approach to team building',
    'Common goals for player development',
    'Aligned on long-term strategy',
  ],
  complementary_skills: [
    'Skills that enhance each other',
    'Balanced expertise across areas',
    "Filling gaps in each other's knowledge",
  ],
  mentorship: [
    'Veteran guidance benefiting younger coach',
    'Knowledge transfer strengthening staff',
    'Experience sharing improves decisions',
  ],
  trust_bond: [
    'Strong professional relationship',
    'Reliable support during challenges',
    'Mutual respect and confidence',
  ],
  communication_excellence: [
    'Clear and effective communication',
    'Seamless coordination on game day',
    'Excellent information flow',
  ],
};

/**
 * Checks if two personalities have a conflict
 */
export function hasPersonalityConflict(
  personality1: PersonalityType,
  personality2: PersonalityType
): boolean {
  const compatibility = PERSONALITY_COMPATIBILITY[personality1]?.[personality2] ?? 0;
  return compatibility < -1;
}

/**
 * Checks if two personalities have synergy
 */
export function hasPersonalitySynergy(
  personality1: PersonalityType,
  personality2: PersonalityType
): boolean {
  const compatibility = PERSONALITY_COMPATIBILITY[personality1]?.[personality2] ?? 0;
  return compatibility > 1;
}

/**
 * Gets the compatibility score between two personalities
 */
export function getPersonalityCompatibility(
  personality1: PersonalityType,
  personality2: PersonalityType
): number {
  return PERSONALITY_COMPATIBILITY[personality1]?.[personality2] ?? 0;
}

/**
 * Calculates interaction between two coach personalities
 */
export function calculatePersonalityInteraction(
  coach1: Coach,
  coach2: Coach
): PersonalityInteraction {
  const primary1 = coach1.personality.primary;
  const primary2 = coach2.personality.primary;

  const primaryCompatibility = getPersonalityCompatibility(primary1, primary2);

  // Consider secondary personalities
  let secondaryBonus = 0;
  if (coach1.personality.secondary && coach2.personality.secondary) {
    secondaryBonus =
      getPersonalityCompatibility(coach1.personality.secondary, coach2.personality.secondary) * 0.3;
  }

  const totalCompatibility = primaryCompatibility + secondaryBonus;

  // Determine interaction type
  let type: PersonalityInteraction['type'];
  let strength: number;

  if (totalCompatibility >= 2) {
    type = 'synergy';
    strength = Math.min(5, Math.ceil(totalCompatibility));
  } else if (totalCompatibility <= -2) {
    type = 'conflict';
    strength = Math.min(5, Math.ceil(Math.abs(totalCompatibility)));
  } else {
    type = 'neutral';
    strength = 0;
  }

  // Generate description
  let description: string;
  if (type === 'synergy') {
    description = `${coach1.firstName} ${coach1.lastName} and ${coach2.firstName} ${coach2.lastName} work well together`;
  } else if (type === 'conflict') {
    description = `Tension exists between ${coach1.firstName} ${coach1.lastName} and ${coach2.firstName} ${coach2.lastName}`;
  } else {
    description = `${coach1.firstName} ${coach1.lastName} and ${coach2.firstName} ${coach2.lastName} have a professional relationship`;
  }

  return { type, strength, description };
}

/**
 * Detects conflicts between two coaches
 */
export function detectConflict(coach1: Coach, coach2: Coach): ConflictInfo | null {
  const interaction = calculatePersonalityInteraction(coach1, coach2);

  if (interaction.type !== 'conflict') {
    return null;
  }

  // Determine conflict type based on personalities
  let conflictType: ConflictType;
  const p1 = coach1.personality.primary;
  const p2 = coach2.personality.primary;

  if (p1 === 'aggressive' && p2 === 'aggressive') {
    conflictType = 'ego_clash';
  } else if (
    (p1 === 'innovative' && p2 === 'oldSchool') ||
    (p1 === 'oldSchool' && p2 === 'innovative')
  ) {
    conflictType = 'philosophy_clash';
  } else if (
    (p1 === 'aggressive' && p2 === 'conservative') ||
    (p1 === 'conservative' && p2 === 'aggressive')
  ) {
    conflictType = 'style_mismatch';
  } else if (coach1.personality.ego > 80 && coach2.personality.ego > 80) {
    conflictType = 'ego_clash';
  } else {
    conflictType = 'style_mismatch';
  }

  // Determine severity
  let severity: ConflictInfo['severity'];
  if (interaction.strength >= 4) {
    severity = 'severe';
  } else if (interaction.strength >= 2) {
    severity = 'moderate';
  } else {
    severity = 'minor';
  }

  // Get description
  const descriptions = CONFLICT_DESCRIPTIONS[conflictType];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    coach1Id: coach1.id,
    coach2Id: coach2.id,
    coach1Name: `${coach1.firstName} ${coach1.lastName}`,
    coach2Name: `${coach2.firstName} ${coach2.lastName}`,
    conflictType,
    severity,
    description,
  };
}

/**
 * Detects synergy between two coaches
 */
export function detectSynergy(coach1: Coach, coach2: Coach): SynergyInfo | null {
  const interaction = calculatePersonalityInteraction(coach1, coach2);

  if (interaction.type !== 'synergy') {
    return null;
  }

  // Determine synergy type based on personalities and experience
  let synergyType: SynergyType;
  const p1 = coach1.personality.primary;
  const p2 = coach2.personality.primary;

  const expDiff = Math.abs(coach1.attributes.yearsExperience - coach2.attributes.yearsExperience);

  if (expDiff >= 10) {
    synergyType = 'mentorship';
  } else if (p1 === p2) {
    synergyType = 'shared_vision';
  } else if (p1 === 'playersCoach' || p2 === 'playersCoach') {
    synergyType = 'trust_bond';
  } else if (p1 === 'analytical' || p2 === 'analytical') {
    synergyType = 'communication_excellence';
  } else {
    synergyType = 'complementary_skills';
  }

  // Determine strength
  let strength: SynergyInfo['strength'];
  if (interaction.strength >= 4) {
    strength = 'strong';
  } else if (interaction.strength >= 2) {
    strength = 'moderate';
  } else {
    strength = 'weak';
  }

  // Get description
  const descriptions = SYNERGY_DESCRIPTIONS[synergyType];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  return {
    coach1Id: coach1.id,
    coach2Id: coach2.id,
    coach1Name: `${coach1.firstName} ${coach1.lastName}`,
    coach2Name: `${coach2.firstName} ${coach2.lastName}`,
    synergyType,
    strength,
    description,
  };
}

/**
 * Calculates overall staff chemistry for a group of coaches
 */
export function calculateStaffChemistry(coaches: Coach[]): StaffChemistryResult {
  if (coaches.length < 2) {
    return {
      overallChemistry: 0,
      interactions: [],
      conflicts: [],
      synergies: [],
      qualitativeDescription: {
        level: 'average',
        summary: 'Staff too small to evaluate chemistry',
        strengths: [],
        concerns: [],
      },
    };
  }

  const interactions: PersonalityInteraction[] = [];
  const conflicts: ConflictInfo[] = [];
  const synergies: SynergyInfo[] = [];
  let totalChemistry = 0;
  let pairCount = 0;

  // Calculate pairwise interactions
  for (let i = 0; i < coaches.length; i++) {
    for (let j = i + 1; j < coaches.length; j++) {
      const coach1 = coaches[i];
      const coach2 = coaches[j];

      const interaction = calculatePersonalityInteraction(coach1, coach2);
      interactions.push(interaction);

      // Check for conflicts
      const conflict = detectConflict(coach1, coach2);
      if (conflict) {
        conflicts.push(conflict);
        totalChemistry -=
          conflict.severity === 'severe' ? 3 : conflict.severity === 'moderate' ? 2 : 1;
      }

      // Check for synergies
      const synergy = detectSynergy(coach1, coach2);
      if (synergy) {
        synergies.push(synergy);
        totalChemistry +=
          synergy.strength === 'strong' ? 3 : synergy.strength === 'moderate' ? 2 : 1;
      }

      // Add base compatibility
      totalChemistry += getPersonalityCompatibility(
        coach1.personality.primary,
        coach2.personality.primary
      );

      pairCount++;
    }
  }

  // Average chemistry
  const avgChemistry = pairCount > 0 ? totalChemistry / pairCount : 0;
  const overallChemistry = Math.max(-10, Math.min(10, Math.round(avgChemistry * 2)));

  // Generate qualitative description
  const qualitativeDescription = generateStaffChemistryDescription(
    overallChemistry,
    conflicts,
    synergies
  );

  return {
    overallChemistry,
    interactions,
    conflicts,
    synergies,
    qualitativeDescription,
  };
}

/**
 * Generates qualitative description for staff chemistry (for UI)
 */
function generateStaffChemistryDescription(
  chemistry: number,
  conflicts: ConflictInfo[],
  synergies: SynergyInfo[]
): StaffChemistryDescription {
  // Determine level
  let level: StaffChemistryDescription['level'];
  if (chemistry >= 7) {
    level = 'excellent';
  } else if (chemistry >= 3) {
    level = 'good';
  } else if (chemistry >= -2) {
    level = 'average';
  } else if (chemistry >= -6) {
    level = 'poor';
  } else {
    level = 'dysfunctional';
  }

  // Generate summary
  let summary: string;
  switch (level) {
    case 'excellent':
      summary = 'Coaching staff works together exceptionally well';
      break;
    case 'good':
      summary = 'Staff has positive working relationships';
      break;
    case 'average':
      summary = 'Staff maintains professional relationships';
      break;
    case 'poor':
      summary = 'Staff has some relationship challenges';
      break;
    case 'dysfunctional':
      summary = 'Serious staff chemistry issues affecting performance';
      break;
  }

  // Generate strengths
  const strengths: string[] = [];
  const strongSynergies = synergies.filter((s) => s.strength === 'strong');
  if (strongSynergies.length > 0) {
    strengths.push(`Strong partnerships within the staff`);
  }
  if (synergies.some((s) => s.synergyType === 'mentorship')) {
    strengths.push('Effective mentorship relationships');
  }
  if (synergies.some((s) => s.synergyType === 'shared_vision')) {
    strengths.push('United coaching philosophy');
  }

  // Generate concerns
  const concerns: string[] = [];
  const severeConflicts = conflicts.filter((c) => c.severity === 'severe');
  if (severeConflicts.length > 0) {
    concerns.push('Serious personality conflicts on staff');
  }
  if (conflicts.some((c) => c.conflictType === 'ego_clash')) {
    concerns.push('Ego-driven disagreements');
  }
  if (conflicts.some((c) => c.conflictType === 'philosophy_clash')) {
    concerns.push('Philosophical differences');
  }

  return { level, summary, strengths, concerns };
}

/**
 * Calculates the impact of staff chemistry on team performance
 */
export function calculateStaffChemistryImpact(chemistry: StaffChemistryResult): {
  developmentModifier: number;
  gameDayModifier: number;
  moraleModifier: number;
} {
  const { overallChemistry, conflicts } = chemistry;

  // Base modifiers from overall chemistry
  let developmentModifier = overallChemistry * 0.005; // ±5% at extremes
  let gameDayModifier = overallChemistry * 0.003; // ±3% at extremes
  let moraleModifier = overallChemistry * 0.5; // ±5 points at extremes

  // Severe conflicts have additional impact
  const severeConflicts = conflicts.filter((c) => c.severity === 'severe').length;
  if (severeConflicts > 0) {
    developmentModifier -= severeConflicts * 0.02;
    gameDayModifier -= severeConflicts * 0.01;
    moraleModifier -= severeConflicts * 2;
  }

  return {
    developmentModifier: Math.max(-0.1, Math.min(0.1, developmentModifier)),
    gameDayModifier: Math.max(-0.05, Math.min(0.05, gameDayModifier)),
    moraleModifier: Math.max(-10, Math.min(10, moraleModifier)),
  };
}

/**
 * Suggests coaching hires that would improve staff chemistry
 */
export function suggestCompatiblePersonalities(currentStaff: Coach[]): PersonalityType[] {
  if (currentStaff.length === 0) {
    return ['analytical', 'playersCoach']; // Good foundation personalities
  }

  // Count current personalities
  const personalityCounts: Record<PersonalityType, number> = {
    analytical: 0,
    aggressive: 0,
    conservative: 0,
    innovative: 0,
    oldSchool: 0,
    playersCoach: 0,
  };

  for (const coach of currentStaff) {
    personalityCounts[coach.personality.primary]++;
  }

  // Find personalities that would have good chemistry
  const suggestions: PersonalityType[] = [];
  const allTypes: PersonalityType[] = [
    'analytical',
    'aggressive',
    'conservative',
    'innovative',
    'oldSchool',
    'playersCoach',
  ];

  for (const type of allTypes) {
    let totalCompatibility = 0;
    for (const coach of currentStaff) {
      totalCompatibility += getPersonalityCompatibility(type, coach.personality.primary);
    }

    // Average compatibility above threshold
    const avgCompatibility = totalCompatibility / currentStaff.length;
    if (avgCompatibility >= 1) {
      suggestions.push(type);
    }
  }

  // If no good suggestions, return neutral options
  if (suggestions.length === 0) {
    return ['analytical', 'playersCoach'];
  }

  return suggestions;
}

/**
 * Checks if adding a coach would create conflicts
 */
export function wouldCreateConflict(
  newCoach: Coach,
  existingStaff: Coach[]
): { wouldConflict: boolean; potentialConflicts: ConflictInfo[] } {
  const potentialConflicts: ConflictInfo[] = [];

  for (const existingCoach of existingStaff) {
    const conflict = detectConflict(newCoach, existingCoach);
    if (conflict) {
      potentialConflicts.push(conflict);
    }
  }

  return {
    wouldConflict: potentialConflicts.length > 0,
    potentialConflicts,
  };
}

/**
 * Validates personality type
 */
export function isValidPersonalityType(type: string): type is PersonalityType {
  return [
    'analytical',
    'aggressive',
    'conservative',
    'innovative',
    'oldSchool',
    'playersCoach',
  ].includes(type);
}
