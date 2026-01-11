import {
  generateAllCollegePrograms,
  generateCollegeProgram,
  getProgramsByConference,
  getProgramsByConferenceTier,
  getProgramsByPrestigeTier,
  getRandomProgramByPrestige,
  getProgramById,
  getProgramsByState,
  incrementNflAlumni,
  validateCollegeProgram,
  getCollegeProgramSummary,
  Conference,
  ConferenceTier,
  PrestigeTier,
  ProgramType,
  CollegeProgram,
} from '../CollegeProgramGenerator';

describe('CollegeProgramGenerator', () => {
  describe('generateAllCollegePrograms', () => {
    it('should generate approximately 130 programs', () => {
      const programs = generateAllCollegePrograms();
      // Each of 50 states gets 2-3 programs
      expect(programs.length).toBeGreaterThanOrEqual(100);
      expect(programs.length).toBeLessThanOrEqual(160);
    });

    it('should generate valid programs', () => {
      const programs = generateAllCollegePrograms();
      for (const program of programs) {
        expect(validateCollegeProgram(program)).toBe(true);
      }
    });

    it('should include all conference types', () => {
      const programs = generateAllCollegePrograms();
      const conferences = new Set(programs.map((p) => p.conference));

      // Should have programs in multiple conferences
      expect(conferences.size).toBeGreaterThanOrEqual(6);
    });

    it('should include all prestige tiers', () => {
      const programs = generateAllCollegePrograms();
      const prestigeTiers = new Set(programs.map((p) => p.prestigeTier));

      // Should have programs across prestige levels
      expect(prestigeTiers.size).toBeGreaterThanOrEqual(3);
    });

    it('should use state-based naming convention', () => {
      const programs = generateAllCollegePrograms();

      for (const program of programs) {
        // All names should include the state name
        expect(program.name.toLowerCase()).toContain(program.state.toLowerCase());
      }
    });
  });

  describe('generateCollegeProgram', () => {
    it('should generate a valid program with given parameters', () => {
      const program = generateCollegeProgram(
        'Texas',
        ProgramType.STATE_OF,
        Conference.SOUTHERN_CONFERENCE
      );

      expect(validateCollegeProgram(program)).toBe(true);
      expect(program.state).toBe('Texas');
      expect(program.programType).toBe(ProgramType.STATE_OF);
      expect(program.conference).toBe(Conference.SOUTHERN_CONFERENCE);
      expect(program.name).toBe('State of Texas');
    });

    it('should assign correct conference tier', () => {
      const powerProgram = generateCollegeProgram(
        'Ohio',
        ProgramType.STATE_OF,
        Conference.CENTRAL_CONFERENCE
      );
      expect(powerProgram.conferenceTier).toBe(ConferenceTier.POWER);

      const g5Program = generateCollegeProgram(
        'Nevada',
        ProgramType.UNIVERSITY_OF,
        Conference.MOUNTAIN_CONFERENCE
      );
      expect(g5Program.conferenceTier).toBe(ConferenceTier.GROUP_OF_FIVE);

      const fcsProgram = generateCollegeProgram(
        'Montana',
        ProgramType.TECH,
        Conference.FRONTIER_CONFERENCE
      );
      expect(fcsProgram.conferenceTier).toBe(ConferenceTier.FCS);
    });

    it('should generate prestige rating within tier range', () => {
      const programs: CollegeProgram[] = [];
      for (let i = 0; i < 50; i++) {
        programs.push(
          generateCollegeProgram('California', ProgramType.STATE_OF, Conference.PACIFIC_CONFERENCE)
        );
      }

      for (const program of programs) {
        expect(program.prestigeRating).toBeGreaterThanOrEqual(1);
        expect(program.prestigeRating).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('getProgramsByConference', () => {
    it('should filter programs by conference', () => {
      const programs = generateAllCollegePrograms();
      const southernPrograms = getProgramsByConference(programs, Conference.SOUTHERN_CONFERENCE);

      expect(southernPrograms.length).toBeGreaterThan(0);
      for (const program of southernPrograms) {
        expect(program.conference).toBe(Conference.SOUTHERN_CONFERENCE);
      }
    });
  });

  describe('getProgramsByConferenceTier', () => {
    it('should filter programs by conference tier', () => {
      const programs = generateAllCollegePrograms();
      const powerPrograms = getProgramsByConferenceTier(programs, ConferenceTier.POWER);

      expect(powerPrograms.length).toBeGreaterThan(0);
      for (const program of powerPrograms) {
        expect(program.conferenceTier).toBe(ConferenceTier.POWER);
      }
    });
  });

  describe('getProgramsByPrestigeTier', () => {
    it('should filter programs by prestige tier', () => {
      const programs = generateAllCollegePrograms();
      const elitePrograms = getProgramsByPrestigeTier(programs, PrestigeTier.ELITE);

      for (const program of elitePrograms) {
        expect(program.prestigeTier).toBe(PrestigeTier.ELITE);
      }
    });
  });

  describe('getRandomProgramByPrestige', () => {
    it('should return a program', () => {
      const programs = generateAllCollegePrograms();
      const program = getRandomProgramByPrestige(programs);

      expect(program).toBeDefined();
      expect(validateCollegeProgram(program)).toBe(true);
    });

    it('should favor higher prestige programs over many selections', () => {
      const programs = generateAllCollegePrograms();
      const selections: CollegeProgram[] = [];

      for (let i = 0; i < 100; i++) {
        selections.push(getRandomProgramByPrestige(programs));
      }

      const avgPrestige =
        selections.reduce((sum, p) => sum + p.prestigeRating, 0) / selections.length;
      const overallAvg = programs.reduce((sum, p) => sum + p.prestigeRating, 0) / programs.length;

      // Weighted selection should have higher average than uniform
      expect(avgPrestige).toBeGreaterThan(overallAvg - 10);
    });
  });

  describe('getProgramById', () => {
    it('should find program by ID', () => {
      const programs = generateAllCollegePrograms();
      const targetProgram = programs[5];

      const found = getProgramById(programs, targetProgram.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(targetProgram.id);
    });

    it('should return undefined for unknown ID', () => {
      const programs = generateAllCollegePrograms();
      const found = getProgramById(programs, 'unknown-id');

      expect(found).toBeUndefined();
    });
  });

  describe('getProgramsByState', () => {
    it('should find programs by state', () => {
      const programs = generateAllCollegePrograms();
      const texasPrograms = getProgramsByState(programs, 'Texas');

      expect(texasPrograms.length).toBeGreaterThanOrEqual(2);
      for (const program of texasPrograms) {
        expect(program.state).toBe('Texas');
      }
    });
  });

  describe('incrementNflAlumni', () => {
    it('should increment NFL alumni count', () => {
      const program = generateCollegeProgram(
        'Ohio',
        ProgramType.STATE_OF,
        Conference.CENTRAL_CONFERENCE
      );

      expect(program.nflAlumniCount).toBe(0);

      const updated = incrementNflAlumni(program);
      expect(updated.nflAlumniCount).toBe(1);

      const updated2 = incrementNflAlumni(updated);
      expect(updated2.nflAlumniCount).toBe(2);
    });

    it('should not mutate original program', () => {
      const program = generateCollegeProgram(
        'Ohio',
        ProgramType.STATE_OF,
        Conference.CENTRAL_CONFERENCE
      );

      incrementNflAlumni(program);
      expect(program.nflAlumniCount).toBe(0);
    });
  });

  describe('validateCollegeProgram', () => {
    it('should validate correct programs', () => {
      const program = generateCollegeProgram(
        'Florida',
        ProgramType.STATE_OF,
        Conference.SOUTHERN_CONFERENCE
      );

      expect(validateCollegeProgram(program)).toBe(true);
    });

    it('should reject invalid programs', () => {
      const invalidProgram = {
        id: '',
        name: 'Test',
        abbreviation: 'TST',
        state: 'Test',
        programType: ProgramType.STATE_OF,
        conference: Conference.SOUTHERN_CONFERENCE,
        conferenceTier: ConferenceTier.POWER,
        prestigeTier: PrestigeTier.HIGH,
        prestigeRating: 75,
        nflAlumniCount: 0,
      };

      expect(validateCollegeProgram(invalidProgram)).toBe(false);
    });

    it('should reject prestige rating out of range', () => {
      const programs = generateAllCollegePrograms();
      const invalidProgram = {
        ...programs[0],
        prestigeRating: 150,
      };

      expect(validateCollegeProgram(invalidProgram)).toBe(false);
    });
  });

  describe('getCollegeProgramSummary', () => {
    it('should provide accurate summary statistics', () => {
      const programs = generateAllCollegePrograms();
      const summary = getCollegeProgramSummary(programs);

      expect(summary.totalPrograms).toBe(programs.length);
      expect(summary.averagePrestige).toBeGreaterThan(0);
      expect(summary.averagePrestige).toBeLessThanOrEqual(100);

      // Verify counts add up
      let conferenceTotal = 0;
      for (const count of Object.values(summary.programsByConference)) {
        conferenceTotal += count;
      }
      expect(conferenceTotal).toBe(programs.length);

      let tierTotal = 0;
      for (const count of Object.values(summary.programsByConferenceTier)) {
        tierTotal += count;
      }
      expect(tierTotal).toBe(programs.length);
    });
  });
});
