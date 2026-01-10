/**
 * Random utility functions for player generation.
 * Uses Box-Muller transform for normal distribution and
 * supports seeded random number generation for reproducibility.
 */

/**
 * Generates a random number from a normal distribution using Box-Muller transform.
 * @param mean - The mean of the distribution
 * @param stdDev - The standard deviation of the distribution
 * @returns A random number from the normal distribution
 */
export function normalRandom(mean: number, stdDev: number): number {
  // Box-Muller transform
  let u1 = 0;
  let u2 = 0;

  // Avoid log(0)
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  return z0 * stdDev + mean;
}

/**
 * Generates a random number from a clamped normal distribution.
 * Values outside [min, max] are re-sampled until a valid value is found.
 * @param mean - The mean of the distribution
 * @param stdDev - The standard deviation of the distribution
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns A random number from the clamped normal distribution
 */
export function clampedNormal(mean: number, stdDev: number, min: number, max: number): number {
  let value: number;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    value = normalRandom(mean, stdDev);
    attempts++;

    // Fallback to clamping after max attempts to avoid infinite loops
    if (attempts >= maxAttempts) {
      return Math.max(min, Math.min(max, value));
    }
  } while (value < min || value > max);

  return value;
}

/**
 * Selects a random item from a weighted list of options.
 * @param options - Array of objects with value and weight properties
 * @returns The selected value
 */
export function weightedRandom<T>(options: { value: T; weight: number }[]): T {
  if (options.length === 0) {
    throw new Error('Cannot select from empty options array');
  }

  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);

  if (totalWeight <= 0) {
    throw new Error('Total weight must be positive');
  }

  let random = Math.random() * totalWeight;

  for (const option of options) {
    random -= option.weight;
    if (random <= 0) {
      return option.value;
    }
  }

  // Fallback to last option (should not reach here due to floating point)
  return options[options.length - 1].value;
}

/**
 * Creates a seeded random number generator for reproducibility.
 * Uses a simple linear congruential generator (LCG).
 * @param seed - The initial seed value
 * @returns A function that returns the next random number (0-1)
 */
export function createSeededRandom(seed: number): () => number {
  // LCG parameters (same as glibc)
  const a = 1103515245;
  const c = 12345;
  const m = 2147483648; // 2^31

  let currentSeed = seed;

  return () => {
    currentSeed = (a * currentSeed + c) % m;
    return currentSeed / m;
  };
}

/**
 * Generates a random integer in the range [min, max] (inclusive).
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns A random integer in the range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float in the range [min, max].
 * @param min - The minimum value
 * @param max - The maximum value
 * @returns A random float in the range
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Shuffles an array in place using Fisher-Yates algorithm.
 * @param array - The array to shuffle
 * @returns The shuffled array (same reference)
 */
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Picks a random element from an array.
 * @param array - The array to pick from
 * @returns A random element from the array
 */
export function randomElement<T>(array: readonly T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Returns true with the given probability.
 * @param probability - The probability (0-1)
 * @returns True if the random check passes
 */
export function chance(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Generates a UUID v4.
 * @returns A UUID string
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
