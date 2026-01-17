/**
 * FaceGenerator - Deterministic face generation utility
 * Generates unique face features based on a seed (player/coach ID)
 *
 * Design: Gamified cartoon-style faces following brand guidelines
 */

/**
 * Face feature configuration
 */
export interface FaceFeatures {
  /** Skin tone index (0-5) */
  skinTone: number;
  /** Face shape index (0-3) */
  faceShape: number;
  /** Hair style index (0-7) */
  hairStyle: number;
  /** Hair color index (0-5) */
  hairColor: number;
  /** Eye style index (0-3) */
  eyeStyle: number;
  /** Eyebrow style index (0-3) */
  eyebrowStyle: number;
  /** Facial hair style index (0-5, 0 = none) */
  facialHair: number;
  /** Expression index (0-3) */
  expression: number;
  /** Accessory index (0-4, 0 = none) - helmets, headbands, etc. */
  accessory: number;
}

/**
 * Skin tone palette - diverse range
 */
export const SKIN_TONES = [
  '#FFDBB4', // Light
  '#EDB98A', // Light tan
  '#D08B5B', // Medium
  '#AE5D29', // Medium dark
  '#8D5524', // Dark
  '#614335', // Very dark
] as const;

/**
 * Hair color palette
 */
export const HAIR_COLORS = [
  '#090806', // Black
  '#2C222B', // Dark brown
  '#71635A', // Brown
  '#B7A69E', // Light brown/dirty blonde
  '#D6C4C2', // Blonde
  '#CABFB1', // Gray/Silver
] as const;

/**
 * Face shape configurations
 * Each defines proportions for the face shape
 */
export const FACE_SHAPES = [
  { name: 'round', widthRatio: 1.0, heightRatio: 1.0, borderRadius: 50 },
  { name: 'oval', widthRatio: 0.9, heightRatio: 1.05, borderRadius: 50 },
  { name: 'square', widthRatio: 1.0, heightRatio: 0.95, borderRadius: 35 },
  { name: 'heart', widthRatio: 0.95, heightRatio: 1.0, borderRadius: 45 },
] as const;

/**
 * Hair style configurations
 * Defines the shape and positioning of hair
 */
export const HAIR_STYLES = [
  { name: 'short', topHeight: 0.15, sideWidth: 0.05, hasTop: true, hasSides: true },
  { name: 'buzzcut', topHeight: 0.08, sideWidth: 0.03, hasTop: true, hasSides: true },
  { name: 'medium', topHeight: 0.25, sideWidth: 0.08, hasTop: true, hasSides: true },
  { name: 'long', topHeight: 0.3, sideWidth: 0.12, hasTop: true, hasSides: true },
  { name: 'mohawk', topHeight: 0.35, sideWidth: 0, hasTop: true, hasSides: false },
  { name: 'bald', topHeight: 0, sideWidth: 0, hasTop: false, hasSides: false },
  { name: 'afro', topHeight: 0.4, sideWidth: 0.2, hasTop: true, hasSides: true },
  { name: 'fade', topHeight: 0.2, sideWidth: 0.02, hasTop: true, hasSides: true },
] as const;

/**
 * Eye style configurations
 */
export const EYE_STYLES = [
  { name: 'normal', sizeRatio: 1.0, shape: 'round' },
  { name: 'wide', sizeRatio: 1.2, shape: 'round' },
  { name: 'narrow', sizeRatio: 0.8, shape: 'oval' },
  { name: 'almond', sizeRatio: 0.9, shape: 'almond' },
] as const;

/**
 * Eyebrow style configurations
 */
export const EYEBROW_STYLES = [
  { name: 'normal', thickness: 1.0, angle: 0 },
  { name: 'thick', thickness: 1.5, angle: 0 },
  { name: 'arched', thickness: 1.0, angle: 5 },
  { name: 'flat', thickness: 1.2, angle: -3 },
] as const;

/**
 * Facial hair configurations
 */
export const FACIAL_HAIR_STYLES = [
  { name: 'none', hasBeard: false, hasMustache: false, stubble: false },
  { name: 'stubble', hasBeard: false, hasMustache: false, stubble: true },
  { name: 'mustache', hasBeard: false, hasMustache: true, stubble: false },
  { name: 'goatee', hasBeard: true, hasMustache: true, stubble: false, beardSize: 'small' },
  { name: 'beard', hasBeard: true, hasMustache: true, stubble: false, beardSize: 'medium' },
  { name: 'fullBeard', hasBeard: true, hasMustache: true, stubble: false, beardSize: 'large' },
] as const;

/**
 * Expression configurations (mouth styles)
 */
export const EXPRESSIONS = [
  { name: 'neutral', mouthCurve: 0, mouthWidth: 1.0 },
  { name: 'slight_smile', mouthCurve: 5, mouthWidth: 1.1 },
  { name: 'serious', mouthCurve: -2, mouthWidth: 0.9 },
  { name: 'confident', mouthCurve: 3, mouthWidth: 1.2 },
] as const;

/**
 * Accessory configurations (sports-themed)
 */
export const ACCESSORIES = [
  { name: 'none', type: null },
  { name: 'headband', type: 'headband' },
  { name: 'visor', type: 'visor' },
  { name: 'cap', type: 'cap' },
  { name: 'sweatband', type: 'sweatband' },
] as const;

/**
 * Simple hash function to generate consistent numbers from a string
 * Uses djb2 algorithm
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) + hash) ^ char;
  }
  return Math.abs(hash);
}

/**
 * Get a seeded random number between 0 and max (exclusive)
 */
function seededRandom(seed: number, index: number, max: number): number {
  const combined = hashString(`${seed}-${index}`);
  return combined % max;
}

/**
 * Generate face features from a seed string (typically player/coach ID)
 * The same seed will always produce the same features
 */
export function generateFaceFeatures(seed: string): FaceFeatures {
  const hash = hashString(seed);

  return {
    skinTone: seededRandom(hash, 0, SKIN_TONES.length),
    faceShape: seededRandom(hash, 1, FACE_SHAPES.length),
    hairStyle: seededRandom(hash, 2, HAIR_STYLES.length),
    hairColor: seededRandom(hash, 3, HAIR_COLORS.length),
    eyeStyle: seededRandom(hash, 4, EYE_STYLES.length),
    eyebrowStyle: seededRandom(hash, 5, EYEBROW_STYLES.length),
    facialHair: seededRandom(hash, 6, FACIAL_HAIR_STYLES.length),
    expression: seededRandom(hash, 7, EXPRESSIONS.length),
    accessory: seededRandom(hash, 8, ACCESSORIES.length),
  };
}

/**
 * Generate face features with age influence
 * Older individuals are more likely to have gray hair, beards, etc.
 */
export function generateFaceFeaturesWithAge(seed: string, age: number): FaceFeatures {
  const baseFeatures = generateFaceFeatures(seed);
  const hash = hashString(seed);

  // Adjust for age
  let adjustedFeatures = { ...baseFeatures };

  // Older people more likely to have gray/silver hair
  if (age >= 50 && seededRandom(hash, 10, 100) < (age - 40) * 2) {
    adjustedFeatures.hairColor = 5; // Gray/Silver
  }

  // Older people more likely to be bald
  if (age >= 45 && seededRandom(hash, 11, 100) < age - 35) {
    adjustedFeatures.hairStyle = 5; // Bald
  }

  // Young players (under 25) less likely to have full beards
  if (age < 25 && adjustedFeatures.facialHair >= 4) {
    adjustedFeatures.facialHair = seededRandom(hash, 12, 3); // None, stubble, or mustache
  }

  return adjustedFeatures;
}

/**
 * Get the actual color values for face features
 */
export function getFaceColors(features: FaceFeatures) {
  return {
    skinColor: SKIN_TONES[features.skinTone],
    hairColor: HAIR_COLORS[features.hairColor],
  };
}

/**
 * Get hair style configuration
 */
export function getHairStyle(features: FaceFeatures) {
  return HAIR_STYLES[features.hairStyle];
}

/**
 * Get face shape configuration
 */
export function getFaceShape(features: FaceFeatures) {
  return FACE_SHAPES[features.faceShape];
}

/**
 * Get eye style configuration
 */
export function getEyeStyle(features: FaceFeatures) {
  return EYE_STYLES[features.eyeStyle];
}

/**
 * Get eyebrow style configuration
 */
export function getEyebrowStyle(features: FaceFeatures) {
  return EYEBROW_STYLES[features.eyebrowStyle];
}

/**
 * Get facial hair configuration
 */
export function getFacialHairStyle(features: FaceFeatures) {
  return FACIAL_HAIR_STYLES[features.facialHair];
}

/**
 * Get expression configuration
 */
export function getExpression(features: FaceFeatures) {
  return EXPRESSIONS[features.expression];
}

/**
 * Get accessory configuration
 */
export function getAccessory(features: FaceFeatures) {
  return ACCESSORIES[features.accessory];
}
