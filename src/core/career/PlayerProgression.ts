/**
 * Player Progression System
 * Applies coach-influenced development to players during offseason.
 * Integrates with CoachEvaluationSystem to make coaching staff matter.
 */

import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { TechnicalSkills, SKILL_NAMES_BY_POSITION } from '../models/player/TechnicalSkills';
import { Position } from '../models/player/Position';
import { FitLevel } from '../models/player/SchemeFit';
import {
  calculateDevelopmentImpact,
  calculatePlayerCoachChemistry,
  getMotivationModifier,
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
    const changePerSkill = Math.max(
      1,
      Math.round(Math.abs(adjustedImpact) / impact.impactAreas.length)
    );
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
      const newPerceivedMin = Math.min(skillValue.perceivedMin + rangeShrink, newTrueValue);
      const newPerceivedMax = Math.max(skillValue.perceivedMax - rangeShrink, newTrueValue);

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
      const headlineTemplate =
        SIGNIFICANT_HEADLINES[Math.floor(Math.random() * SIGNIFICANT_HEADLINES.length)];
      headline = headlineTemplate.replace('{playerName}', result.playerName);
      body =
        `${result.playerName} has been one of the standouts this offseason. ` +
        `Under ${coachName}'s guidance, ${result.developmentDescription}`;
      isPositive = true;
      priority = 'high';
    } else if (result.totalChange >= 3) {
      // Moderate positive development
      const headlineTemplate =
        MODERATE_HEADLINES[Math.floor(Math.random() * MODERATE_HEADLINES.length)];
      headline = headlineTemplate.replace('{playerName}', result.playerName);
      body = `${result.playerName} is making progress this offseason. ${result.developmentDescription}`;
      isPositive = true;
      priority = 'medium';
    } else {
      // Negative development
      const headlineTemplate =
        NEGATIVE_HEADLINES[Math.floor(Math.random() * NEGATIVE_HEADLINES.length)];
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

// ============================================================
// Mid-Season Progression & Breakout Mechanic
// ============================================================

/**
 * Result of applying mid-season progression to a player after a game
 */
export interface MidSeasonProgressionResult {
  updatedPlayer: Player;
  skillChanges: Array<{ skill: string; change: number }>;
  description: string;
  isBreakout: boolean;
  breakoutDescription?: string;
}

/**
 * Returns position-relevant skill names for mid-season progression.
 * Maps individual positions to SKILL_NAMES_BY_POSITION groups.
 */
function getPositionRelevantSkills(position: Position): readonly string[] {
  switch (position) {
    case Position.QB:
      return SKILL_NAMES_BY_POSITION.QB;
    case Position.RB:
      return SKILL_NAMES_BY_POSITION.RB;
    case Position.WR:
      return SKILL_NAMES_BY_POSITION.WR;
    case Position.TE:
      return SKILL_NAMES_BY_POSITION.TE;
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return SKILL_NAMES_BY_POSITION.OL;
    case Position.DE:
    case Position.DT:
      return SKILL_NAMES_BY_POSITION.DL;
    case Position.OLB:
    case Position.ILB:
      return SKILL_NAMES_BY_POSITION.LB;
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return SKILL_NAMES_BY_POSITION.DB;
    case Position.K:
      return SKILL_NAMES_BY_POSITION.K;
    case Position.P:
      return SKILL_NAMES_BY_POSITION.P;
    default:
      return [];
  }
}

/**
 * Gets the mid-season age modifier.
 * Young players develop faster, older players slower.
 */
function getMidSeasonAgeModifier(age: number): number {
  if (age <= 24) return 1.3;
  if (age <= 28) return 1.0;
  return 0.7;
}

/**
 * Gets a coach development quality bonus (0 to 0.3) based on coach development attribute.
 */
function getCoachDevelopmentBonus(coach: Coach | null): number {
  if (!coach) return 0;
  // coach.attributes.development is 1-100; scale to 0-0.3
  return (coach.attributes.development / 100) * 0.3;
}

/**
 * Simple seeded-ish random helper to get a random number in a range.
 * Uses Math.random — determinism is not required here.
 */
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Picks N random items from an array (without replacement).
 */
function pickRandom<T>(arr: readonly T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Applies mid-season progression to a player after a game.
 *
 * - Standout games (score >= 85) can boost 1-2 skills
 * - Poor games (score <= 25) can cause regression (not implemented as consecutive tracking
 *   would require external state — instead a single poor game has a small negative effect)
 * - Breakout mechanic for young players: builds breakoutMeter on standout games,
 *   triggers a large skill boost when the meter hits 100
 *
 * @param player - The player to progress (immutable — returns new object)
 * @param gamePerformanceScore - 0-100 score derived from game stats by caller
 * @param coach - The player's position coach or head coach (nullable)
 * @param currentWeek - Current week number (unused currently, reserved for future use)
 */
export function applyMidSeasonProgression(
  player: Player,
  gamePerformanceScore: number,
  coach: Coach | null,
  _currentWeek: number
): MidSeasonProgressionResult {
  const skillChanges: Array<{ skill: string; change: number }> = [];
  let description = '';
  let isBreakout = false;
  let breakoutDescription: string | undefined;

  // Start with current mid-season tracking values
  let breakoutMeter = player.breakoutMeter ?? 0;
  const hasHadBreakout = player.hasHadBreakout ?? false;
  let midSeasonDevTotal = player.midSeasonDevTotal ?? 0;

  // Clone skills for mutation
  const newSkills: TechnicalSkills = {};
  for (const [skillName, skillValue] of Object.entries(player.skills)) {
    newSkills[skillName] = { ...skillValue };
  }

  const relevantSkills = getPositionRelevantSkills(player.position);
  // Filter to skills the player actually has
  const applicableSkills = relevantSkills.filter((s) => newSkills[s] !== undefined);

  const ageMod = getMidSeasonAgeModifier(player.age);
  const coachBonus = getCoachDevelopmentBonus(coach);

  // ---- Performance-based skill changes ----
  if (
    gamePerformanceScore >= 85 &&
    Math.abs(midSeasonDevTotal) < 3 &&
    applicableSkills.length > 0
  ) {
    // Standout game: +0.5 to +1.5 to 1-2 relevant skills
    const numSkills = Math.min(applicableSkills.length, Math.random() < 0.5 ? 1 : 2);
    const chosen = pickRandom(applicableSkills, numSkills);

    for (const skillName of chosen) {
      const baseChange = randomInRange(0.5, 1.5);
      const adjustedChange = Math.round((baseChange * ageMod + coachBonus) * 10) / 10;
      // Clamp so we don't exceed the mid-season cap
      const remainingBudget = 3 - Math.abs(midSeasonDevTotal);
      const finalChange = Math.min(adjustedChange, remainingBudget);

      if (finalChange > 0) {
        const skill = newSkills[skillName];
        skill.trueValue = Math.max(1, Math.min(99, Math.round(skill.trueValue + finalChange)));
        midSeasonDevTotal += finalChange;
        skillChanges.push({ skill: skillName, change: Math.round(finalChange * 10) / 10 });
      }
    }

    if (skillChanges.length > 0) {
      const skillList = skillChanges.map((sc) => sc.skill).join(', ');
      description = `${player.firstName} ${player.lastName} showed improvement in ${skillList} after a standout performance.`;
    } else {
      description = `${player.firstName} ${player.lastName} had a standout game but has reached the mid-season development cap.`;
    }
  } else if (
    gamePerformanceScore <= 25 &&
    Math.abs(midSeasonDevTotal) < 3 &&
    applicableSkills.length > 0
  ) {
    // Poor game: small regression to 1 skill
    const chosen = pickRandom(applicableSkills, 1);
    const skillName = chosen[0];
    const baseChange = randomInRange(0.3, 0.8);
    const adjustedChange = Math.round(baseChange * ageMod * 10) / 10;
    const remainingBudget = 3 - Math.abs(midSeasonDevTotal);
    const finalChange = Math.min(adjustedChange, remainingBudget);

    if (finalChange > 0) {
      const skill = newSkills[skillName];
      skill.trueValue = Math.max(1, Math.min(99, Math.round(skill.trueValue - finalChange)));
      midSeasonDevTotal -= finalChange;
      skillChanges.push({ skill: skillName, change: -Math.round(finalChange * 10) / 10 });
    }

    description = `${player.firstName} ${player.lastName} struggled, showing some regression in ${chosen[0]}.`;
  } else {
    // Normal game (26-84) or capped — no skill change
    description = `${player.firstName} ${player.lastName} had a standard game with no notable development changes.`;
  }

  // ---- Breakout mechanic ----
  if (player.age <= 25 && !hasHadBreakout) {
    if (gamePerformanceScore >= 85) {
      breakoutMeter += Math.round(randomInRange(15, 25));
    } else if (gamePerformanceScore <= 25) {
      breakoutMeter -= Math.round(randomInRange(5, 10));
    }
    breakoutMeter = Math.max(0, breakoutMeter);

    if (breakoutMeter >= 100) {
      // BREAKOUT triggered
      isBreakout = true;
      const numBoostSkills = Math.min(applicableSkills.length, Math.random() < 0.4 ? 2 : 3);
      const boostSkills = pickRandom(applicableSkills, numBoostSkills);

      for (const skillName of boostSkills) {
        const boost = Math.round(randomInRange(3, 5));
        const skill = newSkills[skillName];
        skill.trueValue = Math.max(1, Math.min(99, skill.trueValue + boost));
        // Check if we already tracked this skill in skillChanges
        const existing = skillChanges.find((sc) => sc.skill === skillName);
        if (existing) {
          existing.change += boost;
        } else {
          skillChanges.push({ skill: skillName, change: boost });
        }
      }

      breakoutDescription = `BREAKOUT: ${player.firstName} ${player.lastName} is emerging as a force at ${player.position}`;
    }
  }

  // Build the updated player (immutable)
  const updatedPlayer: Player = {
    ...player,
    skills: newSkills,
    breakoutMeter,
    hasHadBreakout: hasHadBreakout || isBreakout,
    midSeasonDevTotal: Math.round(midSeasonDevTotal * 10) / 10,
  };

  return {
    updatedPlayer,
    skillChanges,
    description,
    isBreakout,
    breakoutDescription,
  };
}
