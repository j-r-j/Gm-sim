/**
 * Player Progression System
 * Applies coach-influenced development to players during offseason.
 * Integrates with CoachEvaluationSystem to make coaching staff matter.
 */

import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { TechnicalSkills, SkillValue } from '../models/player/TechnicalSkills';
import { FitLevel } from '../models/player/SchemeFit';
import {
  calculateDevelopmentImpact,
  calculatePlayerCoachChemistry,
  getMotivationModifier,
  DevelopmentImpact,
} from '../coaching/CoachEvaluationSystem';

/**
 * Result of applying progression to a player
 */
export interface ProgressionResult {
  playerId: string;
  playerName: string;
  skillChanges: Record<string, number>;
  totalChange: number;
  coachInfluence: 'significant' | 'moderate' | 'minimal' | 'negative';
  developmentDescription: string;
}

/**
 * Options for progression calculation
 */
export interface ProgressionOptions {
  /** Years the player has been with this coach */
  yearsTogether: number;
  /** Whether the team had recent success */
  recentSuccess: boolean;
  /** Age-based development modifier (young players develop faster) */
  applyAgeModifier: boolean;
}

const DEFAULT_OPTIONS: ProgressionOptions = {
  yearsTogether: 1,
  recentSuccess: false,
  applyAgeModifier: true,
};

/**
 * Gets age-based development modifier
 * Young players (21-25) develop faster, veterans (30+) slower
 */
function getAgeModifier(age: number): number {
  if (age <= 23) return 1.3; // 30% bonus for very young players
  if (age <= 25) return 1.15; // 15% bonus for young players
  if (age <= 27) return 1.0; // Prime years - normal development
  if (age <= 29) return 0.85; // Starting to slow
  if (age <= 31) return 0.6; // Significant slowdown
  if (age <= 33) return 0.3; // Minimal development
  return 0.1; // Very limited development for veterans 34+
}

/**
 * Gets scheme fit level for a player with a coach
 */
function getPlayerSchemeFit(player: Player, coach: Coach): FitLevel {
  const scheme = coach.scheme;
  if (!scheme || !player.schemeFits) return 'neutral';

  // Check offensive schemes
  if (player.schemeFits.offensive && scheme in player.schemeFits.offensive) {
    return player.schemeFits.offensive[scheme as keyof typeof player.schemeFits.offensive];
  }

  // Check defensive schemes
  if (player.schemeFits.defensive && scheme in player.schemeFits.defensive) {
    return player.schemeFits.defensive[scheme as keyof typeof player.schemeFits.defensive];
  }

  return 'neutral';
}

/**
 * Applies offseason progression to a player based on coach quality
 */
export function applyOffseasonProgression(
  player: Player,
  coach: Coach,
  options: Partial<ProgressionOptions> = {}
): ProgressionResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get scheme fit level
  const schemeFitLevel = getPlayerSchemeFit(player, coach);

  // Calculate chemistry
  const chemistry = calculatePlayerCoachChemistry(
    coach,
    player,
    schemeFitLevel,
    opts.yearsTogether,
    opts.recentSuccess
  );

  // Calculate development impact from coach evaluation system
  const impact = calculateDevelopmentImpact(coach, player, chemistry.chemistry, schemeFitLevel);

  // Apply motivation modifier
  const motivationMod = getMotivationModifier(coach);

  // Apply age modifier if enabled
  const ageMod = opts.applyAgeModifier ? getAgeModifier(player.age) : 1.0;

  // Calculate final adjusted impact
  const adjustedImpact = Math.round(impact.totalImpact * motivationMod * ageMod);

  // Generate skill changes based on impact areas
  const skillChanges: Record<string, number> = {};
  if (impact.impactAreas.length > 0 && adjustedImpact !== 0) {
    // Distribute impact across affected skills
    const changePerSkill = Math.max(1, Math.round(Math.abs(adjustedImpact) / impact.impactAreas.length));
    const sign = adjustedImpact >= 0 ? 1 : -1;

    for (const skill of impact.impactAreas) {
      skillChanges[skill] = changePerSkill * sign;
    }
  }

  // Determine influence level
  let coachInfluence: ProgressionResult['coachInfluence'];
  if (adjustedImpact >= 5) {
    coachInfluence = 'significant';
  } else if (adjustedImpact >= 2) {
    coachInfluence = 'moderate';
  } else if (adjustedImpact >= 0) {
    coachInfluence = 'minimal';
  } else {
    coachInfluence = 'negative';
  }

  // Generate description
  const developmentDescription = generateDevelopmentDescription(
    player,
    adjustedImpact,
    impact.impactAreas
  );

  return {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    skillChanges,
    totalChange: adjustedImpact,
    coachInfluence,
    developmentDescription,
  };
}

/**
 * Generates a human-readable description of development
 */
function generateDevelopmentDescription(
  player: Player,
  totalChange: number,
  impactAreas: string[]
): string {
  const name = `${player.firstName} ${player.lastName}`;

  if (impactAreas.length === 0) {
    return `${name} maintained his current skill level.`;
  }

  const areaList =
    impactAreas.length === 1
      ? impactAreas[0]
      : `${impactAreas.slice(0, -1).join(', ')} and ${impactAreas[impactAreas.length - 1]}`;

  if (totalChange >= 7) {
    return `${name} made exceptional strides in ${areaList}.`;
  } else if (totalChange >= 4) {
    return `${name} showed significant improvement in ${areaList}.`;
  } else if (totalChange >= 2) {
    return `${name} developed steadily in ${areaList}.`;
  } else if (totalChange >= 0) {
    return `${name} made modest gains in ${areaList}.`;
  } else if (totalChange >= -3) {
    return `${name} struggled to develop in ${areaList}.`;
  } else {
    return `${name} regressed in ${areaList} under current coaching.`;
  }
}

/**
 * Applies skill changes to a player (immutably)
 * Updates trueValue and optionally narrows perceived range
 */
export function applySkillChanges(player: Player, result: ProgressionResult): Player {
  if (Object.keys(result.skillChanges).length === 0) {
    return player;
  }

  // Deep clone skills
  const newSkills: TechnicalSkills = {};

  for (const [skillName, skillValue] of Object.entries(player.skills)) {
    const change = result.skillChanges[skillName] ?? 0;

    if (change === 0) {
      newSkills[skillName] = { ...skillValue };
    } else {
      const newTrueValue = Math.max(1, Math.min(99, skillValue.trueValue + change));

      // Narrow perceived range slightly when skill changes
      // This simulates scouts getting better read on the player
      const rangeShrink = Math.abs(change) > 2 ? 2 : 1;
      const newPerceivedMin = Math.min(
        skillValue.perceivedMin + rangeShrink,
        newTrueValue
      );
      const newPerceivedMax = Math.max(
        skillValue.perceivedMax - rangeShrink,
        newTrueValue
      );

      newSkills[skillName] = {
        trueValue: newTrueValue,
        perceivedMin: Math.max(1, newPerceivedMin),
        perceivedMax: Math.min(99, newPerceivedMax),
        maturityAge: skillValue.maturityAge,
      };
    }
  }

  return {
    ...player,
    skills: newSkills,
  };
}

/**
 * Processes progression for an entire team roster
 */
export function processTeamProgression(
  players: Player[],
  coach: Coach,
  options: Partial<ProgressionOptions> = {}
): {
  updatedPlayers: Player[];
  results: ProgressionResult[];
  notableImprovements: ProgressionResult[];
} {
  const results: ProgressionResult[] = [];
  const updatedPlayers: Player[] = [];
  const notableImprovements: ProgressionResult[] = [];

  for (const player of players) {
    const result = applyOffseasonProgression(player, coach, options);
    results.push(result);

    const updatedPlayer = applySkillChanges(player, result);
    updatedPlayers.push(updatedPlayer);

    // Track notable improvements for news generation
    if (result.totalChange >= 3) {
      notableImprovements.push(result);
    }
  }

  return {
    updatedPlayers,
    results,
    notableImprovements,
  };
}

/**
 * Development news item for display
 */
export interface DevelopmentNewsItem {
  playerId: string;
  playerName: string;
  headline: string;
  body: string;
  isPositive: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Headlines for significant development
 */
const SIGNIFICANT_HEADLINES = [
  '{playerName} Emerges as Camp Standout',
  '{playerName} Shows Impressive Growth',
  'Coaches Impressed with {playerName}',
  '{playerName} Making Big Strides',
  'Breakout Potential: {playerName}',
];

/**
 * Headlines for moderate development
 */
const MODERATE_HEADLINES = [
  '{playerName} Showing Improvement',
  '{playerName} Progressing Nicely',
  'Steady Growth for {playerName}',
  '{playerName} Developing Well',
];

/**
 * Headlines for negative development
 */
const NEGATIVE_HEADLINES = [
  '{playerName} Struggling in Development',
  'Concerns About {playerName} Progress',
  '{playerName} Regression Worries Coaches',
];

/**
 * Generates news items for notable progression results
 */
export function generateDevelopmentNews(
  results: ProgressionResult[],
  coachName: string
): DevelopmentNewsItem[] {
  const newsItems: DevelopmentNewsItem[] = [];

  for (const result of results) {
    // Only generate news for significant changes
    if (Math.abs(result.totalChange) < 3) continue;

    let headline: string;
    let body: string;
    let isPositive: boolean;
    let priority: 'high' | 'medium' | 'low';

    if (result.totalChange >= 5) {
      // Significant positive development
      const headlineTemplate = SIGNIFICANT_HEADLINES[
        Math.floor(Math.random() * SIGNIFICANT_HEADLINES.length)
      ];
      headline = headlineTemplate.replace('{playerName}', result.playerName);
      body = `${result.playerName} has been one of the standouts this offseason. ` +
        `Under ${coachName}'s guidance, ${result.developmentDescription}`;
      isPositive = true;
      priority = 'high';
    } else if (result.totalChange >= 3) {
      // Moderate positive development
      const headlineTemplate = MODERATE_HEADLINES[
        Math.floor(Math.random() * MODERATE_HEADLINES.length)
      ];
      headline = headlineTemplate.replace('{playerName}', result.playerName);
      body = `${result.playerName} is making progress this offseason. ${result.developmentDescription}`;
      isPositive = true;
      priority = 'medium';
    } else {
      // Negative development
      const headlineTemplate = NEGATIVE_HEADLINES[
        Math.floor(Math.random() * NEGATIVE_HEADLINES.length)
      ];
      headline = headlineTemplate.replace('{playerName}', result.playerName);
      body = `There are concerns about ${result.playerName}'s development. ${result.developmentDescription}`;
      isPositive = false;
      priority = 'medium';
    }

    newsItems.push({
      playerId: result.playerId,
      playerName: result.playerName,
      headline,
      body,
      isPositive,
      priority,
    });
  }

  return newsItems;
}
