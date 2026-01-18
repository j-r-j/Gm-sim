/**
 * NFL Cities Configuration
 * 32 teams with real NFL cities and fictional nicknames
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
 * NFL city configuration
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
 * 32 teams with real NFL cities and fictional nicknames
 */
export const FAKE_CITIES: FakeCity[] = [
  // AFC East
  {
    city: 'Buffalo',
    nickname: 'Frontiersmen',
    abbreviation: 'BUF',
    conference: 'AFC',
    division: 'East',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 42.9,
  },
  {
    city: 'Miami',
    nickname: 'Sharks',
    abbreviation: 'MIA',
    conference: 'AFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorWarm',
    latitude: 25.8,
  },
  {
    city: 'New England',
    nickname: 'Colonials',
    abbreviation: 'NE',
    conference: 'AFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 42.1,
  },
  {
    city: 'New York',
    nickname: 'Aviators',
    abbreviation: 'NYJ',
    conference: 'AFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 40.8,
  },

  // AFC North
  {
    city: 'Baltimore',
    nickname: 'Blackbirds',
    abbreviation: 'BAL',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 39.3,
  },
  {
    city: 'Cincinnati',
    nickname: 'Tigers',
    abbreviation: 'CIN',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 39.1,
  },
  {
    city: 'Cleveland',
    nickname: 'Bulldogs',
    abbreviation: 'CLE',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 41.5,
  },
  {
    city: 'Pittsburgh',
    nickname: 'Ironmen',
    abbreviation: 'PIT',
    conference: 'AFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 40.4,
  },

  // AFC South
  {
    city: 'Houston',
    nickname: 'Wranglers',
    abbreviation: 'HOU',
    conference: 'AFC',
    division: 'South',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 29.8,
  },
  {
    city: 'Indianapolis',
    nickname: 'Stallions',
    abbreviation: 'IND',
    conference: 'AFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'domeRetractable',
    latitude: 39.8,
  },
  {
    city: 'Jacksonville',
    nickname: 'Panthers',
    abbreviation: 'JAX',
    conference: 'AFC',
    division: 'South',
    marketSize: 'small',
    stadiumType: 'outdoorWarm',
    latitude: 30.3,
  },
  {
    city: 'Tennessee',
    nickname: 'Olympians',
    abbreviation: 'TEN',
    conference: 'AFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 36.2,
  },

  // AFC West
  {
    city: 'Denver',
    nickname: 'Mustangs',
    abbreviation: 'DEN',
    conference: 'AFC',
    division: 'West',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 39.7,
  },
  {
    city: 'Kansas City',
    nickname: 'Monarchs',
    abbreviation: 'KC',
    conference: 'AFC',
    division: 'West',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 39.1,
  },
  {
    city: 'Las Vegas',
    nickname: 'Outlaws',
    abbreviation: 'LV',
    conference: 'AFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 36.1,
  },
  {
    city: 'Los Angeles',
    nickname: 'Bolts',
    abbreviation: 'LAC',
    conference: 'AFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 33.9,
  },

  // NFC East
  {
    city: 'Dallas',
    nickname: 'Wranglers',
    abbreviation: 'DAL',
    conference: 'NFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 32.7,
  },
  {
    city: 'New York',
    nickname: 'Titans',
    abbreviation: 'NYG',
    conference: 'NFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 40.8,
  },
  {
    city: 'Philadelphia',
    nickname: 'Falcons',
    abbreviation: 'PHI',
    conference: 'NFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 39.9,
  },
  {
    city: 'Washington',
    nickname: 'Generals',
    abbreviation: 'WAS',
    conference: 'NFC',
    division: 'East',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 38.9,
  },

  // NFC North
  {
    city: 'Chicago',
    nickname: 'Grizzlies',
    abbreviation: 'CHI',
    conference: 'NFC',
    division: 'North',
    marketSize: 'large',
    stadiumType: 'outdoorCold',
    latitude: 41.9,
  },
  {
    city: 'Detroit',
    nickname: 'Cougars',
    abbreviation: 'DET',
    conference: 'NFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 42.3,
  },
  {
    city: 'Green Bay',
    nickname: 'Lumberjacks',
    abbreviation: 'GB',
    conference: 'NFC',
    division: 'North',
    marketSize: 'small',
    stadiumType: 'outdoorCold',
    latitude: 44.5,
  },
  {
    city: 'Minnesota',
    nickname: 'Norsemen',
    abbreviation: 'MIN',
    conference: 'NFC',
    division: 'North',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 44.9,
  },

  // NFC South
  {
    city: 'Atlanta',
    nickname: 'Hawks',
    abbreviation: 'ATL',
    conference: 'NFC',
    division: 'South',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 33.8,
  },
  {
    city: 'Carolina',
    nickname: 'Cougars',
    abbreviation: 'CAR',
    conference: 'NFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 35.2,
  },
  {
    city: 'New Orleans',
    nickname: 'Voodoo',
    abbreviation: 'NO',
    conference: 'NFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'domeFixed',
    latitude: 30.0,
  },
  {
    city: 'Tampa Bay',
    nickname: 'Pirates',
    abbreviation: 'TB',
    conference: 'NFC',
    division: 'South',
    marketSize: 'medium',
    stadiumType: 'outdoorWarm',
    latitude: 27.9,
  },

  // NFC West
  {
    city: 'Arizona',
    nickname: 'Firebirds',
    abbreviation: 'ARI',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeRetractable',
    latitude: 33.5,
  },
  {
    city: 'Los Angeles',
    nickname: 'Chargers',
    abbreviation: 'LAR',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'domeFixed',
    latitude: 33.9,
  },
  {
    city: 'San Francisco',
    nickname: 'Prospectors',
    abbreviation: 'SF',
    conference: 'NFC',
    division: 'West',
    marketSize: 'large',
    stadiumType: 'outdoorWarm',
    latitude: 37.4,
  },
  {
    city: 'Seattle',
    nickname: 'Ospreys',
    abbreviation: 'SEA',
    conference: 'NFC',
    division: 'West',
    marketSize: 'medium',
    stadiumType: 'outdoorCold',
    latitude: 47.6,
  },
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
