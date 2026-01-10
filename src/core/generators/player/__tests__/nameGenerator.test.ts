import {
  generateFirstName,
  generateLastName,
  generateFullName,
  createNameGenerator,
  FIRST_NAMES,
  LAST_NAMES,
} from '../NameGenerator';

describe('NameGenerator', () => {
  describe('name pools', () => {
    it('should have at least 200 first names', () => {
      expect(FIRST_NAMES.length).toBeGreaterThanOrEqual(200);
    });

    it('should have at least 300 last names', () => {
      expect(LAST_NAMES.length).toBeGreaterThanOrEqual(300);
    });

    it('should have no duplicate first names', () => {
      const uniqueFirstNames = new Set(FIRST_NAMES);
      expect(uniqueFirstNames.size).toBe(FIRST_NAMES.length);
    });

    it('should have no duplicate last names', () => {
      const uniqueLastNames = new Set(LAST_NAMES);
      expect(uniqueLastNames.size).toBe(LAST_NAMES.length);
    });

    it('should have non-empty strings for all first names', () => {
      for (const name of FIRST_NAMES) {
        expect(name.length).toBeGreaterThan(0);
        expect(name.trim()).toBe(name);
      }
    });

    it('should have non-empty strings for all last names', () => {
      for (const name of LAST_NAMES) {
        expect(name.length).toBeGreaterThan(0);
        expect(name.trim()).toBe(name);
      }
    });
  });

  describe('generateFirstName', () => {
    it('should return a valid first name', () => {
      for (let i = 0; i < 50; i++) {
        const name = generateFirstName();
        expect(FIRST_NAMES).toContain(name);
      }
    });

    it('should return different names over multiple calls', () => {
      const names = new Set<string>();
      for (let i = 0; i < 100; i++) {
        names.add(generateFirstName());
      }
      // Should have some variety
      expect(names.size).toBeGreaterThan(30);
    });
  });

  describe('generateLastName', () => {
    it('should return a valid last name', () => {
      for (let i = 0; i < 50; i++) {
        const name = generateLastName();
        expect(LAST_NAMES).toContain(name);
      }
    });

    it('should return different names over multiple calls', () => {
      const names = new Set<string>();
      for (let i = 0; i < 100; i++) {
        names.add(generateLastName());
      }
      // Should have some variety
      expect(names.size).toBeGreaterThan(30);
    });
  });

  describe('generateFullName', () => {
    it('should return both first and last name', () => {
      const { firstName, lastName } = generateFullName();
      expect(firstName).toBeTruthy();
      expect(lastName).toBeTruthy();
    });

    it('should return valid names from the pools', () => {
      for (let i = 0; i < 50; i++) {
        const { firstName, lastName } = generateFullName();
        expect(FIRST_NAMES).toContain(firstName);
        expect(LAST_NAMES).toContain(lastName);
      }
    });
  });

  describe('createNameGenerator', () => {
    it('should create a generator with all methods', () => {
      const generator = createNameGenerator();
      expect(typeof generator.generateFirstName).toBe('function');
      expect(typeof generator.generateLastName).toBe('function');
      expect(typeof generator.generateFullName).toBe('function');
    });

    it('should generate valid names using the generator instance', () => {
      const generator = createNameGenerator();

      const firstName = generator.generateFirstName();
      expect(FIRST_NAMES).toContain(firstName);

      const lastName = generator.generateLastName();
      expect(LAST_NAMES).toContain(lastName);

      const fullName = generator.generateFullName();
      expect(FIRST_NAMES).toContain(fullName.firstName);
      expect(LAST_NAMES).toContain(fullName.lastName);
    });
  });

  describe('name diversity', () => {
    it('should have diverse first name categories', () => {
      // Check for presence of different naming traditions
      const hasTraditional = FIRST_NAMES.some((n) => ['James', 'John', 'Michael'].includes(n));
      const hasModern = FIRST_NAMES.some((n) => ['Jaylen', 'Brayden', 'Tyler'].includes(n));
      const hasHispanic = FIRST_NAMES.some((n) => ['Carlos', 'Miguel', 'Jose'].includes(n));
      const hasAfricanAmerican = FIRST_NAMES.some((n) =>
        ['Darnell', 'Malik', 'DeAndre'].includes(n)
      );

      expect(hasTraditional).toBe(true);
      expect(hasModern).toBe(true);
      expect(hasHispanic).toBe(true);
      expect(hasAfricanAmerican).toBe(true);
    });

    it('should have diverse last name categories', () => {
      // Check for presence of different surname origins
      const hasCommon = LAST_NAMES.some((n) => ['Smith', 'Johnson', 'Williams'].includes(n));
      const hasHispanic = LAST_NAMES.some((n) => ['Garcia', 'Rodriguez', 'Martinez'].includes(n));
      const hasIrish = LAST_NAMES.some((n) => ['Murphy', 'Sullivan', 'Kelly'].includes(n));
      const hasPolynesian = LAST_NAMES.some((n) => ['Polamalu', 'Seau', 'Lofa'].includes(n));

      expect(hasCommon).toBe(true);
      expect(hasHispanic).toBe(true);
      expect(hasIrish).toBe(true);
      expect(hasPolynesian).toBe(true);
    });
  });

  describe('batch generation uniqueness', () => {
    it('should generate mostly unique full names in a batch', () => {
      const fullNames = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const { firstName, lastName } = generateFullName();
        fullNames.add(`${firstName} ${lastName}`);
      }

      // With 200+ first names and 300+ last names, 100 names should be mostly unique
      // Allow for a small number of collisions (less than 5%)
      expect(fullNames.size).toBeGreaterThan(95);
    });
  });
});
