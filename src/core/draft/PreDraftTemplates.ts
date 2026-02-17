/**
 * Pre-Draft Story Templates
 * Template collections for generating pre-draft narrative stories
 * across combine, free agency, and draft phases.
 */

import { StoryTemplate } from '../news/StoryTemplates';

// ============================================================================
// COMBINE STANDOUT TEMPLATES
// ============================================================================

export const COMBINE_STANDOUT_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      '{playerName} Steals the Show at Combine',
      '{playerName} Runs Blazing {fortyTime} at Combine',
      'Combine Star: {playerName} Wows Scouts',
      '{playerName} Puts on a Clinic in Indianapolis',
      '{collegeName} {playerPosition} {playerName} Lights Up Combine',
    ],
    bodies: [
      '{playerName} turned heads at the NFL Combine with an exceptional performance across the board. The {collegeName} {playerPosition} earned an {combineGrade} overall grade and solidified his status as a top prospect.',
      'All eyes were on {playerName} at the Combine, and the {playerPosition} out of {collegeName} did not disappoint. His {fortyTime} 40-yard dash time had scouts scrambling to update their boards.',
      "The {collegeName} product {playerName} was arguably the biggest winner of this year's Combine. The {playerPosition} tested off the charts and could see his stock rise significantly heading into the draft.",
    ],
    priority: 'high',
    isPositive: true,
  },
  {
    category: 'draft',
    headlines: [
      '{playerName} Posts Elite Numbers at Combine',
      'Combine Recap: {playerName} Among Top Performers',
      '{playerName} Cements Top-Prospect Status at Combine',
    ],
    bodies: [
      '{playerName} backed up his college tape with an outstanding Combine showing. The {playerPosition} from {collegeName} graded out as {combineGrade} and is firmly in the first-round conversation.',
      'Another strong day at the Combine for {playerName}. The {collegeName} {playerPosition} impressed with elite athleticism and should hear his name called early on draft night.',
    ],
    priority: 'high',
    isPositive: true,
  },
];

// ============================================================================
// STOCK RISER TEMPLATES
// ============================================================================

export const STOCK_RISER_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      '{playerName} Stock Soaring After Combine',
      'Scouts Raving About {playerName}',
      '{playerName} Climbing Draft Boards',
      'Stock Watch: {playerName} Trending {stockDirection}',
      '{playerName} Making a Late Push Up the Board',
    ],
    bodies: [
      '{playerName} is one of the biggest risers of the pre-draft process. The {collegeName} {playerPosition} has impressed at every turn and could go much higher than originally projected.',
      'League sources say {playerName} has been the talk of the scouting community. The {playerPosition} out of {collegeName} is making a strong case to be a Day 1 selection.',
      "Don't be surprised if {playerName} goes earlier than expected. The {collegeName} {playerPosition} has been steadily climbing boards after an impressive showing during the evaluation process.",
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// STOCK FALLER TEMPLATES
// ============================================================================

export const STOCK_FALLER_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      '{playerName} Disappoints at Combine',
      'Red Flags Emerging for {playerName}',
      '{playerName} Stock Falling After Poor Workout',
      'Stock Watch: {playerName} Trending {stockDirection}',
      'Concerns Growing Around {playerName}',
    ],
    bodies: [
      '{playerName} did not have the Combine showing scouts were hoping for. The {collegeName} {playerPosition} posted a {combineGrade} grade and may be slipping down draft boards.',
      'It was a rough outing for {playerName} at the Combine. The {playerPosition} from {collegeName} looked sluggish in drills and failed to impress in meetings with teams.',
      'Sources indicate {playerName} is losing momentum in the pre-draft process. The {collegeName} {playerPosition} may need a strong pro day to salvage his draft stock.',
    ],
    priority: 'medium',
    isPositive: false,
  },
];

// ============================================================================
// MEDICAL FLAG TEMPLATES
// ============================================================================

export const MEDICAL_FLAG_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      'Injury Concerns Surface for {playerName}',
      'Medical Red Flag: {playerName} Fails Physical',
      '{playerName} Flagged in Combine Medical Checks',
      'Health Questions Loom for {playerName}',
    ],
    bodies: [
      'Medical evaluations at the Combine have raised concerns about {playerName}. The {collegeName} {playerPosition} was flagged with significant health issues that could impact his draft stock.',
      'Teams are proceeding with caution on {playerName} after medical red flags surfaced during Combine evaluations. The {playerPosition} out of {collegeName} may need additional follow-up testing.',
      '{playerName} is dealing with a medical situation that has some teams worried. The {collegeName} {playerPosition} was flagged during his physical and could see his draft stock take a hit.',
    ],
    priority: 'high',
    isPositive: false,
  },
];

// ============================================================================
// SLEEPER ALERT TEMPLATES
// ============================================================================

export const SLEEPER_ALERT_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      "Don't Sleep on {playerName}",
      'Late-Round Gold? {playerName} Could Be a Steal',
      'Hidden Gem Alert: {playerName} from {collegeName}',
      "{playerName} Could Be This Year's Best Value Pick",
      'Sleeper Watch: {playerName}, {playerPosition}, {collegeName}',
    ],
    bodies: [
      '{playerName} may not be a household name, but the {collegeName} {playerPosition} has the tools to outplay his draft position. Multiple scouts have him as a personal favorite.',
      'Keep an eye on {playerName} from {collegeName}. The {playerPosition} has been quietly impressive throughout the evaluation process and could be a Day 3 steal.',
      'Every year a late-round pick emerges as a starter. This year, {playerName} out of {collegeName} has all the makings of that kind of player at {playerPosition}.',
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// COACH QUOTE TEMPLATES
// ============================================================================

export const COACH_QUOTE_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      "College Coach Raves: '{quoteText}'",
      "{collegeName} Coach on {playerName}: 'Best Player I've Coached'",
      "Coach's Corner: {playerName} Gets Glowing Review",
      'High Praise for {playerName} from {collegeName} Staff',
    ],
    bodies: [
      'The head coach at {collegeName} had nothing but praise for {playerName}: "{quoteText}" The {playerPosition} is expected to be drafted on Day 2.',
      '{playerName}\'s college coach went on record singing the {playerPosition}\'s praises ahead of the draft. "{quoteText}" said the {collegeName} coach.',
      'Coaches at {collegeName} are confident {playerName} will succeed at the next level. "{quoteText}" The {playerPosition} has drawn interest from multiple teams.',
    ],
    priority: 'low',
    isPositive: true,
  },
];

// ============================================================================
// TEAM INTEREST TEMPLATES
// ============================================================================

export const TEAM_INTEREST_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      'Sources: {teamName} Have Eyes on {playerName}',
      '{teamName} Showing Strong Interest in {playerName}',
      'Mock Draft Update: {playerName} Linked to {teamName}',
      '{teamName} Reportedly High on {playerName}',
      'Draft Connection: {playerName} to {teamName}?',
    ],
    bodies: [
      'Multiple sources indicate {teamName} have been doing extensive homework on {playerName}. The {collegeName} {playerPosition} fits a clear need for the organization.',
      '{teamName} brass met privately with {playerName} at the Combine. The {playerPosition} from {collegeName} is believed to be high on their draft board.',
      'Keep an eye on {teamName} and {playerName}. League insiders say the team sees the {collegeName} {playerPosition} as a potential cornerstone piece.',
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// COMPARISON TEMPLATES
// ============================================================================

export const COMPARISON_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      '{playerName} Reminds Scouts of {comparisonPlayer}',
      'NFL Comp: {playerName} Draws {comparisonPlayer} Comparisons',
      '{playerName}: The Next {comparisonPlayer}?',
      "Scouts See {comparisonPlayer} in {playerName}'s Game",
    ],
    bodies: [
      'The comparisons are flattering but not unfounded. {playerName} out of {collegeName} has drawn comparisons to {comparisonPlayer} for his style of play at {playerPosition}.',
      'Multiple evaluators have compared {playerName} to {comparisonPlayer}. The {collegeName} {playerPosition} shares a similar skill set and physical profile.',
      'Is {playerName} the next {comparisonPlayer}? Scouts say the {collegeName} {playerPosition} has a similar playing style and ceiling, though he still has room to grow.',
    ],
    priority: 'medium',
    isPositive: true,
  },
];

// ============================================================================
// POSITION SCARCITY TEMPLATES
// ============================================================================

export const POSITION_SCARCITY_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      "This Year's {playerPosition} Class Is Historically Deep",
      '{playerPosition} Talent Overflows in This Draft',
      'Thin at {playerPosition}: Teams May Need to Reach',
      'Position Preview: {playerPosition} Class Breakdown',
    ],
    bodies: [
      "This year's {playerPosition} class is one of the deepest in recent memory. Teams needing help at the position should find quality options throughout the draft.",
      'The {playerPosition} group is considered thin this year, which could force teams to reach early for top talent. Expect a run on {playerPosition} in the first two rounds.',
      "Evaluators are split on this year's {playerPosition} class. While there is no consensus top prospect, the depth of the group means Day 2 and Day 3 could yield solid starters.",
    ],
    priority: 'low',
    isPositive: true,
  },
];

// ============================================================================
// BUST WARNING TEMPLATES
// ============================================================================

export const BUST_WARNING_TEMPLATES: StoryTemplate[] = [
  {
    category: 'draft',
    headlines: [
      'Does {playerName} Have What It Takes?',
      'Bust Potential? Scouts Question {playerName}',
      '{playerName}: High Ceiling, Low Floor',
      'The Case Against {playerName} in Round 1',
      'Proceed with Caution: {playerName} Carries Risk',
    ],
    bodies: [
      'For all his talent, {playerName} comes with legitimate questions. The {collegeName} {playerPosition} has the physical tools but scouts are divided on whether his game will translate to the next level.',
      'Not everyone is sold on {playerName}. Some evaluators believe the {collegeName} {playerPosition} is being overdrafted and carries significant bust potential.',
      '{playerName} is one of the most polarizing prospects in this class. The {playerPosition} from {collegeName} has star potential but also the kind of red flags that have sunk top picks before.',
    ],
    priority: 'medium',
    isPositive: false,
  },
];
