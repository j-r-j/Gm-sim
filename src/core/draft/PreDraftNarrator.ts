/**
 * Pre-Draft Narrator
 * Generates pre-draft news stories across combine, free agency,
 * and draft phases using prospect and combine data.
 */

import { Prospect } from './Prospect';
import { CombineResults, CombineGrade, MedicalGrade } from './CombineSimulator';
import { ProDayResults } from './ProDaySimulator';
import { StoryContext, replacePlaceholders } from '../news/StoryTemplates';
import { randomElement } from '../generators/utils/RandomUtils';
import {
  COMBINE_STANDOUT_TEMPLATES,
  STOCK_RISER_TEMPLATES,
  STOCK_FALLER_TEMPLATES,
  MEDICAL_FLAG_TEMPLATES,
  SLEEPER_ALERT_TEMPLATES,
  COACH_QUOTE_TEMPLATES,
  TEAM_INTEREST_TEMPLATES,
  COMPARISON_TEMPLATES,
  POSITION_SCARCITY_TEMPLATES,
  BUST_WARNING_TEMPLATES,
} from './PreDraftTemplates';

/**
 * A pre-draft news feed item
 */
export interface PreDraftNewsItem {
  id: string;
  category: 'draft';
  headline: string;
  body: string;
  priority: 'breaking' | 'high' | 'medium' | 'low';
  isPositive: boolean;
  timestamp: number;
  relatedProspectId?: string;
  relatedTeamId?: string;
}

let storyCounter = 0;

function nextStoryId(): string {
  storyCounter += 1;
  return `predraft-${Date.now()}-${storyCounter}`;
}

/**
 * NFL player comparisons by position group
 */
const POSITION_COMPARISONS: Record<string, string[]> = {
  QB: [
    'a young Patrick Mahomes',
    'a more athletic Tom Brady',
    'the next Josh Allen',
    'a pro-ready Justin Herbert',
    'Peyton Manning in his prime',
  ],
  RB: [
    'a young Adrian Peterson',
    'the next Derrick Henry',
    'a more explosive Saquon Barkley',
    'LaDainian Tomlinson 2.0',
    'the next Marshall Faulk',
  ],
  WR: [
    'a young Julio Jones',
    'the next Tyreek Hill',
    'a bigger Stefon Diggs',
    'Jerry Rice with more speed',
    'the next Randy Moss',
  ],
  TE: [
    'a young Travis Kelce',
    'the next Rob Gronkowski',
    'a more athletic George Kittle',
    'Tony Gonzalez reincarnated',
  ],
  OL: [
    'a young Joe Thomas',
    'the next Quenton Nelson',
    'a road-grading Zack Martin type',
    'a franchise left tackle in the mold of Tyron Smith',
  ],
  DL: [
    'a young Aaron Donald',
    'the next Myles Garrett',
    'a disruptive force like J.J. Watt',
    'a young Reggie White',
    'the next Warren Sapp',
  ],
  LB: [
    'a young Ray Lewis',
    'the next Luke Kuechly',
    'a sideline-to-sideline playmaker like Bobby Wagner',
    'a young Derrick Brooks',
  ],
  DB: [
    'a young Ed Reed',
    'the next Deion Sanders',
    'a ballhawk like Charles Woodson',
    'a young Darrelle Revis',
    'the next Jalen Ramsey',
  ],
  K: ['the next Justin Tucker', 'an Adam Vinatieri-like kicker'],
  P: ['the next Shane Lechler', 'a booming punter like Pat McAfee'],
};

/**
 * Coach quotes for various prospect types
 */
const POSITIVE_COACH_QUOTES: string[] = [
  'He is the hardest-working player I have ever coached.',
  'NFL teams are going to love this kid. He is a true professional.',
  'The best leader we have had in this program in 20 years.',
  'Every day in practice he made everyone around him better.',
  'I would draft him in a heartbeat if I was running an NFL team.',
  'He has it. Whatever that thing is that separates the great ones.',
  'He was the first one in the building every morning and the last one to leave.',
];

/**
 * Position group mapping for comparisons
 */
function getPositionGroup(position: string): string {
  const groups: Record<string, string> = {
    QB: 'QB',
    RB: 'RB',
    WR: 'WR',
    TE: 'TE',
    LT: 'OL',
    LG: 'OL',
    C: 'OL',
    RG: 'OL',
    RT: 'OL',
    DE: 'DL',
    DT: 'DL',
    OLB: 'LB',
    ILB: 'LB',
    CB: 'DB',
    FS: 'DB',
    SS: 'DB',
    K: 'K',
    P: 'P',
  };
  return groups[position] || 'DB';
}

/**
 * Finds prospects with exceptional combine performances
 */
function findCombineStandouts(
  prospects: Record<string, Prospect>,
  combineResults: Record<string, CombineResults>
): Array<{ prospect: Prospect; results: CombineResults }> {
  const standouts: Array<{ prospect: Prospect; results: CombineResults }> = [];

  for (const [id, results] of Object.entries(combineResults)) {
    if (
      results.overallGrade === CombineGrade.EXCEPTIONAL ||
      results.overallGrade === CombineGrade.ABOVE_AVERAGE
    ) {
      const prospect = prospects[id];
      if (prospect) {
        standouts.push({ prospect, results });
      }
    }
  }

  // Sort by grade (exceptional first), then by 40 time
  standouts.sort((a, b) => {
    if (
      a.results.overallGrade === CombineGrade.EXCEPTIONAL &&
      b.results.overallGrade !== CombineGrade.EXCEPTIONAL
    ) {
      return -1;
    }
    if (
      b.results.overallGrade === CombineGrade.EXCEPTIONAL &&
      a.results.overallGrade !== CombineGrade.EXCEPTIONAL
    ) {
      return 1;
    }
    const aForty = a.results.workoutResults?.fortyYardDash ?? 99;
    const bForty = b.results.workoutResults?.fortyYardDash ?? 99;
    return aForty - bForty;
  });

  return standouts;
}

/**
 * Finds prospects whose stock has moved based on combine results
 */
function findStockMovers(
  prospects: Record<string, Prospect>,
  combineResults: Record<string, CombineResults>
): {
  risers: Array<{ prospect: Prospect; results: CombineResults }>;
  fallers: Array<{ prospect: Prospect; results: CombineResults }>;
} {
  const risers: Array<{ prospect: Prospect; results: CombineResults }> = [];
  const fallers: Array<{ prospect: Prospect; results: CombineResults }> = [];

  for (const [id, results] of Object.entries(combineResults)) {
    const prospect = prospects[id];
    if (!prospect || !prospect.consensusProjection) continue;

    const projectedRound = prospect.consensusProjection.projectedRound;

    // Risers: late-round prospects who crushed the combine
    if (
      projectedRound >= 3 &&
      (results.overallGrade === CombineGrade.EXCEPTIONAL ||
        results.overallGrade === CombineGrade.ABOVE_AVERAGE)
    ) {
      risers.push({ prospect, results });
    }

    // Fallers: early-round prospects who bombed the combine
    if (
      projectedRound <= 2 &&
      (results.overallGrade === CombineGrade.BELOW_AVERAGE ||
        results.overallGrade === CombineGrade.POOR)
    ) {
      fallers.push({ prospect, results });
    }
  }

  return { risers, fallers };
}

/**
 * Finds prospects with medical concerns
 */
function findMedicalFlags(
  combineResults: Record<string, CombineResults>
): Array<{ prospectId: string; results: CombineResults }> {
  const flagged: Array<{ prospectId: string; results: CombineResults }> = [];

  for (const [id, results] of Object.entries(combineResults)) {
    if (
      results.medicalEvaluation &&
      (results.medicalEvaluation.grade === MedicalGrade.SIGNIFICANT_CONCERNS ||
        results.medicalEvaluation.grade === MedicalGrade.FAILED)
    ) {
      flagged.push({ prospectId: id, results });
    }
  }

  return flagged;
}

/**
 * Generates a fun NFL player comparison based on position
 */
function generateComparison(prospect: Prospect): string {
  const group = getPositionGroup(prospect.player.position);
  const comparisons = POSITION_COMPARISONS[group] || POSITION_COMPARISONS['DB'];
  return randomElement(comparisons);
}

/**
 * Builds a StoryContext from a prospect and optional combine data
 */
function buildContext(
  prospect: Prospect,
  combineResults?: CombineResults,
  extras?: Record<string, string | number>
): StoryContext {
  const ctx: StoryContext = {
    playerName: `${prospect.player.firstName} ${prospect.player.lastName}`,
    playerPosition: prospect.player.position,
    collegeName: prospect.collegeName,
  };

  if (combineResults?.workoutResults?.fortyYardDash) {
    ctx.fortyTime = Math.round(combineResults.workoutResults.fortyYardDash * 100) / 100;
  }

  if (combineResults?.overallGrade) {
    ctx.combineGrade = formatCombineGrade(combineResults.overallGrade);
  }

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      ctx[key] = value;
    }
  }

  return ctx;
}

/**
 * Formats a combine grade for display
 */
function formatCombineGrade(grade: CombineGrade): string {
  switch (grade) {
    case CombineGrade.EXCEPTIONAL:
      return 'Exceptional';
    case CombineGrade.ABOVE_AVERAGE:
      return 'Above Average';
    case CombineGrade.AVERAGE:
      return 'Average';
    case CombineGrade.BELOW_AVERAGE:
      return 'Below Average';
    case CombineGrade.POOR:
      return 'Poor';
    case CombineGrade.DID_NOT_PARTICIPATE:
      return 'Did Not Participate';
  }
}

/**
 * Creates a PreDraftNewsItem from a template and context
 */
function createNewsItem(
  template: {
    headlines: string[];
    bodies: string[];
    priority: 'breaking' | 'high' | 'medium' | 'low';
    isPositive: boolean;
  },
  context: StoryContext,
  prospectId?: string,
  teamId?: string
): PreDraftNewsItem {
  const headline = replacePlaceholders(randomElement(template.headlines), context);
  const body = replacePlaceholders(randomElement(template.bodies), context);

  return {
    id: nextStoryId(),
    category: 'draft',
    headline,
    body,
    priority: template.priority,
    isPositive: template.isPositive,
    timestamp: Date.now() + Math.floor(Math.random() * 10000),
    relatedProspectId: prospectId,
    relatedTeamId: teamId,
  };
}

/**
 * Generates combine-phase stories (8-15 stories)
 */
function generateCombineStories(
  prospects: Record<string, Prospect>,
  combineResults: Record<string, CombineResults>
): PreDraftNewsItem[] {
  const stories: PreDraftNewsItem[] = [];

  // Combine standouts (up to 4)
  const standouts = findCombineStandouts(prospects, combineResults);
  for (const { prospect, results } of standouts.slice(0, 4)) {
    const template = randomElement(COMBINE_STANDOUT_TEMPLATES);
    const ctx = buildContext(prospect, results);
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Stock movers (up to 3 risers, 2 fallers)
  const { risers, fallers } = findStockMovers(prospects, combineResults);
  for (const { prospect, results } of risers.slice(0, 3)) {
    const template = randomElement(STOCK_RISER_TEMPLATES);
    const ctx = buildContext(prospect, results, { stockDirection: 'Up' });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }
  for (const { prospect, results } of fallers.slice(0, 2)) {
    const template = randomElement(STOCK_FALLER_TEMPLATES);
    const ctx = buildContext(prospect, results, { stockDirection: 'Down' });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Medical flags (up to 2)
  const medFlags = findMedicalFlags(combineResults);
  for (const { prospectId, results } of medFlags.slice(0, 2)) {
    const prospect = prospects[prospectId];
    if (!prospect) continue;
    const template = randomElement(MEDICAL_FLAG_TEMPLATES);
    const ctx = buildContext(prospect, results);
    stories.push(createNewsItem(template, ctx, prospectId));
  }

  // Position scarcity (1-2 stories)
  const positionCounts = new Map<string, number>();
  for (const prospect of Object.values(prospects)) {
    if (prospect.consensusProjection && prospect.consensusProjection.projectedRound <= 3) {
      const pos = prospect.player.position;
      positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
    }
  }
  const sortedPositions = [...positionCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedPositions.length > 0) {
    const deepPos = sortedPositions[0];
    const template = randomElement(POSITION_SCARCITY_TEMPLATES);
    const ctx: StoryContext = { playerPosition: deepPos[0] };
    stories.push(createNewsItem(template, ctx));
  }
  if (sortedPositions.length > 1) {
    const thinPos = sortedPositions[sortedPositions.length - 1];
    const template = randomElement(POSITION_SCARCITY_TEMPLATES);
    const ctx: StoryContext = { playerPosition: thinPos[0] };
    stories.push(createNewsItem(template, ctx));
  }

  return stories.slice(0, 15);
}

/**
 * Generates free-agency-phase stories (5-8 stories)
 */
function generateFreeAgencyStories(
  prospects: Record<string, Prospect>,
  _combineResults: Record<string, CombineResults>,
  _userTeamId: string
): PreDraftNewsItem[] {
  const stories: PreDraftNewsItem[] = [];

  // Team interest stories (up to 5)
  const topProspects = Object.values(prospects)
    .filter((p) => p.consensusProjection && p.consensusProjection.projectedRound <= 2)
    .sort(
      (a, b) =>
        (a.consensusProjection?.projectedPickRange.min ?? 999) -
        (b.consensusProjection?.projectedPickRange.min ?? 999)
    );

  for (const prospect of topProspects.slice(0, 5)) {
    const template = randomElement(TEAM_INTEREST_TEMPLATES);
    const ctx = buildContext(prospect, undefined, { teamName: 'Multiple teams' });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Comparison stories for top prospects (up to 3)
  for (const prospect of topProspects.slice(0, 3)) {
    const comparison = generateComparison(prospect);
    const template = randomElement(COMPARISON_TEMPLATES);
    const ctx = buildContext(prospect, undefined, { comparisonPlayer: comparison });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  return stories.slice(0, 8);
}

/**
 * Generates draft-phase stories (8-12 stories)
 */
function generateDraftDayStories(
  prospects: Record<string, Prospect>,
  combineResults: Record<string, CombineResults>,
  userTeamId: string
): PreDraftNewsItem[] {
  const stories: PreDraftNewsItem[] = [];

  const prospectList = Object.values(prospects);

  // Sleeper alerts for late-round talent (up to 3)
  const sleepers = prospectList
    .filter(
      (p) =>
        p.consensusProjection &&
        p.consensusProjection.projectedRound >= 4 &&
        combineResults[p.id] &&
        (combineResults[p.id].overallGrade === CombineGrade.ABOVE_AVERAGE ||
          combineResults[p.id].overallGrade === CombineGrade.EXCEPTIONAL)
    )
    .slice(0, 3);

  for (const prospect of sleepers) {
    const template = randomElement(SLEEPER_ALERT_TEMPLATES);
    const ctx = buildContext(prospect, combineResults[prospect.id]);
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Bust warnings for top prospects with concerns (up to 2)
  const bustCandidates = prospectList
    .filter((p) => {
      if (!p.consensusProjection || p.consensusProjection.projectedRound > 2) return false;
      const cr = combineResults[p.id];
      if (!cr) return false;
      return (
        cr.overallGrade === CombineGrade.BELOW_AVERAGE ||
        cr.overallGrade === CombineGrade.POOR ||
        (cr.medicalEvaluation &&
          cr.medicalEvaluation.grade !== MedicalGrade.CLEAN &&
          cr.medicalEvaluation.grade !== MedicalGrade.MINOR_CONCERNS)
      );
    })
    .slice(0, 2);

  for (const prospect of bustCandidates) {
    const template = randomElement(BUST_WARNING_TEMPLATES);
    const ctx = buildContext(prospect, combineResults[prospect.id]);
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Coach quotes (up to 3)
  const quoteProspects = prospectList
    .filter((p) => p.consensusProjection && p.consensusProjection.projectedRound <= 3)
    .slice(0, 3);

  for (const prospect of quoteProspects) {
    const quote = randomElement(POSITIVE_COACH_QUOTES);
    const template = randomElement(COACH_QUOTE_TEMPLATES);
    const ctx = buildContext(prospect, undefined, { quoteText: quote });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // Comparison stories (up to 2)
  const comparisonProspects = prospectList
    .filter((p) => p.consensusProjection && p.consensusProjection.projectedRound <= 2)
    .slice(0, 2);

  for (const prospect of comparisonProspects) {
    const comparison = generateComparison(prospect);
    const template = randomElement(COMPARISON_TEMPLATES);
    const ctx = buildContext(prospect, undefined, { comparisonPlayer: comparison });
    stories.push(createNewsItem(template, ctx, prospect.id));
  }

  // User team connection stories (up to 2)
  const userTargets = prospectList.filter((p) => p.flagged || p.userTier !== null).slice(0, 2);

  for (const prospect of userTargets) {
    const template = randomElement(TEAM_INTEREST_TEMPLATES);
    const ctx = buildContext(prospect, undefined, { teamName: 'Your team' });
    stories.push(createNewsItem(template, ctx, prospect.id, userTeamId));
  }

  return stories.slice(0, 12);
}

/**
 * Generates pre-draft stories based on the current offseason phase
 */
export function generatePreDraftStories(
  prospects: Record<string, Prospect>,
  combineResults: Record<string, CombineResults>,
  proDayResults: Record<string, ProDayResults>,
  userTeamId: string,
  phase: 'combine' | 'free_agency' | 'draft'
): PreDraftNewsItem[] {
  switch (phase) {
    case 'combine':
      return generateCombineStories(prospects, combineResults);
    case 'free_agency':
      return generateFreeAgencyStories(prospects, combineResults, userTeamId);
    case 'draft':
      return generateDraftDayStories(prospects, combineResults, userTeamId);
  }
}
