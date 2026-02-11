/**
 * Training Camp Phase (Phase 9)
 * Handles position battles, development reveals, and roster evaluation
 */

import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';
import { Player, getPlayerFullName } from '../../models/player/Player';
import { Coach } from '../../models/staff/Coach';
import { processTeamProgression, ProgressionResult } from '../../career/PlayerProgression';
import type { OTADecision, CrossPhaseStoryline } from '../OffseasonPersistentData';

/**
 * Position battle status
 */
export interface PositionBattle {
  battleId: string;
  position: string;
  spotType: 'starter' | 'backup' | 'depth';
  competitors: PositionBattleCompetitor[];
  status: 'ongoing' | 'decided' | 'too_close';
  winner: string | null;
  campWeek: number;
  updates: string[];
}

/**
 * Position battle competitor
 */
export interface PositionBattleCompetitor {
  playerId: string;
  playerName: string;
  currentScore: number; // 1-100
  trend: 'rising' | 'steady' | 'falling';
  highlights: string[];
  concerns: string[];
  practiceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Development reveal during camp
 */
export interface DevelopmentReveal {
  playerId: string;
  playerName: string;
  position: string;
  revealType: 'trait' | 'skill_jump' | 'decline' | 'injury_concern' | 'intangible';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  details: Record<string, unknown>;
}

/**
 * Camp injury report
 */
export interface CampInjury {
  playerId: string;
  playerName: string;
  position: string;
  injuryType: string;
  severity: 'minor' | 'moderate' | 'serious' | 'season_ending';
  estimatedReturn: string;
  practiceStatus: 'full' | 'limited' | 'out';
}

/**
 * Training camp summary
 */
export interface TrainingCampSummary {
  year: number;
  totalDays: number;
  positionBattles: PositionBattle[];
  developmentReveals: DevelopmentReveal[];
  injuries: CampInjury[];
  standouts: string[];
  disappointments: string[];
  rosterBubblePlayers: string[];
}

/**
 * Updates a position battle
 */
export function updatePositionBattle(
  battle: PositionBattle,
  competitorUpdates: Array<{
    playerId: string;
    scoreChange: number;
    highlight?: string;
    concern?: string;
  }>
): PositionBattle {
  const updatedCompetitors = battle.competitors.map((c) => {
    const update = competitorUpdates.find((u) => u.playerId === c.playerId);
    if (!update) return c;

    const newScore = Math.min(100, Math.max(0, c.currentScore + update.scoreChange));
    const trend: 'rising' | 'steady' | 'falling' =
      update.scoreChange > 3 ? 'rising' : update.scoreChange < -3 ? 'falling' : 'steady';

    const highlights = update.highlight ? [...c.highlights, update.highlight] : c.highlights;
    const concerns = update.concern ? [...c.concerns, update.concern] : c.concerns;

    // Calculate practice grade
    let practiceGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (newScore >= 85) practiceGrade = 'A';
    else if (newScore >= 75) practiceGrade = 'B';
    else if (newScore >= 60) practiceGrade = 'C';
    else if (newScore >= 45) practiceGrade = 'D';
    else practiceGrade = 'F';

    return {
      ...c,
      currentScore: newScore,
      trend,
      highlights,
      concerns,
      practiceGrade,
    };
  });

  // Check if battle is decided
  const sortedCompetitors = [...updatedCompetitors].sort((a, b) => b.currentScore - a.currentScore);
  const leader = sortedCompetitors[0];
  const second = sortedCompetitors[1];

  let status = battle.status;
  let winner = battle.winner;

  if (leader && second) {
    const gap = leader.currentScore - second.currentScore;
    if (gap >= 15) {
      status = 'decided';
      winner = leader.playerId;
    } else if (gap <= 5) {
      status = 'too_close';
    }
  }

  return {
    ...battle,
    competitors: updatedCompetitors,
    status,
    winner,
    campWeek: battle.campWeek + 1,
  };
}

/**
 * Creates a position battle
 */
export function createPositionBattle(
  position: string,
  spotType: 'starter' | 'backup' | 'depth',
  competitors: Array<{ playerId: string; playerName: string; initialRating: number }>
): PositionBattle {
  return {
    battleId: `battle-${position}-${spotType}-${Date.now()}`,
    position,
    spotType,
    competitors: competitors.map((c) => ({
      playerId: c.playerId,
      playerName: c.playerName,
      currentScore: c.initialRating,
      trend: 'steady',
      highlights: [],
      concerns: [],
      practiceGrade: 'C',
    })),
    status: 'ongoing',
    winner: null,
    campWeek: 1,
    updates: [],
  };
}

/**
 * Generates a development reveal
 */
export function generateDevelopmentReveal(
  playerId: string,
  playerName: string,
  position: string,
  age: number,
  experience: number
): DevelopmentReveal | null {
  // Random chance of development reveal
  if (Math.random() > 0.15) return null;

  const revealTypes = [
    { type: 'trait', weight: 0.3 },
    { type: 'skill_jump', weight: 0.25 },
    { type: 'decline', weight: 0.15 },
    { type: 'injury_concern', weight: 0.15 },
    { type: 'intangible', weight: 0.15 },
  ] as const;

  // Weight based on age/experience
  let typeSelection: 'trait' | 'skill_jump' | 'decline' | 'injury_concern' | 'intangible' = 'trait';
  const roll = Math.random();

  if (age >= 30 && roll < 0.4) {
    typeSelection = roll < 0.2 ? 'decline' : 'injury_concern';
  } else if (experience <= 2 && roll < 0.5) {
    typeSelection = roll < 0.25 ? 'skill_jump' : 'trait';
  } else {
    let cumulative = 0;
    for (const rt of revealTypes) {
      cumulative += rt.weight;
      if (roll < cumulative) {
        typeSelection = rt.type;
        break;
      }
    }
  }

  const descriptions: Record<typeof typeSelection, { positive: string[]; negative: string[] }> = {
    trait: {
      positive: [
        'Showing exceptional leadership in the huddle',
        'Film study habits are elite level',
        'Natural clutch performer emerging',
      ],
      negative: [
        'Struggles with complex playbook sections',
        'Shows frustration when corrected',
        'Tendency to take plays off in practice',
      ],
    },
    skill_jump: {
      positive: [
        'Made significant improvements to technique',
        'Speed measurably faster this year',
        'Strength gains noticeable on the field',
      ],
      negative: [
        'Regression in key skill areas observed',
        'Lost a step compared to last year',
        'Technique has slipped',
      ],
    },
    decline: {
      positive: [],
      negative: [
        'Age-related decline becoming apparent',
        'Recovery between practices taking longer',
        'Not the same burst as previous seasons',
      ],
    },
    injury_concern: {
      positive: [],
      negative: [
        'Nagging injury limiting practice reps',
        'Durability concerns emerging',
        'Managing an undisclosed issue',
      ],
    },
    intangible: {
      positive: [
        'Becoming a vocal leader in the locker room',
        'Mentoring young players effectively',
        'Exceptional work ethic setting the tone',
      ],
      negative: [
        'Chemistry issues with teammates',
        'Struggles to motivate himself in practice',
        'Not meshing well with coaching staff',
      ],
    },
  };

  const isPositive =
    typeSelection === 'decline' || typeSelection === 'injury_concern' ? false : Math.random() < 0.6;
  const options = isPositive
    ? descriptions[typeSelection].positive
    : descriptions[typeSelection].negative;

  if (options.length === 0) return null;

  const description = options[Math.floor(Math.random() * options.length)];

  return {
    playerId,
    playerName,
    position,
    revealType: typeSelection,
    description,
    impact: isPositive ? 'positive' : 'negative',
    details: { age, experience },
  };
}

/**
 * Generates camp injury
 */
export function generateCampInjury(
  playerId: string,
  playerName: string,
  position: string,
  injuryProne: boolean = false
): CampInjury | null {
  // Base injury chance
  let injuryChance = 0.03;
  if (injuryProne) injuryChance = 0.08;

  if (Math.random() > injuryChance) return null;

  const injuryTypes = [
    { type: 'Hamstring strain', severity: 'minor' as const, return: '1-2 weeks' },
    { type: 'Soft tissue injury', severity: 'minor' as const, return: '1 week' },
    { type: 'Ankle sprain', severity: 'moderate' as const, return: '2-4 weeks' },
    { type: 'Knee injury', severity: 'moderate' as const, return: '3-6 weeks' },
    { type: 'Shoulder injury', severity: 'moderate' as const, return: '4-6 weeks' },
    { type: 'ACL tear', severity: 'season_ending' as const, return: 'Season' },
    { type: 'Achilles rupture', severity: 'season_ending' as const, return: 'Season' },
  ];

  // Weight towards minor injuries
  const weights = [0.25, 0.25, 0.2, 0.1, 0.1, 0.05, 0.05];
  const roll = Math.random();
  let cumulative = 0;
  let selected = injuryTypes[0];

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      selected = injuryTypes[i];
      break;
    }
  }

  const practiceStatus: 'full' | 'limited' | 'out' =
    selected.severity === 'minor' ? 'limited' : 'out';

  return {
    playerId,
    playerName,
    position,
    injuryType: selected.type,
    severity: selected.severity,
    estimatedReturn: selected.return,
    practiceStatus,
  };
}

/**
 * Processes training camp phase
 */
export function processTrainingCamp(
  state: OffSeasonState,
  battles: PositionBattle[],
  reveals: DevelopmentReveal[],
  injuries: CampInjury[]
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_start',
    `Training Camp begins: ${battles.length} position battles to watch`,
    { battles: battles.length, reveals: reveals.length, injuries: injuries.length }
  );

  // Add development reveal events
  for (const reveal of reveals) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${reveal.playerName}: ${reveal.description}`,
      { reveal }
    );
  }

  // Add injury events
  for (const injury of injuries.filter((i) => i.severity !== 'minor')) {
    newState = addEvent(
      newState,
      'injury',
      `${injury.playerName} (${injury.position}): ${injury.injuryType} - ${injury.estimatedReturn}`,
      { injury }
    );
  }

  newState = completeTask(newState, 'view_battles');

  return newState;
}

/**
 * Gets training camp summary
 */
export function getTrainingCampSummary(
  battles: PositionBattle[],
  reveals: DevelopmentReveal[],
  injuries: CampInjury[]
): TrainingCampSummary {
  const standouts = reveals.filter((r) => r.impact === 'positive').map((r) => r.playerName);
  const disappointments = reveals.filter((r) => r.impact === 'negative').map((r) => r.playerName);
  const rosterBubble = battles
    .filter((b) => b.spotType === 'depth' && b.status === 'too_close')
    .flatMap((b) => b.competitors.map((c) => c.playerName));

  return {
    year: new Date().getFullYear(),
    totalDays: 28,
    positionBattles: battles,
    developmentReveals: reveals,
    injuries,
    standouts,
    disappointments,
    rosterBubblePlayers: rosterBubble,
  };
}

/**
 * Gets position battle text
 */
export function getPositionBattleText(battle: PositionBattle): string {
  const sortedCompetitors = [...battle.competitors].sort((a, b) => b.currentScore - a.currentScore);

  return `${battle.position} - ${battle.spotType.toUpperCase()} Battle
Status: ${battle.status.replace('_', ' ').toUpperCase()}
${battle.winner ? `Winner: ${battle.competitors.find((c) => c.playerId === battle.winner)?.playerName}` : ''}

Competitors:
${sortedCompetitors
  .map(
    (c, i) => `${i + 1}. ${c.playerName} - ${c.currentScore} (${c.trend}) Grade: ${c.practiceGrade}`
  )
  .join('\n')}`;
}

/**
 * Gets camp injury report text
 */
export function getCampInjuryReportText(injuries: CampInjury[]): string {
  if (injuries.length === 0) return 'No significant injuries to report.';

  return `Training Camp Injury Report

${injuries
  .map(
    (i) =>
      `${i.playerName} (${i.position})
  ${i.injuryType} - ${i.severity}
  Return: ${i.estimatedReturn}
  Status: ${i.practiceStatus}`
  )
  .join('\n\n')}`;
}

/**
 * Training camp progression result
 */
export interface TrainingCampProgressionResult {
  updatedPlayers: Player[];
  progressionResults: ProgressionResult[];
  notableImprovements: ProgressionResult[];
  developmentNews: string[];
}

/**
 * Processes player development during training camp
 * This applies coach-influenced skill progression to all roster players
 */
export function processTrainingCampProgression(
  players: Player[],
  headCoach: Coach,
  options: {
    recentSuccess?: boolean;
    yearsTogether?: number;
  } = {}
): TrainingCampProgressionResult {
  const { updatedPlayers, results, notableImprovements } = processTeamProgression(
    players,
    headCoach,
    {
      yearsTogether: options.yearsTogether ?? 1,
      recentSuccess: options.recentSuccess ?? false,
      applyAgeModifier: true,
    }
  );

  // Generate development news for notable improvements
  const developmentNews: string[] = notableImprovements.map((result) => {
    if (result.totalChange >= 5) {
      return `${result.playerName} has emerged as a standout in training camp, showing remarkable improvement.`;
    } else {
      return `${result.playerName} has been impressive in camp with noticeable skill development.`;
    }
  });

  return {
    updatedPlayers,
    progressionResults: results,
    notableImprovements,
    developmentNews,
  };
}

/**
 * Helper to compute a rough overall skill average for a player
 */
function getAverageSkill(player: Player): number {
  const skillKeys = Object.keys(player.skills);
  if (skillKeys.length === 0) return 50;
  const sum = skillKeys.reduce((acc, key) => acc + player.skills[key].trueValue, 0);
  return sum / skillKeys.length;
}

/**
 * Result of applying OTA outcomes to training camp
 */
export interface OTAOutcomeResult {
  updatedPlayers: Player[];
  resolvedStorylines: CrossPhaseStoryline[];
  campNotes: string[];
}

/**
 * Applies OTA decisions and cross-phase storylines to training camp.
 * Modifies player skills and fatigue based on user choices, and advances storylines.
 */
export function applyOTAOutcomes(
  players: Player[],
  otaDecisions: OTADecision[],
  storylines: CrossPhaseStoryline[]
): OTAOutcomeResult {
  const campNotes: string[] = [];
  let updatedPlayers = [...players];

  // Apply each OTA decision
  for (const decision of otaDecisions) {
    if (decision.choice === null) continue;

    const playerIndex = updatedPlayers.findIndex((p) => p.id === decision.playerId);
    if (playerIndex === -1) continue;
    const player = updatedPlayers[playerIndex];

    if (decision.decisionType === 'rest_or_push') {
      if (decision.choice === 'push') {
        // Push: +1 to +2 in scheme-relevant skills, but +15% injury risk
        const skillKeys = Object.keys(player.skills);
        const boost = 1 + Math.floor(Math.random() * 2); // 1 or 2
        const updatedSkills = { ...player.skills };

        // Boost 1-2 random skills
        const skillsToBoost = skillKeys.slice(0, Math.min(2, skillKeys.length));
        for (const skillName of skillsToBoost) {
          const skill = updatedSkills[skillName];
          updatedSkills[skillName] = {
            ...skill,
            trueValue: Math.min(100, skill.trueValue + boost),
          };
        }

        updatedPlayers[playerIndex] = {
          ...player,
          skills: updatedSkills,
          // Fatigue slightly elevated from being pushed
          fatigue: Math.min(100, player.fatigue + 15),
        };

        campNotes.push(
          `${getPlayerFullName(player)} was pushed hard in OTAs and arrived at camp with improved scheme grasp (+${boost}), but is carrying extra fatigue.`
        );
      } else if (decision.choice === 'rest') {
        // Rest: fatigue = 0 but -1 to first scheme skill
        const skillKeys = Object.keys(player.skills);
        const updatedSkills = { ...player.skills };

        if (skillKeys.length > 0) {
          const firstSkill = skillKeys[0];
          const skill = updatedSkills[firstSkill];
          updatedSkills[firstSkill] = {
            ...skill,
            trueValue: Math.max(1, skill.trueValue - 1),
          };
        }

        updatedPlayers[playerIndex] = {
          ...player,
          skills: updatedSkills,
          fatigue: 0,
        };

        campNotes.push(
          `${getPlayerFullName(player)} rested during OTAs and arrives at camp fresh, but is a step behind in the playbook.`
        );
      }
    } else if (decision.decisionType === 'assign_mentor' && decision.choice === 'mentor_assigned') {
      // Mentor: rookie gets +2 to +3 in 1-2 skills; mentor gets +1 leadership
      const rookieIndex = playerIndex;
      const rookie = updatedPlayers[rookieIndex];
      const mentorIndex = decision.mentorPlayerId
        ? updatedPlayers.findIndex((p) => p.id === decision.mentorPlayerId)
        : -1;

      // Boost rookie skills
      const rookieSkillKeys = Object.keys(rookie.skills);
      const rookieBoost = 2 + Math.floor(Math.random() * 2); // 2 or 3
      const updatedRookieSkills = { ...rookie.skills };
      const skillsToBoost = rookieSkillKeys.slice(0, Math.min(2, rookieSkillKeys.length));

      for (const skillName of skillsToBoost) {
        const skill = updatedRookieSkills[skillName];
        updatedRookieSkills[skillName] = {
          ...skill,
          trueValue: Math.min(100, skill.trueValue + rookieBoost),
        };
      }

      updatedPlayers[rookieIndex] = {
        ...rookie,
        skills: updatedRookieSkills,
      };

      campNotes.push(
        `${getPlayerFullName(rookie)} benefited from the mentorship program, gaining +${rookieBoost} in key skills.`
      );

      // Boost mentor's leadership if they have it
      if (mentorIndex !== -1) {
        const mentor = updatedPlayers[mentorIndex];
        const mentorSkills = { ...mentor.skills };

        if (mentorSkills['leadership']) {
          mentorSkills['leadership'] = {
            ...mentorSkills['leadership'],
            trueValue: Math.min(100, mentorSkills['leadership'].trueValue + 1),
          };
        }

        updatedPlayers[mentorIndex] = {
          ...mentor,
          skills: mentorSkills,
          morale: Math.min(100, mentor.morale + 5),
        };

        campNotes.push(
          `${getPlayerFullName(mentor)} embraced the mentor role and grew as a leader.`
        );
      }
    }
  }

  // Update storylines based on camp developments
  const resolvedStorylines: CrossPhaseStoryline[] = storylines.map((storyline) => {
    if (storyline.isResolved) return storyline;

    if (storyline.type === 'rookie_emergence') {
      const rookie = updatedPlayers.find((p) => p.id === storyline.playerIds[0]);
      if (!rookie) return storyline;

      const avgSkill = getAverageSkill(rookie);
      if (avgSkill >= 70) {
        campNotes.push(
          `${getPlayerFullName(rookie)} is living up to the hype and pushing for the starting job.`
        );
        return {
          ...storyline,
          currentNarrative: `${getPlayerFullName(rookie)} has been dominant in camp. The starting job is within reach.`,
        };
      } else {
        campNotes.push(`${getPlayerFullName(rookie)} is showing promise but still has work to do.`);
        return {
          ...storyline,
          currentNarrative: `${getPlayerFullName(rookie)} has flashed potential in camp but needs more consistency.`,
        };
      }
    }

    if (storyline.type === 'veteran_decline') {
      const veteran = updatedPlayers.find((p) => p.id === storyline.playerIds[0]);
      if (!veteran) return storyline;

      const avgSkill = getAverageSkill(veteran);
      if (avgSkill < 55) {
        campNotes.push(
          `${getPlayerFullName(veteran)}'s struggles continued through camp. His roster spot is in jeopardy.`
        );
        return {
          ...storyline,
          currentNarrative: `${getPlayerFullName(veteran)} has not improved in camp. The writing may be on the wall.`,
          isResolved: true,
          resolution: `${getPlayerFullName(veteran)} could not reverse the decline and faces an uncertain future.`,
        };
      } else {
        campNotes.push(
          `${getPlayerFullName(veteran)} showed some fight in camp, quieting doubters for now.`
        );
        return {
          ...storyline,
          currentNarrative: `${getPlayerFullName(veteran)} responded well in camp, buying himself more time.`,
        };
      }
    }

    if (storyline.type === 'position_battle') {
      const player1 = updatedPlayers.find((p) => p.id === storyline.playerIds[0]);
      const player2 = updatedPlayers.find((p) => p.id === storyline.playerIds[1]);
      if (!player1 || !player2) return storyline;

      const gap = Math.abs(getAverageSkill(player1) - getAverageSkill(player2));
      if (gap > 8) {
        const winner = getAverageSkill(player1) > getAverageSkill(player2) ? player1 : player2;
        campNotes.push(
          `${getPlayerFullName(winner)} separated himself in the position battle at ${winner.position}.`
        );
        return {
          ...storyline,
          currentNarrative: `${getPlayerFullName(winner)} has emerged as the clear starter.`,
          isResolved: true,
          resolution: `${getPlayerFullName(winner)} won the starting job at ${winner.position}.`,
        };
      } else {
        campNotes.push(
          `The ${player1.position} battle between ${getPlayerFullName(player1)} and ${getPlayerFullName(player2)} remains too close to call.`
        );
        return {
          ...storyline,
          currentNarrative: `The battle at ${player1.position} rages on. Neither player has been able to pull away.`,
        };
      }
    }

    return storyline;
  });

  return {
    updatedPlayers,
    resolvedStorylines,
    campNotes,
  };
}
