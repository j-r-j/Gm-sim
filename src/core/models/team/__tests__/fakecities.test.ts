/**
 * NFL Cities Tests
 * Tests for exactly 32 teams, 4 per division, no duplicates
 * Real NFL cities with fictional nicknames
 */

import {
  FAKE_CITIES,
  ALL_CONFERENCES,
  ALL_DIVISIONS,
  getCityByAbbreviation,
  getCitiesByDivision,
  getCitiesByConference,
  validateNoDuplicateAbbreviations,
  validateDivisionSizes,
  getFullTeamName,
} from '../FakeCities';

describe('NFL Cities', () => {
  describe('Total Count', () => {
    it('should have exactly 32 teams', () => {
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

    it('should have abbreviations between 2-3 characters', () => {
      FAKE_CITIES.forEach((city) => {
        expect(city.abbreviation.length).toBeGreaterThanOrEqual(2);
        expect(city.abbreviation.length).toBeLessThanOrEqual(3);
      });
    });

    it('should find teams by abbreviation', () => {
      const city = getCityByAbbreviation('BUF');
      expect(city).toBeDefined();
      expect(city?.city).toBe('Buffalo');
    });

    it('should return undefined for unknown abbreviation', () => {
      const city = getCityByAbbreviation('XXX');
      expect(city).toBeUndefined();
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
    it('should include Buffalo Frontiersmen', () => {
      const team = FAKE_CITIES.find((c) => c.city === 'Buffalo' && c.nickname === 'Frontiersmen');
      expect(team).toBeDefined();
      expect(team?.conference).toBe('AFC');
      expect(team?.division).toBe('East');
    });

    it('should include Dallas Wranglers', () => {
      const team = FAKE_CITIES.find((c) => c.city === 'Dallas' && c.nickname === 'Wranglers');
      expect(team).toBeDefined();
      expect(team?.conference).toBe('NFC');
      expect(team?.division).toBe('East');
    });

    it('should include San Francisco Prospectors', () => {
      const team = FAKE_CITIES.find(
        (c) => c.city === 'San Francisco' && c.nickname === 'Prospectors'
      );
      expect(team).toBeDefined();
      expect(team?.conference).toBe('NFC');
      expect(team?.division).toBe('West');
    });

    it('should include Kansas City Monarchs', () => {
      const team = FAKE_CITIES.find((c) => c.city === 'Kansas City' && c.nickname === 'Monarchs');
      expect(team).toBeDefined();
      expect(team?.conference).toBe('AFC');
      expect(team?.division).toBe('West');
    });
  });

  describe('Uses Real NFL Cities', () => {
    it('should use real NFL city locations', () => {
      const cityNames = FAKE_CITIES.map((c) => c.city);
      expect(cityNames).toContain('Buffalo');
      expect(cityNames).toContain('Miami');
      expect(cityNames).toContain('Dallas');
      expect(cityNames).toContain('Chicago');
      expect(cityNames).toContain('Green Bay');
      expect(cityNames).toContain('Seattle');
    });
  });
});
