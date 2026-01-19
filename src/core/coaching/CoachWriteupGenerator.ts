/**
 * Coach Writeup Generator
 * Generates narrative descriptions for coaches based on their attributes, tree, and personality
 */

import { Coach } from '../models/staff/Coach';
import { TreeName } from '../models/staff/CoachingTree';
import { PersonalityType } from '../models/staff/CoachPersonality';
import { ReputationTier } from '../models/staff/CoachAttributes';
import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';

/**
 * Tree-specific narrative templates
 */
const TREE_NARRATIVES: Record<TreeName, string[]> = {
  walsh: [
    'A disciple of the West Coast offense philosophy',
    'Trained in the Walsh coaching tree emphasizing timing and precision',
    "Carries the legacy of Bill Walsh's innovative offensive concepts",
    'Schooled in the disciplined, pass-first approach of the Walsh system',
  ],
  parcells: [
    'A product of the Parcells school of hard-nosed football',
    'Embodies the tough, no-nonsense approach learned from Bill Parcells',
    'Carries the Parcells tradition of building physical, disciplined teams',
    'A believer in Parcells\' mantra that "you are what your record says you are"',
  ],
  belichick: [
    'Steeped in the adaptable, game-plan specific approach of the Belichick tree',
    "A student of Bill Belichick's situational football philosophy",
    'Embraces the "do your job" mentality of the Belichick coaching lineage',
    'Trained to outscheme opponents through meticulous preparation',
  ],
  shanahan: [
    'A product of the Shanahan zone-blocking revolution',
    'Carries the Shanahan tradition of creative run-game concepts',
    'Trained in the outside zone principles that define Shanahan offenses',
    'Embodies the bootleg and misdirection concepts of the Shanahan tree',
  ],
  reid: [
    "Schooled in Andy Reid's creative offensive philosophy",
    'A product of the Reid tree known for innovative play design',
    'Carries the Reid tradition of quarterback development excellence',
    'Trained in the motion-heavy, misdirection concepts Reid pioneered',
  ],
  coughlin: [
    'A disciplinarian in the mold of Tom Coughlin',
    'Embodies the attention to detail learned from the Coughlin tree',
    'Carries the Coughlin emphasis on fundamentals and accountability',
    'Trained in the structured, discipline-first approach of Coughlin',
  ],
  dungy: [
    "A product of Tony Dungy's defensive genius",
    'Carries the Dungy legacy of the Tampa 2 defensive system',
    'Trained in the coverage-first philosophy that defined Dungy defenses',
    "Embodies Dungy's calm, player-first leadership approach",
  ],
  holmgren: [
    'Trained in the Holmgren branch of the West Coast tree',
    "A product of Mike Holmgren's quarterback-centric offense",
    'Carries the Holmgren tradition of developing elite passers',
    'Schooled in the precise timing routes of the Holmgren system',
  ],
  gruden: [
    "A product of Jon Gruden's aggressive offensive philosophy",
    "Carries Gruden's passion for film study and preparation",
    'Trained in the attacking, vertical passing concepts Gruden favored',
    'Embodies the intensity and energy of the Gruden coaching tree',
  ],
  payton: [
    "Schooled in Sean Payton's innovative offensive approach",
    'A product of the Payton tree known for creative play-calling',
    "Carries Payton's aggressive, fourth-down mentality",
    'Trained in the high-tempo, explosive concepts that define Payton offenses',
  ],
};

/**
 * Personality-specific narrative additions
 */
const PERSONALITY_NARRATIVES: Record<PersonalityType, string[]> = {
  analytical: [
    'Known for his methodical, data-driven approach to game planning',
    'Relies heavily on analytics to inform in-game decisions',
    "Takes a cerebral approach to X's and O's",
    'His game plans are meticulous and detail-oriented',
  ],
  aggressive: [
    'Known for bold, risk-taking decisions on the field',
    'His teams play with an attacking mentality',
    'Never afraid to go for it in crucial situations',
    'His aggressive style can be a double-edged sword',
  ],
  conservative: [
    'Prefers a methodical, low-risk approach to football',
    'His teams are disciplined and rarely beat themselves',
    'Values ball security and field position',
    'Takes a measured approach to game management',
  ],
  innovative: [
    'Always looking for new ways to gain an edge',
    'Known for creative schemes that keep opponents guessing',
    'His playbook is constantly evolving',
    'Not afraid to try unconventional approaches',
  ],
  oldSchool: [
    'Believes in time-tested fundamentals and physicality',
    'His teams are built on toughness and discipline',
    'Values the running game and physical defense',
    'Sticks to proven strategies that have stood the test of time',
  ],
  playersCoach: [
    'Known for building strong relationships with his players',
    'His locker room culture is one of trust and mutual respect',
    'Players consistently praise his leadership and communication',
    'Creates an environment where players want to compete for him',
  ],
};

/**
 * Experience level narratives
 */
const EXPERIENCE_NARRATIVES: Record<string, string[]> = {
  rookie: [
    'A first-time head coach eager to prove himself',
    'Making his debut as a head coach',
    'A rising star looking to make his mark',
  ],
  emerging: [
    'Still building his reputation in the league',
    'A young coach with something to prove',
    'Continuing to develop as a leader',
  ],
  veteran: [
    'A seasoned veteran with decades of experience',
    'Has seen it all in his long career',
    'Brings a wealth of experience to the position',
  ],
  legend: [
    'One of the most accomplished coaches of his generation',
    'A future Hall of Fame candidate',
    'His track record speaks for itself',
  ],
};

/**
 * Scheme-specific narratives for offensive schemes
 */
const OFFENSIVE_SCHEME_NARRATIVES: Record<OffensiveScheme, string[]> = {
  westCoast: [
    'Runs a timing-based West Coast offense emphasizing short, quick passes',
    'His offense features horizontal stretching and yards after catch',
    'Built around precision routes and quarterback accuracy',
  ],
  airRaid: [
    'Commands an Air Raid offense that spreads defenses thin',
    'His passing attack features four and five receiver sets',
    'Embraces tempo and volume passing to overwhelm opponents',
  ],
  spreadOption: [
    "Deploys a spread option attack utilizing the quarterback's legs",
    'His offense creates conflict for defenses with read-option concepts',
    'Features RPOs and designed quarterback runs',
  ],
  powerRun: [
    'Builds his offense around a physical, downhill running game',
    'His teams establish dominance at the line of scrimmage',
    'Features gap-scheme running and play-action passing',
  ],
  zoneRun: [
    'Implements a zone-blocking scheme that creates cutback lanes',
    'His running game emphasizes patience and one-cut ability',
    'Features outside zone and stretch concepts',
  ],
  playAction: [
    'Utilizes heavy play-action to create explosive passing plays',
    'His offense sets up deep shots off the run game threat',
    'Features bootlegs and movement-based passing concepts',
  ],
};

/**
 * Scheme-specific narratives for defensive schemes
 */
const DEFENSIVE_SCHEME_NARRATIVES: Record<DefensiveScheme, string[]> = {
  fourThreeUnder: [
    'Deploys a 4-3 Under front that prioritizes gap control',
    'His defense features a dominant defensive line',
    'Built around penetrating defensive tackles and active linebackers',
  ],
  threeFour: [
    'Runs a versatile 3-4 scheme with multiple blitz packages',
    'His defense disguises coverages and pressures effectively',
    'Features two-gap nose tackles and athletic outside linebackers',
  ],
  coverThree: [
    'Employs a Cover 3 shell that limits big plays',
    'His secondary plays with disciplined zone assignments',
    'Features single-high safety looks and pattern-matching concepts',
  ],
  coverTwo: [
    'Implements a Cover 2 scheme that takes away the deep ball',
    'His defense features two deep safeties and underneath zones',
    'Built around forcing opponents into check-downs',
  ],
  manPress: [
    'Plays aggressive man coverage with press technique',
    'His corners challenge receivers at the line of scrimmage',
    'Features tight coverage and relies on individual matchups',
  ],
  blitzHeavy: [
    'Brings pressure from all angles with creative blitz packages',
    'His defense is built on creating negative plays',
    'Not afraid to gamble with aggressive pressure calls',
  ],
};

/**
 * Strength-based narrative additions
 */
const STRENGTH_NARRATIVES: Record<string, string> = {
  development: 'Players consistently improve under his tutelage.',
  gameDayIQ: 'His in-game adjustments are among the best in the league.',
  schemeTeaching: 'Players quickly grasp and execute his system.',
  playerEvaluation: 'Has an eye for talent that others miss.',
  talentID: 'Known for identifying diamond-in-the-rough prospects.',
  motivation: 'Gets the most out of his players through elite motivation.',
};

/**
 * Weakness-based narrative additions
 */
const WEAKNESS_NARRATIVES: Record<string, string> = {
  development: 'Some question whether players develop fully in his system.',
  gameDayIQ: 'Critics point to questionable in-game decisions.',
  schemeTeaching: 'His complex system can take time for players to learn.',
  playerEvaluation: 'His player evaluations have been inconsistent.',
  talentID: 'Has missed on some highly-touted prospects.',
  motivation: 'Some players have struggled to connect with his approach.',
};

/**
 * Gets a random element from an array
 */
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Determines experience level category
 */
function getExperienceLevel(yearsExperience: number): string {
  if (yearsExperience <= 3) return 'rookie';
  if (yearsExperience <= 10) return 'emerging';
  if (yearsExperience <= 20) return 'veteran';
  return 'legend';
}

/**
 * Gets the strongest attribute for a coach
 */
function getStrongestAttribute(coach: Coach): string | null {
  const attrs = coach.attributes;
  const skillAttrs: { key: string; value: number }[] = [
    { key: 'development', value: attrs.development },
    { key: 'gameDayIQ', value: attrs.gameDayIQ },
    { key: 'schemeTeaching', value: attrs.schemeTeaching },
    { key: 'playerEvaluation', value: attrs.playerEvaluation },
    { key: 'talentID', value: attrs.talentID },
    { key: 'motivation', value: attrs.motivation },
  ];

  const sorted = skillAttrs.sort((a, b) => b.value - a.value);
  // Only mention if notably strong (70+)
  if (sorted[0].value >= 70) {
    return sorted[0].key;
  }
  return null;
}

/**
 * Gets the weakest attribute for a coach
 */
function getWeakestAttribute(coach: Coach): string | null {
  const attrs = coach.attributes;
  const skillAttrs: { key: string; value: number }[] = [
    { key: 'development', value: attrs.development },
    { key: 'gameDayIQ', value: attrs.gameDayIQ },
    { key: 'schemeTeaching', value: attrs.schemeTeaching },
    { key: 'playerEvaluation', value: attrs.playerEvaluation },
    { key: 'talentID', value: attrs.talentID },
    { key: 'motivation', value: attrs.motivation },
  ];

  const sorted = skillAttrs.sort((a, b) => a.value - b.value);
  // Only mention if notably weak (below 45)
  if (sorted[0].value < 45) {
    return sorted[0].key;
  }
  return null;
}

/**
 * Generates a complete writeup for a coach
 */
export function generateCoachWriteup(coach: Coach): string {
  const parts: string[] = [];
  const experienceLevel = getExperienceLevel(coach.attributes.yearsExperience);

  // Opening based on coaching tree
  parts.push(randomElement(TREE_NARRATIVES[coach.tree.treeName]));

  // Experience context
  if (experienceLevel === 'veteran' || experienceLevel === 'legend') {
    parts.push(randomElement(EXPERIENCE_NARRATIVES[experienceLevel]));
  }

  // Personality description
  parts.push(randomElement(PERSONALITY_NARRATIVES[coach.personality.primary]));

  // Scheme description (if applicable)
  if (coach.scheme) {
    if (coach.role === 'headCoach' || coach.role === 'offensiveCoordinator') {
      const offScheme = coach.scheme as OffensiveScheme;
      if (OFFENSIVE_SCHEME_NARRATIVES[offScheme]) {
        parts.push(randomElement(OFFENSIVE_SCHEME_NARRATIVES[offScheme]));
      }
    } else if (coach.role === 'defensiveCoordinator') {
      const defScheme = coach.scheme as DefensiveScheme;
      if (DEFENSIVE_SCHEME_NARRATIVES[defScheme]) {
        parts.push(randomElement(DEFENSIVE_SCHEME_NARRATIVES[defScheme]));
      }
    }
  }

  // Strength mention (if notable)
  const strongAttr = getStrongestAttribute(coach);
  if (strongAttr && STRENGTH_NARRATIVES[strongAttr]) {
    parts.push(STRENGTH_NARRATIVES[strongAttr]);
  }

  // Weakness mention (if notable, but phrase carefully)
  const weakAttr = getWeakestAttribute(coach);
  if (weakAttr && WEAKNESS_NARRATIVES[weakAttr] && Math.random() > 0.5) {
    parts.push(WEAKNESS_NARRATIVES[weakAttr]);
  }

  return parts.join(' ');
}

/**
 * Generates a short summary writeup (1-2 sentences)
 */
export function generateCoachSummary(coach: Coach): string {
  // Build a concise summary
  const treeIntro = randomElement(TREE_NARRATIVES[coach.tree.treeName]);
  const personalityNote = randomElement(PERSONALITY_NARRATIVES[coach.personality.primary]);

  return `${treeIntro} ${personalityNote}`;
}

/**
 * Generates strengths list for a coach
 */
export function generateCoachStrengths(coach: Coach): string[] {
  const strengths: string[] = [];
  const attrs = coach.attributes;

  if (attrs.development >= 70) strengths.push('Player Development');
  if (attrs.gameDayIQ >= 70) strengths.push('Game Management');
  if (attrs.schemeTeaching >= 70) strengths.push('Scheme Installation');
  if (attrs.playerEvaluation >= 70) strengths.push('Talent Evaluation');
  if (attrs.talentID >= 70) strengths.push('Hidden Gem Finder');
  if (attrs.motivation >= 70) strengths.push('Player Motivation');

  // Add personality-based strengths
  if (coach.personality.primary === 'analytical') strengths.push('Film Study');
  if (coach.personality.primary === 'playersCoach') strengths.push('Locker Room Culture');
  if (coach.personality.primary === 'innovative') strengths.push('Creative Playcalling');
  if (coach.personality.primary === 'aggressive') strengths.push('Fourth Down Decisions');

  // Ensure at least 2 strengths
  if (strengths.length < 2) {
    const genericStrengths = ['Experience', 'Leadership', 'Preparation', 'Communication'];
    while (strengths.length < 2) {
      const s = genericStrengths.shift();
      if (s) strengths.push(s);
    }
  }

  return strengths.slice(0, 4); // Max 4 strengths
}

/**
 * Generates weaknesses list for a coach
 */
export function generateCoachWeaknesses(coach: Coach): string[] {
  const weaknesses: string[] = [];
  const attrs = coach.attributes;

  if (attrs.development < 45) weaknesses.push('Player Development');
  if (attrs.gameDayIQ < 45) weaknesses.push('Clock Management');
  if (attrs.schemeTeaching < 45) weaknesses.push('System Complexity');
  if (attrs.playerEvaluation < 45) weaknesses.push('Talent Evaluation');
  if (attrs.talentID < 45) weaknesses.push('Prospect Assessment');
  if (attrs.motivation < 45) weaknesses.push('Player Relations');

  // Add personality-based weaknesses
  if (coach.personality.primary === 'aggressive') weaknesses.push('Risk Management');
  if (coach.personality.primary === 'conservative') weaknesses.push('Adaptability');
  if (coach.personality.primary === 'oldSchool') weaknesses.push('Modern Concepts');
  if (coach.personality.ego > 80) weaknesses.push('Ego Clashes');

  // Ensure at least 1 weakness
  if (weaknesses.length < 1) {
    weaknesses.push('Unproven');
  }

  return weaknesses.slice(0, 3); // Max 3 weaknesses
}

/**
 * Gets display name for a scheme
 */
export function getSchemeDisplayName(scheme: OffensiveScheme | DefensiveScheme | null): string {
  if (!scheme) return 'Multiple';

  const displayNames: Record<string, string> = {
    westCoast: 'West Coast',
    airRaid: 'Air Raid',
    spreadOption: 'Spread Option',
    powerRun: 'Power Run',
    zoneRun: 'Zone Run',
    playAction: 'Play Action',
    fourThreeUnder: '4-3 Under',
    threeFour: '3-4',
    coverThree: 'Cover 3',
    coverTwo: 'Cover 2',
    manPress: 'Man Press',
    blitzHeavy: 'Blitz Heavy',
  };

  return displayNames[scheme] || scheme;
}

/**
 * Gets display name for a coaching tree
 */
export function getTreeDisplayName(treeName: TreeName): string {
  const displayNames: Record<TreeName, string> = {
    walsh: 'Bill Walsh Tree',
    parcells: 'Bill Parcells Tree',
    belichick: 'Bill Belichick Tree',
    shanahan: 'Mike Shanahan Tree',
    reid: 'Andy Reid Tree',
    coughlin: 'Tom Coughlin Tree',
    dungy: 'Tony Dungy Tree',
    holmgren: 'Mike Holmgren Tree',
    gruden: 'Jon Gruden Tree',
    payton: 'Sean Payton Tree',
  };

  return displayNames[treeName];
}

/**
 * Gets display name for a personality type
 */
export function getPersonalityDisplayName(personality: PersonalityType): string {
  const displayNames: Record<PersonalityType, string> = {
    analytical: 'Analytical',
    aggressive: 'Aggressive',
    conservative: 'Conservative',
    innovative: 'Innovative',
    oldSchool: 'Old School',
    playersCoach: "Players' Coach",
  };

  return displayNames[personality];
}

/**
 * Gets display name for reputation tier
 */
export function getReputationDisplayName(tier: ReputationTier): string {
  const displayNames: Record<ReputationTier, string> = {
    legendary: 'Legendary',
    elite: 'Elite',
    established: 'Established',
    rising: 'Rising Star',
    unknown: 'Unknown',
  };

  return displayNames[tier];
}
