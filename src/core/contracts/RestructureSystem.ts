/**
 * Restructure System
 * Convert salary to bonus, calculate proration, and project future impact
 */

import { PlayerContract, ContractYear, getCapHitForYear } from './Contract';

/**
 * Restructure type
 */
export type RestructureType = 'convert_salary' | 'add_years' | 'add_void_years' | 'pay_cut';

/**
 * Restructure details
 */
export interface RestructureDetails {
  type: RestructureType;
  amountConverted: number; // Salary converted to bonus
  newYears: number; // Years added (if applicable)
  newVoidYears: number; // Void years added (if applicable)
  payCutAmount: number; // Amount of pay cut (if applicable)
  currentYearSavings: number;
  futureYearImpact: number[]; // Additional cap hit per future year
  totalFutureImpact: number;
}

/**
 * Restructure result
 */
export interface RestructureResult {
  success: boolean;
  newContract: PlayerContract | null;
  details: RestructureDetails | null;
  error: string | null;
}

/**
 * Restructure preview (before committing)
 */
export interface RestructurePreview {
  originalCapHit: number;
  newCapHit: number;
  capSavings: number;
  futureImpact: {
    year: number;
    additionalCapHit: number;
    newTotalCapHit: number;
  }[];
  isRecommended: boolean;
  recommendation: string;
}

/**
 * Calculates maximum restructure amount for a contract
 * Only base salary above veteran minimum can be converted
 */
export function getMaxRestructureAmount(
  contract: PlayerContract,
  currentYear: number,
  veteranMinimum: number = 1215 // 7+ year veteran minimum
): number {
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);
  if (!currentYearData || currentYearData.isVoidYear) {
    return 0;
  }

  // Can only restructure base salary above veteran minimum
  // baseSalary is deprecated, fall back to salary (the new property)
  const baseSalary = currentYearData.baseSalary ?? currentYearData.salary;
  const restructurableAmount = Math.max(0, baseSalary - veteranMinimum);
  return restructurableAmount;
}

/**
 * Calculates proration for converted salary
 */
export function calculateProration(
  amount: number,
  yearsRemaining: number,
  voidYearsToAdd: number = 0
): number[] {
  const totalYears = yearsRemaining + voidYearsToAdd;
  if (totalYears <= 0) return [];

  const proratedAmount = amount / totalYears;
  return Array(totalYears).fill(Math.round(proratedAmount));
}

/**
 * Previews a salary-to-bonus restructure
 */
export function previewRestructure(
  contract: PlayerContract,
  currentYear: number,
  amountToConvert: number,
  voidYearsToAdd: number = 0
): RestructurePreview {
  const currentCapHit = getCapHitForYear(contract, currentYear);
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);

  if (!currentYearData) {
    return {
      originalCapHit: 0,
      newCapHit: 0,
      capSavings: 0,
      futureImpact: [],
      isRecommended: false,
      recommendation: 'Contract has no cap hit for this year',
    };
  }

  // Calculate proration over remaining years plus void years
  const yearsRemaining = contract.yearsRemaining;
  const totalProrationYears = yearsRemaining + voidYearsToAdd;
  const proratedAmounts = calculateProration(amountToConvert, yearsRemaining, voidYearsToAdd);

  // Current year savings (salary reduced minus new proration)
  const newProration = proratedAmounts[0] || 0;
  const capSavings = amountToConvert - newProration;
  const newCapHit = currentCapHit - capSavings;

  // Future impact
  const futureImpact: { year: number; additionalCapHit: number; newTotalCapHit: number }[] = [];

  for (let i = 1; i < totalProrationYears; i++) {
    const year = currentYear + i;
    const originalCapHitForYear = getCapHitForYear(contract, year);
    const additionalCapHit = proratedAmounts[i] || 0;

    futureImpact.push({
      year,
      additionalCapHit,
      newTotalCapHit: originalCapHitForYear + additionalCapHit,
    });
  }

  // Determine if this is recommended
  let isRecommended = true;
  let recommendation = '';

  if (capSavings < 1000) {
    isRecommended = false;
    recommendation = 'Cap savings are minimal (under $1M)';
  } else if (voidYearsToAdd > 2) {
    isRecommended = false;
    recommendation = 'Too many void years may create future dead money issues';
  } else if (yearsRemaining <= 1) {
    isRecommended = false;
    recommendation = 'Contract too short for meaningful restructure';
  } else {
    const totalFutureImpact = futureImpact.reduce((sum, f) => sum + f.additionalCapHit, 0);
    if (totalFutureImpact > capSavings * 1.5) {
      recommendation = 'Good short-term savings but significant future impact';
    } else {
      recommendation = 'Solid restructure with manageable future impact';
    }
  }

  return {
    originalCapHit: currentCapHit,
    newCapHit,
    capSavings,
    futureImpact,
    isRecommended,
    recommendation,
  };
}

/**
 * Executes a salary-to-bonus restructure
 */
export function restructureContract(
  contract: PlayerContract,
  currentYear: number,
  amountToConvert: number,
  voidYearsToAdd: number = 0
): RestructureResult {
  // Validate inputs
  if (contract.status !== 'active') {
    return {
      success: false,
      newContract: null,
      details: null,
      error: 'Can only restructure active contracts',
    };
  }

  const maxRestructure = getMaxRestructureAmount(contract, currentYear);
  if (amountToConvert > maxRestructure) {
    return {
      success: false,
      newContract: null,
      details: null,
      error: `Maximum restructure amount is $${(maxRestructure / 1000).toFixed(1)}M`,
    };
  }

  if (amountToConvert <= 0) {
    return {
      success: false,
      newContract: null,
      details: null,
      error: 'Restructure amount must be positive',
    };
  }

  // Calculate proration
  const proratedAmounts = calculateProration(
    amountToConvert,
    contract.yearsRemaining,
    voidYearsToAdd
  );

  // Build new yearly breakdown
  const newBreakdown: ContractYear[] = [];
  let yearIndex = 0;

  for (const yearData of contract.yearlyBreakdown) {
    if (yearData.year < currentYear) {
      // Past years unchanged
      newBreakdown.push(yearData);
    } else if (yearData.year === currentYear) {
      // Current year: reduce base salary, add proration
      const currentBaseSalary = yearData.baseSalary ?? yearData.salary;
      const currentProration = yearData.prorationedBonus ?? yearData.bonus;
      newBreakdown.push({
        ...yearData,
        baseSalary: currentBaseSalary - amountToConvert,
        salary: currentBaseSalary - amountToConvert,
        prorationedBonus: currentProration + proratedAmounts[yearIndex],
        bonus: currentProration + proratedAmounts[yearIndex],
        capHit: yearData.capHit - amountToConvert + proratedAmounts[yearIndex],
      });
      yearIndex++;
    } else if (!yearData.isVoidYear) {
      // Future years: add proration
      const additionalProration = proratedAmounts[yearIndex] || 0;
      const currentProration = yearData.prorationedBonus ?? yearData.bonus;
      newBreakdown.push({
        ...yearData,
        prorationedBonus: currentProration + additionalProration,
        bonus: currentProration + additionalProration,
        capHit: yearData.capHit + additionalProration,
      });
      yearIndex++;
    } else {
      // Existing void year: add proration
      const additionalProration = proratedAmounts[yearIndex] || 0;
      const currentProration = yearData.prorationedBonus ?? yearData.bonus;
      newBreakdown.push({
        ...yearData,
        prorationedBonus: currentProration + additionalProration,
        bonus: currentProration + additionalProration,
        capHit: yearData.capHit + additionalProration,
      });
      yearIndex++;
    }
  }

  // Add new void years
  const lastContractYear = contract.signedYear + contract.totalYears - 1;
  for (let i = 0; i < voidYearsToAdd; i++) {
    const voidYear = lastContractYear + contract.voidYears + i + 1;
    const proratedForVoidYear = proratedAmounts[contract.yearsRemaining + i] || 0;
    newBreakdown.push({
      year: voidYear,
      // New required properties
      bonus: proratedForVoidYear,
      salary: 0,
      capHit: proratedForVoidYear,
      isVoidYear: true,
      // Backward compat properties
      baseSalary: 0,
      prorationedBonus: proratedForVoidYear,
      rosterBonus: 0,
      workoutBonus: 0,
      optionBonus: 0,
      incentivesLTBE: 0,
      incentivesNLTBE: 0,
      isGuaranteed: false,
      isGuaranteedForInjury: false,
    });
  }

  // Calculate savings and impact
  const originalCapHit = getCapHitForYear(contract, currentYear);
  const newCapHit = newBreakdown.find((y) => y.year === currentYear)?.capHit || 0;
  const currentYearSavings = originalCapHit - newCapHit;

  const futureYearImpact = proratedAmounts.slice(1);
  const totalFutureImpact = futureYearImpact.reduce((sum, v) => sum + v, 0);

  // Create new contract
  const newContract: PlayerContract = {
    ...contract,
    signingBonus: contract.signingBonus + amountToConvert,
    yearlyBreakdown: newBreakdown,
    voidYears: contract.voidYears + voidYearsToAdd,
    notes: [
      ...contract.notes,
      `Restructured: converted $${(amountToConvert / 1000).toFixed(1)}M salary to bonus in ${currentYear}`,
    ],
    originalContractId: contract.originalContractId || contract.id,
  };

  const details: RestructureDetails = {
    type: 'convert_salary',
    amountConverted: amountToConvert,
    newYears: 0,
    newVoidYears: voidYearsToAdd,
    payCutAmount: 0,
    currentYearSavings,
    futureYearImpact,
    totalFutureImpact,
  };

  return {
    success: true,
    newContract,
    details,
    error: null,
  };
}

/**
 * Executes a pay cut (player agrees to reduced salary)
 */
export function executePayCut(
  contract: PlayerContract,
  currentYear: number,
  newSalary: number
): RestructureResult {
  const currentYearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);

  if (!currentYearData) {
    return {
      success: false,
      newContract: null,
      details: null,
      error: 'Contract has no cap hit for this year',
    };
  }

  // Use baseSalary or fall back to salary (new property)
  const currentBaseSalary = currentYearData.baseSalary ?? currentYearData.salary;

  if (newSalary >= currentBaseSalary) {
    return {
      success: false,
      newContract: null,
      details: null,
      error: 'New salary must be less than current salary for a pay cut',
    };
  }

  const payCutAmount = currentBaseSalary - newSalary;

  // Apply pay cut to current and future years proportionally
  const reductionRatio = newSalary / currentBaseSalary;

  const newBreakdown = contract.yearlyBreakdown.map((yearData) => {
    if (yearData.year >= currentYear && !yearData.isVoidYear) {
      const yearBaseSalary = yearData.baseSalary ?? yearData.salary;
      const yearProration = yearData.prorationedBonus ?? yearData.bonus;
      const yearRosterBonus = yearData.rosterBonus ?? 0;
      const newBaseSalary = Math.round(yearBaseSalary * reductionRatio);
      return {
        ...yearData,
        baseSalary: newBaseSalary,
        salary: newBaseSalary,
        capHit: newBaseSalary + yearProration + yearRosterBonus,
        isGuaranteed: false, // Pay cuts typically void guarantees
      };
    }
    return yearData;
  });

  const newTotalValue = newBreakdown
    .filter((y) => !y.isVoidYear)
    .reduce((sum, y) => sum + (y.baseSalary ?? y.salary) + (y.prorationedBonus ?? y.bonus), 0);

  const newContract: PlayerContract = {
    ...contract,
    yearlyBreakdown: newBreakdown,
    totalValue: newTotalValue,
    guaranteedMoney: contract.signingBonus, // Only signing bonus remains guaranteed
    averageAnnualValue: Math.round(newTotalValue / contract.totalYears),
    notes: [
      ...contract.notes,
      `Pay cut: reduced salary by $${(payCutAmount / 1000).toFixed(1)}M in ${currentYear}`,
    ],
  };

  const details: RestructureDetails = {
    type: 'pay_cut',
    amountConverted: 0,
    newYears: 0,
    newVoidYears: 0,
    payCutAmount,
    currentYearSavings: payCutAmount,
    futureYearImpact: [],
    totalFutureImpact: 0,
  };

  return {
    success: true,
    newContract,
    details,
    error: null,
  };
}

/**
 * Gets restructure options for a contract
 */
export function getRestructureOptions(
  contract: PlayerContract,
  currentYear: number
): {
  canRestructure: boolean;
  maxConversion: number;
  suggestedConversions: number[];
  canAddVoidYears: boolean;
  maxVoidYears: number;
  reason: string;
} {
  if (contract.status !== 'active') {
    return {
      canRestructure: false,
      maxConversion: 0,
      suggestedConversions: [],
      canAddVoidYears: false,
      maxVoidYears: 0,
      reason: 'Contract is not active',
    };
  }

  if (contract.yearsRemaining <= 0) {
    return {
      canRestructure: false,
      maxConversion: 0,
      suggestedConversions: [],
      canAddVoidYears: false,
      maxVoidYears: 0,
      reason: 'Contract has no years remaining',
    };
  }

  const maxConversion = getMaxRestructureAmount(contract, currentYear);

  if (maxConversion <= 0) {
    return {
      canRestructure: false,
      maxConversion: 0,
      suggestedConversions: [],
      canAddVoidYears: false,
      maxVoidYears: 0,
      reason: 'No restructurable salary above veteran minimum',
    };
  }

  // Suggest 25%, 50%, 75%, 100% of max
  const suggestedConversions = [
    Math.round(maxConversion * 0.25),
    Math.round(maxConversion * 0.5),
    Math.round(maxConversion * 0.75),
    maxConversion,
  ].filter((v) => v > 0);

  // Max void years is typically 5 (NFL allows max 5-year extensions)
  // But we limit based on remaining years to avoid excessive dead money
  const maxVoidYears = Math.min(5 - contract.voidYears, 3);

  return {
    canRestructure: true,
    maxConversion,
    suggestedConversions,
    canAddVoidYears: maxVoidYears > 0,
    maxVoidYears,
    reason: 'Contract eligible for restructure',
  };
}

/**
 * Projects long-term cap impact of restructure
 */
export function projectRestructureImpact(
  contract: PlayerContract,
  currentYear: number,
  amountToConvert: number,
  voidYearsToAdd: number = 0
): {
  yearByYear: { year: number; originalCapHit: number; newCapHit: number; difference: number }[];
  totalSavings: number;
  totalAdditionalCost: number;
  netImpact: number;
  deadMoneyRisk: number;
} {
  const preview = previewRestructure(contract, currentYear, amountToConvert, voidYearsToAdd);
  const yearByYear: {
    year: number;
    originalCapHit: number;
    newCapHit: number;
    difference: number;
  }[] = [];

  // Current year
  yearByYear.push({
    year: currentYear,
    originalCapHit: preview.originalCapHit,
    newCapHit: preview.newCapHit,
    difference: preview.capSavings,
  });

  // Future years
  for (const future of preview.futureImpact) {
    const originalCapHit = getCapHitForYear(contract, future.year);
    yearByYear.push({
      year: future.year,
      originalCapHit,
      newCapHit: future.newTotalCapHit,
      difference: originalCapHit - future.newTotalCapHit,
    });
  }

  const totalSavings = preview.capSavings;
  const totalAdditionalCost = preview.futureImpact.reduce((sum, f) => sum + f.additionalCapHit, 0);
  const netImpact = totalSavings - totalAdditionalCost;

  // Dead money risk: if player is cut, all remaining proration accelerates
  const deadMoneyRisk = amountToConvert;

  return {
    yearByYear,
    totalSavings,
    totalAdditionalCost,
    netImpact,
    deadMoneyRisk,
  };
}
