/**
 * Team Models Index
 * Exports all team-related models, types, and utilities
 */

// Team Finances
export {
  CapPenaltyReason,
  CapPenalty,
  TeamFinances,
  ALL_CAP_PENALTY_REASONS,
  DEFAULT_SALARY_CAP,
  SALARY_FLOOR_PERCENTAGE,
  DEFAULT_STAFF_BUDGET,
  validateCapPenalty,
  validateTeamFinances,
  createDefaultTeamFinances,
  calculateDeadMoneyFromPenalties,
  recalculateCapSpace,
  addCapPenalty,
  advanceCapPenalties,
  isOverCap,
  meetsSalaryFloor,
  getRemainingStaffBudget,
  getFinancesSummary,
} from './TeamFinances';

// Stadium
export {
  StadiumType,
  FieldSurface,
  ALL_STADIUM_TYPES,
  ALL_FIELD_SURFACES,
  Stadium,
  WeatherExposure,
  STADIUM_WEATHER_EXPOSURE,
  DEFAULT_STADIUM_CAPACITY,
  DOME_TEMPERATURE,
  validateStadium,
  createDefaultStadium,
  getWeatherExposure,
  getEffectiveGameTemperature,
  calculateHomeFieldAdvantage,
  getStadiumTypeDescription,
  getSurfaceDescription,
  getSurfaceInjuryModifier,
} from './Stadium';

// NFL Cities
export {
  Conference,
  Division,
  MarketSize,
  ALL_CONFERENCES,
  ALL_DIVISIONS,
  ALL_MARKET_SIZES,
  FakeCity,
  FAKE_CITIES,
  getCityByAbbreviation,
  getCitiesByDivision,
  getCitiesByConference,
  getCitiesByMarketSize,
  validateNoDuplicateAbbreviations,
  validateDivisionSizes,
  getFullTeamName,
  getDivisionDisplayName,
} from './FakeCities';

// Team Entity
export {
  TeamRecord,
  AllTimeRecord,
  MAX_ACTIVE_ROSTER_SIZE,
  MAX_PRACTICE_SQUAD_SIZE,
  MAX_IR_SIZE,
  IR_MINIMUM_GAMES,
  IRPlacement,
  canReturnFromIR,
  Team,
  createEmptyTeamRecord,
  validateTeamRecord,
  validateTeam,
  createTeamFromCity,
  getTeamFullName,
  getWinningPercentage,
  getPointDifferential,
  updateStreak,
  addPlayerToRoster,
  removePlayerFromRoster,
  moveToInjuredReserve,
  returnFromInjuredReserve,
  getTotalRosterCount,
  hasRosterSpace,
  hasPracticeSquadSpace,
  getRecordString,
} from './Team';
