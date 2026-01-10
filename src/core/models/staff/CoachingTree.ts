/**
 * Coaching Tree Model
 * Represents the lineage and philosophy of coaches in NFL coaching trees
 */

/**
 * Named coaching trees in the NFL
 */
export type TreeName =
  | 'walsh'
  | 'parcells'
  | 'belichick'
  | 'shanahan'
  | 'reid'
  | 'coughlin'
  | 'dungy'
  | 'holmgren'
  | 'gruden'
  | 'payton';

/**
 * Generation within a coaching tree
 * 1 = coached directly under the founder
 * 4 = fourth generation descendant
 */
export type TreeGeneration = 1 | 2 | 3 | 4;

/**
 * Risk tolerance levels for coaching philosophy
 */
export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';

/**
 * Philosophy inherited from coaching tree
 */
export interface TreePhilosophy {
  offensiveTendency: string;
  defensiveTendency: string;
  riskTolerance: RiskTolerance;
}

/**
 * Coaching tree lineage and philosophy
 */
export interface CoachingTree {
  treeName: TreeName;
  generation: TreeGeneration;
  mentorId: string | null; // Reference to coach they trained under
  philosophy: TreePhilosophy;
}

/**
 * Chemistry range for tree relationships (FOR ENGINE USE ONLY)
 */
export interface ChemistryRange {
  min: number;
  max: number;
}

/**
 * Tree chemistry calculation rules (FOR ENGINE USE ONLY)
 */
export interface TreeChemistry {
  sameTreeSameGen: ChemistryRange;
  sameTreeAdjacentGen: ChemistryRange;
  compatibleTrees: ChemistryRange;
  conflictingTrees: ChemistryRange;
  opposingPhilosophy: ChemistryRange;
}

/**
 * Default tree chemistry values (FOR ENGINE USE ONLY)
 */
export const DEFAULT_TREE_CHEMISTRY: TreeChemistry = {
  sameTreeSameGen: { min: 5, max: 8 },
  sameTreeAdjacentGen: { min: 3, max: 5 },
  compatibleTrees: { min: 1, max: 3 },
  conflictingTrees: { min: -5, max: -2 },
  opposingPhilosophy: { min: -8, max: -4 },
};

/**
 * Compatible tree relationships (FOR ENGINE USE ONLY)
 */
export const COMPATIBLE_TREES: Record<TreeName, TreeName[]> = {
  walsh: ['holmgren', 'reid', 'shanahan'],
  parcells: ['belichick', 'coughlin', 'payton'],
  belichick: ['parcells', 'coughlin'],
  shanahan: ['walsh', 'holmgren'],
  reid: ['walsh', 'holmgren'],
  coughlin: ['parcells', 'belichick'],
  dungy: ['holmgren'],
  holmgren: ['walsh', 'reid', 'dungy', 'gruden'],
  gruden: ['holmgren', 'dungy'],
  payton: ['parcells'],
};

/**
 * Conflicting tree relationships (FOR ENGINE USE ONLY)
 */
export const CONFLICTING_TREES: Record<TreeName, TreeName[]> = {
  walsh: ['parcells'],
  parcells: ['walsh', 'dungy'],
  belichick: ['reid'],
  shanahan: ['coughlin'],
  reid: ['belichick'],
  coughlin: ['shanahan'],
  dungy: ['parcells'],
  holmgren: [],
  gruden: [],
  payton: [],
};

/**
 * All valid tree names
 */
export const ALL_TREE_NAMES: TreeName[] = [
  'walsh',
  'parcells',
  'belichick',
  'shanahan',
  'reid',
  'coughlin',
  'dungy',
  'holmgren',
  'gruden',
  'payton',
];

/**
 * Calculates tree chemistry between two coaches (FOR ENGINE USE ONLY)
 */
export function calculateTreeChemistry(
  tree1: CoachingTree,
  tree2: CoachingTree
): ChemistryRange {
  // Same tree, same generation - best chemistry
  if (tree1.treeName === tree2.treeName && tree1.generation === tree2.generation) {
    return DEFAULT_TREE_CHEMISTRY.sameTreeSameGen;
  }

  // Same tree, adjacent generation
  if (
    tree1.treeName === tree2.treeName &&
    Math.abs(tree1.generation - tree2.generation) === 1
  ) {
    return DEFAULT_TREE_CHEMISTRY.sameTreeAdjacentGen;
  }

  // Compatible trees
  if (COMPATIBLE_TREES[tree1.treeName]?.includes(tree2.treeName)) {
    return DEFAULT_TREE_CHEMISTRY.compatibleTrees;
  }

  // Conflicting trees
  if (CONFLICTING_TREES[tree1.treeName]?.includes(tree2.treeName)) {
    return DEFAULT_TREE_CHEMISTRY.conflictingTrees;
  }

  // Opposing philosophy
  if (tree1.philosophy.riskTolerance !== tree2.philosophy.riskTolerance) {
    const isOpposing =
      (tree1.philosophy.riskTolerance === 'conservative' &&
        tree2.philosophy.riskTolerance === 'aggressive') ||
      (tree1.philosophy.riskTolerance === 'aggressive' &&
        tree2.philosophy.riskTolerance === 'conservative');

    if (isOpposing) {
      return DEFAULT_TREE_CHEMISTRY.opposingPhilosophy;
    }
  }

  // Neutral - no specific chemistry bonus/penalty
  return { min: 0, max: 0 };
}

/**
 * Creates a default coaching tree
 */
export function createDefaultCoachingTree(treeName: TreeName = 'walsh'): CoachingTree {
  return {
    treeName,
    generation: 2,
    mentorId: null,
    philosophy: {
      offensiveTendency: 'balanced',
      defensiveTendency: 'balanced',
      riskTolerance: 'balanced',
    },
  };
}

/**
 * Validates a coaching tree structure
 */
export function validateCoachingTree(tree: CoachingTree): boolean {
  if (!ALL_TREE_NAMES.includes(tree.treeName)) {
    return false;
  }

  if (![1, 2, 3, 4].includes(tree.generation)) {
    return false;
  }

  if (!['conservative', 'balanced', 'aggressive'].includes(tree.philosophy.riskTolerance)) {
    return false;
  }

  return true;
}
