/**
 * Stadium Model
 * Defines stadium properties affecting gameplay and home field advantage
 */

/**
 * Stadium types affecting weather exposure
 */
export type StadiumType = 'domeFixed' | 'domeRetractable' | 'outdoorWarm' | 'outdoorCold';

/**
 * Field surface types
 */
export type FieldSurface = 'grass' | 'turf';

/**
 * All stadium types
 */
export const ALL_STADIUM_TYPES: StadiumType[] = [
  'domeFixed',
  'domeRetractable',
  'outdoorWarm',
  'outdoorCold',
];

/**
 * All field surface types
 */
export const ALL_FIELD_SURFACES: FieldSurface[] = ['grass', 'turf'];

/**
 * Stadium entity
 */
export interface Stadium {
  id: string;
  name: string;
  teamId: string;
  city: string;

  // Physical properties
  type: StadiumType;
  surface: FieldSurface;
  capacity: number;

  // Weather/environment
  latitude: number; // For weather simulation
  elevation: number; // Affects ball flight (in feet)
  averageNovemberTemp: number; // Fahrenheit
  averageDecemberTemp: number; // Fahrenheit

  // Home field advantage modifiers
  noiseFactor: number; // 1-10, affects false starts
  intimidationFactor: number; // 1-10, crowd impact
}

/**
 * Weather exposure levels based on stadium type
 */
export type WeatherExposure = 'none' | 'minimal' | 'rain' | 'full';

/**
 * Stadium type affects weather exposure
 */
export const STADIUM_WEATHER_EXPOSURE: Record<StadiumType, WeatherExposure> = {
  domeFixed: 'none', // Always 72°F
  domeRetractable: 'minimal', // Usually closed if bad
  outdoorWarm: 'rain', // Rain possible, mild temps
  outdoorCold: 'full', // Full exposure to elements
};

/**
 * Default stadium capacity
 */
export const DEFAULT_STADIUM_CAPACITY = 70000;

/**
 * Default dome temperature
 */
export const DOME_TEMPERATURE = 72; // Fahrenheit

/**
 * Validates a stadium
 */
export function validateStadium(stadium: Stadium): boolean {
  if (!stadium.id || typeof stadium.id !== 'string') return false;
  if (!stadium.name || typeof stadium.name !== 'string') return false;
  if (!stadium.teamId || typeof stadium.teamId !== 'string') return false;
  if (!stadium.city || typeof stadium.city !== 'string') return false;

  // Physical properties
  if (!ALL_STADIUM_TYPES.includes(stadium.type)) return false;
  if (!ALL_FIELD_SURFACES.includes(stadium.surface)) return false;
  if (typeof stadium.capacity !== 'number' || stadium.capacity < 20000 || stadium.capacity > 150000)
    return false;

  // Location validation
  if (typeof stadium.latitude !== 'number' || stadium.latitude < -90 || stadium.latitude > 90)
    return false;
  if (typeof stadium.elevation !== 'number' || stadium.elevation < 0 || stadium.elevation > 10000)
    return false;

  // Temperature validation (reasonable ranges)
  if (typeof stadium.averageNovemberTemp !== 'number') return false;
  if (typeof stadium.averageDecemberTemp !== 'number') return false;

  // Home field factors
  if (
    typeof stadium.noiseFactor !== 'number' ||
    stadium.noiseFactor < 1 ||
    stadium.noiseFactor > 10
  )
    return false;
  if (
    typeof stadium.intimidationFactor !== 'number' ||
    stadium.intimidationFactor < 1 ||
    stadium.intimidationFactor > 10
  )
    return false;

  return true;
}

/**
 * Creates a default stadium
 */
export function createDefaultStadium(id: string, teamId: string, city: string): Stadium {
  return {
    id,
    name: `${city} Stadium`,
    teamId,
    city,
    type: 'outdoorWarm',
    surface: 'grass',
    capacity: DEFAULT_STADIUM_CAPACITY,
    latitude: 40.0,
    elevation: 500,
    averageNovemberTemp: 55,
    averageDecemberTemp: 45,
    noiseFactor: 5,
    intimidationFactor: 5,
  };
}

/**
 * Gets weather exposure for a stadium
 */
export function getWeatherExposure(stadium: Stadium): WeatherExposure {
  return STADIUM_WEATHER_EXPOSURE[stadium.type];
}

/**
 * Gets the effective game temperature for a stadium
 * @param stadium The stadium
 * @param month The month (1-12)
 * @param baseTemp The outside temperature
 */
export function getEffectiveGameTemperature(
  stadium: Stadium,
  month: number,
  baseTemp: number
): number {
  // Domes always have controlled temperature
  if (stadium.type === 'domeFixed') {
    return DOME_TEMPERATURE;
  }

  // Retractable domes close in bad weather
  if (stadium.type === 'domeRetractable') {
    if (baseTemp < 50 || baseTemp > 90) {
      return DOME_TEMPERATURE;
    }
  }

  return baseTemp;
}

/**
 * Calculates home field advantage modifier based on stadium factors
 */
export function calculateHomeFieldAdvantage(stadium: Stadium): number {
  // Base advantage
  let advantage = 1.0;

  // Noise factor adds to false starts for visitors
  advantage += stadium.noiseFactor * 0.02;

  // Intimidation factor affects visitor morale
  advantage += stadium.intimidationFactor * 0.015;

  // Outdoor cold stadiums have additional advantage in winter
  if (stadium.type === 'outdoorCold') {
    advantage += 0.05;
  }

  // High elevation stadiums have conditioning advantage
  if (stadium.elevation > 5000) {
    advantage += 0.03;
  }

  return advantage;
}

/**
 * Gets description of stadium type
 */
export function getStadiumTypeDescription(type: StadiumType): string {
  const descriptions: Record<StadiumType, string> = {
    domeFixed: 'Indoor dome with climate control',
    domeRetractable: 'Dome with retractable roof',
    outdoorWarm: 'Open-air stadium in warm climate',
    outdoorCold: 'Open-air stadium exposed to elements',
  };

  return descriptions[type];
}

/**
 * Gets description of field surface
 */
export function getSurfaceDescription(surface: FieldSurface): string {
  const descriptions: Record<FieldSurface, string> = {
    grass: 'Natural grass field',
    turf: 'Artificial turf field',
  };

  return descriptions[surface];
}

/**
 * Estimates injury risk modifier based on surface type
 * Turf has slightly higher injury risk
 */
export function getSurfaceInjuryModifier(surface: FieldSurface): number {
  return surface === 'turf' ? 1.1 : 1.0;
}
