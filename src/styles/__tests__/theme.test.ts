/**
 * Tests for Theme constants
 */

import {
  theme,
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  commonStyles,
} from '../theme';

describe('Theme', () => {
  describe('colors', () => {
    it('should have primary colors defined', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.primaryLight).toBeDefined();
      expect(colors.primaryDark).toBeDefined();
    });

    it('should have secondary colors defined', () => {
      expect(colors.secondary).toBeDefined();
      expect(colors.secondaryLight).toBeDefined();
      expect(colors.secondaryDark).toBeDefined();
    });

    it('should have background colors defined', () => {
      expect(colors.background).toBeDefined();
      expect(colors.backgroundDark).toBeDefined();
      expect(colors.surface).toBeDefined();
      expect(colors.surfaceDark).toBeDefined();
    });

    it('should have text colors defined', () => {
      expect(colors.text).toBeDefined();
      expect(colors.textSecondary).toBeDefined();
      expect(colors.textLight).toBeDefined();
      expect(colors.textOnPrimary).toBeDefined();
      expect(colors.textOnDark).toBeDefined();
    });

    it('should have status colors defined', () => {
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
    });

    it('should have game-specific colors defined', () => {
      expect(colors.fieldGreen).toBeDefined();
      expect(colors.fieldLines).toBeDefined();
      expect(colors.endzone).toBeDefined();
      expect(colors.endzoneAway).toBeDefined();
      expect(colors.ballMarker).toBeDefined();
    });

    it('should have highlight colors defined', () => {
      expect(colors.scoring).toBeDefined();
      expect(colors.turnover).toBeDefined();
      expect(colors.bigPlay).toBeDefined();
    });

    it('should have valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      const rgbaColorRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;
      Object.values(colors).forEach((color) => {
        const isValidColor = hexColorRegex.test(color) || rgbaColorRegex.test(color);
        expect(isValidColor).toBe(true);
      });
    });
  });

  describe('spacing', () => {
    it('should have all spacing values defined', () => {
      expect(spacing.xxs).toBeDefined();
      expect(spacing.xs).toBeDefined();
      expect(spacing.sm).toBeDefined();
      expect(spacing.md).toBeDefined();
      expect(spacing.lg).toBeDefined();
      expect(spacing.xl).toBeDefined();
      expect(spacing.xxl).toBeDefined();
      expect(spacing.xxxl).toBeDefined();
    });

    it('should have increasing spacing values', () => {
      expect(spacing.xxs).toBeLessThan(spacing.xs);
      expect(spacing.xs).toBeLessThan(spacing.sm);
      expect(spacing.sm).toBeLessThan(spacing.md);
      expect(spacing.md).toBeLessThan(spacing.lg);
      expect(spacing.lg).toBeLessThan(spacing.xl);
      expect(spacing.xl).toBeLessThan(spacing.xxl);
      expect(spacing.xxl).toBeLessThan(spacing.xxxl);
    });

    it('should have positive number values', () => {
      Object.values(spacing).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('fontSize', () => {
    it('should have all fontSize values defined', () => {
      expect(fontSize.xs).toBeDefined();
      expect(fontSize.sm).toBeDefined();
      expect(fontSize.md).toBeDefined();
      expect(fontSize.lg).toBeDefined();
      expect(fontSize.xl).toBeDefined();
      expect(fontSize.xxl).toBeDefined();
      expect(fontSize.xxxl).toBeDefined();
      expect(fontSize.display).toBeDefined();
    });

    it('should have increasing font sizes', () => {
      expect(fontSize.xs).toBeLessThan(fontSize.sm);
      expect(fontSize.sm).toBeLessThan(fontSize.md);
      expect(fontSize.md).toBeLessThan(fontSize.lg);
      expect(fontSize.lg).toBeLessThan(fontSize.xl);
      expect(fontSize.xl).toBeLessThan(fontSize.xxl);
      expect(fontSize.xxl).toBeLessThan(fontSize.xxxl);
      expect(fontSize.xxxl).toBeLessThan(fontSize.display);
    });

    it('should have reasonable font size range', () => {
      expect(fontSize.xs).toBeGreaterThanOrEqual(8);
      expect(fontSize.display).toBeLessThanOrEqual(50);
    });
  });

  describe('fontWeight', () => {
    it('should have all font weights defined', () => {
      expect(fontWeight.normal).toBeDefined();
      expect(fontWeight.medium).toBeDefined();
      expect(fontWeight.semibold).toBeDefined();
      expect(fontWeight.bold).toBeDefined();
    });

    it('should have valid font weight strings', () => {
      expect(fontWeight.normal).toBe('400');
      expect(fontWeight.medium).toBe('500');
      expect(fontWeight.semibold).toBe('600');
      expect(fontWeight.bold).toBe('700');
    });
  });

  describe('borderRadius', () => {
    it('should have all border radius values defined', () => {
      expect(borderRadius.sm).toBeDefined();
      expect(borderRadius.md).toBeDefined();
      expect(borderRadius.lg).toBeDefined();
      expect(borderRadius.xl).toBeDefined();
      expect(borderRadius.full).toBeDefined();
    });

    it('should have increasing border radius values', () => {
      expect(borderRadius.sm).toBeLessThan(borderRadius.md);
      expect(borderRadius.md).toBeLessThan(borderRadius.lg);
      expect(borderRadius.lg).toBeLessThan(borderRadius.xl);
      expect(borderRadius.xl).toBeLessThan(borderRadius.full);
    });

    it('should have full radius for circular elements', () => {
      expect(borderRadius.full).toBe(9999);
    });
  });

  describe('shadows', () => {
    it('should have all shadow presets defined', () => {
      expect(shadows.sm).toBeDefined();
      expect(shadows.md).toBeDefined();
      expect(shadows.lg).toBeDefined();
    });

    it('should have valid shadow structure', () => {
      const validateShadow = (shadow: object) => {
        expect(shadow).toHaveProperty('shadowColor');
        expect(shadow).toHaveProperty('shadowOffset');
        expect(shadow).toHaveProperty('shadowOpacity');
        expect(shadow).toHaveProperty('shadowRadius');
        expect(shadow).toHaveProperty('elevation');
      };

      validateShadow(shadows.sm);
      validateShadow(shadows.md);
      validateShadow(shadows.lg);
    });

    it('should have increasing shadow intensity', () => {
      expect(shadows.sm.shadowRadius).toBeLessThan(shadows.md.shadowRadius);
      expect(shadows.md.shadowRadius).toBeLessThan(shadows.lg.shadowRadius);
      expect(shadows.sm.elevation).toBeLessThan(shadows.md.elevation);
      expect(shadows.md.elevation).toBeLessThan(shadows.lg.elevation);
    });
  });

  describe('commonStyles', () => {
    it('should have card style defined', () => {
      expect(commonStyles.card).toBeDefined();
      expect(commonStyles.card.backgroundColor).toBe(colors.surface);
      expect(commonStyles.card.borderRadius).toBe(borderRadius.md);
      expect(commonStyles.card.padding).toBe(spacing.md);
    });

    it('should have screenContainer style defined', () => {
      expect(commonStyles.screenContainer).toBeDefined();
      expect(commonStyles.screenContainer.flex).toBe(1);
      expect(commonStyles.screenContainer.backgroundColor).toBe(colors.background);
    });

    it('should have centerContent style defined', () => {
      expect(commonStyles.centerContent).toBeDefined();
      expect(commonStyles.centerContent.alignItems).toBe('center');
      expect(commonStyles.centerContent.justifyContent).toBe('center');
    });
  });

  describe('theme object', () => {
    it('should contain all theme sections', () => {
      expect(theme.colors).toBe(colors);
      expect(theme.spacing).toBe(spacing);
      expect(theme.fontSize).toBe(fontSize);
      expect(theme.fontWeight).toBe(fontWeight);
      expect(theme.borderRadius).toBe(borderRadius);
      expect(theme.shadows).toBe(shadows);
      expect(theme.commonStyles).toBe(commonStyles);
    });
  });
});
