/**
 * College Program Generator
 * Generates ~130 fictional state-named college programs with conference affiliations
 * and hidden prestige ratings.
 */

import { generateUUID, randomInt, weightedRandom } from '../generators/utils/RandomUtils';

/**
 * Conference tiers representing competitive level
 */
export enum ConferenceTier {
  POWER = 'POWER',
  GROUP_OF_FIVE = 'GROUP_OF_FIVE',
  FCS = 'FCS',
}

/**
 * Fictional conference names
 */
export enum Conference {
  // Power conferences (4)
  ATLANTIC_CONFERENCE = 'Atlantic Conference',
  PACIFIC_CONFERENCE = 'Pacific Conference',
  CENTRAL_CONFERENCE = 'Central Conference',
  SOUTHERN_CONFERENCE = 'Southern Conference',

  // Group of Five conferences (4)
  MOUNTAIN_CONFERENCE = 'Mountain Conference',
  COASTAL_CONFERENCE = 'Coastal Conference',
  PLAINS_CONFERENCE = 'Plains Conference',
  MIDWEST_CONFERENCE = 'Midwest Conference',

  // FCS conferences (4)
  COLONIAL_CONFERENCE = 'Colonial Conference',
  FRONTIER_CONFERENCE = 'Frontier Conference',
  HEARTLAND_CONFERENCE = 'Heartland Conference',
  PIONEER_CONFERENCE = 'Pioneer Conference',
}

/**
 * Maps conferences to their tiers
 */
export const CONFERENCE_TIERS: Record<Conference, ConferenceTier> = {
  [Conference.ATLANTIC_CONFERENCE]: ConferenceTier.POWER,
  [Conference.PACIFIC_CONFERENCE]: ConferenceTier.POWER,
  [Conference.CENTRAL_CONFERENCE]: ConferenceTier.POWER,
  [Conference.SOUTHERN_CONFERENCE]: ConferenceTier.POWER,
  [Conference.MOUNTAIN_CONFERENCE]: ConferenceTier.GROUP_OF_FIVE,
  [Conference.COASTAL_CONFERENCE]: ConferenceTier.GROUP_OF_FIVE,
  [Conference.PLAINS_CONFERENCE]: ConferenceTier.GROUP_OF_FIVE,
  [Conference.MIDWEST_CONFERENCE]: ConferenceTier.GROUP_OF_FIVE,
  [Conference.COLONIAL_CONFERENCE]: ConferenceTier.FCS,
  [Conference.FRONTIER_CONFERENCE]: ConferenceTier.FCS,
  [Conference.HEARTLAND_CONFERENCE]: ConferenceTier.FCS,
  [Conference.PIONEER_CONFERENCE]: ConferenceTier.FCS,
};

/**
 * Prestige tier for a college program (hidden from UI)
 */
export enum PrestigeTier {
  ELITE = 'ELITE', // Top programs, consistently produce NFL talent
  HIGH = 'HIGH', // Strong programs, regular NFL contributors
  MEDIUM = 'MEDIUM', // Solid programs, occasional NFL players
  LOW = 'LOW', // Developing programs, rare NFL talent
  MINIMAL = 'MINIMAL', // Small programs, very rare NFL talent
}

/**
 * Prestige rating range by tier
 */
export const PRESTIGE_RANGES: Record<PrestigeTier, { min: number; max: number }> = {
  [PrestigeTier.ELITE]: { min: 85, max: 100 },
  [PrestigeTier.HIGH]: { min: 70, max: 84 },
  [PrestigeTier.MEDIUM]: { min: 50, max: 69 },
  [PrestigeTier.LOW]: { min: 30, max: 49 },
  [PrestigeTier.MINIMAL]: { min: 10, max: 29 },
};

/**
 * College program entity
 */
export interface CollegeProgram {
  /** Unique identifier */
  id: string;
  /** Full program name (e.g., "State of Ohio") */
  name: string;
  /** Short name/abbreviation */
  abbreviation: string;
  /** State the program is named after */
  state: string;
  /** Program type suffix (State of, University of, etc.) */
  programType: ProgramType;
  /** Conference affiliation */
  conference: Conference;
  /** Conference tier */
  conferenceTier: ConferenceTier;
  /** Prestige tier (hidden from UI) */
  prestigeTier: PrestigeTier;
  /** Prestige rating 1-100 (hidden from UI) */
  prestigeRating: number;
  /** Historical NFL players produced (tracked over time) */
  nflAlumniCount: number;
}

/**
 * Program naming types
 */
export enum ProgramType {
  STATE_OF = 'State of',
  UNIVERSITY_OF = 'University of',
  TECH = 'Tech',
  COLLEGE = 'College',
}

/**
 * All US states for program generation
 */
const US_STATES: string[] = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

/**
 * State abbreviations
 */
const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'ALA',
  Alaska: 'AK',
  Arizona: 'ARIZ',
  Arkansas: 'ARK',
  California: 'CAL',
  Colorado: 'COLO',
  Connecticut: 'CONN',
  Delaware: 'DEL',
  Florida: 'FLA',
  Georgia: 'GA',
  Hawaii: 'HAW',
  Idaho: 'IDHO',
  Illinois: 'ILL',
  Indiana: 'IND',
  Iowa: 'IOWA',
  Kansas: 'KAN',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MASS',
  Michigan: 'MICH',
  Minnesota: 'MINN',
  Mississippi: 'MISS',
  Missouri: 'MO',
  Montana: 'MONT',
  Nebraska: 'NEB',
  Nevada: 'NEV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OHIO',
  Oklahoma: 'OKLA',
  Oregon: 'ORE',
  Pennsylvania: 'PENN',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TENN',
  Texas: 'TEX',
  Utah: 'UTAH',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WASH',
  'West Virginia': 'WVA',
  Wisconsin: 'WISC',
  Wyoming: 'WYO',
};

/**
 * Regional conference assignments (which states go to which conferences)
 */
const REGIONAL_CONFERENCE_MAP: Record<string, Conference[]> = {
  // Northeast -> Atlantic
  Connecticut: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Delaware: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Maine: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Maryland: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Massachusetts: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'New Hampshire': [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'New Jersey': [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'New York': [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Pennsylvania: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'Rhode Island': [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Vermont: [Conference.ATLANTIC_CONFERENCE, Conference.COLONIAL_CONFERENCE],

  // Southeast -> Southern
  Alabama: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  Florida: [Conference.SOUTHERN_CONFERENCE, Conference.COASTAL_CONFERENCE],
  Georgia: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  Kentucky: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  Louisiana: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  Mississippi: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  'North Carolina': [Conference.SOUTHERN_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'South Carolina': [Conference.SOUTHERN_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  Tennessee: [Conference.SOUTHERN_CONFERENCE, Conference.HEARTLAND_CONFERENCE],
  Virginia: [Conference.SOUTHERN_CONFERENCE, Conference.COLONIAL_CONFERENCE],
  'West Virginia': [Conference.SOUTHERN_CONFERENCE, Conference.COLONIAL_CONFERENCE],

  // Midwest -> Central
  Illinois: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Indiana: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Iowa: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Michigan: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Minnesota: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Missouri: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Nebraska: [Conference.CENTRAL_CONFERENCE, Conference.PLAINS_CONFERENCE],
  Ohio: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],
  Wisconsin: [Conference.CENTRAL_CONFERENCE, Conference.MIDWEST_CONFERENCE],

  // Plains/Mountain -> Mountain/Plains
  Colorado: [Conference.MOUNTAIN_CONFERENCE, Conference.FRONTIER_CONFERENCE],
  Kansas: [Conference.PLAINS_CONFERENCE, Conference.FRONTIER_CONFERENCE],
  Montana: [Conference.MOUNTAIN_CONFERENCE, Conference.FRONTIER_CONFERENCE],
  'North Dakota': [Conference.PLAINS_CONFERENCE, Conference.PIONEER_CONFERENCE],
  Oklahoma: [Conference.PLAINS_CONFERENCE, Conference.FRONTIER_CONFERENCE],
  'South Dakota': [Conference.PLAINS_CONFERENCE, Conference.PIONEER_CONFERENCE],
  Wyoming: [Conference.MOUNTAIN_CONFERENCE, Conference.FRONTIER_CONFERENCE],

  // Southwest -> Pacific/Mountain
  Arizona: [Conference.PACIFIC_CONFERENCE, Conference.MOUNTAIN_CONFERENCE],
  Arkansas: [Conference.SOUTHERN_CONFERENCE, Conference.PLAINS_CONFERENCE],
  'New Mexico': [Conference.MOUNTAIN_CONFERENCE, Conference.FRONTIER_CONFERENCE],
  Texas: [Conference.SOUTHERN_CONFERENCE, Conference.PLAINS_CONFERENCE],
  Utah: [Conference.MOUNTAIN_CONFERENCE, Conference.PIONEER_CONFERENCE],

  // West -> Pacific
  California: [Conference.PACIFIC_CONFERENCE, Conference.COASTAL_CONFERENCE],
  Hawaii: [Conference.PACIFIC_CONFERENCE, Conference.COASTAL_CONFERENCE],
  Nevada: [Conference.PACIFIC_CONFERENCE, Conference.MOUNTAIN_CONFERENCE],
  Oregon: [Conference.PACIFIC_CONFERENCE, Conference.COASTAL_CONFERENCE],
  Washington: [Conference.PACIFIC_CONFERENCE, Conference.COASTAL_CONFERENCE],

  // Other
  Alaska: [Conference.PACIFIC_CONFERENCE, Conference.PIONEER_CONFERENCE],
  Idaho: [Conference.MOUNTAIN_CONFERENCE, Conference.PIONEER_CONFERENCE],
};

/**
 * Generates a full name for a college program
 */
function generateProgramName(state: string, programType: ProgramType): string {
  switch (programType) {
    case ProgramType.STATE_OF:
      return `State of ${state}`;
    case ProgramType.UNIVERSITY_OF:
      return `University of ${state}`;
    case ProgramType.TECH:
      return `${state} Tech`;
    case ProgramType.COLLEGE:
      return `${state} College`;
  }
}

/**
 * Generates abbreviation for a program
 */
function generateAbbreviation(state: string, programType: ProgramType): string {
  const stateAbbr = STATE_ABBREVIATIONS[state] || state.substring(0, 4).toUpperCase();
  switch (programType) {
    case ProgramType.STATE_OF:
      return `S${stateAbbr}`;
    case ProgramType.UNIVERSITY_OF:
      return `U${stateAbbr}`;
    case ProgramType.TECH:
      return `${stateAbbr}T`;
    case ProgramType.COLLEGE:
      return `${stateAbbr}C`;
  }
}

/**
 * Determines prestige tier based on conference tier and randomization
 */
function determinePrestigeTier(conferenceTier: ConferenceTier): PrestigeTier {
  const tierOptions: Record<ConferenceTier, { value: PrestigeTier; weight: number }[]> = {
    [ConferenceTier.POWER]: [
      { value: PrestigeTier.ELITE, weight: 0.2 },
      { value: PrestigeTier.HIGH, weight: 0.5 },
      { value: PrestigeTier.MEDIUM, weight: 0.25 },
      { value: PrestigeTier.LOW, weight: 0.05 },
    ],
    [ConferenceTier.GROUP_OF_FIVE]: [
      { value: PrestigeTier.HIGH, weight: 0.1 },
      { value: PrestigeTier.MEDIUM, weight: 0.4 },
      { value: PrestigeTier.LOW, weight: 0.4 },
      { value: PrestigeTier.MINIMAL, weight: 0.1 },
    ],
    [ConferenceTier.FCS]: [
      { value: PrestigeTier.MEDIUM, weight: 0.1 },
      { value: PrestigeTier.LOW, weight: 0.3 },
      { value: PrestigeTier.MINIMAL, weight: 0.6 },
    ],
  };

  return weightedRandom(tierOptions[conferenceTier]);
}

/**
 * Generates a single college program
 */
export function generateCollegeProgram(
  state: string,
  programType: ProgramType,
  conference: Conference
): CollegeProgram {
  const conferenceTier = CONFERENCE_TIERS[conference];
  const prestigeTier = determinePrestigeTier(conferenceTier);
  const prestigeRange = PRESTIGE_RANGES[prestigeTier];

  return {
    id: generateUUID(),
    name: generateProgramName(state, programType),
    abbreviation: generateAbbreviation(state, programType),
    state,
    programType,
    conference,
    conferenceTier,
    prestigeTier,
    prestigeRating: randomInt(prestigeRange.min, prestigeRange.max),
    nflAlumniCount: 0,
  };
}

/**
 * Generates all college programs (~130 programs)
 * Each state gets 2-3 programs with different naming conventions
 */
export function generateAllCollegePrograms(): CollegeProgram[] {
  const programs: CollegeProgram[] = [];

  for (const state of US_STATES) {
    const conferences = REGIONAL_CONFERENCE_MAP[state] || [
      Conference.MIDWEST_CONFERENCE,
      Conference.PIONEER_CONFERENCE,
    ];

    // Each state gets 2-3 programs
    const programTypes = [ProgramType.STATE_OF, ProgramType.UNIVERSITY_OF];

    // 60% of states get a third program (Tech or College)
    if (Math.random() < 0.6) {
      programTypes.push(Math.random() < 0.5 ? ProgramType.TECH : ProgramType.COLLEGE);
    }

    for (let i = 0; i < programTypes.length; i++) {
      const programType = programTypes[i];
      // Assign to appropriate conference based on program order
      // First program goes to primary conference, others to secondary
      const conference = i === 0 ? conferences[0] : conferences[conferences.length > 1 ? 1 : 0];

      programs.push(generateCollegeProgram(state, programType, conference));
    }
  }

  return programs;
}

/**
 * Gets programs by conference
 */
export function getProgramsByConference(
  programs: CollegeProgram[],
  conference: Conference
): CollegeProgram[] {
  return programs.filter((p) => p.conference === conference);
}

/**
 * Gets programs by conference tier
 */
export function getProgramsByConferenceTier(
  programs: CollegeProgram[],
  tier: ConferenceTier
): CollegeProgram[] {
  return programs.filter((p) => p.conferenceTier === tier);
}

/**
 * Gets programs by prestige tier
 */
export function getProgramsByPrestigeTier(
  programs: CollegeProgram[],
  tier: PrestigeTier
): CollegeProgram[] {
  return programs.filter((p) => p.prestigeTier === tier);
}

/**
 * Gets a random program weighted by prestige
 */
export function getRandomProgramByPrestige(programs: CollegeProgram[]): CollegeProgram {
  // Weight selection toward higher prestige programs
  const weightedPrograms = programs.map((program) => ({
    value: program,
    weight: program.prestigeRating,
  }));

  return weightedRandom(weightedPrograms);
}

/**
 * Gets a program by ID
 */
export function getProgramById(programs: CollegeProgram[], id: string): CollegeProgram | undefined {
  return programs.find((p) => p.id === id);
}

/**
 * Gets programs by state
 */
export function getProgramsByState(programs: CollegeProgram[], state: string): CollegeProgram[] {
  return programs.filter((p) => p.state === state);
}

/**
 * Increments NFL alumni count for a program
 */
export function incrementNflAlumni(program: CollegeProgram): CollegeProgram {
  return {
    ...program,
    nflAlumniCount: program.nflAlumniCount + 1,
  };
}

/**
 * Validates a college program
 */
export function validateCollegeProgram(program: CollegeProgram): boolean {
  if (!program.id || typeof program.id !== 'string') return false;
  if (!program.name || typeof program.name !== 'string') return false;
  if (!program.abbreviation || typeof program.abbreviation !== 'string') return false;
  if (!program.state || typeof program.state !== 'string') return false;
  if (!Object.values(ProgramType).includes(program.programType)) return false;
  if (!Object.values(Conference).includes(program.conference)) return false;
  if (!Object.values(ConferenceTier).includes(program.conferenceTier)) return false;
  if (!Object.values(PrestigeTier).includes(program.prestigeTier)) return false;
  if (program.prestigeRating < 1 || program.prestigeRating > 100) return false;
  if (program.nflAlumniCount < 0) return false;

  return true;
}

/**
 * Summary statistics for generated programs
 */
export interface CollegeProgramSummary {
  totalPrograms: number;
  programsByConference: Record<Conference, number>;
  programsByConferenceTier: Record<ConferenceTier, number>;
  programsByPrestigeTier: Record<PrestigeTier, number>;
  averagePrestige: number;
}

/**
 * Gets summary statistics for programs
 */
export function getCollegeProgramSummary(programs: CollegeProgram[]): CollegeProgramSummary {
  const summary: CollegeProgramSummary = {
    totalPrograms: programs.length,
    programsByConference: {} as Record<Conference, number>,
    programsByConferenceTier: {} as Record<ConferenceTier, number>,
    programsByPrestigeTier: {} as Record<PrestigeTier, number>,
    averagePrestige: 0,
  };

  // Initialize counts
  for (const conf of Object.values(Conference)) {
    summary.programsByConference[conf] = 0;
  }
  for (const tier of Object.values(ConferenceTier)) {
    summary.programsByConferenceTier[tier] = 0;
  }
  for (const tier of Object.values(PrestigeTier)) {
    summary.programsByPrestigeTier[tier] = 0;
  }

  // Calculate counts
  let totalPrestige = 0;
  for (const program of programs) {
    summary.programsByConference[program.conference]++;
    summary.programsByConferenceTier[program.conferenceTier]++;
    summary.programsByPrestigeTier[program.prestigeTier]++;
    totalPrestige += program.prestigeRating;
  }

  summary.averagePrestige = programs.length > 0 ? totalPrestige / programs.length : 0;

  return summary;
}
