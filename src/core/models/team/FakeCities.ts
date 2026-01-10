/**
 * Fake Cities Configuration
 * 32 fake cities to avoid NFL copyright
 * Grouped by conference and division
 */

import { StadiumType } from './Stadium';

/**
 * Conference types
 */
export type Conference = 'AFC' | 'NFC';

/**
 * Division types
 */
export type Division = 'North' | 'South' | 'East' | 'West';

/**
 * Market size categories
 */
export type MarketSize = 'small' | 'medium' | 'large';

/**
 * All conferences
 */
export const ALL_CONFERENCES: Conference[] = ['AFC', 'NFC'];

/**
 * All divisions
 */
export const ALL_DIVISIONS: Division[] = ['North', 'South', 'East', 'West'];

/**
 * All market sizes
 */
export const ALL_MARKET_SIZES: MarketSize[] = ['small', 'medium', 'large'];

/**
 * Fake city configuration
 */
export interface FakeCity {
  city: string;
  nickname: string;
  abbreviation: string;
  conference: Conference;
  division: Division;
  marketSize: MarketSize;
  stadiumType: StadiumType;
  latitude: number;
}

/**
 * 32 fake cities for the league
 */
export const FAKE_CITIES: FakeCity[] = [
  // AFC East
  {
    city: 'Atlantic City',
    nickname: 'Sharks',
    abbreviation: 'ATC',
    conference: 'AFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 39.4,
  },
  {
    city: 'Providence',
    nickname: 'Colonials',
    abbreviation: 'PRV',
    conference: 'AFC',
    division: 'East',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 41.8,
  },
  {
    city: 'Hartford',
    nickname: 'Whalers',
    abbreviation: 'HFD',
    conference: 'AFC',
    division: 'East',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 41.8,
  },
  {
    city: 'Norfolk',
    nickname: 'Admirals',
    abbreviation: 'NFK',
    conference: 'AFC',
    division: 'East',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 36.9,
  },

  // AFC North
  {
    city: 'Columbus',
    nickname: 'Pioneers',
    abbreviation: 'CLB',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 40.0,
  },
  {
    city: 'Milwaukee',
    nickname: 'Brewmasters',
    abbreviation: 'MIL',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 43.0,
  },
  {
    city: 'Louisville',
    nickname: 'Colonels',
    abbreviation: 'LOU',
    conference: 'AFC',
    division: 'North',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 38.3,
  },
  {
    city: 'Grand Rapids',
    nickname: 'Lumberjacks',
    abbreviation: 'GRP',
    conference: 'AFC',
    division: 'North',
    marketSize: 'small',
    stadiumType: 'domeFixed',
    latitude: 42.9,
  },

  // AFC South
  {
    city: 'Austin',
    nickname: 'Outlaws',
    abbreviation: 'AUS',
    conference: 'AFC',
    division: 'South',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 30.3,
  },
  {
    city: 'San Antonio',
    nickname: 'Spurs',
    abbreviation: 'SAT',
    conference: 'AFC',
    division: 'South',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 29.4,
  },
  {
    city: 'Birmingham',
    nickname: 'Ironmen',
    abbreviation: 'BHM',
    conference: 'AFC',
    division: 'South',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 33.5,
  },
  {
    city: 'Memphis',
    nickname: 'Blues',
    abbreviation: 'MEM',
    conference: 'AFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 35.1,
  },

  // AFC West
  {
    city: 'Portland',
    nickname: 'Timbers',
    abbreviation: 'POR',
    conference: 'AFC',
    division: 'West',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 45.5,
  },
  {
    city: 'Salt Lake',
    nickname: 'Mountaineers',
    abbreviation: 'SLC',
    conference: 'AFC',
    division: 'West',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 40.8,
  },
  {
    city: 'Sacramento',
    nickname: 'Gold Rush',
    abbreviation: 'SAC',
    conference: 'AFC',
    division: 'West',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 38.6,
  },
  {
    city: 'Albuquerque',
    nickname: 'Coyotes',
    abbreviation: 'ABQ',
    conference: 'AFC',
    division: 'West',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 35.1,
  },

  // NFC East
  {
    city: 'Brooklyn',
    nickname: 'Knights',
    abbreviation: 'BKN',
    conference: 'NFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 40.7,
  },
  {
    city: 'Richmond',
    nickname: 'Rebels',
    abbreviation: 'RIC',
    conference: 'NFC',
    division: 'East',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 37.5,
  },
  {
    city: 'Raleigh',
    nickname: 'Oaks',
    abbreviation: 'RAL',
    conference: 'NFC',
    division: 'East',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 35.8,
  },
  {
    city: 'Charleston',
    nickname: 'Captains',
    abbreviation: 'CHS',
    conference: 'NFC',
    division: 'East',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 32.8,
  },

  // NFC North
  {
    city: 'Toronto',
    nickname: 'Huskies',
    abbreviation: 'TOR',
    conference: 'NFC',
    division: 'North',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 43.7,
  },
  {
    city: 'Omaha',
    nickname: 'Plainsmen',
    abbreviation: 'OMA',
    conference: 'NFC',
    division: 'North',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 41.3,
  },
  {
    city: 'St. Louis',
    nickname: 'Archers',
    abbreviation: 'STL',
    conference: 'NFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 38.6,
  },
  {
    city: 'Indianapolis',
    nickname: 'Racers',
    abbreviation: 'IND',
    conference: 'NFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 39.8,
  },

  // NFC South
  {
    city: 'Orlando',
    nickname: 'Magic',
    abbreviation: 'ORL',
    conference: 'NFC',
    division: 'South',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 28.5,
  },
  {
    city: 'Savannah',
    nickname: 'Tides',
    abbreviation: 'SAV',
    conference: 'NFC',
    division: 'South',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 32.1,
  },
  {
    city: 'New Orleans',
    nickname: 'Voodoo',
    abbreviation: 'NOL',
    conference: 'NFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 30.0,
  },
  {
    city: 'Mobile',
    nickname: 'Mariners',
    abbreviation: 'MOB',
    conference: 'NFC',
    division: 'South',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 30.7,
  },

  // NFC West
  {
    city: 'San Diego',
    nickname: 'Surf',
    abbreviation: 'SDG',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'outdoorWarm',
    latitude: 32.7,
  },
  {
    city: 'Las Vegas',
    nickname: 'Aces',
    abbreviation: 'LVG',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 36.2,
  },
  {
    city: 'Phoenix',
    nickname: 'Firebirds',
    abbreviation: 'PHX',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 33.4,
  },
  {
    city: 'Honolulu',
    nickname: 'Volcanoes',
    abbreviation: 'HNL',
    conference: 'NFC',
    division: 'West',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 21.3,
  },
];

/**
 * Real NFL cities that should NOT be used
 */
export const REAL_NFL_CITIES: string[] = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Dallas',
  'Houston',
  'Philadelphia',
  'Washington',
  'Miami',
  'Atlanta',
  'Boston',
  'Denver',
  'Cleveland',
  'Pittsburgh',
  'Baltimore',
  'Cincinnati',
  'Kansas City',
  'Tampa Bay',
  'Green Bay',
  'Minnesota',
  'Detroit',
  'Seattle',
  'Arizona',
  'Carolina',
  'Jacksonville',
  'Tennessee',
  'Buffalo',
  'San Francisco',
];

/**
 * Gets a city by abbreviation
 */
export function getCityByAbbreviation(abbreviation: string): FakeCity | undefined {
  return FAKE_CITIES.find((city) => city.abbreviation === abbreviation);
}

/**
 * Gets all cities in a division
 */
export function getCitiesByDivision(conference: Conference, division: Division): FakeCity[] {
  return FAKE_CITIES.filter((city) => city.conference === conference && city.division === division);
}

/**
 * Gets all cities in a conference
 */
export function getCitiesByConference(conference: Conference): FakeCity[] {
  return FAKE_CITIES.filter((city) => city.conference === conference);
}

/**
 * Gets all cities by market size
 */
export function getCitiesByMarketSize(marketSize: MarketSize): FakeCity[] {
  return FAKE_CITIES.filter((city) => city.marketSize === marketSize);
}

/**
 * Validates that all cities are fictional (not real NFL cities)
 */
export function validateNoCitiesAreReal(): boolean {
  return !FAKE_CITIES.some((fakeCity) => REAL_NFL_CITIES.includes(fakeCity.city));
}

/**
 * Validates that there are no duplicate abbreviations
 */
export function validateNoDuplicateAbbreviations(): boolean {
  const abbreviations = FAKE_CITIES.map((city) => city.abbreviation);
  const uniqueAbbreviations = new Set(abbreviations);
  return abbreviations.length === uniqueAbbreviations.size;
}

/**
 * Validates that each division has exactly 4 teams
 */
export function validateDivisionSizes(): boolean {
  for (const conference of ALL_CONFERENCES) {
    for (const division of ALL_DIVISIONS) {
      const teams = getCitiesByDivision(conference, division);
      if (teams.length !== 4) return false;
    }
  }
  return true;
}

/**
 * Gets the full team name for a city
 */
export function getFullTeamName(city: FakeCity): string {
  return `${city.city} ${city.nickname}`;
}

/**
 * Gets division display name
 */
export function getDivisionDisplayName(conference: Conference, division: Division): string {
  return `${conference} ${division}`;
}
