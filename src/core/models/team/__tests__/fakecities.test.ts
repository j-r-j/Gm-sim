/**
 * Fake Cities Tests
 * Tests for exactly 32 cities, 4 per division, no duplicates, and no real NFL cities
 */

import {
  FAKE_CITIES,
  REAL_NFL_CITIES,
  ALL_CONFERENCES,
  ALL_DIVISIONS,
  getCityByAbbreviation,
  getCitiesByDivision,
  getCitiesByConference,
  validateNoCitiesAreReal,
  validateNoDuplicateAbbreviations,
  validateDivisionSizes,
  getFullTeamName,
} from '../FakeCities';

describe('FakeCities', () => {
  describe('Total Count', () => {
    it('should have exactly 32 cities', () => {
      expect(FAKE_CITIES).toHaveLength(32);
    });
  });

  describe('Division Structure', () => {
    it('should have exactly 4 teams per division', () => {
      for (const conference of ALL_CONFERENCES) {
        for (const division of ALL_DIVISIONS) {
          const teams = getCitiesByDivision(conference, division);
          expect(teams).toHaveLength(4);
        }
      }
    });

    it('should pass validateDivisionSizes', () => {
      expect(validateDivisionSizes()).toBe(true);
    });

    it('should have 16 teams per conference', () => {
      const afcTeams = getCitiesByConference('AFC');
      const nfcTeams = getCitiesByConference('NFC');
      expect(afcTeams).toHaveLength(16);
      expect(nfcTeams).toHaveLength(16);
    });
  });

  describe('Abbreviations', () => {
    it('should have no duplicate abbreviations', () => {
      expect(validateNoDuplicateAbbreviations()).toBe(true);
    });

    it('should have all 3-letter abbreviations', () => {
      FAKE_CITIES.forEach((city) => {
        expect(city.abbreviation).toHaveLength(3);
      });
    });

    it('should find cities by abbreviation', () => {
      const city = getCityByAbbreviation('ATC');
      expect(city).toBeDefined();
      expect(city?.city).toBe('Atlantic City');
    });

    it('should return undefined for unknown abbreviation', () => {
      const city = getCityByAbbreviation('XXX');
      expect(city).toBeUndefined();
    });
  });

  describe('No Real NFL Cities', () => {
    it('should pass validateNoCitiesAreReal', () => {
      expect(validateNoCitiesAreReal()).toBe(true);
    });

    it('should not contain any real NFL city names', () => {
      const fakeCityNames = FAKE_CITIES.map((city) => city.city);

      REAL_NFL_CITIES.forEach((realCity) => {
        expect(fakeCityNames).not.toContain(realCity);
      });
    });

    it('should not include New York', () => {
      const hasNewYork = FAKE_CITIES.some((city) => city.city === 'New York');
      expect(hasNewYork).toBe(false);
    });

    it('should not include Los Angeles', () => {
      const hasLA = FAKE_CITIES.some((city) => city.city === 'Los Angeles');
      expect(hasLA).toBe(false);
    });

    it('should not include Chicago', () => {
      const hasChicago = FAKE_CITIES.some((city) => city.city === 'Chicago');
      expect(hasChicago).toBe(false);
    });

    it('should not include Dallas', () => {
      const hasDallas = FAKE_CITIES.some((city) => city.city === 'Dallas');
      expect(hasDallas).toBe(false);
    });
  });

  describe('City Properties', () => {
    it('should have valid conference values', () => {
      FAKE_CITIES.forEach((city) => {
        expect(['AFC', 'NFC']).toContain(city.conference);
      });
    });

    it('should have valid division values', () => {
      FAKE_CITIES.forEach((city) => {
        expect(['North', 'South', 'East', 'West']).toContain(city.division);
      });
    });

    it('should have valid market sizes', () => {
      FAKE_CITIES.forEach((city) => {
        expect(['small', 'medium', 'large']).toContain(city.marketSize);
      });
    });

    it('should have valid stadium types', () => {
      const validTypes = ['domeFixed', 'domeRetractable', 'outdoorWarm', 'outdoorCold'];
      FAKE_CITIES.forEach((city) => {
        expect(validTypes).toContain(city.stadiumType);
      });
    });

    it('should have valid latitudes', () => {
      FAKE_CITIES.forEach((city) => {
        expect(city.latitude).toBeGreaterThanOrEqual(-90);
        expect(city.latitude).toBeLessThanOrEqual(90);
      });
    });

    it('should have non-empty city names', () => {
      FAKE_CITIES.forEach((city) => {
        expect(city.city.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty nicknames', () => {
      FAKE_CITIES.forEach((city) => {
        expect(city.nickname.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getFullTeamName', () => {
    it('should return city and nickname combined', () => {
      const city = FAKE_CITIES[0];
      expect(getFullTeamName(city)).toBe(`${city.city} ${city.nickname}`);
    });
  });

  describe('getCitiesByDivision', () => {
    it('should return correct teams for AFC East', () => {
      const teams = getCitiesByDivision('AFC', 'East');
      expect(teams).toHaveLength(4);
      teams.forEach((team) => {
        expect(team.conference).toBe('AFC');
        expect(team.division).toBe('East');
      });
    });

    it('should return correct teams for NFC West', () => {
      const teams = getCitiesByDivision('NFC', 'West');
      expect(teams).toHaveLength(4);
      teams.forEach((team) => {
        expect(team.conference).toBe('NFC');
        expect(team.division).toBe('West');
      });
    });
  });

  describe('Market Size Distribution', () => {
    it('should have a mix of market sizes', () => {
      const small = FAKE_CITIES.filter((c) => c.marketSize === 'small');
      const medium = FAKE_CITIES.filter((c) => c.marketSize === 'medium');
      const large = FAKE_CITIES.filter((c) => c.marketSize === 'large');

      expect(small.length).toBeGreaterThan(0);
      expect(medium.length).toBeGreaterThan(0);
      expect(large.length).toBeGreaterThan(0);
    });
  });

  describe('Stadium Type Distribution', () => {
    it('should have a mix of stadium types', () => {
      const domeFixed = FAKE_CITIES.filter((c) => c.stadiumType === 'domeFixed');
      const domeRetractable = FAKE_CITIES.filter((c) => c.stadiumType === 'domeRetractable');
      const outdoorWarm = FAKE_CITIES.filter((c) => c.stadiumType === 'outdoorWarm');
      const outdoorCold = FAKE_CITIES.filter((c) => c.stadiumType === 'outdoorCold');

      expect(domeFixed.length).toBeGreaterThan(0);
      expect(domeRetractable.length).toBeGreaterThan(0);
      expect(outdoorWarm.length).toBeGreaterThan(0);
      expect(outdoorCold.length).toBeGreaterThan(0);
    });
  });

  describe('Known Teams Spot Check', () => {
    it('should include Atlantic City Sharks', () => {
      const sharks = FAKE_CITIES.find((c) => c.city === 'Atlantic City' && c.nickname === 'Sharks');
      expect(sharks).toBeDefined();
      expect(sharks?.conference).toBe('AFC');
      expect(sharks?.division).toBe('East');
    });

    it('should include Brooklyn Knights', () => {
      const knights = FAKE_CITIES.find((c) => c.city === 'Brooklyn' && c.nickname === 'Knights');
      expect(knights).toBeDefined();
      expect(knights?.conference).toBe('NFC');
      expect(knights?.division).toBe('East');
    });

    it('should include Honolulu Volcanoes', () => {
      const volcanoes = FAKE_CITIES.find((c) => c.city === 'Honolulu' && c.nickname === 'Volcanoes');
      expect(volcanoes).toBeDefined();
      expect(volcanoes?.conference).toBe('NFC');
      expect(volcanoes?.division).toBe('West');
    });

    it('should include Toronto Huskies', () => {
      const huskies = FAKE_CITIES.find((c) => c.city === 'Toronto' && c.nickname === 'Huskies');
      expect(huskies).toBeDefined();
      expect(huskies?.marketSize).toBe('large');
    });
  });
});
