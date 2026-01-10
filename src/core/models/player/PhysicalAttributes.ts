/**
 * Physical attributes for a player.
 * These are concrete, measurable, mostly fixed values.
 * Physical attributes are generally public information.
 */
export interface PhysicalAttributes {
  /** Height in inches (66-80 range) */
  height: number;

  /** Weight in pounds (155-365 range) */
  weight: number;

  /** Arm length in inches (28-36 range) */
  armLength: number;

  /** Hand size in inches (7.5-11.5 range) */
  handSize: number;

  /** Wingspan in inches (68-86 range) */
  wingspan: number;

  /** 40-yard dash time in seconds (4.2-5.5 range) */
  speed: number;

  /** Acceleration rating (1-100 scale) */
  acceleration: number;

  /** Agility rating (1-100 scale) */
  agility: number;

  /** Strength rating (1-100 scale) */
  strength: number;

  /** Vertical jump in inches (24-46 range) */
  verticalJump: number;
}

/**
 * Validation ranges for physical attributes
 */
export const PHYSICAL_ATTRIBUTE_RANGES = {
  height: { min: 66, max: 80 },
  weight: { min: 155, max: 365 },
  armLength: { min: 28, max: 36 },
  handSize: { min: 7.5, max: 11.5 },
  wingspan: { min: 68, max: 86 },
  speed: { min: 4.2, max: 5.5 },
  acceleration: { min: 1, max: 100 },
  agility: { min: 1, max: 100 },
  strength: { min: 1, max: 100 },
  verticalJump: { min: 24, max: 46 },
} as const;

/**
 * Validates that physical attributes are within acceptable ranges
 */
export function validatePhysicalAttributes(
  attrs: PhysicalAttributes
): boolean {
  const ranges = PHYSICAL_ATTRIBUTE_RANGES;

  return (
    attrs.height >= ranges.height.min &&
    attrs.height <= ranges.height.max &&
    attrs.weight >= ranges.weight.min &&
    attrs.weight <= ranges.weight.max &&
    attrs.armLength >= ranges.armLength.min &&
    attrs.armLength <= ranges.armLength.max &&
    attrs.handSize >= ranges.handSize.min &&
    attrs.handSize <= ranges.handSize.max &&
    attrs.wingspan >= ranges.wingspan.min &&
    attrs.wingspan <= ranges.wingspan.max &&
    attrs.speed >= ranges.speed.min &&
    attrs.speed <= ranges.speed.max &&
    attrs.acceleration >= ranges.acceleration.min &&
    attrs.acceleration <= ranges.acceleration.max &&
    attrs.agility >= ranges.agility.min &&
    attrs.agility <= ranges.agility.max &&
    attrs.strength >= ranges.strength.min &&
    attrs.strength <= ranges.strength.max &&
    attrs.verticalJump >= ranges.verticalJump.min &&
    attrs.verticalJump <= ranges.verticalJump.max
  );
}
